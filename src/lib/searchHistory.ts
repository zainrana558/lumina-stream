'use client';

export function addSearch(query: string) {
  if (typeof window === 'undefined') return;
  try {
    const history: string[] = JSON.parse(localStorage.getItem('lumina_search_history') || '[]');
    const filtered = history.filter(h => h.toLowerCase() !== query.toLowerCase());
    filtered.unshift(query);
    if (filtered.length > 50) filtered.length = 50;
    localStorage.setItem('lumina_search_history', JSON.stringify(filtered));
  } catch { /* ignore */ }
}

export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('lumina_search_history') || '[]');
  } catch { return []; }
}

export function clearSearchHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('lumina_search_history');
}
