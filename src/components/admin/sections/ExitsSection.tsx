import React, { useEffect, useState } from 'react';
import {
  Button,
  FileInput,
  Group,
  Stack,
  Select,
  Modal,
  TextInput,
  Badge,
  Box,
  Text,
  ActionIcon,
  Tooltip,
  Anchor,
  Menu,
  Pagination,
  ThemeIcon,
} from '@mantine/core';
import { DatePickerInput, DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { DataTable, DataTableColumn } from 'mantine-datatable';
import {
  IconPlus,
  IconRefresh,
  IconTrash,
  IconPencil,
  IconDownload,
  IconArrowDownRight,
} from '@tabler/icons-react';
import PageHeader from '../../../components/PageHeader';
import ExportModal from '../../../components/ExportModal';
import MoneyInput from '../../../components/MoneyInput';
import MobileItemCard from '../../../components/MobileItemCard';
import { useLanguage } from '../../../i18n';
import { useCategories } from '../../../hooks/useCategories';
import { FinancialExit } from '../../../types';
import { AdminFinanceApi } from '../../../api/adminFinance';
import { formatBRL, formatDate, toISO, toNumber, toSentenceCase } from '../../../utils/format';

function yearRangeDefaults(): [string, string] {
  const year = new Date().getFullYear();
  return [`${year}-01-01`, `${year}-12-31`];
}

function parseDateValue(v: Date | string | null): Date {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === 'string' && v) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function widerRange(
  prev: [string | null, string | null],
  iso: string,
): [string | null, string | null] {
  const [start, end] = prev;
  const next: [string | null, string | null] = [start, end];
  if (start && iso < start) next[0] = iso;
  if (end && iso > end) next[1] = iso;
  return next;
}

function apiErrorMessage(err: any, fallback: string): string {
  const d = err?.response?.data;
  if (!d) return fallback;
  if (typeof d === 'string') return d;
  if (typeof d.detail === 'string') return d.detail;
  const first = Object.keys(d)[0];
  const val = first ? d[first] : null;
  if (Array.isArray(val) && typeof val[0] === 'string') return `${first}: ${val[0]}`;
  if (typeof val === 'string') return `${first}: ${val}`;
  return fallback;
}

const PAGE_SIZE = 20;

export default function ExitsSection({ api, churchLabel }: { api: AdminFinanceApi; churchLabel: string }) {
  const { t, locale } = useLanguage();
  const { categories } = useCategories();

  const [records, setRecords] = useState<FinancialExit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<[string | null, string | null]>(yearRangeDefaults());
  const [category, setCategory] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialExit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinancialExit | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const load = () => {
    setLoading(true);
    api
      .listExits({
        page,
        start_date: range[0] || undefined,
        end_date: range[1] || undefined,
      })
      .then((data) => {
        setRecords(data.results);
        setTotal(data.count);
      })
      .catch(() => {
        setRecords([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, range]);

  const resetFilters = () => {
    setRange(yearRangeDefaults());
    setCategory(null);
    setPage(1);
  };

  const form = useForm({
    initialValues: {
      date: new Date(),
      description: '',
      category: 'ESPECIAL' as string,
      amount: 0,
    },
    validate: {
      date: (v) => (v ? null : t.common.date),
      description: (v) => (v.trim() ? null : t.common.description),
      amount: (v) => (v > 0 ? null : t.common.value),
    },
  });

  const isoToDate = (iso: string): Date | null => {
    const [y, m, d] = iso.split('-').map(Number);
    return y && m && d ? new Date(y, m - 1, d) : null;
  };

  const openCreate = () => {
    setEditing(null);
    setReceiptFile(null);
    form.reset();
    setModalOpen(true);
  };

  const openEdit = (record: FinancialExit) => {
    setEditing(record);
    setReceiptFile(null);
    form.setValues({
      date: isoToDate(record.date) ?? new Date(),
      description: record.description,
      category: record.category,
      amount: toNumber(record.amount),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const valid = form.validate();
    if (valid.hasErrors) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('date', toISO(form.values.date) ?? '');
      fd.append('description', toSentenceCase(form.values.description));
      fd.append('category', form.values.category);
      fd.append('amount', String(form.values.amount));
      if (receiptFile) fd.append('receipt', receiptFile);
      if (editing) {
        await api.updateExit(editing.id, fd);
        notifications.show({ color: 'green', message: 'Saída atualizada.' });
      } else {
        await api.createExit(fd);
        notifications.show({ color: 'green', message: 'Saída registrada.' });
      }
      setModalOpen(false);
      setEditing(null);
      const savedIso = form.values.date ? toISO(form.values.date) : undefined;
      if (savedIso) setRange((prev) => widerRange(prev, savedIso));
      setReceiptFile(null);
      form.reset();
      load();
    } catch (err: any) {
      notifications.show({
        color: 'red',
        title: 'Erro',
        message: apiErrorMessage(err, 'Não foi possível salvar.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteExit(deleteTarget.id);
      notifications.show({ color: 'green', message: 'Registro excluído.' });
      setDeleteTarget(null);
      load();
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao excluir.' });
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<FinancialExit>[] = [
    { accessor: 'date', title: t.common.date, render: (r) => formatDate(r.date), width: 110 },
    {
      accessor: 'description',
      title: t.common.description,
      render: (r) => <Text size="sm">{r.description}</Text>,
    },
    {
      accessor: 'category_display',
      title: t.common.category,
      render: (r) => <Badge variant="light" color="orange" size="sm">{r.category_display || r.category}</Badge>,
    },
    {
      accessor: 'amount',
      title: t.common.value,
      textAlign: 'right',
      render: (r) => <Text c="red" fw={600}>{formatBRL(r.amount)}</Text>,
      width: 140,
    },
    {
      accessor: 'receipt',
      title: t.exitsPage.receipt,
      render: (r) =>
        r.receipt ? (
          <Anchor
            href={r.receipt}
            target="_blank"
            rel="noreferrer"
            size="sm"
            data-testid={`exit-receipt-${r.id}`}
          >
            {r.receipt.split('/').pop()?.split('?')[0]?.slice(0, 30) || t.exitsPage.receipt}
          </Anchor>
        ) : (
          <Text size="sm" c="dimmed">
            —
          </Text>
        ),
      width: 200,
    },
    {
      accessor: 'actions',
      title: t.common.actions,
      width: 100,
      render: (r) => (
        <Group gap={4} wrap="nowrap">
          <Tooltip label={t.common.edit}>
            <ActionIcon color="blue" variant="subtle" onClick={() => openEdit(r)}>
              <IconPencil size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t.common.delete}>
            <ActionIcon color="red" variant="subtle" onClick={() => setDeleteTarget(r)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    },
  ];

  const exitActions = (r: FinancialExit) => (
    <>
      <Menu.Item
        leftSection={<IconPencil size={14} />}
        onClick={() => openEdit(r)}
        data-testid={`exit-mobile-edit-${r.id}`}
      >
        {t.common.edit}
      </Menu.Item>
      <Menu.Item
        leftSection={<IconTrash size={14} />}
        color="red"
        onClick={() => setDeleteTarget(r)}
        data-testid={`exit-mobile-delete-${r.id}`}
      >
        {t.common.delete}
      </Menu.Item>
    </>
  );

  const visibleRecords = category
    ? records.filter((r) => r.category === category)
    : records;

  return (
    <>
      <PageHeader title={t.exitsPage.title} description={churchLabel}>
        <Group gap="sm" wrap="nowrap">
          <Button data-testid="exit-new" leftSection={<IconPlus size={16} />} onClick={openCreate}>
            {t.exitsPage.newExit}
          </Button>
          <Button
            variant="default"
            data-testid="exit-export"
            leftSection={<IconDownload size={16} />}
            onClick={() => setExportOpen(true)}
          >
            {t.exportPage.button}
          </Button>
        </Group>
      </PageHeader>

      <Stack gap="md" mb="md">
        <Group gap="md" wrap="wrap" align="flex-end">
          <Box style={{ maxWidth: 300 }}>
            <DatePickerInput
              data-testid="exit-range"
              type="range"
              label={t.entriesPage.range}
              value={range}
              onChange={setRange}
              clearable
              locale={locale}
            />
          </Box>
          <Select
            data-testid="exit-filter-category"
            label={t.common.category}
            placeholder={t.common.all}
            clearable
            data={categories.map((c) => ({ value: c.value, label: c.label }))}
            value={category}
            onChange={setCategory}
            w={200}
          />
          <Button data-testid="exit-filter-apply" variant="default" onClick={() => setPage(1)} leftSection={<IconRefresh size={16} />}>
            {t.common.filter}
          </Button>
          <Button data-testid="exit-filter-clear" variant="subtle" onClick={resetFilters}>
            {t.common.clear}
          </Button>
        </Group>
      </Stack>

      <Box visibleFrom="sm">
        <DataTable<FinancialExit>
          withTableBorder
          highlightOnHover
          striped
          minHeight={200}
          fetching={loading}
          columns={columns}
          records={visibleRecords}
          noRecordsText={t.common.noData}
          totalRecords={total}
          recordsPerPage={PAGE_SIZE}
          page={page}
          onPageChange={setPage}
          idAccessor="id"
        />
      </Box>

      <Stack hiddenFrom="sm" gap="xs">
        {visibleRecords.map((e) => (
          <MobileItemCard
            key={e.id}
            testId={`exit-mobile-${e.id}`}
            media={
              <ThemeIcon color="red" variant="light" radius="md" size="lg">
                <IconArrowDownRight size={20} />
              </ThemeIcon>
            }
            actions={exitActions(e)}
          >
            <Stack gap={4}>
              <Group gap={4} wrap="nowrap" align="center">
                <Text fw={600} style={{ whiteSpace: 'nowrap' }}>
                  {formatDate(e.date)}
                </Text>
                <Badge variant="light" color="orange" size="sm">
                  {e.category_display || e.category}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed" truncate>
                {e.description}
              </Text>
              {e.receipt ? (
                <Anchor
                  href={e.receipt}
                  target="_blank"
                  rel="noreferrer"
                  size="xs"
                  c="dimmed"
                  truncate
                  data-testid={`exit-mobile-receipt-${e.id}`}
                >
                  {e.receipt.split('/').pop()?.split('?')[0]?.slice(0, 30) || t.exitsPage.receipt}
                </Anchor>
              ) : (
                <Text size="xs" c="dimmed">
                  —
                </Text>
              )}
              <Text fw={700} c="red">
                -{formatBRL(e.amount)}
              </Text>
            </Stack>
          </MobileItemCard>
        ))}
        {total > PAGE_SIZE && (
          <Group justify="center" py="sm">
            <Pagination
              value={page}
              onChange={setPage}
              total={Math.max(1, Math.ceil(total / PAGE_SIZE))}
              size="sm"
              data-testid="exits-pagination"
            />
          </Group>
        )}
      </Stack>

      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? t.exitsPage.editTitle : t.exitsPage.newExit}
        centered
      >
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack gap="md">
            <DateInput
              data-testid="exit-date"
              label={t.common.date}
              value={form.values.date}
              onChange={(v) => form.setFieldValue('date', parseDateValue(v))}
              locale={locale}
            />
            <TextInput
              data-testid="exit-description"
              label={t.common.description}
              placeholder="Energia elétrica..."
              required
              {...form.getInputProps('description')}
            />
            <Select
              data-testid="exit-category"
              label={t.common.category}
              data={categories.map((c) => ({ value: c.value, label: c.label }))}
              required
              {...form.getInputProps('category')}
            />
            <MoneyInput
              data-testid="exit-amount"
              label={t.common.value}
              required
              value={form.values.amount}
              onValueChange={(v) => form.setFieldValue('amount', typeof v === 'number' ? v : 0)}
              error={form.errors.amount}
            />
            <FileInput
              data-testid="exit-receipt"
              label={t.exitsPage.receipt}
              placeholder={t.exitsPage.receipt}
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              clearable
              value={receiptFile}
              onChange={setReceiptFile}
            />
            <Group justify="flex-end" mt="xs">
              <Button data-testid="exit-cancel" variant="default" onClick={() => setModalOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button data-testid="exit-save" type="submit" loading={saving}>
                {t.common.save}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t.common.deleteTitle}
        centered
      >
        <Text size="sm" mb="md">
          {t.common.deleteConfirm}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setDeleteTarget(null)}>
            {t.common.deleteCancel}
          </Button>
          <Button color="red" loading={deleting} onClick={confirmDelete}>
            {t.common.delete}
          </Button>
        </Group>
      </Modal>

      <ExportModal
        opened={exportOpen}
        onClose={() => setExportOpen(false)}
        type="exits"
        api={api}
      />
    </>
  );
}
