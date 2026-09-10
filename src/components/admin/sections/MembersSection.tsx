import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Group,
  Text,
  Stack,
  Badge,
  Button,
  ThemeIcon,
  Modal,
  Table,
  Center,
  Loader,
  Avatar,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconUsersGroup,
  IconPlus,
  IconTrash,
  IconPencil,
  IconRefresh,
  IconId,
} from '@tabler/icons-react';
import PageHeader from '../../../components/PageHeader';
import MemberFormModal from '../../../components/MemberFormModal';
import MemberCardModal from '../../../components/MemberCardModal';
import { useLanguage } from '../../../i18n';
import { useChurchCardConfig } from '../../../hooks/useChurchCardConfig';
import { accountsApi } from '../../../api/accounts';
import type { Member, MinistryArea } from '../../../types';

export default function MembersSection({
  churchId,
  churchLabel,
  staffAccess = false,
}: {
  churchId: number;
  churchLabel: string;
  churchType?: string;
  staffAccess?: boolean;
}) {
  const { t } = useLanguage();
  const cardData = useChurchCardConfig(
    staffAccess
      ? () => accountsApi.getChurchProfile(churchId)
      : () => accountsApi.getChurchProfileForSede(churchId)
  );
  const [members, setMembers] = useState<Member[]>([]);
  const [areas, setAreas] = useState<MinistryArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [cardMember, setCardMember] = useState<Member | null>(null);
  const [toDelete, setToDelete] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      accountsApi.churchMembers(churchId),
      accountsApi.churchMinistryAreas(churchId),
    ])
      .then(([membersData, areasData]) => {
        setMembers(membersData);
        setAreas(areasData);
      })
      .catch(() => {
        setMembers([]);
        setAreas([]);
      })
      .finally(() => setLoading(false));
  }, [churchId]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setOpened(true);
  };

  const openEdit = (m: Member) => {
    setEditing(m);
    setOpened(true);
  };

  const handleSave = async (
    payload: Record<string, unknown>,
    isEdit: boolean
  ): Promise<Member> => {
    const saved = isEdit && editing
      ? await accountsApi.updateChurchMember(churchId, editing.id, payload)
      : await accountsApi.createChurchMember(churchId, payload);
    load();
    return saved;
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await accountsApi.deleteChurchMember(churchId, toDelete.id);
      notifications.show({ color: 'green', message: t.membersPage.deleted });
      setToDelete(null);
      load();
    } catch {
      notifications.show({ color: 'red', message: t.overview });
    } finally {
      setDeleting(false);
    }
  };

  const rows = members.map((m) => (
    <Table.Tr key={m.id} data-testid={`member-row-${m.id}`}>
      <Table.Td>
        <Group gap="sm" wrap="nowrap">
          <Avatar
            src={m.photo || null}
            radius="xl"
            size="sm"
            data-testid={`member-avatar-${m.id}`}
          >
            {m.name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Stack gap={0}>
            <Text fw={600} truncate maw={220}>
              {m.name}
            </Text>
            {m.card_number && (
              <Text size="xs" c="dimmed">
                #{m.card_number}
              </Text>
            )}
          </Stack>
        </Group>
      </Table.Td>
      <Table.Td>{m.phone || '—'}</Table.Td>
      <Table.Td>{m.email || '—'}</Table.Td>
      <Table.Td>{m.church_entry_display || '—'}</Table.Td>
      <Table.Td hiddenFrom="sm" />
      <Table.Td>
        <Badge color={m.status === 'ACTIVE' ? 'green' : 'gray'} variant="light">
          {m.status === 'ACTIVE' ? t.membersPage.active : t.membersPage.inactive}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap={4} justify="flex-end">
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconId size={14} />}
            onClick={() => setCardMember(m)}
            data-testid={`member-card-${m.id}`}
          >
            {t.membersPage.viewCard}
          </Button>
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconPencil size={14} />}
            onClick={() => openEdit(m)}
            data-testid={`member-edit-${m.id}`}
          >
            {t.common.edit}
          </Button>
          <Button
            size="xs"
            variant="subtle"
            color="red"
            leftSection={<IconTrash size={14} />}
            onClick={() => setToDelete(m)}
            data-testid={`member-delete-${m.id}`}
          >
            {t.common.delete}
          </Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <PageHeader title={t.membersPage.title} description={churchLabel}>
        <Group gap="xs">
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            onClick={load}
            data-testid="members-refresh"
          >
            {t.common.filter}
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={openCreate}
            data-testid="members-new"
          >
            {t.membersPage.addMember}
          </Button>
        </Group>
      </PageHeader>
      <Card withBorder shadow="sm" p={0}>
        {loading ? (
          <Center h={200}>
            <Loader />
          </Center>
        ) : members.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <ThemeIcon size={48} radius="xl" color="gray" variant="light">
              <IconUsersGroup size={24} />
            </ThemeIcon>
            <Text c="dimmed">{t.membersPage.empty}</Text>
          </Stack>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t.membersPage.name}</Table.Th>
                <Table.Th>{t.membersPage.phone}</Table.Th>
                <Table.Th>{t.membersPage.email}</Table.Th>
                <Table.Th>{t.membersPage.churchEntry}</Table.Th>
                <Table.Th>{t.membersPage.status}</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>{t.common.actions}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        )}
      </Card>

      <MemberFormModal
        opened={opened}
        onClose={() => setOpened(false)}
        member={editing}
        areas={areas}
        churchName={churchLabel}
        cardConfig={cardData.config}
        churchContact={cardData.contact}
        onSave={handleSave}
      />

      <MemberCardModal
        opened={!!cardMember}
        member={cardMember}
        churchName={churchLabel}
        config={cardData.config}
        churchContact={cardData.contact}
        onClose={() => setCardMember(null)}
      />

      <Modal
        opened={!!toDelete}
        onClose={() => setToDelete(null)}
        title={t.membersPage.deleteTitle}
        centered
      >
        <Stack gap="md">
          <Text>{t.membersPage.deleteBody.replace('{name}', toDelete?.name || '')}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setToDelete(null)}>
              {t.common.cancel}
            </Button>
            <Button
              color="red"
              loading={deleting}
              onClick={handleDelete}
              data-testid="member-delete-confirm"
            >
              {t.common.delete}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}