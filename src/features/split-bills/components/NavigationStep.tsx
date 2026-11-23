import { IconReceipt, IconReceipt2, IconUsers } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router';
import { Step, Stepper, useBreakpoint } from '@/shared';
import useBills from '../hooks/useBills';
import useMembers from '../hooks/useMembers';

export function NavigationStep() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { md } = useBreakpoint();
  const { billsOrder } = useBills();
  const { membersOrder } = useMembers();

  const steps: Step[] = [
    {
      path: 'members',
      icon: <IconUsers size={20} />,
    },
    {
      path: 'bills',
      icon: <IconReceipt size={20} />,
      disabled: membersOrder.length < 2,
    },
    {
      path: 'simplified-debts',
      icon: <IconReceipt2 size={20} />,
      disabled: billsOrder.length < 1,
    },
  ];

  const currentStep = steps.findIndex(
    (step) => step.path === pathname.split('/').pop()
  );

  const handleRedirect = (index: number) => {
    const path = steps[index]?.path;
    navigate(path);
  };

  return (
    <Stepper
      steps={steps}
      onStepClick={handleRedirect}
      vertical={md}
      currentStep={currentStep}
      completeAll={currentStep === steps.length - 1}
    />
  );
}

export default NavigationStep;
