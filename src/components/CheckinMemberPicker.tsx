import React, { useEffect, useState } from 'react';
import { Select } from '@mantine/core';
import { accountsApi } from '../api/accounts';
import type { Member } from '../types';
import { useLanguage } from '../i18n';

interface CheckinMemberPickerProps {
  label: string;
  value: number | null;
  onChange: (id: number | null) => void;
  testId?: string;
}

export default function CheckinMemberPicker({ label, value, onChange, testId }: CheckinMemberPickerProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await accountsApi.members({
          search: search.trim() || undefined,
          status: 'ACTIVE',
          page_size: 20,
        });
        if (active) setMembers(result);
      } catch {
        if (active) setMembers([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  const options = members.map((member) => ({
    value: String(member.id),
    label: member.card_number ? `${member.name} · ${member.card_number}` : member.name,
  }));

  if (value && !options.some((option) => option.value === String(value))) {
    const selected = members.find((member) => member.id === value);
    if (selected) {
      options.unshift({
        value: String(selected.id),
        label: selected.card_number ? `${selected.name} · ${selected.card_number}` : selected.name,
      });
    }
  }

  return (
    <Select
      data-testid={testId}
      label={label}
      placeholder={t.common.search}
      searchable
      clearable
      nothingFoundMessage={loading ? t.common.loading : t.common.noData}
      data={options}
      value={value ? String(value) : null}
      onChange={(next) => onChange(next ? Number(next) : null)}
      onSearchChange={setSearch}
      limit={20}
    />
  );
}
