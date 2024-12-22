import { Link, NavLink } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';
import DividyIcon from '../ui/DividyIcon';

export interface NavigationLink {
  text: string;
  href: string;
  icon?: React.ReactNode;
}

{
  /* <div className='flex items-center justify-center gap-2'>
        <DividyIcon size={20}></DividyIcon>
        <h1 className='text-2xl font-bold text-zinc-800'>Dividy</h1>
      </div> */
}

const navLinks: NavigationLink[] = [
  { text: 'Dividir gastos', href: '/split-bills' },
  // { text: '¿Cómo funciona?', href: '/how-it-works' },
];
export function Header() {
  return (
    <header className='flex w-full items-center justify-between gap-4 rounded-full bg-zinc-800 p-1 shadow-lg'>
      <Link
        to='/'
        className='flex items-center gap-2 rounded-full py-1 pl-4 pr-4 font-semibold text-white transition hover:bg-zinc-700 hover:text-slate-50 active:scale-95'
      >
        <DividyIcon className='rounded-lg bg-amber-200 p-1 text-zinc-800' />
        <p>Dividy</p>
      </Link>

      {!!navLinks.length && (
        <nav>
          <ul className='flex gap-1'>
            {navLinks.map((link) => (
              <li key={link.href}>
                <NavLink
                  to={link.href}
                  className={({ isActive }) =>
                    twMerge(
                      'flex items-center gap-2 rounded-full px-6 py-2 text-slate-50 transition hover:bg-zinc-700 active:scale-95',
                      isActive &&
                        'bg-amber-200 text-zinc-800 hover:bg-amber-200'
                    )
                  }
                >
                  {link.text}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

export default Header;
