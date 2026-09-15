import React, { useCallback, useEffect, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Menu,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBrandWhatsapp,
  IconMusic,
  IconPencil,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import MobileItemCard from '../components/MobileItemCard';
import SetlistsModal from '../components/SetlistsModal';
import SetlistShareModal from '../components/SetlistShareModal';
import { useLanguage } from '../i18n';
import { useAuth, useRoleHelpers } from '../contexts/AuthContext';
import { musicApi } from '../api/music';
import type { Band, BandSetlist } from '../types';

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const PAGE_SIZE = 10;

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

function SetlistActions({
  setlist,
  canManage,
  onEdit,
  onShare,
  onDelete,
}: {
  setlist: BandSetlist;
  canManage: boolean;
  onEdit: (s: BandSetlist) => void;
  onShare: (s: BandSetlist) => void;
  onDelete: (s: BandSetlist) => void;
}) {
  const { t } = useLanguage();
  return (
    <Group gap={2} wrap="nowrap">
      <Tooltip label={t.music.setlistShare}>
        <ActionIcon variant="subtle" color="green" size="sm" onClick={() => onShare(setlist)}>
          <IconBrandWhatsapp size={14} />
        </ActionIcon>
      </Tooltip>
      {canManage ? (
        <>
          <Tooltip label={t.music.editSetlist}>
            <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => onEdit(setlist)}>
              <IconPencil size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t.common.delete}>
            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => onDelete(setlist)}>
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </>
      ) : null}
    </Group>
  );
}

export default function SetlistsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { canManageMusic } = useRoleHelpers(user);

  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [bandFilter, setBandFilter] = useState<string | null>(null);
  const [bands, setBands] = useState<Band[]>([]);
  const [setlists, setSetlists] = useState<BandSetlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BandSetlist | null>(null);
  const [shareSetlist, setShareSetlist] = useState<BandSetlist | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSetlists(
        await musicApi.bandSetlists({
          month,
          band: bandFilter ? Number(bandFilter) : undefined,
        }),
      );
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao carregar setlists.' });
    } finally {
      setLoading(false);
    }
  }, [month, bandFilter]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    void musicApi.bands().then(setBands).catch(() => setBands([]));
  }, []);

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

  const pageItems = setlists.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (s: BandSetlist) => {
    setEditing(s);
    setModalOpen(true);
  };

  const remove = async (s: BandSetlist) => {
    if (!window.confirm(t.music.deleteSetlistBody)) return;
    try {
      await musicApi.deleteBandSetlist(s.id);
      notifications.show({ color: 'green', message: t.music.setlistDeleted });
      void load();
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao excluir setlist.' });
    }
  };

  return (
    <AuthGuard roles={['PASTOR', 'SECRETARIA', 'LOUVOR', 'MUSICO']}>
      <Layout>
        <PageHeader title={t.music.setlistsTitle} description={t.music.setlistsSubtitle}>
          <Group gap="sm">
            <Select
              value={month}
              onChange={(v) => {
                if (v) {
                  setMonth(v);
                  setPage(1);
                }
              }}
              data={monthOptions}
              w={220}
              size="sm"
            />
            <Select
              placeholder={t.music.selectBand}
              data={bands.map((b) => ({ value: String(b.id), label: b.name }))}
              value={bandFilter}
              onChange={(v) => {
                setBandFilter(v);
                setPage(1);
              }}
              clearable
              searchable
              w={200}
              size="sm"
            />
            {canManageMusic ? (
              <Button leftSection={<IconPlus size={16} />} onClick={openNew} size="sm">
                {t.music.newSetlist}
              </Button>
            ) : null}
          </Group>
        </PageHeader>

        {loading ? (
          <Center py="xl"><Loader /></Center>
        ) : setlists.length === 0 ? (
          <Card withBorder p="xl">
            <Text c="dimmed">{t.music.noSetlists}</Text>
          </Card>
        ) : (
          <>
            <Box visibleFrom="lg">
              <Paper withBorder>
                <Table highlightOnHover verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t.music.setlistDate}</Table.Th>
                      <Table.Th>{t.music.setlistDescription}</Table.Th>
                      <Table.Th>{t.music.setlistTheme}</Table.Th>
                      <Table.Th>{t.music.setlistBand}</Table.Th>
                      <Table.Th>{t.music.setlistSongs}</Table.Th>
                      <Table.Th>{t.music.setlistCreatedBy}</Table.Th>
                      <Table.Th></Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {pageItems.map((s) => (
                      <Table.Tr key={s.id}>
                        <Table.Td>
                          <Text size="sm" fw={600}>{formatDateLabel(s.date)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{s.description}</Text>
                          {s.items.length > 0 ? (
                            <Stack gap={2} mt={4}>
                              {s.items.slice(0, 3).map((it) => (
                                <Text key={it.id} size="xs" c="dimmed" truncate>
                                  {it.order}. {it.song_title}
                                  {it.custom_key ? <Text span c="grape"> ({it.custom_key})</Text> : ''}
                                </Text>
                              ))}
                              {s.items.length > 3 ? (
                                <Text size="xs" c="dimmed">+{s.items.length - 3} {t.music.songCountLabel}</Text>
                              ) : null}
                            </Stack>
                          ) : null}
                        </Table.Td>
                        <Table.Td>
                          {s.theme ? <Badge variant="light">{s.theme}</Badge> : <Text c="dimmed">—</Text>}
                        </Table.Td>
                        <Table.Td>
                          {s.band_name ? (
                            <Badge variant="dot" color={s.band_color}>{s.band_name}</Badge>
                          ) : (
                            <Text c="dimmed">—</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4}>
                            <IconMusic size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                            <Text size="sm">{s.items.length} {t.music.songCountLabel}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{s.created_by_name || '—'}</Text>
                        </Table.Td>
                        <Table.Td w={110}>
                          <SetlistActions
                            setlist={s}
                            canManage={!!canManageMusic}
                            onEdit={openEdit}
                            onShare={setShareSetlist}
                            onDelete={(x) => void remove(x)}
                          />
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
            </Box>

            <Stack hiddenFrom="lg" gap="xs" p="sm">
              {pageItems.map((s) => (
                <MobileItemCard
                  key={s.id}
                  media={
                    <Badge
                      variant="light"
                      size="lg"
                      radius="sm"
                      w={56}
                      style={{ textAlign: 'center' }}
                    >
                      {Number(s.date.split('-')[2])}
                    </Badge>
                  }
                  actions={
                    <>
                      <Menu.Item
                        leftSection={<IconBrandWhatsapp size={16} />}
                        onClick={() => setShareSetlist(s)}
                      >
                        {t.music.setlistShare}
                      </Menu.Item>
                      {canManageMusic ? (
                        <>
                          <Menu.Item
                            leftSection={<IconPencil size={16} />}
                            onClick={() => openEdit(s)}
                          >
                            {t.music.editSetlist}
                          </Menu.Item>
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={16} />}
                            onClick={() => void remove(s)}
                          >
                            {t.common.delete}
                          </Menu.Item>
                        </>
                      ) : null}
                    </>
                  }
                >
                  <Stack gap={4}>
                    <Text fw={600} truncate>{s.description}</Text>
                    <Text size="xs" c="dimmed">{formatDateLabel(s.date)}</Text>
                    <Group gap={4}>
                      {s.theme ? <Badge variant="light" size="sm">{s.theme}</Badge> : null}
                      {s.band_name ? (
                        <Badge variant="dot" color={s.band_color} size="sm">{s.band_name}</Badge>
                      ) : null}
                    </Group>
                    <Stack gap={2}>
                      {[...s.items].sort((a, b) => a.order - b.order).slice(0, 3).map((it) => (
                        <Text key={it.id} size="xs" c="dimmed" truncate>
                          {it.order}. {it.song_title}
                          {it.custom_key ? <Text span c="grape"> ({it.custom_key})</Text> : ''}
                        </Text>
                      ))}
                      {s.items.length > 3 ? (
                        <Text size="xs" c="dimmed">+{s.items.length - 3} {t.music.songCountLabel}</Text>
                      ) : null}
                    </Stack>
                    <Text size="xs" c="dimmed">{t.music.setlistCreatedBy}: {s.created_by_name || '—'}</Text>
                  </Stack>
                </MobileItemCard>
              ))}
            </Stack>

            {setlists.length > PAGE_SIZE && (
              <Group justify="center" py="sm">
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={Math.max(1, Math.ceil(setlists.length / PAGE_SIZE))}
                  size="sm"
                />
              </Group>
            )}
          </>
        )}

        <SetlistsModal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          editing={editing}
          onSaved={() => void load()}
        />

        <SetlistShareModal
          setlist={shareSetlist}
          onClose={() => setShareSetlist(null)}
        />
      </Layout>
    </AuthGuard>
  );
}