import { Link } from 'react-router';

import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className='flex flex-col items-center gap-4 py-16 text-center'>
      <p className='text-sm font-medium text-muted-foreground'>Error 404</p>
      <h1 className='text-2xl font-bold'>Página no encontrada</h1>
      <p className='text-muted-foreground'>
        La dirección que buscas no existe o ya no está disponible.
      </p>
      <Button asChild size='lg'>
        <Link to='/'>Ir al inicio</Link>
      </Button>
    </div>
  );
}
