import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@/components/responsive-dialog';
import { Button } from '@/components/ui/button';
import { useViewer } from '@/features/groups/data';
import { MemberAvatar } from './MemberAvatar';

/**
 * "¿Quién eres?": the faces of the members, to say who you are in this group
 * or snapshot (CONTEXT.md, Viewer). Reads everything from the nearest
 * `ViewerProvider`, which decides when it opens.
 *
 * - Tapping a face saves it and closes.
 * - The secondary button ("No soy parte de este grupo" in a group of your own,
 *   "Solo estoy mirando" in a snapshot) saves "none": it is not asked again.
 * - Closing it any other way (X, Escape, swipe) saves nothing: it only skips
 *   this visit and asks again the next time the screen is opened.
 */
export function ViewerSheet() {
  const { scope, members, sheetOpen, closeSheet, choose, skip } = useViewer();
  if (!scope) return null;
  return (
    <ResponsiveDialog
      open={sheetOpen}
      onOpenChange={(open) => !open && closeSheet()}
      title='¿Quién eres?'
      description='Así te mostramos primero lo tuyo.'
    >
      <div className='grid grid-cols-[minmax(0,1fr)] gap-4 pb-1'>
        <ul
          aria-label='Integrantes'
          className='grid max-h-[50svh] grid-cols-2 gap-2 overflow-y-auto overscroll-contain p-1'
        >
          {members.map((member) => (
            <li key={member.id} className='min-w-0'>
              <button
                type='button'
                aria-label={`Soy ${member.name}`}
                onClick={() => void choose(member.id)}
                className='flex min-h-16 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-tile border border-border bg-card p-2 text-left outline-none hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/40 active:scale-[0.98] motion-reduce:active:scale-100'
              >
                <MemberAvatar member={member} decorative />
                <span className='min-w-0 flex-1 font-medium break-words'>
                  {member.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <ResponsiveDialogFooter className='pt-0'>
          <Button variant='outline' onClick={() => void skip()}>
            {scope.kind === 'snapshot'
              ? 'Solo estoy mirando'
              : 'No soy parte de este grupo'}
          </Button>
        </ResponsiveDialogFooter>
      </div>
    </ResponsiveDialog>
  );
}
