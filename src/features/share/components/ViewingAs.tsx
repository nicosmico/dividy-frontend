import { Button } from '@/components/ui/button';
import { useViewer } from '@/features/groups/data';

/**
 * "Viendo como Beto · Cambiar" (or "Solo estás mirando · Elegir quién eres")
 * under the title of a snapshot: it reopens "¿Quién eres?". A group of your
 * own has no such line, you change it in Miembros.
 */
export function ViewingAs() {
  const { members, viewerId, openSheet } = useViewer();
  const viewer = members.find((m) => m.id === viewerId);
  return (
    <p className='flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground'>
      <span>
        {viewer ? (
          <>
            Viendo como{' '}
            <span className='font-semibold text-foreground'>{viewer.name}</span>
          </>
        ) : (
          'Solo estás mirando'
        )}
      </span>
      <span aria-hidden='true'>·</span>
      <Button
        variant='link'
        size='sm'
        onClick={openSheet}
        className='h-11 px-1 text-sm font-semibold'
      >
        {viewer ? 'Cambiar' : 'Elegir quién eres'}
      </Button>
    </p>
  );
}
