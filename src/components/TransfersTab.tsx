import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowRight,
  IconPlus,
  IconSend,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { accountsApi } from '../api/accounts';
import type { Member, MemberTransfer, MemberTransferStatus } from '../types';

function statusBadge(status: MemberTransferStatus, t: any) {
  const map: Record<MemberTransferStatus, { color: string; label: string }> = {
    PENDING: { color: 'yellow', label: t.transfers.pending },
    RECEIVED: { color: 'green', label: t.transfers.received },
    CANCELED: { color: 'gray', label: t.transfers.canceled },
  };
  const { color, label } = map[status];
  return (
    <Badge color={color} variant="light">
      {label}
    </Badge>
  );
}

const fmtDate = (iso: string, locale = 'pt-br'): string => {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function TransfersTab() {
  const { t, locale } = useLanguage();
  const [incoming, setIncoming] = useState<MemberTransfer[]>([]);
  const [outgoing, setOutgoing] = useState<MemberTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{
    action: 'receive' | 'cancel';
    transfer: MemberTransfer;
  } | null>(null);

  const [emitOpen, setEmitOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [targetOptions, setTargetOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [target, setTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [o, i] = await Promise.all([
        accountsApi.memberTransfers(),
        accountsApi.incomingTransfers(),
      ]);
      setOutgoing(o);
      setIncoming(i);
    } catch {
      notifications.show({ color: 'red', message: t.overview });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openEmit = async () => {
    setTargetOptions([]);
    setMemberId(null);
    setTarget(null);
    setEmitOpen(true);
    try {
      setMembers(await accountsApi.members());
    } catch {
      notifications.show({ color: 'red', message: t.overview });
    }
  };

  const searchTargets = async (q: string) => {
    try {
      const res = await accountsApi.transferTargetChurches(q || '');
      setTargetOptions(
        res.map((c) => ({
          value: String(c.id),
          label: `${c.name} (${c.city}/${c.state})`,
        }))
      );
    } catch {
      /* silencioso durante a digitação */
    }
  };

  const submitEmit = async () => {
    if (!memberId || !target) return;
    setSaving(true);
    try {
      await accountsApi.createMemberTransfer(Number(memberId), Number(target));
      notifications.show({ color: 'green', message: t.membersPage.saved });
      setEmitOpen(false);
      refresh();
    } catch (err: any) {
      const data = err?.response?.data;
      const msg =
        data?.member_id?.[0] ||
        data?.target_church_id?.[0] ||
        data?.detail ||
        t.overview;
      notifications.show({ color: 'red', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const confirmAction = async () => {
    if (!confirm) return;
    const { action, transfer } = confirm;
    setBusyId(transfer.id);
    setConfirm(null);
    try {
      if (action === 'receive') {
        await accountsApi.receiveTransfer(transfer.id);
        notifications.show({
          color: 'green',
          message: t.transfers.received,
        });
      } else {
        await accountsApi.cancelTransfer(transfer.id);
        notifications.show({
          color: 'gray',
          message: t.transfers.canceled,
        });
      }
      refresh();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.response?.data?.detail?.[0] || t.overview;
      notifications.show({ color: 'red', message: msg });
    } finally {
      setBusyId(null);
    }
  };

  const incomingRows = incoming.map((tr) => (
    <Table.Tr key={tr.id}>
      <Table.Td>
        <Text fw={600}>{tr.member_name}</Text>
        {tr.member_cpf && (
          <Text size="xs" c="dimmed">
            {tr.member_cpf}
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Group gap={6} wrap="nowrap">
          <Text size="sm">{tr.source_church_name}</Text>
          <IconArrowRight size={14} />
          <Text size="sm" c="dimmed">
            {tr.target_church_name}
          </Text>
        </Group>
      </Table.Td>
      <Table.Td>{fmtDate(tr.issued_at, locale)}</Table.Td>
      <Table.Td>{statusBadge(tr.status, t)}</Table.Td>
      <Table.Td style={{ textAlign: 'right' }}>
        {tr.status === 'PENDING' && (
          <Button
            size="xs"
            variant="light"
            color="teal"
            leftSection={<IconCheck size={14} />}
            loading={busyId === tr.id}
            onClick={() => setConfirm({ action: 'receive', transfer: tr })}
            data-testid={`transfer-receive-${tr.id}`}
          >
            {t.transfers.receive}
          </Button>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  const outgoingRows = outgoing.map((tr) => (
    <Table.Tr key={tr.id}>
      <Table.Td>
        <Text fw={600}>{tr.member_name}</Text>
        {tr.member_cpf && (
          <Text size="xs" c="dimmed">
            {tr.member_cpf}
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Group gap={6} wrap="nowrap">
          <Text size="sm" c="dimmed">
            {tr.source_church_name}
          </Text>
          <IconArrowRight size={14} />
          <Text size="sm">{tr.target_church_name}</Text>
        </Group>
      </Table.Td>
      <Table.Td>{fmtDate(tr.issued_at, locale)}</Table.Td>
      <Table.Td>{statusBadge(tr.status, t)}</Table.Td>
      <Table.Td style={{ textAlign: 'right' }}>
        {tr.status === 'PENDING' && (
          <Button
            size="xs"
            variant="subtle"
            color="red"
            leftSection={<IconX size={14} />}
            loading={busyId === tr.id}
            onClick={() => setConfirm({ action: 'cancel', transfer: tr })}
            data-testid={`transfer-cancel-${tr.id}`}
          >
            {t.transfers.cancel}
          </Button>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Group justify="flex-end" mb="md">
        <Button
          leftSection={<IconSend size={16} />}
          onClick={openEmit}
          data-testid="transfer-open-emit"
        >
          {t.transfers.emit}
        </Button>
      </Group>

      {loading ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : (
        <Stack gap="md">
          <Card withBorder shadow="sm" p="md">
            <Text fw={600} mb="sm">
              {t.transfers.incomingTitle}
            </Text>
            {incoming.length === 0 ? (
              <Text size="sm" c="dimmed">
                {t.transfers.incomingEmpty}
              </Text>
            ) : (
              <Table striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t.transfers.member}</Table.Th>
                    <Table.Th>{t.transfers.sourceChurch}</Table.Th>
                    <Table.Th>{t.transfers.issuedAt}</Table.Th>
                    <Table.Th>{t.membersPage.status}</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>
                      {t.common.actions}
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{incomingRows}</Table.Tbody>
              </Table>
            )}
          </Card>

          <Card withBorder shadow="sm" p="md">
            <Text fw={600} mb="sm">
              {t.transfers.outgoingTitle}
            </Text>
            {outgoing.length === 0 ? (
              <Text size="sm" c="dimmed">
                {t.transfers.outgoingEmpty}
              </Text>
            ) : (
              <Table striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t.transfers.member}</Table.Th>
                    <Table.Th>{t.transfers.targetChurch}</Table.Th>
                    <Table.Th>{t.transfers.issuedAt}</Table.Th>
                    <Table.Th>{t.membersPage.status}</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>
                      {t.common.actions}
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{outgoingRows}</Table.Tbody>
              </Table>
            )}
          </Card>
        </Stack>
      )}

      <Modal
        opened={emitOpen}
        onClose={() => setEmitOpen(false)}
        title={t.transfers.new}
        centered
      >
        <Stack gap="md">
          <Select
            label={t.transfers.member}
            placeholder={t.transfers.memberPlaceholder}
            searchable
            data={members.map((m) => ({
              value: String(m.id),
              label: `${m.name}${m.card_number ? ` (#${m.card_number})` : ''}`,
            }))}
            value={memberId}
            onChange={setMemberId}
            data-testid="transfer-member"
          />
          <Select
            label={t.transfers.targetChurch}
            placeholder={t.transfers.targetChurchPlaceholder}
            searchable
            clearable
            nothingFoundMessage={t.transfers.targetEmpty}
            data={targetOptions}
            value={target}
            onChange={setTarget}
            onSearchChange={searchTargets}
            data-testid="transfer-target"
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEmitOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              loading={saving}
              disabled={!memberId || !target}
              onClick={submitEmit}
              data-testid="transfer-submit-emit"
            >
              {t.transfers.confirm}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={!!confirm}
        onClose={() => setConfirm(null)}
        title={
          confirm?.action === 'receive'
            ? t.transfers.receive
            : t.transfers.cancel
        }
        centered
      >
        <Stack gap="md">
          <Text>
            {confirm?.action === 'receive'
              ? t.transfers.receiveBody.replace(
                  '{name}',
                  confirm?.transfer.member_name || ''
                )
              : t.transfers.cancelBody.replace(
                  '{name}',
                  confirm?.transfer.member_name || ''
                )}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirm(null)}>
              {t.common.cancel}
            </Button>
            <Button
              color={confirm?.action === 'receive' ? 'teal' : 'red'}
              loading={busyId !== null}
              onClick={confirmAction}
              data-testid="transfer-confirm"
            >
              {t.transfers.confirm}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}