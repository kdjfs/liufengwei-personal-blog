export type HeaderVariant = 'default' | 'cover';

export interface PageChrome {
  bodyClass: 'page-home' | 'page-default';
  headerVariant: HeaderVariant;
}

export function getPageChrome(pathname: string): PageChrome {
  const isHome = pathname === '/';

  return isHome
    ? { bodyClass: 'page-home', headerVariant: 'cover' }
    : { bodyClass: 'page-default', headerVariant: 'default' };
}
