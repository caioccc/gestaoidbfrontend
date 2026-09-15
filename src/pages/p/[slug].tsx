import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Avatar,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCopy, IconBuildingChurch, IconExternalLink } from '@tabler/icons-react';
import { publicLinksApi } from '../../api/accounts';
import { useLanguage } from '../../i18n';
import { LinkTypeIcon } from '../../components/linkIcons';
import { copyToClipboard } from '../../utils/share';
import { buildPixPayload } from '../../utils/pix';
import QrShareCard from '../../components/QrShareCard';
import PrayerRequestPublicModal from '../../components/PrayerRequestPublicModal';
import type {
  PublicChurchLink,
  PublicChurchLinkSystem,
  PublicChurchLinksPayload,
} from '../../types';

export default function PublicLinksPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const slug = typeof router.query.slug === 'string' ? router.query.slug : '';

  const [data, setData] = useState<PublicChurchLinksPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pixLink, setPixLink] = useState<PublicChurchLink | null>(null);
  const [pixAmount, setPixAmount] = useState<string>('');
  const [pixGridSel, setPixGridSel] = useState(0);
  const [mapsLink, setMapsLink] = useState<PublicChurchLink | null>(null);
  const [prayerOpen, setPrayerOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setError(false);
    publicLinksApi
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

  const openPix = (link: PublicChurchLink) => {
    setPixLink(link);
    setPixAmount('');
    setPixGridSel(0);
    publicLinksApi.click(link.id).catch(() => undefined);
  };

  const openMaps = (link: PublicChurchLink) => {
    setMapsLink(link);
    publicLinksApi.click(link.id).catch(() => undefined);
  };

  const openPrayer = (link?: PublicChurchLink) => {
    if (link && link.id != null) {
      publicLinksApi.click(link.id).catch(() => undefined);
    }
    setPrayerOpen(true);
  };

  const renderRow = (
    link: PublicChurchLink | PublicChurchLinkSystem,
    color: string
  ) => {
    const isPix = link.link_type === 'PIX';
    const isMaps = link.link_type === 'MAPS';
    const isPrayer = link.link_type === 'PRAYER';
    const isSystem = !('id' in link);

    const content = (
      <Group gap="md" style={{ width: '100%' }}>
        <Avatar
          radius="xl"
          size={44}
          color={link.highlight ? '#fff' : color}
          styles={{
            placeholder: link.highlight
              ? { backgroundColor: '#fff', border: `2px solid ${color}` }
              : undefined,
          }}
        >
          <LinkTypeIcon
            iconKey={link.icon_key}
            size={link.highlight ? 24 : 20}
            color={link.highlight ? color : '#fff'}
          />
        </Avatar>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fw={600} size="sm" lineClamp={1} c={link.highlight ? '#fff' : undefined}>
            {link.title}
          </Text>
          {isMaps && 'address' in link && link.address ? (
            <Text
              size="xs"
              c={link.highlight ? 'rgba(255,255,255,0.85)' : 'dimmed'}
              lineClamp={1}
            >
              {link.address}
            </Text>
          ) : null}
          {'description' in link && link.description ? (
            <Text
              size="xs"
              c={link.highlight ? 'rgba(255,255,255,0.85)' : 'dimmed'}
              lineClamp={1}
            >
              {link.description}
            </Text>
          ) : null}
        </Box>
      </Group>
    );

    const buttonStyles = {
      borderRadius: 14,
      backgroundColor: link.highlight ? color : `${color}14`,
      border: link.highlight ? `2px solid ${color}` : `1px solid ${color}33`,
      boxShadow: link.highlight ? `0 4px 16px ${color}55` : undefined,
      padding: 12,
    };

    const buttonProps =
      isSystem || isPix || isMaps || isPrayer
        ? {}
        : {
            onClick: (e: React.MouseEvent) => {
              e.preventDefault();
              const stored = link as PublicChurchLink;
              publicLinksApi.click(stored.id).catch(() => undefined);
              window.open(link.url, '_blank', 'noopener,noreferrer');
            },
          };

    return (
      <Button
        key={`${isSystem ? 'sys' : 'lnk'}-${link.title}-${(link as { id?: number }).id ?? ''}`}
        variant="subtle"
        color={link.highlight ? '#fff' : color}
        h="auto"
        style={buttonStyles}
        {...(isPrayer
          ? { onClick: () => openPrayer(link as PublicChurchLink) }
          : isSystem
            ? { onClick: () => openSystemLink(link as PublicChurchLinkSystem) }
            : isPix
              ? { onClick: () => openPix(link as PublicChurchLink) }
              : isMaps
                ? { onClick: () => openMaps(link as PublicChurchLink) }
                : buttonProps)}
      >
        {content}
      </Button>
    );
  };

  const openSystemLink = (link: PublicChurchLinkSystem) => {
    window.open(link.url, '_blank', 'noopener,noreferrer');
  };

  const title = data
    ? `${data.church.name} • ${t.appTitle}`
    : `${t.appTitle} • ${t.linksPage.title}`;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
      </Head>
      <Box
        style={{
          minHeight: '100vh',
          background: `linear-gradient(180deg, ${data?.church.theme_color || '#1c7ed6'} 0%, #f8f9fa 42%)`,
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
                {t.publicLinks.error}
              </Text>
            </Stack>
          </Center>
        )}

        {data && (
          <Stack align="center" pt="xl" pb="lg" px="md" gap="md" maw={520} mx="auto" style={{ width: '100%' }}>
            <Stack align="center" gap="xs" mb="xs">
              {data.church.logo ? (
                <Avatar src={data.church.logo} size={88} radius="xl" />
              ) : (
                <Avatar size={88} radius="xl" color={data.church.theme_color}>
                  <IconBuildingChurch size={40} color="#fff" />
                </Avatar>
              )}
              <Title order={2} c="white" ta="center" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}>
                {data.church.name}
              </Title>
              <Text c="white" size="sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                {data.church.city}/{data.church.state}
              </Text>
            </Stack>

            <Stack gap="sm" style={{ width: '100%' }}>
              {[...data.system_links, ...data.links].map((link) =>
                renderRow(link, data.church.theme_color)
              )}
            </Stack>

            <Paper
              shadow="xs"
              radius="md"
              p="sm"
              mt="lg"
              withBorder
              style={{ width: '100%', borderColor: '#dee2e6' }}
            >
              <Text size="xs" c="dimmed" ta="center">
                {t.publicLinks.footer}
              </Text>
            </Paper>
          </Stack>
        )}

        <Modal
          opened={!!pixLink}
          onClose={() => setPixLink(null)}
          title={pixLink?.title}
          centered
        >
          {pixLink && (() => {
            const mode = pixLink.pix_amount_mode || 'OPEN';
            const grid = (pixLink.pix_grid_amounts || [30, 50, 100, 200]).map(Number);
            const amount =
              mode === 'FIXED'
                ? pixLink.pix_fixed_amount != null
                  ? Number(pixLink.pix_fixed_amount)
                  : null
                : mode === 'OPEN'
                  ? pixAmount.trim()
                    ? Number(pixAmount)
                    : null
                  : pixAmount.trim()
                    ? Number(pixAmount)
                    : Number(grid[pixGridSel]) > 0
                      ? grid[pixGridSel]
                      : null;

            const payload = pixLink.pix_key
              ? buildPixPayload({
                  key: pixLink.pix_key,
                  pixType: pixLink.pix_type,
                  name: data?.church.name || '',
                  city: data?.church.city || '',
                  amount,
                })
              : '';

            const copyPayload = async () => {
              if (!payload) return;
              await copyToClipboard(payload);
              notifications.show({
                color: 'green',
                message: t.linksPage.pixPayloadCopied,
              });
            };

            return (
              <Stack align="center" gap="md" py="md">
                <Stack align="center" gap={2}>
                  <Text size="xs" c="dimmed">
                    {pixLink.pix_type || t.linksPage.pixKeyLabel}
                  </Text>
                  <Text fw={700} size="lg" ta="center">
                    {pixLink.pix_key}
                  </Text>
                </Stack>

                {mode === 'FIXED' && (
                  <Text fw={600}>
                    {Number(pixLink.pix_fixed_amount) != null
                      ? `R$ ${Number(pixLink.pix_fixed_amount).toFixed(2)}`
                      : ''}
                  </Text>
                )}

                {mode === 'GRID' && (
                  <Stack gap="xs" align="center">
                    <Group gap={6} justify="center">
                      {grid.map((val, i) =>
                        Number(val) > 0 ? (
                          <Button
                            key={i}
                            size="xs"
                            variant={pixGridSel === i && !pixAmount ? 'filled' : 'light'}
                            onClick={() => {
                              setPixGridSel(i);
                              setPixAmount('');
                            }}
                          >
                            {`R$ ${Number(val).toFixed(2)}`}
                          </Button>
                        ) : null
                      )}
                    </Group>
                    {pixLink.pix_open_amount !== false && (
                      <NumberInput
                        size="xs"
                        min={0}
                        decimalScale={2}
                        prefix="R$ "
                        placeholder={t.publicLinks.pixOtherAmount}
                        w={160}
                        value={pixAmount ? Number(pixAmount) : undefined}
                        onChange={(v) => {
                          setPixAmount(String(v ?? ''));
                          setPixGridSel(-1);
                        }}
                      />
                    )}
                  </Stack>
                )}

                {mode === 'OPEN' && (
                  <NumberInput
                    size="sm"
                    min={0}
                    decimalScale={2}
                    prefix="R$ "
                    placeholder={t.publicLinks.pixOpenAmount}
                    value={pixAmount ? Number(pixAmount) : undefined}
                    onChange={(v) => setPixAmount(String(v ?? ''))}
                  />
                )}

                {payload ? (
                  <QrShareCard url={payload} size={200} />
                ) : (
                  <Text size="xs" c="dimmed">
                    {t.publicLinks.qrHint}
                  </Text>
                )}

                <Button
                  leftSection={<IconCopy size={16} />}
                  fullWidth
                  onClick={async () => {
                    await copyToClipboard(pixLink.pix_key || '');
                    notifications.show({
                      color: 'green',
                      message: t.publicLinks.pixCopied,
                    });
                  }}
                >
                  {t.publicLinks.copyPix}
                </Button>
                <Button
                  variant="light"
                  leftSection={<IconCopy size={16} />}
                  fullWidth
                  disabled={!payload}
                  onClick={copyPayload}
                >
                  {t.linksPage.copyPixPayload}
                </Button>
              </Stack>
            );
          })()}
        </Modal>

        <Modal
          opened={!!mapsLink}
          onClose={() => setMapsLink(null)}
          title={mapsLink?.title}
          centered
          size="md"
        >
          {mapsLink && (() => {
            let query: string | null = null;
            try {
              query = mapsLink.url
                ? new URL(mapsLink.url).searchParams.get('query')
                : null;
            } catch {
              query = null;
            }
            const embedUrl = query
              ? `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`
              : null;
            return (
              <Stack gap="md" py="md" align="stretch">
                {mapsLink.address ? (
                  <Text size="sm" c="dimmed" ta="center">
                    {mapsLink.address}
                  </Text>
                ) : null}
                {embedUrl ? (
                  <Box style={{ height: 260, borderRadius: 8, overflow: 'hidden' }}>
                    <iframe
                      title="mapa"
                      src={embedUrl}
                      style={{ border: 0, width: '100%', height: '100%' }}
                      loading="lazy"
                      allowFullScreen
                    />
                  </Box>
                ) : (
                  <Text size="xs" c="dimmed" ta="center">
                    {t.publicLinks.mapUnavailable}
                  </Text>
                )}
                <Button
                  fullWidth
                  leftSection={<IconExternalLink size={16} />}
                  component="a"
                  href={mapsLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    publicLinksApi.click(mapsLink.id).catch(() => undefined)
                  }
                >
                  {t.publicLinks.openInGoogleMaps}
                </Button>
              </Stack>
            );
          })()}
        </Modal>

        <PrayerRequestPublicModal
          opened={prayerOpen}
          onClose={() => setPrayerOpen(false)}
          slug={slug}
        />
      </Box>
    </>
  );
}