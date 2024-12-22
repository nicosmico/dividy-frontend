import { twMerge } from 'tailwind-merge';
import IconButton from './IconButton';

export interface Step {
  path: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface Props {
  steps: Step[];
  vertical?: boolean;
  onStepClick?: (index: number) => unknown;
  currentStep: number;
  completeAll: boolean;
}
export function Stepper({
  steps,
  vertical = false,
  onStepClick,
  currentStep,
  completeAll,
}: Props) {
  return (
    <div className={twMerge('flex w-full gap-2', vertical && 'w-min flex-col')}>
      {steps.map((step, index) => (
        <div
          key={step.path}
          className={twMerge(
            'flex w-full flex-col items-center justify-center',
            vertical && 'flex-row'
          )}
        >
          {step.icon && (
            <IconButton
              disabled={step.disabled}
              className={twMerge(
                'text-zinc-300',
                index === currentStep && 'scale-105 text-zinc-900 md:scale-125'
              )}
              onClick={() => {
                onStepClick && onStepClick(index);
              }}
            >
              {step.icon}
            </IconButton>
          )}

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
                  index === currentStep &&
                    (vertical ? 'h-1/6 bg-amber-200' : 'w-1/6 bg-amber-200'),
                  (index < currentStep || completeAll) &&
                    'h-full w-full bg-amber-200'
                )
              )}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Stepper;
