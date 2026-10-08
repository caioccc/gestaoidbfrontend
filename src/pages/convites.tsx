import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DateInput } from '@mantine/dates';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconCopy,
  IconDownload,
  IconLink,
  IconQrcode,
  IconPlus,
  IconPower,
  IconRefresh,
  IconX,
} from '@tabler/icons-react';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import QrShareCard, { downloadQrPng } from '../components/QrShareCard';
import { memberInvitesApi, type MemberInviteCreatePayload } from '../api/accounts';
import { useLanguage } from '../i18n';
import { useFeedback } from '../hooks/useFeedback';
import { absoluteUrl, copyToClipboard } from '../utils/share';
import type { MemberInvite, MemberInviteStatus } from '../types';

const STATUS_COLOR: Record<MemberInviteStatus, string> = {
  ACTIVE: 'teal',
  DISABLED: 'gray',
  EXPIRED: 'orange',
  EXHAUSTED: 'red',
};

export default function VisitorInvitesPage() {
  const { t } = useLanguage();
  const fb = useFeedback();

  const [invites, setInvites] = useState<MemberInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const [qrInvite, setQrInvite] = useState<MemberInvite | null>(null);
  const [toRegenerate, setToRegenerate] = useState<MemberInvite | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const qrRef = useRef<SVGSVGElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    memberInvitesApi
      .list()
      .then(setInvites)
      .catch((err) => {
        if (err?.response?.status === 403) setBlocked(true);
        else fb.fromError(err, t.visitorInvites.loadError);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const inviteUrl = (invite: MemberInvite) => absoluteUrl(invite.path);

  const copyLink = async (invite: MemberInvite) => {
    await copyToClipboard(inviteUrl(invite));
    fb.success(t.visitorInvites.linkCopied);
  };

  const shareLink = async (invite: MemberInvite) => {
    const url = inviteUrl(invite);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: t.visitorInvites.title, url });
        return;
      } catch {
        // usuário cancelou: cai para a cópia
      }
    }
    await copyToClipboard(url);
    fb.success(t.visitorInvites.linkCopied);
  };

  const handleCreate = async () => {
    setCreating(true);
    const payload: MemberInviteCreatePayload = {};
    if (label.trim()) payload.label = label.trim();
    if (maxUses.trim()) payload.max_uses = Number(maxUses);
    if (expiresAt) {
      const [y, m, d] = expiresAt.split('-').map(Number);
      const endOfDay = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59);
      payload.expires_at = endOfDay.toISOString();
    }
    try {
      const created = await memberInvitesApi.create(payload);
      setInvites((prev) => [created, ...prev]);
      setCreateOpen(false);
      setLabel('');
      setMaxUses('');
      setExpiresAt(null);
      setQrInvite(created);
      fb.success(t.visitorInvites.created);
    } catch (err: any) {
      if (err?.response?.status === 403) fb.error(t.visitorInvites.noProfile);
      else fb.fromError(err, t.visitorInvites.saveError);
    } finally {
      setCreating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!toRegenerate) return;
    setRegenerating(true);
    try {
      const updated = await memberInvitesApi.regenerate(toRegenerate.id);
      setInvites((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setToRegenerate(null);
      fb.success(t.visitorInvites.regenerated);
    } catch (err) {
      fb.fromError(err, t.visitorInvites.saveError);
    } finally {
      setRegenerating(false);
    }
  };

  const handleToggle = async (invite: MemberInvite) => {
    setBusyId(invite.id);
    try {
      const updated = await memberInvitesApi.toggle(invite.id);
      setInvites((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      fb.success(t.visitorInvites.toggled);
    } catch (err) {
      fb.fromError(err, t.visitorInvites.saveError);
    } finally {
      setBusyId(null);
    }
  };

  const statusLabel = (status: MemberInviteStatus) => {
    switch (status) {
      case 'DISABLED':
        return t.visitorInvites.statusDisabled;
      case 'EXPIRED':
        return t.visitorInvites.statusExpired;
      case 'EXHAUSTED':
        return t.visitorInvites.statusExhausted;
      default:
        return t.visitorInvites.statusActive;
    }
  };

  const renderCard = (invite: MemberInvite) => (
    <Paper key={invite.id} withBorder radius="md" p="md" data-testid={`invite-card-${invite.id}`}>
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text fw={600} lineClamp={1}>
              {invite.label || invite.inviter_name}
            </Text>
            <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>
              {inviteUrl(invite)}
            </Text>
          </Stack>
          <Badge
            color={STATUS_COLOR[invite.status]}
            variant="light"
            data-testid={`invite-status-${invite.id}`}
          >
            {statusLabel(invite.status)}
          </Badge>
        </Group>

        <Group gap="xs">
          <Badge variant="outline" size="sm">
            {t.visitorInvites.usesLabel}: {invite.uses_count}
            {invite.max_uses != null ? `/${invite.max_uses}` : ''}
          </Badge>
          <Badge variant="outline" size="sm" color="gray">
            {t.visitorInvites.expiresLabel}:{' '}
            {invite.expires_at
              ? new Date(invite.expires_at).toLocaleDateString()
              : t.visitorInvites.noExpiry}
          </Badge>
        </Group>

        <Group gap="xs" justify="flex-end">
          <Tooltip label={t.visitorInvites.copyLink}>
            <ActionIcon
              variant="subtle"
              color="blue"
              data-testid={`invite-copy-${invite.id}`}
              onClick={() => copyLink(invite)}
            >
              <IconCopy size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t.visitorInvites.share}>
            <ActionIcon variant="subtle" color="blue" onClick={() => shareLink(invite)}>
              <IconLink size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t.visitorInvites.qrTitle}>
            <ActionIcon
              variant="subtle"
              color="blue"
              data-testid={`invite-qr-${invite.id}`}
              onClick={() => setQrInvite(invite)}
            >
              <IconQrcode size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t.visitorInvites.regenerate}>
            <ActionIcon
              variant="subtle"
              color="orange"
              data-testid={`invite-regenerate-${invite.id}`}
              onClick={() => setToRegenerate(invite)}
            >
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={invite.is_active ? t.visitorInvites.pause : t.visitorInvites.activate}>
            <ActionIcon
              variant="subtle"
              color={invite.is_active ? 'gray' : 'teal'}
              loading={busyId === invite.id}
              data-testid={`invite-toggle-${invite.id}`}
              onClick={() => handleToggle(invite)}
            >
              {invite.is_active ? <IconX size={18} /> : <IconPower size={18} />}
            </ActionIcon>
          </Tooltip>
        </Group>
      </Stack>
    </Paper>
  );

  return (
    <AuthGuard roles={['MEMBRO', 'PASTOR', 'SECRETARIA', 'TESOUREIRO']}>
      <Layout>
        <PageHeader title={t.visitorInvites.title} description={t.visitorInvites.subtitle}>
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => setCreateOpen(true)}
            data-testid="invite-create"
          >
            {t.visitorInvites.newInvite}
          </Button>
        </PageHeader>

        <Stack gap="md">
          {loading ? (
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
              {[0, 1, 2].map((i) => (
                <Paper key={i} withBorder radius="md" p="md">
                  <Stack gap="xs">
                    <Skeleton height={16} width="55%" radius="sm" />
                    <Skeleton height={12} width="80%" radius="sm" />
                    <Skeleton height={28} width="45%" radius="sm" />
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          ) : blocked ? (
            <Paper withBorder radius="md" p="lg">
              <Text size="sm" c="dimmed" ta="center">
                {t.visitorInvites.noProfile}
              </Text>
            </Paper>
          ) : invites.length === 0 ? (
            <EmptyState
              variant="center"
              icon={<IconLink size={24} />}
              title={t.visitorInvites.empty}
            />
          ) : (
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
              {invites.map(renderCard)}
            </SimpleGrid>
          )}
        </Stack>

        <Modal
          opened={createOpen}
          onClose={() => setCreateOpen(false)}
          title={t.visitorInvites.newInvite}
          centered
        >
          <Stack gap="sm">
            <TextInput
              data-testid="invite-label-input"
              label={t.visitorInvites.label}
              placeholder={t.visitorInvites.labelPlaceholder}
              value={label}
              onChange={(e) => setLabel(e.currentTarget.value)}
            />
            <TextInput
              data-testid="invite-maxuses-input"
              label={t.visitorInvites.maxUses}
              placeholder={t.visitorInvites.maxUsesPlaceholder}
              value={maxUses}
              onChange={(e) => setMaxUses(e.currentTarget.value.replace(/\D/g, ''))}
              inputMode="numeric"
            />
            <DateInput
              label={t.visitorInvites.expiresAt}
              placeholder={t.visitorInvites.noExpiry}
              value={expiresAt}
              onChange={setExpiresAt}
              clearable
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setCreateOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button
                onClick={handleCreate}
                loading={creating}
                leftSection={<IconPlus size={16} />}
                data-testid="invite-save"
              >
                {t.visitorInvites.create}
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={!!qrInvite}
          onClose={() => setQrInvite(null)}
          title={t.visitorInvites.qrTitle}
          centered
        >
          <Stack align="center" gap="sm">
            {qrInvite && <QrShareCard ref={qrRef} url={inviteUrl(qrInvite)} size={220} />}
            <Text size="xs" c="dimmed" ta="center" style={{ wordBreak: 'break-all' }}>
              {qrInvite ? inviteUrl(qrInvite) : ''}
            </Text>
            <Group justify="center" w="100%">
              <Button
                variant="default"
                leftSection={<IconCopy size={16} />}
                onClick={() => qrInvite && copyLink(qrInvite)}
              >
                {t.visitorInvites.copyLink}
              </Button>
              <Button
                leftSection={<IconDownload size={16} />}
                onClick={() => downloadQrPng(qrRef.current, `convite-${qrInvite?.id}.png`)}
                data-testid="invite-qr-download"
              >
                {t.visitorInvites.downloadQr}
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={!!toRegenerate}
          onClose={() => setToRegenerate(null)}
          title={t.visitorInvites.regenerateTitle}
          centered
        >
          <Stack gap="lg">
            <Text size="sm">
              {t.visitorInvites.regenerateBody.replace(
                '{path}',
                toRegenerate ? toRegenerate.path : ''
              )}
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setToRegenerate(null)}>
                {t.common.cancel}
              </Button>
              <Button
                color="orange"
                loading={regenerating}
                leftSection={<IconRefresh size={16} />}
                onClick={handleRegenerate}
                data-testid="invite-regenerate-confirm"
              >
                {t.visitorInvites.regenerate}
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Layout>
    </AuthGuard>
  );
}
