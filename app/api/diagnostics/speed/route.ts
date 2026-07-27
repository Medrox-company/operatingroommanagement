import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIdentifier } from '@/lib/auth/rate-limit';
import { requireHospitalAccess } from '@/lib/hospital/access';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DOWNLOAD_SIZE = 256 * 1024;

function noStoreHeaders(extra?: Record<string, string>) {
  return {
    'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    ...extra,
  };
}

function createDiagnosticPayload() {
  const bytes = new Uint8Array(DOWNLOAD_SIZE);
  let state = 0x9e3779b9;

  for (let index = 0; index < bytes.length; index += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    bytes[index] = state & 0xff;
  }

  return bytes;
}

export async function GET(request: NextRequest) {
  const access = await requireHospitalAccess(request);
  if (access instanceof NextResponse) return access;
  const { hospitalId, user } = access;

  const limiter = rateLimit(`speed-test:${getClientIdentifier(request.headers)}:${user.sub}`, {
    limit: 36,
    windowMs: 60 * 1000,
  });

  if (!limiter.success) {
    return NextResponse.json(
      { error: 'Test byl spuštěn příliš často. Zkuste to znovu za chvíli.' },
      {
        status: 429,
        headers: noStoreHeaders({ 'Retry-After': String(limiter.retryAfterSec) }),
      },
    );
  }

  const supabase = getSupabaseAdmin();

  const mode = request.nextUrl.searchParams.get('mode');
  if (mode === 'download') {
    return new Response(createDiagnosticPayload(), {
      status: 200,
      headers: noStoreHeaders({
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(DOWNLOAD_SIZE),
        'Content-Encoding': 'identity',
        'X-Diagnostic-Bytes': String(DOWNLOAD_SIZE),
      }),
    });
  }

  const requestStartedAt = performance.now();
  const databaseStartedAt = performance.now();
  const { error } = await supabase
    .from('operating_rooms')
    .select('id')
    .eq('hospital_id', hospitalId)
    .limit(1);
  const databaseMs = performance.now() - databaseStartedAt;

  if (error) {
    console.error('[Diagnostics] Database speed test failed:', error.code, error.message);
    return NextResponse.json(
      { error: 'Test připojení k databázi se nezdařil.' },
      {
        status: 503,
        headers: noStoreHeaders({ 'Server-Timing': `db;dur=${databaseMs.toFixed(1)}` }),
      },
    );
  }

  const serverMs = performance.now() - requestStartedAt;
  return NextResponse.json(
    {
      ok: true,
      databaseMs: Number(databaseMs.toFixed(1)),
      serverMs: Number(serverMs.toFixed(1)),
      measuredAt: new Date().toISOString(),
    },
    {
      headers: noStoreHeaders({
        'Server-Timing': `db;dur=${databaseMs.toFixed(1)}, app;dur=${serverMs.toFixed(1)}`,
      }),
    },
  );
}
