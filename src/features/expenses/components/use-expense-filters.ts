import { useEffect, useState } from 'react';
import {
  useLocation,
  useNavigate,
  useNavigationType,
  useSearchParams,
} from 'react-router';

import {
  SEARCH_MIN_EXPENSES,
  filterNeedsViewer,
  parseExpenseFilter,
  searchWords,
  serializeExpenseFilter,
  type ExpenseFilter,
  type Group,
  type MemberId,
} from '@/domain';
import { useViewer } from '@/features/groups/data';

const FILTER_PARAM = 'f';
const QUERY_PARAM = 'q';

export interface ExpenseFilters {
  /** The active chip, already checked against the group and the viewer. */
  filter: ExpenseFilter | null;
  /** What is typed in the search box (empty when the box is hidden). */
  query: string;
  /** There is a search with at least one word. */
  hasQuery: boolean;
  /** Chip or search is narrowing the list. */
  active: boolean;
  /** The group has enough expenses for the search box. */
  searchVisible: boolean;
  /** `?f=mine|paid` is waiting for the saved "who am I" to load. */
  pending: boolean;
  /** The saved "who am I" is still loading: do not show chips that depend on it yet. */
  viewerLoading: boolean;
  viewerId: MemberId | null;
  /** Changing the chip adds a history entry: "back" removes it. */
  setFilter: (filter: ExpenseFilter | null) => void;
  /** Typing replaces the current entry, so it does not fill the history. */
  setQuery: (query: string) => void;
  clear: () => void;
}

/**
 * The chip filter and the search of the expense list, kept in the URL
 * (`?f=` and `?q=`) so they survive a reload and the back button. The hash is
 * kept as it is: a snapshot opened from a link carries its data there.
 *
 * - An invalid value, or one naming a member that is not in the group, is
 *   ignored. `mine` / `paid` are ignored too when nobody is the viewer.
 * - The search box exists only with `SEARCH_MIN_EXPENSES` expenses or more;
 *   below that the typed text is cleared, so nothing is left filtered without
 *   showing why.
 * - The text of the box lives here too: writing it to the router and reading
 *   it back would fight with typing. It only reads the URL again when the
 *   user goes back or forward.
 */
export function useExpenseFilters(group: Group): ExpenseFilters {
  const { viewerId, loading } = useViewer();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();

  const urlQuery = params.get(QUERY_PARAM) ?? '';
  const [text, setText] = useState(urlQuery);
  const [syncedKey, setSyncedKey] = useState(location.key);
  if (syncedKey !== location.key) {
    setSyncedKey(location.key);
    if (navigationType === 'POP') setText(urlQuery);
  }

  const count = group.expenses.length;
  const searchVisible = count >= SEARCH_MIN_EXPENSES;
  // Below the minimum there is no box: forget what was typed.
  if (!searchVisible && text !== '') setText('');
  const query = searchVisible ? text : '';
  const hasQuery = searchWords(query).length > 0;

  const parsed =
    count > 0 ? parseExpenseFilter(params.get(FILTER_PARAM), group) : null;
  const pending = loading && filterNeedsViewer(parsed);
  const filter = filterNeedsViewer(parsed) && viewerId === null ? null : parsed;

  function write(change: (next: URLSearchParams) => void, replace: boolean) {
    const next = new URLSearchParams(location.search);
    change(next);
    const search = next.toString();
    void navigate(
      {
        pathname: location.pathname,
        search: search ? `?${search}` : '',
        hash: location.hash,
      },
      { replace }
    );
  }

  function setFilter(next: ExpenseFilter | null) {
    write((p) => {
      if (next) p.set(FILTER_PARAM, serializeExpenseFilter(next));
      else p.delete(FILTER_PARAM);
    }, false);
  }

  function setQuery(next: string) {
    setText(next);
    write((p) => {
      if (next) p.set(QUERY_PARAM, next);
      else p.delete(QUERY_PARAM);
    }, true);
  }

  function clear() {
    setText('');
    write((p) => {
      p.delete(FILTER_PARAM);
      p.delete(QUERY_PARAM);
    }, false);
  }

  // ...and take it out of the URL too.
  const staleQuery = !searchVisible && urlQuery !== '';
  useEffect(() => {
    if (!staleQuery) return;
    const next = new URLSearchParams(location.search);
    next.delete(QUERY_PARAM);
    const search = next.toString();
    void navigate(
      {
        pathname: location.pathname,
        search: search ? `?${search}` : '',
        hash: location.hash,
      },
      { replace: true }
    );
  }, [staleQuery, navigate, location.pathname, location.search, location.hash]);

  return {
    filter,
    query,
    hasQuery,
    active: filter !== null || hasQuery,
    searchVisible,
    pending,
    viewerLoading: loading,
    viewerId,
    setFilter,
    setQuery,
    clear,
  };
}
