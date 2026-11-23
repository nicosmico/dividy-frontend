import { IconArrowNarrowRight, IconCheck } from '@tabler/icons-react';
import { Card, Container, RoundedLink } from '@/shared';

const howItWorks = [
  {
    title: 'Agrega miembros',
    description:
      'Ingresa los nombres de las personas que compartirán los gastos',
  },
  {
    title: 'Registra gastos',
    description:
      'Añade cada gasto indicando quién pagó y entre quiénes se divide',
  },
  {
    title: 'Simplifica deudas',
    description:
      'Dividy calculará automáticamente la forma más eficiente de saldar las cuentas y te permitirá copiar el resumen de las cuentas para que lo puedas compartir donde quieras',
  },
];
export function HomePage() {
  return (
    <Container className='mx-auto flex flex-col items-center justify-center gap-8 py-12 text-center md:min-h-[calc(70dvh)] md:flex-row'>
      <div className='flex w-full flex-col gap-6'>
        <h1 className='text-3xl text-balance md:text-left md:text-4xl'>
          <span className='text-4 font-bold'>Simplifica</span> la división de
          gastos grupales con <span className='font-bold'>Dividy</span>, la
          forma más fácil de calcular quién debe qué a quién 💸
        </h1>
        <RoundedLink
          to='/split-bills'
          className='w-full bg-zinc-800 px-6 text-gray-50 shadow-xs'
        >
          Dividir gastos
          <IconArrowNarrowRight className='animate-pulse'></IconArrowNarrowRight>
        </RoundedLink>
      </div>

      <Card className='flex w-full flex-col gap-4 p-4 shadow-xs'>
        <h2 className='text-lg font-semibold md:text-xl'>¿Cómo funciona?</h2>

        <ul className='space-y-2 text-left'>
          {howItWorks.map((step, index) => (
            <li className='flex flex-col' key={index}>
              <div className='flex gap-2'>
                <IconCheck className='text-amber-500' />
                <h3 className='font-medium'>{step.title} </h3>
              </div>
              <p className='ml-8 text-sm'>{step.description}</p>
            </li>
          ))}
        </ul>

        <div className='mt-4 text-left text-xs text-neutral-500'>
          <p>Notas:</p>
          <ul className='list-inside list-disc'>
            <li>
              Por el momento, Dividy solo funciona con Pesos Chilenos (CLP) y
              monedas que no utilizan decimales. Además, toda la información se
              guarda en tu navegador.
            </li>
            <li>
              Pronto podrás compartir los resúmenes de cuentas con tus amigos,
              subir boletas y más 🚀.
            </li>
          </ul>
        </div>
      </Card>
    </Container>
  );
}

export default HomePage;
