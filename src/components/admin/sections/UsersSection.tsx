import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Group,
  Text,
  Stack,
  Badge,
  Button,
  Center,
  Loader,
  ThemeIcon,
  Modal,
  TextInput,
  PasswordInput,
  Select,
  Table,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconUserShield,
  IconPlus,
  IconTrash,
  IconRefresh,
} from '@tabler/icons-react';
import PageHeader from '../../../components/PageHeader';
import { useLanguage } from '../../../i18n';
import { useAuth, useRoleHelpers } from '../../../contexts/AuthContext';
import { accountsApi } from '../../../api/accounts';
import { ChurchMembership, Role } from '../../../types';
import { toUpperCamelWords, isValidEmail } from '../../../utils/format';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'PASTOR', label: 'Pastor(a)' },
  { value: 'TESOUREIRO', label: 'Tesoureiro(a)' },
  { value: 'SECRETARIA', label: 'Secretário(a)' },
  { value: 'INTERCESSAO', label: 'Intercessor(a)' },
  { value: 'LOUVOR', label: 'Líder de Louvor & Música' },
  { value: 'MUSICO', label: 'Músico / Voluntário' },
  { value: 'PROFESSOR_EBD', label: 'Professor(a) de EBD' },
];

interface AddUserForm {
  email: string;
  name: string;
  role: Role;
  password: string;
  password2: string;
}

const isStrongPassword = (v: string) =>
  v.length >= 8 && /\d/.test(v) && /[^A-Za-z0-9]/.test(v);

export default function UsersSection({
  churchId,
  churchLabel,
}: {
  churchId: number;
  churchLabel: string;
  staffAccess?: boolean;
}) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { hasRole } = useRoleHelpers(user);
  // Secretária vê a lista (somente leitura); Pastor(a)/ADMIN gerenciam.
  const canManageUsers = hasRole('PASTOR');
  const [users, setUsers] = useState<ChurchMembership[]>([]);
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingRoleId, setSavingRoleId] = useState<number | null>(null);
  const [toRemove, setToRemove] = useState<ChurchMembership | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    accountsApi
      .churchUsers(churchId)
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [churchId]);

  useEffect(() => {
    load();
  }, [load]);

  const form = useForm<AddUserForm>({
    initialValues: {
      email: '',
      name: '',
      role: 'PASTOR',
      password: '',
      password2: '',
    },
    validate: {
      email: (v) => (isValidEmail(v) ? null : t.email),
      password: (v) => (isStrongPassword(v) ? null : t.usersPage.passwordError),
      password2: (v, values) =>
        v === values.password ? null : t.usersPage.passwordMismatch,
    },
  });

  const handleAdd = async () => {
    if (!canManageUsers) return;
    const valid = form.validate();
    if (valid.hasErrors) return;
    setSaving(true);
    try {
      await accountsApi.addChurchUser(churchId, {
        email: form.values.email.trim(),
        name: toUpperCamelWords(form.values.name),
        role: form.values.role,
        password: form.values.password,
        password2: form.values.password2,
      });
      notifications.show({ color: 'green', message: t.usersPage.saved });
      setOpened(false);
      form.reset();
      load();
    } catch (err: any) {
      const data = err?.response?.data;
      const msg =
        data?.email?.[0] ||
        data?.password?.[0] ||
        data?.password2?.[0] ||
        data?.detail;
      notifications.show({ color: 'red', message: msg || t.overview });
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (membershipId: number, role: Role) => {
    if (!canManageUsers || membershipId === user?.id) return;
    setSavingRoleId(membershipId);
    try {
      await accountsApi.updateChurchUserRole(churchId, membershipId, role);
      notifications.show({ color: 'green', message: t.usersPage.roleUpdated });
      load();
    } catch {
      notifications.show({ color: 'red', message: t.overview });
    } finally {
      setSavingRoleId(null);
    }
  };

  const handleRemove = async () => {
    if (!canManageUsers || !toRemove) return;
    setRemoving(true);
    try {
      await accountsApi.removeChurchUser(churchId, toRemove.id);
      notifications.show({ color: 'green', message: t.usersPage.removed });
      setToRemove(null);
      load();
    } catch {
      notifications.show({ color: 'red', message: t.overview });
    } finally {
      setRemoving(false);
    }
  };

  const rows = users.map((u) => (
    <Table.Tr key={u.id} data-testid={`user-row-${u.id}`}>
      <Table.Td>
        <Text fw={600}>
          {u.user_name}
          {u.user_id === user?.id && (
            <Badge ml={4} size="xs" variant="light" color="blue">
              {t.usersPage.self}
            </Badge>
          )}
        </Text>
      </Table.Td>
      <Table.Td>{u.user_email}</Table.Td>
      <Table.Td>
        <Select
          size="xs"
          value={u.role}
          data={ROLE_OPTIONS}
          disabled={!canManageUsers || u.user_id === user?.id || savingRoleId === u.id}
          onChange={(v) => v && handleRoleChange(u.id, v as Role)}
          data-testid={`user-role-${u.id}`}
          variant="default"
          w={150}
        />
      </Table.Td>
      <Table.Td>
        {canManageUsers && (
          <Button
            size="xs"
            variant="subtle"
            color="red"
            leftSection={<IconTrash size={14} />}
            disabled={u.user_id === user?.id}
            onClick={() => setToRemove(u)}
            data-testid={`user-remove-${u.id}`}
          >
            {t.common.delete}
          </Button>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <PageHeader
        title={t.usersPage.title}
        description={`${t.usersPage.subtitle} — ${churchLabel}`}
      >
        <Group gap="xs">
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            onClick={load}
            data-testid="users-refresh"
          >
            {t.common.filter}
          </Button>
          {canManageUsers && (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setOpened(true)}
              data-testid="users-new"
            >
              {t.usersPage.addUser}
            </Button>
          )}
        </Group>
      </PageHeader>

      <Card withBorder shadow="sm" p={0}>
        {loading ? (
          <Center h={200}>
            <Loader />
          </Center>
        ) : users.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <ThemeIcon size={48} radius="xl" color="gray" variant="light">
              <IconUserShield size={24} />
            </ThemeIcon>
            <Text c="dimmed">{t.usersPage.empty}</Text>
          </Stack>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t.common.name}</Table.Th>
                <Table.Th>{t.email}</Table.Th>
                <Table.Th>{t.usersPage.userRole}</Table.Th>
                <Table.Th>{t.common.actions}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        )}
      </Card>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={t.usersPage.addUser}
        centered
      >
        <form onSubmit={form.onSubmit(handleAdd)}>
          <Stack gap="md">
            <TextInput
              label={t.email}
              required
              data-testid="user-email"
              {...form.getInputProps('email')}
            />
            <TextInput
              label={t.common.name}
              data-testid="user-name"
              {...form.getInputProps('name')}
            />
            <Select
              label={t.usersPage.userRole}
              required
              data={ROLE_OPTIONS}
              data-testid="user-role-new"
              {...form.getInputProps('role')}
            />
            <PasswordInput
              label={t.password}
              description={t.usersPage.passwordHint}
              required
              autoComplete="new-password"
              data-testid="user-password"
              {...form.getInputProps('password')}
            />
            <PasswordInput
              label={t.confirmPassword}
              required
              autoComplete="new-password"
              data-testid="user-password2"
              {...form.getInputProps('password2')}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setOpened(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" loading={saving} data-testid="user-submit">
                {t.common.save}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={!!toRemove}
        onClose={() => setToRemove(null)}
        title={t.usersPage.removeTitle}
        centered
      >
        <Stack gap="md">
          <Text>{t.usersPage.removeBody.replace('{name}', toRemove?.user_name || '')}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setToRemove(null)}>
              {t.common.cancel}
            </Button>
            <Button
              color="red"
              loading={removing}
              onClick={handleRemove}
              data-testid="user-remove-confirm"
            >
              {t.common.delete}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}