import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  buildExampleGroup,
  LazyExplanationPlayer,
} from '@/features/explanation';

/**
 * "Mis grupos" without groups (decision 90): the animated example of how
 * Dividy computes who owes whom. The example is a real group built in memory
 * with the domain; it is never saved.
 */
export function Welcome() {
  const example = useMemo(() => buildExampleGroup(), []);
  return (
    <div className='grid gap-4'>
      <div className='grid gap-1'>
        <h1 className='text-2xl font-extrabold tracking-tight'>
          Divide gastos sin enredos
        </h1>
        <p className='text-muted-foreground'>
          Así calcula Dividy quién le debe a quién:
        </p>
      </div>
      <Card className='gap-3 rounded-card p-4'>
        <LazyExplanationPlayer
          group={example}
          settleAtEnd
          label='Ejemplo animado: un asado entre Ana, Beto y Carla'
        />
      </Card>
      <Button asChild size='lg'>
        <Link to='/groups/new'>
          <Plus aria-hidden='true' /> Crear mi primer grupo
        </Link>
      </Button>
      <p className='text-center text-sm text-muted-foreground'>
        Pesos, dólares, euros y más. Tus datos se guardan en este dispositivo.
      </p>
    </div>
  );
}
