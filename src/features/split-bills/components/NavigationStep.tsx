import { IconReceipt, IconReceipt2, IconUsers } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Stepper } from 'src/components/ui';
import { useBreakpoint } from 'src/hooks/useBreakpoint';

export function NavigationStep() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { md } = useBreakpoint();

  const handleRedirect = (relativePath: string) => {
    const basePath = pathname.split('/').slice(0, -1).join('/');
    navigate(`${basePath}/${relativePath}`);
  };

  return (
    <Stepper
      steps={[
        { name: 'members', completed: true, icon: <IconUsers /> },
        { name: 'bills', completed: false, icon: <IconReceipt /> },
        { name: 'totals', completed: false, icon: <IconReceipt2 /> },
      ]}
      onStepClick={handleRedirect}
      vertical={md}
    />
  );
}

export default NavigationStep;
