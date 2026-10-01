import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Collapse,
  Group,
  Loader,
  Menu,
  Paper,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconArrowLeft,
  IconBrandYoutube,
  IconChevronDown,
  IconChevronUp,
  IconDotsVertical,
  IconInfoCircle,
  IconLock,
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
import { TOUCH_TARGET, touchStyles } from '../../components/PlayerToolsBar';
import { useLanguage } from '../../i18n';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useAuth } from '../../contexts/AuthContext';
import { musicApi } from '../../api/music';
import { formatMusicalKey } from '../../utils/format';
import type { Song, SongHistoryItem } from '../../types';

type Tab = 'player' | 'lyrics' | 'history';

export default function SongDetailPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const id = Number(router.query.id);

  const [song, setSong] = useState<Song | null>(null);
  const [history, setHistory] = useState<SongHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('player');
  const [stageMode, setStageMode] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  // As badges de tom/BPM/banda sao contexto, nao controle: o bloco de
  // detalhes nasce sempre colapsado, no celular e no desktop, para o player
  // ficar logo abaixo do cabecalho. O `useState(false)` acima ja garante
  // isso — o `Collapse expanded={detailsOpen}` abre so no toque do usuario.
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    const requestedTab = router.query.tab;
    if (requestedTab === 'player' || requestedTab === 'lyrics' || requestedTab === 'history') {
      setTab(requestedTab);
    }
  }, [router.query.tab]);

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
          <Group gap="xs" wrap="nowrap">
            <Button
              variant="default"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => router.push('/songs')}
              size="sm"
              style={{ minHeight: TOUCH_TARGET, flexShrink: 0 }}
              aria-label={t.music.songsTitle}
            >
              {/* No celular o rotulo encolhe para a seta: as quatro acoes
                  administrativas ocupavam quase quatro linhas da tela. */}
              <Box component="span" visibleFrom="xs">
                {t.music.songsTitle}
              </Box>
            </Button>

            <Menu shadow="md" width={230} position="bottom-end">
              <Menu.Target>
                <Tooltip label={t.music.moreActions}>
                  <ActionIcon
                    variant="default"
                    size={TOUCH_TARGET}
                    aria-label={t.music.moreActions}
                  >
                    <IconDotsVertical size={18} />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
                {song.chord_status === 'COMPLETED' || song.chord_status === 'MANUAL' ? (
                  <Menu.Item
                    leftSection={<IconRefresh size={16} />}
                    onClick={reprocessChord}
                    disabled={reprocessing}
                  >
                    {t.music.chordReprocess}
                  </Menu.Item>
                ) : null}
                {song.can_edit ? (
                  <Menu.Item
                    leftSection={<IconPencil size={16} />}
                    onClick={() => setEditOpen(true)}
                  >
                    {t.music.editSong}
                  </Menu.Item>
                ) : null}
                {song.can_edit ? (
                  <>
                    <Menu.Divider />
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={16} />}
                      onClick={removeSong}
                    >
                      {t.common.delete}
                    </Menu.Item>
                  </>
                ) : null}
              </Menu.Dropdown>
            </Menu>
          </Group>
        </PageHeader>

        {/*
          Cabecalho dos detalhes.

          `justify="space-between"` + `wrap="nowrap"` com o `flex: 1` no toggle
          resolve o texto cortado: quem encolhe e o `Text` (via `truncate`),
          nunca o botao do YouTube, que fica com `flexShrink: 0`.
        */}
        <Paper withBorder p="xs" mb="md">
          <Stack gap="xs">
            <Group justify="space-between" wrap="nowrap" gap="xs">
              <UnstyledButton
                onClick={() => setDetailsOpen((v) => !v)}
                aria-expanded={detailsOpen}
                aria-controls="song-details"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minHeight: TOUCH_TARGET,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <IconInfoCircle size={18} />
                {/*
                  No mobile o rotulo longo ("Ocultar detalhes da musica")
                  comia a largura toda e era cortado. `visibleFrom="xs"` mantem
                  o texto completo a partir de 576px; abaixo disso sobra so o
                  icone + chevron, com o `aria-label` garantindo o nome
                  acessivel completo.
                */}
                <Text size="sm" fw={600} truncate style={{ minWidth: 0 }}>
                  {detailsOpen ? t.music.hideSongDetails : t.music.showSongDetails}
                </Text>
                {detailsOpen ? (
                  <IconChevronUp size={16} />
                ) : (
                  <IconChevronDown size={16} />
                )}
              </UnstyledButton>
              {song.youtube_id ? (
                isMobile ? (
                  // So o icone no mobile: o rotulo completo empurrava o
                  // toggle para o truncate e os dois disputavam espaco.
                  <Tooltip label={t.music.openYoutube}>
                    <ActionIcon
                      component="a"
                      href={`https://www.youtube.com/watch?v=${song.youtube_id}`}
                      target="_blank"
                      rel="noreferrer"
                      variant="subtle"
                      size={TOUCH_TARGET}
                      aria-label={t.music.openYoutube}
                    >
                      <IconBrandYoutube size={20} />
                    </ActionIcon>
                  </Tooltip>
                ) : (
                  <Button
                    component="a"
                    href={`https://www.youtube.com/watch?v=${song.youtube_id}`}
                    target="_blank"
                    rel="noreferrer"
                    variant="subtle"
                    leftSection={<IconBrandYoutube size={16} />}
                    size="sm"
                    style={{ minHeight: TOUCH_TARGET, flexShrink: 0 }}
                  >
                    {t.music.openYoutube}
                  </Button>
                )
              ) : null}
            </Group>

            <Collapse expanded={detailsOpen}>
              <Box id="song-details">
                <Group gap="md" wrap="wrap" align="flex-start">
                  {/*
                    Thumbnail escondida no mobile: o video/player ja aparece
                    logo abaixo, entao a imagem repetia o mesmo conteudo e
                    empurrava os badges para fora da dobra.
                  */}
                  {song.thumbnail_url && !isMobile ? (
                    <Box
                      style={{
                        width: 120,
                        height: 67.5,
                        borderRadius: 8,
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
                  ) : null}
                  <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                    <Group gap={6} wrap="wrap">
                      {song.band_name ? (
                        <Badge
                          variant="dot"
                          color={song.band_color}
                          size={isMobile ? 'sm' : 'md'}
                        >
                          {song.band_name}
                        </Badge>
                      ) : null}
                      {/*
                        Tom definido e original juntos num unico `Badge`: no
                        mobile eram dois badges largos que, somados aos outros,
                        empurravam a lista para 5 linhas verticais.
                      */}
                      {song.church_key || song.original_key ? (
                        <Badge
                          variant="light"
                          color="violet"
                          size={isMobile ? 'sm' : 'md'}
                        >
                          {song.church_key ? (
                            <>
                              {t.music.churchKeyLabel}: {formatMusicalKey(song.church_key)}
                              {song.original_key ? (
                                <Text span c="dimmed" size="xs">
                                  {' · '}
                                  {t.music.originalKeyLabel}:{' '}
                                  {formatMusicalKey(song.original_key)}
                                </Text>
                              ) : null}
                            </>
                          ) : (
                            <>
                              {t.music.originalKeyLabel}:{' '}
                              {formatMusicalKey(song.original_key as string)}
                            </>
                          )}
                        </Badge>
                      ) : null}
                      {song.bpm ? (
                        <Badge variant="light" size={isMobile ? 'sm' : 'md'}>
                          {song.bpm} BPM
                        </Badge>
                      ) : null}
                      {song.time_signature ? (
                        <Badge variant="light" size={isMobile ? 'sm' : 'md'}>
                          {song.time_signature}
                        </Badge>
                      ) : null}
                      {song.chord_status ? (
                        <SongChordStatusBadge
                          status={song.chord_status}
                          detail={song.chord_error || undefined}
                        />
                      ) : null}
                      {song.is_private ? (
                        <Tooltip label={t.music.privateBadgeTip}>
                          <Badge
                            color="gray"
                            variant="light"
                            size={isMobile ? 'sm' : 'md'}
                            leftSection={<IconLock size={12} />}
                            data-testid="song-visibility-badge"
                          >
                            {t.music.privateBadge}
                          </Badge>
                        </Tooltip>
                      ) : null}
                    </Group>
                    <Stack gap={4} mt={6}>
                      <Text size={isMobile ? 'xs' : 'sm'} c="dimmed" fw={500}>
                        {t.music.playedByBand}
                      </Text>
                      {song.band_stats.length === 0 ? (
                        <Text size="xs" c="dimmed">{t.music.noBandStats}</Text>
                      ) : (
                        <Group gap={6} wrap="wrap">
                          {song.band_stats.map((stat) => (
                            <Badge
                              key={stat.band ?? 'none'}
                              variant={stat.band ? 'dot' : 'outline'}
                              color={stat.band ? stat.band_color : 'gray'}
                              size={isMobile ? 'sm' : 'lg'}
                            >
                              {stat.band_name || t.music.noBandLabel}: {stat.times_played}×
                            </Badge>
                          ))}
                        </Group>
                      )}
                    </Stack>
                    {song.created_by_name ? (
                      <Text size="xs" c="dimmed">
                        {t.music.createdByLabel}: {song.created_by_name}
                      </Text>
                    ) : null}
                  </Stack>
                </Group>
              </Box>
            </Collapse>
          </Stack>
        </Paper>

        <Group justify="space-between" align="center" mb="md">
          <SegmentedControl
            value={tab}
            onChange={(v) => setTab(v as Tab)}
            fullWidth={isMobile}
            size={isMobile ? 'md' : 'sm'}
            styles={isMobile ? touchStyles : undefined}
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
                style={isMobile ? { minHeight: TOUCH_TARGET } : undefined}
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