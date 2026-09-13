import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { requireHospitalAccess } from '@/lib/hospital/access';
import { requireSubmoduleAccess } from '@/lib/hospital/submodule-access';
import { logger } from '@/lib/logger';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { validateProject, type BuildingProject } from '@/vendor/orms-spatial-editor/src/model.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SpatialProjectRow {
  project: BuildingProject;
  revision: number;
  updated_at: string | null;
}

function response(project: BuildingProject | null, revision: number, updatedAt: string | null) {
  return NextResponse.json(
    { project, revision, updatedAt },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

function databaseError(error: unknown) {
  const message = error instanceof Error
    ? error.message
    : error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);
  const migrationMissing = /spatial_projects|relation .* does not exist|schema cache/i.test(message);
  return NextResponse.json(
    {
      error: migrationMissing
        ? 'Databázový modul 3D dispozice ještě není nainstalovaný.'
        : '3D dispozici se nepodařilo načíst.',
    },
    { status: migrationMissing ? 503 : 500 },
  );
}

export async function GET(request: NextRequest) {
  const access = await requireHospitalAccess(request);
  if (access instanceof NextResponse) return access;
  const submoduleAccess = await requireSubmoduleAccess(access, 'dashboard.spatial');
  if (submoduleAccess instanceof NextResponse) return submoduleAccess;

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('spatial_projects')
      .select('project, revision, updated_at')
      .eq('hospital_id', access.hospitalId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return response(null, 0, null);

    const row = data as SpatialProjectRow;
    return response(validateProject(row.project), row.revision, row.updated_at);
  } catch (error) {
    logger.error('Error fetching spatial project:', error);
    return databaseError(error);
  }
}

export async function PUT(request: NextRequest) {
  const access = await requireHospitalAccess(request, { adminOnly: true });
  if (access instanceof NextResponse) return access;
  const submoduleAccess = await requireSubmoduleAccess(access, 'dashboard.spatial');
  if (submoduleAccess instanceof NextResponse) return submoduleAccess;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  try {
    const body = await request.json() as { project?: unknown; expectedRevision?: unknown };
    if (!Number.isInteger(body.expectedRevision) || Number(body.expectedRevision) < 0) {
      return NextResponse.json({ error: 'Neplatná revize 3D dispozice.' }, { status: 400 });
    }
    const serializedProject = JSON.stringify(body.project);
    if (!serializedProject) {
      return NextResponse.json({ error: '3D dispozice v požadavku chybí.' }, { status: 400 });
    }
    if (serializedProject.length > 2_000_000) {
      return NextResponse.json({ error: '3D dispozice je příliš velká.' }, { status: 413 });
    }

    let project: BuildingProject;
    try {
      project = validateProject(body.project);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Neplatný formát 3D dispozice.' },
        { status: 400 },
      );
    }

    const linkedIds = project.rooms
      .filter((room) => room.type === 'operating' && room.externalId?.trim())
      .map((room) => room.externalId!.trim());
    if (new Set(linkedIds).size !== linkedIds.length) {
      return NextResponse.json({ error: 'Jeden operační sál je v dispozici propojen vícekrát.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (linkedIds.length > 0) {
      const { data: linkedRooms, error: linkedRoomsError } = await admin
        .from('operating_rooms')
        .select('id')
        .eq('hospital_id', access.hospitalId)
        .in('id', linkedIds);
      if (linkedRoomsError) throw linkedRoomsError;
      const existingIds = new Set((linkedRooms || []).map((room) => room.id));
      const unknown = linkedIds.find((id) => !existingIds.has(id));
      if (unknown) {
        return NextResponse.json({ error: `Dispozice odkazuje na neexistující sál (${unknown}).` }, { status: 400 });
      }
    }

    const { data: existing, error: existingError } = await admin
      .from('spatial_projects')
      .select('revision')
      .eq('hospital_id', access.hospitalId)
      .maybeSingle();
    if (existingError) throw existingError;

    const expectedRevision = Number(body.expectedRevision);
    const currentRevision = Number(existing?.revision ?? 0);
    if (expectedRevision !== currentRevision) {
      return NextResponse.json(
        { error: '3D dispozice byla mezitím změněna.', revision: currentRevision },
        { status: 409 },
      );
    }

    const updatedAt = new Date().toISOString();
    const nextRevision = currentRevision + 1;
    if (!existing) {
      const { error } = await admin.from('spatial_projects').insert({
        hospital_id: access.hospitalId,
        project,
        revision: nextRevision,
        updated_at: updatedAt,
        updated_by: access.user.email,
      });
      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ error: '3D dispozice byla mezitím vytvořena.' }, { status: 409 });
        }
        throw error;
      }
    } else {
      const { data: updated, error } = await admin
        .from('spatial_projects')
        .update({
          project,
          revision: nextRevision,
          updated_at: updatedAt,
          updated_by: access.user.email,
        })
        .eq('hospital_id', access.hospitalId)
        .eq('revision', currentRevision)
        .select('revision')
        .maybeSingle();
      if (error) throw error;
      if (!updated) {
        return NextResponse.json({ error: '3D dispozice byla mezitím změněna.' }, { status: 409 });
      }
    }

    return response(project, nextRevision, updatedAt);
  } catch (error) {
    logger.error('Error saving spatial project:', error);
    return databaseError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const access = await requireHospitalAccess(request, { adminOnly: true });
  if (access instanceof NextResponse) return access;
  const submoduleAccess = await requireSubmoduleAccess(access, 'dashboard.spatial');
  if (submoduleAccess instanceof NextResponse) return submoduleAccess;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  try {
    const body = await request.json() as { expectedRevision?: unknown };
    if (!Number.isInteger(body.expectedRevision) || Number(body.expectedRevision) < 0) {
      return NextResponse.json({ error: 'Neplatná revize 3D dispozice.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: existing, error: existingError } = await admin
      .from('spatial_projects')
      .select('revision')
      .eq('hospital_id', access.hospitalId)
      .maybeSingle();
    if (existingError) throw existingError;

    const expectedRevision = Number(body.expectedRevision);
    const currentRevision = Number(existing?.revision ?? 0);
    if (expectedRevision !== currentRevision) {
      return NextResponse.json(
        { error: '3D dispozice byla mezitím změněna.', revision: currentRevision },
        { status: 409 },
      );
    }

    if (existing) {
      const { data: deleted, error } = await admin
        .from('spatial_projects')
        .delete()
        .eq('hospital_id', access.hospitalId)
        .eq('revision', currentRevision)
        .select('revision')
        .maybeSingle();
      if (error) throw error;
      if (!deleted) {
        return NextResponse.json({ error: '3D dispozice byla mezitím změněna.' }, { status: 409 });
      }
    }

    return response(null, 0, null);
  } catch (error) {
    logger.error('Error deleting spatial project:', error);
    return databaseError(error);
  }
}
