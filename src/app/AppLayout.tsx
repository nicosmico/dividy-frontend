import { Link, Outlet } from 'react-router';

import { DividyLogo } from '@/components/dividy-logo';

export function AppHeader() {
  return (
    <header className='mx-auto flex h-16 w-full max-w-lg items-center px-4'>
      <Link
        to='/'
        className='-ml-1 flex items-center gap-2 rounded-xl p-1 text-xl font-bold tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40'
      >
        <DividyLogo />
        Dividy
      </Link>
    </header>
  );
}

/** Header plus a centered `max-w-lg` column, mobile first. */
export function AppLayout() {
  return (
    <>
      <AppHeader />
      <main className='mx-auto w-full max-w-lg px-4 pb-16'>
        <Outlet />
      </main>
    </>
  );
}
