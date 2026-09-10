import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Divider,
  Grid,
  Select,
  SimpleGrid,
  Title,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBuildingChurch,
  IconMapPin,
  IconUser,
  IconCheck,
  IconX,
  IconRefresh,
} from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import { useLanguage } from '../i18n';
import { accountsApi } from '../api/accounts';
import { AccountingCategoryOption, PendingChurch } from '../types';

export default function ApprovalsPage() {
  const { t } = useLanguage();
  const [congregations, setCongregations] = useState<PendingChurch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PendingChurch | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [customCategory, setCustomCategory] = useState('');
  const [categories, setCategories] = useState<AccountingCategoryOption[]>([]);
  const [customAllowed, setCustomAllowed] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    accountsApi
      .pendingCongregations()
      .then(setCongregations)
      .catch(() => setCongregations([]))
      .finally(() => setLoading(false));
  }, []);

  const loadCategories = useCallback(() => {
    accountsApi
      .accountingCategories()
      .then((res) => {
        setCategories(res.categories);
        setCustomAllowed(res.custom_allowed);
      })
      .catch(() => {
        setCategories([]);
        setCustomAllowed(false);
      });
  }, []);

  useEffect(() => {
    load();
    loadCategories();
  }, [load, loadCategories]);

  const selectData = useMemo(
    () =>
      customAllowed
        ? [
            { value: '__custom__', label: 'Outra categoria...' },
            ...categories.map((c) => ({ value: c.value, label: c.label })),
          ]
        : categories.map((c) => ({ value: c.value, label: c.label })),
    [categories, customAllowed]
  );

  const openDetails = (c: PendingChurch) => {
    setSelected(c);
    setCategory(null);
    setCustomCategory('');
  };

  const runAction = async (type: 'approve' | 'reject', id: number) => {
    if (type === 'approve') {
      const effectiveCategory =
        category === '__custom__'
          ? customCategory.trim()
          : (category ?? undefined);
      if (!effectiveCategory) {
        notifications.show({ color: 'red', message: t.approvalsPage.selectCategory });
        return;
      }
      setBusyId(id);
      try {
        await accountsApi.approveCongregation(id, effectiveCategory);
        notifications.show({ color: 'green', message: t.approvalsPage.approvedMsg });
        setSelected(null);
        load();
        // Categoria personalizada criada passa a existir como opção futura.
        loadCategories();
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err?.response?.data?.accounting_category?.[0];
        notifications.show({
          color: 'red',
          message: msg || t.approvalsPage.approveError,
        });
      } finally {
        setBusyId(null);
      }
      return;
    }

    setBusyId(id);
    try {
      await accountsApi.rejectCongregation(id);
      notifications.show({ color: 'red', message: t.approvalsPage.rejectedMsg });
      setSelected(null);
      load();
    } catch {
      notifications.show({ color: 'red', message: t.approvalsPage.rejectError });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AuthGuard roles={['PASTOR']}>
      <Layout>
        <PageHeader title={t.nav.approvals} description={t.approvalsPage.subtitle}>
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            onClick={load}
            data-testid="approvals-refresh"
          >
            {t.common.filter}
          </Button>
        </PageHeader>

        {loading ? (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height={140} />
            ))}
          </SimpleGrid>
        ) : congregations.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <ThemeIcon size={48} radius="xl" color="green" variant="light">
              <IconCheck size={24} />
            </ThemeIcon>
            <Text c="dimmed">{t.approvalsPage.empty}</Text>
          </Stack>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {congregations.map((c) => (
              <Card
                key={c.id}
                withBorder
                shadow="sm"
                padding="lg"
                style={{ cursor: 'pointer' }}
                onClick={() => openDetails(c)}
                data-testid={`approval-card-${c.id}`}
              >
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon color="yellow" variant="light" size="lg">
                      <IconBuildingChurch size={20} />
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
                    </Stack>
                  </Group>
                  <Badge color="yellow" variant="light">
                    {t.approvalsPage.pending}
                  </Badge>
                </Group>
                <Divider my="sm" />
                <Group gap={6}>
                  <IconUser size={14} />
                  <Text size="sm">{c.user?.name || c.pastor_name || '—'}</Text>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        )}

        <Modal
          opened={!!selected}
          onClose={() => setSelected(null)}
          title={t.approvalsPage.approveTitle}
          centered
          size="lg"
        >
          {selected && (
            <Stack gap="md">
              <Group justify="space-between">
                <Group gap="sm">
                  <ThemeIcon color="blue" variant="light" size="lg">
                    <IconBuildingChurch size={20} />
                  </ThemeIcon>
                  <Text fw={700}>{selected.name}</Text>
                </Group>
                <Badge color="yellow" variant="light">
                  {t.approvalsPage.pending}
                </Badge>
              </Group>

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
                  <Text size="xs" c="dimmed">{t.registerPage.cep}</Text>
                  <Text size="sm">{selected.cep || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.registerPage.city}</Text>
                  <Text size="sm">{selected.city || '—'}/{selected.state || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Text size="xs" c="dimmed">{t.registerPage.street}</Text>
                  <Text size="sm">
                    {selected.street || '—'}
                    {selected.number ? `, ${selected.number}` : ''}
                  </Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.common.name}</Text>
                  <Text size="sm">{selected.user?.name || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.email}</Text>
                  <Text size="sm">{selected.user?.email || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.registerPage.role}</Text>
                  <Text size="sm">{selected.requester_role?.role_display || '—'}</Text>
                </Grid.Col>
              </Grid>

              <Divider />

              <Select
                label={t.approvalsPage.categoryLabel}
                description={t.approvalsPage.categoryHint}
                placeholder={t.approvalsPage.categoryPlaceholder}
                required
                searchable
                clearable
                value={category}
                onChange={(v) => {
                  setCategory(v);
                  if (v !== '__custom__') setCustomCategory('');
                }}
                data={selectData}
                data-testid="approval-category"
              />

              {category === '__custom__' && (
                <TextInput
                  label={t.approvalsPage.customCategoryLabel}
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.currentTarget.value)}
                  data-testid="approval-custom-category"
                />
              )}

              <Group justify="flex-end" mt="xs">
                <Button
                  variant="default"
                  color="red"
                  leftSection={<IconX size={16} />}
                  loading={busyId === selected.id}
                  onClick={() => runAction('reject', selected.id)}
                  data-testid={`approval-reject-${selected.id}`}
                >
                  {t.reject}
                </Button>
                <Button
                  color="green"
                  leftSection={<IconCheck size={16} />}
                  loading={busyId === selected.id}
                  onClick={() => runAction('approve', selected.id)}
                  data-testid={`approval-approve-${selected.id}`}
                >
                  {t.approve}
                </Button>
              </Group>
            </Stack>
          )}
        </Modal>
      </Layout>
    </AuthGuard>
  );
}