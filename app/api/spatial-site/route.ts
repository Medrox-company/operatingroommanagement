import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { requireHospitalAccess } from '@/lib/hospital/access';
import { requireSubmoduleAccess } from '@/lib/hospital/submodule-access';
import { logger } from '@/lib/logger';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { validateSiteProject, type SiteProject } from '@/vendor/orms-spatial-editor/src/site-model.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Mapa areálu sdílí oprávnění s 3D dispozicí operačního bloku.
const SUBMODULE = 'dashboard.spatial';
const TABLE = 'spatial_site_projects';

interface SiteProjectRow {
  project: SiteProject;
  revision: number;
  updated_at: string | null;
}

function response(project: SiteProject | null, revision: number, updatedAt: string | null) {
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
  const migrationMissing = /spatial_site_projects|relation .* does not exist|schema cache/i.test(message);
  return NextResponse.json(
    {
      error: migrationMissing
        ? 'Databázový modul mapy areálu ještě není nainstalovaný (scripts/24-spatial-site-projects.sql).'
        : 'Mapu areálu se nepodařilo načíst.',
    },
    { status: migrationMissing ? 503 : 500 },
  );
}

const conflict = (revision: number) => NextResponse.json(
  { error: 'Mapa areálu byla mezitím změněna.', revision },
  { status: 409 },
);

async function readRevision(hospitalId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select('revision')
    .eq('hospital_id', hospitalId)
    .maybeSingle();
  if (error) throw error;
  return data ? Number(data.revision) : null;
}

async function authorize(request: NextRequest, write: boolean) {
  const access = await requireHospitalAccess(request, write ? { adminOnly: true } : undefined);
  if (access instanceof NextResponse) return access;
  const submoduleAccess = await requireSubmoduleAccess(access, SUBMODULE);
  if (submoduleAccess instanceof NextResponse) return submoduleAccess;
  if (write) {
    const csrf = assertSameOrigin(request);
    if (csrf) return csrf;
  }
  return access;
}

function parseRevision(value: unknown) {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

export async function GET(request: NextRequest) {
  const access = await authorize(request, false);
  if (access instanceof NextResponse) return access;

  try {
    const { data, error } = await getSupabaseAdmin()
      .from(TABLE)
      .select('project, revision, updated_at')
      .eq('hospital_id', access.hospitalId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return response(null, 0, null);

    const row = data as SiteProjectRow;
    return response(validateSiteProject(row.project), row.revision, row.updated_at);
  } catch (error) {
    logger.error('Error fetching site project:', error);
    return databaseError(error);
  }
}

export async function PUT(request: NextRequest) {
  const access = await authorize(request, true);
  if (access instanceof NextResponse) return access;

  try {
    const body = await request.json() as { project?: unknown; expectedRevision?: unknown };
    const expectedRevision = parseRevision(body.expectedRevision);
    if (expectedRevision === null) {
      return NextResponse.json({ error: 'Neplatná revize mapy areálu.' }, { status: 400 });
    }
    const serializedProject = JSON.stringify(body.project);
    if (!serializedProject) {
      return NextResponse.json({ error: 'Mapa areálu v požadavku chybí.' }, { status: 400 });
    }
    if (serializedProject.length > 1_000_000) {
      return NextResponse.json({ error: 'Mapa areálu je příliš velká.' }, { status: 413 });
    }

    let project: SiteProject;
    try {
      project = validateSiteProject(body.project);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Neplatný formát mapy areálu.' },
        { status: 400 },
      );
    }

    const currentRevision = await readRevision(access.hospitalId);
    if (expectedRevision !== (currentRevision ?? 0)) return conflict(currentRevision ?? 0);

    const admin = getSupabaseAdmin();
    const updatedAt = new Date().toISOString();
    const nextRevision = (currentRevision ?? 0) + 1;
    if (currentRevision === null) {
      const { error } = await admin.from(TABLE).insert({
        hospital_id: access.hospitalId,
        project,
        revision: nextRevision,
        updated_at: updatedAt,
        updated_by: access.user.email,
      });
      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ error: 'Mapa areálu byla mezitím vytvořena.' }, { status: 409 });
        }
        throw error;
      }
    } else {
      const { data: updated, error } = await admin
        .from(TABLE)
        .update({ project, revision: nextRevision, updated_at: updatedAt, updated_by: access.user.email })
        .eq('hospital_id', access.hospitalId)
        .eq('revision', currentRevision)
        .select('revision')
        .maybeSingle();
      if (error) throw error;
      if (!updated) return conflict(currentRevision);
    }

    return response(project, nextRevision, updatedAt);
  } catch (error) {
    logger.error('Error saving site project:', error);
    return databaseError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const access = await authorize(request, true);
  if (access instanceof NextResponse) return access;

  try {
    const body = await request.json() as { expectedRevision?: unknown };
    const expectedRevision = parseRevision(body.expectedRevision);
    if (expectedRevision === null) {
      return NextResponse.json({ error: 'Neplatná revize mapy areálu.' }, { status: 400 });
    }

    const currentRevision = await readRevision(access.hospitalId);
    if (expectedRevision !== (currentRevision ?? 0)) return conflict(currentRevision ?? 0);

    if (currentRevision !== null) {
      const { data: deleted, error } = await getSupabaseAdmin()
        .from(TABLE)
        .delete()
        .eq('hospital_id', access.hospitalId)
        .eq('revision', currentRevision)
        .select('revision')
        .maybeSingle();
      if (error) throw error;
      if (!deleted) return conflict(currentRevision);
    }

    return response(null, 0, null);
  } catch (error) {
    logger.error('Error deleting site project:', error);
    return databaseError(error);
  }
}
