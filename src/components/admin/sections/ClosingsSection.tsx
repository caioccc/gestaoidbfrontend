import React, { useEffect, useState } from 'react';
import {
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
  Button,
  ActionIcon,
  Modal,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconLock, IconLockOpen, IconDownload } from '@tabler/icons-react';
import PageHeader from '../../../components/PageHeader';
import ExportModal from '../../../components/ExportModal';
import { useLanguage } from '../../../i18n';
import { MonthlyClosingsResponse } from '../../../types';
import { formatBRL } from '../../../utils/format';
import { saveBlob } from '../../../api/finance';
import { AdminFinanceApi } from '../../../api/adminFinance';

const YEARS = [2022, 2023, 2024, 2025, 2026, 2027];

export default function ClosingsSection({ api, churchLabel }: { api: AdminFinanceApi; churchLabel: string }) {
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
    api
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
      await api.closeMonth(year, month, close);
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
      const blob = await api.caixaDownload(year, month);
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
    api
      .monthlyClosings(year)
      .then((d) => active && setData(d))
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [year]);

  return (
    <>
      <PageHeader title={t.closingsPage.title} description={churchLabel}>
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
                        <Button
                          data-testid={`closings-toggle-${m.month}`}
                          size="xs"
                          variant={m.is_closed ? 'outline' : 'light'}
                          color={m.is_closed ? 'yellow' : 'teal'}
                          leftSection={
                            m.is_closed ? <IconLockOpen size={14} /> : <IconLock size={14} />
                          }
                          loading={busy && confirmTarget?.month === m.month}
                          onClick={() =>
                            setConfirmTarget({ month: m.month, close: !m.is_closed })
                          }
                        >
                          {m.is_closed ? t.closingsPage.reopen : t.closingsPage.close}
                        </Button>
                        <ActionIcon
                          data-testid={`closings-caixa-${m.month}`}
                          variant="subtle"
                          color="blue"
                          size="md"
                          title={t.closingsPage.downloadCaixa}
                          aria-label={t.closingsPage.downloadCaixa}
                          loading={caixaBusy === m.month}
                          onClick={() => handleDownloadCaixa(m.month)}
                        >
                          <IconDownload size={16} />
                        </ActionIcon>
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
        api={api}
      />
    </>
  );
}
