import React, { useEffect, useMemo, useState } from 'react';
import { Select, Stack, TextInput } from '@mantine/core';
import { accountsApi } from '../api/accounts';
import { AccountingCategoryOption } from '../types';
import { useLanguage } from '../i18n';

const CUSTOM = '__custom__';

interface Props {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  dataTestId?: string;
}

export default function AccountingCategorySelect({
  value,
  onChange,
  required = false,
  dataTestId = 'accounting-category',
}: Props) {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<AccountingCategoryOption[]>([]);
  const [customAllowed, setCustomAllowed] = useState(false);
  const [toggledCustom, setToggledCustom] = useState(false);

  useEffect(() => {
    accountsApi
      .accountingCategories()
      .then((res) => {
        setCategories(res.categories);
        setCustomAllowed(res.custom_allowed);
      })
      .catch(() => {
        setCategories([]);
        setCustomAllowed(false);
      });
  }, []);

  const isKnown = categories.some((c) => c.value === value);
  const customMode = toggledCustom || (value !== '' && !isKnown);

  const selectData = useMemo(() => {
    const base = categories.map((c) => ({ value: c.value, label: c.label }));
    return customAllowed
      ? [{ value: CUSTOM, label: t.approvalsPage.customOther }, ...base]
      : base;
  }, [categories, customAllowed, t]);

  const selectValue = customMode ? CUSTOM : isKnown ? value : null;

  return (
    <Stack gap="xs">
      <Select
        label={t.approvalsPage.categoryLabel}
        description={t.approvalsPage.categoryHint}
        placeholder={t.approvalsPage.categoryPlaceholder}
        required={required}
        searchable
        clearable
        value={selectValue}
        data={selectData}
        onChange={(v) => {
          if (v === CUSTOM) {
            setToggledCustom(true);
            onChange('');
          } else {
            setToggledCustom(false);
            onChange(v ?? '');
          }
        }}
        data-testid={dataTestId}
      />
      {customMode && (
        <TextInput
          label={t.approvalsPage.customCategoryLabel}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          data-testid={`${dataTestId}-custom`}
        />
      )}
    </Stack>
  );
}