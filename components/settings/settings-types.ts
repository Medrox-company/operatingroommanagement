'use client';

export interface HospitalInfo {
  id?: string;
  hospital_name?: string | null;
  hospital_short_name?: string | null;
  hospital_address?: string | null;
  hospital_city?: string | null;
  hospital_zip?: string | null;
  hospital_country?: string | null;
  hospital_ico?: string | null;
  hospital_contact_phone?: string | null;
  hospital_contact_email?: string | null;
  hospital_notes?: string | null;
}
