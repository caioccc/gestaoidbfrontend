import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Center,
  ColorInput,
  Group,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  IconLink,
  IconCopy,
  IconPlus,
  IconExternalLink,
  IconTrash,
} from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import LinkModal from '../components/LinkModal';
import SortableLinkRow from '../components/SortableLinkRow';
import {
  SkeletonFormFields,
  SkeletonLinkRows,
} from '../components/LoadingSkeleton';
import { churchLinksApi } from '../api/accounts';
import { useLanguage } from '../i18n';
import { buildLinksUrl, copyToClipboard } from '../utils/share';
import { useFeedback } from '../hooks/useFeedback';
import type { ChurchLinksConfig, ChurchPublicLink } from '../types';

const PIX_TYPES = ['CNPJ', 'CPF', 'Telefone', 'E-mail', 'Chave Aleatória'];

export default function LinksPage() {
  const { t } = useLanguage();
  const fb = useFeedback();
  const [links, setLinks] = useState<ChurchPublicLink[]>([]);
  const [config, setConfig] = useState<ChurchLinksConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [editing, setEditing] = useState<ChurchPublicLink | null>(null);
  const [toDelete, setToDelete] = useState<ChurchPublicLink | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([churchLinksApi.list(), churchLinksApi.config()])
      .then(([list, cfg]) => {
        setLinks(list);
        setConfig(cfg);
      })
      .catch((err) => {
        setLinks([]);
        setConfig(null);
        fb.fromError(err, t.linksPage.loadError);
      })
      .finally(() => setLoading(false));
  }, [t.linksPage.loadError]);

  useEffect(() => {
    load();
  }, [load]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setLinks((items) => {
      const oldIndex = items.findIndex((l) => l.id === active.id);
      const newIndex = items.findIndex((l) => l.id === over.id);
      const next = arrayMove(items, oldIndex, newIndex);
      churchLinksApi.reorder(next.map((l) => l.id)).catch(() => undefined);
      return next;
    });
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpened(true);
  };

  const openEdit = (link: ChurchPublicLink) => {
    setEditing(link);
    setModalOpened(true);
  };

  const handleSaved = (payload: Partial<ChurchPublicLink>) => {
    if (editing) {
      churchLinksApi
        .update(editing.id, payload)
        .then((updated) => {
          setLinks((items) => items.map((l) => (l.id === updated.id ? updated : l)));
          fb.success(t.linksPage.saveDone);
        })
        .catch((err) => {
          fb.fromError(err, t.common.toast.saveFailed);
        });
    } else {
      churchLinksApi
        .create(payload)
        .then((created) => {
          setLinks((items) => [...items, created]);
          fb.success(t.linksPage.saveDone);
        })
        .catch((err) => {
          fb.fromError(err, t.common.toast.saveFailed);
        });
    }
  };

  const toggleActive = (link: ChurchPublicLink, active: boolean) => {
    setLinks((items) =>
      items.map((l) => (l.id === link.id ? { ...l, is_active: active } : l))
    );
    churchLinksApi
      .update(link.id, { is_active: active })
      .catch((err) => {
        // Volta o switch ao valor anterior: a atualizacao otimista falhou.
        setLinks((items) =>
          items.map((l) => (l.id === link.id ? { ...l, is_active: link.is_active } : l))
        );
        fb.fromError(err);
      });
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await churchLinksApi.remove(toDelete.id);
      setLinks((items) => items.filter((l) => l.id !== toDelete.id));
      fb.success(t.linksPage.deleteDone);
      setToDelete(null);
    } catch (err) {
      fb.fromError(err, t.common.toast.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    setSavingConfig(true);
    try {
      const payload: Partial<ChurchLinksConfig> = {
        slug: config.slug,
        theme_color: config.theme_color.toUpperCase(),
        default_pix_key: config.default_pix_key || '',
        default_pix_type: config.default_pix_type || '',
      };
      const updated = await churchLinksApi.updateConfig(payload);
      setConfig(updated);
      fb.success(t.linksPage.configDone);
    } catch (err) {
      fb.fromError(err, t.linksPage.configError);
    } finally {
      setSavingConfig(false);
    }
  };

  const copyLink = async () => {
    if (!config) return;
    await copyToClipboard(buildLinksUrl(config.slug));
    fb.success(t.linksPage.linkCopied);
  };

  const openPage = () => {
    if (!config) return;
    const win = window.open(buildLinksUrl(config.slug), '_blank', 'noopener,noreferrer');
    if (win) win.opener = null;
  };

  const publicUrl = config ? buildLinksUrl(config.slug) : '';

  const defaultPix = useMemo(
    () => ({
      key: config?.default_pix_key,
      type: config?.default_pix_type,
    }),
    [config?.default_pix_key, config?.default_pix_type]
  );

  return (
    <AuthGuard roles={['PASTOR', 'SECRETARIA']}>
      <Layout>
        <PageHeader title={t.linksPage.title} description={t.linksPage.subtitle} />

        <Group gap="xs" mb="lg" style={{ alignItems: 'center' }}>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            {t.linksPage.newLink}
          </Button>
        </Group>

          {loading ? (
            <Stack gap="md" maw={900}>
              <Paper withBorder p="md" radius="md" mb="lg">
                <Stack gap="md">
                  <Group justify="space-between" wrap="wrap" gap="xs">
                    <Stack gap={6}>
                      <Skeleton height={16} width={190} radius="sm" />
                      <Skeleton height={11} width={280} radius="sm" />
                    </Stack>
                    <Skeleton width={54} height={24} radius="md" />
                  </Group>
                  <SkeletonFormFields count={4} />
                  <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                    <Group gap="xs">
                      <Skeleton height={36} width={120} radius="md" />
                      <Skeleton height={36} width={130} radius="md" />
                    </Group>
                    <Skeleton height={36} width={140} radius="md" />
                  </Group>
                </Stack>
              </Paper>

              <Stack gap="xs">
                <Skeleton height={11} width={220} radius="sm" />
                <SkeletonLinkRows count={5} />
              </Stack>
            </Stack>
          ) : (
          <Stack gap="md">
            <Paper withBorder p="md" radius="md" mb="lg" maw={900}>
              <Stack gap="md">
                <Group justify="space-between" wrap="wrap" gap="xs">
                  <Stack gap={0}>
                    <Text fw={700}>{t.linksPage.configTitle}</Text>
                    <Text size="xs" c="dimmed">
                      {t.linksPage.slugHint.replace('{url}', publicUrl)}
                    </Text>
                  </Stack>
                  {config && (
                    <Switch
                      label={
                        config.public_links_enabled
                          ? t.linksPage.pageEnabled
                          : t.linksPage.pageDisabled
                      }
                      checked={config.public_links_enabled}
                      onChange={async (e) => {
                        const value = e.currentTarget.checked;
                        setConfig((c) => (c ? { ...c, public_links_enabled: value } : c));
                        try {
                          const updated = await churchLinksApi.updateConfig({
                            public_links_enabled: value,
                          });
                          setConfig(updated);
                        } catch (err) {
                          setConfig((c) =>
                            c ? { ...c, public_links_enabled: !value } : c
                          );
                          fb.fromError(err, t.linksPage.configError);
                        }
                      }}
                    />
                  )}
                </Group>

                {config && (
                  <>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                      <TextInput
                        label={t.linksPage.slugLabel}
                        value={config.slug}
                        onChange={(e) =>
                          setConfig({ ...config, slug: e.currentTarget.value })
                        }
                        leftSection={<IconLink size={16} />}
                      />
                      <ColorInput
                        label={t.linksPage.themeLabel}
                        format="hex"
                        withEyeDropper
                        swatches={['#1c7ed6', '#228be6', '#40c057', '#f76707', '#e64980', '#7048e8']}
                        value={config.theme_color}
                        onChange={(v) => setConfig({ ...config, theme_color: v })}
                        swatchesPerRow={6}
                      />
                      <TextInput
                        label={t.linksPage.defaultPixLabel}
                        value={config.default_pix_key || ''}
                        onChange={(e) =>
                          setConfig({ ...config, default_pix_key: e.currentTarget.value })
                        }
                      />
                      <Select
                        label={t.linksPage.defaultPixTypeLabel}
                        data={PIX_TYPES}
                        clearable
                        value={config.default_pix_type || null}
                        onChange={(v) => setConfig({ ...config, default_pix_type: v })}
                      />
                    </SimpleGrid>
                    <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                      <Group gap="xs">
                        <Button variant="light" leftSection={<IconCopy size={15} />} onClick={copyLink}>
                          {t.linksPage.copyLink}
                        </Button>
                        <Button
                          variant="subtle"
                          leftSection={<IconExternalLink size={15} />}
                          onClick={openPage}
                        >
                          {t.linksPage.openPage}
                        </Button>
                      </Group>
                      <Button onClick={saveConfig} loading={savingConfig}>
                        {t.linksPage.saveConfig}
                      </Button>
                    </Group>
                  </>
                )}
              </Stack>
            </Paper>

            <Stack gap="xs" maw={900}>
              <Group gap={6}>
                <Text size="xs" c="dimmed">
                  {t.linksPage.reorderHint}
                </Text>
              </Group>

              {links.length === 0 ? (
                <EmptyState
                  variant="center"
                  icon={<IconLink size={24} />}
                  title={t.linksPage.noLinks}
                  action={
                    <Button variant="light" leftSection={<IconPlus size={16} />} onClick={openCreate}>
                      {t.linksPage.addFirst}
                    </Button>
                  }
                />
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                    <Stack gap={0}>
                      {links.map((link) => (
                        <SortableLinkRow
                          key={link.id}
                          link={link}
                          onEdit={openEdit}
                          onToggleActive={toggleActive}
                          onDelete={setToDelete}
                        />
                      ))}
                    </Stack>
                  </SortableContext>
                </DndContext>
              )}
            </Stack>
          </Stack>
        )}

        <LinkModal
          opened={modalOpened}
          initial={editing}
          defaultPix={defaultPix}
          onClose={() => setModalOpened(false)}
          onSaved={handleSaved}
        />

        <Modal
          opened={!!toDelete}
          onClose={() => setToDelete(null)}
          title={t.linksPage.deleteTitle}
          centered
        >
          <Text size="sm">{t.linksPage.deleteBody}</Text>
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setToDelete(null)}>
              {t.common.cancel}
            </Button>
            <Button color="red" onClick={handleDelete} loading={deleting} leftSection={<IconTrash size={15} />}>
              {t.common.delete}
            </Button>
          </Group>
        </Modal>
      </Layout>
    </AuthGuard>
  );
}