import { IconReceipt, IconReceipt2, IconUsers } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Step, Stepper, useBreakpoint } from 'src/shared';
import useBills from '../hooks/useBills';
import useMembers from '../hooks/useMembers';

export function NavigationStep() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { md } = useBreakpoint();
  const [currentStep, setCurrentStep] = useState(0);
  const { billsOrder } = useBills();
  const { membersOrder } = useMembers();

  const [steps, setSteps] = useState<Step[]>([
    {
      path: 'members',
      icon: <IconUsers size={20} />,
    },
    {
      path: 'bills',
      icon: <IconReceipt size={20} />,
    },
    {
      path: 'simplified-debts',
      icon: <IconReceipt2 size={20} />,
    },
  ]);

  useEffect(() => {
    const index = steps.findIndex(
      (step) => step.path === pathname.split('/').pop()
    );
    setCurrentStep(index);
  }, [pathname, steps]);

  useEffect(() => {
    setSteps((prev) => {
      return prev.map((step, index) => {
        if (index === 1) {
          return {
            ...step,
            disabled: membersOrder.length < 2,
          };
        }

        if (index === 2) {
          return {
            ...step,
            disabled: billsOrder.length < 1,
          };
        }

        return step;
      });
    });
  }, [billsOrder, membersOrder]);

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
