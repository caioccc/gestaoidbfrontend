import React, { useEffect, useState } from 'react';
import {
  Box,
  Group,
  Stack,
  Select,
  Paper,
  Table,
  ScrollArea,
  Badge,
  Skeleton,
  Text,
  Flex,
  ThemeIcon,
  Button,
  ActionIcon,
  Modal,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconLock, IconLockOpen, IconAlertTriangle, IconDownload } from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import ExportModal from '../components/ExportModal';
import MobileItemCard from '../components/MobileItemCard';
import { useLanguage } from '../i18n';
import { MonthlyClosingsResponse, MonthlyClosing } from '../types';
import { financeApi, saveBlob } from '../api/finance';
import { formatBRL } from '../utils/format';

const YEARS = [2022, 2023, 2024, 2025, 2026, 2027];

export default function ClosingsPage() {
  const { t } = useLanguage();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [data, setData] = useState<MonthlyClosingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [caixaBusy, setCaixaBusy] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{
    month: number;
    close: boolean;
  } | null>(null);

  const reload = () => {
    setLoading(true);
    financeApi
      .monthlyClosings(year)
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  const handleToggleClose = async () => {
    if (!confirmTarget) return;
    const { month, close } = confirmTarget;
    setBusy(true);
    try {
      await financeApi.closeMonth(year, month, close);
      notifications.show({
        color: 'green',
        message: close ? t.closingsPage.closedMsg : t.closingsPage.reopenedMsg,
      });
      setConfirmTarget(null);
      reload();
    } catch (err: any) {
      notifications.show({
        color: 'red',
        title: 'Erro',
        message: err?.response?.data?.detail || 'Não foi possível alterar o fechamento.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadCaixa = async (month: number) => {
    setCaixaBusy(month);
    try {
      const blob = await financeApi.caixaDownload(year, month);
      saveBlob(blob, `caixa-idb-${year}-${String(month).padStart(2, '0')}.xls`);
    } catch (err: any) {
      notifications.show({
        color: 'red',
        title: 'Erro',
        message: err?.response?.data?.detail || 'Não foi possível baixar o caixa.',
      });
    } finally {
      setCaixaBusy(null);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    financeApi
      .monthlyClosings(year)
      .then((d) => active && setData(d))
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [year]);

  const closingActions = (c: MonthlyClosing) => (
    <>
      <Button
        data-testid={`closings-toggle-${c.month}`}
        size="xs"
        variant={c.is_closed ? 'outline' : 'light'}
        color={c.is_closed ? 'yellow' : 'teal'}
        leftSection={c.is_closed ? <IconLockOpen size={14} /> : <IconLock size={14} />}
        loading={busy && confirmTarget?.month === c.month}
        onClick={() => setConfirmTarget({ month: c.month, close: !c.is_closed })}
      >
        {c.is_closed ? t.closingsPage.reopen : t.closingsPage.close}
      </Button>
      <ActionIcon
        data-testid={`closings-caixa-${c.month}`}
        variant="subtle"
        color="blue"
        size="md"
        title={t.closingsPage.downloadCaixa}
        aria-label={t.closingsPage.downloadCaixa}
        loading={caixaBusy === c.month}
        onClick={() => handleDownloadCaixa(c.month)}
      >
        <IconDownload size={16} />
      </ActionIcon>
    </>
  );

  return (
    <>
      <PageHeader title={t.closingsPage.title}>
        <Stack align="flex-end" gap={6}>
          <Button
            variant="default"
            data-testid="closings-export"
            leftSection={<IconDownload size={16} />}
            onClick={() => setExportOpen(true)}
          >
            {t.exportPage.button}
          </Button>
          <Select
            data-testid="closings-year"
            label={t.common.year}
            value={String(year)}
            onChange={(v) => v && setYear(Number(v))}
            data={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
            w={110}
          />
        </Stack>
      </PageHeader>

      <Paper withBorder radius="md" p="md">
        {loading ? (
          <Skeleton height={320} />
        ) : !data ? (
          <Text c="dimmed" ta="center" py="xl">
            {t.common.noData}
          </Text>
        ) : (
          <>
            <Box visibleFrom="sm">
            <ScrollArea>
              <Table striped withTableBorder highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t.common.month}</Table.Th>
                    <Table.Th ta="right">{t.closingsPage.previous}</Table.Th>
                    <Table.Th ta="right">{t.closingsPage.entries}</Table.Th>
                    <Table.Th ta="right">{t.closingsPage.exits}</Table.Th>
                    <Table.Th ta="right">{t.closingsPage.final}</Table.Th>
                    <Table.Th ta="center">{t.common.status}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.months.map((m) => (
                    <Table.Tr key={m.month}>
                      <Table.Td fw={600}>{t.months[m.month - 1]}</Table.Td>
                      <Table.Td ta="right">{formatBRL(m.previous_balance)}</Table.Td>
                      <Table.Td ta="right" c="green">
                        {formatBRL(m.total_entries)}
                      </Table.Td>
                      <Table.Td ta="right" c="red">
                        {formatBRL(m.total_exits)}
                      </Table.Td>
                      <Table.Td ta="right" fw={700}>
                        {formatBRL(m.final_balance)}
                      </Table.Td>
                      <Table.Td ta="center">
                        <Group gap={6} justify="center" wrap="nowrap">
                          <Badge color={m.is_closed ? 'green' : 'yellow'} variant="light">
                            {m.is_closed ? t.closingsPage.closed : t.closingsPage.open}
                          </Badge>
                          {closingActions(m)}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  <Table.Tr
                    style={{
                      borderTop: '2px solid var(--mantine-color-default-border)',
                      backgroundColor: 'var(--mantine-color-default-hover)',
                      fontWeight: 'bold',
                    }}
                  >
                    <Table.Td fw={800}>{t.common.total}</Table.Td>
                    <Table.Td ta="right" c="dimmed">
                      {formatBRL(0)}
                    </Table.Td>
                    <Table.Td ta="right" c="teal">
                      {formatBRL(data.grand_total.total_entries)}
                    </Table.Td>
                    <Table.Td ta="right" c="red">
                      {formatBRL(data.grand_total.total_exits)}
                    </Table.Td>
                    <Table.Td ta="right" c="blue">
                      {formatBRL(
                        Number(data.grand_total.total_entries) -
                          Number(data.grand_total.total_exits)
                      )}
                    </Table.Td>
                    <Table.Td />
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Box>
          <Stack hiddenFrom="sm" gap="xs" p="sm">
            {data.months.map((c) => (
              <MobileItemCard
                key={c.id}
                testId={`closing-mobile-${c.id}`}
                media={
                  <ThemeIcon
                    color={c.is_closed ? 'green' : 'orange'}
                    variant="light"
                    radius="md"
                    size="lg"
                  >
                    {c.is_closed ? <IconLockOpen size={20} /> : <IconLock size={20} />}
                  </ThemeIcon>
                }
                actions={closingActions(c)}
              >
                <Stack gap={4}>
                  <Group gap={6} align="center" wrap="nowrap">
                    <Text fw={600}>{t.months[c.month - 1]}</Text>
                    <Badge color={c.is_closed ? 'green' : 'yellow'} variant="light" size="sm">
                      {c.is_closed ? t.closingsPage.closed : t.closingsPage.open}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" truncate>
                    {t.closingsPage.previous}: {formatBRL(c.previous_balance)}
                  </Text>
                  <Text size="xs" c="green" truncate>
                    {t.closingsPage.entries}: +{formatBRL(c.total_entries)}
                  </Text>
                  <Text size="xs" c="red" truncate>
                    {t.closingsPage.exits}: -{formatBRL(c.total_exits)}
                  </Text>
                  <Text
                    fw={700}
                    c={
                      Number(c.final_balance) > 0
                        ? 'teal'
                        : Number(c.final_balance) < 0
                          ? 'red'
                          : 'dimmed'
                    }
                  >
                    {t.closingsPage.final}: {formatBRL(c.final_balance)}
                  </Text>
                </Stack>
              </MobileItemCard>
            ))}
          </Stack>
          </>
        )}
      </Paper>
      <Flex justify="flex-end" mt="sm">
        <Text size="xs" c="dimmed">
          {data?.year ? `${t.common.year}: ${data.year}` : ''}
        </Text>
      </Flex>

      <Modal
        opened={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        title={
          confirmTarget?.close
            ? t.closingsPage.closeConfirmTitle
            : t.closingsPage.reopenConfirmTitle
        }
        centered
      >
        <Stack gap="md">
          {confirmTarget && (
            <Text size="sm">
              {confirmTarget.close
                ? t.closingsPage.closeConfirmBody
                : t.closingsPage.reopenConfirmBody}
              {` ${t.months[(confirmTarget.month - 1)]}/${year}`}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmTarget(null)}>
              {t.common.cancel}
            </Button>
            <Button
              data-testid="closings-toggle-confirm"
              color={confirmTarget?.close ? 'teal' : 'yellow'}
              loading={busy}
              onClick={handleToggleClose}
            >
              {confirmTarget?.close ? t.closingsPage.close : t.closingsPage.reopen}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <ExportModal
        opened={exportOpen}
        onClose={() => setExportOpen(false)}
        type="closings"
        api={financeApi}
      />
    </>
  );
}
