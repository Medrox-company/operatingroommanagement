import App from '../App'
import { getSessionUser } from '../lib/auth/server'
import type { User } from '../contexts/AuthContext'

// Stránka obsahuje uživatelskou session, proto se nikdy nesmí sdílet mezi
// požadavky ani vzniknout ze statické cache.
export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await getSessionUser()
  const initialUser: User | null = session
    ? {
        id: session.sub,
        email: session.email,
        name: session.name,
        role: session.role as User['role'],
        hospitalId: session.hospitalId,
        is_active: true,
      }
    : null

  return <App initialUser={initialUser} />
}
