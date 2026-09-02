import React, { useEffect, useState } from 'react';
import {
  Button,
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
  NumberInput,
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
} from '@tabler/icons-react';
import PageHeader from '../../../components/PageHeader';
import ExportModal from '../../../components/ExportModal';
import { useLanguage } from '../../../i18n';
import { useCategories } from '../../../hooks/useCategories';
import { FinancialEntry } from '../../../types';
import { AdminFinanceApi } from '../../../api/adminFinance';
import { formatBRL, formatDate, toISO, toNumber, toSentenceCase } from '../../../utils/format';

function yearRangeDefaults(): [string, string] {
  const year = new Date().getFullYear();
  return [`${year}-01-01`, `${year}-12-31`];
}

export default function EntriesSection({ api, churchLabel }: { api: AdminFinanceApi; churchLabel: string }) {
  const { t, locale } = useLanguage();
  const { categories } = useCategories();

  const [records, setRecords] = useState<FinancialEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<[string | null, string | null]>(yearRangeDefaults());
  const [category, setCategory] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinancialEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .listEntries({
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

  const applyFilters = () => {
    setPage(1);
    load();
  };

  const resetFilters = () => {
    setRange(yearRangeDefaults());
    setCategory(null);
    setPage(1);
  };

  const form = useForm({
    initialValues: {
      date: new Date(),
      service_description: '',
      category: 'OFERTA' as string,
      amount: 0,
    },
    validate: {
      service_description: (v) => (v.trim() ? null : t.entriesPage.service),
      amount: (v) => (v > 0 ? null : t.common.value),
    },
  });

  const isoToDate = (iso: string): Date | null => {
    const [y, m, d] = iso.split('-').map(Number);
    return y && m && d ? new Date(y, m - 1, d) : null;
  };

  const openCreate = () => {
    setEditing(null);
    form.reset();
    setModalOpen(true);
  };

  const openEdit = (record: FinancialEntry) => {
    setEditing(record);
    form.setValues({
      date: isoToDate(record.date) ?? new Date(),
      service_description: record.service_description,
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
      const payload = {
        date: toISO(form.values.date),
        service_description: toSentenceCase(form.values.service_description),
        category: form.values.category as FinancialEntry['category'],
        amount: String(form.values.amount),
      };
      if (editing) {
        await api.updateEntry(editing.id, payload);
        notifications.show({ color: 'green', message: 'Entrada atualizada.' });
      } else {
        await api.createEntry(payload);
        notifications.show({ color: 'green', message: 'Entrada registrada.' });
      }
      setModalOpen(false);
      setEditing(null);
      form.reset();
      load();
    } catch (err: any) {
      notifications.show({
        color: 'red',
        title: 'Erro',
        message: err?.response?.data?.detail || 'Não foi possível salvar.',
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteEntry(deleteTarget.id);
      notifications.show({ color: 'green', message: 'Registro excluído.' });
      setDeleteTarget(null);
      load();
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao excluir.' });
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<FinancialEntry>[] = [
    { accessor: 'date', title: t.common.date, render: (r) => formatDate(r.date), width: 110 },
    {
      accessor: 'service_description',
      title: t.entriesPage.service,
      render: (r) => <Text size="sm">{r.service_description}</Text>,
    },
    {
      accessor: 'category_display',
      title: t.common.category,
      render: (r) => <Badge variant="light" size="sm">{r.category_display || r.category}</Badge>,
    },
    {
      accessor: 'amount',
      title: t.common.value,
      textAlign: 'right',
      render: (r) => <Text c="green" fw={600}>{formatBRL(r.amount)}</Text>,
      width: 140,
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

  const visibleRecords = category
    ? records.filter((r) => r.category === category)
    : records;

  return (
    <>
      <PageHeader title={t.entriesPage.title} description={churchLabel}>
        <Group gap="sm" wrap="nowrap">
          <Button data-testid="entry-new" leftSection={<IconPlus size={16} />} onClick={openCreate}>
            {t.entriesPage.newEntry}
          </Button>
          <Button
            variant="default"
            data-testid="entry-export"
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
              data-testid="entry-range"
              type="range"
              label={t.entriesPage.range}
              value={range}
              onChange={setRange}
              clearable
              locale={locale}
            />
          </Box>
          <Select
            data-testid="entry-filter-category"
            label={t.common.category}
            placeholder={t.common.all}
            clearable
            data={categories.map((c) => ({ value: c.value, label: c.label }))}
            value={category}
            onChange={(v) => {
              setCategory(v);
              setPage(1);
            }}
            w={200}
          />
          <Button data-testid="entry-filter-apply" variant="default" onClick={applyFilters} leftSection={<IconRefresh size={16} />}>
            {t.common.filter}
          </Button>
          <Button data-testid="entry-filter-clear" variant="subtle" onClick={resetFilters}>
            {t.common.clear}
          </Button>
        </Group>
      </Stack>

      <DataTable<FinancialEntry>
        withTableBorder
        highlightOnHover
        striped
        minHeight={200}
        fetching={loading}
        columns={columns}
        records={visibleRecords}
        noRecordsText={t.common.noData}
        totalRecords={total}
        recordsPerPage={20}
        page={page}
        onPageChange={setPage}
        idAccessor="id"
      />

      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? t.entriesPage.editTitle : t.entriesPage.newEntry}
        centered
      >
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack gap="md">
            <DateInput data-testid="entry-date" label={t.common.date} {...form.getInputProps('date')} locale={locale} />
            <TextInput
              data-testid="entry-service"
              label={t.entriesPage.service}
              placeholder="Culto de domingo..."
              required
              {...form.getInputProps('service_description')}
            />
            <Select
              data-testid="entry-category"
              label={t.common.category}
              data={categories.map((c) => ({ value: c.value, label: c.label }))}
              required
              {...form.getInputProps('category')}
            />
            <NumberInput
              data-testid="entry-amount"
              label={t.common.value}
              required
              min={0}
              decimalScale={2}
              fixedDecimalScale
              value={form.values.amount}
              onChange={(v) => form.setFieldValue('amount', typeof v === 'number' ? v : toNumber(v))}
              error={form.errors.amount}
            />
            <Group justify="flex-end" mt="xs">
              <Button data-testid="entry-cancel" variant="default" onClick={() => setModalOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button data-testid="entry-save" type="submit" loading={saving}>
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
        type="entries"
        api={api}
      />
    </>
  );
}