// Seed / refresh password hashes for demo accounts using Node scrypt.
// Format: scrypt$v1$<saltHex>$<derivedHex>  (same as lib/auth/password.ts)
//
// Safe to re-run: updates password_hash for existing rows, inserts missing demo users.

import { scrypt as scryptCb, randomBytes } from "node:crypto"
import { promisify } from "node:util"
import { createClient } from "@supabase/supabase-js"

const scrypt = promisify(scryptCb)

const KEYLEN = 64
const SALT_BYTES = 16

async function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES).toString("hex")
  const derived = await scrypt(password, salt, KEYLEN)
  return `scrypt$v1$${salt}$${Buffer.from(derived).toString("hex")}`
}

const DEMO_USERS = [
  { email: "admin@nemocnice.cz",      name: "Administrátor",           role: "admin",      password: "admin123" },
  { email: "user@nemocnice.cz",       name: "Uživatel",                role: "user",       password: "user123" },
  { email: "aro@nemocnice.cz",        name: "ARO oddělení",            role: "aro",        password: "aro123" },
  { email: "cos@nemocnice.cz",        name: "Centrální operační sály", role: "cos",        password: "cos123" },
  { email: "management@nemocnice.cz", name: "Management",              role: "management", password: "mgmt123" },
  { email: "primar@nemocnice.cz",     name: "Primariát",               role: "primar",     password: "primar123" },
]

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_NEXT_PUBLIC_SUPABASE_URL

const SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("[seed] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

console.log("[seed] Hashing and upserting", DEMO_USERS.length, "demo accounts…")

for (const u of DEMO_USERS) {
  const hash = await hashPassword(u.password)

  // Try update first, then insert if not found — idempotent pattern that
  // works regardless of whether email has a unique constraint.
  const { data: existing, error: selErr } = await db
    .from("app_users")
    .select("id")
    .eq("email", u.email)
    .maybeSingle()

  if (selErr) {
    console.error(`[seed] lookup failed for ${u.email}:`, selErr.message)
    continue
  }

  if (existing?.id) {
    const { error } = await db
      .from("app_users")
      .update({
        name: u.name,
        role: u.role,
        password_hash: hash,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
    if (error) console.error(`[seed] update failed for ${u.email}:`, error.message)
    else console.log(`[seed] updated ${u.email} (${u.role})`)
  } else {
    const { error } = await db.from("app_users").insert({
      email: u.email,
      name: u.name,
      role: u.role,
      password_hash: hash,
      is_active: true,
    })
    if (error) console.error(`[seed] insert failed for ${u.email}:`, error.message)
    else console.log(`[seed] inserted ${u.email} (${u.role})`)
  }
}

console.log("[seed] Done.")
