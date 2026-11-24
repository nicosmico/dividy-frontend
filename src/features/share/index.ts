// The share feature: links that open a read-only capture of a group (ADR 0006).
export {
  buildSnapshotUrl,
  decodeSnapshot,
  encodeSnapshot,
  isSnapshotLinkSupported,
  LINK_VERSION,
} from './snapshot-codec';
export { buildShareLink, useShareLink, type ShareLink } from './use-share-link';
export {
  snapshotKeys,
  useDeleteSnapshot,
  useSaveSnapshot,
  useSnapshot,
  useSnapshots,
  type SaveSnapshotOutcome,
} from './data/snapshot-queries';
export { SharedWithMeSection } from './components/SharedWithMeSection';
export { LinkSnapshotPage, RedirectToExpenses } from './pages/LinkSnapshotPage';
export { SavedSnapshotPage } from './pages/SavedSnapshotPage';
