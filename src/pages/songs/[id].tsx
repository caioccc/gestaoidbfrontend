import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconBrandYoutube,
  IconMinus,
  IconPencil,
  IconPlus,
  IconRotate2,
  IconTrash,
} from '@tabler/icons-react';
import PageHeader from '../../components/PageHeader';
import AuthGuard from '../../components/AuthGuard';
import Layout from '../../components/Layout';
import SongModal from '../../components/SongModal';
import ChordSyncPlayer from '../../components/ChordSyncPlayer';
import { useLanguage } from '../../i18n';
import { useAuth, useRoleHelpers } from '../../contexts/AuthContext';
import { musicApi } from '../../api/music';
import { transposeChordsJson, transposeKey } from '../../utils/chords';
import type { Song, SongHistoryItem } from '../../types';

type Tab = 'player' | 'lyrics' | 'history';

export default function SongDetailPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { canManageMusic } = useRoleHelpers(user);
  const id = Number(router.query.id);

  const [song, setSong] = useState<Song | null>(null);
  const [history, setHistory] = useState<SongHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('player');
  const [transpose, setTranspose] = useState(0);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setSong(await musicApi.song(id));
      const h = await musicApi.songHistory(id);
      setHistory(h.results);
    } catch {
      notifications.show({ color: 'red', message: 'Música não encontrada.' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const transposedChords = useMemo(
    () => (song ? transposeChordsJson(song.chords_json ?? [], transpose) : []),
    [song, transpose],
  );

  const removeSong = async () => {
    if (!song) return;
    if (!window.confirm(`Excluir "${song.title}"?`)) return;
    try {
      await musicApi.deleteSong(song.id);
      notifications.show({ color: 'green', message: 'Música excluída.' });
      router.push('/songs');
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao excluir música.' });
    }
  };

  if (loading || !song) {
    return (
      <AuthGuard roles={['PASTOR', 'SECRETARIA', 'LOUVOR', 'MUSICO']}>
        <Layout>
          <Center py="xl"><Loader /></Center>
        </Layout>
      </AuthGuard>
    );
  }

  const displayedKey = transposeKey(
    song.original_key || song.church_key || '',
    transpose,
  );

  return (
    <AuthGuard roles={['PASTOR', 'SECRETARIA', 'LOUVOR', 'MUSICO']}>
      <Layout>
        <PageHeader title={song.title} description={song.artist}>
          <Group gap="sm">
            <Button variant="default" leftSection={<IconArrowLeft size={16} />} onClick={() => router.push('/songs')} size="sm">
              {t.music.songsTitle}
            </Button>
            {canManageMusic ? (
              <>
                <Button variant="light" leftSection={<IconPencil size={16} />} onClick={() => setEditOpen(true)} size="sm">
                  {t.music.editSong}
                </Button>
                <Tooltip label={t.common.delete}>
                  <Button variant="subtle" color="red" leftSection={<IconTrash size={16} />} onClick={removeSong} size="sm">
                    {t.common.delete}
                  </Button>
                </Tooltip>
              </>
            ) : null}
          </Group>
        </PageHeader>

        <Paper withBorder p="md" mb="md">
          <Group gap="md" wrap="wrap">
            {song.thumbnail_url ? (
              <Box style={{ width: 120, height: 67.5, borderRadius: 8, overflow: 'hidden', backgroundColor: 'var(--mantine-color-gray-2)' }}>
                <img src={song.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Box>
            ) : null}
            <Stack gap={4} style={{ flex: 1 }}>
              <Group gap={8} wrap="wrap">
                {song.band_name ? (
                  <Badge variant="dot" color={song.band_color}>{song.band_name}</Badge>
                ) : null}
                {song.church_key ? <Badge variant="light" color="violet">{t.music.churchKeyLabel}: {song.church_key}</Badge> : null}
                {song.original_key ? <Badge variant="light" color="grape">{t.music.originalKeyLabel}: {song.original_key}</Badge> : null}
                {song.bpm ? <Badge variant="light">{song.bpm} BPM</Badge> : null}
                {song.time_signature ? <Badge variant="light">{song.time_signature}</Badge> : null}
              </Group>
              <Text size="sm" c="dimmed">
                {t.music.timesPlayed}: {song.times_played}
                {song.last_played ? ` • ${t.music.lastPlayed}: ${song.last_played.slice(0, 10)}` : ''}
              </Text>
            </Stack>
            {song.youtube_id ? (
              <Button
                component="a"
                href={`https://www.youtube.com/watch?v=${song.youtube_id}`}
                target="_blank"
                rel="noreferrer"
                variant="light"
                leftSection={<IconBrandYoutube size={16} />}
                size="sm"
              >
                {t.music.openYoutube}
              </Button>
            ) : null}
          </Group>
        </Paper>

        <Group justify="space-between" align="center" mb="md">
          <SegmentedControl
            value={tab}
            onChange={(v) => setTab(v as Tab)}
            data={[
              { value: 'player', label: t.music.songStudy },
              { value: 'lyrics', label: t.music.lyricsLabel },
              { value: 'history', label: t.music.history },
            ]}
          />
          <Group gap="xs" wrap="nowrap">
            <Tooltip label={t.music.transposeDown}>
              <ActionIcon variant="light" onClick={() => setTranspose((x) => Math.max(x - 1, -7))} disabled={transpose <= -7}>
                <IconMinus size={16} />
              </ActionIcon>
            </Tooltip>
            <Badge variant="light" color="grape" size="lg" tt="none">
              {t.music.transposeLabel}: {displayedKey || '—'}
              {transpose !== 0 ? ` (${transpose > 0 ? '+' : ''}${transpose} ${t.music.semitones})` : ''}
            </Badge>
            <Tooltip label={t.music.transposeUp}>
              <ActionIcon variant="light" onClick={() => setTranspose((x) => Math.min(x + 1, 7))} disabled={transpose >= 7}>
                <IconPlus size={16} />
              </ActionIcon>
            </Tooltip>
            {transpose !== 0 ? (
              <Tooltip label={t.music.transposeReset}>
                <ActionIcon variant="subtle" color="gray" onClick={() => setTranspose(0)}>
                  <IconRotate2 size={16} />
                </ActionIcon>
              </Tooltip>
            ) : null}
          </Group>
        </Group>

        {tab === 'player' ? (
          <ChordSyncPlayer youtubeId={song.youtube_id} chords={transposedChords} title={song.title} />
        ) : null}

        {tab === 'lyrics' ? (
          <Paper withBorder p="lg">
            {song.lyrics ? (
              <Text style={{ whiteSpace: 'pre-wrap' }}>{song.lyrics}</Text>
            ) : (
              <Text c="dimmed">—</Text>
            )}
          </Paper>
        ) : null}

        {tab === 'history' ? (
          <HistoryTab items={history} />
        ) : null}

        <SongModal
          opened={editOpen}
          onClose={() => setEditOpen(false)}
          editing={song}
          onSaved={() => { void load(); setEditOpen(false); }}
        />
      </Layout>
    </AuthGuard>
  );
}

function HistoryTab({ items }: { items: SongHistoryItem[] }) {
  const { t } = useLanguage();
  return (
    <Card withBorder>
      {items.length === 0 ? (
        <Text c="dimmed">{t.music.noHistory}</Text>
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t.music.date}</Table.Th>
              <Table.Th>{t.music.themeLabel}</Table.Th>
              <Table.Th>{t.music.originalKeyLabel}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((h, i) => (
              <Table.Tr key={i}>
                <Table.Td>{h.date}</Table.Td>
                <Table.Td>{h.theme}</Table.Td>
                <Table.Td>{h.custom_key}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Card>
  );
}