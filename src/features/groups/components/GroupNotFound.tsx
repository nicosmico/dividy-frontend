import { Link } from 'react-router';

import { Button } from '@/components/ui/button';

export function GroupNotFound() {
  return (
    <div className='flex flex-col items-center gap-4 py-16 text-center'>
      <h1 className='text-2xl font-bold'>Grupo no encontrado</h1>
      <p className='text-muted-foreground'>
        Este grupo no existe en este dispositivo. Quizás fue eliminado.
      </p>
      <Button asChild size='lg'>
        <Link to='/'>Ir a mis grupos</Link>
      </Button>
    </div>
  );
}
