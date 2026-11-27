import React, { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { eventCheckinApi } from '../api/checkin';
import { useLanguage } from '../i18n';
import { useFeedback } from '../hooks/useFeedback';
import type { Event, EventCheckinConfig, EventCheckinMode } from '../types';

interface CheckinConfigPanelProps {
  event: Event;
  config: EventCheckinConfig | null;
  onChanged: () => void;
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

function toIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function CheckinConfigPanel({ event, config, onChanged }: CheckinConfigPanelProps) {
  const { t } = useLanguage();
  const fb = useFeedback();
  const [mode, setMode] = useState<EventCheckinMode>(config?.mode ?? 'PER_DAY');
  const [opensAt, setOpensAt] = useState(toDateTimeLocal(config?.checkin_opens_at ?? null));
  const [closesAt, setClosesAt] = useState(toDateTimeLocal(config?.checkin_closes_at ?? null));
  const [active, setActive] = useState(config?.is_active ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMode(config?.mode ?? 'PER_DAY');
    setOpensAt(toDateTimeLocal(config?.checkin_opens_at ?? null));
    setClosesAt(toDateTimeLocal(config?.checkin_closes_at ?? null));
    setActive(config?.is_active ?? false);
  }, [config]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        mode,
        checkin_opens_at: toIso(opensAt),
        checkin_closes_at: toIso(closesAt),
        is_active: active,
      };
      if (config) {
        await eventCheckinApi.updateConfig(config.id, payload);
        fb.success(t.common.toast.saved);
      } else {
        const created = await eventCheckinApi.enableCheckin(event.id, { mode });
        await eventCheckinApi.updateConfig(created.id, payload);
        fb.success(t.common.toast.created);
      }
      onChanged();
    } catch (err) {
      fb.fromError(err, t.common.toast.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper withBorder p="md" radius="md" data-testid="checkin-config-panel">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={2}>
            <Text fw={700}>{config ? t.eventCheckin.config.edit : t.eventCheckin.config.create}</Text>
            <Text size="sm" c="dimmed">{t.eventCheckin.config.hint}</Text>
          </Stack>
          {config ? (
            <Text size="sm" c={config.is_active ? 'green' : 'dimmed'} fw={600}>
              {config.is_active ? t.eventCheckin.config.active : t.eventCheckin.config.inactive}
            </Text>
          ) : null}
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          <Select
            data-testid="checkin-config-mode"
            label={t.eventCheckin.config.mode}
            data={[
              { value: 'PER_DAY', label: t.eventCheckin.config.modePerDay },
              { value: 'ONCE', label: t.eventCheckin.config.modeOnce },
            ]}
            value={mode}
            onChange={(value) => setMode((value as EventCheckinMode) ?? 'PER_DAY')}
            allowDeselect={false}
          />
          <TextInput
            data-testid="checkin-config-opens"
            type="datetime-local"
            label={t.eventCheckin.config.opensAt}
            value={opensAt}
            onChange={(event) => setOpensAt(event.currentTarget.value)}
          />
          <TextInput
            data-testid="checkin-config-closes"
            type="datetime-local"
            label={t.eventCheckin.config.closesAt}
            value={closesAt}
            onChange={(event) => setClosesAt(event.currentTarget.value)}
          />
          <Checkbox
            data-testid="checkin-config-active"
            label={t.eventCheckin.config.active}
            checked={active}
            onChange={(event) => setActive(event.currentTarget.checked)}
            mt={28}
          />
        </SimpleGrid>
        <Group justify="flex-end">
          <Button data-testid="checkin-config-save" loading={saving} onClick={save}>
            {config ? t.eventCheckin.config.save : t.eventCheckin.config.create}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
