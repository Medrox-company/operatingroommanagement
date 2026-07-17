import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSession } from '@/lib/auth/server';
import { rateLimit, getClientIdentifier } from '@/lib/auth/rate-limit';
import { getRequestHospitalId } from '@/lib/hospital/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DOWNLOAD_SIZE = 256 * 1024;

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const hospitalId = getRequestHospitalId(request);
  if (!hospitalId) {
    return NextResponse.json(
      { error: 'Nejprve vyberte zdravotnické zařízení.' },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  const limiter = rateLimit(`speed-test:${getClientIdentifier(request.headers)}:${auth.user.sub}`, {
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

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Databázové připojení není nakonfigurováno.' },
      { status: 500, headers: noStoreHeaders() },
    );
  }

  if (auth.user.role !== 'admin') {
    const { data: membership, error: membershipError } = await supabase
      .from('hospital_user_memberships')
      .select('user_id')
      .eq('user_id', auth.user.sub)
      .eq('hospital_id', hospitalId)
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'K tomuto zdravotnickému zařízení nemáte přístup.' },
        { status: 403, headers: noStoreHeaders() },
      );
    }
  }

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
