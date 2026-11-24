import { cn } from '@/lib/utils';
import { ENTITY_ICONS } from './entity-icons';
import type { IconKind } from './keywords';
import { suggestIcon } from './suggest-icon';

type EntityIconSize = 'legend' | 'list' | 'header' | 'card';

const SIZES: Record<EntityIconSize, { tile: string; icon: string }> = {
  /** Chart legend and tooltip (28 px). */
  legend: { tile: 'size-7 rounded-lg', icon: 'size-4' },
  /** Expense rows (40 px). */
  list: { tile: 'size-10 rounded-xl', icon: 'size-5' },
  /** Group header and next to a text field, as tall as the input (44 px). */
  header: { tile: 'size-11 rounded-[0.875rem]', icon: 'size-5' },
  /** Group card in "Mis grupos" (52 px). */
  card: { tile: 'size-13 rounded-2xl', icon: 'size-6' },
};

interface EntityIconProps {
  /** Group name or expense description; the icon is computed from it. */
  text: string;
  kind: IconKind;
  size?: EntityIconSize;
  className?: string;
}

/**
 * Rounded tile with the icon that fits `text` (see `suggestIcon`). Decorative:
 * the name is always written next to it, so it is hidden from assistive tech.
 * The icon is derived on every render and never stored.
 */
export function EntityIcon({
  text,
  kind,
  size = 'list',
  className,
}: EntityIconProps) {
  const Icon = ENTITY_ICONS[suggestIcon(text, kind)];
  const classes = SIZES[size];
  return (
    <span
      aria-hidden='true'
      data-slot='entity-icon'
      className={cn(
        'flex shrink-0 items-center justify-center bg-surface-2 text-primary',
        classes.tile,
        className
      )}
    >
      <Icon className={classes.icon} />
    </span>
  );
}
