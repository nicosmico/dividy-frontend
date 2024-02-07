import { twMerge } from 'tailwind-merge';
import { IconButton } from '.';

export interface Step {
  name: string;
  completed: boolean;
  enabled: boolean;
  icon?: React.ReactNode;
}

interface Props {
  steps: Step[];
  vertical?: boolean;
  onStepClick?: (index: number) => unknown;
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
              vertical && 'h-28 w-3'
            )}
          >
            <div
              className={twMerge(
                'h-0 w-0 rounded-full transition-all',
                twMerge(
                  vertical ? 'w-full' : 'h-full',
                  step.completed && 'h-full w-full bg-amber-200',
                  index === currentStep &&
                    !step.completed &&
                    (vertical ? 'h-1/6 bg-amber-200' : 'w-1/6 bg-amber-200')
                )
              )}
            ></div>
          </div>

          {step.icon && (
            <IconButton
              disabled={!step.enabled}
              className={twMerge(
                'text-zinc-400',
                step.enabled && 'text-zinc-500',
                index === currentStep && 'text-zinc-900'
              )}
              onClick={() => {
                onStepClick && onStepClick(index);
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
