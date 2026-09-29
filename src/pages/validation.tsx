import React, { useCallback, useEffect, useState } from 'react';
import { Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import PageHeader from '../components/PageHeader';
import { MonthYearPicker } from '../components/MonthYearPicker';
import ValidationPanel from '../components/ValidationPanel';
import SignatureModal from '../components/SignatureModal';
import { useLanguage } from '../i18n';
import { financeApi } from '../api/finance';
import { MonthlyValidationResponse } from '../types';

export default function ValidationPage() {
  const { t } = useLanguage();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [data, setData] = useState<MonthlyValidationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [signModal, setSignModal] = useState<{ open: boolean; action: 'approve' | 'reject' }>({
    open: false,
    action: 'approve',
  });

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

  const handleSubmit = async (action: 'approve' | 'reject', photo: string, signature: string) => {
    const setter = action === 'reject' ? setRejecting : setApproving;
    setter(true);
    try {
      await financeApi.submitValidation(year, month, action, note, photo, signature);
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
          <MonthYearPicker
            data-testid="validation-period"
            label={`${t.validationPage.monthLabel}/${t.validationPage.yearLabel}`}
            year={year}
            month={month}
            onChange={(nextYear, nextMonth) => {
              setYear(nextYear);
              setMonth(nextMonth);
            }}
            w={190}
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
        onApprove={() => setSignModal({ open: true, action: 'approve' })}
        onReject={() => setSignModal({ open: true, action: 'reject' })}
        role="treasury"
      />

      <SignatureModal
        opened={signModal.open}
        action={signModal.action}
        onClose={() => setSignModal((p) => ({ ...p, open: false }))}
        onConfirm={(photo, signature) => handleSubmit(signModal.action, photo, signature)}
      />
    </>
  );
}
