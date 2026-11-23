import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const STEPS = [
  'Crea un grupo y agrega a sus miembros.',
  'Registra los gastos: quién pagó y entre quiénes se reparte.',
  'Salda cuentas: Dividy te dice quién le debe cuánto a quién.',
];

export function WelcomeCard() {
  return (
    <Card className='gap-5 p-6'>
      <div className='grid gap-1'>
        <h2 className='text-xl font-bold'>Bienvenido a Dividy</h2>
        <p className='text-sm text-muted-foreground'>
          Divide los gastos de un grupo con números que cuadran al peso.
        </p>
      </div>
      <ol className='grid gap-3'>
        {STEPS.map((step, index) => (
          <li key={step} className='flex items-start gap-3 text-sm'>
            <span className='flex size-7 shrink-0 items-center justify-center rounded-full bg-accent font-semibold'>
              {index + 1}
            </span>
            <span className='pt-1'>{step}</span>
          </li>
        ))}
      </ol>
      <p className='text-sm text-muted-foreground'>
        Solo pesos chilenos. Tus datos se guardan en este dispositivo.
      </p>
      <Button asChild size='lg'>
        <Link to='/groups/new'>Crear grupo</Link>
      </Button>
    </Card>
  );
}
