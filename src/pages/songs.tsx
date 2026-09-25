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
  TextInput,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBrandYoutube,
  IconMusic,
  IconPencil,
  IconPlayerPlay,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { useRouter } from 'next/router';
import PageHeader from '../components/PageHeader';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import MobileItemCard from '../components/MobileItemCard';
import SongModal from '../components/SongModal';
import BandModal from '../components/BandModal';
import SongChordStatusBadge, { isChordReady } from '../components/SongChordStatusBadge';
import { useLanguage } from '../i18n';
import { useAuth, useRoleHelpers } from '../contexts/AuthContext';
import { musicApi } from '../api/music';
import { formatMusicalKey } from '../utils/format';
import type { Band, Song } from '../types';

const MUSICAL_KEYS = [
  'C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B',
];

const PAGE_SIZES = [10, 25, 50, 100];

const ORDERING_OPTIONS = [
  { value: 'random', translationKey: 'orderRandom' },
  { value: 'times_played', translationKey: 'orderMostPlayed' },
  { value: '-times_played', translationKey: 'orderLeastPlayed' },
  { value: 'band', translationKey: 'orderBandAsc' },
  { value: '-band', translationKey: 'orderBandDesc' },
  { value: 'artist', translationKey: 'orderArtistAsc' },
  { value: '-artist', translationKey: 'orderArtistDesc' },
  { value: 'title', translationKey: 'orderTitleAsc' },
  { value: '-title', translationKey: 'orderTitleDesc' },
] as const;

function SongActions({
  song,
  canEdit,
  onPlay,
  onEdit,
  onDelete,
}: {
  song: Song;
  canEdit: boolean;
  onPlay: (s: Song) => void;
  onEdit: (s: Song) => void;
  onDelete: (s: Song) => void;
}) {
  const { t } = useLanguage();
  const ready = isChordReady(song.chord_status);
  return (
    <Group gap={2} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
      {ready ? (
        <Tooltip label={t.music.playerGo}>
          <ActionIcon variant="subtle" color="blue" size="sm" onClick={() => onPlay(song)}>
            <IconPlayerPlay size={15} />
          </ActionIcon>
        </Tooltip>
      ) : null}
      {canEdit ? (
        <>
          <Tooltip label={t.music.editSong}>
            <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => onEdit(song)}>
              <IconPencil size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t.common.delete}>
            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => onDelete(song)}>
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </>
      ) : null}
    </Group>
  );
}

export default function SongsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user } = useAuth();
  const { canManageMusic, canViewMusic } = useRoleHelpers(user);

  const [songs, setSongs] = useState<Song[]>([]);
  const [total, setTotal] = useState(0);
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [keyFilter, setKeyFilter] = useState<string | null>(null);
  const [bandFilter, setBandFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [ordering, setOrdering] = useState('random');
  const [modalOpen, setModalOpen] = useState(false);
  const [bandsOpen, setBandsOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(q), 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await musicApi.songsPage({
        page,
        page_size: pageSize,
        ordering,
        q: searchTerm || undefined,
        key: keyFilter || undefined,
        band: bandFilter ? Number(bandFilter) : undefined,
      });
      setSongs(res.results);
      setTotal(res.count);
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao carregar repertório.' });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, keyFilter, bandFilter, page, pageSize, ordering]);

  const loadBands = useCallback(async () => {
    try {
      setBands(await musicApi.bands());
    } catch {
      setBands([]);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    void loadBands();
  }, [loadBands]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  useEffect(() => {
    if (total > 0 && page > totalPages) setPage(totalPages);
  }, [total, totalPages, page]);

  const openAdd = () => {
    setEditingSong(null);
    setModalOpen(true);
  };

  const openEdit = (s: Song) => {
    if (!s.can_edit) {
      notifications.show({ color: 'red', message: t.music.editForbidden });
      return;
    }
    setEditingSong(s);
    setModalOpen(true);
  };

  const play = (s: Song) => {
    void router.push(`/songs/${s.id}`);
  };

  const removeSong = async (s: Song) => {
    if (!window.confirm(`Excluir "${s.title}"?`)) return;
    try {
      await musicApi.deleteSong(s.id);
      notifications.show({ color: 'green', message: 'Música excluída.' });
      void load();
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao excluir música.' });
    }
  };

  return (
    <AuthGuard roles={['PASTOR', 'SECRETARIA', 'LOUVOR', 'MUSICO']}>
      <Layout>
        <PageHeader title={t.music.songsTitle} description={t.music.songsSubtitle}>
          <Group gap="sm">
            {canManageMusic ? (
              <Button variant="light" onClick={() => setBandsOpen(true)} size="sm">
                {t.music.bandManage}
              </Button>
            ) : null}
            {canViewMusic ? (
              <Button leftSection={<IconPlus size={18} />} onClick={openAdd} size="sm">
                {t.music.addSong}
              </Button>
            ) : null}
          </Group>
        </PageHeader>

        <Group mb="md" gap="sm">
          <TextInput
            placeholder={t.music.songSearchPlaceholder}
            value={q}
            onChange={(e) => {
              setQ(e.currentTarget.value);
              setPage(1);
            }}
            leftSection={<IconSearch size={16} />}
            style={{ flex: 1, maxWidth: 320 }}
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
          />
          <Select
            placeholder={t.music.churchKeyLabel}
            data={MUSICAL_KEYS}
            value={keyFilter}
            onChange={(v) => {
              setKeyFilter(v);
              setPage(1);
            }}
            clearable
            w={120}
          />
          <Select
            aria-label={t.music.orderByLabel}
            data={ORDERING_OPTIONS.map((o) => ({ value: o.value, label: t.music[o.translationKey] }))}
            value={ordering}
            onChange={(v) => {
              if (v) {
                setOrdering(v);
                setPage(1);
              }
            }}
            w={200}
          />
          <Select
            aria-label={t.music.perPageLabel}
            data={PAGE_SIZES.map((n) => ({ value: String(n), label: `${n}` }))}
            value={String(pageSize)}
            onChange={(v) => {
              if (v) {
                setPageSize(Number(v));
                setPage(1);
              }
            }}
            w={110}
          />
        </Group>

        {loading ? (
          <Center py="xl"><Loader /></Center>
        ) : songs.length === 0 ? (
          <Card withBorder p="xl">
            <Text c="dimmed">{t.music.noSongs}</Text>
          </Card>
        ) : (
          <>
            <Box visibleFrom="lg">
              <Paper withBorder>
                <Table highlightOnHover verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th></Table.Th>
                      <Table.Th>{t.music.songTitleLabel}</Table.Th>
                      <Table.Th>{t.music.songArtistLabel}</Table.Th>
                      <Table.Th>{t.music.churchKeyLabel}</Table.Th>
                      <Table.Th>{t.music.bpmLabel}</Table.Th>
                      <Table.Th>{t.music.timesPlayed}</Table.Th>
                      <Table.Th></Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {songs.map((s) => (
                      <Table.Tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/songs/${s.id}`)}>
                        <Table.Td w={48}>
                          {s.thumbnail_url ? (
                            <Box
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 6,
                                overflow: 'hidden',
                                backgroundColor: 'var(--mantine-color-gray-2)',
                              }}
                            >
                              <img src={s.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </Box>
                          ) : (
                            <IconMusic size={24} style={{ color: 'var(--mantine-color-dimmed)' }} />
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Group gap={6}>
                            <Text fw={600} size="sm">{s.title}</Text>
                            {s.created_by === user?.id ? (
                              <Badge variant="light" color="teal" size="xs">{t.music.mySong}</Badge>
                            ) : null}
                          </Group>
                          <Text size="xs" c="dimmed">{s.tags}</Text>
                          <Group gap={6} mt={4}>
                            {s.band_name ? (
                              <Badge variant="dot" color={s.band_color}>{s.band_name}</Badge>
                            ) : null}
                            <SongChordStatusBadge status={s.chord_status} detail={s.chord_error || undefined} />
                          </Group>
                          {s.created_by_name ? (
                            <Text size="xs" c="dimmed">{t.music.createdByLabel}: {s.created_by_name}</Text>
                          ) : null}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{s.artist}</Text>
                        </Table.Td>
                        <Table.Td>
                          {s.church_key ? <Badge variant="light" color="violet">{formatMusicalKey(s.church_key)}</Badge> : null}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{s.bpm ?? '—'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{s.times_played}</Text>
                        </Table.Td>
                        <Table.Td w={110}>
                          <SongActions
                            song={s}
                            canEdit={!!s.can_edit}
                            onPlay={play}
                            onEdit={openEdit}
                            onDelete={(x) => void removeSong(x)}
                          />
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
            </Box>

            <Stack hiddenFrom="lg" gap="xs" p="sm">
              {songs.map((s) => (
                <MobileItemCard
                  key={s.id}
                  media={
                    s.thumbnail_url ? (
                      <Box
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 8,
                          overflow: 'hidden',
                          backgroundColor: 'var(--mantine-color-gray-2)',
                          position: 'relative',
                        }}
                      >
                        <img src={s.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {isChordReady(s.chord_status) ? (
                          <ActionIcon
                            variant="filled"
                            color="blue"
                            size="sm"
                            radius="xl"
                            style={{ position: 'absolute', right: 2, bottom: 2 }}
                            onClick={() => play(s)}
                          >
                            <IconPlayerPlay size={12} />
                          </ActionIcon>
                        ) : null}
                      </Box>
                    ) : (
                      <IconMusic size={24} style={{ color: 'var(--mantine-color-dimmed)' }} />
                    )
                  }
                  actions={
                    <>
                      {isChordReady(s.chord_status) ? (
                        <Menu.Item
                          leftSection={<IconPlayerPlay size={16} />}
                          onClick={() => play(s)}
                        >
                          {t.music.playerGo}
                        </Menu.Item>
                      ) : null}
                      {s.can_edit ? (
                        <>
                          <Menu.Item
                            leftSection={<IconPencil size={16} />}
                            onClick={() => openEdit(s)}
                          >
                            {t.music.editSong}
                          </Menu.Item>
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={16} />}
                            onClick={() => void removeSong(s)}
                          >
                            {t.common.delete}
                          </Menu.Item>
                        </>
                      ) : null}
                    </>
                  }
                >
                  <Stack gap={4}>
                    <Group gap={6}>
                      <Text fw={600} truncate>{s.title}</Text>
                      {s.created_by === user?.id ? (
                        <Badge variant="light" color="teal" size="xs">{t.music.mySong}</Badge>
                      ) : null}
                    </Group>
                    <Text size="xs" c="dimmed" truncate>{s.artist || '—'}</Text>
                    <Group gap={4}>
                      {s.church_key ? <Badge variant="light" color="violet" size="sm">{formatMusicalKey(s.church_key)}</Badge> : null}
                      <Badge variant="light" size="sm">{t.music.bpmLabel}: {s.bpm ?? '—'}</Badge>
                      <Badge variant="light" size="sm">{t.music.timesPlayed}: {s.times_played}</Badge>
                      <SongChordStatusBadge status={s.chord_status} detail={s.chord_error || undefined} size="sm" />
                    </Group>
                    {s.tags ? <Text size="xs" c="dimmed" truncate>{s.tags}</Text> : null}
                    {s.band_name ? (
                      <Badge variant="dot" color={s.band_color} size="sm" style={{ width: 'fit-content' }}>
                        {s.band_name}
                      </Badge>
                    ) : null}
                  </Stack>
                </MobileItemCard>
              ))}
            </Stack>

            {songs.length > 0 && (
              <Group justify="space-between" align="center" py="sm" px="md" wrap="wrap">
                <Text size="sm" c="dimmed">
                  {total > 0
                    ? t.music.showingRange
                        .replace('{start}', String(rangeStart))
                        .replace('{end}', String(rangeEnd))
                        .replace('{total}', String(total))
                        .replace('{page}', String(page))
                        .replace('{totalPages}', String(totalPages))
                    : ''}
                </Text>
                {total > pageSize && (
                  <Pagination
                    value={page}
                    onChange={setPage}
                    total={totalPages}
                    size="sm"
                  />
                )}
              </Group>
            )}
          </>
        )}

        <SongModal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          editing={editingSong}
          onSaved={() => void load()}
        />

        <BandModal
          opened={bandsOpen}
          onClose={() => setBandsOpen(false)}
        />
      </Layout>
    </AuthGuard>
  );
}