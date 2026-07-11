import { NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Veřejný seznam pro přihlašovací obrazovku. Vrací pouze identifikátor a názvy,
// žádné adresy, kontakty ani provozní údaje nemocnice.
export async function GET() {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Databáze není nakonfigurována' }, { status: 503 });
  }
  const { data, error } = await getSupabaseAdmin()
    .from('hospitals')
    .select('id,hospital_name,hospital_short_name')
    .order('hospital_name');
  if (error) return NextResponse.json({ error: 'Nemocnice nelze načíst' }, { status: 500 });
  return NextResponse.json({ hospitals: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
}
