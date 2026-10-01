import React, { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Modal,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Stepper,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconDeviceFloppy,
  IconLock,
  IconMusic,
  IconTrash,
  IconWorld,
} from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { useIsMobile } from '../hooks/useIsMobile';
import { musicApi } from '../api/music';
import { toSentenceCase, toUpperCamelWords } from '../utils/format';
import type { Band, BandSetlist, BandSetlistItem, Song } from '../types';

interface SetlistsModalProps {
  opened: boolean;
  onClose: () => void;
  editing: BandSetlist | null;
  onSaved: () => void;
}

interface Row {
  songId: string;
  /** Título desnormalizado do item, usado quando a música não está mais no
   *  repertório visível (ex.: privada de outra pessoa) — evita linha vazia. */
  fallbackTitle: string;
  fallbackArtist: string;
}

/** Lado da capa do YouTube usado quando a música não tem `thumbnail_url`
 *  preenchido pelo cadastro. */
const youtubeThumbnail = (youtubeId: string) =>
  `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;

/**
 * Miniatura 50x50 da opção do `Select`, com placeholder quando a música não tem
 * capa (ou o id do YouTube sumiu do cadastro). O `key` interno na capa faz o
 * `onError` lembra apenas da falha daquela url, sem apagar as outras opções.
 */
function SongThumb({ song, size = 50 }: { song: Song | undefined; size?: number }) {
  const [failed, setFailed] = useState(false);

  const url = song
    ? song.thumbnail_url || (song.youtube_id ? youtubeThumbnail(song.youtube_id) : '')
    : '';

  return (
    <Box
      w={size}
      h={size}
      style={{
        flexShrink: 0,
        overflow: 'hidden',
        borderRadius: 'var(--mantine-radius-sm)',
        background: 'var(--mantine-color-default-hover)',
      }}
    >
      {url && !failed ? (
        <Box
          component="img"
          src={url}
          alt=""
          loading="lazy"
          draggable={false}
          w="100%"
          h="100%"
          onError={() => setFailed(true)}
          style={{ objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Center h="100%">
          <IconMusic size={22} color="var(--mantine-color-dimmed)" />
        </Center>
      )}
    </Box>
  );
}

export default function SetlistsModal({ opened, onClose, editing, onSaved }: SetlistsModalProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  const toRow = (it: BandSetlistItem): Row => ({
    songId: String(it.song),
    fallbackTitle: it.song_title ?? '',
    fallbackArtist: it.song_artist ?? '',
  });

  const [songs, setSongs] = useState<Song[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [bandId, setBandId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [addValue, setAddValue] = useState<string | null>(null);
  const [addSearch, setAddSearch] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!opened) return;
    void musicApi.songs().then(setSongs).catch(() => setSongs([]));
    void musicApi.bands().then(setBands).catch(() => setBands([]));
    setDate(editing?.date ?? null);
    setBandId(editing?.band ? String(editing.band) : null);
    setDescription(editing?.description ?? '');
    setTheme(editing?.theme ?? '');
    setIsPrivate(editing?.is_private ?? false);
    setRows(
      (editing?.items ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((it) => toRow(it)),
    );
    setAddValue(null);
    setAddSearch('');
    setStep(0);
  }, [opened, editing]);

  /** Índice por id: as linhas e as opções do `Select` precisam da mesma
   *  música varias vezes por render, e `Array.find` a cada vez vira O(n*m). */
  const songsById = useMemo(
    () => new Map(songs.map((s) => [String(s.id), s])),
    [songs],
  );

  const selectedIds = useMemo(() => new Set(rows.map((r) => r.songId)), [rows]);

  const remainingSongs = useMemo(
    () => songs.filter((s) => !selectedIds.has(String(s.id))),
    [songs, selectedIds],
  );

  /** Músicas privadas já selecionadas — combinadas com setlist público o
   *  backend recusa, então avisamos antes e travamos o botão de salvar. */
  const privateSelected = useMemo(
    () => rows.filter((r) => songsById.get(r.songId)?.is_private),
    [rows, songsById],
  );
  const blockedByPrivacy = !isPrivate && privateSelected.length > 0;

  /** Data e descrição são obrigatórias no `save()`; o botão "avançar" da
   *  etapa 1 fica travado com os mesmos campos para não liberar a etapa 2
   *  com um formulário que nem dá para enviar. */
  const stepOneValid = Boolean(date) && description.trim().length > 0;
  const canSave = stepOneValid && rows.length > 0 && !blockedByPrivacy;

  const onAdd = (value: string | null) => {
    if (!value) return;
    setRows((prev) => (
      prev.some((r) => r.songId === value)
        ? prev
        : [...prev, { songId: value, fallbackTitle: '', fallbackArtist: '' }]
    ));
    setAddValue(null);
    setAddSearch('');
  };

  const move = (index: number, delta: number) => {
    setRows((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    if (!date || !description.trim() || rows.length === 0) return;
    if (blockedByPrivacy) {
      notifications.show({ color: 'yellow', message: t.music.setlistPrivateSongBlocked });
      return;
    }
    setSaving(true);
    const payload = {
      band: bandId ? Number(bandId) : null,
      date,
      description: toSentenceCase(description),
      theme: toUpperCamelWords(theme),
      is_private: isPrivate,
      items: rows.map((r, i) => ({
        song: Number(r.songId),
        order: i + 1,
      })),
    };
    try {
      if (editing) {
        await musicApi.updateBandSetlist(editing.id, payload);
      } else {
        await musicApi.createBandSetlist(payload);
      }
      notifications.show({ color: 'green', message: t.music.setlistSaved });
      onSaved();
      onClose();
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const detail = (data?.detail ?? data?.items) as string | string[] | undefined;
      notifications.show({
        color: 'red',
        message: Array.isArray(detail) ? detail[0] : (detail ?? t.music.setlistSaveError),
      });
    } finally {
      setSaving(false);
    }
  };

  /** Opções do `Select`: o `label` continua sendo o texto plano (é ele que o
   *  Mantine usa para filtrar), e o `renderOption` desenha capa + título +
   *  badge de privada. */
  const songOptions = useMemo(
    () =>
      remainingSongs.map((s) => ({
        value: String(s.id),
        label: `${s.title}${s.artist ? ` — ${s.artist}` : ''}`,
      })),
    [remainingSongs],
  );

  const renderOption = ({ option }: { option: { value: string; label: string } }) => {
    const song = songsById.get(option.value);
    return (
      <Group gap="sm" wrap="nowrap">
        <SongThumb song={song} />
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" truncate>
            {song?.title || option.label}
          </Text>
          {song?.artist ? (
            <Text size="xs" c="dimmed" truncate>
              {song.artist}
            </Text>
          ) : null}
        </Box>
        {song?.is_private ? (
          <Badge size="xs" variant="light" color="gray" style={{ flexShrink: 0 }}>
            {t.music.privateBadge}
          </Badge>
        ) : null}
      </Group>
    );
  };

  /** Rodapé: no desktop fica no fluxo normal (o modal tem altura para caber);
   *  no mobile vira uma barra sticky, senão o botão de salvar fica fora da tela
   *  com uma lista longa de músicas. */
  const footer = (
    <Paper
      withBorder={isMobile}
      p="sm"
      mt="md"
      radius={0}
      style={
        isMobile
          ? {
              position: 'sticky',
              bottom: 0,
              zIndex: 1,
              marginInline: 'calc(-1 * var(--mb-padding, var(--mantine-spacing-md)))',
              marginBottom: 'calc(-1 * var(--mb-padding, var(--mantine-spacing-md)))',
              paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
              backgroundColor: 'var(--mantine-color-body)',
            }
          : undefined
      }
    >
      <Group justify="space-between" gap="sm" wrap="nowrap">
        <Button
          variant="default"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => (step === 0 ? onClose() : setStep(0))}
        >
          {step === 0 ? t.common.cancel : t.registerPage.back}
        </Button>

        {step === 0 ? (
          <Button
            rightSection={<IconArrowRight size={16} />}
            data-testid="setlist-footer-next"
            disabled={!stepOneValid}
            onClick={() => setStep(1)}
          >
            {t.registerPage.next}
          </Button>
        ) : (
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            loading={saving}
            onClick={() => void save()}
            disabled={!canSave}
          >
            {t.music.saveSetlist}
          </Button>
        )}
      </Group>
    </Paper>
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      centered
      title={editing ? t.music.editSetlist : t.music.newSetlist}
    >
      <Stack gap="md">
        <Stepper
          active={step}
          onStepClick={(index) => index < step && setStep(index)}
          allowNextStepsSelect={false}
          size="sm"
          data-testid="setlist-stepper"
        >
          <Stepper.Step
            label={t.music.setlistStepData}
            description={isMobile ? undefined : t.music.setlistStepDataDesc}
          >
            <Stack mt="md" gap="md">
              <Group gap="md" grow align="flex-end">
                <DateInput
                  label={t.music.setlistDate}
                  placeholder="DD/MM/AAAA"
                  value={date}
                  onChange={setDate}
                  valueFormat="DD/MM/YYYY"
                  required
                />
                <Select
                  label={t.music.setlistBand}
                  placeholder={t.music.noBand}
                  data={bands.map((b) => ({ value: String(b.id), label: b.name }))}
                  value={bandId}
                  onChange={setBandId}
                  clearable
                  searchable
                />
              </Group>

              <TextInput
                label={t.music.setlistDescription}
                placeholder={t.music.setlistDescriptionPlaceholder}
                value={description}
                onChange={(e) => setDescription(e.currentTarget.value)}
                required
              />

              <TextInput
                label={t.music.setlistTheme}
                placeholder={t.music.setlistThemePlaceholder}
                value={theme}
                onChange={(e) => setTheme(e.currentTarget.value)}
              />

              <Box>
                <Text size="sm" fw={500} mb={6}>{t.music.visibilityLabel}</Text>
                <SegmentedControl
                  fullWidth
                  value={isPrivate ? 'private' : 'public'}
                  onChange={(value) => setIsPrivate(value === 'private')}
                  data={[
                    {
                      value: 'public',
                      label: (
                        <Center component="span" style={{ gap: 6 }}>
                          <IconWorld size={15} />
                          {t.music.visibilityPublic}
                        </Center>
                      ),
                    },
                    {
                      value: 'private',
                      label: (
                        <Center component="span" style={{ gap: 6 }}>
                          <IconLock size={15} />
                          {t.music.visibilityPrivate}
                        </Center>
                      ),
                    },
                  ]}
                />
                <Text size="xs" c="dimmed" mt={6}>
                  {isPrivate ? t.music.visibilitySetlistTip : t.music.visibilitySongTip}
                </Text>
              </Box>
            </Stack>
          </Stepper.Step>

          <Stepper.Step
            label={t.music.setlistStepSongs}
            description={isMobile ? undefined : t.music.setlistStepSongsDesc}
          >
            <Stack mt="md" gap="xs">
              <Select
                label={t.music.setlistSongs}
                placeholder={t.music.setlistSongPlaceholder}
                data={songOptions}
                value={addValue}
                onChange={onAdd}
                searchValue={addSearch}
                onSearchChange={setAddSearch}
                renderOption={renderOption}
                nothingFoundMessage={
                  remainingSongs.length === 0 && addSearch.length === 0
                    ? t.music.setlistAllSongsSelected
                    : t.music.setlistSongSearchEmpty
                }
                maxDropdownHeight={320}
                comboboxProps={{ transitionProps: { transition: 'pop', duration: 100 } }}
                searchable
              />

              {blockedByPrivacy ? (
                <Alert
                  color="yellow"
                  icon={<IconAlertTriangle size={18} />}
                  data-testid="setlist-private-song-alert"
                >
                  {t.music.setlistPrivateSongBlocked}
                </Alert>
              ) : null}

              {rows.length === 0 ? (
                <Text size="sm" c="dimmed">{t.music.setlistEmpty}</Text>
              ) : (
                <>
                  <Group justify="space-between" gap="xs">
                    <Text size="xs" c="dimmed">
                      {t.music.setlistStepCounter
                        .replace('{current}', String(rows.length))
                        .replace('{total}', String(songs.length))}
                    </Text>
                    <Text size="xs" c="dimmed">{t.music.setlistSongOrderHint}</Text>
                  </Group>

                  <Stack gap={4}>
                    {rows.map((row, i) => {
                      const song = songsById.get(row.songId);
                      // Sem `song` a linha veio de um item salvo cujo repertório
                      // sumiu do que a API devolve (ex.: privada de outra
                      // pessoa): o título desnormalizado do item é a única
                      // informação confiável, então a linha fica travada.
                      const outside = !song;
                      const title = song?.title || row.fallbackTitle;
                      const artist = song?.artist || row.fallbackArtist;
                      return (
                        <Group key={row.songId} gap={6} wrap="nowrap">
                          <Text size="sm" fw={600} w={26} c="dimmed">{i + 1}.</Text>
                          <SongThumb song={song} size={34} />
                          {song?.is_private ? (
                            <Tooltip label={t.music.privateSetlistBadgeTip}>
                              <IconLock
                                size={15}
                                data-testid={`setlist-row-private-${row.songId}`}
                                color="var(--mantine-color-dimmed)"
                                style={{ flexShrink: 0 }}
                              />
                            </Tooltip>
                          ) : outside ? (
                            <Tooltip label={t.music.setlistSongOutsideRepertoire}>
                              <IconLock
                                size={15}
                                data-testid={`setlist-row-locked-${row.songId}`}
                                color="var(--mantine-color-dimmed)"
                                style={{ flexShrink: 0 }}
                              />
                            </Tooltip>
                          ) : null}
                          <Text size="sm" truncate style={{ flex: 1 }}>
                            {title}
                            <Text span size="xs" c="dimmed">
                              {artist ? ` — ${artist}` : ''}
                            </Text>
                          </Text>
                          <Tooltip label={t.music.setlistSongMoveUp}>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="sm"
                              aria-label={t.music.setlistSongMoveUp}
                              onClick={() => move(i, -1)}
                              disabled={i === 0}
                            >
                              <IconArrowUp size={14} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label={t.music.setlistSongMoveDown}>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="sm"
                              aria-label={t.music.setlistSongMoveDown}
                              onClick={() => move(i, 1)}
                              disabled={i === rows.length - 1}
                            >
                              <IconArrowDown size={14} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label={t.music.setlistSongRemove}>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              aria-label={t.music.setlistSongRemove}
                              onClick={() => removeRow(i)}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      );
                    })}
                  </Stack>
                </>
              )}
            </Stack>
          </Stepper.Step>
        </Stepper>

        {footer}
      </Stack>
    </Modal>
  );
}