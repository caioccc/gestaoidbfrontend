import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Card,
  Group,
  Text,
  Stack,
  Badge,
  Button,
  Skeleton,
  ThemeIcon,
  Modal,
  SimpleGrid,
  TextInput,
  Select,
  Grid,
  Stepper,
  Alert,
  Box,
  Loader,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconBuildingChurch, IconBuilding, IconMapPin, IconPlus, IconTrash, IconPencil, IconRefresh, IconExternalLink, IconUser, IconAlertTriangle } from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import AccountingCategorySelect from '../components/AccountingCategorySelect';
import MaskedTextInput from '../components/MaskedTextInput';
import { useLanguage } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { accountsApi } from '../api/accounts';
import { Church, ChurchMembership, Role } from '../types';
import { toUpperCamelWords } from '../utils/format';

const UF_LIST = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const RESPONSIBLE_ROLES: { value: Role; label: string }[] = [
  { value: 'PASTOR', label: 'Pastor(a)' },
  { value: 'TESOUREIRO', label: 'Tesoureiro(a)' },
  { value: 'SECRETARIA', label: 'Secretaria' },
];

interface ChurchForm {
  name: string;
  phone: string;
  pastor_name: string;
  accounting_category: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  resp_user_id: string;
  resp_role: Role;
}

function toOption(m: ChurchMembership) {
  return {
    value: String(m.user_id),
    label: [m.user_name, m.user_email].filter(Boolean).join(' - '),
  };
}

function mergeUserOptions(...lists: { value: string; label: string }[][]) {
  const seen = new Set<string>();
  const out: { value: string; label: string }[] = [];
  for (const list of lists) {
    for (const opt of list) {
      if (!seen.has(opt.value)) {
        seen.add(opt.value);
        out.push(opt);
      }
    }
  }
  return out;
}

export default function ChurchesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = !!user?.is_staff;
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<Church | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toDelete, setToDelete] = useState<Church | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [sedeOptions, setSedeOptions] = useState<{ value: string; label: string }[]>([]);
  const [sedeList, setSedeList] = useState<Church[]>([]);
  const [parentChurchId, setParentChurchId] = useState<number | null>(null);
  const [congregationUsers, setCongregationUsers] = useState<
    Record<string, ChurchMembership[]>
  >({});

  const loadSedeUsers = useCallback(async (sedeId: number) => {
    const users = await accountsApi
      .churchUsers(sedeId)
      .catch(() => [] as ChurchMembership[]);
    setSedeOptions(users.map(toOption));
  }, []);

  const loadMemberships = useCallback(async () => {
    const all = await accountsApi.churches().catch(() => [] as Church[]);
    const sedes = all.filter((c) => c.church_type === 'INDEPENDENT');
    const sede = sedes[0];
    setSedeList(sedes);
    const results: Record<string, ChurchMembership[]> = {};
    if (sede) {
      setParentChurchId((prev) => prev ?? sede.id);
      setSedeOptions(
        (await accountsApi.churchUsers(sede.id).catch(() => [])).map(toOption)
      );
      for (const c of all.filter((x) => x.church_type === 'CONGREGATION')) {
        results[String(c.id)] = await accountsApi
          .churchUsers(c.id)
          .catch(() => [] as ChurchMembership[]);
      }
    }
    setCongregationUsers(results);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    accountsApi
      .churches()
      .then((list) => {
        setChurches(list);
        return loadMemberships();
      })
      .catch(() => setChurches([]))
      .finally(() => setLoading(false));
  }, [loadMemberships]);

  useEffect(() => {
    load();
  }, [load]);

  const form = useForm<ChurchForm>({
    initialValues: {
      name: '',
      phone: '',
      pastor_name: '',
      accounting_category: '',
      cep: '',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      resp_user_id: '',
      resp_role: 'PASTOR',
    },
    validate: {
      name: (v) => (v.trim().length ? null : t.churchesPage.name),
      city: (v) => (activeStep >= 1 && v.trim().length ? null : activeStep >= 1 ? t.registerPage.city : null),
      state: (v) => (activeStep >= 1 && v.trim().length ? null : activeStep >= 1 ? t.registerPage.state : null),
      accounting_category: (v) =>
        v.trim().length ? null : t.churchesPage.accountingCategoryRequired,
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset();
    setActiveStep(0);
    setCepError(null);
    setOpened(true);
  };

  const openEdit = (church: Church) => {
    setEditing(church);
    const memberships = congregationUsers[String(church.id)] ?? [];
    const responsible = memberships.find(
      (m) => m.user_id === church.responsible_user_id
    );
    form.setValues({
      name: church.name,
      phone: church.phone,
      pastor_name: church.pastor_name,
      accounting_category: church.accounting_category || '',
      cep: church.cep,
      street: church.street,
      number: church.number,
      neighborhood: church.neighborhood,
      city: church.city,
      state: church.state,
      resp_user_id: church.responsible_user_id ? String(church.responsible_user_id) : '',
      resp_role: responsible?.role ?? 'PASTOR',
    });
    setActiveStep(0);
    setCepError(null);
    setOpened(true);
  };

  const userOptions = editing
    ? mergeUserOptions(
        sedeOptions,
        (congregationUsers[String(editing.id)] ?? []).map(toOption)
      )
    : sedeOptions;

  const responsibleMember = editing
    ? (congregationUsers[String(editing.id)] ?? []).find(
        (m) => m.user_id === Number(form.values.resp_user_id)
      )
    : undefined;

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
    setActiveStep((c) => Math.min(c + 1, 2));
  };

  const backStep = () => {
    setActiveStep((c) => Math.max(c - 1, 0));
  };

  const handleSubmit = async () => {
    const valid = form.validate();
    if (valid.hasErrors) return;
    setSubmitting(true);
    try {
      const payload = {
        name: toUpperCamelWords(form.values.name),
        phone: form.values.phone.replace(/\D/g, ''),
        pastor_name: toUpperCamelWords(form.values.pastor_name || ''),
        accounting_category: form.values.accounting_category.trim(),
        cep: form.values.cep.replace(/\D/g, ''),
        street: toUpperCamelWords(form.values.street || ''),
        number: form.values.number.trim(),
        neighborhood: toUpperCamelWords(form.values.neighborhood || ''),
        city: toUpperCamelWords(form.values.city || ''),
        state: form.values.state.trim(),
      };

      if (editing) {
        const responsible = form.values.resp_user_id
          ? {
              user_id: Number(form.values.resp_user_id),
              role: form.values.resp_role,
            }
          : null;
        await accountsApi.updateChurch(editing.id, {
          ...payload,
          ...(responsible ? { responsible_user: responsible } : {}),
        });
        notifications.show({ color: 'green', message: t.churchesPage.editDone });
      } else {
        const responsible = form.values.resp_user_id
          ? {
              user_id: Number(form.values.resp_user_id),
              role: form.values.resp_role,
            }
          : undefined;
        const createPayload = {
          ...payload,
          ...(isAdmin ? { parent_church: parentChurchId ?? undefined } : {}),
        };
        await accountsApi.createChurch(
          responsible ? { ...createPayload, responsible_user: responsible } : createPayload
        );
        notifications.show({ color: 'green', message: t.churchesPage.saveDone });
      }
      setOpened(false);
      form.reset();
      load();
    } catch (err: any) {
      const data = err?.response?.data;
      const msg =
        data?.accounting_category?.[0] ||
        data?.responsible_user?.email?.[0] ||
        data?.responsible_user?.[0] ||
        data?.name?.[0] ||
        data?.detail;
      notifications.show({ color: 'red', message: msg || t.overview });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await accountsApi.deleteChurch(toDelete.id);
      notifications.show({ color: 'green', message: t.churchesPage.deleteDone });
      setToDelete(null);
      load();
    } catch (err: any) {
      notifications.show({
        color: 'red',
        message: err?.response?.data?.detail || t.overview,
      });
    } finally {
      setDeleting(false);
    }
  };

  const sedeChurch = churches.find((c) => c.church_type === 'INDEPENDENT');
  const congregations = churches.filter((c) => c.church_type === 'CONGREGATION');

  return (
    <AuthGuard roles={['PASTOR']}>
      <Layout>
        <PageHeader title={t.churchesPage.title} description={t.churchesPage.subtitle}>
          <Group gap="xs">
            <Button
              variant="default"
              leftSection={<IconRefresh size={16} />}
              onClick={load}
              data-testid="churches-refresh"
            >
              {t.common.filter}
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={openCreate}
              data-testid="churches-new"
            >
              {t.churchesPage.newChurch}
            </Button>
          </Group>
        </PageHeader>

        {loading ? (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={120} />
            ))}
          </SimpleGrid>
        ) : churches.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <ThemeIcon size={48} radius="xl" color="gray" variant="light">
              <IconBuildingChurch size={24} />
            </ThemeIcon>
            <Text c="dimmed">{t.churchesPage.noChurches}</Text>
          </Stack>
        ) : (
          <Stack gap="md">
            {sedeChurch && (
              <Card withBorder shadow="sm" padding="lg" data-testid={`church-sede-${sedeChurch.id}`}>
                <Group justify="space-between" align="flex-start">
                  <Group gap="sm">
                    <ThemeIcon color="blue" variant="light" size="lg">
                      <IconBuilding size={20} />
                    </ThemeIcon>
                    <Stack gap={0}>
                      <Text fw={700}>{sedeChurch.name}</Text>
                      <Group gap={4}>
                        <IconMapPin size={13} />
                        <Text size="xs" c="dimmed">
                          {sedeChurch.city}/{sedeChurch.state}
                        </Text>
                      </Group>
                    </Stack>
                  </Group>
                  <Badge color="blue" variant="light">
                    {t.churchesPage.sede}
                  </Badge>
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconExternalLink size={14} />}
                    onClick={() =>
                      router.push(
                        isAdmin
                          ? `/admin/churches/${sedeChurch.id}/dashboard`
                          : '/dashboard'
                      )
                    }
                    data-testid={`church-sede-open-${sedeChurch.id}`}
                  >
                    {t.churchesPage.open}
                  </Button>
                </Group>
              </Card>
            )}

            {congregations.map((c) => (
              <Card key={c.id} withBorder shadow="sm" padding="lg" data-testid={`church-card-${c.id}`}>
                <Group justify="space-between" align="flex-start">
                  <Group gap="sm">
                    <ThemeIcon color="teal" variant="light" size="lg">
                      <IconBuildingChurch size={20} />
                    </ThemeIcon>
                    <Stack gap={0}>
                      <Text fw={700}>{c.name}</Text>
                      <Group gap={4}>
                        <IconMapPin size={13} />
                        <Text size="xs" c="dimmed">
                          {c.city}/{c.state}
                        </Text>
                      </Group>
                      {c.accounting_category && (
                        <Badge size="xs" variant="light" mt={4}>
                          {c.accounting_category}
                        </Badge>
                      )}
                    </Stack>
                  </Group>
                  <Group gap="xs">
                    <Badge color="teal" variant="light">
                      {t.churchesPage.congregation}
                    </Badge>
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconExternalLink size={14} />}
                      onClick={() =>
                        router.push(
                          isAdmin
                            ? `/admin/churches/${c.id}/dashboard`
                            : `/churches/${c.id}/dashboard`
                        )
                      }
                      data-testid={`church-open-${c.id}`}
                    >
                      {t.churchesPage.open}
                    </Button>
                    <Button
                      size="xs"
                      variant="subtle"
                      leftSection={<IconPencil size={14} />}
                      onClick={() => openEdit(c)}
                      data-testid={`church-edit-${c.id}`}
                    >
                      {t.common.edit}
                    </Button>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => setToDelete(c)}
                      data-testid={`church-delete-${c.id}`}
                    >
                      {t.common.delete}
                    </Button>
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>
        )}

        <Modal
          opened={opened}
          onClose={() => setOpened(false)}
          title={editing ? t.churchesPage.editTitle : t.churchesPage.modalTitle}
          centered
          size="lg"
        >
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stepper active={activeStep} onStepClick={setActiveStep} allowNextStepsSelect={false} size="sm">
              <Stepper.Step label={t.registerPage.stepChurch} icon={<IconBuildingChurch size={16} />}>
                <Stack gap="md" mt="md">
                  <TextInput
                    label={t.churchesPage.name}
                    required
                    data-testid="church-name"
                    {...form.getInputProps('name')}
                  />
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <TextInput
                      label={t.registerPage.pastor}
                      data-testid="church-pastor"
                      {...form.getInputProps('pastor_name')}
                    />
                    <MaskedTextInput
                      label={t.registerPage.phone}
                      data-testid="church-phone"
                      placeholder="(00) 00000-0000"
                      mask="(00) 00000-0000"
                      value={form.values.phone}
                      error={form.errors.phone}
                      onAccept={(value: string) => form.setFieldValue('phone', value)}
                    />
                  </SimpleGrid>
                  <AccountingCategorySelect
                    value={form.values.accounting_category}
                    onChange={(v) => form.setFieldValue('accounting_category', v)}
                    required
                    dataTestId="church-category"
                  />
                  {!editing && isAdmin && (
                    <Select
                      label={t.churchesPage.parentChurch}
                      placeholder={t.churchesPage.parentChurchPlaceholder}
                      data={sedeList.map((s) => ({ value: String(s.id), label: s.name }))}
                      value={parentChurchId ? String(parentChurchId) : null}
                      onChange={(v) => {
                        if (!v) return;
                        const id = Number(v);
                        setParentChurchId(id);
                        loadSedeUsers(id);
                      }}
                      searchable
                      nothingFoundMessage={t.churchesPage.responsibleUserEmpty}
                      data-testid="church-parent-sede"
                      required
                    />
                  )}
                </Stack>
              </Stepper.Step>

              <Stepper.Step label={t.registerPage.stepAddress} icon={<IconMapPin size={16} />}>
                <Stack gap="md" mt="md">
                  <MaskedTextInput
                    label={t.registerPage.cep}
                    description={t.registerPage.cepHint}
                    data-testid="church-cep"
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
                        label={t.registerPage.street}
                        data-testid="church-street"
                        placeholder="Av. Floriano Peixoto"
                        {...form.getInputProps('street')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <TextInput
                        label={t.registerPage.number}
                        data-testid="church-number"
                        {...form.getInputProps('number')}
                        onChange={(e) => {
                          const raw = e.currentTarget.value.replace(/\D/g, '');
                          form.setFieldValue('number', raw);
                        }}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <TextInput
                        label={t.registerPage.neighborhood}
                        data-testid="church-neighborhood"
                        placeholder="Centro"
                        {...form.getInputProps('neighborhood')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 5 }}>
                      <TextInput
                        label={t.registerPage.city}
                        data-testid="church-city"
                        placeholder="Campina Grande"
                        required
                        {...form.getInputProps('city')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 3 }}>
                      <Select
                        label={t.registerPage.state}
                        data-testid="church-state"
                        placeholder="PB"
                        data={UF_LIST}
                        searchable
                        required
                        {...form.getInputProps('state')}
                      />
                    </Grid.Col>
                  </Grid>
                  {addressQuery ? (
                    <Box style={{ height: 220, borderRadius: 8, overflow: 'hidden' }}>
                      <iframe
                        title="mapa-endereco"
                        data-testid="church-address-map"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(addressQuery)}&z=16&output=embed`}
                        style={{ border: 0, width: '100%', height: '100%' }}
                        loading="lazy"
                      />
                    </Box>
                  ) : (
                    <Text size="xs" c="dimmed">
                      {t.settingsPage.addressMapHint}
                    </Text>
                  )}
                </Stack>
              </Stepper.Step>

              <Stepper.Step label={t.churchesPage.responsibleStep} icon={<IconUser size={16} />}>
                <Stack gap="md" mt="md">
                  <Stack gap={0}>
                    <Text fw={600} size="sm">
                      {t.churchesPage.firstResponsibleTitle}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t.churchesPage.firstResponsibleHint}
                    </Text>
                  </Stack>
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Select
                        label={t.churchesPage.responsibleUser}
                        placeholder={t.churchesPage.responsibleUserPlaceholder}
                        data={userOptions}
                        searchable
                        clearable
                        nothingFoundMessage={t.churchesPage.responsibleUserEmpty}
                        data-testid="church-resp-user"
                        {...form.getInputProps('resp_user_id')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Select
                        label={t.churchesPage.responsibleRole}
                        data={RESPONSIBLE_ROLES}
                        data-testid="church-resp-role"
                        {...form.getInputProps('resp_role')}
                      />
                    </Grid.Col>
                  </Grid>
                  {responsibleMember && (
                    <Alert icon={<IconAlertTriangle size={16} />} color="violet" variant="light">
                      <Text size="sm">
                        {t.churchesPage.responsibleCurrent}:{' '}
                        {responsibleMember.user_name}
                      </Text>
                    </Alert>
                  )}
                </Stack>
              </Stepper.Step>
            </Stepper>

            <Group justify="space-between" mt="lg">
              <Button
                type="button"
                variant="default"
                onClick={activeStep > 0 ? backStep : () => setOpened(false)}
              >
                {activeStep > 0 ? t.registerPage.back : t.common.cancel}
              </Button>
              {activeStep === 2 ? (
                <Button type="submit" loading={submitting} data-testid="church-submit">
                  {t.common.save}
                </Button>
              ) : (
                <Button type="button" onClick={nextStep} data-testid="church-next">
                  {t.registerPage.next}
                </Button>
              )}
            </Group>
          </form>
        </Modal>

        <Modal
          opened={!!toDelete}
          onClose={() => setToDelete(null)}
          title={t.churchesPage.deleteTitle}
          centered
        >
          <Stack gap="md">
            <Text>{t.churchesPage.deleteBody.replace('{name}', toDelete?.name || '')}</Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setToDelete(null)}>
                {t.common.cancel}
              </Button>
              <Button
                color="red"
                loading={deleting}
                onClick={handleDelete}
                data-testid="church-delete-confirm"
              >
                {t.common.delete}
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Layout>
    </AuthGuard>
  );
}