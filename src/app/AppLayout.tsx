import { Suspense } from 'react';
import { CircleHelp } from 'lucide-react';
import { Link, Outlet } from 'react-router';

import { DividyLogo } from '@/components/dividy-logo';
import { PageFallback } from '@/components/page-fallback';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { MAIN_ID } from '@/lib/focus';

export function AppHeader() {
  return (
    <header className='mx-auto flex h-16 w-full max-w-lg items-center px-4'>
      <Link
        to='/'
        className='-ml-1 flex items-center gap-2 rounded-xl p-1 text-xl font-extrabold tracking-tight text-brand outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40'
      >
        <DividyLogo />
        Dividy
      </Link>
      <div className='-mr-2 ml-auto flex items-center'>
        <Button asChild variant='ghost' size='icon'>
          <Link to='/preguntas' aria-label='Preguntas frecuentes'>
            <CircleHelp aria-hidden='true' />
          </Link>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}

/** Header plus a centered `max-w-lg` column, mobile first. */
export function AppLayout() {
  return (
    <>
      <a
        href={`#${MAIN_ID}`}
        className='sr-only rounded-xl bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:ring-[3px] focus:ring-ring/40 focus:ring-offset-2 focus:outline-none'
        onClick={(event) => {
          // A hash link would change the route; just move focus.
          event.preventDefault();
          document.getElementById(MAIN_ID)?.focus();
        }}
      >
        Saltar al contenido
      </a>
      <AppHeader />
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className='mx-auto w-full max-w-lg px-4 pb-16 outline-none'
      >
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </>
  );
}
