import React, { useEffect, useRef, useState } from 'react';
import { TextInput, TextInputProps, Text } from '@mantine/core';

export interface MoneyInputProps extends Omit<TextInputProps, 'value' | 'onChange'> {
  value?: number | string | null | '';
  onValueChange?: (value: number | '') => void;
  percentage?: boolean;
}

function canonical(n: number, minDecimals: number, maxDecimals: number): string {
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
}

function importValue(value: number | string | null | undefined): number | null {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const s = value.trim();
  if (!s) return null;
  let normalized: string;
  if (s.includes(',')) {
    // Vírgula é o separador decimal; pontos são milhares ("1.000,50").
    normalized = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes('.')) {
    const parts = s.split('.');
    if (parts.length > 2) {
      // Múltiplos pontos indicam milhares ("1.000.000").
      normalized = s.replace(/\./g, '');
    } else {
      const frac = parts[1] ?? '';
      // "10.00" e "7.5" são decimais; "1.000" (frac com 3 dígitos e int curto) é milhar.
      const isThousandsGroup =
        frac.length === 3 && parts[0].length >= 1 && parts[0].length <= 3;
      normalized = isThousandsGroup ? s.replace(/\./g, '') : s;
    }
  } else {
    normalized = s;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function sanitizeDraft(s: string): string {
  let v = s.replace(/[^\d,.]/g, '');
  if (!v) return v;

  const lastComma = v.lastIndexOf(',');
  const lastDot = v.lastIndexOf('.');
  const comma = lastComma !== -1;
  const dot = lastDot !== -1;

  let decimalSep: ',' | '.' = ',';
  if (comma && dot) {
    decimalSep = lastComma > lastDot ? ',' : '.';
  } else if (comma) {
    decimalSep = ',';
  } else if (dot) {
    decimalSep = '.';
  }

  const decIdx = decimalSep === ',' ? lastComma : lastDot;
  const intPart = (decIdx === -1 ? v : v.slice(0, decIdx)).replace(/[^\d]/g, '');
  const decPart = (decIdx === -1 ? '' : v.slice(decIdx + 1).replace(/[^\d]/g, '')).slice(0, 2);

  if (decIdx === -1) return intPart;
  return `${intPart},${decPart}`;
}

function parseDraft(s: string): number | null {
  if (!s.trim() || s.trim() === ',' || s.trim() === '.') return null;
  let normalized: string;
  if (s.includes(',')) {
    normalized = s.replace(/\./g, '').replace(',', '.');
  } else {
    // O draft sanitizado tem um único ponto: em percentual é decimal ("10.5").
    normalized = s;
  }
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

export default function MoneyInput({
  value,
  onValueChange,
  percentage = false,
  ...rest
}: MoneyInputProps) {
  const initial = importValue(value);
  const [draft, setDraft] = useState<string>(
    initial === null
      ? ''
      : percentage
        ? canonical(initial, 0, 2)
        : canonical(initial, 2, 2)
  );
  const focused = useRef(false);

  useEffect(() => {
    if (focused.current) return;
    const imported = importValue(value);
    setDraft(
      imported === null
        ? ''
        : percentage
          ? canonical(imported, 0, 2)
          : canonical(imported, 2, 2)
    );
  }, [value, percentage]);

  return (
    <TextInput
      inputMode="decimal"
      autoComplete="off"
      leftSection={
        <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
          {percentage ? '%' : 'R$'}
        </Text>
      }
      {...rest}
      value={draft}
      onChange={(e) => {
        const sanitized = sanitizeDraft(e.target.value);
        if (sanitized === draft) return;
        setDraft(sanitized);
        const parsed = parseDraft(sanitized);
        onValueChange?.(parsed === null ? '' : parsed);
      }}
      onFocus={(e) => {
        focused.current = true;
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.current = false;
        let parsed = parseDraft(draft);
        if (parsed !== null && percentage) {
          parsed = Math.min(100, Math.max(0, parsed));
        }
        const next =
          parsed === null
            ? ''
            : percentage
              ? canonical(parsed, 0, 2)
              : canonical(parsed, 2, 2);
        setDraft(next);
        onValueChange?.(parsed === null ? '' : parsed);
        rest.onBlur?.(e);
      }}
    />
  );
}