import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconDownload } from '@tabler/icons-react';
import { eventCheckinApi } from '../api/checkin';
import { useLanguage } from '../i18n';
import { useFeedback } from '../hooks/useFeedback';
import { parseCheckinDateInput } from '../utils/eventCheckin';
import { checkinCsvFilename, downloadCheckinCsv, formatCheckinDate } from '../utils/eventCheckin';
import type { EventCheckinSession, EventCheckinSummary } from '../types';

interface CheckinReportPanelProps {
  sessions: EventCheckinSession[];
  eventTitle: string;
}

const EMPTY_SUMMARY: EventCheckinSummary = {
  expected_count: 0,
  checked_count: 0,
  outside_roster_count: 0,
  rate: 0,
  by_source: {},
  by_kind: {},
  by_team: [],
  by_date: [],
};

export default function CheckinReportPanel({ sessions, eventTitle }: CheckinReportPanelProps) {
  const { t, locale } = useLanguage();
  const fb = useFeedback();
  const [session, setSession] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [summary, setSummary] = useState<EventCheckinSummary>(EMPTY_SUMMARY);
  const [exporting, setExporting] = useState(false);

  const params = {
    session: session ? Number(session) : undefined,
    date_from: dateFrom ?? undefined,
    date_to: dateTo ?? undefined,
  };

  const load = useCallback(() => {
    let active = true;
    eventCheckinApi.summary(params)
      .then((result) => { if (active) setSummary(result); })
      .catch(() => { if (active) setSummary(EMPTY_SUMMARY); });
    return () => { active = false; };
  }, [session, dateFrom, dateTo]);

  useEffect(load, [load]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await eventCheckinApi.exportCsv(params);
      downloadCheckinCsv(blob, checkinCsvFilename(eventTitle));
      fb.success(t.common.toast.downloaded);
    } catch (err) {
      fb.fromError(err, t.common.toast.downloadFailed);
    } finally {
      setExporting(false);
    }
  };

  const hasData = summary.checked_count > 0;

  return (
    <Stack gap="md" data-testid="checkin-report-panel">
      <Paper withBorder p="md" radius="md">
        <Group align="flex-end" wrap="wrap">
          <Select
            data-testid="checkin-report-session"
            label={t.eventCheckin.sessions.title}
            placeholder={t.common.all}
            clearable
            data={sessions.map((item) => ({
              value: String(item.id),
              label: `${formatCheckinDate(item.occurrence_date, locale)} · ${item.event_title}`,
            }))}
            value={session}
            onChange={setSession}
            w={260}
          />
          <DateInput
            data-testid="checkin-report-from"
            label={t.eventCheckin.sessions.from}
            value={dateFrom}
            onChange={(value) => setDateFrom(value ? parseCheckinDateInput(value) : null)}
            locale={locale}
            valueFormat="DD/MM/YYYY"
            clearable
          />
          <DateInput
            data-testid="checkin-report-to"
            label={t.eventCheckin.sessions.to}
            value={dateTo}
            onChange={(value) => setDateTo(value ? parseCheckinDateInput(value) : null)}
            locale={locale}
            valueFormat="DD/MM/YYYY"
            clearable
          />
          <Button
            data-testid="checkin-report-export"
            variant="default"
            leftSection={<IconDownload size={14} />}
            loading={exporting}
            onClick={exportCsv}
            ml="auto"
          >
            {t.eventCheckin.reports.exportCsv}
          </Button>
        </Group>
      </Paper>

      {!hasData ? (
        <Text c="dimmed" ta="center" py="xl">{t.eventCheckin.reports.noData}</Text>
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
            <Card withBorder radius="md" p="md">
              <Text size="xs" c="dimmed">{t.eventCheckin.reports.expected}</Text>
              <Text size="xl" fw={700}>{summary.expected_count}</Text>
            </Card>
            <Card withBorder radius="md" p="md">
              <Text size="xs" c="dimmed">{t.eventCheckin.reports.checked}</Text>
              <Text size="xl" fw={700}>{summary.checked_count}</Text>
            </Card>
            <Card withBorder radius="md" p="md">
              <Text size="xs" c="dimmed">{t.eventCheckin.reports.outside}</Text>
              <Text size="xl" fw={700} c="orange">{summary.outside_roster_count}</Text>
            </Card>
            <Card withBorder radius="md" p="md">
              <Text size="xs" c="dimmed">{t.eventCheckin.reports.rate}</Text>
              <Text size="xl" fw={700}>{Math.round(summary.rate * 100)}%</Text>
            </Card>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
            <Paper withBorder p="md" radius="md">
              <Text fw={700} size="sm" mb="sm">{t.eventCheckin.reports.bySource}</Text>
              <Stack gap={6}>
                {Object.entries(summary.by_source).map(([key, total]) => (
                  <Group key={key} justify="space-between">
                    <Badge variant="default">
                      {key === 'SCAN' ? t.eventCheckin.checkins.scan : t.eventCheckin.checkins.manual}
                    </Badge>
                    <Text size="sm" fw={600}>{total}</Text>
                  </Group>
                ))}
              </Stack>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Text fw={700} size="sm" mb="sm">{t.eventCheckin.reports.byKind}</Text>
              <Stack gap={6}>
                {Object.entries(summary.by_kind ?? {}).map(([key, total]) => (
                  <Group key={key} justify="space-between">
                    <Badge variant="default">{key}</Badge>
                    <Text size="sm" fw={600}>{total}</Text>
                  </Group>
                ))}
              </Stack>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Text fw={700} size="sm" mb="sm">{t.eventCheckin.reports.byTeam}</Text>
              <Table horizontalSpacing="xs" verticalSpacing="xs" fz="sm">
                <Table.Tbody>
                  {summary.by_team.map((item) => (
                    <Table.Tr key={`${item.id}-${item.name}`}>
                      <Table.Td>{item.name}</Table.Td>
                      <Table.Td ta="right" fw={600}>{item.total}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Text fw={700} size="sm" mb="sm">{t.eventCheckin.reports.byDate}</Text>
              <Table horizontalSpacing="xs" verticalSpacing="xs" fz="sm">
                <Table.Tbody>
                  {summary.by_date.map((item) => (
                    <Table.Tr key={item.date}>
                      <Table.Td>{formatCheckinDate(item.date, locale)}</Table.Td>
                      <Table.Td ta="right" fw={600}>{item.total}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </SimpleGrid>
        </>
      )}
    </Stack>
  );
}
