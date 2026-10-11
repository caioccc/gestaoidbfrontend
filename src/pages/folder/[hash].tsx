import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconBuildingChurch,
  IconCalendarEvent,
  IconPdf,
  IconShare,
} from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useLanguage } from '../../i18n';
import { boletimApi } from '../../api/boletim';
import { publicLinksApi } from '../../api/accounts';
import FolderTrifold from '../../components/folders/FolderTrifold';
import type { TrifoldChurch, TrifoldFolderData } from '../../components/folders/FolderTrifold';
import { SkeletonMetaCards } from '../../components/LoadingSkeleton';
import { generateTrifoldPdf } from '../../utils/folderPdf';
import { buildWhatsAppUrl } from '../../utils/whatsapp';
import type { PublicFolderPayload } from '../../api/boletim';

export default function PublicFolderPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const hash = typeof router.query.hash === 'string' ? router.query.hash : '';

  const [folder, setFolder] = useState<PublicFolderPayload | null>(null);
  const [churchTrifold, setChurchTrifold] = useState<TrifoldChurch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [wantPdf, setWantPdf] = useState(false);

  useEffect(() => {
    if (!hash) return;
    let active = true;
    setLoading(true);
    setError(false);
    boletimApi
      .public(hash)
      .then((data) => {
        if (active) setFolder(data);
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
  }, [hash]);

  useEffect(() => {
    if (!folder) return;
    let active = true;
    publicLinksApi
      .get(folder.church.slug)
      .then((data) => {
        if (!active) return;
        setChurchTrifold({
          name: data.church.name,
          theme_color: data.church.theme_color ?? undefined,
          logo: data.church.logo ?? null,
          slug: folder.church.slug,
          default_pix_key: folder.church.default_pix_key,
          default_pix_type: folder.church.default_pix_type,
          phone: folder.church.phone,
          city: folder.church.city,
          state: folder.church.state,
          neighborhood: folder.church.neighborhood,
          street: folder.church.street ?? undefined,
          number: folder.church.number ?? undefined,
          links: data.links.map((l) => ({
            title: l.title,
            link_type: l.link_type,
            url: l.url,
          })),
        });
      })
      .catch(() => {
        if (!active) return;
        setChurchTrifold({
          name: folder.church.name,
          logo: folder.church.logo,
          phone: folder.church.phone,
          city: folder.church.city,
          state: folder.church.state,
          neighborhood: folder.church.neighborhood,
          street: folder.church.street ?? undefined,
          number: folder.church.number ?? undefined,
          slug: folder.church.slug,
          default_pix_key: folder.church.default_pix_key,
          default_pix_type: folder.church.default_pix_type,
        });
      });
    return () => {
      active = false;
    };
  }, [folder]);

  useEffect(() => {
    if (!wantPdf || !folder || !exportRef.current) return;
    let cancelled = false;
    const run = async () => {
      await new Promise((r) => window.requestAnimationFrame(() => r(null)));
      try {
        await generateTrifoldPdf(exportRef.current!, folder.title);
      } catch {
        /* erro silencioso */
      } finally {
        if (!cancelled) {
          setWantPdf(false);
          setDownloading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [wantPdf, folder]);

  function periodText(): string {
    if (!folder) return '';
    const [sY, sM, sD] = folder.reference_start.slice(0, 10).split('-').map(Number);
    const [eY, eM, eD] = folder.reference_end.slice(0, 10).split('-').map(Number);
    if (!sY) return '';
    const fmt = new Intl.DateTimeFormat(locale === 'pt-br' ? 'pt-BR' : locale === 'es' ? 'es-ES' : 'en-US', {
      day: '2-digit',
      month: 'short',
    });
    const from = fmt.format(new Date(sY, sM - 1, sD));
    const year = `${eY}`;
    const to = fmt.format(new Date(eY, eM - 1, eD));
    return `${from} – ${to} ${year}`;
  }

  function handleShare() {
    if (!folder) return;
    const msg = `${folder.church.name}: ${folder.title || ''}`;
    const url = buildWhatsAppUrl(folder.church.phone, msg);
    window.open(url || `https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  }

  const previewData: TrifoldFolderData | null = folder
    ? {
        tipo: folder.tipo,
        title: folder.title,
        subtitle: folder.subtitle,
        service_type: folder.service_type,
        versiculo: folder.versiculo,
        cover_template: folder.cover_template,
        theme_color: folder.theme_color,
        background_color: folder.background_color,
        cover_font: folder.cover_font,
        mensagem_pastoral: folder.mensagem_pastoral,
        article_title: folder.article_title,
        reference_start: folder.reference_start,
        reference_end: folder.reference_end,
        programacao: folder.programacao,
        anuncios: folder.anuncios,
        aniversariantes: folder.aniversariantes,
        qr: folder.qr,
        social: folder.social,
        blocks: folder.blocks,
        block_order: folder.block_order,
        rows: folder.rows,
      }
    : null;

  return (
    <Container size="md" py="xl">
      {loading ? (
        <Stack gap="md">
          <SkeletonPreview />
        </Stack>
      ) : error || !folder ? (
        <Paper withBorder radius="md" p="xl" ta="center">
          <ThemeIcon size="xl" radius="xl" color="red" variant="light" mx="auto" mb="sm">
            <IconCalendarEvent size={26} />
          </ThemeIcon>
          <Title order={3}>{t.publicFolder.invalid}</Title>
          <Text c="dimmed" size="sm">
            {t.publicFolder.invalidHint}
          </Text>
        </Paper>
      ) : (
        <Stack gap="md">
          <Paper withBorder radius="md" p="lg">
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon size="xl" radius="xl" color="teal" variant="light">
                <IconCalendarEvent size={26} />
              </ThemeIcon>
              <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
                <Group gap={6} c="dimmed" wrap="nowrap">
                  <IconBuildingChurch size={15} style={{ flexShrink: 0 }} />
                  <Text size="sm" truncate>
                    {t.publicFolder.church}: {folder.church.name}
                    {folder.church.city ? ` — ${folder.church.city}/${folder.church.state}` : ''}
                  </Text>
                </Group>
                <Group gap={6} c="dimmed" wrap="nowrap" mt={2}>
                  <IconCalendarEvent size={15} style={{ flexShrink: 0 }} />
                  <Text size="sm" truncate>
                    {t.publicFolder.period}: {periodText()}
                  </Text>
                </Group>
              </Stack>
              <Group gap="xs" wrap="nowrap">
                <Button
                  variant="light"
                  leftSection={<IconPdf size={18} />}
                  loading={downloading}
                  onClick={() => {
                    setDownloading(true);
                    setWantPdf(true);
                  }}
                >
                  {t.publicFolder.downloadPdf}
                </Button>
                <Button
                  variant="light"
                  color="green"
                  leftSection={<IconShare size={18} />}
                  onClick={handleShare}
                >
                  {t.publicFolder.share}
                </Button>
              </Group>
            </Group>
          </Paper>

          <Paper withBorder radius="md" p="lg" bg="white">
            {previewData && (
              <FolderTrifold
                ref={previewRef}
                folder={previewData}
                church={churchTrifold ?? undefined}
                t={t}
                locale={locale}
                interactive
              />
            )}
          </Paper>

          <Box style={{ position: 'absolute', zIndex: -1, top: 0, left: 0, width: 1, height: 1, opacity: 0 }}>
            {wantPdf && previewData && (
              <div ref={exportRef}>
                <FolderTrifold
                  folder={previewData}
                  church={churchTrifold ?? undefined}
                  t={t}
                  locale={locale}
                  exportMode
                />
              </div>
            )}
          </Box>
        </Stack>
      )}
    </Container>
  );
}

function SkeletonPreview() {
  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="lg">
        <Group gap="sm" wrap="nowrap">
          <Skeleton circle radius="xl" height={40} width={40} style={{ flexShrink: 0 }} />
          <Stack gap={6} style={{ minWidth: 0, flex: 1 }}>
            <Skeleton height={24} width="70%" radius="sm" />
            <Skeleton height={13} width="44%" radius="sm" />
          </Stack>
        </Group>
      </Paper>
      <SkeletonMetaCards count={1} />
      <Paper withBorder radius="md" p="lg">
        <Skeleton height={260} radius="md" />
      </Paper>
    </Stack>
  );
}