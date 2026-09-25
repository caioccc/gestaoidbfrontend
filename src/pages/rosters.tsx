import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  IconClipboardCheck,
  IconCopy,
  IconDeviceFloppy,
  IconListCheck,
  IconMusic,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import MinistriesModal from '../components/MinistriesModal';
import SetlistModal from '../components/SetlistModal';
import { useLanguage } from '../i18n';
import { useAuth, useRoleHelpers } from '../contexts/AuthContext';
import { musicApi } from '../api/music';
import { toSentenceCase, toUpperCamelWords } from '../utils/format';
import type {
  Ministry,
  MinistryRole,
  RosterAssignment,
  RosterAssignmentStatus,
  VolunteerRoster,
  WorshipSetlist,
} from '../types';

type Volunteer = { id: number; name: string; email: string };

const MONTHS_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-');
  const i = Number(m) - 1;
  return `${Number(d)} de ${MONTHS_PT[i] ?? m} de ${y}`;
}

const STATUS_COLORS: Record<RosterAssignmentStatus, string> = {
  PENDING: 'yellow',
  CONFIRMED: 'green',
  DECLINED: 'red',
};

export default function RostersPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { canManageMusic, canManageSetlists } = useRoleHelpers(user);
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [rosters, setRosters] = useState<VolunteerRoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [setlistFor, setSetlistFor] = useState<{ roster: VolunteerRoster } | null>(null);
  const [ministriesOpen, setMinistriesOpen] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [volunteers, setVolunteers] = useState<{ id: number; name: string; email: string }[]>([]);
  const [editingRoster, setEditingRoster] = useState<VolunteerRoster | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (onlyMine || !canManageMusic) {
        setRosters(await musicApi.myRosters({ month }));
      } else {
        setRosters(await musicApi.rosters({ month }));
      }
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao carregar escalas.' });
    } finally {
      setLoading(false);
    }
  }, [month, onlyMine, canManageMusic]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (canManageMusic) void musicApi.volunteers().then(setVolunteers).catch(() => setVolunteers([]));
  }, [canManageMusic]);

  const [monthOptions] = useState(() => {
    const now = new Date();
    const opts: { value: string; label: string }[] = [];
    for (let i = 2; i >= -6; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = monthKey(d);
      opts.push({ value: key, label: `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}` });
    }
    return opts;
  });

  const openNew = () => {
    setEditingRoster(null);
    setModalOpen(true);
  };

  const openEdit = (r: VolunteerRoster) => {
    setEditingRoster(r);
    setModalOpen(true);
  };

  return (
    <AuthGuard roles={['PASTOR', 'SECRETARIA', 'LOUVOR', 'MUSICO']}>
      <Layout>
        <PageHeader title={t.music.rostersTitle} description={t.music.rostersSubtitle}>
          <Group gap="sm">
            {canManageMusic ? (
              <Switch
                label={t.music.myScalesOnly}
                checked={onlyMine}
                onChange={(e) => setOnlyMine(e.currentTarget.checked)}
                size="sm"
              />
            ) : null}
            <Select
              value={month}
              onChange={(v) => v && setMonth(v)}
              data={monthOptions}
              w={220}
              size="sm"
            />
            {canManageMusic ? (
              <>
                <Button
                  variant="light"
                  leftSection={<IconListCheck size={16} />}
                  onClick={() => setMinistriesOpen(true)}
                  size="sm"
                >
                  {t.music.ministryManage}
                </Button>
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={openNew}
                  size="sm"
                >
                  {t.music.newRoster}
                </Button>
              </>
            ) : null}
          </Group>
        </PageHeader>

        {loading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : rosters.length === 0 ? (
          <Card withBorder p="xl">
            <Text c="dimmed">{!canManageMusic || onlyMine ? t.music.myRostersEmpty : t.music.rosterEmpty}</Text>
          </Card>
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }}>
            {rosters.map((r) => (
              <RosterCard
                key={r.id}
                roster={r}
                canManage={canManageMusic}
                currentUserId={user?.id ?? 0}
                onEdit={openEdit}
                onSetlist={canManageSetlists ? (rr) => setSetlistFor({ roster: rr }) : undefined}
                onRefresh={load}
              />
            ))}
          </SimpleGrid>
        )}

        <RosterModal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          editing={editingRoster}
          onSaved={() => { void load(); setModalOpen(false); }}
        />

        <MinistriesModal
          opened={ministriesOpen}
          onClose={() => setMinistriesOpen(false)}
          volunteers={volunteers}
        />

        <SetlistModal
          opened={!!setlistFor}
          onClose={() => setSetlistFor(null)}
          rosterId={setlistFor?.roster.id ?? 0}
          existingSetlist={setlistFor?.roster.setlist ?? null}
          onSaved={() => { void load(); }}
        />
      </Layout>
    </AuthGuard>
  );
}

function RosterCard({
  roster,
  canManage,
  currentUserId,
  onEdit,
  onSetlist,
  onRefresh,
}: {
  roster: VolunteerRoster;
  canManage: boolean;
  currentUserId: number;
  onEdit: (r: VolunteerRoster) => void;
  onSetlist?: (r: VolunteerRoster) => void;
  onRefresh: () => void;
}) {
  const { t } = useLanguage();

  const myAssignments = useMemo(
    () => roster.assignments.filter((a) => a.user === currentUserId),
    [roster.assignments, currentUserId],
  );

  const copyText = async () => {
    try {
      const { text } = await musicApi.exportRosterText(roster.id);
      await navigator.clipboard.writeText(text);
      notifications.show({ color: 'green', message: t.music.copyDone });
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao copiar.' });
    }
  };

  return (
    <Card withBorder p="md">
      <Group justify="space-between" mb="xs">
        <Text fw={600} size="lg">
          {formatDateLabel(roster.date)}
        </Text>
        <Group gap={4}>
          <Badge color={roster.is_published ? 'green' : 'yellow'} variant="light" size="sm">
            {roster.is_published ? t.music.published : t.music.draft}
          </Badge>
          <Tooltip label={t.music.copyText}>
            <ActionIcon variant="subtle" color="blue" size="sm" onClick={copyText}>
              <IconCopy size={14} />
            </ActionIcon>
          </Tooltip>
          {canManage ? (
            <Tooltip label={t.music.editRoster}>
              <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => onEdit(roster)}>
                <IconClipboardCheck size={14} />
              </ActionIcon>
            </Tooltip>
          ) : null}
        </Group>
      </Group>

      {roster.time ? <Text size="sm" c="dimmed">{t.music.timeLabel}: {roster.time}</Text> : null}
      {roster.theme ? <Text size="sm" c="dimmed">{t.music.themeLabel}: {roster.theme}</Text> : null}

      {myAssignments.length > 0 ? (
        <Group gap={6} mt="xs">
          <Badge color="teal" variant="filled" size="sm">
            {t.music.youScaleNote} — {myAssignments.map((a) => a.role_name).join(', ')}
          </Badge>
        </Group>
      ) : null}

      {roster.assignments.length > 0 ? (
        <Table mt="sm" verticalSpacing={2} horizontalSpacing={4}>
          <Table.Tbody>
            {roster.assignments.map((a) => (
              <Table.Tr
                key={a.id}
                style={
                  a.user === currentUserId
                    ? { backgroundColor: 'var(--mantine-color-teal-0)' }
                    : undefined
                }
              >
                <Table.Td>
                  <Group gap={4}>
                    <Box w={8} h={8} style={{ borderRadius: '50%', backgroundColor: a.ministry_color }} />
                    <Text size="xs" fw={600}>{a.user_name}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed">{a.role_name}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={STATUS_COLORS[a.status]} size="xs" variant="light">
                    {a.status_display}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      ) : (
        <Text size="sm" c="dimmed" mt="sm">{t.music.noVolunteers}</Text>
      )}

      {roster.setlist && roster.setlist.items.length > 0 ? (
        <Stack gap={2} mt="sm">
          <Group gap={6} justify="space-between">
            <Text size="xs" fw={600} c="dimmed">{t.music.setlistLabel}</Text>
            {onSetlist ? (
              <Tooltip label={t.music.setlistEdit}>
                <ActionIcon variant="subtle" color="violet" size="sm" onClick={() => onSetlist(roster)}>
                  <IconMusic size={14} />
                </ActionIcon>
              </Tooltip>
            ) : null}
          </Group>
          {roster.setlist.items.map((s) => (
            <Text key={s.id} size="xs">{s.order}. {s.song_title} — {s.song_artist}</Text>
          ))}
        </Stack>
      ) : onSetlist ? (
        <Group justify="space-between" mt="sm">
          <Text size="xs" c="dimmed">{t.music.setlistEmpty}</Text>
          <Tooltip label={t.music.setlistEdit}>
            <ActionIcon variant="subtle" color="violet" size="sm" onClick={() => onSetlist(roster)}>
              <IconMusic size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ) : null}
    </Card>
  );
}

function RosterModal({
  opened,
  onClose,
  editing,
  onSaved,
}: {
  opened: boolean;
  onClose: () => void;
  editing: VolunteerRoster | null;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [date, setDate] = useState<string | null>(() => {
    return editing?.date ?? new Date().toISOString().slice(0, 10);
  });
  const [time, setTime] = useState('');
  const [theme, setTheme] = useState('');
  const [notes, setNotes] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [assignments, setAssignments] = useState<{
    ministry: number;
    role: number;
    user: number;
    status: RosterAssignmentStatus;
  }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!opened) return;
    setDate(editing?.date ?? new Date().toISOString().slice(0, 10));
    setTime(editing?.time ?? '');
    setTheme(editing?.theme ?? '');
    setNotes(editing?.notes ?? '');
    setIsPublished(editing?.is_published ?? false);
    setAssignments(
      (editing?.assignments ?? []).map((a) => ({
        ministry: a.ministry,
        role: a.role,
        user: a.user,
        status: a.status,
      })),
    );
    setError('');
    void musicApi.ministries().then(setMinistries).catch(() => setMinistries([]));
    void musicApi.volunteers().then(setVolunteers).catch(() => setVolunteers([]));
  }, [opened, editing]);

  const addRow = () => {
    setAssignments((prev) => [
      ...prev,
      { ministry: 0, role: 0, user: 0, status: 'PENDING' as const },
    ]);
  };

  const updateRow = (i: number, patch: Partial<typeof assignments[0]>) => {
    setAssignments((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    );
  };

  const removeRow = (i: number) => {
    setAssignments((prev) => prev.filter((_, idx) => idx !== i));
  };

  const rolesForMinistry = (ministryId: number): MinistryRole[] => {
    const m = ministries.find((x) => x.id === ministryId);
    return m?.roles ?? [];
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.currentTarget.value.replace(/\D/g, '').slice(0, 4);
    if (!digits) {
      setTime('');
      return;
    }
    const hh = digits.slice(0, 2);
    const mm = digits.length > 2 ? digits.slice(2, 4) : '';
    setTime(mm ? `${hh}:${mm}` : hh);
  };

  const save = async () => {
    if (!date) return;
    setError('');
    setSaving(true);
    try {
      const payload = {
        date,
        time: time || undefined,
        theme: toUpperCamelWords(theme.trim()),
        notes: toSentenceCase(notes.trim()),
        is_published: isPublished,
        assignments: assignments
          .filter((a) => a.ministry && a.role && a.user)
          .map((a) => ({
            ministry: a.ministry,
            role: a.role,
            user: a.user,
            status: a.status,
          })),
      };
      if (editing) {
        const { assignments: _ignored, ...scalar } = payload;
        await musicApi.updateRoster(editing.id, scalar);
      } else {
        await musicApi.createRoster(payload);
      }
      notifications.show({ color: 'green', message: editing ? 'Escala atualizada!' : 'Escala criada!' });
      onSaved();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail
        ?? err?.response?.data?.assignments?.[0]
        ?? err?.response?.data?.user
        ?? 'Erro ao salvar escala.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} size="xl" centered title={editing ? t.music.editRoster : t.music.newRoster}>
      <Stack gap="md">
        {error ? (
          <Alert color="red">{error}</Alert>
        ) : null}

        <Group align="flex-end" gap="md">
          <DateInput
            label={t.music.date}
            value={date}
            onChange={setDate}
            valueFormat="DD/MM/YYYY"
            w={160}
          />
          <TextInput
            label={t.music.timeLabel}
            placeholder={t.music.timePlaceholder}
            value={time}
            onChange={handleTimeChange}
            w={100}
          />
          <TextInput
            label={t.music.themeLabel}
            placeholder={t.music.themePlaceholder}
            value={theme}
            onChange={(e) => setTheme(e.currentTarget.value)}
            flex={1}
          />
        </Group>

        <TextInput
          label={t.music.notesLabel}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
        />

        <Switch
          label={t.music.isPublished}
          checked={isPublished}
          onChange={(e) => setIsPublished(e.currentTarget.checked)}
        />

        <Group justify="space-between" mt="sm">
          <Text fw={600}>{t.music.addVolunteer}</Text>
          <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={addRow}>
            {t.music.addVolunteer}
          </Button>
        </Group>

        {assignments.length === 0 ? (
          <Text size="sm" c="dimmed">{t.music.noVolunteers}</Text>
        ) : (
          <Stack gap={6}>
            {assignments.map((row, i) => {
              const availableRoles = rolesForMinistry(row.ministry);
              return (
                <Group key={i} gap="sm" align="flex-end">
                  <Select
                    label={t.music.selectMinistry}
                    placeholder={t.music.selectMinistry}
                    data={ministries.map((m) => ({ value: String(m.id), label: m.name }))}
                    value={row.ministry ? String(row.ministry) : null}
                    onChange={(v) => {
                      updateRow(i, { ministry: Number(v), role: 0 });
                    }}
                    w={150}
                    size="xs"
                    searchable
                  />
                  <Select
                    label={t.music.selectRole}
                    placeholder={t.music.selectRole}
                    data={availableRoles.map((r) => ({ value: String(r.id), label: r.name }))}
                    value={row.role ? String(row.role) : null}
                    onChange={(v) => updateRow(i, { role: Number(v) })}
                    w={150}
                    size="xs"
                    searchable
                  />
                  <Select
                    label={t.music.selectVolunteer}
                    placeholder={t.music.selectVolunteer}
                    data={volunteers.map((v) => ({ value: String(v.id), label: v.name }))}
                    value={row.user ? String(row.user) : null}
                    onChange={(v) => updateRow(i, { user: Number(v) })}
                    w={180}
                    size="xs"
                    searchable
                  />
                  <Select
                    label="Status"
                    data={[
                      { value: 'PENDING', label: 'Pendente' },
                      { value: 'CONFIRMED', label: 'Confirmado' },
                      { value: 'DECLINED', label: 'Recusado' },
                    ]}
                    value={row.status}
                    onChange={(v) => v && updateRow(i, { status: v as RosterAssignmentStatus })}
                    w={130}
                    size="xs"
                  />
                  <Tooltip label={t.common.delete}>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => removeRow(i)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              );
            })}
          </Stack>
        )}

        <Group justify="flex-end" mt="md">
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            loading={saving}
            onClick={save}
            disabled={!date}
          >
            {editing ? t.common.save : t.music.newRoster}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
