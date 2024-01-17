interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}
export function RoundedButton({ children, className, ...props }: Props) {
  return (
    <button
      type='button'
      className={`block rounded-full px-4 py-3 transition hover:opacity-85 hover:active:opacity-100 disabled:opacity-40 disabled:active:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default RoundedButton;
