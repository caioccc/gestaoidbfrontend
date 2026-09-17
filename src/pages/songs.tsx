import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useLanguage } from '../i18n';
import { useAuth, useRoleHelpers } from '../contexts/AuthContext';
import { musicApi } from '../api/music';
import { formatMusicalKey } from '../utils/format';
import type { Band, Song } from '../types';

const MUSICAL_KEYS = [
  'C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B',
];

const PAGE_SIZE = 10;

function SongActions({
  song,
  canManage,
  onPlay,
  onEdit,
  onDelete,
}: {
  song: Song;
  canManage: boolean;
  onPlay: (s: Song) => void;
  onEdit: (s: Song) => void;
  onDelete: (s: Song) => void;
}) {
  const { t } = useLanguage();
  return (
    <Group gap={2} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
      <Tooltip label={t.music.playerGo}>
        <ActionIcon variant="subtle" color="blue" size="sm" onClick={() => onPlay(song)}>
          <IconPlayerPlay size={15} />
        </ActionIcon>
      </Tooltip>
      {canManage ? (
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
  const { canManageMusic } = useRoleHelpers(user);

  const [songs, setSongs] = useState<Song[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [keyFilter, setKeyFilter] = useState<string | null>(null);
  const [bandFilter, setBandFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [bandsOpen, setBandsOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSongs(await musicApi.songs({ q: q || undefined, key: keyFilter || undefined, band: bandFilter ? Number(bandFilter) : undefined }));
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao carregar repertório.' });
    } finally {
      setLoading(false);
    }
  }, [q, keyFilter, bandFilter]);

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

  const pageItems = useMemo(
    () => songs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [songs, page],
  );

  const openAdd = () => {
    setEditingSong(null);
    setModalOpen(true);
  };

  const openEdit = (s: Song) => {
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
          {canManageMusic ? (
            <Group gap="sm">
              <Button variant="light" onClick={() => setBandsOpen(true)} size="sm">
                {t.music.bandManage}
              </Button>
              <Button leftSection={<IconPlus size={16} />} onClick={openAdd} size="sm">
                {t.music.addSong}
              </Button>
            </Group>
          ) : null}
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
                    {pageItems.map((s) => (
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
                          <Text fw={600} size="sm">{s.title}</Text>
                          <Text size="xs" c="dimmed">{s.tags}</Text>
                          {s.band_name ? (
                            <Badge variant="dot" color={s.band_color} mt={4}>{s.band_name}</Badge>
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
                            canManage={!!canManageMusic}
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
              {pageItems.map((s) => (
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
                      </Box>
                    ) : (
                      <IconMusic size={24} style={{ color: 'var(--mantine-color-dimmed)' }} />
                    )
                  }
                  actions={
                    <>
                      <Menu.Item
                        leftSection={<IconPlayerPlay size={16} />}
                        onClick={() => play(s)}
                      >
                        {t.music.playerGo}
                      </Menu.Item>
                      {canManageMusic ? (
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
                    <Text fw={600} truncate>{s.title}</Text>
                    <Text size="xs" c="dimmed" truncate>{s.artist || '—'}</Text>
                    <Group gap={4}>
                      {s.church_key ? <Badge variant="light" color="violet" size="sm">{formatMusicalKey(s.church_key)}</Badge> : null}
                      <Badge variant="light" size="sm">{t.music.bpmLabel}: {s.bpm ?? '—'}</Badge>
                      <Badge variant="light" size="sm">{t.music.timesPlayed}: {s.times_played}</Badge>
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

            {songs.length > PAGE_SIZE && (
              <Group justify="center" py="sm">
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={Math.max(1, Math.ceil(songs.length / PAGE_SIZE))}
                  size="sm"
                />
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