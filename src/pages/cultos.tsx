import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Center,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
} from '@mantine/core';
import { DateInput, TimeInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconBuildingChurch,
  IconCalendarEvent,
  IconClock,
  IconPencil,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import MoneyInput from '../components/MoneyInput';
import { accountsApi } from '../api/accounts';
import { useLanguage } from '../i18n';
import { formatBRL } from '../utils/format';
import type { WorshipService, WorshipServiceType } from '../types';

function formatISODate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function isoToDateLocal(iso: string): Date | null {
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

interface ServiceFormValues {
  date: string;
  time: string;
  service_type: WorshipServiceType | null;
  presider: string;
  preacher: string;
  theme: string;
  scripture: string;
  attendees: string;
  visitors: string;
  conversions: string;
  offering: string;
  notes: string;
}

export default function CultosPage() {
  const { t } = useLanguage();
  const [services, setServices] = useState<WorshipService[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<WorshipService | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<WorshipService | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    accountsApi
      .worshipServices()
      .then((items) => setServices(items))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const emptyValues = (): ServiceFormValues => ({
    date: '',
    time: '',
    service_type: null,
    presider: '',
    preacher: '',
    theme: '',
    scripture: '',
    attendees: '',
    visitors: '',
    conversions: '',
    offering: '',
    notes: '',
  });

  const form = useForm<ServiceFormValues>({
    initialValues: emptyValues(),
    validate: {
      date: (v) => (v ? null : t.cultosPage.date),
      service_type: (v) => (v ? null : t.cultosPage.type),
    },
  });

  const SERVICE_TYPES = (
    Object.keys(t.cultosPage.serviceTypes) as WorshipServiceType[]
  ).map((k) => ({ value: k, label: t.cultosPage.serviceTypes[k] }));

  const openCreate = () => {
    setEditing(null);
    form.setValues(emptyValues());
    form.resetDirty();
    setOpened(true);
  };

  const openEdit = (item: WorshipService) => {
    setEditing(item);
    form.setValues({
      date: item.date.slice(0, 10),
      time: item.time ? item.time.slice(0, 5) : '',
      service_type: item.service_type,
      presider: item.presider,
      preacher: item.preacher,
      theme: item.theme,
      scripture: item.scripture,
      attendees: item.attendees ? String(item.attendees) : '',
      visitors: item.visitors ? String(item.visitors) : '',
      conversions: item.conversions ? String(item.conversions) : '',
      offering: item.offering || '',
      notes: item.notes,
    });
    form.resetDirty();
    setOpened(true);
  };

  const integerOrUndefined = (v: string): number | undefined => {
    const n = Number.parseInt(v, 10);
    return Number.isNaN(n) ? undefined : n;
  };

  const submit = form.onSubmit((values) => {
    setSaving(true);
    const payload = {
      date: values.date,
      time: values.time ? `${values.time}:00` : null,
      service_type: values.service_type ?? undefined,
      presider: values.presider,
      preacher: values.preacher,
      theme: values.theme,
      scripture: values.scripture,
      attendees: integerOrUndefined(values.attendees),
      visitors: integerOrUndefined(values.visitors),
      conversions: integerOrUndefined(values.conversions),
      offering: values.offering || undefined,
      notes: values.notes,
    };

    const request = editing
      ? accountsApi.updateWorshipService(editing.id, payload)
      : accountsApi.createWorshipService(payload);

    request
      .then(() => {
        notifications.show({ message: t.cultosPage.saved, color: 'green' });
        setOpened(false);
        load();
      })
      .catch(() => {
        notifications.show({ message: t.overview, color: 'red' });
      })
      .finally(() => setSaving(false));
  });

  const confirmDelete = () => {
    if (!toDelete) return;
    setDeleting(true);
    accountsApi
      .deleteWorshipService(toDelete.id)
      .then(() => {
        notifications.show({ message: t.cultosPage.deleted, color: 'green' });
        setToDelete(null);
        load();
      })
      .catch(() => {
        notifications.show({ message: t.overview, color: 'red' });
      })
      .finally(() => setDeleting(false));
  };

  return (
    <AuthGuard>
      <Layout>
        <PageHeader title={t.cultosPage.title} description={t.cultosPage.subtitle}>
          <Button leftSection={<IconPlus size={18} />} onClick={openCreate} data-testid="add-service">
            {t.cultosPage.add}
          </Button>
        </PageHeader>

        {loading ? (
          <Center h="40vh">
            <Loader />
          </Center>
        ) : services.length === 0 ? (
          <Card withBorder p="xl" ta="center" c="dimmed">
            <ThemeIcon size={48} radius="xl" variant="light" mx="auto" mb="sm">
              <IconBuildingChurch size={24} />
            </ThemeIcon>
            <Text>{t.cultosPage.empty}</Text>
          </Card>
        ) : (
          <Card withBorder p={0}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t.cultosPage.date}</Table.Th>
                  <Table.Th>{t.cultosPage.type}</Table.Th>
                  <Table.Th>{t.cultosPage.preacher}</Table.Th>
                  <Table.Th>{t.cultosPage.theme}</Table.Th>
                  <Table.Th>{t.cultosPage.attendees}</Table.Th>
                  <Table.Th>{t.cultosPage.offering}</Table.Th>
                  <Table.Th ta="right">{t.common.actions}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {services.map((s) => (
                  <Table.Tr key={s.id}>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <IconCalendarEvent size={16} style={{ flexShrink: 0 }} />
                        <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
                          {formatISODate(s.date)}
                        </Text>
                        {s.time && (
                          <Group gap={4} wrap="nowrap" c="dimmed">
                            <IconClock size={14} style={{ flexShrink: 0 }} />
                            <Text size="sm">{s.time.slice(0, 5)}</Text>
                          </Group>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>{s.service_type_display}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{s.preacher || '—'}</Text>
                      {s.presider && (
                        <Text size="xs" c="dimmed">
                          {t.cultosPage.presider}: {s.presider}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{s.theme || '—'}</Text>
                      {s.scripture && (
                        <Text size="xs" c="blue">
                          {s.scripture}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {s.attendees} <Text span c="dimmed">· {s.visitors} {t.cultosPage.visitorsShort} · {s.conversions} {t.cultosPage.conversionsShort}</Text>
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600}>
                        {s.offering ? formatBRL(Number(s.offering)) : '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="flex-end">
                        <Button
                          variant="subtle"
                          size="compact-sm"
                          onClick={() => openEdit(s)}
                          aria-label={t.common.edit}
                        >
                          <IconPencil size={16} />
                        </Button>
                        <Button
                          variant="subtle"
                          size="compact-sm"
                          color="red"
                          onClick={() => setToDelete(s)}
                          aria-label={t.common.delete}
                        >
                          <IconTrash size={16} />
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        )}

        <Modal
          opened={opened}
          onClose={() => setOpened(false)}
          title={editing ? t.cultosPage.editTitle : t.cultosPage.add}
          size="lg"
        >
          <form onSubmit={submit}>
            <Stack gap="sm">
              <Group grow align="flex-end">
                <DateInput
                  label={t.cultosPage.date}
                  valueFormat="DD/MM/YYYY"
                  value={valuesToDate(form.values.date)}
                  onChange={(v) => form.setFieldValue('date', v ?? '')}
                  clearable
                  error={form.errors.date}
                  data-testid="service-date"
                />
                <TimeInput
                  label={t.cultosPage.time}
                  value={form.values.time}
                  onChange={(e) => form.setFieldValue('time', e.currentTarget.value)}
                  data-testid="service-time"
                />
              </Group>
              <Select
                label={t.cultosPage.type}
                placeholder={t.cultosPage.typePlaceholder}
                data={SERVICE_TYPES}
                value={form.values.service_type}
                onChange={(v) =>
                  form.setFieldValue('service_type', (v as WorshipServiceType) || null)
                }
                error={form.errors.service_type}
                data-testid="service-type"
              />
              <Group grow>
                <TextInput
                  label={t.cultosPage.presider}
                  {...form.getInputProps('presider')}
                />
                <TextInput
                  label={t.cultosPage.preacher}
                  {...form.getInputProps('preacher')}
                />
              </Group>
              <Group grow>
                <TextInput label={t.cultosPage.theme} {...form.getInputProps('theme')} />
                <TextInput
                  label={t.cultosPage.scripture}
                  placeholder="Ex.: João 3.16"
                  {...form.getInputProps('scripture')}
                />
              </Group>
              <Group grow>
                <NumberInput
                  label={t.cultosPage.attendees}
                  min={0}
                  {...numberFieldProps(form.values.attendees, (v) =>
                    form.setFieldValue('attendees', v),
                  )}
                />
                <NumberInput
                  label={t.cultosPage.visitors}
                  min={0}
                  {...numberFieldProps(form.values.visitors, (v) =>
                    form.setFieldValue('visitors', v),
                  )}
                />
                <NumberInput
                  label={t.cultosPage.conversions}
                  min={0}
                  {...numberFieldProps(form.values.conversions, (v) =>
                    form.setFieldValue('conversions', v),
                  )}
                />
              </Group>
              <MoneyInput
                label={t.cultosPage.offering}
                placeholder={t.cultosPage.offeringPlaceholder}
                value={form.values.offering}
                onValueChange={(v) =>
                  form.setFieldValue('offering', v === '' ? '' : String(v))
                }
                data-testid="service-offering"
              />
              <Textarea
                label={t.cultosPage.notes}
                placeholder={t.cultosPage.notesPlaceholder}
                rows={4}
                {...form.getInputProps('notes')}
              />
              <Group justify="flex-end">
                <Button variant="default" onClick={() => setOpened(false)}>
                  {t.common.cancel}
                </Button>
                <Button type="submit" loading={saving} data-testid="save-service">
                  {t.common.save}
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        <Modal
          opened={!!toDelete}
          onClose={() => setToDelete(null)}
          title={t.cultosPage.deleteTitle}
        >
          <Stack gap="lg">
            <Text>
              {t.cultosPage.deleteBody.replace(
                '{date}',
                toDelete ? formatISODate(toDelete.date) : '',
              )}
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setToDelete(null)}>
                {t.common.cancel}
              </Button>
              <Button color="red" loading={deleting} onClick={confirmDelete}>
                {t.common.delete}
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Layout>
    </AuthGuard>
  );
}

function valuesToDate(iso: string): Date | null {
  return iso ? isoToDateLocal(iso) : null;
}

function numberFieldProps(value: string, onChange: (v: string) => void) {
  return {
    value: value === '' ? undefined : Number(value),
    onChange: (v: number | string) =>
      onChange(v === '' ? '' : String(Number(v) || 0)),
  };
}