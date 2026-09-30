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
  IconLock,
  IconMusic,
  IconNotebook,
  IconPencil,
  IconPlayerPlay,
  IconPlus,
  IconSearch,
  IconStack2,
  IconTable,
  IconTrash,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useRouter } from 'next/router';
import PageHeader from '../components/PageHeader';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import SongModal from '../components/SongModal';
import SongsBulkAddModal from '../components/SongsBulkAddModal';
import BandModal from '../components/BandModal';
import FilterDrawer from '../components/FilterDrawer';
import MobileListToolbar from '../components/MobileListToolbar';
import SongChordStatusBadge, { chordStatusMeta, isChordReady } from '../components/SongChordStatusBadge';
import { useLanguage } from '../i18n';
import { useAuth, useRoleHelpers } from '../contexts/AuthContext';
import { musicApi } from '../api/music';
import { formatDuration, formatMusicalKey } from '../utils/format';
import galleryStyles from '../styles/songGallery.module.css';
import { useIsCompactList } from '../hooks/useListBreakpoint';
import type { Band, ChordStatus, Song, SongBandStat } from '../types';
import type { VisibilityFilter } from '../api/music';

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

/** Só entra no card quem ainda não tem cifra utilizável. COMPLETED e MANUAL
 *  são omitidos de propósito: nesses casos o Play já é o sinal. */
const GALLERY_STATUS_CLASS: Partial<Record<ChordStatus, string>> = {
  PENDING: galleryStyles.statusPending,
  PROCESSING: galleryStyles.statusProcessing,
  FAILED: galleryStyles.statusFailed,
};

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

const VISIBILITY_OPTIONS = [
  { value: 'all', translationKey: 'visibilityAll' },
  { value: 'public', translationKey: 'visibilityPublic' },
  { value: 'private', translationKey: 'visibilityPrivate' },
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

function SongVisibilityBadge({ isPrivate, size = 'xs' }: {
  isPrivate: boolean;
  size?: 'xs' | 'sm';
}) {
  const { t } = useLanguage();
  if (!isPrivate) return null;
  return (
    <Tooltip label={t.music.privateBadgeTip}>
      <Badge
        color="gray"
        variant="light"
        size={size}
        leftSection={<IconLock size={12} />}
        data-testid="song-visibility-badge"
      >
        {t.music.privateBadge}
      </Badge>
    </Tooltip>
  );
}

function bandLabel(stat: SongBandStat, noBandLabel: string) {
  return stat.band_name || noBandLabel;
}

/** "3x Alpha · 1x Sem banda" — substitui o antigo número agregado único. */
function SongBandStatsText({ stats, size = 'xs' }: {
  stats: SongBandStat[];
  size?: 'xs' | 'sm';
}) {
  const { t } = useLanguage();
  if (stats.length === 0) {
    return <Text size={size} c="dimmed">{t.music.noBandStats}</Text>;
  }
  return (
    <Text size={size} c="dimmed" style={{ whiteSpace: 'nowrap' }}>
      {stats
        .map((stat) => `${stat.times_played}× ${bandLabel(stat, t.music.noBandLabel)}`)
        .join(' · ')}
    </Text>
  );
}

function SongActionMenu({ song, onHistory, onEdit, onDelete, appearance = 'default' }: {
  song: Song;
  /** `overlay` usa o mesmo botão circular translúcido das ações da galeria. */
  appearance?: 'default' | 'overlay';
} & Omit<SongActionCallbacks, 'onPlay'>) {
  const { t } = useLanguage();
  const isOverlay = appearance === 'overlay';

  const target = isOverlay ? (
    <button type="button" className={galleryStyles.actionButton} aria-label={t.common.actions}>
      <IconDotsVertical size={17} />
    </button>
  ) : (
    <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t.common.actions}>
      <IconDotsVertical size={16} />
    </ActionIcon>
  );

  return (
    <Box onClick={(event) => event.stopPropagation()}>
      <Tooltip label={t.common.actions} position="left" withArrow disabled={!isOverlay}>
        <Menu shadow="md" position={isOverlay ? 'left' : 'bottom-end'}>
          <Menu.Target>
            {target}
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
      </Tooltip>
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
  const router = useRouter();

  return (
    <SimpleGrid cols={{ base: 1, xs: 1, sm: 2, md: 3, lg: 4, xl: 6 }} spacing="md">
      {songs.map((song) => {
        const ready = isChordReady(song.chord_status);
        const duration = formatDuration(song.duration_seconds);
        const key = song.church_key || song.original_key;
        const keyLabel = song.church_key
          ? t.music.churchKeyShort
          : t.music.originalKeyShort;
        const youtubeUrl = song.youtube_id
          ? `https://www.youtube.com/watch?v=${song.youtube_id}`
          : null;
        const statusMeta = ready ? null : chordStatusMeta(song.chord_status);
        const StatusIcon = statusMeta?.Icon;
        const statusLabel = statusMeta ? t.music[statusMeta.labelKey] : '';
        const statusClass = statusMeta
          ? GALLERY_STATUS_CLASS[song.chord_status as ChordStatus]
          : undefined;

        return (
          <Card
            key={song.id}
            withBorder
            radius="md"
            padding={0}
            className={`${galleryStyles.card} ${ready ? galleryStyles.cardInteractive : ''}`}
            onClick={ready ? () => onOpen(song) : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
              cursor: ready ? 'pointer' : 'default',
            }}
          >
            <div className={galleryStyles.mediaWrap}>
              <button
                type="button"
                className={galleryStyles.media}
                disabled={!ready}
                aria-label={ready ? t.music.viewStudy : undefined}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation();
                  if (ready) onOpen(song);
                }}
              >
                {song.thumbnail_url ? (
                  <img
                    className={galleryStyles.thumb}
                    src={song.thumbnail_url}
                    alt={`Capa de ${song.title}`}
                    loading="lazy"
                    draggable={false}
                  />
                ) : (
                  <span className={galleryStyles.fallback}>
                    <IconMusic size={42} color="white" style={{ opacity: 0.85 }} />
                  </span>
                )}

                {key ? (
                  <span className={galleryStyles.keyBadge}>
                    {keyLabel}: {formatMusicalKey(key)}
                  </span>
                ) : null}
                {song.band_name ? (
                  <span
                    className={galleryStyles.bandBadge}
                    style={song.band_color ? { backgroundColor: song.band_color } : undefined}
                  >
                    {song.band_name}
                  </span>
                ) : null}
                {song.is_private ? (
                  <span className={galleryStyles.lockBadge} title={t.music.privateBadgeTip}>
                    <IconLock size={12} />
                  </span>
                ) : null}
                {duration ? (
                  <span className={galleryStyles.duration}>{duration}</span>
                ) : null}

                {statusMeta && StatusIcon ? (
                  <span
                    className={`${galleryStyles.statusBadge} ${statusClass ?? ''}`}
                    title={
                      song.chord_error
                        ? `${statusLabel}: ${song.chord_error}`
                        : statusLabel
                    }
                  >
                    <StatusIcon size={12} />
                    {statusLabel}
                  </span>
                ) : null}

                {ready ? (
                  <span className={galleryStyles.overlay} aria-hidden="true">
                    <span className={galleryStyles.playButton}>
                      <IconPlayerPlay size={24} />
                    </span>
                  </span>
                ) : null}
              </button>

              <div className={galleryStyles.actions}>
                <Tooltip label={t.music.viewStudy} position="left" withArrow>
                  <button
                    type="button"
                    className={galleryStyles.actionButton}
                    aria-label={t.music.viewStudy}
                    disabled={!ready}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (ready) onOpen(song);
                    }}
                    style={ready ? undefined : { opacity: 0.4, cursor: 'not-allowed' }}
                  >
                    <IconEye size={17} />
                  </button>
                </Tooltip>

                <Tooltip label={t.music.lyricsLabel} position="left" withArrow>
                  <button
                    type="button"
                    className={galleryStyles.actionButton}
                    aria-label={t.music.lyricsLabel}
                    onClick={(event) => {
                      event.stopPropagation();
                      void router.push({
                        pathname: '/songs/[id]',
                        query: { id: String(song.id), tab: 'lyrics' },
                      });
                    }}
                  >
                    <IconNotebook size={17} />
                  </button>
                </Tooltip>

                {youtubeUrl ? (
                  <Tooltip label={t.music.openYoutube} position="left" withArrow>
                    <button
                      type="button"
                      className={galleryStyles.actionButton}
                      aria-label={t.music.openYoutube}
                      onClick={(event) => {
                        event.stopPropagation();
                        window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <IconBrandYoutube size={17} />
                    </button>
                  </Tooltip>
                ) : null}

                <SongActionMenu
                  song={song}
                  onHistory={onHistory}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  appearance="overlay"
                />
              </div>
            </div>

            <div className={galleryStyles.meta}>
              <span className={galleryStyles.title} title={song.title}>
                {song.title}
                {song.created_by === userId ? ` · ${t.music.mySong}` : ''}
              </span>
              <span className={galleryStyles.subtitle}>
                {[song.artist || '—', song.bpm ? `${song.bpm} ${t.music.bpmLabel}` : null]
                  .filter(Boolean)
                  .join(' • ')}
              </span>
            </div>
          </Card>
        );
      })}
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
                <SongVisibilityBadge isPrivate={song.is_private} size="xs" />
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
              <SongBandStatsText stats={song.band_stats} size="xs" />
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
              <Table.Th>{t.music.playedByBand}</Table.Th>
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
                    <SongVisibilityBadge isPrivate={song.is_private} size="xs" />
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
                  {song.band_stats.length === 0 ? (
                    <Text size="sm" c="dimmed">—</Text>
                  ) : (
                    <Stack gap={2}>
                      {song.band_stats.map((stat) => (
                        <Group key={stat.band ?? 'none'} gap={6} wrap="nowrap">
                          {stat.band ? (
                            <Badge variant="dot" color={stat.band_color} size="xs">
                              {bandLabel(stat, t.music.noBandLabel)}
                            </Badge>
                          ) : (
                            <Text size="xs" c="dimmed">{t.music.noBandLabel}</Text>
                          )}
                          <Text size="sm" fw={600}>{stat.times_played}×</Text>
                        </Group>
                      ))}
                    </Stack>
                  )}
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
  const { canManageMusic, canViewMusic, isAdmin } = useRoleHelpers(user);

  const [songs, setSongs] = useState<Song[]>([]);
  const [total, setTotal] = useState(0);
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [keyFilter, setKeyFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState('');
  const [bandFilter, setBandFilter] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<VisibilityFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [ordering, setOrdering] = useState('random');
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bandsOpen, setBandsOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isCompact = useIsCompactList();

  const filterCount =
    (bandFilter ? 1 : 0)
    + (keyFilter ? 1 : 0)
    + (tagFilter.trim() ? 1 : 0)
    + (visibility !== 'all' ? 1 : 0)
    + (ordering !== 'random' ? 1 : 0);

  const resetFilters = () => {
    setBandFilter(null);
    setKeyFilter(null);
    setTagFilter('');
    setVisibility('all');
    setOrdering('random');
    setPage(1);
  };

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
        tag: tagFilter.trim() || undefined,
        band: bandFilter ? Number(bandFilter) : undefined,
        visibility,
      });
      setSongs(res.results);
      setTotal(res.count);
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao carregar repertório.' });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, keyFilter, tagFilter, bandFilter, visibility, page, pageSize, ordering]);

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

  const viewModeData = [
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
  ];

  return (
    <AuthGuard roles={['PASTOR', 'SECRETARIA', 'LOUVOR', 'MUSICO']}>
      <Layout>
        <PageHeader title={t.music.songsTitle} description={t.music.songsSubtitle}>
          {isCompact ? (
            <MobileListToolbar
              searchValue={q}
              onSearchChange={(value) => {
                setQ(value);
                setPage(1);
              }}
              searchPlaceholder={t.music.songSearchPlaceholder}
              filtersLabel={t.common.filter}
              onOpenFilters={() => setFiltersOpen(true)}
              filterCount={filterCount}
              primary={
                canViewMusic ? (
                  <Tooltip label={t.music.addSong} withArrow>
                    <ActionIcon
                      variant="filled"
                      color="blue"
                      size="lg"
                      aria-label={t.music.addSong}
                      onClick={openAdd}
                      style={{ flexShrink: 0 }}
                    >
                      <IconPlus size={18} />
                    </ActionIcon>
                  </Tooltip>
                ) : null
              }
              menuChildren={
                <>
                  {canManageMusic ? (
                    <Menu.Item
                      leftSection={<IconUsersGroup size={15} />}
                      onClick={() => setBandsOpen(true)}
                    >
                      {t.music.bandManage}
                    </Menu.Item>
                  ) : null}
                  {isAdmin ? (
                    <Menu.Item
                      leftSection={<IconStack2 size={15} />}
                      onClick={() => setBulkOpen(true)}
                    >
                      {t.music.addSongsBulk}
                    </Menu.Item>
                  ) : null}
                </>
              }
              menuLabel={t.music.songsTitle}
              testId="songs-toolbar"
            />
          ) : (
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
              {isAdmin ? (
                <Button
                  variant="light"
                  leftSection={<IconStack2 size={18} />}
                  onClick={() => setBulkOpen(true)}
                  size="sm"
                  data-testid="songs-add-multiple"
                >
                  {t.music.addSongsBulk}
                </Button>
              ) : null}
            </Group>
          )}
        </PageHeader>

        {isCompact ? (
          <Box mb="md">
            <SegmentedControl
              aria-label={t.music.viewModeLabel}
              value={viewMode}
              onChange={changeViewMode}
              data={viewModeData}
              radius="md"
              size="sm"
              fullWidth
            />
          </Box>
        ) : (
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
              aria-label={t.music.visibilityLabel}
              leftSection={<IconLock size={15} />}
              data={VISIBILITY_OPTIONS.map((option) => ({
                value: option.value,
                label: t.music[option.translationKey],
              }))}
              value={visibility}
              onChange={(value) => {
                setVisibility((value as VisibilityFilter) ?? 'all');
                setPage(1);
              }}
              allowDeselect={false}
              w={160}
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
            data={viewModeData}
            radius="md"
            size="sm"
            style={{ maxWidth: '100%' }}
          />
        </Group>
        )}

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

        <FilterDrawer
          opened={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title={t.common.filter}
          clearLabel={t.common.clearFilters}
          clearDisabled={filterCount === 0}
          onClear={resetFilters}
          testId="songs-filters"
        >
          <Text size="sm" fw={500}>{t.music.visibilityLabel}</Text>
          <SegmentedControl
            fullWidth
            value={visibility}
            onChange={(value) => {
              setVisibility(value as VisibilityFilter);
              setPage(1);
            }}
            data={VISIBILITY_OPTIONS.map((option) => ({
              value: option.value,
              label: t.music[option.translationKey],
            }))}
          />
          <Select
            label={t.music.selectBand}
            data={bands.map((band) => ({ value: String(band.id), label: band.name }))}
            value={bandFilter}
            onChange={(value) => {
              setBandFilter(value);
              setPage(1);
            }}
            clearable
            searchable
          />
          <Select
            label={t.music.churchKeyLabel}
            data={MUSICAL_KEYS}
            value={keyFilter}
            onChange={(value) => {
              setKeyFilter(value);
              setPage(1);
            }}
            clearable
          />
          <TextInput
            label={t.music.tagsLabel}
            value={tagFilter}
            onChange={(event) => {
              setTagFilter(event.currentTarget.value);
              setPage(1);
            }}
          />
          <Select
            label={t.music.orderByLabel}
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
          />
          <Select
            label={t.music.perPageLabel}
            data={PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
            value={String(pageSize)}
            onChange={(value) => {
              if (value) {
                setPageSize(Number(value));
                setPage(1);
              }
            }}
          />
        </FilterDrawer>

        <SongModal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          editing={editingSong}
          onSaved={() => void load()}
        />

        {isAdmin ? (
          <SongsBulkAddModal
            opened={bulkOpen}
            onClose={() => setBulkOpen(false)}
            onSaved={() => void load()}
          />
        ) : null}

        <BandModal
          opened={bandsOpen}
          onClose={() => setBandsOpen(false)}
        />
      </Layout>
    </AuthGuard>
  );
}
