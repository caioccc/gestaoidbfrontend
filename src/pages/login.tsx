import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Button,
  TextInput,
  PasswordInput,
  Text,
  Title,
  Anchor,
  Alert,
  Stack,
  Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import AuthShell from '../components/AuthShell';
import { useLanguage } from '../i18n';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      sessionStorage.getItem('idb_pending_approval') === '1'
    ) {
      setPending(true);
    }
  }, []);

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : t.email),
      password: (v) => (v.length >= 6 ? null : t.password),
    },
  });

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    setPending(false);
    setPendingMsg(null);
    try {
      await login(values.email, values.password);
      sessionStorage.removeItem('idb_pending_approval');
      notifications.show({
        color: 'green',
        title: 'Bem-vindo!',
        message: 'Login realizado com sucesso.',
      });
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 403) {
        sessionStorage.removeItem('idb_pending_approval');
        setPending(true);
        setPendingMsg(detail || null);
      } else if (status === 401) {
        const pendingFlag =
          typeof window !== 'undefined' && sessionStorage.getItem('idb_pending_approval') === '1';
        if (pendingFlag) {
          setPending(true);
          setPendingMsg(t.loginPage.inactive);
        } else {
          setError(t.loginPage.invalidCredentials);
        }
      } else {
        setError(detail || t.loginPage.invalidCredentials);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={2}>{t.loginPage.title}</Title>
          <Text c="dimmed" size="sm">
            {t.loginPage.subtitle}
          </Text>
        </Stack>

        {pending && (
          <Alert icon={<IconInfoCircle size={16} />} color="yellow" title={t.overview}>
            {pendingMsg || t.loginPage.inactive}
          </Alert>
        )}

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            {error}
          </Alert>
        )}

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              data-testid="login-email"
              label={t.email}
              placeholder="email@igreja.org.br"
              required
              {...form.getInputProps('email')}
            />
            <PasswordInput
              data-testid="login-password"
              label={t.password}
              placeholder="••••••••"
              required
              {...form.getInputProps('password')}
            />
            <Button data-testid="login-submit" type="submit" fullWidth loading={loading}>
              {t.login}
            </Button>
          </Stack>
        </form>

        <Group justify="center" gap={4}>
          <Text size="sm" c="dimmed">
            {t.loginPage.needAccount}
          </Text>
          <Anchor data-testid="login-goto-register" size="sm" onClick={() => router.push('/register')}>
            {t.register}
          </Anchor>
        </Group>
      </Stack>
    </AuthShell>
  );
}
