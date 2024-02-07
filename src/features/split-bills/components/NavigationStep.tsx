import { IconReceipt, IconReceipt2, IconUsers } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stepper } from 'src/components/ui';
import { Step } from 'src/components/ui/Stepper';
import { useBreakpoint } from 'src/hooks/useBreakpoint';

const steps: Step[] = [
  {
    name: 'members',
    completed: true,
    enabled: true,
    icon: <IconUsers />,
  },
  {
    name: 'bills',
    completed: false,
    enabled: true,
    icon: <IconReceipt />,
  },
  {
    name: 'totals',
    completed: false,
    enabled: true,
    icon: <IconReceipt2 />,
  },
];

export function NavigationStep() {
  const navigate = useNavigate();
  const { md } = useBreakpoint();
  const [currentStep, setCurrentStep] = useState(0);

  const handleRedirect = (index: number) => {
    setCurrentStep(index);
    const path = steps[index]?.name;
    navigate(path);
  };

  return (
    <Stepper
      steps={steps}
      onStepClick={handleRedirect}
      vertical={md}
      currentStep={currentStep}
    />
  );
}

export default NavigationStep;
