import { Link } from 'react-router';

import { Button } from '@/components/ui/button';

/** A link that cannot be opened: incomplete, damaged or from another version. */
export function InvalidLink() {
  return (
    <div className='flex flex-col items-center gap-4 py-16 text-center'>
      <h1 className='text-2xl font-bold'>Este link no se pudo abrir</h1>
      <p className='max-w-sm text-muted-foreground'>
        Puede estar incompleto o ser de una versión distinta de Dividy. Pide que
        te lo compartan de nuevo.
      </p>
      <Button asChild size='lg'>
        <Link to='/'>Ir a Mis grupos</Link>
      </Button>
    </div>
  );
}

/** `/shared/:snapshotId` with an id that is not saved on this device. */
export function SnapshotNotFound() {
  return (
    <div className='flex flex-col items-center gap-4 py-16 text-center'>
      <h1 className='text-2xl font-bold'>Captura no encontrada</h1>
      <p className='max-w-sm text-muted-foreground'>
        Esta captura no está guardada en este dispositivo. Quizás la eliminaste.
        Pide que te compartan el link de nuevo.
      </p>
      <Button asChild size='lg'>
        <Link to='/'>Ir a Mis grupos</Link>
      </Button>
    </div>
  );
}
