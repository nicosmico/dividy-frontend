import { useNavigate } from 'react-router';
import { RoundedButton } from '@/shared';

export const PageNotFound = () => {
  const navigate = useNavigate();
  return (
    <div className='grid h-svh w-full items-center justify-center'>
      <div>
        <h1 className='mb-5 text-xl'>Página no encontrada :(</h1>
        <RoundedButton
          className='w-full bg-zinc-900 text-white'
          onClick={() => navigate('/')}
        >
          Volver al sitio
        </RoundedButton>
      </div>
    </div>
  );
};
