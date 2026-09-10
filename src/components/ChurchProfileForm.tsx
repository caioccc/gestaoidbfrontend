import React, { useEffect, useState } from 'react';
import {
  Stack,
  TextInput,
  PasswordInput,
  Group,
  Button,
  Paper,
  Text,
  Title,
  Loader,
  Select,
  Divider,
  Box,
  Modal,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconKey } from '@tabler/icons-react';
import MaskedTextInput from './MaskedTextInput';
import MoneyInput from './MoneyInput';
import { useLanguage } from '../i18n';
import { toUpperCamelWords } from '../utils/format';

const UF_LIST = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export interface ProfileFormValues {
  name: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  pastoral_prebenda_percent: string;
}

interface ChurchProfileFormProps {
  loading: boolean;
  initialValues?: Partial<ProfileFormValues> & {
    pastor_name?: string;
    treasurer_name?: string;
  };
  saving: boolean;
  onSave: (payload: Record<string, any>) => Promise<void>;
  responsibleEmail?: string | null;
  onResetPassword?: (newPassword: string) => Promise<void>;
  showPrebenda?: boolean;
  canResetPassword?: boolean;
}

export default function ChurchProfileForm({
  loading,
  initialValues,
  saving,
  onSave,
  responsibleEmail,
  onResetPassword,
  showPrebenda = true,
  canResetPassword = true,
}: ChurchProfileFormProps) {
  const { t } = useLanguage();
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const form = useForm<ProfileFormValues>({
    initialValues: {
      name: '',
      phone: '',
      cep: '',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      latitude: null,
      longitude: null,
      pastoral_prebenda_percent: '10',
    },
    validate: {
      name: (v) => (v.trim().length ? null : t.registerPage.churchName),
      phone: (v) => (v && v.replace(/\D/g, '').length >= 10 ? null : t.registerPage.phoneInvalid),
      city: (v) => (v.trim().length ? null : t.registerPage.city),
      state: (v) => (v.trim().length ? null : t.registerPage.state),
      pastoral_prebenda_percent: (v) => {
        const n = Number(
          String(v).includes(',') ? String(v).replace(',', '.') : String(v)
        );
        return !Number.isNaN(n) && n >= 0 && n <= 100 ? null : 'Valor entre 0 e 100';
      },
    },
  });

  const addressQuery = [
    form.values.street,
    form.values.number,
    form.values.neighborhood,
    form.values.city,
    form.values.state,
  ]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(', ');

  useEffect(() => {
    if (initialValues) {
      form.setValues({
        name: initialValues.name ?? '',
        phone: initialValues.phone ?? '',
        cep: initialValues.cep ?? '',
        street: initialValues.street ?? '',
        number: initialValues.number ?? '',
        neighborhood: initialValues.neighborhood ?? '',
        city: initialValues.city ?? '',
        state: initialValues.state ?? '',
        latitude: initialValues.latitude ?? null,
        longitude: initialValues.longitude ?? null,
        pastoral_prebenda_percent:
          initialValues.pastoral_prebenda_percent != null
            ? String(initialValues.pastoral_prebenda_percent)
            : '10',
      });
      form.resetDirty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  const handleCepBlur = async (cepValue: string) => {
    setCepError(null);
    const clean = cepValue.replace(/\D/g, '');
    if (clean.length !== 8) {
      setCepError(t.registerPage.cepInvalid);
      return;
    }
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError(t.registerPage.cepError);
      } else {
        form.setValues((prev) => ({
          ...prev,
          street: data.logradouro ?? prev.street,
          neighborhood: data.bairro ?? prev.neighborhood,
          city: data.localidade ?? prev.city,
          state: data.uf ?? prev.state,
        }));
      }
    } catch {
      setCepError(t.registerPage.cepError);
    } finally {
      setCepLoading(false);
    }
  };

  const handleSave = async () => {
    const prebendaRaw = String(form.values.pastoral_prebenda_percent || '').trim();
    const prebendaValue = Number(
      prebendaRaw.includes(',') ? prebendaRaw.replace(',', '.') : prebendaRaw
    );
    const payload = {
      ...form.values,
      name: toUpperCamelWords(form.values.name),
      street: toUpperCamelWords(form.values.street || ''),
      neighborhood: toUpperCamelWords(form.values.neighborhood || ''),
      city: toUpperCamelWords(form.values.city || ''),
      phone: form.values.phone.replace(/\D/g, ''),
      pastoral_prebenda_percent: Number.isNaN(prebendaValue) ? 10 : prebendaValue,
    };
    await onSave(payload);
  };

  const resetPasswordValid = () => {
    if (newPassword.length < 6 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return false;
    }
    if (newPassword !== repeatPassword) {
      return false;
    }
    return true;
  };

  const handleContinueReset = () => {
    if (!resetPasswordValid()) {
      setResetError('A senha deve ter ao menos 6 caracteres, com letras e números, e as duas senhas devem coincidir.');
      return;
    }
    setResetError(null);
    setResetOpen(false);
    setConfirmOpen(true);
  };

  const handleConfirmReset = async () => {
    if (!onResetPassword) return;
    setResetting(true);
    setResetError(null);
    try {
      await onResetPassword(newPassword);
      notifications.show({ color: 'green', message: t.settingsPage.passwordChanged });
      setConfirmOpen(false);
      setNewPassword('');
      setRepeatPassword('');
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || 'Não foi possível alterar a senha.';
      setResetError(msg);
      setConfirmOpen(false);
      setResetOpen(true);
    } finally {
      setResetting(false);
    }
  };

  const getCepGeo = async () => {
    const clean = form.values.cep.replace(/\D/g, '');
    if (clean.length !== 8) {
      notifications.show({ color: 'yellow', message: 'Informe um CEP válido.' });
      return;
    }
    setCepLoading(true);
    try {
      const viacepCache = await fetch(`https://viacep.com.br/ws/${clean}/json/`).then((r) => r.json());
      const uf = viacepCache.uf;
      const city = viacepCache.localidade;
      if (!uf || !city) {
        notifications.show({ color: 'yellow', message: 'CEP não localizado.' });
        return;
      }
      const geocode = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${city}, ${uf}, Brazil`)}&limit=1`
      ).then((r) => r.json());
      if (geocode?.[0]) {
        form.setValues((prev) => ({
          ...prev,
          latitude: parseFloat(geocode[0].lat),
          longitude: parseFloat(geocode[0].lon),
        }));
      } else {
        notifications.show({ color: 'yellow', message: 'Não foi possível geolocalizar.' });
      }
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao buscar coordenadas.' });
    } finally {
      setCepLoading(false);
    }
  };

  if (loading) {
    return (
      <Box ta="center" py="xl">
        <Loader />
      </Box>
    );
  }

  return (
    <>
      <Paper withBorder radius="md" p="md">
      <form onSubmit={form.onSubmit(handleSave)}>
        <Stack gap="lg">
          <Stack gap="sm">
            <Title order={5}>{t.settingsPage.registrationData}</Title>
            <Group grow align="flex-start">
              <TextInput
                data-testid="settings-pastor"
                label={t.registerPage.pastor}
                value={toUpperCamelWords(initialValues?.pastor_name || '')}
                readOnly
              />
              {initialValues?.treasurer_name ? (
                <TextInput
                  data-testid="settings-treasurer"
                  label={t.registerPage.treasurer}
                  value={toUpperCamelWords(initialValues.treasurer_name)}
                  readOnly
                />
              ) : null}
            </Group>
            <Text size="xs" c="dimmed">
              {t.settingsPage.registrationDataHint}
            </Text>
          </Stack>

          <Divider label={t.settingsPage.churchData} labelPosition="left" />

          <Stack gap="sm">
            <TextInput
              data-testid="settings-name"
              label={t.registerPage.churchName}
              required
              {...form.getInputProps('name')}
            />
            <MaskedTextInput
              data-testid="settings-phone"
              label={t.registerPage.phone}
              placeholder="(00) 00000-0000"
              required
              mask="(00) 00000-0000"
              value={form.values.phone}
              error={form.errors.phone}
              onAccept={(value: string) => form.setFieldValue('phone', value)}
            />
            {showPrebenda && (
              <MoneyInput
                data-testid="settings-prebenda"
                label={t.settingsPage.prebendaPercent}
                description={t.settingsPage.prebendaHint}
                percentage
                value={form.values.pastoral_prebenda_percent}
                onValueChange={(v) =>
                  form.setFieldValue(
                    'pastoral_prebenda_percent',
                    v === '' ? '' : String(v)
                  )
                }
                error={form.errors.pastoral_prebenda_percent}
              />
            )}
            <Group align="flex-end">
              <TextInput
                data-testid="settings-responsible-email"
                label={t.settingsPage.responsibleEmail}
                value={responsibleEmail ?? ''}
                readOnly
                disabled={!responsibleEmail}
                style={{ flex: 1 }}
              />
              {canResetPassword && (
                <Button
                  data-testid="settings-reset-password"
                  variant="light"
                  color="orange"
                  leftSection={<IconKey size={16} />}
                  disabled={!responsibleEmail || !onResetPassword}
                  onClick={() => {
                    setNewPassword('');
                    setRepeatPassword('');
                    setResetError(null);
                    setResetOpen(true);
                  }}
                >
                  {t.settingsPage.resetPassword}
                </Button>
              )}
            </Group>
            {!responsibleEmail && (
              <Text size="xs" c="dimmed">
                {t.settingsPage.noResponsible}
              </Text>
            )}
          </Stack>

          <Divider label={t.settingsPage.address} labelPosition="left" />

          <Stack gap="sm">
            <Group grow align="flex-start">
              <MaskedTextInput
                data-testid="settings-cep"
                label={t.registerPage.cep}
                description={t.registerPage.cepHint}
                placeholder="00000-000"
                maxLength={9}
                mask="00000-000"
                error={cepError ?? false}
                rightSection={cepLoading ? <Loader size="xs" /> : null}
                value={form.values.cep}
                onAccept={(value: string) => form.setFieldValue('cep', value)}
                onBlur={() => handleCepBlur(form.values.cep)}
              />
              <TextInput data-testid="settings-number" label={t.registerPage.number} style={{ maxWidth: 140 }} {...form.getInputProps('number')} />
            </Group>
            <Group grow align="flex-start">
              <TextInput data-testid="settings-street" label={t.registerPage.street} {...form.getInputProps('street')} />
              <TextInput data-testid="settings-neighborhood" label={t.registerPage.neighborhood} {...form.getInputProps('neighborhood')} />
            </Group>
            <Group grow>
              <TextInput data-testid="settings-city" label={t.registerPage.city} required {...form.getInputProps('city')} />
              <Select
                data-testid="settings-state"
                label={t.registerPage.state}
                data={UF_LIST}
                searchable
                required
                {...form.getInputProps('state')}
                style={{ maxWidth: 160 }}
              />
            </Group>

            {addressQuery ? (
              <Box style={{ height: 220, borderRadius: 8, overflow: 'hidden' }}>
                <iframe
                  title="mapa-endereco"
                  data-testid="settings-address-map"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(addressQuery)}&z=16&output=embed`}
                  style={{ border: 0, width: '100%', height: '100%' }}
                  loading="lazy"
                />
              </Box>
            ) : (
              <Text size="xs" c="dimmed">
                Preencha o endereço (logradouro, número, bairro, cidade e UF) para exibir o mapa.
              </Text>
            )}

            <Button data-testid="settings-locate" variant="light" onClick={getCepGeo} loading={cepLoading} mt="xs">
              Localizar no mapa
            </Button>
          </Stack>

          <Group justify="flex-end">
            <Button data-testid="settings-save" type="submit" loading={saving}>
              {t.common.save}
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>

    <Modal
      opened={resetOpen}
      onClose={() => setResetOpen(false)}
      title={t.settingsPage.resetTitle}
      centered
    >
      <Stack gap="md">
        <Text size="sm">{t.settingsPage.resetBody}</Text>
        <PasswordInput
          data-testid="settings-new-password"
          label={t.settingsPage.newPassword}
          value={newPassword}
          onChange={(e) => setNewPassword(e.currentTarget.value)}
        />
        <PasswordInput
          data-testid="settings-repeat-password"
          label={t.settingsPage.repeatNewPassword}
          value={repeatPassword}
          onChange={(e) => setRepeatPassword(e.currentTarget.value)}
          error={repeatPassword && newPassword !== repeatPassword ? t.settingsPage.passwordMismatch : false}
        />
        {resetError && (
          <Alert icon={<IconAlertTriangle size={16} />} color="red" variant="light">
            {resetError}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setResetOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button data-testid="settings-reset-continue" onClick={handleContinueReset}>
            {t.registerPage.next}
          </Button>
        </Group>
      </Stack>
    </Modal>

    <Modal
      opened={confirmOpen}
      onClose={() => setConfirmOpen(false)}
      title={t.settingsPage.resetConfirmTitle}
      centered
    >
      <Stack gap="md">
        <Alert icon={<IconAlertTriangle size={16} />} color="orange" variant="light">
          {t.settingsPage.resetConfirmBody.replace('{email}', responsibleEmail ?? '')}
        </Alert>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setConfirmOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button
            data-testid="settings-reset-confirm"
            color="orange"
            loading={resetting}
            onClick={handleConfirmReset}
          >
            {t.settingsPage.resetPassword}
          </Button>
        </Group>
      </Stack>
    </Modal>
    </>
  );
}
