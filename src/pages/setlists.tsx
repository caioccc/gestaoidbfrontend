import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Pagination,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import { notifications } from '@mantine/notifications';
import { MonthPickerInput } from '@mantine/dates';
import Autoplay from 'embla-carousel-autoplay';
import {
  IconBrandWhatsapp,
  IconEdit,
  IconLayoutGrid,
  IconList,
  IconMusic,
  IconPencil,
  IconPlayerPlay,
  IconPlayerPlayFilled,
  IconPlus,
  IconTable,
  IconTrash,
} from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import SetlistsModal from '../components/SetlistsModal';
import SetlistShareModal from '../components/SetlistShareModal';
import { useLanguage } from '../i18n';
import type { SupportedLocale } from '../i18n';
import { useAuth, useRoleHelpers } from '../contexts/AuthContext';
import { musicApi } from '../api/music';
import { formatMusicalKey } from '../utils/format';
import type { Band, BandSetlist, BandSetlistItem } from '../types';

type SetlistViewMode = 'gallery' | 'list' | 'table';

const PAGE_SIZE = 10;
const VIEW_MODE_STORAGE_KEY = 'gestao_idb_setlists_view_mode';

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function isSetlistViewMode(value: string | null): value is SetlistViewMode {
  return value === 'gallery' || value === 'list' || value === 'table';
}

function formatDateLabel(iso: string, locale: SupportedLocale): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function sortedItems(setlist: BandSetlist): BandSetlistItem[] {
  return [...setlist.items].sort((a, b) => a.order - b.order);
}

function songThumbnail(item: BandSetlistItem): string | null {
  if (item.song_thumbnail_url) return item.song_thumbnail_url;
  if (item.song_youtube_id) {
    return `https://i.ytimg.com/vi/${item.song_youtube_id}/hqdefault.jpg`;
  }
  return null;
}

function PlaySetlistButton({ setlist }: { setlist: BandSetlist }) {
  const { t } = useLanguage();
  const router = useRouter();
  const hasSongs = setlist.items.length > 0;
  const tooltip = hasSongs ? t.music.setlistPlay : t.music.setlistPlayEmptyTip;
  return (
    <Tooltip label={tooltip}>
      <span>
        <Button
          size="xs"
          variant="filled"
          color={hasSongs ? 'blue' : 'gray'}
          disabled={!hasSongs}
          onClick={() => void router.push(`/setlists/${setlist.id}/play`)}
        >
          <IconPlayerPlayFilled size={16} />
        </Button>
      </span>
    </Tooltip>
  );
}

function SetlistActions({
  setlist,
  canEdit,
  canDelete,
  onEdit,
  onShare,
  onDelete,
}: {
  setlist: BandSetlist;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (s: BandSetlist) => void;
  onShare: (s: BandSetlist) => void;
  onDelete: (s: BandSetlist) => void;
}) {
  const { t } = useLanguage();
  return (
    <Group gap={2} wrap="nowrap">
      <Tooltip label={t.music.setlistShare}>
        <ActionIcon
          variant="subtle"
          color="green"
          size="sm"
          aria-label={t.music.setlistShare}
          onClick={() => onShare(setlist)}
        >
          <IconBrandWhatsapp size={14} />
        </ActionIcon>
      </Tooltip>
      {canEdit ? (
        <Tooltip label={t.music.editSetlist}>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            aria-label={t.music.editSetlist}
            onClick={() => onEdit(setlist)}
          >
            <IconPencil size={14} />
          </ActionIcon>
        </Tooltip>
      ) : null}
      {canDelete ? (
        <Tooltip label={t.common.delete}>
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            aria-label={t.common.delete}
            onClick={() => onDelete(setlist)}
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Tooltip>
      ) : null}
    </Group>
  );
}

function SetlistSlideMedia({ item, priority }: { item: BandSetlistItem; priority: boolean }) {
  const [failed, setFailed] = useState(false);
  const thumbnail = songThumbnail(item);

  if (!thumbnail || failed) {
    return (
      <Center
        h="100%"
        px="md"
        style={{
          background: 'linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-indigo-5))',
        }}
      >
        <Stack gap={4} align="center">
          <IconMusic size={30} color="white" />
          <Text c="white" size="sm" fw={600} ta="center" lineClamp={2}>
            {item.song_title}
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Box h="100%" style={{ position: 'relative', overflow: 'hidden' }}>
      <Box
        component="img"
        src={thumbnail}
        alt={item.song_title}
        loading={priority ? 'eager' : 'lazy'}
        onError={() => setFailed(true)}
        h="100%"
        w="100%"
        style={{ objectFit: 'cover', display: 'block' }}
      />
      <Box
        pos="absolute"
        inset={0}
        p="xs"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          background: 'linear-gradient(transparent 55%, rgba(0, 0, 0, 0.72))',
          pointerEvents: 'none',
        }}
      >
        <Text c="white" size="xs" fw={600} lineClamp={1}>
          {item.song_artist || item.song_title}
        </Text>
      </Box>
    </Box>
  );
}

function SetlistCarousel({ setlist, height }: { setlist: BandSetlist; height: number }) {
  const { t } = useLanguage();
  const autoplay = useRef(
    Autoplay({
      delay: 3500 + (setlist.id % 4) * 300,
      stopOnMouseEnter: true,
      stopOnFocusIn: true,
    }),
  );
  const items = sortedItems(setlist);

  if (items.length === 0) {
    return (
      <Center
        h={height}
        style={{ background: 'var(--mantine-color-gray-1)' }}
      >
        <Stack gap={4} align="center">
          <IconMusic size={26} color="var(--mantine-color-dimmed)" />
          <Text c="dimmed" size="xs">{t.music.setlistEmpty}</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Box h={height} style={{ overflow: 'hidden' }}>
      <Carousel
        height="100%"
        slideSize="100%"
        emblaOptions={{ align: 'start', loop: items.length > 1 }}
        plugins={items.length > 1 ? [autoplay.current] : []}
        withControls={false}
        withIndicators={items.length > 1}
        aria-label={setlist.description}
      >
        {items.map((item, index) => (
          <Carousel.Slide key={item.id} h="100%">
            <SetlistSlideMedia item={item} priority={index === 0} />
          </Carousel.Slide>
        ))}
      </Carousel>
    </Box>
  );
}

function SetlistGalleryCard({
  setlist,
  onEdit,
  onShare,
  onDelete,
}: {
  setlist: BandSetlist;
  onEdit: (s: BandSetlist) => void;
  onShare: (s: BandSetlist) => void;
  onDelete: (s: BandSetlist) => void;
}) {
  const { t, locale } = useLanguage();
  const items = sortedItems(setlist);

  return (
    <Card
      withBorder
      radius="lg"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: 0,
      }}
    >
      <SetlistCarousel setlist={setlist} height={176} />
      <Stack p="md" gap="sm" style={{ flex: 1 }}>
        <Group align="flex-start" justify="space-between" wrap="nowrap" gap="sm">
          <Box style={{ minWidth: 0 }}>
            <Text fw={700} size="lg" truncate>{setlist.description}</Text>
            <Text c="dimmed" size="sm">{formatDateLabel(setlist.date, locale)}</Text>
          </Box>
          <Badge variant="light" color="gray" style={{ flexShrink: 0 }}>
            {setlist.items.length} {t.music.songCountLabel}
          </Badge>
        </Group>
        <Group gap={6}>
          {setlist.theme ? <Badge variant="light">{setlist.theme}</Badge> : null}
          {setlist.band_name ? (
            <Badge variant="dot" color={setlist.band_color}>{setlist.band_name}</Badge>
          ) : null}
        </Group>
        <Text size="xs" c="dimmed" truncate>
          {t.music.setlistCreatedBy}: {setlist.created_by_name || '—'}
        </Text>
        <Stack gap={2} style={{ flex: 1 }}>
          {items.slice(0, 3).map((item) => (
            <Text key={item.id} size="xs" c="dimmed" truncate>
              {item.order}. {item.song_title}
              {item.custom_key ? (
                <Text span c="grape"> ({formatMusicalKey(item.custom_key)})</Text>
              ) : ''}
            </Text>
          ))}
          {items.length > 3 ? (
            <Text size="xs" c="dimmed">+{items.length - 3} {t.music.songCountLabel}</Text>
          ) : null}
        </Stack>
        <Group justify="space-between" mt="auto" wrap="nowrap">
          <Text size="xs" c="dimmed">{setlist.band_name || t.music.noBand}</Text>
          <SetlistQuickActions
            setlist={setlist}
            onEdit={onEdit}
            onShare={onShare}
            onDelete={onDelete}
          />
        </Group>
      </Stack>
    </Card>
  );
}

function SetlistListCard({
  setlist,
  onEdit,
  onShare,
  onDelete,
}: {
  setlist: BandSetlist;
  onEdit: (s: BandSetlist) => void;
  onShare: (s: BandSetlist) => void;
  onDelete: (s: BandSetlist) => void;
}) {
  const { t, locale } = useLanguage();
  const items = sortedItems(setlist);

  return (
    <Paper withBorder radius="lg" p="md">
      <Group align="center" gap="md" wrap="wrap">
        <Box w={{ base: '100%', sm: 180 }} style={{ flexShrink: 0 }}>
          <SetlistCarousel setlist={setlist} height={104} />
        </Box>
        <Stack gap={6} style={{ flex: '1 1 280px', minWidth: 0 }}>
          <Box>
            <Text fw={700} truncate>{setlist.description}</Text>
            <Text c="dimmed" size="sm">{formatDateLabel(setlist.date, locale)}</Text>
          </Box>
          <Group gap={6}>
            {setlist.theme ? <Badge variant="light" size="sm">{setlist.theme}</Badge> : null}
            {setlist.band_name ? (
              <Badge variant="dot" color={setlist.band_color} size="sm">{setlist.band_name}</Badge>
            ) : null}
            <Badge variant="outline" color="gray" size="sm">
              {setlist.items.length} {t.music.songCountLabel}
            </Badge>
          </Group>
          <Stack gap={2}>
            {items.slice(0, 4).map((item) => (
              <Text key={item.id} size="xs" c="dimmed" truncate>
                {item.order}. {item.song_title}
                {item.custom_key ? (
                  <Text span c="grape"> ({formatMusicalKey(item.custom_key)})</Text>
                ) : ''}
              </Text>
            ))}
            {items.length > 4 ? (
              <Text size="xs" c="dimmed">+{items.length - 4} {t.music.songCountLabel}</Text>
            ) : null}
          </Stack>
          <Text size="xs" c="dimmed" truncate>
            {t.music.setlistCreatedBy}: {setlist.created_by_name || '—'}
          </Text>
        </Stack>
        <Group justify="flex-end" style={{ flex: '0 0 auto' }}>
          <SetlistQuickActions
            setlist={setlist}
            onEdit={onEdit}
            onShare={onShare}
            onDelete={onDelete}
          />
        </Group>
      </Group>
    </Paper>
  );
}

function SetlistQuickActions({
  setlist,
  onEdit,
  onShare,
  onDelete,
}: {
  setlist: BandSetlist;
  onEdit: (s: BandSetlist) => void;
  onShare: (s: BandSetlist) => void;
  onDelete: (s: BandSetlist) => void;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const hasSongs = setlist.items.length > 0;
  const canEdit = !!setlist.can_edit;
  const canDelete = !!(setlist.can_delete ?? setlist.can_edit);

  return (
    <Group gap={6} wrap="nowrap">
      <Tooltip label={hasSongs ? t.music.setlistPlay : t.music.setlistPlayEmptyTip}>
        <span>
          <ActionIcon
            variant="filled"
            color={hasSongs ? 'blue' : 'gray'}
            size="md"
            disabled={!hasSongs}
            aria-label={t.music.setlistPlay}
            onClick={() => void router.push(`/setlists/${setlist.id}/play`)}
          >
            <IconPlayerPlay size={16} />
          </ActionIcon>
        </span>
      </Tooltip>
      <Tooltip label={t.music.setlistShare}>
        <ActionIcon
          variant="light"
          color="green"
          size="md"
          aria-label={t.music.setlistShare}
          onClick={() => onShare(setlist)}
        >
          <IconBrandWhatsapp size={18} />
        </ActionIcon>
      </Tooltip>
      {canEdit ? (
        <Tooltip label={t.music.editSetlist}>
          <ActionIcon
            variant="light"
            color="gray"
            size="md"
            aria-label={t.music.editSetlist}
            onClick={() => onEdit(setlist)}
          >
            <IconEdit size={18} />
          </ActionIcon>
        </Tooltip>
      ) : null}
      {canDelete ? (
        <Tooltip label={t.common.delete}>
          <ActionIcon
            variant="light"
            color="red"
            size="md"
            aria-label={t.common.delete}
            onClick={() => onDelete(setlist)}
          >
            <IconTrash size={18} />
          </ActionIcon>
        </Tooltip>
      ) : null}
    </Group>
  );
}

function SetlistTableView({
  setlists,
  onEdit,
  onShare,
  onDelete,
}: {
  setlists: BandSetlist[];
  onEdit: (s: BandSetlist) => void;
  onShare: (s: BandSetlist) => void;
  onDelete: (s: BandSetlist) => void;
}) {
  const { t, locale } = useLanguage();

  return (
    <Paper withBorder>
      <Table.ScrollContainer minWidth={900}>
        <Table highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t.music.setlistDate}</Table.Th>
              <Table.Th>{t.music.setlistDescription}</Table.Th>
              <Table.Th>{t.music.setlistTheme}</Table.Th>
              <Table.Th>{t.music.setlistBand}</Table.Th>
              <Table.Th>{t.music.setlistSongs}</Table.Th>
              <Table.Th>{t.music.setlistCreatedBy}</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {setlists.map((setlist) => {
              const items = sortedItems(setlist);
              return (
                <Table.Tr key={setlist.id}>
                  <Table.Td>
                    <Text size="sm" fw={600}>{formatDateLabel(setlist.date, locale)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{setlist.description}</Text>
                    {items.length > 0 ? (
                      <Stack gap={2} mt={4}>
                        {items.slice(0, 3).map((item) => (
                          <Text key={item.id} size="xs" c="dimmed" truncate>
                            {item.order}. {item.song_title}
                            {item.custom_key ? (
                              <Text span c="grape"> ({formatMusicalKey(item.custom_key)})</Text>
                            ) : ''}
                          </Text>
                        ))}
                        {items.length > 3 ? (
                          <Text size="xs" c="dimmed">
                            +{items.length - 3} {t.music.songCountLabel}
                          </Text>
                        ) : null}
                      </Stack>
                    ) : null}
                  </Table.Td>
                  <Table.Td>
                    {setlist.theme ? (
                      <Badge variant="light">{setlist.theme}</Badge>
                    ) : (
                      <Text c="dimmed">—</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {setlist.band_name ? (
                      <Badge variant="dot" color={setlist.band_color}>{setlist.band_name}</Badge>
                    ) : (
                      <Text c="dimmed">—</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <IconMusic size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                      <Text size="sm">{setlist.items.length} {t.music.songCountLabel}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{setlist.created_by_name || '—'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={6} wrap="nowrap">
                      <PlaySetlistButton setlist={setlist} />
                      <SetlistActions
                        setlist={setlist}
                        canEdit={!!setlist.can_edit}
                        canDelete={!!(setlist.can_delete ?? setlist.can_edit)}
                        onEdit={onEdit}
                        onShare={onShare}
                        onDelete={onDelete}
                      />
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  );
}

export default function SetlistsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { canManageMusic } = useRoleHelpers(user);

  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [bandFilter, setBandFilter] = useState<string | null>(null);
  const [bands, setBands] = useState<Band[]>([]);
  const [setlists, setSetlists] = useState<BandSetlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<SetlistViewMode>('gallery');
  const [viewModeLoaded, setViewModeLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BandSetlist | null>(null);
  const [shareSetlist, setShareSetlist] = useState<BandSetlist | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSetlists(
        await musicApi.bandSetlists({
          month: month || undefined,
          band: bandFilter ? Number(bandFilter) : undefined,
        }),
      );
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao carregar setlists.' });
    } finally {
      setLoading(false);
    }
  }, [month, bandFilter]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (isSetlistViewMode(stored)) setViewMode(stored);
    setViewModeLoaded(true);
  }, []);

  useEffect(() => {
    if (viewModeLoaded) {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    }
  }, [viewMode, viewModeLoaded]);

  useEffect(() => {
    void musicApi.bands().then(setBands).catch(() => setBands([]));
  }, []);

  const pageItems = setlists.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (setlist: BandSetlist) => {
    if (!setlist.can_edit) return;
    setEditing(setlist);
    setModalOpen(true);
  };

  const remove = async (setlist: BandSetlist) => {
    if (!(setlist.can_delete ?? setlist.can_edit)) return;
    if (!window.confirm(t.music.deleteSetlistBody)) return;
    try {
      await musicApi.deleteBandSetlist(setlist.id);
      notifications.show({ color: 'green', message: t.music.setlistDeleted });
      void load();
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao excluir setlist.' });
    }
  };

  return (
    <AuthGuard roles={['PASTOR', 'SECRETARIA', 'LOUVOR', 'MUSICO']}>
      <Layout>
        <PageHeader title={t.music.setlistsTitle} description={t.music.setlistsSubtitle}>
          <Group gap="sm" justify="flex-end" wrap="wrap">
            <MonthPickerInput
              value={month ? `${month}-01` : null}
              onChange={(value) => {
                setMonth(value ? String(value).slice(0, 7) : '');
                setPage(1);
              }}
              placeholder={t.music.selectMonth}
              valueFormat="MMMM YYYY"
              clearable
              w={180}
              size="sm"
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
              size="sm"
            />
            <SegmentedControl
              value={viewMode}
              onChange={(value) => setViewMode(value as SetlistViewMode)}
              size="xs"
              aria-label={t.music.viewModeLabel}
              data={[
                {
                  value: 'gallery',
                  label: (
                    <Center component="span" style={{ gap: 6 }}>
                      <IconLayoutGrid size={15} />
                      {t.music.galleryView}
                    </Center>
                  ),
                },
                {
                  value: 'list',
                  label: (
                    <Center component="span" style={{ gap: 6 }}>
                      <IconList size={15} />
                      {t.music.cardsView}
                    </Center>
                  ),
                },
                {
                  value: 'table',
                  label: (
                    <Center component="span" style={{ gap: 6 }}>
                      <IconTable size={15} />
                      {t.music.tableView}
                    </Center>
                  ),
                },
              ]}
            />
            {canManageMusic ? (
              <Button leftSection={<IconPlus size={16} />} onClick={openNew} size="sm">
                {t.music.newSetlist}
              </Button>
            ) : null}
          </Group>
        </PageHeader>

        {loading ? (
          <Center py="xl"><Loader /></Center>
        ) : setlists.length === 0 ? (
          <Card withBorder p="xl">
            <Text c="dimmed">{t.music.noSetlists}</Text>
          </Card>
        ) : (
          <>
            {viewMode === 'gallery' ? (
              <SimpleGrid cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4 }} spacing="lg">
                {pageItems.map((setlist) => (
                  <SetlistGalleryCard
                    key={setlist.id}
                    setlist={setlist}
                    onEdit={openEdit}
                    onShare={(item) => setShareSetlist(item)}
                    onDelete={(item) => void remove(item)}
                  />
                ))}
              </SimpleGrid>
            ) : null}

            {viewMode === 'list' ? (
              <Stack gap="md">
                {pageItems.map((setlist) => (
                  <SetlistListCard
                    key={setlist.id}
                    setlist={setlist}
                    onEdit={openEdit}
                    onShare={(item) => setShareSetlist(item)}
                    onDelete={(item) => void remove(item)}
                  />
                ))}
              </Stack>
            ) : null}

            {viewMode === 'table' ? (
              <SetlistTableView
                setlists={pageItems}
                onEdit={openEdit}
                onShare={(item) => setShareSetlist(item)}
                onDelete={(item) => void remove(item)}
              />
            ) : null}

            {setlists.length > PAGE_SIZE ? (
              <Group justify="center" py="sm">
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={Math.max(1, Math.ceil(setlists.length / PAGE_SIZE))}
                  size="sm"
                />
              </Group>
            ) : null}
          </>
        )}

        <SetlistsModal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          editing={editing}
          onSaved={() => void load()}
        />

        <SetlistShareModal
          setlist={shareSetlist}
          onClose={() => setShareSetlist(null)}
        />
      </Layout>
    </AuthGuard>
  );
}
