import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  MultiSelect,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { DataTable, DataTableColumn } from 'mantine-datatable';
import { QRCodeSVG } from 'qrcode.react';
import {
  IconClipboardList,
  IconCopy,
  IconLink,
  IconPlus,
  IconRefresh,
  IconShare,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react';
import { accountsApi } from '../api/accounts';
import { eventCheckinApi } from '../api/checkin';
import CheckinMemberPicker from './CheckinMemberPicker';
import MobileItemCard from './MobileItemCard';
import { ListPagination, useServerPagination } from './ListPagination';
import { SkeletonResponsiveTable } from './LoadingSkeleton';
import { useLanguage } from '../i18n';
import { useFeedback } from '../hooks/useFeedback';
import type { Event, EventRegistration, EventShareLink, Member } from '../types';

interface EventRegistrationsPanelProps {
  event: Event;
  onChanged?: () => void;
}

type AddMode = 'member' | 'external' | 'multiple' | null;

export default function EventRegistrationsPanel({ event, onChanged }: EventRegistrationsPanelProps) {
  const { t } = useLanguage();
  const fb = useFeedback();
  const pagination = useServerPagination({ pageSize: 20 });
  const [rows, setRows] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [saving, setSaving] = useState(false);
  const [member, setMember] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [memberOptions, setMemberOptions] = useState<Member[]>([]);
  const [multiple, setMultiple] = useState<string[]>([]);
  const [share, setShare] = useState<EventShareLink | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      pagination.reset();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const params = useMemo(() => ({
    event: event.id,
    page: pagination.page,
    page_size: pagination.pageSize,
    search: search || undefined,
    kind: kind || undefined,
  }), [event.id, pagination.page, pagination.pageSize, search, kind]);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    eventCheckinApi.listRegistrations(params)
      .then((result) => {
        if (!active) return;
        setRows(result.results);
        pagination.setTotal(result.count);
      })
      .catch(() => { if (active) setRows([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params, pagination.setTotal]);

  useEffect(load, [load]);

  const changed = () => {
    load();
    onChanged?.();
  };

  const openAdd = async (mode: Exclude<AddMode, null>) => {
    setAddMode(mode);
    setMember(null);
    setName('');
    setPhone('');
    setEmail('');
    setMultiple([]);
    if (mode === 'member') {
      try {
        setMemberOptions(await accountsApi.members({ status: 'ACTIVE', page_size: 100 }));
      } catch {
        setMemberOptions([]);
      }
    }
  };

  const closeAdd = () => setAddMode(null);

  const submitAdd = async () => {
    setSaving(true);
    try {
      if (addMode === 'member') {
        if (!member) return;
        await eventCheckinApi.createRegistration({ event: event.id, kind: 'MEMBER', member });
      } else if (addMode === 'external') {
        await eventCheckinApi.createRegistration({
          event: event.id,
          kind: 'EXTERNAL',
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
        });
      }
      fb.success(t.common.toast.addedWithName.replace('{name}', t.events.registrations));
      closeAdd();
      changed();
    } catch (err) {
      fb.fromError(err, t.common.toast.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const addMultiple = async () => {
    if (!multiple.length) return;
    setSaving(true);
    try {
      const result = await eventCheckinApi.bulkMembers({
        event: event.id,
        members: multiple.map(Number),
      });
      fb.success(
        t.events.registrationPanel.bulkResult
          .replace('{count}', String(result.created))
      );
      closeAdd();
      changed();
    } catch (err) {
      fb.fromError(err, t.common.toast.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const addAll = async () => {
    if (!window.confirm(t.events.registrationPanel.addAllConfirm)) return;
    setSaving(true);
    try {
      const result = await eventCheckinApi.bulkMembers({ event: event.id, all_members: true });
      fb.success(t.events.registrationPanel.bulkResult.replace('{count}', String(result.created)));
      closeAdd();
      changed();
    } catch (err) {
      fb.fromError(err, t.common.toast.operationFailed);
    } finally {
      setSaving(false);
    }
  };

  const cancelRegistration = async (row: EventRegistration) => {
    if (!window.confirm(t.events.registrationPanel.cancelConfirm)) return;
    try {
      await eventCheckinApi.cancelRegistration(row.id);
      fb.success(t.common.toast.saved);
      changed();
    } catch (err) {
      fb.fromError(err, t.common.toast.operationFailed);
    }
  };

  const regenerate = async (row: EventRegistration) => {
    if (!window.confirm(t.events.registrationPanel.regenerateCodeConfirm)) return;
    try {
      await eventCheckinApi.regenerateRegistrationCode(row.id);
      fb.success(t.common.toast.updatedWithName.replace('{name}', t.events.registrationPanel.code));
      changed();
    } catch (err) {
      fb.fromError(err, t.common.toast.operationFailed);
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      fb.success(t.events.copied);
    } catch (err) {
      fb.fromError(err, t.common.toast.operationFailed);
    }
  };

  const openShare = async () => {
    try {
      setShare(await eventCheckinApi.shareRegistration(event.id));
    } catch (err) {
      fb.fromError(err, t.common.toast.loadFailed);
    }
  };

  const columns: DataTableColumn<EventRegistration>[] = [
    {
      accessor: 'display_name',
      title: t.events.registrationPanel.name,
      render: (row) => (
        <Stack gap={0}>
          <Text size="sm" fw={600}>{row.display_name}</Text>
          {row.phone ? <Text size="xs" c="dimmed">{row.phone}</Text> : null}
        </Stack>
      ),
    },
    {
      accessor: 'kind_display',
      title: t.events.registrationPanel.allKinds,
      render: (row) => (
        <Badge size="sm" variant="light" color={row.kind === 'MEMBER' ? 'blue' : 'cyan'}>
          {row.kind_display}
        </Badge>
      ),
    },
    {
      accessor: 'source_display',
      title: t.events.registrationPanel.source,
      render: (row) => <Text size="sm">{row.source_display}</Text>,
    },
    {
      accessor: 'code',
      title: t.events.registrationPanel.code,
      render: (row) => (
        <Group gap={4} wrap="nowrap">
          <Text size="xs" style={{ letterSpacing: 0.5 }}>{row.code}</Text>
          <Tooltip label={t.events.registrationPanel.copyCode}>
            <ActionIcon size="xs" variant="subtle" onClick={() => copy(row.code)}>
              <IconCopy size={12} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    },
    {
      accessor: 'status_display',
      title: t.events.registrationPanel.status,
      render: (row) => (
        <Badge size="sm" variant="light" color={row.status === 'ACTIVE' ? 'green' : 'gray'}>
          {row.status_display}
        </Badge>
      ),
    },
    {
      accessor: 'actions',
      title: t.events.registrationPanel.actions,
      render: (row) => (
        <Group gap={2} wrap="nowrap">
          <Tooltip label={t.events.registrationPanel.regenerateCode}>
            <ActionIcon
              size="sm"
              variant="subtle"
              aria-label={t.events.registrationPanel.regenerateCode}
              disabled={row.status !== 'ACTIVE'}
              onClick={() => regenerate(row)}
            >
              <IconRefresh size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t.events.registrationPanel.cancel}>
            <ActionIcon
              size="sm"
              color="red"
              variant="subtle"
              aria-label={t.events.registrationPanel.cancel}
              disabled={row.status !== 'ACTIVE'}
              onClick={() => cancelRegistration(row)}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    },
  ];

  return (
    <Stack gap="md" data-testid="event-registrations-panel">
      <Paper withBorder p="md" radius="md">
        <Stack gap="md">
          <Group justify="space-between" wrap="wrap">
            <Text fw={700}>{t.events.registrationPanel.title}</Text>
            <Group gap="xs" wrap="wrap">
              <Button
                size="sm"
                variant="default"
                leftSection={<IconLink size={14} />}
                onClick={openShare}
              >
                {t.events.share}
              </Button>
              <Button
                size="sm"
                variant="default"
                leftSection={<IconUsers size={14} />}
                loading={saving}
                onClick={addAll}
              >
                {t.events.registrationPanel.addAll}
              </Button>
              <Button
                size="sm"
                leftSection={<IconPlus size={14} />}
                onClick={() => openAdd('member')}
              >
                {t.events.registrationPanel.addMember}
              </Button>
            </Group>
          </Group>
          <Group align="flex-end" wrap="wrap">
            <TextInput
              data-testid="event-registrations-search"
              label={t.events.registrationPanel.search}
              placeholder={t.common.search}
              value={searchInput}
              onChange={(event) => setSearchInput(event.currentTarget.value)}
              maw={280}
            />
            <Select
              data-testid="event-registrations-kind"
              label={t.events.registrationPanel.allKinds}
              placeholder={t.common.all}
              clearable
              data={[
                { value: 'MEMBER', label: t.events.registrationPanel.member },
                { value: 'EXTERNAL', label: t.events.registrationPanel.external },
              ]}
              value={kind}
              onChange={(value) => { setKind(value); pagination.reset(); }}
              w={200}
            />
          </Group>
        </Stack>
      </Paper>

      {loading ? (
        <SkeletonResponsiveTable rows={5} columns={6} />
      ) : rows.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">{t.events.registrationPanel.empty}</Text>
      ) : (
        <>
          <Box visibleFrom="sm">
            <DataTable<EventRegistration>
              withTableBorder
              highlightOnHover
              striped
              columns={columns}
              records={rows}
              minHeight={200}
              idAccessor="id"
            />
          </Box>
          <Stack hiddenFrom="sm" gap="xs">
            {rows.map((row) => (
              <MobileItemCard key={row.id} testId={`event-registration-${row.id}`}>
                <Stack gap={4}>
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="sm" fw={600} truncate>{row.display_name}</Text>
                    <Badge size="xs" variant="light" color={row.status === 'ACTIVE' ? 'green' : 'gray'}>
                      {row.status_display}
                    </Badge>
                  </Group>
                  <Group gap={6}>
                    <Badge size="xs" variant="light">{row.kind_display}</Badge>
                    <Text size="xs" c="dimmed">{row.code}</Text>
                  </Group>
                  <Group justify="flex-end">
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      disabled={row.status !== 'ACTIVE'}
                      onClick={() => cancelRegistration(row)}
                    >
                      {t.events.registrationPanel.cancel}
                    </Button>
                  </Group>
                </Stack>
              </MobileItemCard>
            ))}
          </Stack>
          <ListPagination
            testId="event-registrations-pagination"
            page={pagination.page}
            onPageChange={pagination.setPage}
            pageSize={pagination.pageSize}
            onPageSizeChange={pagination.changePageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
          />
        </>
      )}

      <Modal
        opened={addMode !== null}
        onClose={closeAdd}
        title={
          addMode === 'member'
            ? t.events.registrationPanel.addMember
            : addMode === 'external'
              ? t.events.registrationPanel.addExternal
              : t.events.registrationPanel.addMembers
        }
      >
        <Stack gap="md">
          {addMode === 'member' ? (
            <>
              <CheckinMemberPicker
                label={t.events.registrationPanel.memberField}
                value={member}
                onChange={setMember}
                testId="event-registration-member"
              />
              <Button
                variant="default"
                leftSection={<IconUsers size={14} />}
                onClick={() => openAdd('multiple')}
              >
                {t.events.registrationPanel.addMembers}
              </Button>
              <Group justify="flex-end">
                <Button variant="default" onClick={closeAdd}>{t.events.form.cancel}</Button>
                <Button loading={saving} disabled={!member} onClick={submitAdd}>
                  {t.events.registrationPanel.submit}
                </Button>
              </Group>
            </>
          ) : addMode === 'multiple' ? (
            <>
              <Button
                variant="default"
                leftSection={<IconUsers size={14} />}
                loading={saving}
                onClick={addAll}
              >
                {t.events.registrationPanel.addAll}
              </Button>
              <MultiSelect
                label={t.events.registrationPanel.allMembers}
                data={memberOptions.map((item) => ({
                  value: String(item.id),
                  label: item.card_number ? `${item.name} · ${item.card_number}` : item.name,
                }))}
                value={multiple}
                onChange={setMultiple}
                searchable
                clearable
                maxValues={100}
              />
              <Group justify="flex-end">
                <Button variant="default" onClick={closeAdd}>{t.events.form.cancel}</Button>
                <Button loading={saving} disabled={!multiple.length} onClick={addMultiple}>
                  {t.events.registrationPanel.addSelected}
                </Button>
              </Group>
            </>
          ) : (
            <>
              <TextInput
                label={t.events.registrationPanel.name}
                required
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
              />
              <TextInput
                label={t.events.registrationPanel.phone}
                value={phone}
                onChange={(event) => setPhone(event.currentTarget.value)}
              />
              <TextInput
                type="email"
                label={t.events.registrationPanel.email}
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
              />
              <Group justify="flex-end">
                <Button variant="default" onClick={closeAdd}>{t.events.form.cancel}</Button>
                <Button loading={saving} disabled={!name.trim()} onClick={submitAdd}>
                  {t.events.registrationPanel.submit}
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>

      <Modal
        opened={!!share}
        onClose={() => setShare(null)}
        title={t.events.registrationPanel.shareTitle}
        size="sm"
      >
        {share ? (
          <Stack gap="md" align="center">
            <QRCodeSVG value={share.url} size={170} includeMargin />
            <Text size="xs" c="dimmed" ta="center" style={{ wordBreak: 'break-all' }}>
              {share.url}
            </Text>
            <Group justify="center" wrap="wrap">
              <Button variant="default" leftSection={<IconCopy size={14} />} onClick={() => copy(share.url)}>
                {t.events.copy}
              </Button>
              <Button
                component="a"
                href={`https://wa.me/?text=${encodeURIComponent(share.url)}`}
                target="_blank"
                rel="noreferrer"
                leftSection={<IconShare size={14} />}
              >
                {t.events.registrationPanel.whatsapp}
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>
    </Stack>
  );
}
