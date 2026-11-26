import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';

export interface Question {
  /** Stable slug: `/preguntas#<id>` opens and scrolls to the question. */
  id: string;
  question: string;
  answer: ReactNode;
}

export const REPOSITORY_URL = 'https://github.com/nicosmico/dividy-frontend';

/**
 * The FAQ copy, in one place. The numbers in `pruebas` are rounded on purpose
 * (see "Números en Preguntas frecuentes" in docs/testing.md).
 */
export const QUESTIONS: readonly Question[] = [
  {
    id: 'datos',
    question: '¿Dónde se guardan mis datos?',
    answer: (
      <>
        <p>
          Solo en este teléfono o computador, en tu navegador. Dividy no tiene
          cuentas ni un servidor donde queden tus gastos: nadie más los ve.
        </p>
        <p>
          Por lo mismo, si borras los datos del navegador (o el historial con
          «datos de sitios»), tus grupos se borran. Si usas Dividy en otro
          navegador, empiezas de cero.
        </p>
      </>
    ),
  },
  {
    id: 'compartir',
    question: '¿Quién puede ver un grupo que comparto?',
    answer: (
      <>
        <p>
          Solo quien tenga el link. Los datos del grupo van dentro del mismo
          link, en una parte que el navegador nunca envía a nuestro servidor.
        </p>
        <p>
          Es una foto del grupo en ese momento: quien lo abre puede mirarlo,
          pero no editarlo. Si después cambias algo, comparte un link nuevo.
        </p>
      </>
    ),
  },
  {
    id: 'costo',
    question: '¿Necesito cuenta? ¿Cuesta algo?',
    answer: <p>No y no. Dividy es gratis, sin cuentas y sin anuncios.</p>,
  },
  {
    id: 'otro-telefono',
    question: '¿Puedo usarla en otro teléfono?',
    answer: (
      <p>
        Tus grupos no se sincronizan entre dispositivos, porque se guardan solo
        en el tuyo. Para que otros vean un grupo, compártelo con un link.
      </p>
    ),
  },
  {
    id: 'cuentas',
    question: '¿Cómo sé que las cuentas están bien?',
    answer: (
      <>
        <p>
          En Saldos, «Ver cómo se calculó» muestra el paso a paso: qué pagó cada
          uno, cómo se dividió cada gasto y cuánto le toca.
        </p>
        <p>
          Dividy trabaja con montos exactos: nunca pierde ni inventa un peso. Si
          al dividir sobra un peso (por ejemplo, $10.000 entre 3), se le asigna
          a alguien y queda a la vista en su parte.
        </p>
      </>
    ),
  },
  {
    id: 'transferencias',
    question: '¿Por qué me sugiere estas transferencias?',
    answer: (
      <>
        <p>
          Busca la menor cantidad posible de transferencias para que todos
          queden al día. Cuando alguien tiene que pagarle a más de una persona,
          es quien más debe el que reparte.
        </p>
        <p>
          Son una sugerencia: pueden pagarse como prefieran, y Dividy recalcula
          con lo que registres.
        </p>
      </>
    ),
  },
  {
    id: 'pruebas',
    question: 'Para los más técnicos: ¿cómo lo probamos?',
    answer: (
      <>
        <p>Cada cambio pasa por pruebas automáticas antes de publicarse:</p>
        <ul className='grid list-disc gap-1.5 pl-5'>
          <li>
            Más de 500 pruebas solo del cálculo (divisiones, saldos y
            transferencias) y más de 1.400 en total.
          </li>
          <li>
            Pruebas con miles de grupos generados al azar, comparadas con un
            cálculo de referencia hecho por separado.
          </li>
          <li>
            Pruebas que meten errores a propósito en el cálculo para ver si se
            detectan: hoy se detecta cerca del 91 %, y casi todo el resto son
            cambios que no alteran el resultado.
          </li>
          <li>
            Unas 100 pruebas de punta a punta, como si fuera una persona usando
            la app, en Chrome y en Safari de iPhone.
          </li>
          <li>
            Pruebas de accesibilidad y de que las pantallas no cambien sin
            querer.
          </li>
        </ul>
        <p>
          Las pruebas dan confianza, pero no garantizan que no haya errores. El
          código es abierto: puedes{' '}
          <a
            href={REPOSITORY_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='rounded-sm font-medium text-primary underline underline-offset-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40'
          >
            revisarlo en GitHub
            <ExternalLink
              aria-hidden='true'
              className='ml-1 inline size-3.5 align-[-0.125em]'
            />
            <span className='sr-only'> (se abre en otra pestaña)</span>
          </a>
          .
        </p>
      </>
    ),
  },
];
