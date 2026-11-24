import { FormField } from '@/components/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CURRENCY_CODES,
  CURRENCY_LOCKED_MESSAGE,
  currencyLabel,
  isCurrencyCode,
  type CurrencyCode,
} from '@/domain';

interface CurrencyFieldProps {
  value: CurrencyCode;
  onValueChange: (currency: CurrencyCode) => void;
  /** Locked because the group already has expenses or payments: says why. */
  locked?: boolean;
  error?: string;
}

/**
 * "Moneda": one compact row with the supported currencies (ADR 0009). Used
 * when creating a group and when editing it; when `locked` it is disabled and
 * explains the rule instead of letting the user try.
 */
export function CurrencyField({
  value,
  onValueChange,
  locked = false,
  error,
}: CurrencyFieldProps) {
  return (
    <FormField
      label='Moneda'
      error={error}
      hint={locked ? CURRENCY_LOCKED_MESSAGE : undefined}
    >
      {(c) => (
        <Select
          value={value}
          disabled={locked}
          onValueChange={(next) => {
            if (isCurrencyCode(next)) onValueChange(next);
          }}
        >
          <SelectTrigger {...c}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCY_CODES.map((code) => (
              <SelectItem key={code} value={code}>
                {currencyLabel(code)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FormField>
  );
}
