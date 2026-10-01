import React, { useEffect, useState } from 'react';
import {
  ActionIcon,
  Alert,
  AspectRatio,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Grid,
  Group,
  Image,
  Loader,
  Modal,
  Paper,
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Stepper,
  Switch,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconBrandYoutube,
  IconDeviceFloppy,
  IconExternalLink,
  IconInfoCircle,
  IconLink,
  IconLock,
  IconMusic,
  IconPlayerPlay,
  IconSearch,
  IconTrash,
  IconWorld,
} from '@tabler/icons-react';
import { musicApi } from '../api/music';
import { useLanguage } from '../i18n';
import { useIsMobile } from '../hooks/useIsMobile';
import { TOUCH_TARGET } from './PlayerToolsBar';
import type { Band, Song, YouTubeSearchResult, SongPayload } from '../types';

interface SongModalProps {
  opened: boolean;
  onClose: () => void;
  editing: Song | null;
  onSaved: () => void;
}

export default function SongModal({ opened, onClose, editing, onSaved }: SongModalProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  /**
   * Índice do passo ativo do cadastro: 0 = busca, 1 = escolher, 2 = detalhes.
   *
   * A edição não usa Stepper — abre direto no formulário completo, já que o
   * vídeo foi escolhido antes. Por isso o passo é sempre 0 quando `editing`
   * está preenchido.
   */
  const [activeStep, setActiveStep] = useState(0);
  // Entrada manual de link, escondida atrás de um switch na etapa de busca.
  const [manualLink, setManualLink] = useState(false);

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [churchKey, setChurchKey] = useState('');
  const [originalKey, setOriginalKey] = useState('');
  const [bpm, setBpm] = useState('');
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [lyrics, setLyrics] = useState('');
  const [tags, setTags] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [chordsJson, setChordsJson] = useState<Song['chords_json']>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [bandId, setBandId] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchAlert, setSearchAlert] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingSong, setExistingSong] = useState<Song | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  useEffect(() => {
    // Reabrir o modal sempre volta ao passo inicial. Sem isso o passo anterior
    // e o switch de link manual vazavam para a próxima abertura.
    setActiveStep(0);
    setManualLink(false);
    if (!opened) {
      setSearchAlert(false);
      setResults([]);
      setExistingSong(null);
      return;
    }
    void musicApi.bands().then(setBands).catch(() => setBands([]));
    setSearchAlert(false);
    setResults([]);
    setExistingSong(null);
    setTitle(editing?.title ?? '');
    setArtist(editing?.artist ?? '');
    setYoutubeId(editing?.youtube_id ?? '');
    setYoutubeUrl(
      editing?.youtube_id
        ? `https://www.youtube.com/watch?v=${editing.youtube_id}`
        : '',
    );
    setThumbnailUrl(editing?.thumbnail_url ?? '');
    setChurchKey(editing?.church_key ?? '');
    setOriginalKey(editing?.original_key ?? '');
    setBpm(editing?.bpm ? String(editing.bpm) : '');
    setTimeSignature(editing?.time_signature ?? '4/4');
    setLyrics(editing?.lyrics ?? '');
    setTags(editing?.tags ?? '');
    setChordsJson(editing?.chords_json ?? []);
    setBandId(editing ? String(editing.band ?? '') : null);
    setIsPrivate(editing?.is_private ?? false);
    setQuery(editing?.youtube_title || editing?.title || '');
  }, [opened, editing]);

  const doSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchAlert(false);
    setResults([]);
    try {
      const data = await musicApi.youtubeSearch(q);
      if (data.status === 'unavailable') {
        setSearchAlert(true);
        return;
      }
      setResults(data.results);
      // Só avança quando há o que escolher. Busca vazia ou serviço indisponível
      // mantém o usuário na etapa 1, onde ficam o campo de busca e o switch para
      // informar o link manualmente.
      if (data.results.length > 0) setActiveStep(1);
    } catch {
      setSearchAlert(true);
    } finally {
      setSearching(false);
    }
  };

  const useResult = (r: YouTubeSearchResult) => {
    setTitle(r.title);
    setYoutubeId(r.youtube_id);
    setYoutubeUrl(`https://www.youtube.com/watch?v=${r.youtube_id}`);
    setThumbnailUrl(r.thumbnail_url);
    setQuery(r.title);
    setArtist((prev) => prev || r.channel_name);
  };

  // Aceita link completo ou o ID de 11 caracteres, que é o que o usuário às
  // vezes copia direto da barra do YouTube.
  const parseYoutubeLink = (raw: string): string | null => {
    const value = raw.trim();
    if (!value) return null;
    const m = value.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
    const id = m ? m[1] : value;
    return /^[\w-]{11}$/.test(id) ? id : null;
  };

  /**
   * Aplica o link informado. `targetStep` é opcional: no switch da etapa de
   * busca o usuário já sabe qual é a música, então pula direto para os
   * detalhes; na etapa de detalhes apenas normaliza os campos, sem navegar.
   */
  const pickByUrl = (targetStep?: number) => {
    const id = parseYoutubeLink(youtubeUrl);
    if (!id) {
      notifications.show({ color: 'red', message: t.music.youtubeLinkInvalid });
      return;
    }
    setYoutubeId(id);
    setYoutubeUrl(`https://www.youtube.com/watch?v=${id}`);
    if (!title.trim()) {
      setTitle(id.replace(/-/g, ' '));
    }
    setThumbnailUrl((prev) => prev || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
    // A grade anterior não tem relação com o link colado e só confundiria ao
    // voltar para a etapa de escolha.
    setResults([]);
    if (targetStep !== undefined) setActiveStep(targetStep);
  };

  // Um ID válido vem da busca ou colado à mão. `results` sozinho não basta:
  // o usuário pode ter buscado e não clicado em nenhum card.
  const hasValidYoutubeId = /^[\w-]{11}$/.test(youtubeId.trim());

  // Pré-cadastro: o mesmo vídeo já pode ter sido cadastrado por outra igreja.
  // Busca global e preenche o formulário para evitar novo scraping.
  useEffect(() => {
    if (!opened || editing) {
      setExistingSong(null);
      setCheckingExisting(false);
      return;
    }
    const id = youtubeId.trim();
    if (!/^[\w-]{11}$/.test(id)) {
      setExistingSong(null);
      setCheckingExisting(false);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      // O flag só liga aqui dentro, nunca antes do debounce. Ligando antes, o
      // effect que roda logo em seguida com o ID vazio caía no return acima e
      // deixava o "Verificando..." aceso para sempre — era o que aparecia ao
      // reabrir o modal depois de salvar uma música.
      setCheckingExisting(true);
      musicApi
        .checkYoutube(id)
        .then((data) => {
          if (!active || !data.found || !data.song) {
            if (active) setExistingSong(null);
            return;
          }
          const found = data.song;
          setExistingSong(found);
          setTitle((prev) => prev || found.title);
          setArtist((prev) => prev || found.artist || '');
          setThumbnailUrl((prev) => prev || found.thumbnail_url || '');
          setOriginalKey((prev) => prev || found.original_key || '');
          setChurchKey((prev) => prev || found.church_key || '');
          setBpm((prev) => {
            if (prev || !found.bpm) return prev;
            return String(found.bpm);
          });
          setTimeSignature((prev) => prev || found.time_signature || '4/4');
          if (found.chords_json?.length) {
            setChordsJson((prev) => (prev.length ? prev : found.chords_json));
          }
          setLyrics((prev) => prev || found.lyrics || '');
          setTags((prev) => prev || found.tags || '');
        })
        .catch(() => {
          if (active) setExistingSong(null);
        })
        .finally(() => {
          if (active) setCheckingExisting(false);
        });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
      // O `.finally` só limpa o flag quando `active` ainda é true, então o
      // cleanup também precisa limpar: é o que garante que o loader não fique
      // preso se o ID mudar com a requisição em voo.
      setCheckingExisting(false);
    };
  }, [opened, editing, youtubeId]);

  const save = async () => {
    if (!title.trim() || !youtubeId.trim()) return;
    setSaving(true);
    const payload: SongPayload = {
      title: title.trim(),
      artist: artist.trim(),
      band: bandId ? Number(bandId) : null,
      youtube_id: youtubeId.trim(),
      youtube_title: '',
      thumbnail_url: thumbnailUrl.trim(),
      duration_seconds: undefined,
      original_key: originalKey.trim(),
      church_key: churchKey.trim(),
      bpm: bpm ? Number(bpm) : undefined,
      time_signature: timeSignature.trim() || '4/4',
      lyrics,
      tags: tags.trim(),
      is_private: isPrivate,
    };
    // A extração de cifras agora é ASSÍNCRONA (worker local): o cadastro é
    // rápido e a música entra na fila (PENDING). Só manda os acordes quando o
    // usuário realmente os forneceu (ex.: pré-cadastro vindo do acervo), e
    // apenas na criação — na edição preserva o chord_status existente.
    const hasManualChords = chordsJson.length > 0;
    if (!editing && hasManualChords) {
      payload.chords_json = chordsJson;
      payload.chords = '';
    }
    try {
      if (editing) {
        await musicApi.updateSong(editing.id, payload);
      } else {
        await musicApi.createSong(payload);
      }
      notifications.show({ color: 'green', message: t.music.songSaved });
      onSaved();
      onClose();
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const detail = (data?.detail ?? data?.is_private ?? data?.title) as
        | string
        | string[]
        | undefined;
      notifications.show({
        color: 'red',
        message: Array.isArray(detail) ? detail[0] : (detail ?? t.music.chordSaveError),
      });
    } finally {
      setSaving(false);
    }
  };

  // Público/privado: fica na primeira etapa do cadastro e no topo do
  // formulário de edição, já que é uma propriedade da música, não do cadastro.
  const visibilityField = (
    <Box>
      <Text size="sm" fw={500} mb={6}>
        {t.music.visibilityLabel}
      </Text>
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
        {isPrivate ? t.music.visibilitySongTip : t.music.visibilityPublicTip}
      </Text>
    </Box>
  );

  // Link e ID do vídeo: ficam nos detalhes do cadastro e no formulário de
  // edição. No cadastro eles chegam preenchidos pela escolha da etapa 2; na
  // edição podem ser corrigidos.
  const videoFields = (
    <>
      <TextInput
        label={t.music.youtubeUrlLabel}
        placeholder={t.music.youtubeUrlPlaceholder}
        value={youtubeUrl}
        onChange={(e) => setYoutubeUrl(e.currentTarget.value)}
        onKeyDown={(e) => e.key === 'Enter' && pickByUrl()}
        rightSection={
          <Button
            size="compact-xs"
            variant="subtle"
            onClick={() => pickByUrl()}
            disabled={!youtubeUrl.trim()}
          >
            Ok
          </Button>
        }
      />

      <TextInput
        label={t.music.youtubeIdLabel}
        placeholder="dQw4w9WgXcQ"
        value={youtubeId}
        onChange={(e) => setYoutubeId(e.currentTarget.value.replace(/\s/g, ''))}
        leftSection={<IconBrandYoutube size={15} />}
        rightSection={
          hasValidYoutubeId ? (
            <Tooltip label={t.music.openYoutube}>
              <ActionIcon
                variant="subtle"
                component="a"
                href={`https://www.youtube.com/watch?v=${youtubeId.trim()}`}
                target="_blank"
                rel="noreferrer"
                size="sm"
                aria-label={t.music.openYoutube}
              >
                <IconExternalLink size={16} />
              </ActionIcon>
            </Tooltip>
          ) : null
        }
      />

      {thumbnailUrl ? (
        <Group gap={12} align="flex-start">
          <Box
            style={{
              width: 160,
              height: 90,
              borderRadius: 8,
              overflow: 'hidden',
              flexShrink: 0,
              backgroundColor: 'var(--mantine-color-gray-2)',
            }}
          >
            <AspectRatio ratio={16 / 9} h="100%">
              <Image
                src={thumbnailUrl}
                alt={t.music.thumbnailPreview}
                fit="cover"
                h="100%"
              />
            </AspectRatio>
          </Box>
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm" fw={600}>
              {t.music.thumbnailPreview}
            </Text>
            <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>
              {thumbnailUrl}
            </Text>
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              mt={4}
              onClick={() => setThumbnailUrl('')}
              aria-label={t.music.thumbnailPreview}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Stack>
        </Group>
      ) : null}
    </>
  );

  // Metadados: última etapa do cadastro e formulário de edição. Tom original e
  // BPM só aparecem na edição, porque no cadastro são preenchidos pelo
  // enriquecimento automático do vídeo escolhido.
  const metadataFields = (
    <>
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <TextInput
            label={t.music.songTitleLabel}
            placeholder={t.music.songTitlePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            leftSection={<IconMusic size={15} />}
            required
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <TextInput
            label={t.music.songArtistLabel}
            placeholder={t.music.songArtistPlaceholder}
            value={artist}
            onChange={(e) => setArtist(e.currentTarget.value)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 4 }}>
          <TextInput
            label={t.music.churchKeyLabel}
            placeholder="C"
            value={churchKey}
            onChange={(e) => setChurchKey(e.currentTarget.value)}
          />
        </Grid.Col>
        {editing ? (
          <>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <TextInput
                label={t.music.originalKeyLabel}
                placeholder="C"
                value={originalKey}
                onChange={(e) => setOriginalKey(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <TextInput
                label={t.music.bpmLabel}
                placeholder="72"
                value={bpm}
                onChange={(e) => setBpm(e.currentTarget.value.replace(/\D/g, ''))}
              />
            </Grid.Col>
          </>
        ) : null}
      </Grid>

      {!editing ? (
        <Text size="xs" c="dimmed">
          {t.music.chordKeysAutofill}
        </Text>
      ) : null}

      <Select
        label={t.music.bandForSong}
        placeholder={t.music.noBand}
        data={bands.map((b) => ({ value: String(b.id), label: b.name }))}
        value={bandId}
        onChange={setBandId}
        clearable
        searchable
      />

      <Textarea
        label={t.music.lyricsLabel}
        value={lyrics}
        onChange={(e) => setLyrics(e.currentTarget.value)}
        minRows={3}
        maxRows={6}
      />

      <TextInput
        label={t.music.tagsLabel}
        placeholder="louvor, cifra, clássico"
        value={tags}
        onChange={(e) => setTags(e.currentTarget.value)}
      />
    </>
  );

  const chordsCounter =
    chordsJson.length > 0 ? (
      <Text size="xs" c="dimmed">
        {chordsJson.length} {t.music.chordsReady.toLowerCase()}
      </Text>
    ) : null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      // `fullScreen` no mobile: o cadastro tem três etapas com busca, grade de
      // resultados e metadados; um `xl` espremido em 360px deixa cada etapa com
      // uma ou duas colunas úteis. No desktop o `xl` cabe bem.
      fullScreen={isMobile}
      size={isMobile ? 'md' : 'xl'}
      centered={!isMobile}
      title={editing ? t.music.editSong : t.music.addSong}
    >
      {editing ? (
        // Edição sem Stepper: o vídeo já foi escolhido antes, então sobra apenas
        // revisar os dados.
        <Stack gap="md">
          {visibilityField}
          {videoFields}
          {chordsCounter}
          {metadataFields}
        </Stack>
      ) : (
        <>
          <Stepper
            active={activeStep}
            // Só permite voltar para etapas anteriores. Pular direto para uma
            // etapa futura burlaria a validação do passo do meio.
            onStepClick={(s) => s < activeStep && setActiveStep(s)}
            size={isMobile ? 'sm' : 'md'}
            iconSize={isMobile ? 26 : 32}
          >
            {/* ---------------------------------------------- Etapa 1: busca */}
            <Stepper.Step
              label={t.music.stepSearch}
              description={isMobile ? undefined : t.music.stepSearchDesc}
              icon={<IconSearch size={isMobile ? 15 : 18} />}
            >
              <Stack gap="md">
                {visibilityField}

                <TextInput
                  label={t.music.searchYoutube}
                  placeholder={t.music.searchYoutubePlaceholder}
                  value={query}
                  onChange={(e) => setQuery(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void doSearch()}
                  leftSection={<IconBrandYoutube size={16} />}
                  rightSection={searching ? <Loader size={18} /> : null}
                />

                {searchAlert ? (
                  <Alert color="yellow" icon={<IconAlertTriangle size={18} />}>
                    {t.music.searchUnavailable}
                  </Alert>
                ) : null}

                {/*
                  O campo de link é uma alternativa para quem já sabe qual é o
                  vídeo. Fica atrás de um switch para não competir com a busca,
                  que é o caminho normal.
                */}
                <Switch
                  checked={manualLink}
                  onChange={(e) => setManualLink(e.currentTarget.checked)}
                  label={t.music.manualLinkLabel}
                  description={t.music.manualLinkHint}
                  size={isMobile ? 'md' : 'sm'}
                  color="gray"
                />

                {manualLink ? (
                  <TextInput
                    label={t.music.youtubeUrlLabel}
                    placeholder={t.music.youtubeUrlPlaceholder}
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.currentTarget.value)}
                    onKeyDown={(e) => e.key === 'Enter' && pickByUrl(2)}
                    leftSection={<IconLink size={15} />}
                    rightSection={
                      <Button
                        size="compact-xs"
                        variant="subtle"
                        onClick={() => pickByUrl(2)}
                        disabled={!youtubeUrl.trim()}
                      >
                        Ok
                      </Button>
                    }
                  />
                ) : null}
              </Stack>
            </Stepper.Step>

            {/* ---------------------------------------- Etapa 2: escolher */}
            <Stepper.Step
              label={t.music.stepPick}
              description={isMobile ? undefined : t.music.stepPickDesc}
              icon={<IconPlayerPlay size={isMobile ? 15 : 18} />}
            >
              <Stack gap="md">
                {results.length > 0 ? (
                  <>
                    <Text size="sm" fw={600}>
                      {t.music.searchYoutube}
                    </Text>
                    {/*
                      `SimpleGrid` com colunas responsivas: dois cards 16:9 por
                      linha no celular, abrindo para 4 no desktop sem trocar de
                      componente.
                    */}
                    <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="xs">
                      {results.map((r) => {
                        const isPicked = r.youtube_id === youtubeId.trim();
                        return (
                          <Card
                            key={r.youtube_id}
                            withBorder
                            padding="xs"
                            radius="md"
                            role="button"
                            tabIndex={0}
                            aria-pressed={isPicked}
                            onClick={() => useResult(r)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                useResult(r);
                              }
                            }}
                            style={{
                              cursor: 'pointer',
                              // Borda primária no card escolhido: a seleção
                              // precisa ficar óbvia sem depender só da miniatura.
                              borderColor: isPicked
                                ? 'var(--mantine-primary-color-filled)'
                                : undefined,
                            }}
                          >
                            <Card.Section>
                              <AspectRatio ratio={16 / 9} bg="gray.1">
                                {r.thumbnail_url ? (
                                  <Image
                                    src={r.thumbnail_url}
                                    alt={r.title}
                                    fit="cover"
                                  />
                                ) : null}
                              </AspectRatio>
                            </Card.Section>
                            <Stack gap={2} mt={6}>
                              {isPicked ? (
                                <Badge size="xs" variant="filled">
                                  {t.music.selectedBadge}
                                </Badge>
                              ) : null}
                              <Text size="xs" fw={600} lineClamp={2}>
                                {r.title}
                              </Text>
                              <Text size="xs" c="dimmed" truncate>
                                {r.channel_name} {r.duration ? `• ${r.duration}` : ''}
                              </Text>
                            </Stack>
                          </Card>
                        );
                      })}
                    </SimpleGrid>
                  </>
                ) : null}

                {/* Confirmação do vídeo escolhido na etapa 1. */}
                {hasValidYoutubeId ? (
                  <Paper withBorder p="sm">
                    <Group gap="sm" wrap="nowrap" align="flex-start">
                      <Box
                        w={isMobile ? 112 : 144}
                        style={{ flexShrink: 0, borderRadius: 6, overflow: 'hidden' }}
                      >
                        <AspectRatio ratio={16 / 9}>
                          <Image
                            src={
                              thumbnailUrl ||
                              `https://i.ytimg.com/vi/${youtubeId.trim()}/hqdefault.jpg`
                            }
                            alt={t.music.thumbnailPreview}
                            fit="cover"
                          />
                        </AspectRatio>
                      </Box>
                      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                        <Badge size="xs" variant="filled" w="fit-content">
                          {t.music.selectedBadge}
                        </Badge>
                        <Text size="sm" fw={600} lineClamp={2}>
                          {title || youtubeId}
                        </Text>
                        <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>
                          {youtubeId}
                        </Text>
                        <Group gap={4} mt={4}>
                          <Tooltip label={t.music.openYoutube}>
                            <ActionIcon
                              variant="subtle"
                              component="a"
                              href={`https://www.youtube.com/watch?v=${youtubeId.trim()}`}
                              target="_blank"
                              rel="noreferrer"
                              size="sm"
                              aria-label={t.music.openYoutube}
                            >
                              <IconExternalLink size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Stack>
                    </Group>
                  </Paper>
                ) : null}

                {/* Vazio: orienta o próximo passo em vez de repetir a busca. */}
                {!hasValidYoutubeId && results.length === 0 ? (
                  <Paper withBorder p="lg">
                    <Stack gap={4} align="center">
                      <IconInfoCircle size={22} />
                      <Text size="sm" c="dimmed" ta="center">
                        {t.music.stepPickPrompt}
                      </Text>
                    </Stack>
                  </Paper>
                ) : null}
              </Stack>
            </Stepper.Step>

            {/* --------------------------------------- Etapa 3: detalhes */}
            <Stepper.Step
              label={t.music.stepInfo}
              description={isMobile ? undefined : t.music.stepInfoDesc}
              icon={<IconInfoCircle size={isMobile ? 15 : 18} />}
            >
              <Stack gap="md">
                {videoFields}

                {checkingExisting ? (
                  <Group gap={6}>
                    <Loader size={16} />
                    <Text size="sm" c="dimmed">
                      {t.music.checkingCatalog}
                    </Text>
                  </Group>
                ) : null}

                {existingSong ? (
                  <Alert color="blue" icon={<IconMusic size={18} />}>
                    {t.music.foundExisting.replace('{title}', existingSong.title)}
                  </Alert>
                ) : null}

                {chordsCounter}
                {metadataFields}
              </Stack>
            </Stepper.Step>
          </Stepper>

          {/*
            Navegação fora do `Stepper.Step`: cada etapa tem altura própria, e um
            rodapé dentro do passo sumiria junto com a etapa anterior. O mesmo
            rodapé atende a edição, que só tem Cancelar e Salvar.
          */}
          <Group justify="space-between" mt="xl" wrap="nowrap">
            <Button
              variant="default"
              onClick={() =>
                editing || activeStep === 0 ? onClose() : setActiveStep((s) => s - 1)
              }
              style={isMobile ? { minHeight: TOUCH_TARGET } : undefined}
            >
              {editing || activeStep === 0 ? t.common.cancel : t.common.back}
            </Button>

            {!editing && activeStep === 0 ? (
              <Button
                onClick={() => void doSearch()}
                loading={searching}
                disabled={!query.trim()}
                style={isMobile ? { minHeight: TOUCH_TARGET } : undefined}
              >
                {t.music.searchYoutube}
              </Button>
            ) : !editing && activeStep === 1 ? (
              <Button
                onClick={() => setActiveStep(2)}
                disabled={!hasValidYoutubeId}
                style={isMobile ? { minHeight: TOUCH_TARGET } : undefined}
              >
                {t.common.next}
              </Button>
            ) : (
              <Button
                leftSection={<IconDeviceFloppy size={16} />}
                loading={saving}
                onClick={save}
                disabled={!title.trim() || !youtubeId.trim()}
                style={isMobile ? { minHeight: TOUCH_TARGET } : undefined}
              >
                {editing ? t.common.save : t.music.addSong}
              </Button>
            )}
          </Group>
        </>
      )}
    </Modal>
  );
}
