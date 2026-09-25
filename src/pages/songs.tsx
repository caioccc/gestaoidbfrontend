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
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBrandYoutube,
  IconDotsVertical,
  IconEye,
  IconHistory,
  IconLayoutGrid,
  IconList,
  IconMusic,
  IconPencil,
  IconPlayerPlay,
  IconPlus,
  IconSearch,
  IconTable,
  IconTrash,
} from '@tabler/icons-react';
import { useRouter } from 'next/router';
import PageHeader from '../components/PageHeader';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import SongModal from '../components/SongModal';
import BandModal from '../components/BandModal';
import SongChordStatusBadge, { isChordReady } from '../components/SongChordStatusBadge';
import { useLanguage } from '../i18n';
import { useAuth, useRoleHelpers } from '../contexts/AuthContext';
import { musicApi } from '../api/music';
import { formatMusicalKey } from '../utils/format';
import type { Band, Song } from '../types';

type ViewMode = 'gallery' | 'list' | 'table';

type SongActionCallbacks = {
  onPlay: (song: Song) => void;
  onHistory: (song: Song) => void;
  onEdit: (song: Song) => void;
  onDelete: (song: Song) => void;
};

const VIEW_MODE_STORAGE_KEY = 'gestao_idb_songs_view_mode';

const MUSICAL_KEYS = [
  'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
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

function isViewMode(value: string | null): value is ViewMode {
  return value === 'gallery' || value === 'list' || value === 'table';
}

function SongThumbnail({ song, height }: { song: Song; height: number }) {
  return (
    <Box
      style={{
        width: '100%',
        height,
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-grape-6))',
      }}
    >
      {song.thumbnail_url ? (
        <img
          src={song.thumbnail_url}
          alt={`Capa de ${song.title}`}
          loading="lazy"
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Center h="100%">
          <IconMusic size={42} color="white" style={{ opacity: 0.85 }} />
        </Center>
      )}
    </Box>
  );
}

function SongKeyBadges({ song, size = 'sm' }: { song: Song; size?: 'xs' | 'sm' }) {
  const { t } = useLanguage();

  return (
    <Group gap={4} wrap="wrap">
      <Badge color="blue" variant="light" size={size}>
        {t.music.churchKeyShort}: {song.church_key ? formatMusicalKey(song.church_key) : '—'}
      </Badge>
      <Badge color="orange" variant="light" size={size}>
        {t.music.originalKeyShort}: {song.original_key ? formatMusicalKey(song.original_key) : '—'}
      </Badge>
      <Badge color="gray" variant="outline" size={size}>
        {song.bpm ?? '—'} {t.music.bpmLabel}
      </Badge>
    </Group>
  );
}

function SongActionMenu({ song, onHistory, onEdit, onDelete }: {
  song: Song;
} & Omit<SongActionCallbacks, 'onPlay'>) {
  const { t } = useLanguage();

  return (
    <Box onClick={(event) => event.stopPropagation()}>
      <Menu shadow="md" position="bottom-end">
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t.common.actions}>
            <IconDotsVertical size={16} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {song.can_edit ? (
            <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => onEdit(song)}>
              {t.music.editSong}
            </Menu.Item>
          ) : null}
          <Menu.Item leftSection={<IconHistory size={16} />} onClick={() => onHistory(song)}>
            {t.music.executionHistory}
          </Menu.Item>
          {song.can_edit ? (
            <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => onDelete(song)}>
              {t.common.delete}
            </Menu.Item>
          ) : null}
        </Menu.Dropdown>
      </Menu>
    </Box>
  );
}

function SongTableActions({ song, onPlay, onEdit, onDelete }: {
  song: Song;
} & Omit<SongActionCallbacks, 'onHistory'>) {
  const { t } = useLanguage();
  const ready = isChordReady(song.chord_status);

  return (
    <Group gap={2} wrap="nowrap" onClick={(event) => event.stopPropagation()}>
      {ready ? (
        <Tooltip label={t.music.playerGo}>
          <ActionIcon variant="subtle" color="blue" size="sm" onClick={() => onPlay(song)}>
            <IconPlayerPlay size={15} />
          </ActionIcon>
        </Tooltip>
      ) : null}
      {song.can_edit ? (
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

function SongGalleryView({
  songs,
  userId,
  onOpen,
  onHistory,
  onEdit,
  onDelete,
}: {
  songs: Song[];
  userId?: number;
  onOpen: (song: Song) => void;
} & Omit<SongActionCallbacks, 'onPlay'>) {
  const { t } = useLanguage();

  return (
    <SimpleGrid cols={{ base: 1, xs: 1, sm: 2, md: 3, lg: 4, xl: 6 }} spacing="md">
      {songs.map((song) => (
        <Card
          key={song.id}
          withBorder
          radius="md"
          padding={0}
          onClick={isChordReady(song.chord_status) ? () => onOpen(song) : undefined}
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            cursor: isChordReady(song.chord_status) ? 'pointer' : 'default',
          }}
        >
          <Card.Section style={{ height: 170, overflow: 'hidden', position: 'relative' }}>
            <Box
              component="button"
              type="button"
              disabled={!isChordReady(song.chord_status)}
              aria-label={isChordReady(song.chord_status) ? t.music.playerGo : undefined}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                if (isChordReady(song.chord_status)) onOpen(song);
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: 0,
                border: 0,
                background: 'transparent',
                cursor: isChordReady(song.chord_status) ? 'pointer' : 'default',
              }}
            >
              <SongThumbnail song={song} height={170} />
            </Box>
            {isChordReady(song.chord_status) ? (
              <Box
                pos="absolute"
                inset={0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <Center
                  w={46}
                  h={46}
                  style={{ borderRadius: '50%', background: 'rgba(0, 0, 0, 0.55)', color: 'white' }}
                >
                  <IconPlayerPlay size={22} />
                </Center>
              </Box>
            ) : null}
          </Card.Section>
          <Stack gap="sm" p="md" style={{ flex: 1 }}>
            <Stack gap={4}>
              <Group gap={6} wrap="wrap">
                <Text fw={600} lineClamp={2}>{song.title}</Text>
                {song.created_by === userId ? (
                  <Badge variant="light" color="teal" size="xs">{t.music.mySong}</Badge>
                ) : null}
              </Group>
              <Text size="sm" c="dimmed" lineClamp={1}>{song.artist || '—'}</Text>
            </Stack>
            <SongKeyBadges song={song} size="xs" />
            <Group gap={4} wrap="wrap">
              {song.band_name ? (
                <Badge variant="dot" color={song.band_color} size="xs">{song.band_name}</Badge>
              ) : null}
              <SongChordStatusBadge
                status={song.chord_status}
                detail={song.chord_error || undefined}
                size="xs"
              />
            </Group>
            {song.tags ? <Text size="xs" c="dimmed" lineClamp={1}>{song.tags}</Text> : null}
          </Stack>
          <Group
            justify="space-between"
            align="center"
            wrap="nowrap"
            p="sm"
            style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
          >
            <Group gap={4} wrap="nowrap">
              <Tooltip label={t.music.viewStudy}>
                <ActionIcon
                  variant="light"
                  color="blue"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(song);
                  }}
                >
                  <IconEye size={16} />
                </ActionIcon>
              </Tooltip>
              {song.youtube_id ? (
                <Tooltip label={t.music.openYoutube}>
                  <ActionIcon
                    component="a"
                    href={`https://www.youtube.com/watch?v=${song.youtube_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="light"
                    color="red"
                    size="sm"
                    aria-label={t.music.openYoutube}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <IconBrandYoutube size={17} />
                  </ActionIcon>
                </Tooltip>
              ) : null}
            </Group>
            <SongActionMenu song={song} onHistory={onHistory} onEdit={onEdit} onDelete={onDelete} />
          </Group>
        </Card>
      ))}
    </SimpleGrid>
  );
}

function SongListView({ songs, userId, onPlay, onHistory, onEdit, onDelete }: {
  songs: Song[];
  userId?: number;
} & SongActionCallbacks) {
  const { t } = useLanguage();

  return (
    <Stack gap="xs">
      {songs.map((song) => (
        <Paper
          key={song.id}
          withBorder
          radius="md"
          p="sm"
          onClick={isChordReady(song.chord_status) ? () => onPlay(song) : undefined}
          style={{ cursor: isChordReady(song.chord_status) ? 'pointer' : 'default' }}
        >
          <Group align="center" gap="sm" wrap="nowrap">
            <Box w={104} style={{ flexShrink: 0, borderRadius: 8, overflow: 'hidden' }}>
              <Box
                component="button"
                type="button"
                disabled={!isChordReady(song.chord_status)}
                aria-label={isChordReady(song.chord_status) ? t.music.playerGo : undefined}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation();
                  if (isChordReady(song.chord_status)) onPlay(song);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: 0,
                  border: 0,
                  background: 'transparent',
                  cursor: isChordReady(song.chord_status) ? 'pointer' : 'default',
                }}
              >
                <SongThumbnail song={song} height={59} />
              </Box>
            </Box>
            <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
              <Group gap={6} wrap="wrap">
                <Text fw={600} lineClamp={1}>{song.title}</Text>
                {song.created_by === userId ? (
                  <Badge variant="light" color="teal" size="xs">{t.music.mySong}</Badge>
                ) : null}
                <Text size="sm" c="dimmed" lineClamp={1}>{song.artist || '—'}</Text>
              </Group>
              <SongKeyBadges song={song} size="xs" />
              <Group gap={4} wrap="wrap">
                {song.band_name ? (
                  <Badge variant="dot" color={song.band_color} size="xs">{song.band_name}</Badge>
                ) : null}
                <SongChordStatusBadge
                  status={song.chord_status}
                  detail={song.chord_error || undefined}
                  size="xs"
                />
                {song.tags ? <Text size="xs" c="dimmed" lineClamp={1}>{song.tags}</Text> : null}
              </Group>
            </Stack>
            <Stack gap={4} align="flex-end" style={{ flexShrink: 0 }}>
              <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                {t.music.playedTimes.replace('{count}', String(song.times_played))}
              </Text>
              <Group gap={4} wrap="nowrap">
                {isChordReady(song.chord_status) ? (
                  <Tooltip label={t.music.playerGo}>
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        onPlay(song);
                      }}
                    >
                      <IconPlayerPlay size={15} />
                    </ActionIcon>
                  </Tooltip>
                ) : null}
                <SongActionMenu song={song} onHistory={onHistory} onEdit={onEdit} onDelete={onDelete} />
              </Group>
            </Stack>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}

function SongTableView({
  songs,
  userId,
  onOpen,
  onPlay,
  onEdit,
  onDelete,
}: {
  songs: Song[];
  userId?: number;
  onOpen: (song: Song) => void;
} & Omit<SongActionCallbacks, 'onHistory'>) {
  const { t } = useLanguage();

  return (
    <Paper withBorder style={{ overflow: 'hidden' }}>
      <Table.ScrollContainer minWidth={800}>
        <Table highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th />
              <Table.Th>{t.music.songTitleLabel}</Table.Th>
              <Table.Th>{t.music.songArtistLabel}</Table.Th>
              <Table.Th>{t.music.churchKeyLabel}</Table.Th>
              <Table.Th>{t.music.bpmLabel}</Table.Th>
              <Table.Th>{t.music.timesPlayed}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {songs.map((song) => (
              <Table.Tr
                key={song.id}
                style={{ cursor: 'pointer' }}
                onClick={() => onOpen(song)}
              >
                <Table.Td w={48}>
                  {song.thumbnail_url ? (
                    <Box
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 6,
                        overflow: 'hidden',
                        backgroundColor: 'var(--mantine-color-gray-2)',
                      }}
                    >
                      <img
                        src={song.thumbnail_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </Box>
                  ) : (
                    <IconMusic size={24} style={{ color: 'var(--mantine-color-dimmed)' }} />
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap={6}>
                    <Text fw={600} size="sm">{song.title}</Text>
                    {song.created_by === userId ? (
                      <Badge variant="light" color="teal" size="xs">{t.music.mySong}</Badge>
                    ) : null}
                  </Group>
                  <Text size="xs" c="dimmed">{song.tags}</Text>
                  <Group gap={6} mt={4}>
                    {song.band_name ? (
                      <Badge variant="dot" color={song.band_color}>{song.band_name}</Badge>
                    ) : null}
                    <SongChordStatusBadge
                      status={song.chord_status}
                      detail={song.chord_error || undefined}
                    />
                  </Group>
                  {song.created_by_name ? (
                    <Text size="xs" c="dimmed">
                      {t.music.createdByLabel}: {song.created_by_name}
                    </Text>
                  ) : null}
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{song.artist}</Text>
                </Table.Td>
                <Table.Td>
                  {song.church_key ? (
                    <Badge variant="light" color="violet">{formatMusicalKey(song.church_key)}</Badge>
                  ) : null}
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{song.bpm ?? '—'}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{song.times_played}</Text>
                </Table.Td>
                <Table.Td w={110}>
                  <SongTableActions
                    song={song}
                    onPlay={onPlay}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
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
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [modalOpen, setModalOpen] = useState(false);
  const [bandsOpen, setBandsOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(q), 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    try {
      const storedViewMode = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (isViewMode(storedViewMode)) {
        setViewMode(storedViewMode);
      } else {
        window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, 'gallery');
      }
    } catch {
      setViewMode('gallery');
    }
  }, []);

  const changeViewMode = (value: string) => {
    if (!isViewMode(value)) return;
    setViewMode(value);
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, value);
    } catch {
      return;
    }
  };

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

  const openEdit = (song: Song) => {
    if (!song.can_edit) {
      notifications.show({ color: 'red', message: t.music.editForbidden });
      return;
    }
    setEditingSong(song);
    setModalOpen(true);
  };

  const openSong = (song: Song) => {
    void router.push(`/songs/${song.id}`);
  };

  const openHistory = (song: Song) => {
    void router.push({
      pathname: '/songs/[id]',
      query: { id: String(song.id), tab: 'history' },
    });
  };

  const removeSong = async (song: Song) => {
    if (!song.can_edit) {
      notifications.show({ color: 'red', message: t.music.editForbidden });
      return;
    }
    if (!window.confirm(`Excluir "${song.title}"?`)) return;
    try {
      await musicApi.deleteSong(song.id);
      notifications.show({ color: 'green', message: 'Música excluída.' });
      void load();
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao excluir música.' });
    }
  };

  const deleteSongAction = (song: Song) => {
    void removeSong(song);
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

        <Group mb="md" gap="sm" justify="space-between" wrap="wrap">
          <Group gap="sm" wrap="wrap" style={{ flex: '1 1 680px' }}>
            <TextInput
              placeholder={t.music.songSearchPlaceholder}
              value={q}
              onChange={(event) => {
                setQ(event.currentTarget.value);
                setPage(1);
              }}
              leftSection={<IconSearch size={16} />}
              style={{ flex: '1 1 240px', maxWidth: 320 }}
            />
            <Select
              placeholder={t.music.selectBand}
              data={bands.map((band) => ({ value: String(band.id), label: band.name }))}
              value={bandFilter}
              onChange={(value) => {
                setBandFilter(value);
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
              onChange={(value) => {
                setKeyFilter(value);
                setPage(1);
              }}
              clearable
              w={120}
            />
            <Select
              aria-label={t.music.orderByLabel}
              data={ORDERING_OPTIONS.map((option) => ({
                value: option.value,
                label: t.music[option.translationKey],
              }))}
              value={ordering}
              onChange={(value) => {
                if (value) {
                  setOrdering(value);
                  setPage(1);
                }
              }}
              w={200}
            />
            <Select
              aria-label={t.music.perPageLabel}
              data={PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
              value={String(pageSize)}
              onChange={(value) => {
                if (value) {
                  setPageSize(Number(value));
                  setPage(1);
                }
              }}
              w={110}
            />
          </Group>
          <SegmentedControl
            aria-label={t.music.viewModeLabel}
            value={viewMode}
            onChange={changeViewMode}
            data={[
              {
                value: 'gallery',
                label: (
                  <Center style={{ gap: 6, whiteSpace: 'nowrap' }}>
                    <IconLayoutGrid size={16} />
                    <span>{t.music.galleryView}</span>
                  </Center>
                ),
              },
              {
                value: 'list',
                label: (
                  <Center style={{ gap: 6, whiteSpace: 'nowrap' }}>
                    <IconList size={16} />
                    <span>{t.music.cardsView}</span>
                  </Center>
                ),
              },
              {
                value: 'table',
                label: (
                  <Center style={{ gap: 6, whiteSpace: 'nowrap' }}>
                    <IconTable size={16} />
                    <span>{t.music.tableView}</span>
                  </Center>
                ),
              },
            ]}
            radius="md"
            size="sm"
            style={{ maxWidth: '100%' }}
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
            {viewMode === 'gallery' ? (
              <SongGalleryView
                songs={songs}
                userId={user?.id}
                onOpen={openSong}
                onHistory={openHistory}
                onEdit={openEdit}
                onDelete={deleteSongAction}
              />
            ) : null}

            {viewMode === 'list' ? (
              <SongListView
                songs={songs}
                userId={user?.id}
                onPlay={openSong}
                onHistory={openHistory}
                onEdit={openEdit}
                onDelete={deleteSongAction}
              />
            ) : null}

            {viewMode === 'table' ? (
              <SongTableView
                songs={songs}
                userId={user?.id}
                onOpen={openSong}
                onPlay={openSong}
                onEdit={openEdit}
                onDelete={deleteSongAction}
              />
            ) : null}

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
