import React, { useCallback, useEffect, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  ColorInput,
  Divider,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconPlus, IconTrash } from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { musicApi } from '../api/music';
import type { Ministry, MinistryRole } from '../types';

interface MinistriesModalProps {
  opened: boolean;
  onClose: () => void;
  volunteers: { id: number; name: string; email: string }[];
}

export default function MinistriesModal({ opened, onClose, volunteers }: MinistriesModalProps) {
  const { t } = useLanguage();
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [color, setColor] = useState('#7048e8');
  const [leader, setLeader] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [addingTo, setAddingTo] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMinistries(await musicApi.ministries());
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao carregar ministérios.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (opened) void load(); }, [opened, load]);

  const saveMinistry = async () => {
    const n = name.trim();
    if (!n) return;
    setSaving(true);
    try {
      await musicApi.createMinistry({ name: n, color, leader: leader ?? undefined });
      notifications.show({ color: 'green', message: t.music.ministrySaved });
      setName('');
      setColor('#7048e8');
      setLeader(null);
      await load();
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao salvar ministério.' });
    } finally {
      setSaving(false);
    }
  };

  const deleteMinistry = async (m: Ministry) => {
    if (!window.confirm(t.music.deleteMinistryBody)) return;
    try {
      await musicApi.deleteMinistry(m.id);
      notifications.show({ color: 'green', message: t.music.ministryDeleted });
      await load();
    } catch {
      notifications.show({ color: 'red', message: t.music.ministryInUse });
    }
  };

  const addRole = async (ministryId: number) => {
    const n = newRoleName.trim();
    if (!n) return;
    try {
      await musicApi.createMinistryRole(ministryId, { name: n });
      notifications.show({ color: 'green', message: t.music.roleSaved });
      setNewRoleName('');
      setAddingTo(null);
      await load();
    } catch {
      notifications.show({ color: 'red', message: t.music.roleInUse });
    }
  };

  const removeRole = async (ministryId: number, roleId: number) => {
    try {
      await musicApi.deleteMinistryRole(ministryId, roleId);
      notifications.show({ color: 'green', message: t.music.roleDeleted });
      await load();
    } catch {
      notifications.show({ color: 'red', message: t.music.roleInUse });
    }
  };

  const volunteerData = volunteers.map((v) => ({ value: String(v.id), label: v.name }));

  return (
    <Modal opened={opened} onClose={onClose} size="xl" centered title={t.music.ministryManage}>
      <Stack gap="md">
        {loading ? (
          <Center py="xl"><Loader /></Center>
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            {ministries.map((m) => (
              <Card key={m.id} withBorder p="md">
                <Group justify="space-between" mb={4}>
                  <Group gap={8}>
                    <Box w={16} h={16} style={{ borderRadius: 4, backgroundColor: m.color }} />
                    <Text fw={600}>{m.name}</Text>
                  </Group>
                  <Tooltip label={t.common.delete}>
                    <ActionIcon variant="subtle" color="red" size="sm" onClick={() => void deleteMinistry(m)}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>

                {m.leader_name ? (
                  <Text size="xs" c="dimmed">Líder: {m.leader_name}</Text>
                ) : null}

                <Divider my="sm" />

                <Text size="xs" fw={600} mb={4}>{t.music.roleName}</Text>
                {m.roles.length === 0 ? (
                  <Text size="xs" c="dimmed" mb={4}>{t.music.noRoles}</Text>
                ) : (
                  <Group gap={4} mb={4}>
                    {m.roles.map((r) => (
                      <Badge
                        key={r.id}
                        variant="light"
                        rightSection={
                          <Tooltip label={t.common.delete}>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="xs"
                              onClick={() => void removeRole(m.id, r.id)}
                            >
                              <IconTrash size={10} />
                            </ActionIcon>
                          </Tooltip>
                        }
                      >
                        {r.name}
                      </Badge>
                    ))}
                  </Group>
                )}

                {addingTo === m.id ? (
                  <Group gap={4} mt={4}>
                    <TextInput
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.currentTarget.value)}
                      placeholder={t.music.roleNamePlaceholder}
                      size="xs"
                      style={{ flex: 1 }}
                      onKeyDown={(e) => { if (e.key === 'Enter') void addRole(m.id); }}
                      autoFocus
                    />
                    <Button size="xs" onClick={() => void addRole(m.id)}>{t.common.save}</Button>
                    <Button size="xs" variant="subtle" onClick={() => { setAddingTo(null); setNewRoleName(''); }}>
                      {t.common.cancel}
                    </Button>
                  </Group>
                ) : (
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconPlus size={12} />}
                    onClick={() => { setAddingTo(m.id); setNewRoleName(''); }}
                  >
                    {t.music.addRole}
                  </Button>
                )}
              </Card>
            ))}
          </SimpleGrid>
        )}

        <Divider label={t.music.newMinistry} labelPosition="left" />

        <Group align="flex-end" gap="md">
          <TextInput
            label={t.music.ministryName}
            placeholder={t.music.ministryNamePlaceholder}
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <ColorInput
            label={t.music.ministryColor}
            value={color}
            onChange={setColor}
            w={160}
          />
        </Group>

        <Group justify="flex-end">
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            loading={saving}
            onClick={saveMinistry}
            disabled={!name.trim()}
          >
            {t.music.saveMinistry}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
