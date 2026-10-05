import React, { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import ChurchProfileForm from '../components/ChurchProfileForm';
import { useLanguage } from '../i18n';
import { useFeedback } from '../hooks/useFeedback';
import { accountsApi } from '../api/accounts';
import { firstFieldError } from '../utils/apiError';
import { useAuth, useRoleHelpers } from '../contexts/AuthContext';

export default function SettingsPage() {
  const { t } = useLanguage();
  const fb = useFeedback();
  const { user } = useAuth();
  const { hasRole, isAdmin } = useRoleHelpers(user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Record<string, any> | null>(null);

  const readOnly = !isAdmin && hasRole('MUSICO', 'LOUVOR', 'PROFESSOR_EBD');
  const canEditProfile = !readOnly;

  useEffect(() => {
    if (!user?.church?.id) {
      setLoading(false);
      return;
    }
    accountsApi
      .getProfile()
      .then((data) => setProfile(data))
      .catch((err) => {
        fb.fromError(err, t.common.toast.loadFailed);
      })
      .finally(() => setLoading(false));
  }, [user?.church?.id]);

  const handleSave = async (payload: Record<string, any>) => {
    setSaving(true);
    try {
      await accountsApi.updateProfile(payload);
      fb.success(t.settingsPage.saved);
    } catch (err: any) {
      fb.fromError(
        err,
        firstFieldError(err?.response?.data, [
          'name',
          'logo',
          'state',
          'card_primary_color',
          'card_secondary_color',
        ]) || t.common.toast.saveFailed
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    await accountsApi.resetPassword(newPassword);
  };

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
        readOnly={readOnly}
      />
    </>
  );
}
