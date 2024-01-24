import { twMerge } from 'tailwind-merge';
import { IconButton } from '.';

interface Step {
  name: string;
  completed: boolean;
  icon?: React.ReactNode;
}

interface Props {
  steps: Step[];
  vertical?: boolean;
  onStepClick?: (name: string) => unknown;
  currentStep?: number;
}
export function Stepper({
  steps,
  vertical = false,
  onStepClick,
  currentStep,
}: Props) {
  return (
    <div className={twMerge('flex w-full gap-2', vertical && 'w-min flex-col')}>
      {steps.map((step, index) => (
        <div
          key={step.name}
          className={twMerge(
            'flex w-full flex-col items-center justify-center',
            vertical && 'flex-row'
          )}
        >
          <div
            className={twMerge(
              'h-2 w-full rounded-full bg-gray-300 shadow-sm',
              vertical && 'h-28 w-3',
              step.completed && 'bg-amber-200'
            )}
          ></div>

          {step.icon && (
            <IconButton
              disabled={!step.completed}
              className={twMerge(
                'text-gray-400',
                step.completed && 'text-gray-500',
                index === currentStep && 'text-zinc-800'
              )}
              onClick={() => {
                onStepClick && onStepClick(step.name);
              }}
            >
              {step.icon}
            </IconButton>
          )}
        </div>
      ))}
    </div>
  );
}

export default Stepper;
