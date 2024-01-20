import { NavLink } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';

export interface NavigationLink {
  text: string;
  href: string;
  icon?: JSX.Element;
}

const navLinks: NavigationLink[] = [
  { text: 'Dividir gastos', href: '/split' },
  { text: '¿Cómo funciona?', href: '/how-it-works' },
];
export function Navbar() {
  return (
    <nav className='rounded-full bg-gray-900 p-1'>
      <ul className='flex gap-1'>
        {navLinks.map((link) => (
          <li key={link.href}>
            <NavLink
              to={link.href}
              className={({ isActive }) =>
                twMerge(
                  'flex items-center justify-center gap-2 rounded-full px-8 py-2 font-semibold text-white transition hover:bg-amber-200 hover:text-black enabled:active:scale-95 disabled:opacity-60 disabled:active:opacity-60',
                  isActive && 'bg-amber-200 text-black'
                )
              }
            >
              {link.text}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Navbar;
