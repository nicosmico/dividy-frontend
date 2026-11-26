import { ChevronLeft } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';

import { FaqItem } from './FaqItem';
import { QUESTIONS } from './questions';

const TITLE = 'Preguntas frecuentes · Dividy';

/** `/preguntas`: the questions people ask before trusting Dividy. */
export function FaqPage() {
  const { hash } = useLocation();

  useEffect(() => {
    const previous = document.title;
    document.title = TITLE;
    return () => {
      document.title = previous;
    };
  }, []);

  // `/preguntas#datos` opens that question and brings it into view.
  useEffect(() => {
    const id = decodeURIComponent(hash.slice(1));
    if (!QUESTIONS.some((q) => q.id === id)) return;
    const element = document.getElementById(id);
    if (!(element instanceof HTMLDetailsElement)) return;
    element.open = true;
    element.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <div className='grid gap-4'>
      <Link
        to='/'
        className='-ml-1 inline-flex min-h-11 w-fit items-center gap-1 rounded-xl px-1 font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40'
      >
        <ChevronLeft aria-hidden='true' className='size-5' />
        Volver
      </Link>
      <div className='grid gap-1'>
        <h1 className='text-2xl font-extrabold tracking-tight'>
          Preguntas frecuentes
        </h1>
        <p className='text-muted-foreground'>
          Lo que más nos preguntan sobre Dividy.
        </p>
      </div>
      <div className='grid gap-2'>
        {QUESTIONS.map((item) => (
          <FaqItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
