import type { NextRequest } from 'next/server';

export const HOSPITAL_COOKIE = 'or_hospital';

export function getRequestHospitalId(request: NextRequest): string | null {
  const id = request.cookies.get(HOSPITAL_COOKIE)?.value || '';
  return /^[a-zA-Z0-9_-]{1,100}$/.test(id) ? id : null;
}
