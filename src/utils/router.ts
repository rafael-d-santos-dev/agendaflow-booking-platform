/**
 * AgendaFlow — Native Hash Router
 * Supports deep routing, query parameters (e.g. #/book?business=aura),
 * and browser back/forward history navigation without external packages.
 */

import { useState, useEffect, useCallback } from 'react';

export interface ParsedRoute {
  raw: string;
  path: string;
  searchParams: URLSearchParams;
  query: Record<string, string>;
}

export function parseHash(hashStr: string): ParsedRoute {
  // Strip leading '#' or '#/'
  let clean = hashStr.trim();
  if (clean.startsWith('#')) {
    clean = clean.substring(1);
  }
  if (!clean.startsWith('/')) {
    clean = '/' + clean;
  }

  const [pathPart, queryPart] = clean.split('?');
  const path = pathPart || '/';
  const searchParams = new URLSearchParams(queryPart || '');
  const query: Record<string, string> = {};

  searchParams.forEach((value, key) => {
    query[key] = value;
  });

  return {
    raw: hashStr,
    path,
    searchParams,
    query,
  };
}

export function useRouter() {
  const [route, setRoute] = useState<ParsedRoute>(() => {
    if (typeof window === 'undefined') {
      return parseHash('/admin/overview');
    }
    const currentHash = window.location.hash || '#/admin/overview';
    return parseHash(currentHash);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set default hash if empty
    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
      window.location.hash = '#/admin/overview';
    }

    const handleHashChange = () => {
      setRoute(parseHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const navigate = useCallback((to: string) => {
    if (typeof window === 'undefined') return;
    const targetHash = to.startsWith('#') ? to : `#${to.startsWith('/') ? to : '/' + to}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    } else {
      // Force update if re-navigating to the same hash
      setRoute(parseHash(targetHash));
    }
  }, []);

  const replace = useCallback((to: string) => {
    if (typeof window === 'undefined') return;
    const targetHash = to.startsWith('#') ? to : `#${to.startsWith('/') ? to : '/' + to}`;
    const newUrl = `${window.location.pathname}${window.location.search}${targetHash}`;
    window.location.replace(newUrl);
    setRoute(parseHash(targetHash));
  }, []);

  return {
    ...route,
    navigate,
    replace,
  };
}
