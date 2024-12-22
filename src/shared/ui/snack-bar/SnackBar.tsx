import Card from '../Card';
import RoundedButton from '../RoundedButton';

interface Props {
  message: string;
  onClose?: () => void;
}

export function SnackBar({ message, onClose }: Props) {
  return (
    <Card className='flex items-center justify-between gap-2.5 bg-zinc-800 p-4 text-gray-50'>
      <div className='text-balance text-sm'>{message}</div>
      <RoundedButton
        className='bg-gray-50 px-3 py-1 text-sm text-zinc-800'
        onClick={onClose}
      >
        Cerrar
      </RoundedButton>
    </Card>
  );
}

export default SnackBar;
