import React, { useEffect, useState } from 'react';
import {
  Paper,
  Stack,
  Title,
  Text,
  Button,
  Modal,
  Group,
  Loader,
  Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle } from '@tabler/icons-react';
import PageHeader from '../../../components/PageHeader';
import ChurchProfileForm from '../../../components/ChurchProfileForm';
import { useLanguage } from '../../../i18n';
import { accountsApi } from '../../../api/accounts';
import { AdminFinanceApi } from '../../../api/adminFinance';

interface SettingsSectionProps {
  churchId: number;
  churchLabel: string;
  api: AdminFinanceApi;
}

export default function SettingsSection({ churchId, churchLabel }: SettingsSectionProps) {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    let active = true;
    accountsApi
      .getChurchProfile(churchId)
      .then((data) => active && setProfile(data))
      .catch(() => {
        setProfile(null);
        notifications.show({ color: 'red', message: 'Não foi possível carregar o perfil.' });
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [churchId]);

  const handleSave = async (payload: Record<string, any>) => {
    setSaving(true);
    try {
      await accountsApi.updateChurchProfile(churchId, payload);
      notifications.show({
        color: 'green',
        title: t.settingsPage.saved,
        message: t.settingsPage.saved,
      });
    } catch (err: any) {
      notifications.show({
        color: 'red',
        title: 'Erro',
        message: err?.response?.data?.detail || 'Não foi possível salvar.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClearData = async () => {
    setClearing(true);
    try {
      const res = await accountsApi.clearChurchData(churchId);
      notifications.show({
        color: 'green',
        message: res.detail || 'Dados apagados.',
      });
      setConfirmOpen(false);
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao apagar os dados.' });
    } finally {
      setClearing(false);
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    await accountsApi.resetAdminChurchPassword(churchId, newPassword);
  };

  return (
    <>
      <PageHeader title={t.settingsPage.title} description={churchLabel} />

      <ChurchProfileForm
        loading={loading}
        initialValues={profile ?? undefined}
        saving={saving}
        onSave={handleSave}
        responsibleEmail={profile?.responsible_email}
        onResetPassword={handleResetPassword}
      />

      <Paper withBorder radius="md" p="md" mt="lg" style={{ borderColor: 'var(--mantine-color-red-4)' }}>
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={4}>
            <Title order={5} c="red">
              {t.adminSettings.clearTitle}
            </Title>
            <Text size="sm" c="dimmed">
              {t.adminSettings.clearDescription}
            </Text>
            <Text size="xs" c="dimmed">
              {t.adminSettings.clearWarning}
            </Text>
          </Stack>
          <Button
            data-testid="settings-clear-data"
            variant="outline"
            color="red"
            leftSection={<IconAlertTriangle size={16} />}
            onClick={() => setConfirmOpen(true)}
          >
            {t.adminSettings.clearButton}
          </Button>
        </Group>
      </Paper>

      <Modal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t.adminSettings.clearConfirmTitle}
        centered
      >
        <Stack gap="md">
          <Text size="sm">{t.adminSettings.clearConfirmBody}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              data-testid="settings-clear-confirm"
              color="red"
              loading={clearing}
              onClick={handleClearData}
            >
              {t.adminSettings.clearButton}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
