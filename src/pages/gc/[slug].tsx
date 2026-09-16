import React, { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconBrandWhatsapp,
  IconBuildingChurch,
  IconMapPin,
  IconRoute,
  IconSearch,
  IconUsersGroup,
  IconX,
} from '@tabler/icons-react';
import { publicGrowthGroupsApi } from '../../api/accounts';
import type { PublicGrowthGroup, PublicGrowthGroupsPayload } from '../../api/accounts';
import { useLanguage } from '../../i18n';
import type { TranslationDict } from '../../i18n';
import type { GrowthGroupWeekday } from '../../types';

const WEEKDAY_LABELS: Record<
  GrowthGroupWeekday,
  'monday' | 'tuesday' | 'wednesday' | 'friday'
> = {
  0: 'monday',
  1: 'tuesday',
  2: 'wednesday',
  4: 'friday',
};

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function publicGroupIcon(L: any, color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${color};border:2px solid #fff;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:10px;letter-spacing:.5px;box-shadow:0 1px 4px rgba(0,0,0,.35)">GC</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
}

function publicGroupPopup(
  g: PublicGrowthGroup,
  t: TranslationDict,
  themeColor: string
): string {
  const pg = t.publicGrowthGroups;
  const lines = [
    `<b>${escapeHtml(g.name)}</b>`,
    `${escapeHtml(pg.category)}: ${escapeHtml(g.category_display || g.category)}`,
    `${escapeHtml(pg.leader)}: ${escapeHtml(g.leader_name)}`,
    `${escapeHtml(pg.schedule)}: ${escapeHtml(g.weekday_display || '')}${g.time ? ` • ${escapeHtml(g.time.slice(0, 5))}` : ''}`,
  ].filter(Boolean);
  if (g.full_address) {
    lines.push(
      `${escapeHtml(pg.address)}: ${escapeHtml(g.full_address)}`
    );
  }
  const button = (href: string, label: string, color: string) =>
    `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" style="display:inline-block;margin:6px 6px 0 0;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;color:#fff;background:${color}">${escapeHtml(label)}</a>`;
  const buttons: string[] = [];
  if (g.whatsapp_url) {
    buttons.push(
      button(
        g.whatsapp_url,
        g.is_full ? pg.talkToLeader : pg.joinGroup,
        g.is_full ? '#868e96' : '#25D366'
      )
    );
  }
  if (g.maps_url) {
    buttons.push(button(g.maps_url, pg.howToGetThere, themeColor));
  }
  return (
    lines.join('<br/>') +
    (buttons.length
      ? `<div style="margin-top:2px">${buttons.join('')}</div>`
      : '')
  );
}

function PublicGCMap({
  groups,
  center,
  themeColor,
  height,
}: {
  groups: PublicGrowthGroup[];
  center: [number, number] | null;
  themeColor: string;
  height: number;
}) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const featureRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    const init = async () => {
      if (disposed || !containerRef.current) return;
      const L = await import('leaflet');
      if (disposed || !containerRef.current) return;
      await import('leaflet/dist/leaflet.css');

      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
        center ?? [-7.199, -35.903],
        13
      );
      mapRef.current = map;
      leafletRef.current = L;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      featureRef.current = L.layerGroup().addTo(map);

      setReady(true);
      map.invalidateSize();
    };
    init();
    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        leafletRef.current = null;
        featureRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const feature = featureRef.current;
    const L = leafletRef.current;
    if (!ready || !map || !feature || !L) return;

    feature.clearLayers();

    const withCoords = groups.filter(
      (g) => g.latitude != null && g.longitude != null
    );

    withCoords.forEach((g) => {
      const lat = g.latitude as number;
      const lng = g.longitude as number;
      const marker = L.marker([lat, lng], {
        icon: publicGroupIcon(L, themeColor),
      });
      marker.bindPopup(publicGroupPopup(g, t, themeColor));
      marker.addTo(feature);

      if (g.radius_meters && g.radius_meters > 0) {
        L.circle([lat, lng], {
          radius: g.radius_meters,
          color: themeColor,
          fillColor: themeColor,
          fillOpacity: 0.18,
          weight: 2,
        }).addTo(feature);
      }
    });

    if (withCoords.length > 0) {
      map.fitBounds(
        L.latLngBounds(
          withCoords.map((g) => [g.latitude, g.longitude] as [number, number])
        ).pad(0.3),
        { maxZoom: 15 }
      );
    }
  }, [ready, groups, themeColor, t]);

  return (
    <Box
      data-testid="gc-public-map"
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: 12, zIndex: 0 }}
    />
  );
}

export default function PublicGrowthGroupsPage() {
  const { t } = useLanguage();
  const { colorScheme } = useMantineColorScheme();
  const router = useRouter();
  const slug = typeof router.query.slug === 'string' ? router.query.slug : '';

  const [data, setData] = useState<PublicGrowthGroupsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [weekdayFilter, setWeekdayFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const isMobile = useMediaQuery('(max-width: 768px)');
  const isDesktop = useMediaQuery('(min-width: 992px)');
  const mapHeight = isMobile ? 320 : 520;

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setError(false);
    publicGrowthGroupsApi
      .get(slug)
      .then((payload) => {
        if (active) setData(payload);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const weekdayLabel = (g: PublicGrowthGroup) => {
    if (g.weekday_display) return g.weekday_display;
    const key = WEEKDAY_LABELS[g.weekday as GrowthGroupWeekday];
    return key ? t.growthGroups[key] : '';
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.growth_groups.filter((g) => {
      if (weekdayFilter && weekdayLabel(g) !== weekdayFilter) return false;
      if (
        categoryFilter &&
        (g.category_display || g.category) !== categoryFilter
      )
        return false;
      if (!q) return true;
      const hay = [g.name, g.leader_name, g.host_name, g.neighborhood, g.city]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, search, weekdayFilter, categoryFilter]);

  const weekdayOptions = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];
    data.growth_groups.forEach((g) => {
      const label = weekdayLabel(g);
      if (label && !seen.has(label)) {
        seen.add(label);
        options.push({ value: label, label });
      }
    });
    return options;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const categoryOptions = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];
    data.growth_groups.forEach((g) => {
      const label = g.category_display || g.category;
      if (label && !seen.has(label)) {
        seen.add(label);
        options.push({ value: label, label });
      }
    });
    return options;
  }, [data]);

  const anyCoordinates = data?.growth_groups.some(
    (g) => g.latitude != null && g.longitude != null
  );
  const mapCenter: [number, number] | null = (() => {
    const g = data?.growth_groups.find(
      (x) => x.latitude != null && x.longitude != null
    );
    return g ? [g.latitude as number, g.longitude as number] : null;
  })();

  const themeColor = data?.church.theme_color || '#1c7ed6';
  const title = data
    ? `${t.publicGrowthGroups.headerPrefix} — ${data.church.name}`
    : t.publicGrowthGroups.title;

  const renderList = () =>
    filtered.length === 0 ? (
      <Box py="xl">
        <Text c="dimmed" ta="center">
          {t.publicGrowthGroups.noResults}
        </Text>
      </Box>
    ) : (
      <Stack gap="sm">
        {filtered.map((g) => (
          <Card
            key={g.id}
            withBorder
            radius="md"
            data-testid={`gc-public-card-${g.id}`}
          >
            <Stack gap="xs">
              <Group
                justify="space-between"
                gap="xs"
                align="flex-start"
                wrap="nowrap"
              >
                <Text fw={600} lineClamp={2} style={{ flex: 1 }}>
                  {g.name}
                </Text>
                {g.is_full && (
                  <Badge
                    color="red"
                    variant="light"
                    size="sm"
                    leftSection={<IconUsersGroup size={12} />}
                    style={{ flexShrink: 0 }}
                  >
                    {t.publicGrowthGroups.groupFull}
                  </Badge>
                )}
              </Group>

              <Group gap={6} wrap="wrap">
                <Badge variant="light" color="blue" size="sm">
                  {g.category_display || g.category}
                </Badge>
                {weekdayLabel(g) && (
                  <Badge variant="light" size="sm">
                    {weekdayLabel(g)}
                  </Badge>
                )}
                {g.time ? (
                  <Text size="sm" c="dimmed">
                    {g.time.slice(0, 5)}
                  </Text>
                ) : null}
              </Group>

              <Stack gap={4}>
                <Text size="sm">
                  <Text component="span" fw={600} c="dimmed">
                    {t.publicGrowthGroups.leader}:{' '}
                  </Text>
                  {g.leader_name}
                </Text>
                {g.host_name ? (
                  <Text size="sm">
                    <Text component="span" fw={600} c="dimmed">
                      {t.publicGrowthGroups.host}:{' '}
                    </Text>
                    {g.host_name}
                  </Text>
                ) : null}
              </Stack>

              <Text size="sm" c="dimmed">
                <Text component="span" fw={600} c="dark">
                  {t.publicGrowthGroups.address}:{' '}
                </Text>
                {g.full_address ||
                  [g.neighborhood, g.city, g.state].filter(Boolean).join(', ')}
              </Text>

              {g.latitude == null || g.longitude == null ? (
                <Group gap={4} wrap="nowrap">
                  <IconMapPin
                    size={12}
                    style={{ color: 'var(--mantine-color-dimmed)' }}
                  />
                  <Text size="xs" c="dimmed">
                    {t.publicGrowthGroups.noCoordinates}
                  </Text>
                </Group>
              ) : null}

              {(g.whatsapp_url || g.maps_url) && (
                <Group gap="sm" grow wrap="wrap">
                  {g.whatsapp_url && (
                    <Button
                      color={g.is_full ? 'gray' : 'green'}
                      variant={g.is_full ? 'light' : 'filled'}
                      leftSection={<IconBrandWhatsapp size={16} />}
                      component="a"
                      href={g.whatsapp_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {g.is_full
                        ? t.publicGrowthGroups.talkToLeader
                        : t.publicGrowthGroups.joinGroup}
                    </Button>
                  )}
                  {g.maps_url && (
                    <Button
                      variant="default"
                      leftSection={<IconRoute size={16} />}
                      component="a"
                      href={g.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t.publicGrowthGroups.howToGetThere}
                    </Button>
                  )}
                </Group>
              )}
            </Stack>
          </Card>
        ))}
      </Stack>
    );

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
      </Head>
      <Box
        style={{
          minHeight: '100vh',
          background: `linear-gradient(180deg, ${themeColor} 0%, ${
            colorScheme === 'dark' ? '#1A1B1E' : '#f8f9fa'
          } 38%)`,
        }}
      >
        {loading && (
          <Center h="60vh">
            <Loader size="lg" color="white" />
          </Center>
        )}

        {error && (
          <Center h="70vh">
            <Stack align="center" gap="xs">
              <IconBuildingChurch size={40} style={{ color: '#f8f9fa' }} />
              <Text c="white" fw={600}>
                {t.publicGrowthGroups.notFound}
              </Text>
            </Stack>
          </Center>
        )}

        {data && (
          <Box pb="xl">
            <Stack align="center" pt="xl" pb="lg" px="md" gap="md">
              <Stack align="center" gap="xs" mb="xs">
                {data.church.logo ? (
                  <Avatar src={data.church.logo} size={64} radius="xl" />
                ) : (
                  <Avatar size={64} radius="xl" color={themeColor}>
                    <IconBuildingChurch size={32} color="#fff" />
                  </Avatar>
                )}
                <Title
                  order={2}
                  c="white"
                  ta="center"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}
                >
                  {data.church.name}
                </Title>
                <Text
                  c="white"
                  size="sm"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                >
                  {data.church.city} — {data.church.state}
                </Text>
              </Stack>
            </Stack>

            <Box maw={1180} mx="auto" px="md" style={{ width: '100%' }}>
              <Stack gap="md">
                <Paper withBorder radius="md" p="md" shadow="xs">
                  <Stack gap="sm">
                    <TextInput
                      data-testid="gc-public-search"
                      placeholder={t.publicGrowthGroups.searchPlaceholder}
                      leftSection={<IconSearch size={16} />}
                      value={search}
                      onChange={(e) => setSearch(e.currentTarget.value)}
                    />
                    <Stack gap={6}>
                      <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                        {t.publicGrowthGroups.filters}
                      </Text>
                      <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        <Select
                          data-testid="gc-public-weekday"
                          clearable
                          placeholder={t.publicGrowthGroups.allWeekdays}
                          data={weekdayOptions}
                          value={weekdayFilter}
                          onChange={setWeekdayFilter}
                        />
                        <Select
                          data-testid="gc-public-category"
                          clearable
                          placeholder={t.publicGrowthGroups.allCategories}
                          data={categoryOptions}
                          value={categoryFilter}
                          onChange={setCategoryFilter}
                        />
                      </SimpleGrid>
                    </Stack>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">
                        {t.publicGrowthGroups.gcCount.replace(
                          '{count}',
                          String(filtered.length)
                        )}
                      </Text>
                      {(search || weekdayFilter || categoryFilter) && (
                        <Button
                          size="xs"
                          variant="subtle"
                          color="gray"
                          leftSection={<IconX size={14} />}
                          onClick={() => {
                            setSearch('');
                            setWeekdayFilter(null);
                            setCategoryFilter(null);
                          }}
                        >
                          {t.common.clear}
                        </Button>
                      )}
                    </Group>
                  </Stack>
                </Paper>

                {anyCoordinates ? (
                  <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                    <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                      <PublicGCMap
                        groups={filtered}
                        center={mapCenter}
                        themeColor={themeColor}
                        height={mapHeight}
                      />
                    </Paper>
                    <Box
                      style={{
                        maxHeight: isDesktop ? mapHeight : undefined,
                        overflowY: isDesktop ? 'auto' : 'visible',
                        paddingRight: isDesktop ? 6 : 0,
                      }}
                    >
                      {renderList()}
                    </Box>
                  </SimpleGrid>
                ) : (
                  <Stack gap="md">
                    <Paper withBorder radius="md" p="lg">
                      <Center>
                        <Stack align="center" gap={6}>
                          <IconMapPin
                            size={28}
                            style={{ color: 'var(--mantine-color-dimmed)' }}
                          />
                          <Text size="sm" c="dimmed">
                            {t.publicGrowthGroups.mapNotice}
                          </Text>
                        </Stack>
                      </Center>
                    </Paper>
                    {renderList()}
                  </Stack>
                )}
              </Stack>
            </Box>
          </Box>
        )}
      </Box>
    </>
  );
}