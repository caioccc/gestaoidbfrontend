import React, { useCallback, useEffect, useState } from 'react';
import {
  ActionIcon,
  Avatar,
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
import { IconDeviceFloppy, IconTrash } from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { musicApi } from '../api/music';
import ImageUpload from './ImageUpload';
import type { Band } from '../types';

interface BandModalProps {
  opened: boolean;
  onClose: () => void;
}

export default function BandModal({ opened, onClose }: BandModalProps) {
  const { t } = useLanguage();
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [color, setColor] = useState('#7048e8');
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBands(await musicApi.bands());
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao carregar bandas.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (opened) void load(); }, [opened, load]);

  const saveBand = async () => {
    const n = name.trim();
    if (!n) return;
    setSaving(true);
    try {
      await musicApi.createBand({
        name: n,
        color,
        photo: photo ?? undefined,
      });
      notifications.show({ color: 'green', message: t.music.bandSaved });
      setName('');
      setColor('#7048e8');
      setPhoto(null);
      await load();
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao salvar banda.' });
    } finally {
      setSaving(false);
    }
  };

  const deleteBand = async (b: Band) => {
    if (!window.confirm(t.music.deleteBandBody)) return;
    try {
      await musicApi.deleteBand(b.id);
      notifications.show({ color: 'green', message: t.music.bandDeleted });
      await load();
    } catch {
      notifications.show({ color: 'red', message: t.music.bandInUse });
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} size="lg" centered title={t.music.bandManage}>
      <Stack gap="md">
        {loading ? (
          <Center py="xl"><Loader /></Center>
        ) : bands.length === 0 ? (
          <Card withBorder p="lg">
            <Text c="dimmed">{t.music.noBands}</Text>
          </Card>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            {bands.map((b) => (
              <Card key={b.id} withBorder p="md">
                <Group justify="space-between" mb={4}>
                  <Group gap={8}>
                    {b.photo ? (
                      <Avatar src={b.photo} radius="sm" size={32} />
                    ) : (
                      <Box w={16} h={16} style={{ borderRadius: 4, backgroundColor: b.color }} />
                    )}
                    <Text fw={600}>{b.name}</Text>
                  </Group>
                  <Tooltip label={t.common.delete}>
                    <ActionIcon variant="subtle" color="red" size="sm" onClick={() => void deleteBand(b)}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <Group gap={8}>
                  {b.leader_name ? (
                    <Text size="xs" c="dimmed">Líder: {b.leader_name}</Text>
                  ) : null}
                  <Badge variant="light" size="xs">{b.song_count} {t.music.songsTitle}</Badge>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        )}

        <Divider label={t.music.newBand} labelPosition="left" />

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label={t.music.bandName}
            placeholder={t.music.bandNamePlaceholder}
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          <ColorInput
            label={t.music.bandColor}
            value={color}
            onChange={setColor}
          />
        </SimpleGrid>

        <ImageUpload
          value={photo}
          onChange={setPhoto}
          label={t.music.bandPhoto}
          placeholder={t.music.bandPhotoPlaceholder}
          height={140}
        />

        <Group justify="flex-end">
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            loading={saving}
            onClick={saveBand}
            disabled={!name.trim()}
          >
            {t.music.saveBand}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}