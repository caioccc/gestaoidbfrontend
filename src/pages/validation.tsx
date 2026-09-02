import React, { useCallback, useEffect, useState } from 'react';
import { Group, Select } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import PageHeader from '../components/PageHeader';
import ValidationPanel from '../components/ValidationPanel';
import { useLanguage } from '../i18n';
import { financeApi } from '../api/finance';
import { MonthlyValidationResponse } from '../types';

const YEARS = [2022, 2023, 2024, 2025, 2026, 2027];

export default function ValidationPage() {
  const { t } = useLanguage();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [data, setData] = useState<MonthlyValidationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    financeApi
      .validation(year, month)
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleAction = async (action: 'approve' | 'reject') => {
    const setter = action === 'reject' ? setRejecting : setApproving;
    setter(true);
    try {
      await financeApi.submitValidation(year, month, action, note);
      setNote('');
      reload();
      notifications.show({ color: 'green', message: t.validationPage.approved });
    } catch (err: any) {
      notifications.show({
        color: 'red',
        title: 'Erro',
        message: err?.response?.data?.detail || 'Não foi possível salvar.',
      });
    } finally {
      setter(false);
    }
  };

  return (
    <>
      <PageHeader title={t.validationPage.title} description={t.validationPage.subtitle}>
        <Group gap="md" wrap="wrap">
          <Select
            data-testid="validation-year"
            label={t.validationPage.yearLabel}
            value={String(year)}
            onChange={(v) => v && setYear(Number(v))}
            data={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
            w={110}
          />
          <Select
            data-testid="validation-month"
            label={t.validationPage.monthLabel}
            value={String(month)}
            onChange={(v) => v && setMonth(Number(v))}
            data={t.months.map((m, i) => ({ value: String(i + 1), label: m }))}
            w={180}
          />
        </Group>
      </PageHeader>

      <ValidationPanel
        data={data}
        loading={loading}
        note={note}
        onNoteChange={setNote}
        approving={approving}
        rejecting={rejecting}
        onApprove={() => handleAction('approve')}
        onReject={() => handleAction('reject')}
        role="treasury"
      />
    </>
  );
}