'use client';

import { usePathname } from 'next/navigation';

export default function PublicQuickNav() {
  const pathname = usePathname();

  // Private/reviewer, field-operation, and ANVIL creative surfaces must not inherit
  // the corporate conversion/navigation bar. ANVIL owns its own minimal navigation.
  if (
    pathname?.startsWith('/pmar') ||
    pathname?.startsWith('/stallworks') ||
    pathname?.startsWith('/review') ||
    pathname?.startsWith('/private') ||
    pathname?.startsWith('/workroom') ||
    pathname?.startsWith('/anvil') ||
    pathname === '/tinkerers/run' ||
    pathname === '/tinkerers/live'
  ) return null;

  return (
    <nav className="nw-public-quicknav print:hidden" aria-label="NULLWORKS corporate navigation">
      <a href="/architecture">Architecture</a>
      <a href="/products">Systems</a>
      <a href="/proof">Proof</a>
      <a href="/research">Research</a>
      <a href="/company">Company</a>
    </nav>
  );
}
