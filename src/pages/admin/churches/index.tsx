import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  SimpleGrid,
  Card,
  Group,
  Text,
  Stack,
  Badge,
  Button,
  Skeleton,
  ThemeIcon,
  Modal,
  Divider,
  Grid,
  ActionIcon,
  Tooltip,
  Title,
  TextInput,
  Select,
  MultiSelect,
  Box,
  Stepper,
  Alert,
  Radio,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBuilding,
  IconMapPin,
  IconUser,
  IconPhone,
  IconRefresh,
  IconArrowRight,
  IconEye,
  IconCheck,
  IconX,
  IconSearch,
  IconTrash,
  IconPlus,
  IconPencil,
  IconBuildingChurch,
  IconAlertTriangle,
} from '@tabler/icons-react';
import PageHeader from '../../../components/PageHeader';
import AuthGuard from '../../../components/AuthGuard';
import Layout from '../../../components/Layout';
import AccountingCategorySelect from '../../../components/AccountingCategorySelect';
import MaskedTextInput from '../../../components/MaskedTextInput';
import { useLanguage } from '../../../i18n';
import { useAuth } from '../../../contexts/AuthContext';
import { accountsApi } from '../../../api/accounts';
import { PendingChurch, Church, ChurchMembership, Role } from '../../../types';
import { toUpperCamelWords } from '../../../utils/format';

const UF_LIST = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const RESPONSIBLE_ROLES: { value: Role; label: string }[] = [
  { value: 'PASTOR', label: 'Pastor(a)' },
  { value: 'TESOUREIRO', label: 'Tesoureiro(a)' },
  { value: 'SECRETARIA', label: 'Secretaria' },
];

function toOption(m: ChurchMembership) {
  return { value: String(m.user_id), label: m.user_name };
}

const STATUS_META = {
  PENDING: { color: 'yellow', tKey: 'statusPending' as const },
  ACTIVE: { color: 'green', tKey: 'statusActive' as const },
  REJECTED: { color: 'red', tKey: 'statusRejected' as const },
};

function apiErrorMessage(err: any, fallback: string): string {
  const d = err?.response?.data;
  if (!d) return fallback;
  if (typeof d === 'string') return d;
  if (typeof d.detail === 'string') return d.detail;
  const first = Object.keys(d)[0];
  const val = first ? d[first] : null;
  if (Array.isArray(val) && typeof val[0] === 'string') return `${first}: ${val[0]}`;
  if (typeof val === 'string') return `${first}: ${val}`;
  return fallback;
}

export default function AdminChurchesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { switchChurch } = useAuth();
  const [churches, setChurches] = useState<PendingChurch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PendingChurch | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [opening, setOpening] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<PendingChurch | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [creating, setCreating] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [sedeList, setSedeList] = useState<Church[]>([]);
  const [sedeOptions, setSedeOptions] = useState<{ value: string; label: string }[]>([]);
  const [parentChurchId, setParentChurchId] = useState<number | null>(null);

  const [editChurch, setEditChurch] = useState<PendingChurch | null>(null);
  const [editStep, setEditStep] = useState(0);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [formChurchType, setFormChurchType] = useState<'INDEPENDENT' | 'CONGREGATION'>(
    'INDEPENDENT'
  );
  const [formFields, setFormFields] = useState({
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
    resp_role: 'PASTOR' as Role,
  });
  const setField = (key: keyof typeof formFields, value: string | Role) =>
    setFormFields((prev) => ({ ...prev, [key]: value }));
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    accountsApi
      .allChurches()
      .then(setChurches)
      .catch(() => setChurches([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stateOptions = useMemo(
    () =>
      Array.from(new Set(churches.map((c) => c.state).filter(Boolean))).sort().map((s) => ({
        value: s,
        label: s,
      })),
    [churches]
  );

  const cityOptions = useMemo(
    () =>
      Array.from(new Set(churches.map((c) => c.city).filter(Boolean))).sort().map((c) => ({
        value: c,
        label: c,
      })),
    [churches]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return churches.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (stateFilter.length > 0 && !stateFilter.includes(c.state)) return false;
      if (cityFilter && c.city !== cityFilter) return false;
      if (q) {
        const fields = [
          c.pastor_name,
          c.phone,
          c.user?.name,
          c.user?.email,
          c.name,
        ];
        const hit = fields.some((f) => f && f.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [churches, statusFilter, stateFilter, cityFilter, search]);

  const openChurch = async (church: PendingChurch) => {
    if (church.status !== 'ACTIVE') {
      setSelected(church);
      return;
    }
    setOpening(church.id);
    try {
      await switchChurch(church.id);
      router.push('/dashboard');
    } catch {
      notifications.show({ color: 'red', message: t.overview });
      setOpening(null);
    }
  };

  const runAction = async (type: 'approve' | 'reject', id: number) => {
    setBusyId(id);
    try {
      if (type === 'approve') {
        await accountsApi.approveChurch(id);
        notifications.show({ color: 'green', message: t.approvalsPage.approvedMsg });
      } else {
        await accountsApi.rejectChurch(id);
        notifications.show({ color: 'red', message: t.approvalsPage.rejectedMsg });
      }
      setSelected(null);
      load();
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao executar a ação.' });
    } finally {
      setBusyId(null);
    }
  };

  const runDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await accountsApi.deleteChurch(toDelete.id);
      notifications.show({
        color: 'green',
        message: t.adminChurches.deleteSuccess,
      });
      setToDelete(null);
      load();
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao excluir a igreja.' });
    } finally {
      setDeleting(false);
    }
  };

  const loadSedeUsers = async (sedeId: number) => {
    const users = await accountsApi.churchUsers(sedeId).catch(() => []);
    setSedeOptions(users.map(toOption));
  };

  const openCreate = async () => {
    setCreateError(null);
    setFormChurchType('INDEPENDENT');
    setFormFields({
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
    });
    setParentChurchId(null);
    setActiveStep(0);
    setCepError(null);
    // Só carrega a lista de sedes quando for necessário (congregação).
    const sedes = churches.filter((c) => c.church_type === 'INDEPENDENT');
    setSedeList(sedes as unknown as Church[]);
    setCreating(true);
  };

  const openEdit = (church: PendingChurch) => {
    setEditError(null);
    setCepError(null);
    setFormChurchType(church.church_type as 'INDEPENDENT' | 'CONGREGATION');
    setFormFields({
      name: church.name || '',
      phone: church.phone || '',
      pastor_name: church.pastor_name || '',
      accounting_category: church.accounting_category || '',
      cep: church.cep || '',
      street: church.street || '',
      number: church.number || '',
      neighborhood: church.neighborhood || '',
      city: church.city || '',
      state: church.state || '',
      resp_user_id: '',
      resp_role: 'PASTOR',
    });
    setParentChurchId(church.parent_church ?? null);
    setEditStep(0);
    setEditChurch(church);
  };

  const submitEdit = async () => {
    if (!editChurch) return;
    if (!formFields.name.trim()) {
      setEditError(t.churchesPage.name);
      return;
    }
    if (!formFields.city.trim() || !formFields.state.trim()) {
      setEditError(t.registerPage.city);
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const payload: any = {
        name: toUpperCamelWords(formFields.name),
        city: toUpperCamelWords(formFields.city.trim()),
        state: formFields.state.trim(),
        cep: formFields.cep.replace(/\D/g, ''),
        phone: formFields.phone.replace(/\D/g, ''),
        street: toUpperCamelWords(formFields.street.trim()),
        number: formFields.number.trim(),
        neighborhood: toUpperCamelWords(formFields.neighborhood.trim()),
        pastor_name: toUpperCamelWords(formFields.pastor_name.trim()),
      };
      if (editChurch.church_type === 'CONGREGATION') {
        payload.accounting_category = formFields.accounting_category.trim();
      }
      await accountsApi.updateChurch(editChurch.id, payload);
      notifications.show({ color: 'green', message: t.adminChurches.editChurchSuccess });
      setEditChurch(null);
      load();
    } catch (err: any) {
      setEditError(apiErrorMessage(err, 'Não foi possível salvar.'));
    } finally {
      setEditSaving(false);
    }
  };

  const nextEditStep = () => {
    if (editStep === 0 && !formFields.name.trim()) {
      setEditError(t.churchesPage.name);
      return;
    }
    if (editStep === 1 && (!formFields.city.trim() || !formFields.state.trim())) {
      setEditError(t.registerPage.city);
      return;
    }
    if (editStep === 1) {
      submitEdit();
      return;
    }
    setEditError(null);
    setEditStep((c) => c + 1);
  };

  const backEditStep = () => {
    setEditError(null);
    setEditStep((c) => Math.max(c - 1, 0));
  };

  const maxStep = formChurchType === 'CONGREGATION' ? 3 : 2;

  const nextStep = () => {
    if (
      activeStep === 1 &&
      formChurchType === 'CONGREGATION' &&
      !parentChurchId
    ) {
      setCreateError(t.churchesPage.parentChurchPlaceholder);
      return;
    }
    if (activeStep === 1 && !formFields.name.trim()) {
      setCreateError(t.churchesPage.name);
      return;
    }
    if (activeStep === 2 && (!formFields.city.trim() || !formFields.state.trim())) {
      setCreateError(t.registerPage.city);
      return;
    }
    if (activeStep === maxStep) {
      handleCreateSubmit();
      return;
    }
    setCreateError(null);
    setActiveStep((c) => Math.min(c + 1, maxStep));
  };

  const backStep = () => {
    setCreateError(null);
    setActiveStep((c) => Math.max(c - 1, 0));
  };

  const handleCepBlur = async (cepValue: string) => {
    setCepError(null);
    const clean = cepValue.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormFields((prev) => ({
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

  const handleCreateSubmit = async () => {
    if (!formFields.name.trim()) {
      setCreateError(t.churchesPage.name);
      return;
    }
    if (formChurchType === 'CONGREGATION' && !parentChurchId) {
      setCreateError(t.churchesPage.parentChurchPlaceholder);
      return;
    }
    setSaving(true);
    setCreateError(null);
    try {
      const payload: any = {
        name: toUpperCamelWords(formFields.name),
        church_type: formChurchType,
        city: toUpperCamelWords(formFields.city.trim()),
        state: formFields.state.trim(),
        cep: formFields.cep.replace(/\D/g, ''),
        phone: formFields.phone.replace(/\D/g, ''),
        street: toUpperCamelWords(formFields.street.trim()),
        number: formFields.number.trim(),
        neighborhood: toUpperCamelWords(formFields.neighborhood.trim()),
        pastor_name: toUpperCamelWords(formFields.pastor_name.trim()),
      };
      if (formChurchType === 'CONGREGATION') {
        payload.accounting_category = formFields.accounting_category.trim();
      }
      if (formChurchType === 'CONGREGATION' && parentChurchId) {
        payload.parent_church = parentChurchId;
      }
      if (
        formChurchType === 'CONGREGATION' &&
        formFields.resp_user_id &&
        formFields.resp_role
      ) {
        payload.responsible_user = {
          user_id: Number(formFields.resp_user_id),
          role: formFields.resp_role,
        };
      }
      await accountsApi.createChurch(payload);
      notifications.show({ color: 'green', message: t.churchesPage.saveDone });
      setCreating(false);
      load();
    } catch (err: any) {
      const data = err?.response?.data;
      const detail =
        data?.detail || data?.parent_church?.[0] || 'Erro ao criar a igreja.';
      setCreateError(detail);
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (status: string) => {
    const meta = STATUS_META[status as keyof typeof STATUS_META] || {
      color: 'gray',
      tKey: 'statusPending' as const,
    };
    return (
      <Badge color={meta.color} variant="light">
        {t.adminChurches[meta.tKey]}
      </Badge>
    );
  };

  return (
    <AuthGuard adminOnly>
      <Layout>
        <PageHeader title={t.adminChurches.title} description={t.adminChurches.subtitle}>
          <Group gap="sm">
            <Button
              variant="default"
              data-testid="admin-churches-refresh"
              leftSection={<IconRefresh size={16} />}
              onClick={load}
            >
              {t.common.filter}
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              data-testid="admin-churches-add"
              onClick={openCreate}
            >
              {t.adminChurches.addChurch}
            </Button>
          </Group>
        </PageHeader>

        <Card withBorder shadow="sm" p="md" mb="md">
          <Grid gap="md" align="flex-end">
            <Grid.Col span={{ base: 12, sm: 6, md: 4, lg: 4 }}>
              <TextInput
                label={t.adminChurches.filterSearchPlaceholder}
                placeholder={t.adminChurches.filterSearchPlaceholder}
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                data-testid="admin-churches-search"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3, lg: 2 }}>
              <Select
                label={t.adminChurches.filterStatus}
                placeholder={t.adminChurches.filterAll}
                clearable
                value={statusFilter}
                onChange={setStatusFilter}
                data={[
                  { value: 'PENDING', label: t.adminChurches.statusPending },
                  { value: 'ACTIVE', label: t.adminChurches.statusActive },
                  { value: 'REJECTED', label: t.adminChurches.statusRejected },
                ]}
                data-testid="admin-churches-filter-status"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3, lg: 3 }}>
              <MultiSelect
                label={t.adminChurches.filterState}
                placeholder={t.adminChurches.filterAll}
                clearable
                searchable
                value={stateFilter}
                onChange={setStateFilter}
                data={stateOptions}
                data-testid="admin-churches-filter-state"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 2, lg: 3 }}>
              <Select
                label={t.adminChurches.filterCity}
                placeholder={t.adminChurches.filterAll}
                clearable
                searchable
                value={cityFilter}
                onChange={setCityFilter}
                data={cityOptions}
                data-testid="admin-churches-filter-city"
              />
            </Grid.Col>
          </Grid>
        </Card>

        {loading ? (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height={150} />
            ))}
          </SimpleGrid>
        ) : filtered.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <ThemeIcon size={48} radius="xl" color="gray" variant="light">
              <IconBuilding size={24} />
            </ThemeIcon>
            <Text c="dimmed">{t.adminChurches.noChurches}</Text>
            {(statusFilter || stateFilter.length > 0 || cityFilter || search) && (
              <Text size="sm" c="dimmed">
                {t.adminChurches.filterNoResults}
              </Text>
            )}
          </Stack>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {filtered.map((c) => (
              <Card
                key={c.id}
                withBorder
                shadow="sm"
                padding="lg"
                style={{ cursor: 'pointer' }}
                onClick={() => openChurch(c)}
                data-testid={`admin-church-card-${c.id}`}
              >
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon color="blue" variant="light" size="lg">
                      <IconBuilding size={20} />
                    </ThemeIcon>
                    <Stack gap={0}>
                      <Text fw={700} lineClamp={1}>
                        {c.name}
                      </Text>
                      <Group gap={4}>
                        <IconMapPin size={13} />
                        <Text size="xs" c="dimmed">
                          {c.city}/{c.state}
                        </Text>
                      </Group>
                      <Group gap={6} mt={2}>
                        <Badge
                          color={c.church_type === 'INDEPENDENT' ? 'blue' : 'teal'}
                          variant="light"
                          size="xs"
                        >
                          {c.church_type === 'INDEPENDENT'
                            ? t.adminChurches.sedeBadge
                            : t.adminChurches.congregationBadge}
                        </Badge>
                        {c.church_type !== 'INDEPENDENT' &&
                          c.parent_church_name && (
                            <Text size="xs" c="dimmed" truncate>
                              {t.adminChurches.linkedTo.replace(
                                '{name}',
                                c.parent_church_name
                              )}
                            </Text>
                          )}
                      </Group>
                    </Stack>
                  </Group>
                  {statusBadge(c.status)}
                </Group>

                <Divider my="sm" />

                <Stack gap={6}>
                  <Group gap={6}>
                    <IconUser size={14} />
                    <Text size="sm">
                      {c.pastor_name || t.adminChurches.noPastor}
                    </Text>
                  </Group>
                  <Group gap={6}>
                    <IconPhone size={14} />
                    <Text size="sm">{c.phone || '—'}</Text>
                  </Group>
                </Stack>

                <Group justify="flex-end" mt="md">
                  <Button
                    size="xs"
                    variant="subtle"
                    leftSection={<IconPencil size={14} />}
                    data-testid={`admin-church-edit-${c.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(c);
                    }}
                  >
                    {t.adminChurches.editChurch}
                  </Button>
                  <Button
                    size="xs"
                    variant="subtle"
                    leftSection={<IconEye size={14} />}
                    data-testid={`admin-church-details-${c.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(c);
                    }}
                  >
                    {t.adminChurches.viewDetails}
                  </Button>
                  {c.status === 'ACTIVE' && (
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      leftSection={<IconTrash size={14} />}
                      data-testid={`admin-church-delete-${c.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setToDelete(c);
                      }}
                    >
                      {t.adminChurches.deleteChurch}
                    </Button>
                  )}
                  {c.status === 'ACTIVE' && (
                    <Button
                      size="xs"
                      variant="light"
                      rightSection={<IconArrowRight size={14} />}
                      data-testid={`admin-church-open-${c.id}`}
                      loading={opening === c.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        openChurch(c);
                      }}
                    >
                      {t.adminChurches.open}
                    </Button>
                  )}
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        )}

        <Modal
          opened={!!selected}
          onClose={() => setSelected(null)}
          title={t.adminChurches.registrationData}
          centered
          size="lg"
        >
          {selected && (
            <Stack gap="md">
              <Group justify="space-between">
                <Group gap="sm">
                  <ThemeIcon color="blue" variant="light" size="lg">
                    <IconBuilding size={20} />
                  </ThemeIcon>
                  <Text fw={700}>{selected.name}</Text>
                </Group>
                {statusBadge(selected.status)}
              </Group>

              <Title order={6} tt="uppercase" c="dimmed">
                {t.settingsPage.churchData}
              </Title>
              <Grid>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.registerPage.pastor}</Text>
                  <Text size="sm">{selected.pastor_name || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.registerPage.treasurer}</Text>
                  <Text size="sm">{selected.treasurer_name || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.registerPage.phone}</Text>
                  <Text size="sm">{selected.phone || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.common.status}</Text>
                  <Text size="sm">{statusBadge(selected.status)}</Text>
                </Grid.Col>
              </Grid>

              <Title order={6} tt="uppercase" c="dimmed">
                {t.settingsPage.address}
              </Title>
              <Grid>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.registerPage.cep}</Text>
                  <Text size="sm">{selected.cep || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.registerPage.street}</Text>
                  <Text size="sm">
                    {selected.street || '—'}
                    {selected.number ? `, ${selected.number}` : ''}
                  </Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.registerPage.neighborhood}</Text>
                  <Text size="sm">{selected.neighborhood || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.registerPage.city}</Text>
                  <Text size="sm">
                    {selected.city || '—'}/{selected.state || '—'}
                  </Text>
                </Grid.Col>
              </Grid>

              <Title order={6} tt="uppercase" c="dimmed">
                {t.adminChurches.responsible}
              </Title>
              <Grid>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.common.name}</Text>
                  <Text size="sm">{selected.user?.name || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.email}</Text>
                  <Text size="sm">{selected.user?.email || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.common.status}</Text>
                  <Badge
                    color={selected.user?.is_active ? 'green' : 'gray'}
                    variant="light"
                    size="sm"
                  >
                    {selected.user?.is_active
                      ? t.adminChurches.active
                      : t.adminChurches.inactive}
                  </Badge>
                </Grid.Col>
              </Grid>

              <Group justify="flex-end" mt="xs">
                {selected.status === 'PENDING' && (
                  <>
                    <Button
                      variant="default"
                      data-testid={`admin-church-reject-${selected.id}`}
                      leftSection={<IconX size={16} />}
                      loading={busyId === selected.id}
                      onClick={() => runAction('reject', selected.id)}
                    >
                      {t.reject}
                    </Button>
                    <Button
                      color="green"
                      data-testid={`admin-church-approve-${selected.id}`}
                      leftSection={<IconCheck size={16} />}
                      loading={busyId === selected.id}
                      onClick={() => runAction('approve', selected.id)}
                    >
                      {t.approve}
                    </Button>
                  </>
                )}
                {selected.status === 'ACTIVE' && (
                  <Button
                    rightSection={<IconArrowRight size={16} />}
                    loading={opening === selected.id}
                    onClick={() => openChurch(selected)}
                  >
                    {t.adminChurches.open}
                  </Button>
                )}
              </Group>
            </Stack>
          )}
        </Modal>

        <Modal
          opened={!!toDelete}
          onClose={() => {
            if (!deleting) setToDelete(null);
          }}
          title={t.adminChurches.deleteTitle}
          centered
          size="md"
        >
          {toDelete && (
            <Stack gap="md">
              <Text>
                {t.adminChurches.deleteBody.replace('{name}', toDelete.name)}
              </Text>
              {toDelete.church_type === 'INDEPENDENT' && (
                <Text size="sm" c="red">
                  {t.adminChurches.deleteBodySede}
                </Text>
              )}
              <Group justify="flex-end">
                <Button
                  variant="default"
                  disabled={deleting}
                  onClick={() => setToDelete(null)}
                >
                  {t.common.cancel}
                </Button>
                <Button
                  color="red"
                  loading={deleting}
                  leftSection={<IconTrash size={16} />}
                  data-testid="admin-church-delete-confirm"
                  onClick={runDelete}
                >
                  {t.adminChurches.deleteChurch}
                </Button>
              </Group>
            </Stack>
          )}
        </Modal>

        <Modal
          opened={creating}
          onClose={() => {
            if (!saving) setCreating(false);
          }}
          title={t.adminChurches.addChurchTitle}
          centered
          size="lg"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              nextStep();
            }}
          >
            <Stepper
              active={activeStep}
              onStepClick={(step) => {
                if (step <= maxStep) setActiveStep(step);
              }}
              allowNextStepsSelect={false}
              size="sm"
            >
              <Stepper.Step
                label={t.adminChurches.typeStep}
                icon={<IconBuildingChurch size={16} />}
              >
                <Stack gap="md" mt="md">
                  <Text fw={600} size="sm">
                    {t.adminChurches.typeLabel}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t.adminChurches.selectTypeHint}
                  </Text>
                  <Radio.Group
                    value={formChurchType}
                    onChange={(v) => {
                      setFormChurchType(v as 'INDEPENDENT' | 'CONGREGATION');
                      setCreateError(null);
                    }}
                  >
                    <Stack gap="xs">
                      <Radio
                        value="INDEPENDENT"
                        label={t.adminChurches.typeIndependent}
                        data-testid="admin-church-type-sede"
                      />
                      <Radio
                        value="CONGREGATION"
                        label={t.adminChurches.typeCongregation}
                        data-testid="admin-church-type-congregation"
                      />
                    </Stack>
                  </Radio.Group>
                </Stack>
              </Stepper.Step>

              <Stepper.Step
                label={t.registerPage.stepChurch}
                icon={<IconBuilding size={16} />}
              >
                <Stack gap="md" mt="md">
                  <TextInput
                    label={t.churchesPage.name}
                    required
                    data-testid="admin-church-name"
                    value={formFields.name}
                    onChange={(e) => setField('name', e.currentTarget.value)}
                  />
                  <TextInput
                    label={t.registerPage.pastor}
                    data-testid="admin-church-pastor"
                    value={formFields.pastor_name}
                    onChange={(e) => setField('pastor_name', e.currentTarget.value)}
                  />
                  <MaskedTextInput
                    label={t.registerPage.phone}
                    placeholder="(00) 00000-0000"
                    mask="(00) 00000-0000"
                    value={formFields.phone}
                    onAccept={(v: string) => setField('phone', v)}
                  />
                  {formChurchType === 'CONGREGATION' && (
                    <AccountingCategorySelect
                      value={formFields.accounting_category}
                      onChange={(v) => setField('accounting_category', v)}
                      required
                      dataTestId="admin-church-category"
                    />
                  )}
                  {formChurchType === 'CONGREGATION' && (
                    <Select
                      label={t.churchesPage.parentChurch}
                      placeholder={t.churchesPage.parentChurchPlaceholder}
                      data={sedeList.map((s) => ({
                        value: String(s.id),
                        label: s.name,
                      }))}
                      value={parentChurchId ? String(parentChurchId) : null}
                      onChange={(v) => {
                        if (!v) return;
                        const id = Number(v);
                        setParentChurchId(id);
                        loadSedeUsers(id);
                      }}
                      searchable
                      required
                      data-testid="admin-church-parent-sede"
                    />
                  )}
                </Stack>
              </Stepper.Step>

              <Stepper.Step
                label={t.registerPage.stepAddress}
                icon={<IconMapPin size={16} />}
              >
                <Stack gap="md" mt="md">
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <MaskedTextInput
                      label={t.registerPage.cep}
                      description={t.registerPage.cepHint}
                      placeholder="00000-000"
                      mask="00000-000"
                      value={formFields.cep}
                      onAccept={(v: string) => setField('cep', v)}
                      onBlur={() => handleCepBlur(formFields.cep)}
                    />
                    <TextInput
                      label={t.registerPage.city}
                      required
                      value={formFields.city}
                      onChange={(e) => setField('city', e.currentTarget.value)}
                    />
                  </SimpleGrid>
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <TextInput
                      label={t.registerPage.street}
                      value={formFields.street}
                      onChange={(e) => setField('street', e.currentTarget.value)}
                    />
                    <TextInput
                      label={t.registerPage.number}
                      value={formFields.number}
                      onChange={(e) =>
                        setField(
                          'number',
                          e.currentTarget.value.replace(/\D/g, '')
                        )
                      }
                    />
                  </SimpleGrid>
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <TextInput
                      label={t.registerPage.neighborhood}
                      value={formFields.neighborhood}
                      onChange={(e) =>
                        setField('neighborhood', e.currentTarget.value)
                      }
                    />
                    <Select
                      label={t.registerPage.state}
                      required
                      data={UF_LIST}
                      value={formFields.state}
                      onChange={(v) => setField('state', v ?? '')}
                      searchable
                    />
                  </SimpleGrid>
                  {cepLoading && <Text size="xs" c="dimmed">...</Text>}
                  {cepError && <Text size="xs" c="red">{cepError}</Text>}
                </Stack>
              </Stepper.Step>

              {formChurchType === 'CONGREGATION' && (
                <Stepper.Step
                  label={t.churchesPage.responsibleStep}
                  icon={<IconUser size={16} />}
                >
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
                          data={sedeOptions}
                          searchable
                          clearable
                          nothingFoundMessage={
                            t.churchesPage.responsibleUserEmpty
                          }
                          data-testid="admin-church-resp-user"
                          value={formFields.resp_user_id || null}
                          onChange={(v) => setField('resp_user_id', v ?? '')}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, sm: 6 }}>
                        <Select
                          label={t.churchesPage.responsibleRole}
                          data={RESPONSIBLE_ROLES}
                          data-testid="admin-church-resp-role"
                          value={formFields.resp_role}
                          onChange={(v) =>
                            setField('resp_role', (v as Role) ?? 'PASTOR')
                          }
                        />
                      </Grid.Col>
                    </Grid>
                  </Stack>
                </Stepper.Step>
              )}
            </Stepper>

            {createError && (
              <Alert
                icon={<IconAlertTriangle size={16} />}
                color="red"
                variant="light"
                mt="md"
              >
                <Text size="sm">{createError}</Text>
              </Alert>
            )}

            <Group justify="space-between" mt="lg">
              <Button
                type="button"
                variant="default"
                onClick={activeStep > 0 ? backStep : () => setCreating(false)}
              >
                {activeStep > 0 ? t.registerPage.back : t.common.cancel}
              </Button>
              {activeStep === maxStep ? (
                <Button type="submit" loading={saving} data-testid="admin-church-submit">
                  {t.common.save}
                </Button>
              ) : (
                <Button type="submit" data-testid="admin-church-next">
                  {t.registerPage.next}
                </Button>
              )}
            </Group>
          </form>
        </Modal>

        <Modal
          opened={!!editChurch}
          onClose={() => {
            if (!editSaving) setEditChurch(null);
          }}
          title={t.adminChurches.editChurchTitle}
          centered
          size="lg"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              nextEditStep();
            }}
          >
            <Stepper
              active={editStep}
              onStepClick={(step) => {
                if (step <= 1) setEditStep(step);
              }}
              allowNextStepsSelect={false}
              size="sm"
            >
              <Stepper.Step
                label={t.registerPage.stepChurch}
                icon={<IconBuilding size={16} />}
              >
                <Stack gap="md" mt="md">
                  <TextInput
                    label={t.churchesPage.name}
                    required
                    data-testid="admin-church-edit-name"
                    value={formFields.name}
                    onChange={(e) => setField('name', e.currentTarget.value)}
                  />
                  <TextInput
                    label={t.registerPage.pastor}
                    data-testid="admin-church-edit-pastor"
                    value={formFields.pastor_name}
                    onChange={(e) => setField('pastor_name', e.currentTarget.value)}
                  />
                  <MaskedTextInput
                    label={t.registerPage.phone}
                    placeholder="(00) 00000-0000"
                    mask="(00) 00000-0000"
                    value={formFields.phone}
                    onAccept={(v: string) => setField('phone', v)}
                  />
                  {editChurch?.church_type === 'CONGREGATION' && (
                    <AccountingCategorySelect
                      value={formFields.accounting_category}
                      onChange={(v) => setField('accounting_category', v)}
                      dataTestId="admin-church-edit-category"
                    />
                  )}
                </Stack>
              </Stepper.Step>

              <Stepper.Step
                label={t.registerPage.stepAddress}
                icon={<IconMapPin size={16} />}
              >
                <Stack gap="md" mt="md">
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <MaskedTextInput
                      label={t.registerPage.cep}
                      description={t.registerPage.cepHint}
                      placeholder="00000-000"
                      mask="00000-000"
                      value={formFields.cep}
                      onAccept={(v: string) => setField('cep', v)}
                      onBlur={() => handleCepBlur(formFields.cep)}
                    />
                    <TextInput
                      label={t.registerPage.city}
                      required
                      value={formFields.city}
                      onChange={(e) => setField('city', e.currentTarget.value)}
                    />
                  </SimpleGrid>
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <TextInput
                      label={t.registerPage.street}
                      value={formFields.street}
                      onChange={(e) => setField('street', e.currentTarget.value)}
                    />
                    <TextInput
                      label={t.registerPage.number}
                      value={formFields.number}
                      onChange={(e) =>
                        setField(
                          'number',
                          e.currentTarget.value.replace(/\D/g, '')
                        )
                      }
                    />
                  </SimpleGrid>
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <TextInput
                      label={t.registerPage.neighborhood}
                      value={formFields.neighborhood}
                      onChange={(e) =>
                        setField('neighborhood', e.currentTarget.value)
                      }
                    />
                    <Select
                      label={t.registerPage.state}
                      required
                      data={UF_LIST}
                      value={formFields.state}
                      onChange={(v) => setField('state', v ?? '')}
                      searchable
                    />
                  </SimpleGrid>
                  {cepLoading && <Text size="xs" c="dimmed">...</Text>}
                  {cepError && <Text size="xs" c="red">{cepError}</Text>}
                </Stack>
              </Stepper.Step>
            </Stepper>

            {editError && (
              <Alert
                icon={<IconAlertTriangle size={16} />}
                color="red"
                variant="light"
                mt="md"
              >
                <Text size="sm">{editError}</Text>
              </Alert>
            )}

            <Group justify="space-between" mt="lg">
              <Button
                type="button"
                variant="default"
                onClick={editStep > 0 ? backEditStep : () => setEditChurch(null)}
              >
                {editStep > 0 ? t.registerPage.back : t.common.cancel}
              </Button>
              <Button
                type="submit"
                loading={editSaving}
                data-testid="admin-church-edit-submit"
              >
                {editStep === 1 ? t.common.save : t.registerPage.next}
              </Button>
            </Group>
          </form>
        </Modal>
      </Layout>
    </AuthGuard>
  );
}
