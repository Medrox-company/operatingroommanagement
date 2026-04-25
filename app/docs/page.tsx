import type { Metadata } from 'next'
import { DocsPage } from '@/components/docs/DocsPage'

export const metadata: Metadata = {
  title: 'Dokumentace | OperatingRoom Manager',
  description:
    'Kompletní technická a uživatelská dokumentace aplikace OperatingRoom Manager — architektura, moduly, API, databáze, návod k použití.',
  robots: { index: false, follow: false },
}

export default function DocsRoute() {
  return <DocsPage />
}
