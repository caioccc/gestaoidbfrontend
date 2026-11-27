import React, { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconCopy, IconExternalLink, IconRefresh } from '@tabler/icons-react';
import { eventCheckinApi } from '../api/checkin';
import { useLanguage } from '../i18n';
import { useFeedback } from '../hooks/useFeedback';
import { parseCheckinDateInput } from '../utils/eventCheckin';
import { formatCheckinDate } from '../utils/eventCheckin';
import type { EventCheckinConfig, EventCheckinSession } from '../types';

interface CheckinSessionsPanelProps {
  configId: number;
  config: EventCheckinConfig;
  sessions: EventCheckinSession[];
  onChanged: () => void;
}

export default function CheckinSessionsPanel({
  configId,
  config,
  sessions,
  onChanged,
}: CheckinSessionsPanelProps) {
  const { t, locale } = useLanguage();
  const fb = useFeedback();
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [origin, setOrigin] = useState('');
  const [generating, setGenerating] = useState(false);
  const [previewDates, setPreviewDates] = useState<string[] | null>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    setStartDate(config.generation_start_date ?? null);
    setEndDate(config.generation_end_date ?? null);
  }, [config.generation_start_date, config.generation_end_date]);

  const preview = async () => {
    setPreviewing(true);
    try {
      const result = await eventCheckinApi.previewDates(configId, {
        start: startDate ?? undefined,
        end: endDate ?? undefined,
      });
      setPreviewDates(result.dates);
    } catch (err) {
      fb.fromError(err, t.common.toast.loadFailed);
    } finally {
      setPreviewing(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sessions;
    return sessions.filter((session) =>
      `${session.event_title} ${session.occurrence_date}`.toLowerCase().includes(term)
    );
  }, [sessions, search]);

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await eventCheckinApi.generateSessions(configId, {
        start: startDate ?? undefined,
        end: endDate ?? undefined,
      });
      fb.success(
        t.eventCheckin.config.generated
          .replace('{created}', String(result.created))
          .replace('{total}', String(result.total))
      );
      onChanged();
    } catch (err) {
      fb.fromError(err, t.common.toast.operationFailed);
    } finally {
      setGenerating(false);
    }
  };

  const copy = async (session: EventCheckinSession) => {
    try {
      await navigator.clipboard.writeText(`${origin}/check-in/${session.token}`);
      fb.success(t.eventCheckin.sessions.copied);
    } catch (err) {
      fb.fromError(err, t.common.toast.operationFailed);
    }
  };

  const regenerate = async (session: EventCheckinSession) => {
    if (!window.confirm(t.eventCheckin.sessions.regenerateConfirm)) return;
    try {
      await eventCheckinApi.regenerateToken(session.id);
      fb.success(t.common.toast.updatedWithName.replace('{name}', t.eventCheckin.sessions.token));
      onChanged();
    } catch (err) {
      fb.fromError(err, t.common.toast.operationFailed);
    }
  };

  const toggleToken = async (session: EventCheckinSession) => {
    try {
      await eventCheckinApi.setTokenActive(session.id, !session.token_is_active);
      fb.success(t.common.toast.saved);
      onChanged();
    } catch (err) {
      fb.fromError(err, t.common.toast.saveFailed);
    }
  };

  return (
    <Stack gap="md" data-testid="checkin-sessions-panel">
      <Paper withBorder p="md" radius="md">
        <Stack gap="md">
          {config.mode === 'PER_DAY' ? (
            <>
              <Stack gap={2}>
                <Text fw={600} size="sm">{t.eventCheckin.sessions.datesLabel}</Text>
                <Text size="xs" c="dimmed">{t.eventCheckin.sessions.datesHint}</Text>
              </Stack>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <DateInput
                  data-testid="checkin-sessions-start"
                  label={t.eventCheckin.sessions.from}
                  value={startDate}
                  onChange={(value) => setStartDate(value ? parseCheckinDateInput(value) : null)}
                  locale={locale}
                  valueFormat="DD/MM/YYYY"
                  clearable
                />
                <DateInput
                  data-testid="checkin-sessions-end"
                  label={t.eventCheckin.sessions.to}
                  value={endDate}
                  onChange={(value) => setEndDate(value ? parseCheckinDateInput(value) : null)}
                  locale={locale}
                  valueFormat="DD/MM/YYYY"
                  clearable
                />
              </SimpleGrid>
            </>
          ) : null}
          <TextInput
            data-testid="checkin-sessions-search"
            label={t.eventCheckin.sessions.search}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            {config.mode === 'PER_DAY' ? (
              <Button
                data-testid="checkin-sessions-preview"
                variant="default"
                loading={previewing}
                onClick={preview}
              >
                {t.eventCheckin.sessions.preview}
              </Button>
            ) : null}
            <Button
              data-testid="checkin-sessions-generate"
              loading={generating}
              onClick={generate}
            >
              {t.eventCheckin.config.generate}
            </Button>
          </Group>
          {previewDates !== null ? (
            <Paper withBorder p="sm" radius="sm" data-testid="checkin-sessions-preview-dates">
              <Text size="xs" fw={600} mb={4}>{t.eventCheckin.sessions.preview}</Text>
              {previewDates.length === 0 ? (
                <Text size="xs" c="dimmed">{t.eventCheckin.sessions.previewEmpty}</Text>
              ) : (
                <Group gap="xs">
                  {previewDates.map((date) => (
                    <Badge key={date} size="sm" variant="light">
                      {formatCheckinDate(date, locale)}
                    </Badge>
                  ))}
                </Group>
              )}
            </Paper>
          ) : null}
        </Stack>
      </Paper>

      {filtered.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">{t.eventCheckin.sessions.empty}</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="sm">
          {filtered.map((session) => (
            <Paper key={session.id} withBorder p="sm" radius="md" data-testid={`checkin-session-${session.id}`}>
              <Stack gap="sm">
                <Group justify="space-between" wrap="nowrap">
                  <Stack gap={2} style={{ minWidth: 0 }}>
                    <Text size="sm" fw={600} truncate>{session.event_title}</Text>
                    <Text size="xs" c="dimmed">{formatCheckinDate(session.occurrence_date, locale)}</Text>
                  </Stack>
                  <Badge
                    size="sm"
                    variant="light"
                    color={session.is_open ? 'green' : 'gray'}
                  >
                    {session.is_open ? t.eventCheckin.config.active : t.eventCheckin.config.inactive}
                  </Badge>
                </Group>
                <Group gap="xs">
                  <Badge size="sm" variant="light" color={session.token_is_active ? 'blue' : 'gray'}>
                    {session.token_is_active
                      ? t.eventCheckin.sessions.tokenActive
                      : t.eventCheckin.sessions.tokenInactive}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {t.eventCheckin.sessions.checkins}: {session.checkin_count}
                  </Text>
                </Group>
                <Group gap={4} wrap="nowrap">
                  <Tooltip label={t.eventCheckin.sessions.copy}>
                    <ActionIcon variant="subtle" aria-label={t.eventCheckin.sessions.copy} onClick={() => copy(session)}>
                      <IconCopy size={15} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={t.eventCheckin.sessions.openUrl}>
                    <ActionIcon
                      variant="subtle"
                      component="a"
                      href={`${origin}/check-in/${session.token}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={t.eventCheckin.sessions.openUrl}
                    >
                      <IconExternalLink size={15} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={t.eventCheckin.sessions.regenerate}>
                    <ActionIcon variant="subtle" aria-label={t.eventCheckin.sessions.regenerate} onClick={() => regenerate(session)}>
                      <IconRefresh size={15} />
                    </ActionIcon>
                  </Tooltip>
                  <Button
                    size="xs"
                    variant="subtle"
                    ml="auto"
                    onClick={() => toggleToken(session)}
                  >
                    {session.token_is_active
                      ? t.eventCheckin.sessions.deactivate
                      : t.eventCheckin.sessions.activate}
                  </Button>
                </Group>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}
