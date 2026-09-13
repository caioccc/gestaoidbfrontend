import React, { useCallback, useEffect, useState } from 'react';
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Checkbox,
  Group,
  Loader,
  Menu,
  Modal,
  Stack,
  Table,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconUsersGroup,
  IconPlus,
  IconTrash,
  IconPencil,
  IconRefresh,
  IconId,
  IconDotsVertical,
} from '@tabler/icons-react';
import PageHeader from '../../../components/PageHeader';
import MobileItemCard from '../../../components/MobileItemCard';
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
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      accountsApi.churchMembers(churchId),
      accountsApi.churchMinistryAreas(churchId),
    ])
      .then(([membersData, areasData]) => {
        setMembers(membersData);
        setAreas(areasData);
        setSelected(new Set());
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

  const allSelected =
    members.length > 0 && members.every((m) => selected.has(m.id));

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(members.map((m) => m.id)));

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const memberActions = (m: Member) => (
    <>
      <Menu.Item
        leftSection={<IconId size={14} />}
        onClick={() => setCardMember(m)}
        data-testid={`member-card-${m.id}`}
      >
        {t.membersPage.viewCard}
      </Menu.Item>
      <Menu.Item
        leftSection={<IconPencil size={14} />}
        onClick={() => openEdit(m)}
        data-testid={`member-edit-${m.id}`}
      >
        {t.common.edit}
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        leftSection={<IconTrash size={14} />}
        color="red"
        onClick={() => setToDelete(m)}
        data-testid={`member-delete-${m.id}`}
      >
        {t.common.delete}
      </Menu.Item>
    </>
  );

  const rows = members.map((m) => (
    <Table.Tr key={m.id} data-testid={`member-row-${m.id}`}>
      <Table.Td>
        <Checkbox
          checked={selected.has(m.id)}
          onChange={() => toggle(m.id)}
          aria-label={m.name}
          data-testid={`member-select-${m.id}`}
        />
      </Table.Td>
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
      <Table.Td>
        <Badge color={m.status === 'ACTIVE' ? 'green' : 'gray'} variant="light">
          {m.status === 'ACTIVE' ? t.membersPage.active : t.membersPage.inactive}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap={4} justify="flex-end">
          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle" data-testid={`member-menu-${m.id}`}>
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>{memberActions(m)}</Menu.Dropdown>
          </Menu>
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
          <>
            <Box visibleFrom="sm">
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={36}>
                      <Checkbox
                        checked={allSelected}
                        indeterminate={selected.size > 0 && !allSelected}
                        onChange={toggleAll}
                        aria-label={t.membersPage.selectAll}
                        data-testid="members-select-all"
                      />
                    </Table.Th>
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
            </Box>
            <Stack hiddenFrom="sm" gap="xs" p="sm">
              {members.map((m) => (
                <Group key={m.id} gap="sm" align="flex-start" wrap="nowrap">
                  <Checkbox
                    checked={selected.has(m.id)}
                    onChange={() => toggle(m.id)}
                    aria-label={m.name}
                    mt={6}
                    data-testid={`member-mobile-select-${m.id}`}
                  />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <MobileItemCard
                      testId={`member-listing-mobile-${m.id}`}
                      media={
                        <Avatar
                          src={m.photo || null}
                          radius="xl"
                          size={48}
                          data-testid={`member-listing-mobile-avatar-${m.id}`}
                        >
                          {m.name?.charAt(0)?.toUpperCase()}
                        </Avatar>
                      }
                      actions={memberActions(m)}
                    >
                      <Stack gap={4}>
                        <Text fw={600} truncate>
                          {m.name}
                        </Text>
                        {m.card_number && (
                          <Text size="xs" c="dimmed" truncate>
                            #{m.card_number}
                          </Text>
                        )}
                        <Text size="sm" c="dimmed" truncate>
                          {m.phone || '—'}
                        </Text>
                        <Text size="sm" c="dimmed" truncate>
                          {m.email || '—'}
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                          {m.church_entry_display || '—'}
                        </Text>
                        <Badge
                          color={m.status === 'ACTIVE' ? 'green' : 'gray'}
                          variant="light"
                          size="sm"
                          style={{ width: 'fit-content' }}
                        >
                          {m.status === 'ACTIVE'
                            ? t.membersPage.active
                            : t.membersPage.inactive}
                        </Badge>
                      </Stack>
                    </MobileItemCard>
                  </Box>
                </Group>
              ))}
            </Stack>
          </>
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