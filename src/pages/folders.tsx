import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Group,
  Menu,
  Modal,
  SegmentedControl,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import {
  IconBrandWhatsapp,
  IconCalendarEvent,
  IconEdit,
  IconFolders,
  IconLink,
  IconPdf,
  IconPlus,
  IconSearch,
  IconTrash,
  IconWorld,
} from '@tabler/icons-react';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import MobileItemCard from '../components/MobileItemCard';
import MaskedTextInput from '../components/MaskedTextInput';
import { SkeletonResponsiveTable } from '../components/LoadingSkeleton';
import { ListPagination, PAGE_SIZE_OPTIONS } from '../components/ListPagination';
import FolderCreateModal from '../components/folders/FolderCreateModal';
import type { FolderPreviewChurch } from '../components/folders/FolderPreview';
import FolderTrifold, { type TrifoldChurch } from '../components/folders/FolderTrifold';
import { boletimApi } from '../api/boletim';
import { churchLinksApi } from '../api/accounts';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n';
import { useFeedback } from '../hooks/useFeedback';
import { copyToClipboard } from '../utils/share';
import { buildWhatsAppUrl } from '../utils/whatsapp';
import { generateTrifoldPdf } from '../utils/folderPdf';
import type { FolderCulto, FolderCultoTipo } from '../types';

function formatISODate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function folderToPreview(folder: FolderCulto) {
  return {
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
  };
}

export default function FoldersPage() {
  const { t, locale } = useLanguage();
  const fb = useFeedback();
  const { user } = useAuth();
  const church = user?.church ?? undefined;
  const previewChurch: FolderPreviewChurch | undefined = church
    ? {
        name: church.name,
        phone: church.phone,
        street: church.street,
        number: church.number,
        neighborhood: church.neighborhood,
        city: church.city,
        state: church.state,
      }
    : undefined;

  const [folders, setFolders] = useState<FolderCulto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [total, setTotal] = useState(0);
  const [fSearch, setFSearch] = useState('');
  const [fTipo, setFTipo] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FolderCulto | null>(null);
  const [toDelete, setToDelete] = useState<FolderCulto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [waTarget, setWaTarget] = useState<FolderCulto | null>(null);
  const [waPhone, setWaPhone] = useState('');
  const [exportRequest, setExportRequest] = useState<{
    folder: FolderCulto;
    church?: TrifoldChurch;
  } | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    boletimApi
      .list({
        ...(fTipo ? { tipo: fTipo } : {}),
        ...(fSearch.trim() ? { search: fSearch.trim() } : {}),
        page,
        page_size: pageSize,
      })
      .then((data) => {
        setFolders(data.results);
        setTotal(data.count);
      })
      .catch(() => {
        setFolders([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [fTipo, fSearch, page, pageSize]);

  useEffect(() => {
    const handle = window.setTimeout(load, 300);
    return () => window.clearTimeout(handle);
  }, [load]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > maxPage) setPage(maxPage);
  }, [page, pageSize, total]);

  useEffect(() => {
    if (!exportRequest) return;
    let cancelled = false;
    const run = async () => {
      await new Promise((r) => window.requestAnimationFrame(() => r(null)));
      try {
        await generateTrifoldPdf(exportRef.current!, exportRequest.folder.title);
        if (!cancelled) fb.success(t.common.toast.downloaded);
      } catch {
        if (!cancelled) fb.error(t.common.toast.downloadFailed);
      } finally {
        if (!cancelled) setExportRequest(null);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [exportRequest, fb, t]);

  const handleDownloadPdf = useCallback(
    async (folder: FolderCulto) => {
      const [config, links, fresh] = await Promise.all([
        churchLinksApi.config().catch(() => null),
        churchLinksApi.list().catch(() => []),
        boletimApi.get(folder.id).catch(() => null),
      ]);
      const base: TrifoldChurch | undefined = church
        ? {
            name: church.name,
            phone: church.phone,
            city: church.city,
            state: church.state,
            neighborhood: church.neighborhood,
            street: church.street,
            number: church.number,
          }
        : undefined;
      setExportRequest({
        folder: fresh ?? folder,
        church: base
          ? {
              ...base,
              slug: config?.slug,
              default_pix_key: config?.default_pix_key ?? null,
              default_pix_type: config?.default_pix_type ?? null,
              links: links.filter((l) => l.is_active),
            }
          : undefined,
      });
    },
    [church]
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const rangeStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, safePage * pageSize);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (folder: FolderCulto) => {
    setEditing(folder);
    setModalOpen(true);
  };

  const onSaved = () => {
    load();
  };

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await boletimApi.remove(toDelete.id);
      fb.deletedWithName(toDelete.title);
      setToDelete(null);
      load();
    } catch (err) {
      fb.fromError(err);
    } finally {
      setDeleting(false);
    }
  }

  async function handleCopyLink(folder: FolderCulto) {
    if (!folder.public_url) return;
    await copyToClipboard(folder.public_url);
    fb.copiedWithName(folder.title);
  }

  function handleWhatsApp() {
    if (!waTarget) return;
    const msg = `${t.folders.title}: ${waTarget.title || ''} — ${waTarget.public_url || waTarget.title}`;
    const url = waPhone ? buildWhatsAppUrl(waPhone, msg) : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    if (!url) {
      fb.error(t.common.toast.operationFailed);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    setWaTarget(null);
    setWaPhone('');
  }

  const rowActions = (folder: FolderCulto) => (
    <Menu shadow="md" position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon color="gray" variant="subtle" size="lg" aria-label={`${t.common.actions} ${folder.title}`}>
          <IconCalendarEvent size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => openEdit(folder)}>
          {t.folders.editFolder}
        </Menu.Item>
        {folder.public_url && (
          <>
            <Menu.Item leftSection={<IconWorld size={16} />} component="a" href={folder.public_url} target="_blank" rel="noopener noreferrer">
              {t.folders.visitPage}
            </Menu.Item>
            <Menu.Item leftSection={<IconLink size={16} />} onClick={() => handleCopyLink(folder)}>
              {t.folders.copyLink}
            </Menu.Item>
          </>
        )}
        <Menu.Item
          leftSection={<IconPdf size={16} />}
          onClick={() => void handleDownloadPdf(folder)}
        >
          {t.folders.downloadPdf}
        </Menu.Item>
        <Menu.Item leftSection={<IconBrandWhatsapp size={16} />} onClick={() => { setWaTarget(folder); setWaPhone(''); }}>
          {t.folders.sendWhatsApp}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => setToDelete(folder)}>
          {t.folders.confirmDelete}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );

  return (
    <AuthGuard roles={['PASTOR', 'TESOUREIRO', 'SECRETARIA']}>
      <Layout>
        <PageHeader title={t.folders.title} description={t.folders.subtitle}>
          <Group gap="xs" wrap="nowrap">
            <Box visibleFrom="md">
              <TextInput
                leftSection={<IconSearch size={16} />}
                placeholder={t.folders.search}
                value={fSearch}
                onChange={(e) => {
                  setFSearch(e.currentTarget.value);
                  setPage(1);
                }}
                w={240}
              />
            </Box>
            <Button leftSection={<IconPlus size={18} />} onClick={openCreate}>
              {t.folders.new}
            </Button>
          </Group>
        </PageHeader>

        <Group justify="space-between" mb="sm" wrap="wrap">
          <SegmentedControl
            value={fTipo ?? ''}
            onChange={(v) => {
              setFTipo(v || null);
              setPage(1);
            }}
            data={[
              { value: '', label: t.folders.allTipos },
              { value: 'MENSAL', label: t.folders.mensal },
              { value: 'SEMANAL', label: t.folders.semanal },
            ]}
          />
          <Box hiddenFrom="md" style={{ flex: 1, minWidth: 220 }}>
            <TextInput
              leftSection={<IconSearch size={16} />}
              placeholder={t.folders.search}
              value={fSearch}
              onChange={(e) => {
                setFSearch(e.currentTarget.value);
                setPage(1);
              }}
            />
          </Box>
        </Group>

        <Box pos="relative">
          <Box style={{ position: 'absolute', zIndex: -1, top: 0, left: 0, width: 1, height: 1, opacity: 0 }}>
            {exportRequest && (
              <div ref={exportRef}>
                <FolderTrifold
                  folder={folderToPreview(exportRequest.folder)}
                  church={exportRequest.church}
                  t={t}
                  locale={locale}
                  exportMode
                />
              </div>
            )}
          </Box>
          {loading ? (
            <SkeletonResponsiveTable rows={8} columns={5} />
          ) : folders.length === 0 ? (
            <Card withBorder p="xl">
              <EmptyState
                variant="center"
                icon={<IconFolders size={24} />}
                title={t.folders.empty}
                action={
                  <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={openCreate}>
                    {t.folders.new}
                  </Button>
                }
              />
            </Card>
          ) : (
            <Card withBorder p={0}>
              <Box visibleFrom="lg">
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t.folders.titleLabel}</Table.Th>
                      <Table.Th>{t.folders.coverTemplate}</Table.Th>
                      <Table.Th>{t.folders.tipoLabel}</Table.Th>
                      <Table.Th>{t.folders.reference}</Table.Th>
                      <Table.Th>{t.common.actions}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {folders.map((folder) => (
                      <Table.Tr key={folder.id}>
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <ThemeIcon color="teal" variant="light" radius="md">
                              <IconFolders size={18} />
                            </ThemeIcon>
                            <Stack gap={0} style={{ minWidth: 0 }}>
                              <Text size="sm" fw={600} truncate>
                                {folder.title || t.folders.defaultTitle}
                              </Text>
                              {folder.subtitle && (
                                <Text size="xs" c="dimmed" truncate>
                                  {folder.subtitle}
                                </Text>
                              )}
                              {folder.rows.length > 0 && (
                                <Text size="xs" c="dimmed">
                                  {folder.rows.length} {t.folders.agenda}
                                </Text>
                              )}
                            </Stack>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{templateLabel(folder.cover_template, t)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>{t.folders[folder.tipo === 'MENSAL' ? 'mensal' : 'semanal']}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
                            {formatISODate(folder.reference_start)} — {formatISODate(folder.reference_end)}
                          </Text>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Group gap={4} justify="flex-end">
                            {rowActions(folder)}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Box>
              <Stack hiddenFrom="lg" gap="xs" p="sm">
                {folders.map((folder) => (
                  <MobileItemCard
                    key={folder.id}
                    media={
                      <ThemeIcon color="teal" variant="light" radius="md" size="lg">
                        <IconFolders size={20} />
                      </ThemeIcon>
                    }
                    actions={rowActions(folder)}
                  >
                    <Stack gap={4}>
                      <Text fw={600} truncate>
                        {folder.title || t.folders.defaultTitle}
                      </Text>
                      <Text size="sm" truncate>
                        {folder.subtitle || '—'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {t.folders[folder.tipo === 'MENSAL' ? 'mensal' : 'semanal']} · {formatISODate(folder.reference_start)} — {formatISODate(folder.reference_end)}
                      </Text>
                      {folder.rows.length > 0 && (
                        <Text size="xs" c="dimmed">
                          {folder.rows.length} {t.folders.agenda}
                        </Text>
                      )}
                    </Stack>
                  </MobileItemCard>
                ))}
              </Stack>
            </Card>
          )}

          <ListPagination
            page={safePage}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            total={total}
            totalPages={totalPages}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            testId="folders-pagination"
          />
        </Box>

        <FolderCreateModal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          folder={editing}
          church={previewChurch}
          onSaved={onSaved}
        />

        <Modal
          opened={Boolean(toDelete)}
          onClose={() => setToDelete(null)}
          title={t.folders.deleteTitle}
          centered
          size="sm"
        >
          <Stack gap="lg">
            <Text size="sm">
              {t.folders.deleteMessage.replace('{name}', toDelete?.title ?? '')}
            </Text>
            <Group justify="flex-end" gap="xs">
              <Button variant="default" onClick={() => setToDelete(null)}>
                {t.common.cancel}
              </Button>
              <Button color="red" loading={deleting} onClick={handleDelete}>
                {t.folders.confirmDelete}
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={Boolean(waTarget)}
          onClose={() => setWaTarget(null)}
          title={t.folders.sendWhatsApp}
          centered
          size="sm"
        >
          <Stack gap="lg">
            <MaskedTextInput
              label={t.folders.whatsappPhone}
              description={t.folders.whatsappPhoneHint}
              placeholder="(11) 99999-9999"
              mask="(00) 00000-0000"
              value={waPhone}
              onAccept={(value: string) => setWaPhone(value)}
            />
            <Group justify="flex-end" gap="xs">
              <Button variant="default" onClick={() => setWaTarget(null)}>
                {t.common.cancel}
              </Button>
              <Button
                leftSection={<IconBrandWhatsapp size={18} />}
                color="green"
                onClick={handleWhatsApp}
              >
                {t.folders.sendWhatsApp}
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Layout>
    </AuthGuard>
  );
}

function templateLabel(value: number, t: ReturnType<typeof useLanguage>['t']) {
  return value === 2 ? t.folders.templateModern : value === 3 ? t.folders.templateElegant : t.folders.templateClassic;
}