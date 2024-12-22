import { IconReceipt, IconReceipt2, IconUsers } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Step, Stepper, useBreakpoint } from 'src/shared';

const steps: Step[] = [
  {
    path: 'members',
    enabled: true,
    icon: <IconUsers />,
  },
  {
    path: 'bills',
    enabled: true,
    icon: <IconReceipt />,
  },
  {
    path: 'simplified-debts',
    enabled: true,
    icon: <IconReceipt2 />,
  },
];

export function NavigationStep() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { md } = useBreakpoint();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const index = steps.findIndex(
      (step) => step.path === pathname.split('/').pop()
    );
    setCurrentStep(index);
  }, [pathname]);

  const handleRedirect = (index: number) => {
    setCurrentStep(index);
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
