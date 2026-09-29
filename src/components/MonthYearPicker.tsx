import { MonthPickerInput, YearPickerInput } from '@mantine/dates';
import type { DateValue } from '@mantine/dates';

type PickerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

function valueAsDate(value: DateValue): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function MonthYearPicker({
  year,
  month,
  onChange,
  label,
  'data-testid': dataTestId,
  size = 'sm',
  w = 180,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  label?: string;
  'data-testid'?: string;
  size?: PickerSize;
  w?: number;
}) {
  return (
    <MonthPickerInput
      data-testid={dataTestId}
      label={label}
      value={new Date(year, month - 1, 1)}
      onChange={(value) => {
        const date = valueAsDate(value);
        if (date) onChange(date.getFullYear(), date.getMonth() + 1);
      }}
      valueFormat="MMMM YYYY"
      size={size}
      w={w}
      clearable={false}
      allowDeselect={false}
    />
  );
}

export function YearPicker({
  year,
  onChange,
  label,
  'data-testid': dataTestId,
  size = 'sm',
  w = 110,
}: {
  year: number;
  onChange: (year: number) => void;
  label?: string;
  'data-testid'?: string;
  size?: PickerSize;
  w?: number;
}) {
  return (
    <YearPickerInput
      data-testid={dataTestId}
      label={label}
      value={new Date(year, 0, 1)}
      onChange={(value) => {
        const date = valueAsDate(value);
        if (date) onChange(date.getFullYear());
      }}
      valueFormat="YYYY"
      size={size}
      w={w}
      clearable={false}
      allowDeselect={false}
    />
  );
}
