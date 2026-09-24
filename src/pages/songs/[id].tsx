import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
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
  IconAlertCircle,
  IconArrowLeft,
  IconBrandYoutube,
  IconPencil,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import PageHeader from '../../components/PageHeader';
import AuthGuard from '../../components/AuthGuard';
import Layout from '../../components/Layout';
import SongModal from '../../components/SongModal';
import ChordSyncPlayer from '../../components/ChordSyncPlayer';
import LyricsSheet from '../../components/LyricsSheet';
import SongChordStatusBadge from '../../components/SongChordStatusBadge';
import { useLanguage } from '../../i18n';
import { useAuth, useRoleHelpers } from '../../contexts/AuthContext';
import { musicApi } from '../../api/music';
import { formatMusicalKey } from '../../utils/format';
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
  const [stageMode, setStageMode] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);

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
  const songStatus = song?.chord_status;

  useEffect(() => {
    if (!song || (songStatus !== 'PENDING' && songStatus !== 'PROCESSING')) return;
    const timer = window.setInterval(() => {
      musicApi.song(id).then(setSong).catch(() => undefined);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [id, song, songStatus]);

  const reprocessChord = async () => {
    if (!song) return;
    setReprocessing(true);
    try {
      const res = await musicApi.reprocessSong(song.id);
      setSong(res.song);
      notifications.show({ color: 'green', message: t.music.chordReprocessDone });
    } catch {
      notifications.show({ color: 'red', message: t.music.chordSaveError });
    } finally {
      setReprocessing(false);
    }
  };

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

  return (
    <AuthGuard roles={['PASTOR', 'SECRETARIA', 'LOUVOR', 'MUSICO']}>
      <Layout expanded={stageMode}>
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
                {song.chord_status === 'COMPLETED' || song.chord_status === 'MANUAL' ? (
                  <Button
                    variant="subtle"
                    leftSection={<IconRefresh size={16} />}
                    onClick={reprocessChord}
                    loading={reprocessing}
                    size="sm"
                  >
                    {t.music.chordReprocess}
                  </Button>
                ) : null}
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
                {song.church_key ? <Badge variant="light" color="violet">{t.music.churchKeyLabel}: {formatMusicalKey(song.church_key)}</Badge> : null}
                {song.original_key ? <Badge variant="light" color="grape">{t.music.originalKeyLabel}: {formatMusicalKey(song.original_key)}</Badge> : null}
                {song.bpm ? <Badge variant="light">{song.bpm} BPM</Badge> : null}
                {song.time_signature ? <Badge variant="light">{song.time_signature}</Badge> : null}
                {song.chord_status ? (
                  <SongChordStatusBadge status={song.chord_status} detail={song.chord_error || undefined} />
                ) : null}
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
        </Group>

        {song.chord_status && song.chord_status !== 'COMPLETED' && song.chord_status !== 'MANUAL' ? (
          <Card withBorder mb="md">
            <Group justify="space-between" align="center" wrap="wrap">
              <Group gap="sm" align="center">
                {song.chord_status === 'PENDING' || song.chord_status === 'PROCESSING' ? (
                  <Loader size={18} />
                ) : (
                  <IconAlertCircle size={18} color="var(--mantine-color-red-6)" />
                )}
                <Box>
                  <Text size="sm" fw={600}>
                    {song.chord_status === 'FAILED' ? t.music.chordFailedDetail : t.music.chordProcessing}
                  </Text>
                  {song.chord_status === 'FAILED' && song.chord_error ? (
                    <Text size="xs" c="dimmed">{song.chord_error}</Text>
                  ) : null}
                </Box>
              </Group>
              <Button
                variant="light"
                leftSection={<IconRefresh size={16} />}
                onClick={reprocessChord}
                loading={reprocessing}
                size="sm"
              >
                {t.music.chordReprocess}
              </Button>
            </Group>
          </Card>
        ) : null}

        {tab === 'player' ? (
          song.chord_status && song.chord_status !== 'COMPLETED' && song.chord_status !== 'MANUAL' ? (
            <Card withBorder p="lg">
              <Center>
                <Stack align="center" gap="sm">
                  {song.chord_status === 'PENDING' || song.chord_status === 'PROCESSING' ? (
                    <>
                      <Loader size={24} />
                      <Text size="sm" c="dimmed">{t.music.chordProcessing}</Text>
                    </>
                  ) : (
                    <>
                      <IconAlertCircle size={24} color="var(--mantine-color-red-6)" />
                      <Text size="sm" c="dimmed">{t.music.chordFailedDetail}</Text>
                      {song.chord_error ? <Text size="xs" c="dimmed">{song.chord_error}</Text> : null}
                    </>
                  )}
                  <Text size="xs" c="dimmed">{t.music.chordKeysAutofill}</Text>
                </Stack>
              </Center>
            </Card>
          ) : (
            <ChordSyncPlayer
              youtubeId={song.youtube_id}
              chords={song.chords_json ?? []}
              title={song.title}
              originalKey={song.original_key}
              churchKey={song.church_key}
              bpm={song.bpm}
              timeSignature={song.time_signature}
              stageMode={stageMode}
              onToggleStageMode={() => setStageMode((s) => !s)}
            />
          )
        ) : null}

        {tab === 'lyrics' ? (
          <LyricsSheet lyrics={song.lyrics ?? ''} />
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
              <Table.Th>{t.music.setlistsTitle}</Table.Th>
              <Table.Th>{t.music.transposeLabel}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((h, i) => (
              <Table.Tr key={`${h.kind}-${h.setlist_id ?? i}`}>
                <Table.Td>{h.date}</Table.Td>
                <Table.Td>{h.name || '—'}</Table.Td>
                <Table.Td>{h.key ? formatMusicalKey(h.key) : '—'}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Card>
  );
}