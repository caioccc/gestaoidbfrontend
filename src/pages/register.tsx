import React, { useEffect, useState } from 'react';
import {
  Button,
  TextInput,
  PasswordInput,
  Select,
  Stepper,
  Stack,
  Text,
  Title,
  Alert,
  Group,
  Loader,
  ThemeIcon,
  Box,
  Grid,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconCheck,
  IconBuildingChurch,
  IconMapPin,
  IconUser,
  IconBuildingMonument,
  IconUserShield,
} from '@tabler/icons-react';
import AuthShell from '../components/AuthShell';
import MaskedTextInput from '../components/MaskedTextInput';
import { useLanguage } from '../i18n';
import { accountsApi, RegisterChurchType, RegisterPayload } from '../api/accounts';
import { toUpperCamelWords, isValidEmail } from '../utils/format';

const UF_LIST = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const ROLE_OPTIONS = [
  { value: 'PASTOR', label: 'Pastor(a)' },
  { value: 'TESOUREIRO', label: 'Tesoureiro(a)' },
];

const CHURCH_TYPE_OPTIONS = [
  { value: 'INDEPENDENT', label: 'Sede (Igreja Independente)' },
  { value: 'CONGREGATION', label: 'Congregação' },
];

interface RegisterForm {
  church_type: string;
  church_name: string;
  parent_church: string;
  nationalCode: string;
  pastor_name: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  name: string;
  email: string;
  password: string;
  confirm: string;
  role: string;
}

export default function RegisterPage() {
  const { t } = useLanguage();
  const [active, setActive] = useState(0);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [registeredType, setRegisteredType] = useState<'INDEPENDENT' | 'CONGREGATION'>(
    'CONGREGATION'
  );
  const [mapQuery, setMapQuery] = useState<string | null>(null);
  const [parentOptions, setParentOptions] = useState<{ value: string; label: string }[]>([]);
  const [parentLoading, setParentLoading] = useState(false);
  const [parentQuery, setParentQuery] = useState('');
  const [debouncedParentQuery] = useDebouncedValue(parentQuery, 500);

  const loadParentChurches = async (q: string) => {
    setParentLoading(true);
    try {
      const rows = await accountsApi.searchParentChurches(q || undefined);
      setParentOptions(rows.map((c) => ({ value: String(c.id), label: c.name })));
    } catch {
      setParentOptions([]);
    } finally {
      setParentLoading(false);
    }
  };

  useEffect(() => {
    const trimmed = parentQuery.trim();
    if (trimmed.length < 3) return;
    loadParentChurches(trimmed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedParentQuery]);

  useEffect(() => {
    loadParentChurches('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<RegisterForm>({
    initialValues: {
      church_type: 'CONGREGATION',
      church_name: '',
      parent_church: '',
      nationalCode: '',
      pastor_name: '',
      phone: '',
      cep: '',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      name: '',
      email: '',
      password: '',
      confirm: '',
      role: '',
    },
    validate: {
      church_type: (v) => (v ? null : t.registerPage.churchTypeRequired),
      church_name: (v) => (v.trim().length ? null : t.registerPage.churchName),
      parent_church: (v, values) =>
        active >= 0 && values.church_type === 'CONGREGATION' && !v
          ? t.registerPage.parentRequired
          : null,
      phone: (v) => (v && v.replace(/\D/g, '').length >= 10 ? null : t.registerPage.phoneInvalid),
      city: (v) => (active >= 1 && !v.trim() ? t.registerPage.city : null),
      state: (v) => (active >= 1 && !v.trim() ? t.registerPage.state : null),
      name: (v) => (active >= 2 && !v.trim() ? t.registerPage.responsibleName : null),
      email: (v) => (active >= 2 && !isValidEmail(v) ? t.email : null),
      password: (v) =>
        active >= 2 &&
        typeof v === 'string' &&
        !(v.length > 5 && /[a-zA-Z]/.test(v) && /\d/.test(v))
          ? t.registerPage.passwordError
          : null,
      confirm: (v, values) =>
        active >= 2 && v !== values.password ? t.registerPage.passwordMismatch : null,
      role: (v) => (active >= 2 && !v ? t.registerPage.roleRequired : null),
    },
  });

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

  const nextStep = () => {
    const valid = form.validate();
    if (valid.hasErrors) return;
    setActive((c) => Math.min(c + 1, 2));
  };

  const handleSubmit = async () => {
    const valid = form.validate();
    if (valid.hasErrors) return;
    setSubmitting(true);
    setError(null);
    try {
      // Código Nacional não é enviado: o backend não possui esse campo
      const { nationalCode: _code, confirm: _confirm, parent_church, role, ...raw } = form.values;
      const payload: RegisterPayload = {
        ...raw,
        church_type: form.values.church_type as RegisterChurchType,
        role: role as 'PASTOR' | 'TESOUREIRO',
        church_name: toUpperCamelWords(raw.church_name),
        pastor_name: toUpperCamelWords(raw.pastor_name || ''),
        name: toUpperCamelWords(raw.name),
        street: toUpperCamelWords(raw.street || ''),
        neighborhood: toUpperCamelWords(raw.neighborhood || ''),
        city: toUpperCamelWords(raw.city || ''),
        email: raw.email.trim(),
        phone: raw.phone.replace(/\D/g, ''),
      };
      if (form.values.church_type === 'CONGREGATION') {
        payload.parent_church = Number(parent_church);
      }
      setRegisteredType(form.values.church_type as 'INDEPENDENT' | 'CONGREGATION');
      await accountsApi.register(payload);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('idb_pending_approval', '1');
      }
      setDone(true);
      notifications.show({
          color: 'green',
          title: t.registerPage.successTitle,
          message:
            form.values.church_type === 'INDEPENDENT'
              ? t.registerPage.pendingSede
              : t.registerPage.pendingCongregation,
        });
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.email?.[0] || data?.church_name?.[0] || data?.detail;
      setError(msg || 'Não foi possível concluir o cadastro. Verifique os dados.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNumberBlur = () => {
    const parts = [
      form.values.street,
      form.values.number,
      form.values.neighborhood,
      form.values.city,
      form.values.state,
    ].filter(Boolean);
    if (
      form.values.street &&
      form.values.number &&
      form.values.city &&
      form.values.state
    ) {
      setMapQuery(parts.join(', '));
    }
  };

  const showMap = Boolean(mapQuery);

  if (done) {
    return (
      <AuthShell>
        <Stack align="center" gap="md" py="lg">
          <ThemeIcon size={64} radius="xl" color="green" variant="light" data-testid="register-success-icon">
            <IconCheck size={34} />
          </ThemeIcon>
          <Title order={2} ta="center">
            {t.registerPage.successTitle}
          </Title>
          <Text ta="center" maw={480}>
            {t.registerPage.note}
          </Text>
          <Alert
            icon={<IconBuildingChurch size={16} />}
            color="blue"
            variant="light"
            w="100%"
            title={t.registerPage.note}
          >
            <Text size="sm">
              {registeredType === 'INDEPENDENT'
                ? t.registerPage.pendingSede
                : t.registerPage.pendingCongregation}
            </Text>
          </Alert>
          <Button variant="default" onClick={() => (window.location.href = '/login')} data-testid="register-go-login">
            {t.login}
          </Button>
        </Stack>
      </AuthShell>
    );
  }

  return (
    <AuthShell maxWidth={560}>
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={2}>{t.registerPage.title}</Title>
          <Text c="dimmed" size="sm">
            {t.registerPage.subtitle}
          </Text>
        </Stack>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" data-testid="register-error">
            {error}
          </Alert>
        )}

        <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false} size="sm">
          <Stepper.Step label={t.registerPage.stepChurch} icon={<IconBuildingChurch size={16} />}>
            <Stack gap="md" mt="md">
              <Select
                data-testid="register-church-type"
                label={t.registerPage.churchType}
                placeholder={t.registerPage.churchTypePlaceholder}
                required
                data={CHURCH_TYPE_OPTIONS}
                {...form.getInputProps('church_type')}
                onChange={(value) => {
                  form.setFieldValue('church_type', value as string);
                  if (value === 'INDEPENDENT') {
                    form.setFieldValue('parent_church', '');
                  }
                }}
              />
              {form.values.church_type === 'CONGREGATION' ? (
                <>
                  <Alert
                    icon={<IconBuildingMonument size={16} />}
                    color="blue"
                    variant="light"
                    title={t.registerPage.congregationNoticeTitle}
                  >
                    <Text size="sm">{t.registerPage.congregationNotice}</Text>
                  </Alert>
                  <Select
                    data-testid="register-parent"
                    label={t.registerPage.parentChurch}
                    placeholder={t.registerPage.parentPlaceholder}
                    description={t.registerPage.parentHint}
                    required
                    searchable
                    clearable
                    nothingFoundMessage={t.registerPage.parentNothingFound}
                    rightSection={parentLoading ? <Loader size="xs" /> : null}
                    data={parentOptions}
                    searchValue={parentQuery}
                    onSearchChange={setParentQuery}
                    {...form.getInputProps('parent_church')}
                  />
                </>
              ) : (
                <Alert
                  icon={<IconBuildingMonument size={16} />}
                  color="violet"
                  variant="light"
                  title={t.registerPage.sedeNoticeTitle}
                >
                  <Text size="sm">{t.registerPage.sedeNotice}</Text>
                </Alert>
              )}
              <TextInput
                data-testid="register-church-name"
                label={t.registerPage.churchName}
                placeholder="Igreja de Deus no Brasil - ..."
                required
                {...form.getInputProps('church_name')}
              />
              <TextInput
                data-testid="register-national-code"
                label={t.registerPage.nationalCode}
                placeholder="Opcional"
                description="Código nacional da igreja (se houver)"
                {...form.getInputProps('nationalCode')}
              />
              <Group grow>
                <TextInput
                  data-testid="register-pastor"
                  label={t.registerPage.pastor}
                  {...form.getInputProps('pastor_name')}
                />
              </Group>
              <MaskedTextInput
                data-testid="register-phone"
                label={t.registerPage.phone}
                placeholder="(00) 00000-0000"
                required
                mask="(00) 00000-0000"
                value={form.values.phone}
                error={form.errors.phone}
                onAccept={(value: string) => form.setFieldValue('phone', value)}
              />
            </Stack>
          </Stepper.Step>

          <Stepper.Step label={t.registerPage.stepAddress} icon={<IconMapPin size={16} />}>
            <Stack gap="md" mt="md">
              <MaskedTextInput
                data-testid="register-cep"
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
              <Grid gap="sm">
                <Grid.Col span={{ base: 12, sm: 8 }}>
                  <TextInput
                    data-testid="register-street"
                    label={t.registerPage.street}
                    placeholder="Av. Floriano Peixoto"
                    {...form.getInputProps('street')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <TextInput
                    data-testid="register-number"
                    label={t.registerPage.number}
                    {...form.getInputProps('number')}
                    onChange={(e) => {
                      const raw = e.currentTarget.value.replace(/\D/g, '');
                      form.setFieldValue('number', raw);
                    }}
                    onBlur={handleNumberBlur}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <TextInput
                    data-testid="register-neighborhood"
                    label={t.registerPage.neighborhood}
                    placeholder="Centro"
                    {...form.getInputProps('neighborhood')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 5 }}>
                  <TextInput
                    data-testid="register-city"
                    label={t.registerPage.city}
                    placeholder="Campina Grande"
                    required
                    {...form.getInputProps('city')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 3 }}>
                  <Select
                    data-testid="register-state"
                    label={t.registerPage.state}
                    placeholder="PB"
                    data={UF_LIST}
                    searchable
                    required
                    {...form.getInputProps('state')}
                  />
                </Grid.Col>
              </Grid>
              {mapQuery && (
                <Box style={{ height: 220, borderRadius: 8, overflow: 'hidden' }}>
                  <iframe
                    title="mapa-endereco"
                    data-testid="register-address-map"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=16&output=embed`}
                    style={{ border: 0, width: '100%', height: '100%' }}
                    loading="lazy"
                  />
                </Box>
              )}
            </Stack>
          </Stepper.Step>

          <Stepper.Step label={t.registerPage.stepAccess} icon={<IconUser size={16} />}>
            <Stack gap="md" mt="md">
              <Select
                data-testid="register-role"
                label={t.registerPage.role}
                placeholder={t.registerPage.rolePlaceholder}
                required
                data={ROLE_OPTIONS}
                {...form.getInputProps('role')}
              />
              <Alert icon={<IconUserShield size={16} />} color="violet" variant="light">
                <Text size="sm">{t.registerPage.roleNote}</Text>
              </Alert>
              <TextInput
                data-testid="register-name"
                label={t.registerPage.responsibleName}
                required
                {...form.getInputProps('name')}
              />
              <TextInput
                data-testid="register-email"
                label={t.email}
                placeholder="email@igreja.org.br"
                required
                {...form.getInputProps('email')}
              />
              <PasswordInput
                data-testid="register-password"
                label={t.password}
                description={t.registerPage.passwordHint}
                required
                {...form.getInputProps('password')}
              />
              <PasswordInput
                data-testid="register-confirm"
                label={t.confirmPassword}
                required
                {...form.getInputProps('confirm')}
              />
            </Stack>
          </Stepper.Step>
        </Stepper>

        <Group justify="space-between" mt="md">
          <Button
            data-testid="register-back"
            variant="default"
            onClick={() => active > 0 && setActive((c) => c - 1)}
            disabled={active === 0}
          >
            {t.registerPage.back}
          </Button>
          {active === 2 ? (
            <Button data-testid="register-submit" onClick={handleSubmit} loading={submitting}>
              {t.registerPage.finish}
            </Button>
          ) : (
            <Button data-testid="register-next" onClick={nextStep}>
              {t.registerPage.next}
            </Button>
          )}
        </Group>
      </Stack>
    </AuthShell>
  );
}
