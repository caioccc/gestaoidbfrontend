import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconBrandYoutube,
  IconDeviceFloppy,
  IconExternalLink,
  IconSearch,
  IconStack2,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { musicApi } from '../api/music';
import { useLanguage } from '../i18n';
import { useIsCompactList } from '../hooks/useListBreakpoint';
import type { Band, SongPayload, YouTubeSearchResult } from '../types';

interface SongsBulkAddModalProps {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/** Uma linha da tabela de selecionados. A chave é o próprio `youtube_id`
 *  (o id do YouTube é o identificador natural e o model não tem unicidade
 *  em `youtube_id`), o que também faz a seleção deduplicar sozinha entre
 *  buscas: buscar de novo não pode derrubar o que já foi escolhido. */
type BulkRow = {
  key: string;
  youtube_id: string;
  title: string;
  artist: string;
  thumbnail_url: string;
  church_key: string;
  band: number | null;
  tags: string;
  /** Já existe no catálogo de outra igreja — campos pré-preenchidos. */
  prefilled: boolean;
  /** Já está no repertório desta igreja: não vale a pena levar. */
  duplicate: boolean;
};

const MAX_IDS_PER_PREFILL = 50;

const youtubeUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

const thumbnailFor = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

const extractId = (raw: string): string | null => {
  const match = raw.trim().match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  const id = match ? match[1] : raw.trim();
  return /^[\w-]{11}$/.test(id) ? id : null;
};

export default function SongsBulkAddModal({ opened, onClose, onSaved }: SongsBulkAddModalProps) {
  const { t } = useLanguage();
  const isCompact = useIsCompactList();

  const [bands, setBands] = useState<Band[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchAlert, setSearchAlert] = useState(false);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failedRows, setFailedRows] = useState<Record<string, string>>({});
  const [linkValue, setLinkValue] = useState('');

  /** Padrões aplicados às próximas linhas (o que o ADMIN está fazendo em
   *  lote) e/ou a todas as que já estão na tabela. */
  const [defaultKey, setDefaultKey] = useState('');
  const [defaultBand, setDefaultBand] = useState<string | null>(null);
  const [defaultTags, setDefaultTags] = useState('');

  const selectedIds = useMemo(
    () => new Set(rows.map((row) => row.youtube_id)),
    [rows],
  );

  const reset = useCallback(() => {
    setResults([]);
    setRows([]);
    setFailedRows({});
    setLinkValue('');
    setSearchAlert(false);
    setDefaultKey('');
    setDefaultBand(null);
    setDefaultTags('');
  }, []);

  useEffect(() => {
    if (!opened) return;
    reset();
    void musicApi.bands().then(setBands).catch(() => setBands([]));
  }, [opened, reset]);

  const doSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchAlert(false);
    try {
      const data = await musicApi.youtubeSearch(q);
      if (data.status === 'unavailable') {
        setSearchAlert(true);
        return;
      }
      setResults(data.results);
    } catch {
      setSearchAlert(true);
    } finally {
      setSearching(false);
    }
  };

  /** Verifica quais das linhas recém-entradas já existem no catálogo da
   *  denominação (outra igreja) e preenche o que estiver vazio — é o
   *  mesmo propósito do `check-youtube` do modal unitário, em uma única
   *  requisição por lote de seleção. */
  const precheck = async (rowsToCheck: BulkRow[]) => {
    const ids = rowsToCheck
      .map((row) => row.youtube_id)
      .filter((id, index, all) => id && all.indexOf(id) === index)
      .slice(0, MAX_IDS_PER_PREFILL);
    if (!ids.length) return;
    setChecking(true);
    try {
      const { found } = await musicApi.checkYoutubeBulk(ids);
      const entries = Object.entries(found ?? {});
      if (!entries.length) return;
      const byId = new Map(entries.map(([id, data]) => [id, data]));
      setRows((current) =>
        current.map((row) => {
          const data = byId.get(row.youtube_id);
          if (!data || row.prefilled) return row;
          // Já está no repertório desta igreja: o bulk-create vai ignorar
          // a linha, então ela não é "pré-cadastro aproveitável" — é
          // repetida, e o rótulo precisa dizer isso.
          if (data.same_church) {
            return { ...row, duplicate: true, prefilled: true };
          }
          return {
            ...row,
            prefilled: true,
            title: row.title.trim() || data.title || '',
            artist: row.artist.trim() || data.artist || '',
            thumbnail_url: row.thumbnail_url || data.thumbnail_url || '',
            church_key: row.church_key.trim() || data.church_key || data.original_key || '',
            tags: row.tags.trim() || data.tags || '',
          };
        }),
      );
    } catch {
      // Pré-cadastro é otimização: se falhar, as linhas seguem com o que veio
      // da busca e o worker processa normalmente.
    } finally {
      setChecking(false);
    }
  };

  const buildRow = useCallback(
    (result: YouTubeSearchResult): BulkRow => ({
      key: result.youtube_id,
      youtube_id: result.youtube_id,
      title: result.title ?? '',
      artist: result.channel_name ?? '',
      thumbnail_url: result.thumbnail_url || thumbnailFor(result.youtube_id),
      church_key: defaultKey,
      band: defaultBand ? Number(defaultBand) : null,
      tags: defaultTags,
      prefilled: false,
      duplicate: false,
    }),
    [defaultBand, defaultKey, defaultTags],
  );

  const addRows = useCallback(
    (incoming: BulkRow[]) => {
      const fresh = incoming.filter((row) => !selectedIds.has(row.youtube_id));
      if (!fresh.length) return;
      setRows((current) => [...current, ...fresh]);
      void precheck(fresh);
    },
    [precheck, selectedIds],
  );

  const addResults = (incoming: YouTubeSearchResult[]) => {
    const fresh = incoming.filter((r) => !selectedIds.has(r.youtube_id));
    addRows(fresh.map(buildRow));
  };

  const toggleResult = (result: YouTubeSearchResult) => {
    const row = buildRow(result);
    setRows((current) => {
      if (selectedIds.has(row.youtube_id)) {
        return current.filter((item) => item.key !== row.key);
      }
      return [...current, row];
    });
    if (!selectedIds.has(row.youtube_id)) void precheck([row]);
  };

  const removeRow = (key: string) => {
    setRows((current) => current.filter((row) => row.key !== key));
    setFailedRows(({ [key]: _removed, ...rest }) => rest);
  };

  const clearRows = () => {
    setRows([]);
    setFailedRows({});
  };

  const patchRow = (key: string, patch: Partial<BulkRow>) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  /** Aplica um mesmo valor a todas as linhas (inclusive as que já estavam na
   *  tabela quando o valor foi escolhido). */
  const applyToAll = (patch: Partial<BulkRow>) => {
    setRows((current) => current.map((row) => ({ ...row, ...patch })));
  };

  const addByLink = () => {
    const id = extractId(linkValue);
    if (!id) {
      notifications.show({ color: 'red', message: t.music.bulkInvalidLink });
      return;
    }
    if (selectedIds.has(id)) {
      notifications.show({ color: 'yellow', message: t.music.bulkAlreadySelected });
      return;
    }
    addRows([
      {
        key: id,
        youtube_id: id,
        title: '',
        artist: '',
        thumbnail_url: thumbnailFor(id),
        church_key: defaultKey,
        band: defaultBand ? Number(defaultBand) : null,
        tags: defaultTags,
        prefilled: false,
        duplicate: false,
      },
    ]);
    setLinkValue('');
  };

  const save = async () => {
    if (!rows.length) return;
    setSaving(true);
    const payload: SongPayload[] = rows.map((row) => ({
      title: row.title.trim(),
      artist: row.artist.trim(),
      band: row.band,
      youtube_id: row.youtube_id.trim(),
      thumbnail_url: row.thumbnail_url.trim(),
      church_key: row.church_key.trim(),
      time_signature: '4/4',
      tags: row.tags.trim(),
      is_private: false,
    }));
    try {
      const res = await musicApi.bulkCreateSongs(payload);
      const { created = 0, skipped = 0, failed = 0 } = res ?? {};
      const notes: string[] = [
        t.music.bulkSaved.replace('{count}', String(created)),
      ];
      if (skipped > 0) notes.push(t.music.bulkSkipped.replace('{count}', String(skipped)));
      if (failed > 0) notes.push(t.music.bulkFailed.replace('{count}', String(failed)));

      if (created > 0) {
        notifications.show({ color: 'green', message: notes.join(' · ') });
      } else {
        notifications.show({ color: 'yellow', message: notes.join(' · ') });
      }

      if (failed > 0) {
        // Mantém só as linhas que falharam, para o ADMIN corrigir e reenviar
        // sem redigitar o lote inteiro. As criadas saem da tabela (a lista da
        // página é recarregada) e o modal continua aberto para o ajuste.
        const errors: Record<string, string> = {};
        const keep: BulkRow[] = [];
        (res?.results ?? []).forEach((item) => {
          if (item.status !== 'failed') return;
          const row = rows[item.index];
          if (!row) return;
          keep.push(row);
          errors[row.key] = firstError(item.errors) ?? '';
        });
        setRows(keep);
        setFailedRows(errors);
        notifications.show({ color: 'red', message: t.music.bulkFixRows });
        if (created > 0) onSaved();
        return;
      }

      onSaved();
      onClose();
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const detail = (data?.detail ?? data?.songs) as string | string[] | undefined;
      notifications.show({
        color: 'red',
        message: Array.isArray(detail) ? detail[0] : (detail ?? t.music.chordSaveError),
      });
    } finally {
      setSaving(false);
    }
  };

  const bandOptions = useMemo(
    () => bands.map((b) => ({ value: String(b.id), label: b.name })),
    [bands],
  );
  const allResultsSelected =
    results.length > 0 && results.every((r) => selectedIds.has(r.youtube_id));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      centered
      fullScreen={isCompact}
      title={t.music.bulkTitle}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t.music.bulkSubtitle}
        </Text>

        <Group align="flex-end" gap="xs" wrap="nowrap">
          <TextInput
            label={t.music.searchYoutube}
            placeholder={t.music.searchYoutubePlaceholder}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
onKeyDown={(e) => e.key === 'Enter' && void doSearch()}
            leftSection={<IconBrandYoutube size={16} />}
            style={{ flex: 1 }}
            rightSection={searching ? <Loader size={18} /> : null}
          />
          <Button
            variant="light"
            leftSection={<IconSearch size={16} />}
            loading={searching}
            onClick={() => void doSearch()}
          >
            {t.music.searchYoutube}
          </Button>
        </Group>

        {searchAlert ? (
          <Alert color="yellow" icon={<IconAlertTriangle size={18} />}>
            {t.music.searchUnavailable}
          </Alert>
        ) : null}

        <TextInput
          label={t.music.bulkAddByLink}
          placeholder="https://www.youtube.com/watch?v=..."
          value={linkValue}
          onChange={(e) => setLinkValue(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && addByLink()}
          rightSection={
            <Button
              size="compact-xs"
              variant="subtle"
              onClick={addByLink}
              disabled={!linkValue.trim()}
            >
              {t.common.add}
            </Button>
          }
        />

        {results.length > 0 ? (
          <Box>
            <Group justify="space-between" mb={6}>
              <Group gap="xs">
                <Checkbox
                  size="xs"
                  checked={allResultsSelected}
                  indeterminate={!allResultsSelected && results.some((r) => selectedIds.has(r.youtube_id))}
                  onChange={() => addResults(results)}
                  label={t.music.bulkSelectAll}
                  disabled={allResultsSelected}
                />
              </Group>
              <Button
                size="compact-xs"
                variant="subtle"
                leftSection={<IconStack2 size={14} />}
                onClick={() => addResults(results)}
                disabled={allResultsSelected}
              >
                {t.music.bulkAddAll}
              </Button>
            </Group>
            <ScrollArea.Autosize mah={220} type="auto">
              <Stack gap={4} pr={6}>
                {results.map((r) => {
                  const picked = selectedIds.has(r.youtube_id);
                  return (
                    <UnstyledButton
                      key={r.youtube_id}
                      onClick={() => toggleResult(r)}
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        borderRadius: 8,
                        padding: 4,
                      }}
                      data-testid={`songs-bulk-result-${r.youtube_id}`}
                    >
                      <Checkbox
                        size="sm"
                        checked={picked}
                        onChange={() => toggleResult(r)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={r.title}
                      />
                      <Box
                        style={{
                          width: 80,
                          height: 45,
                          borderRadius: 6,
                          overflow: 'hidden',
                          flexShrink: 0,
                          backgroundColor: 'var(--mantine-color-gray-2)',
                        }}
                      >
                        {r.thumbnail_url ? (
                          <img
                            src={r.thumbnail_url}
                            alt={r.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : null}
                      </Box>
                      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={600} truncate>
                          {r.title}
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                          {r.channel_name} {r.duration ? `• ${r.duration}` : ''}
                        </Text>
                      </Stack>
                    </UnstyledButton>
                  );
                })}
              </Stack>
            </ScrollArea.Autosize>
          </Box>
        ) : null}

        <Box>
          <Group justify="space-between" mb={6} wrap="wrap" gap="xs">
            <Text size="sm" fw={600}>
              {t.music.bulkSelectedTitle}
            </Text>
            <Group gap="xs" wrap="wrap">
              {checking ? (
                <Group gap={6}>
                  <Loader size={14} />
                  <Text size="xs" c="dimmed">
                    {t.music.checkingCatalog}
                  </Text>
                </Group>
              ) : null}
              <Badge color="blue" variant="light">
                {t.music.bulkSelected.replace('{count}', String(rows.length))}
              </Badge>
              <Button
                size="compact-xs"
                variant="default"
                leftSection={<IconX size={14} />}
                onClick={clearRows}
                disabled={!rows.length}
                data-testid="songs-bulk-clear"
              >
                {t.music.bulkClear}
              </Button>
            </Group>
          </Group>

          {rows.length === 0 ? (
            <Text size="sm" c="dimmed" py="md" ta="center">
              {t.music.bulkEmpty}
            </Text>
          ) : (
            <ScrollArea.Autosize mah={340} type="auto">
              <Table.ScrollContainer minWidth={980}>
                <Table verticalSpacing="xs" horizontalSpacing="xs">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th w={72} />
                      <Table.Th w={140}>{t.music.youtubeIdLabel}</Table.Th>
                      <Table.Th>{t.music.songTitleLabel}</Table.Th>
                      <Table.Th>{t.music.songArtistLabel}</Table.Th>
                      <Table.Th w={120}>{t.music.churchKeyLabel}</Table.Th>
                      <Table.Th w={180}>{t.music.bandForSong}</Table.Th>
                      <Table.Th w={170}>{t.music.tagsLabel}</Table.Th>
                      <Table.Th w={44} />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {rows.map((row) => (
                      <Table.Tr key={row.key} data-testid={`songs-bulk-row-${row.key}`}>
                        <Table.Td>
                          {row.thumbnail_url ? (
                            <Box
                              style={{
                                width: 56,
                                height: 32,
                                borderRadius: 4,
                                overflow: 'hidden',
                                backgroundColor: 'var(--mantine-color-gray-2)',
                              }}
                            >
                              <img
                                src={row.thumbnail_url}
                                alt={row.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </Box>
                          ) : null}
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4} wrap="nowrap">
                            <Text size="xs" ff="monospace" truncate>
                              {row.youtube_id}
                            </Text>
                            <Tooltip label={t.music.openYoutube}>
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                component="a"
                                href={youtubeUrl(row.youtube_id)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <IconExternalLink size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                          {row.duplicate ? (
                            <Badge size="xs" variant="light" color="orange" mt={2}>
                              {t.music.bulkAlreadyHere}
                            </Badge>
                          ) : row.prefilled ? (
                            <Badge size="xs" variant="light" color="teal" mt={2}>
                              {t.music.bulkPrefilled}
                            </Badge>
                          ) : null}
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            size="xs"
                            value={row.title}
                            placeholder={t.music.songTitlePlaceholder}
                            onChange={(e) => patchRow(row.key, { title: e.currentTarget.value })}
                            error={failedRows[row.key]}
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            size="xs"
                            value={row.artist}
                            placeholder={t.music.songArtistPlaceholder}
                            onChange={(e) => patchRow(row.key, { artist: e.currentTarget.value })}
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            size="xs"
                            value={row.church_key}
                            placeholder="C"
                            onChange={(e) =>
                              patchRow(row.key, { church_key: e.currentTarget.value })
                            }
                          />
                        </Table.Td>
                        <Table.Td>
                          <Select
                            size="xs"
                            placeholder={t.music.noBand}
                            data={bandOptions}
                            value={row.band ? String(row.band) : null}
                            onChange={(value) =>
                              patchRow(row.key, { band: value ? Number(value) : null })
                            }
                            clearable
                            searchable
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            size="xs"
                            value={row.tags}
                            placeholder="louvor, cifra"
                            onChange={(e) => patchRow(row.key, { tags: e.currentTarget.value })}
                          />
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() => removeRow(row.key)}
                            aria-label={t.music.bulkRemoveRow}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </ScrollArea.Autosize>
          )}
        </Box>

        <Group gap="xs" wrap="wrap">
          <Text size="xs" fw={600} c="dimmed">
            {t.music.bulkApplyToAll}
          </Text>
          <TextInput
            size="xs"
            label={t.music.churchKeyLabel}
            placeholder="C"
            value={defaultKey}
            onChange={(e) => setDefaultKey(e.currentTarget.value)}
            w={90}
            onBlur={(e) => {
              const value = e.currentTarget.value;
              setDefaultKey(value);
              applyToAll({ church_key: value });
            }}
          />
          <Select
            size="xs"
            label={t.music.bandForSong}
            placeholder={t.music.noBand}
            data={bandOptions}
            value={defaultBand}
            onChange={(value) => {
              setDefaultBand(value);
              applyToAll({ band: value ? Number(value) : null });
            }}
            onBlur={() =>
              applyToAll({ band: defaultBand ? Number(defaultBand) : null })
            }
            clearable
            searchable
            w={170}
          />
          <TextInput
            size="xs"
            label={t.music.tagsLabel}
            placeholder="louvor, cifra"
            value={defaultTags}
            onChange={(e) => setDefaultTags(e.currentTarget.value)}
            w={190}
            onBlur={(e) => {
              const value = e.currentTarget.value;
              setDefaultTags(value);
              applyToAll({ tags: value });
            }}
          />
        </Group>

        <Group justify="flex-end">
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            loading={saving}
            onClick={() => void save()}
            disabled={!rows.length}
            data-testid="songs-bulk-save"
          >
            {t.music.bulkSave.replace('{count}', String(rows.length))}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

/** Reduz o erro por campo devolvido pelo backend à primeira mensagem
 *  legível (mesma ideia do tratamento de erro do `SongModal`). */
function firstError(errors?: Record<string, string[] | string>): string | undefined {
  if (!errors) return undefined;
  const first = Object.entries(errors)[0];
  if (!first) return undefined;
  const [field, value] = first;
  const message = Array.isArray(value) ? value[0] : value;
  return message ? `${field}: ${message}` : undefined;
}