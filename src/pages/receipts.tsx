import React, { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Menu,
  Modal,
  Pagination,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { DataTable, DataTableColumn } from 'mantine-datatable';
import { useRouter } from 'next/router';
import {
  IconDownload,
  IconLock,
  IconPencil,
  IconPlus,
  IconReceipt,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import MobileItemCard from '../components/MobileItemCard';
import MoneyInput from '../components/MoneyInput';
import { accountsApi } from '../api/accounts';
import { financeApi, receiptsApi, saveBlob } from '../api/finance';
import { useCategories } from '../hooks/useCategories';
import { useLanguage } from '../i18n';
import {
  FinancialReceipt,
  FinancialReceiptPayload,
  FinancialReceiptType,
  Member,
} from '../types';
import {
  formatDate,
  formatBRL,
  toISO,
  toNumber,
  toSentenceCase,
  toUpperCamelWords,
} from '../utils/format';
import { valorPorExtenso } from '../utils/extenso';

const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
].map((u) => ({ value: u, label: u }));

function currentYear() {
  return new Date().getFullYear();
}

export default function ReceiptsPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const { categories } = useCategories();

  // Data
  const [records, setRecords] = useState<FinancialReceipt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [year, setYear] = useState<string | null>(String(currentYear()));
  const [rtype, setRtype] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const PAGE_SIZE = 20;

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialReceipt | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FinancialReceipt | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Source from quick-action query params
  const [sourceType, setSourceType] = useState<'entry' | 'exit' | null>(null);
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [sourceDesc, setSourceDesc] = useState('');
  const [sourceAmount, setSourceAmount] = useState(0);

  // Members for autofill
  const [members, setMembers] = useState<Member[]>([]);

  // Available years (static current..current-4 + years from data)
  const yearOptions = useMemo(() => {
    const cy = currentYear();
    const set = new Set<string>([String(cy), String(cy - 1), String(cy - 2)]);
    records.forEach((r) => set.add(String(r.year)));
    return Array.from(set)
      .sort((a, b) => Number(b) - Number(a))
      .map((y) => ({ value: y, label: y }));
  }, [records]);

  // Load members for the member select
  useEffect(() => {
    accountsApi
      .members()
      .then((list) => setMembers(list))
      .catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    receiptsApi
      .list({
        page,
        year: year ? Number(year) : undefined,
        receipt_type: rtype as FinancialReceiptType | undefined,
        search: search.trim() || undefined,
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

  useEffect(load, [page, year, rtype]);

  // Handle quick-action query params on mount
  useEffect(() => {
    const q = router.query;
    if (q.source && q.id) {
      const src = q.source === 'entry' ? 'entry' : 'exit';
      const id = Number(q.id);
      if (!id) return;
      form.reset();
      form.setFieldValue('date', new Date());
      form.setFieldValue('receipt_type', q.type === 'ENTRADA' ? 'ENTRADA' : 'SAIDA');
      setSourceType(src);
      setSourceId(id);
      // Prefetch linked movement
      const fetcher = src === 'entry' ? financeApi.getEntry : financeApi.getExit;
      fetcher(id)
        .then((mov) => {
          setSourceDesc(
            src === 'entry'
              ? (mov as any).service_description || (mov as any).description || ''
              : (mov as any).description || '',
          );
          setSourceAmount(toNumber(mov.amount));
        })
        .catch(() => {});
      // Open modal immediately
      setEditing(null);
      setModalOpen(true);
      // Clear the query params so they don't fire again
      router.replace('/receipts', undefined, { shallow: true });
    }
  }, [router.query]);

  const resetFilters = () => {
    setYear(String(currentYear()));
    setRtype(null);
    setSearch('');
    setPage(1);
  };

  // Form
  const form = useForm({
    initialValues: {
      receipt_type: 'SAIDA' as FinancialReceiptType,
      date: new Date(),
      amount: 0,
      description: '',
      category: '' as string,
      member: '' as string,
      favored_name: '',
      favored_document: '',
      favored_rg: '',
      favored_city: '',
      favored_state: '' as string,
      pix: '',
      auto_launch: false,
    },
    validate: {
      favored_name: (v) => (v.trim() ? null : t.receiptsPage.favoredName),
      amount: (v) => (v > 0 ? null : t.common.value),
      description: (v) => (v.trim() ? null : t.common.description),
    },
  });

  const isoToDate = (iso: string): Date | null => {
    const [y, m, d] = iso.split('-').map(Number);
    return y && m && d ? new Date(y, m - 1, d) : null;
  };

  const parseReceiptDate = (v: Date | string | null): Date => {
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
    if (typeof v === 'string' && v) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        value: String(m.id),
        label: m.name,
      })),
    [members],
  );

  const handleMemberChange = (memberId: string | null) => {
    form.setFieldValue('member', memberId || '');
    if (!memberId) return;
    const m = members.find((x) => x.id === Number(memberId));
    if (m) {
      form.setFieldValue('favored_name', toUpperCamelWords(m.name));
      form.setFieldValue('favored_document', m.cpf || '');
      form.setFieldValue('favored_rg', m.rg || '');
      form.setFieldValue('favored_city', m.city || m.born_in_city || '');
      form.setFieldValue('favored_state', m.state || m.born_in_state || '');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setSourceType(null);
    setSourceId(null);
    setSourceDesc('');
    setSourceAmount(0);
    form.reset();
    form.setFieldValue('date', new Date());
    form.setFieldValue('receipt_type', 'SAIDA');
    form.setFieldValue('auto_launch', false);
    setModalOpen(true);
  };

  const openEdit = (record: FinancialReceipt) => {
    setEditing(record);
    setSourceType(null);
    setSourceId(null);
    setSourceDesc(record.linked_description || '');
    setSourceAmount(0);
    form.setValues({
      receipt_type: record.receipt_type,
      date: isoToDate(record.date) ?? new Date(),
      amount: toNumber(record.amount),
      description: record.description,
      category: record.category || '',
      member: record.member ? String(record.member) : '',
      favored_name: record.favored_name,
      favored_document: record.favored_document || '',
      favored_rg: record.favored_rg || '',
      favored_city: record.favored_city || '',
      favored_state: record.favored_state || '',
      pix: record.pix || '',
      auto_launch: false,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const valid = form.validate();
    if (valid.hasErrors) return;
    setSaving(true);
    try {
      const payload: FinancialReceiptPayload = {
        receipt_type: form.values.receipt_type,
        date: toISO(form.values.date) ?? '',
        amount: form.values.amount,
        description: toSentenceCase(form.values.description),
        category: (form.values.category || undefined) as FinancialReceiptPayload['category'],
        member: form.values.member ? Number(form.values.member) : null,
        favored_name: toUpperCamelWords(form.values.favored_name),
        favored_document: form.values.favored_document || undefined,
        favored_rg: form.values.favored_rg || undefined,
        favored_city: form.values.favored_city || undefined,
        favored_state: form.values.favored_state || undefined,
        pix: form.values.pix || undefined,
      };
      // Vincula o movimento de origem apenas na emissão (não ao editar).
      if (!editing) {
        if (sourceType === 'entry') payload.entry = sourceId;
        if (sourceType === 'exit') payload.exit = sourceId;
        payload.auto_launch = form.values.auto_launch;
      }
      let created: FinancialReceipt;
      if (editing) {
        created = await receiptsApi.update(editing.id, payload);
        notifications.show({ color: 'green', message: t.receiptsPage.emitSuccess });
      } else {
        created = await receiptsApi.create(payload);
        notifications.show({ color: 'green', message: t.receiptsPage.emitSuccess });
      }
      setModalOpen(false);
      setEditing(null);
      form.reset();
      load();
      // Auto-download PDF after emit
      if (created.pdf_url) {
        try {
          const blob = await receiptsApi.downloadPdf(created.id);
          saveBlob(blob, `recibo-${created.full_number}.pdf`);
        } catch {
          /* PDF not ready */
        }
      }
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
      await receiptsApi.delete(deleteTarget.id);
      notifications.show({ color: 'green', message: t.receiptsPage.deleted });
      setDeleteTarget(null);
      load();
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao excluir.' });
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadPdf = async (r: FinancialReceipt) => {
    try {
      const blob = await receiptsApi.downloadPdf(r.id);
      saveBlob(blob, `recibo-${r.full_number}.pdf`);
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao baixar PDF.' });
    }
  };

  const columns: DataTableColumn<FinancialReceipt>[] = [
    {
      accessor: 'full_number',
      title: t.receiptsPage.number,
      width: 90,
      render: (r) => (
        <Text fw={700} size="sm" style={{ fontFamily: 'monospace' }}>
          {r.full_number}
        </Text>
      ),
    },
    { accessor: 'date', title: t.receiptsPage.date, width: 110, render: (r) => formatDate(r.date) },
    {
      accessor: 'type_display',
      title: t.receiptsPage.receiptType,
      width: 140,
      render: (r) => (
        <Badge
          variant="light"
          color={r.receipt_type === 'SAIDA' ? 'red' : 'green'}
          size="sm"
        >
          {r.receipt_type === 'SAIDA' ? t.receiptsPage.saida : t.receiptsPage.entrada}
        </Badge>
      ),
    },
    {
      accessor: 'favored_name',
      title: t.receiptsPage.favored,
      render: (r) => (
        <Stack gap={2}>
          <Text size="sm">{r.favored_name}</Text>
          {r.linked_description ? (
            <Text size="xs" c="dimmed" truncate>
              {r.linked_description}
            </Text>
          ) : null}
        </Stack>
      ),
    },
    {
      accessor: 'amount',
      title: t.receiptsPage.amount,
      textAlign: 'right',
      width: 130,
      render: (r) => (
        <Text c={r.receipt_type === 'SAIDA' ? 'red' : 'teal'} fw={600}>
          {formatBRL(r.amount)}
        </Text>
      ),
    },
    {
      accessor: 'actions',
      title: t.common.actions,
      width: 110,
      render: (r) => (
        <Group gap={4} wrap="nowrap">
          <Tooltip label={t.receiptsPage.download}>
            <ActionIcon color="green" variant="subtle" onClick={() => handleDownloadPdf(r)}>
              <IconDownload size={16} />
            </ActionIcon>
          </Tooltip>
          {!r.locked && (
            <>
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
            </>
          )}
          {r.locked && (
            <Tooltip label={t.receiptsPage.lockedHint}>
              <ActionIcon variant="subtle" c="dimmed">
                <IconLock size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      ),
    },
  ];

  const mobileActions = (r: FinancialReceipt) => (
    <>
      <Menu.Item
        leftSection={<IconDownload size={14} />}
        onClick={() => handleDownloadPdf(r)}
      >
        {t.receiptsPage.download}
      </Menu.Item>
      {!r.locked && (
        <>
          <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => openEdit(r)}>
            {t.common.edit}
          </Menu.Item>
          <Menu.Item
            leftSection={<IconTrash size={14} />}
            color="red"
            onClick={() => setDeleteTarget(r)}
          >
            {t.common.delete}
          </Menu.Item>
        </>
      )}
    </>
  );

  return (
    <>
      <PageHeader title={t.receiptsPage.title}>
        <Group gap="sm" wrap="nowrap">
          <Button data-testid="receipt-new" leftSection={<IconPlus size={16} />} onClick={openCreate}>
            {t.receiptsPage.newReceipt}
          </Button>
          <Tooltip label={t.common.filter}>
            <ActionIcon variant="default" size="lg" onClick={load}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </PageHeader>

      <Stack gap="md" mb="md">
        <Group gap="md" wrap="wrap" align="flex-end">
          <Select
            data-testid="receipt-filter-year"
            label={t.receiptsPage.yearFilter}
            placeholder={t.receiptsPage.allYears}
            clearable
            data={yearOptions}
            value={year}
            onChange={(v) => { setYear(v); setPage(1); }}
            w={120}
          />
          <Select
            data-testid="receipt-filter-type"
            label={t.receiptsPage.receiptType}
            placeholder={t.common.all}
            clearable
            data={[
              { value: 'SAIDA', label: t.receiptsPage.saida },
              { value: 'ENTRADA', label: t.receiptsPage.entrada },
            ]}
            value={rtype}
            onChange={(v) => { setRtype(v); setPage(1); }}
            w={200}
          />
          <TextInput
            data-testid="receipt-filter-search"
            label={t.receiptsPage.search}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { setPage(1); load(); }
            }}
            w={260}
          />
          <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={() => { setPage(1); load(); }}>
            {t.common.filter}
          </Button>
          <Button variant="subtle" onClick={resetFilters}>
            {t.common.clear}
          </Button>
        </Group>
      </Stack>

      {/* Desktop table */}
      <Box visibleFrom="sm">
        <DataTable<FinancialReceipt>
          withTableBorder
          highlightOnHover
          striped
          minHeight={200}
          fetching={loading}
          columns={columns}
          records={records}
          noRecordsText={t.receiptsPage.empty}
          totalRecords={total}
          recordsPerPage={PAGE_SIZE}
          page={page}
          onPageChange={setPage}
          idAccessor="id"
        />
      </Box>

      {/* Mobile cards */}
      <Stack hiddenFrom="sm" gap="xs">
        {records.map((r) => (
          <MobileItemCard
            key={r.id}
            testId={`receipt-mobile-${r.id}`}
            media={
              <ThemeIcon
                color={r.receipt_type === 'SAIDA' ? 'red' : 'green'}
                variant="light"
                radius="md"
                size="lg"
              >
                <IconReceipt size={20} />
              </ThemeIcon>
            }
            actions={mobileActions(r)}
          >
            <Stack gap={4}>
              <Group gap={4} wrap="nowrap" align="center">
                <Text fw={600} size="sm" style={{ fontFamily: 'monospace' }}>
                  {r.full_number}
                </Text>
                <Badge
                  variant="light"
                  color={r.receipt_type === 'SAIDA' ? 'red' : 'green'}
                  size="sm"
                >
                  {r.receipt_type === 'SAIDA' ? t.receiptsPage.saida : t.receiptsPage.entrada}
                </Badge>
                {r.locked && (
                  <Tooltip label={t.receiptsPage.lockedHint}>
                    <IconLock size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                  </Tooltip>
                )}
              </Group>
              <Text size="sm">{r.favored_name}</Text>
              <Text size="xs" c="dimmed" truncate>
                {r.description}
              </Text>
              <Text fw={700} c={r.receipt_type === 'SAIDA' ? 'red' : 'teal'}>
                {formatBRL(r.amount)}
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
              data-testid="receipts-pagination"
            />
          </Group>
        )}
      </Stack>

      {/* Emit/Edit Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        title={editing ? t.receiptsPage.editTitle : t.receiptsPage.newReceipt}
        centered
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack gap="md">
            {/* Locked notice */}
            {editing?.locked && (
              <Text size="sm" c="red" fw={600}>
                {t.receiptsPage.lockedHint}
              </Text>
            )}

            {/* Tipo + Data */}
            <SegmentedControl
              data-testid="receipt-type"
              data={[
                { value: 'SAIDA', label: t.receiptsPage.saida },
                { value: 'ENTRADA', label: t.receiptsPage.entrada },
              ]}
              value={form.values.receipt_type}
              onChange={(v) => form.setFieldValue('receipt_type', v as FinancialReceiptType)}
              fullWidth
            />
            <DateInput
              data-testid="receipt-date"
              label={t.receiptsPage.date}
              locale={locale}
              value={form.values.date}
              onChange={(v) => form.setFieldValue('date', parseReceiptDate(v))}
            />

            {/* Vinculação (origem) */}
            {sourceType && (
              <Box
                p="xs"
                style={{ border: '1px solid var(--mantine-color-gray-4)', borderRadius: 'var(--mantine-radius-sm)' }}
              >
                <Group gap="xs" wrap="nowrap">
                  <IconReceipt size={16} />
                  <Stack gap={0}>
                    <Text size="xs" fw={600}>
                      {t.receiptsPage.sourceLabel}:{' '}
                      {sourceType === 'entry' ? t.receiptsPage.emitFromEntry : t.receiptsPage.emitFromExit}
                      {sourceId ? ` #${sourceId}` : ''}
                    </Text>
                    {sourceDesc && (
                      <Text size="xs" c="dimmed" truncate>
                        {sourceDesc}
                      </Text>
                    )}
                    {sourceAmount > 0 && (
                      <Text size="xs" fw={600}>
                        {formatBRL(sourceAmount)}
                      </Text>
                    )}
                  </Stack>
                </Group>
              </Box>
            )}

            <Switch
              data-testid="receipt-auto-launch"
              label={t.receiptsPage.autoLaunch}
              description={t.receiptsPage.autoLaunchHint}
              checked={form.values.auto_launch}
              onChange={(e) => form.setFieldValue('auto_launch', e.currentTarget.checked)}
            />

            <Divider label={t.receiptsPage.favored} labelPosition="left" />

            {/* Favorecido */}
            <Select
              data-testid="receipt-member"
              label={t.receiptsPage.member}
              description={t.receiptsPage.memberHint}
              data={memberOptions}
              searchable
              clearable
              value={form.values.member}
              onChange={handleMemberChange}
            />
            <TextInput
              data-testid="receipt-favored-name"
              label={t.receiptsPage.favoredName}
              required
              {...form.getInputProps('favored_name')}
            />
            <Group grow>
              <TextInput
                data-testid="receipt-favored-document"
                label={t.receiptsPage.document}
                placeholder="000.000.000-00"
                {...form.getInputProps('favored_document')}
              />
              <TextInput
                data-testid="receipt-favored-rg"
                label={t.receiptsPage.rg}
                {...form.getInputProps('favored_rg')}
              />
            </Group>
            <Group grow>
              <TextInput
                data-testid="receipt-favored-city"
                label={t.receiptsPage.city}
                {...form.getInputProps('favored_city')}
              />
              <Select
                data-testid="receipt-favored-state"
                label={t.receiptsPage.state}
                data={UF_LIST}
                searchable
                clearable
                value={form.values.favored_state}
                onChange={(v) => form.setFieldValue('favored_state', v || '')}
              />
            </Group>
            <TextInput
              data-testid="receipt-pix"
              label={t.receiptsPage.pix}
              placeholder="Chave PIX (opcional)"
              {...form.getInputProps('pix')}
            />

            <Divider label={t.receiptsPage.amount} labelPosition="left" />

            {/* Valor + resumo */}
            <Group grow align="flex-start">
              <MoneyInput
                data-testid="receipt-amount"
                label={t.receiptsPage.amount}
                required
                value={form.values.amount}
                onValueChange={(v) => form.setFieldValue('amount', typeof v === 'number' ? v : 0)}
                error={form.errors.amount}
              />
              <Box pt={24}>
                <Text size="xs" c="dimmed" fw={600}>
                  {t.receiptsPage.amountExtenso}:
                </Text>
                <Text size="xs" fs="italic" c="dimmed">
                  {form.values.amount > 0
                    ? valorPorExtenso(form.values.amount)
                    : '—'}
                </Text>
              </Box>
            </Group>
            <Textarea
              data-testid="receipt-description"
              label={t.receiptsPage.description}
              required
              minRows={2}
              {...form.getInputProps('description')}
            />
            <Select
              data-testid="receipt-category"
              label={t.receiptsPage.category}
              data={categories.map((c) => ({ value: c.value, label: c.label }))}
              clearable
              value={form.values.category || undefined}
              onChange={(v) => form.setFieldValue('category', v || '')}
            />

            <Text size="xs" c="dimmed" fs="italic">
              {t.receiptsPage.pdfNotice}
            </Text>

            <Group justify="flex-end" mt="xs">
              <Button data-testid="receipt-cancel" variant="default" onClick={() => setModalOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button data-testid="receipt-save" type="submit" loading={saving} disabled={!!editing?.locked}>
                {editing ? t.common.save : t.receiptsPage.newReceipt}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t.receiptsPage.deleteConfirm}
        centered
      >
        <Text size="sm" mb="md">
          {t.receiptsPage.deleteConfirmBody}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setDeleteTarget(null)}>
            {t.common.cancel}
          </Button>
          <Button color="red" loading={deleting} onClick={confirmDelete}>
            {t.common.delete}
          </Button>
        </Group>
      </Modal>
    </>
  );
}