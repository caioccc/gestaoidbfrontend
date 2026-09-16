import React, { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { Center, Text } from '@mantine/core';
import PageHeader from '../components/PageHeader';
import ChurchProfileForm from '../components/ChurchProfileForm';
import { useLanguage } from '../i18n';
import { accountsApi } from '../api/accounts';
import { useAuth, useRoleHelpers } from '../contexts/AuthContext';

export default function SettingsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { hasRole, isAdmin } = useRoleHelpers(user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Record<string, any> | null>(null);

  const canEditProfile = isAdmin || !hasRole('MUSICO', 'LOUVOR');

  useEffect(() => {
    if (!canEditProfile) {
      setLoading(false);
      return;
    }
    accountsApi
      .getProfile()
      .then((data) => setProfile(data))
      .catch(() => {
        notifications.show({ color: 'red', message: 'Não foi possível carregar o perfil.' });
      })
      .finally(() => setLoading(false));
  }, [canEditProfile]);

  const handleSave = async (payload: Record<string, any>) => {
    setSaving(true);
    try {
      await accountsApi.updateProfile(payload);
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

  const handleResetPassword = async (newPassword: string) => {
    await accountsApi.resetPassword(newPassword);
  };

  if (!canEditProfile) {
    return (
      <>
        <PageHeader title={t.settingsPage.title} />
        <Center py="xl">
          <Text c="dimmed">Você não tem acesso a esta página.</Text>
        </Center>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t.settingsPage.title} />
      <ChurchProfileForm
        loading={loading}
        initialValues={profile ?? undefined}
        saving={saving}
        onSave={handleSave}
        responsibleEmail={profile?.responsible_email}
        onResetPassword={handleResetPassword}
        canResetPassword={isAdmin || !hasRole('SECRETARIA')}
        showPrebenda={user?.church?.church_type !== 'CONGREGATION'}
      />
    </>
  );
}
