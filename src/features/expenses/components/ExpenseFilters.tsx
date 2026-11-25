import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type ExpenseFilter, type Group } from '@/domain';
import { cn } from '@/lib/utils';
import { personChipText } from './filter-text';
import { PersonFilterSheet } from './PersonFilterSheet';
import type { ExpenseFilters as Filters } from './use-expense-filters';

/**
 * What narrows the expense list: the search box (only with 11 expenses or
 * more) above a row of chips. The chips are exclusive: tapping another one
 * replaces the active one, tapping the active one removes it. "Donde participo"
 * and "Pagué yo" are there only if we know who you are; "Persona" opens a
 * sheet to pick someone.
 */
export function ExpenseFilterBar({
  group,
  filters,
}: {
  group: Group;
  filters: Filters;
}) {
  const { filter, viewerId, searchVisible } = filters;
  const [sheetOpen, setSheetOpen] = useState(false);

  function toggle(kind: 'mine' | 'paid') {
    filters.setFilter(filter?.kind === kind ? null : { kind });
  }

  return (
    <div className='grid grid-cols-[minmax(0,1fr)] gap-3'>
      {searchVisible && (
        <SearchBox value={filters.query} onChange={filters.setQuery} />
      )}
      {filters.viewerLoading ? (
        // Same height as the chips, so nothing jumps when they appear.
        <div aria-hidden='true' className='h-11' />
      ) : (
        // Its own horizontal scroll if the chips do not fit; the padding and
        // negative margin keep the focus rings from being clipped.
        <div
          role='group'
          aria-label='Filtros'
          className='-m-1 flex gap-2 overflow-x-auto overscroll-x-contain p-1'
        >
          {viewerId !== null && (
            <>
              <Chip
                pressed={filter?.kind === 'mine'}
                onClick={() => toggle('mine')}
              >
                Donde participo
              </Chip>
              <Chip
                pressed={filter?.kind === 'paid'}
                onClick={() => toggle('paid')}
              >
                Pagué yo
              </Chip>
            </>
          )}
          <Chip
            pressed={filter?.kind === 'member' || filter?.kind === 'paidby'}
            haspopup
            onClick={() => setSheetOpen(true)}
          >
            {personChipText(filter, group)}
            <ChevronDown aria-hidden='true' className='size-4' />
          </Chip>
        </div>
      )}
      <PersonFilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        group={group}
        viewerId={viewerId}
        current={filter}
        query={filters.query}
        onApply={(next: ExpenseFilter | null) => filters.setFilter(next)}
      />
    </div>
  );
}

function Chip({
  pressed,
  haspopup = false,
  onClick,
  children,
}: {
  pressed: boolean;
  haspopup?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type='button'
      aria-pressed={pressed}
      aria-haspopup={haspopup ? 'dialog' : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-full px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        pressed
          ? 'bg-accent font-semibold text-accent-foreground'
          : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
      )}
    >
      {pressed && <Check aria-hidden='true' className='size-4' />}
      {children}
    </button>
  );
}

function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className='relative'>
      <Label htmlFor={id} className='sr-only'>
        Buscar gasto
      </Label>
      <Search
        aria-hidden='true'
        className='pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground'
      />
      <Input
        ref={input}
        id={id}
        type='text'
        enterKeyHint='search'
        autoComplete='off'
        placeholder='Buscar gasto'
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn('pl-10', value && 'pr-11')}
      />
      {value && (
        <button
          type='button'
          aria-label='Limpiar búsqueda'
          onClick={() => {
            onChange('');
            // The button goes away with the text: keep the focus in the box.
            input.current?.focus();
          }}
          className='absolute top-0 right-0 flex size-11 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40'
        >
          <X aria-hidden='true' className='size-4' />
        </button>
      )}
    </div>
  );
}
