import { Link, NavLink } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';
import { DividyIcon } from '../ui';

export interface NavigationLink {
  text: string;
  href: string;
  icon?: React.ReactNode;
}

const navLinks: NavigationLink[] = [
  { text: 'Dividir gastos', href: '/split' },
  { text: '¿Cómo funciona?', href: '/how-it-works' },
];
export function Header() {
  return (
    <header className='flex w-fit items-center justify-between gap-10 rounded-full bg-zinc-800 p-1 shadow-lg'>
      <Link
        to='/'
        className='flex items-center gap-2 rounded-full py-1 pl-4 pr-8 font-semibold text-white transition hover:bg-zinc-700 hover:text-slate-50 active:scale-95'
      >
        <DividyIcon className='rounded-lg bg-amber-200 p-1 text-zinc-800' />
        <p>Dividy</p>
      </Link>

      <nav>
        <ul className='flex gap-1'>
          {navLinks.map((link) => (
            <li key={link.href}>
              <NavLink
                to={link.href}
                className={({ isActive }) =>
                  twMerge(
                    'flex items-center gap-2 rounded-full px-8 py-2 font-semibold text-slate-50 transition hover:bg-amber-200 hover:text-zinc-800 active:scale-95',
                    isActive && 'bg-amber-200 text-zinc-800'
                  )
                }
              >
                {link.text}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export default Header;
