import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Card,
  Group,
  Text,
  Stack,
  Badge,
  Button,
  ThemeIcon,
  Modal,
  TextInput,
  Table,
  Center,
  Loader,
  Avatar,
  Tabs,
  Checkbox,
  Select,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconUsersGroup,
  IconPlus,
  IconTrash,
  IconPencil,
  IconBuildingChurch,
  IconRefresh,
  IconId,
  IconX,
  IconCalendarClock,
  IconSearch,
  IconDownload,
  IconFileDescription,
  IconPaperclip,
  IconFileTypePdf,
  IconShare2,
} from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import MemberFormModal from '../components/MemberFormModal';
import MemberCardModal from '../components/MemberCardModal';
import MemberCardBatchModal from '../components/MemberCardBatchModal';
import MemberDocumentsModal from '../components/MemberDocumentsModal';
import MemberImportTab from '../components/MemberImportTab';
import CardConfigTab from '../components/CardConfigTab';
import TransfersTab from '../components/TransfersTab';
import SubmissionsTab from '../components/SubmissionsTab';
import ShareLinkModal from '../components/ShareLinkModal';
import { useLanguage } from '../i18n';
import { useCurrentChurch } from '../hooks/useCurrentChurch';
import { useChurchCardConfig } from '../hooks/useChurchCardConfig';
import { accountsApi } from '../api/accounts';
import { toUpperCamelWords } from '../utils/format';
import { cardValidityDate, formatCardDate } from '../utils/memberCard';
import type { CardConfig, Member, MinistryArea } from '../types';
import type { ChurchContact } from '../hooks/useChurchCardConfig';

function MembersTab({
  churchName,
  cardConfig,
  churchContact,
  onRenewValidity,
}: {
  churchName: string;
  cardConfig?: CardConfig;
  churchContact?: ChurchContact;
  onRenewValidity?: (date: string | null) => Promise<void>;
}) {
  const { t, locale } = useLanguage();
  const [members, setMembers] = useState<Member[]>([]);
  const [areas, setAreas] = useState<MinistryArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [cardMember, setCardMember] = useState<Member | null>(null);
  const [shareMember, setShareMember] = useState<Member | null>(null);
  const [docsMember, setDocsMember] = useState<Member | null>(null);
  const [toDelete, setToDelete] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [batchOpen, setBatchOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewDate, setRenewDate] = useState<Date | null>(null);
  const [renewing, setRenewing] = useState(false);
  const [fSearch, setFSearch] = useState('');
  const [fStatus, setFStatus] = useState<string | null>(null);
  const [fArea, setFArea] = useState<string | null>(null);
  const [fEducation, setFEducation] = useState<string | null>(null);
  const [fMarital, setFMarital] = useState<string | null>(null);
  const [fEntry, setFEntry] = useState<string | null>(null);

  const statusFilterOptions = [
    { value: 'ACTIVE', label: t.membersPage.active },
    { value: 'INACTIVE', label: t.membersPage.inactive },
  ];
  const areaFilterOptions = areas.map((a) => ({
    value: String(a.id),
    label: a.name,
  }));
  const educationFilterOptions = [
    { value: 'SEM_ESCOLARIDADE', label: t.membersPage.noSchooling },
    { value: 'FUNDAMENTAL', label: t.membersPage.fundamental },
    { value: 'MEDIO_INCOMPLETO', label: t.membersPage.highSchoolIncomplete },
    { value: 'MEDIO', label: t.membersPage.highSchool },
    { value: 'SUPERIOR_INCOMPLETO', label: t.membersPage.collegeIncomplete },
    { value: 'SUPERIOR', label: t.membersPage.college },
    { value: 'POS_GRADUACAO', label: t.membersPage.graduate },
  ];
  const maritalFilterOptions = [
    { value: 'SOLTEIRO', label: t.membersPage.single },
    { value: 'CASADO', label: t.membersPage.married },
    { value: 'UNIAO_ESTAVEL', label: t.membersPage.stableUnion },
    { value: 'SEPARADO', label: t.membersPage.separated },
    { value: 'DIVORCIADO', label: t.membersPage.divorced },
    { value: 'VIUVO', label: t.membersPage.widower },
  ];
  const entryFilterOptions = [
    { value: 'ACLAMACAO', label: t.membersPage.entryAclamacao },
    { value: 'BATISMO', label: t.membersPage.entryBatismo },
    { value: 'RECONCILIACAO', label: t.membersPage.entryReconciliacao },
    { value: 'TRANSFERENCIA', label: t.membersPage.entryTransferencia },
    { value: 'OUTRO', label: t.membersPage.entryOther },
  ];

  const filtered = members.filter((m) => {
    const term = fSearch.trim().toLowerCase();
    if (
      term &&
      !(
        (m.name || '').toLowerCase().includes(term) ||
        (m.phone || '').toLowerCase().includes(term) ||
        (m.email || '').toLowerCase().includes(term) ||
        (m.card_number || '').toLowerCase().includes(term)
      )
    ) {
      return false;
    }
    if (fStatus && m.status !== fStatus) return false;
    if (
      fArea &&
      !m.ministry_areas_display?.some((a) => String(a.id) === fArea)
    ) {
      return false;
    }
    if (fEducation && m.education_level !== fEducation) return false;
    if (fMarital && m.marital_status !== fMarital) return false;
    if (fEntry && m.church_entry !== fEntry) return false;
    return true;
  });

  const hasFilters =
    fSearch.trim() !== '' ||
    !!fStatus ||
    !!fArea ||
    !!fEducation ||
    !!fMarital ||
    !!fEntry;

  const clearFilters = () => {
    setFSearch('');
    setFStatus(null);
    setFArea(null);
    setFEducation(null);
    setFMarital(null);
    setFEntry(null);
  };

  const exportRolCsv = () => {
    const esc = (v: unknown) =>
      `"${(v == null ? '' : String(v)).replace(/"/g, '""')}"`;
    const headers = [
      t.membersPage.name,
      'Matrícula',
      t.membersPage.phone,
      t.membersPage.email,
      t.membersPage.bornInCity,
      t.membersPage.profession,
      t.membersPage.educationLevel,
      t.membersPage.maritalStatus,
      t.membersPage.churchEntry,
      t.membersPage.ministryAreas,
      t.membersPage.status,
      t.membersPage.addressStreet,
      t.membersPage.addressNumber,
      t.membersPage.addressComplement,
      t.membersPage.addressNeighborhood,
      t.membersPage.addressCity,
      t.membersPage.addressState,
      t.membersPage.addressCep,
    ];
    const lines = [
      headers.map(esc).join(';'),
      ...filtered.map((m) =>
        [
          m.name,
          m.card_number || '',
          m.phone,
          m.email,
          m.born_in_city,
          m.profession,
          m.education_level_display,
          m.marital_status_display,
          m.church_entry_display,
          m.ministry_areas_display.map((a) => a.name).join('; '),
          m.status_display,
          m.street,
          m.number,
          m.complement,
          m.neighborhood,
          m.city,
          m.state,
          m.cep,
        ]
          .map(esc)
          .join(';')
      ),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rol_membros.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadDeclaration = async (m: Member) => {
    try {
      const blob = await accountsApi.memberDeclaration(m.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `declaracao-membresia-${m.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      notifications.show({ color: 'red', message: t.overview });
    }
  };

  const downloadReport = async () => {
    try {
      const blob = await accountsApi.memberReport(
        fStatus === 'INACTIVE' ? 'INACTIVE' : undefined
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rol-membros.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      notifications.show({ color: 'red', message: t.overview });
    }
  };

  const validityDate = cardValidityDate(cardConfig);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDays = Math.round(
    (validityDate.getTime() - today.getTime()) / 86400000
  );
  const expiry: 'expired' | 'soon' | 'ok' =
    validityDate < today
      ? 'expired'
      : expiryDays <= 90
        ? 'soon'
        : 'ok';
  const expiryLabel = t.membersPage[
    expiry === 'expired'
      ? 'cardExpired'
      : expiry === 'soon'
        ? 'cardExpiringSoon'
        : 'cardValid'
  ].replace('{date}', formatCardDate(validityDate));

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([accountsApi.members(), accountsApi.ministryAreas()])
      .then(([membersData, areasData]) => {
        setMembers(membersData);
        setAreas(areasData);
      })
      .catch(() => {
        setMembers([]);
        setAreas([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setOpened(true);
  };

  const openEdit = (m: Member) => {
    setEditing(m);
    setOpened(true);
  };

  const handleSave = async (
    payload: Record<string, unknown>,
    isEdit: boolean
  ): Promise<Member> => {
    const saved = isEdit && editing
      ? await accountsApi.updateMember(editing.id, payload)
      : await accountsApi.createMember(payload);
    load();
    return saved;
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await accountsApi.deleteMember(toDelete.id);
      notifications.show({ color: 'green', message: t.membersPage.deleted });
      setToDelete(null);
      load();
    } catch {
      notifications.show({ color: 'red', message: t.overview });
    } finally {
      setDeleting(false);
    }
  };

  const isoToDateLocal = (iso: string): Date | null => {
    const [y, m, d] = iso.split('-').map(Number);
    return y && m && d ? new Date(y, m - 1, d) : null;
  };

  const toISODate = (date: Date | null): string | null => {
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const allSelected =
    filtered.length > 0 && filtered.every((m) => selected.has(m.id));

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(filtered.map((m) => m.id)));

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleRenew = async () => {
    setRenewing(true);
    try {
      await onRenewValidity?.(toISODate(renewDate));
      notifications.show({ color: 'green', message: t.membersPage.renewSaved });
      setRenewOpen(false);
    } catch {
      notifications.show({ color: 'red', message: t.membersPage.renewError });
    } finally {
      setRenewing(false);
    }
  };

  const rows = filtered.map((m) => (
    <Table.Tr key={m.id} data-testid={`member-row-${m.id}`}>
      <Table.Td>
        <Checkbox
          checked={selected.has(m.id)}
          onChange={() => toggle(m.id)}
          aria-label={m.name}
          data-testid={`member-select-${m.id}`}
        />
      </Table.Td>
      <Table.Td>
        <Group gap="sm" wrap="nowrap">
          <Avatar
            src={m.photo || null}
            radius="xl"
            size="sm"
            data-testid={`member-avatar-${m.id}`}
          >
            {m.name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Stack gap={0}>
            <Text fw={600} truncate maw={220}>
              {m.name}
            </Text>
            {m.card_number && (
              <Text size="xs" c="dimmed">
                #{m.card_number}
              </Text>
            )}
          </Stack>
        </Group>
      </Table.Td>
      <Table.Td>{m.phone || '—'}</Table.Td>
      <Table.Td>{m.email || '—'}</Table.Td>
      <Table.Td>{m.church_entry_display || '—'}</Table.Td>
      <Table.Td hiddenFrom="sm" />
      <Table.Td>
        <Badge color={m.status === 'ACTIVE' ? 'green' : 'gray'} variant="light">
          {m.status === 'ACTIVE' ? t.membersPage.active : t.membersPage.inactive}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap={4} justify="flex-end">
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconId size={14} />}
            onClick={() => setCardMember(m)}
            data-testid={`member-card-${m.id}`}
          >
            {t.membersPage.viewCard}
          </Button>
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconShare2 size={14} />}
            disabled={m.status !== 'ACTIVE'}
            onClick={() => setShareMember(m)}
            data-testid={`member-share-${m.id}`}
          >
            {t.membersPage.shareCard}
          </Button>
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconFileDescription size={14} />}
            onClick={() => downloadDeclaration(m)}
            data-testid={`member-declaration-${m.id}`}
          >
            {t.membersPage.declaration}
          </Button>
          {/* <Button
            size="xs"
            variant="subtle"
            leftSection={<IconPaperclip size={14} />}
            onClick={() => setDocsMember(m)}
            data-testid={`member-docs-${m.id}`}
          >
            {t.documents.list}
          </Button> */}
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconPencil size={14} />}
            onClick={() => openEdit(m)}
            data-testid={`member-edit-${m.id}`}
          >
            {t.common.edit}
          </Button>
          <Button
            size="xs"
            variant="subtle"
            color="red"
            leftSection={<IconTrash size={14} />}
            onClick={() => setToDelete(m)}
            data-testid={`member-delete-${m.id}`}
          >
            {t.common.delete}
          </Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Group gap="xs" mb="md" justify="space-between" wrap="wrap">
        <Group gap="xs">
          <Badge
            color={expiry === 'expired' ? 'red' : expiry === 'soon' ? 'yellow' : 'teal'}
            variant="light"
            data-testid="members-expiry"
          >
            {expiryLabel}
          </Badge>
          <Button
            variant="default"
            leftSection={<IconCalendarClock size={16} />}
            onClick={() => {
              setRenewDate(null);
              setRenewOpen(true);
            }}
            data-testid="members-renew"
          >
            {t.membersPage.renewValidity}
          </Button>
        </Group>
        <Group gap="xs">
          {selected.size > 0 && (
            <>
              <Badge color="blue" variant="light" size="lg">
                {t.membersPage.selectedCount.replace(
                  '{count}',
                  String(selected.size)
                )}
              </Badge>
              <Button
                variant="default"
                leftSection={<IconX size={16} />}
                onClick={() => setSelected(new Set())}
                data-testid="members-clear-selection"
              >
                {t.membersPage.clearSelection}
              </Button>
<Button
            leftSection={<IconId size={16} />}
            onClick={() => setBatchOpen(true)}
            data-testid="members-emit"
          >
            {t.membersPage.emitCards}
          </Button>
            </>
          )}
          <Button
            variant="default"
            leftSection={<IconDownload size={16} />}
            onClick={exportRolCsv}
            disabled={filtered.length === 0}
            data-testid="members-export-csv"
          >
            {t.memberReports.exportCsv}
          </Button>
          <Button
            variant="default"
            leftSection={<IconFileTypePdf size={16} />}
            onClick={downloadReport}
            disabled={filtered.length === 0}
            data-testid="members-report-pdf"
          >
            {t.memberReports.reportPdf}
          </Button>
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            onClick={load}
            data-testid="members-refresh"
          >
            {t.common.filter}
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={openCreate}
            data-testid="members-new"
          >
            {t.membersPage.addMember}
          </Button>
        </Group>
      </Group>
      <Card withBorder shadow="sm" p="sm" mb="md">
        <Group gap="xs" wrap="wrap">
          <TextInput
            placeholder={t.membersPage.searchPlaceholder}
            leftSection={<IconSearch size={16} />}
            value={fSearch}
            onChange={(e) => setFSearch(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 200 }}
            data-testid="members-filter-search"
          />
          <Select
            placeholder={t.membersPage.filterStatus}
            clearable
            data={statusFilterOptions}
            value={fStatus}
            onChange={setFStatus}
            w={130}
            data-testid="members-filter-status"
          />
          <Select
            placeholder={t.membersPage.filterArea}
            clearable
            data={areaFilterOptions}
            value={fArea}
            onChange={setFArea}
            w={150}
            searchable
            data-testid="members-filter-area"
          />
          <Select
            placeholder={t.membersPage.filterEducation}
            clearable
            data={educationFilterOptions}
            value={fEducation}
            onChange={setFEducation}
            w={170}
            searchable
            data-testid="members-filter-education"
          />
          <Select
            placeholder={t.membersPage.filterMarital}
            clearable
            data={maritalFilterOptions}
            value={fMarital}
            onChange={setFMarital}
            w={150}
            data-testid="members-filter-marital"
          />
          <Select
            placeholder={t.membersPage.filterEntry}
            clearable
            data={entryFilterOptions}
            value={fEntry}
            onChange={setFEntry}
            w={160}
            data-testid="members-filter-entry"
          />
          <Button
            variant="subtle"
            size="xs"
            onClick={clearFilters}
            disabled={!hasFilters}
            data-testid="members-clear-filters"
          >
            {t.membersPage.clearFilters}
          </Button>
          <Text size="xs" c="dimmed">
            {t.membersPage.resultCount.replace(
              '{filtered}',
              String(filtered.length)
            ).replace('{total}', String(members.length))}
          </Text>
        </Group>
      </Card>
      <Card withBorder shadow="sm" p={0}>
        {loading ? (
          <Center h={200}>
            <Loader />
          </Center>
        ) : members.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <ThemeIcon size={48} radius="xl" color="gray" variant="light">
              <IconUsersGroup size={24} />
            </ThemeIcon>
            <Text c="dimmed">{t.membersPage.empty}</Text>
          </Stack>
        ) : filtered.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <Text c="dimmed">{t.membersPage.noResults}</Text>
          </Stack>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={36}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={selected.size > 0 && !allSelected}
                    onChange={toggleAll}
                    aria-label={t.membersPage.selectAll}
                    data-testid="members-select-all"
                  />
                </Table.Th>
                <Table.Th>{t.membersPage.name}</Table.Th>
                <Table.Th>{t.membersPage.phone}</Table.Th>
                <Table.Th>{t.membersPage.email}</Table.Th>
                <Table.Th>{t.membersPage.churchEntry}</Table.Th>
                <Table.Th>{t.membersPage.status}</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>{t.common.actions}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        )}
      </Card>

      <MemberFormModal
        opened={opened}
        onClose={() => setOpened(false)}
        member={editing}
        areas={areas}
        churchName={churchName}
        cardConfig={cardConfig}
        churchContact={churchContact}
        onSave={handleSave}
      />

      <MemberCardModal
        opened={!!cardMember}
        member={cardMember}
        churchName={churchName}
        config={cardConfig}
        churchContact={churchContact}
        onClose={() => setCardMember(null)}
      />

      <ShareLinkModal
        opened={!!shareMember}
        onClose={() => setShareMember(null)}
        title={t.qrShare.cardTitle}
        subtitle={t.qrShare.subtitle}
        getUrl={() =>
          shareMember
            ? accountsApi.memberPublicLink(shareMember.id).then((r) => r.public_url)
            : Promise.reject(new Error('no member'))
        }
        regenerate={() =>
          accountsApi
            .memberPublicLinkRegenerate(shareMember!.id)
            .then((r) => r.public_url)
        }
      />

      <MemberCardBatchModal
        opened={batchOpen}
        onClose={() => setBatchOpen(false)}
        members={members.filter((m) => selected.has(m.id))}
        churchName={churchName}
        config={cardConfig}
        churchContact={churchContact}
      />

      <MemberDocumentsModal
        member={docsMember}
        opened={!!docsMember}
        onClose={() => setDocsMember(null)}
      />

      <Modal
        opened={renewOpen}
        onClose={() => setRenewOpen(false)}
        title={t.membersPage.renewTitle}
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t.membersPage.renewHint}
          </Text>
          <DateInput
            label={t.cardConfig.validity}
            data-testid="members-renew-date"
            locale={locale}
            valueFormat="DD/MM/YYYY"
            clearable
            value={renewDate}
            onChange={(v) => setRenewDate(v ? isoToDateLocal(v) : null)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRenewOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button loading={renewing} onClick={handleRenew}>
              {t.common.save}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={!!toDelete}
        onClose={() => setToDelete(null)}
        title={t.membersPage.deleteTitle}
        centered
      >
        <Stack gap="md">
          <Text>{t.membersPage.deleteBody.replace('{name}', toDelete?.name || '')}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setToDelete(null)}>
              {t.common.cancel}
            </Button>
            <Button
              color="red"
              loading={deleting}
              onClick={handleDelete}
              data-testid="member-delete-confirm"
            >
              {t.common.delete}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

function AreasTab() {
  const { t } = useLanguage();
  const [areas, setAreas] = useState<MinistryArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<MinistryArea | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<MinistryArea | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    accountsApi
      .ministryAreas()
      .then(setAreas)
      .catch(() => setAreas([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const form = useForm<{ name: string }>({
    initialValues: { name: '' },
    validate: {
      name: (v) => (v.trim().length ? null : t.membersPage.areaName),
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.setValues({ name: '' });
    form.resetDirty();
    setOpened(true);
  };

  const openEdit = (a: MinistryArea) => {
    setEditing(a);
    form.setValues({ name: a.name });
    form.resetDirty();
    setOpened(true);
  };

  const handleSave = async () => {
    const valid = form.validate();
    if (valid.hasErrors) return;
    setSaving(true);
    const payload = { name: toUpperCamelWords(form.values.name) };
    try {
      if (editing) {
        await accountsApi.updateMinistryArea(editing.id, payload);
      } else {
        await accountsApi.createMinistryArea(payload);
      }
      notifications.show({ color: 'green', message: t.membersPage.areaSaved });
      setOpened(false);
      load();
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.name?.[0] || data?.detail;
      notifications.show({ color: 'red', message: msg || t.overview });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await accountsApi.deleteMinistryArea(toDelete.id);
      notifications.show({ color: 'green', message: t.membersPage.areaDeleted });
      setToDelete(null);
      load();
    } catch {
      notifications.show({ color: 'red', message: t.overview });
    } finally {
      setDeleting(false);
    }
  };

  const rows = areas.map((a) => (
    <Table.Tr key={a.id} data-testid={`area-row-${a.id}`}>
      <Table.Td>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="sm" radius="xl" color="teal" variant="light">
            <IconBuildingChurch size={14} />
          </ThemeIcon>
          <Text fw={600}>{a.name}</Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Group gap={4} justify="flex-end">
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconPencil size={14} />}
            onClick={() => openEdit(a)}
            data-testid={`area-edit-${a.id}`}
          >
            {t.common.edit}
          </Button>
          <Button
            size="xs"
            variant="subtle"
            color="red"
            leftSection={<IconTrash size={14} />}
            onClick={() => setToDelete(a)}
            data-testid={`area-delete-${a.id}`}
          >
            {t.common.delete}
          </Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Group gap="xs" mb="md" justify="flex-end">
        <Button
          variant="default"
          leftSection={<IconRefresh size={16} />}
          onClick={load}
          data-testid="areas-refresh"
        >
          {t.common.filter}
        </Button>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={openCreate}
          data-testid="areas-new"
        >
          {t.membersPage.addArea}
        </Button>
      </Group>
      <Card withBorder shadow="sm" p={0}>
        {loading ? (
          <Center h={200}>
            <Loader />
          </Center>
        ) : areas.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <ThemeIcon size={48} radius="xl" color="teal" variant="light">
              <IconBuildingChurch size={24} />
            </ThemeIcon>
            <Text c="dimmed">{t.membersPage.areasEmpty}</Text>
          </Stack>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t.membersPage.areaName}</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>{t.common.actions}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        )}
      </Card>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={editing ? t.membersPage.editArea : t.membersPage.addArea}
        centered
      >
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack gap="md">
            <TextInput
              label={t.membersPage.areaName}
              required
              data-testid="area-name"
              placeholder={t.membersPage.areaName}
              {...form.getInputProps('name')}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setOpened(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" loading={saving} data-testid="area-submit">
                {t.common.save}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={!!toDelete}
        onClose={() => setToDelete(null)}
        title={t.membersPage.areaDeleteTitle}
        centered
      >
        <Stack gap="md">
          <Text>{t.membersPage.areaDeleteBody.replace('{name}', toDelete?.name || '')}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setToDelete(null)}>
              {t.common.cancel}
            </Button>
            <Button
              color="red"
              loading={deleting}
              onClick={handleDelete}
              data-testid="area-delete-confirm"
            >
              {t.common.delete}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

export default function MembersPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { church } = useCurrentChurch();
  const cardData = useChurchCardConfig();
  const [tab, setTab] = useState<string | null>('members');
  const [importVersion, setImportVersion] = useState(0);

  useEffect(() => {
    if (router.query.tab === 'transfers') {
      setTab('transfers');
    }
  }, [router.query.tab]);

  const handleRenewValidity = async (date: string | null) => {
    const payload = { ...(cardData.profile ?? {}), card_valid_until: date };
    await accountsApi.updateProfile(payload);
    cardData.refresh();
  };

  return (
    <AuthGuard roles={['PASTOR', 'SECRETARIA']}>
      <Layout>
        <PageHeader title={t.membersPage.title} description={t.membersPage.subtitle}>
          <Tabs value={tab} onChange={setTab} variant="pills">
            <Tabs.List>
              <Tabs.Tab value="members" data-testid="tab-members">
                {t.membersPage.tabsMembers}
              </Tabs.Tab>
              <Tabs.Tab value="areas" data-testid="tab-areas">
                {t.membersPage.tabsAreas}
              </Tabs.Tab>
              <Tabs.Tab value="config" data-testid="tab-card-config">
                {t.membersPage.tabsCardConfig}
              </Tabs.Tab>
              <Tabs.Tab value="transfers" data-testid="tab-transfers">
                {t.transfers.title}
              </Tabs.Tab>
              <Tabs.Tab value="submissions" data-testid="tab-submissions">
                {t.memberSubmissions.tabTitle}
              </Tabs.Tab>
              <Tabs.Tab value="import" data-testid="tab-import">
                {t.membersPage.tabsImport}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </PageHeader>

        {tab === 'members' ? (
          <MembersTab
            key={importVersion}
            churchName={church?.name || ''}
            cardConfig={cardData.config}
            churchContact={cardData.contact}
            onRenewValidity={handleRenewValidity}
          />
        ) : tab === 'areas' ? (
          <AreasTab />
        ) : tab === 'config' ? (
          <CardConfigTab churchName={church?.name || ''} data={cardData} />
        ) : tab === 'transfers' ? (
          <TransfersTab />
        ) : tab === 'submissions' ? (
          <SubmissionsTab />
        ) : (
          <MemberImportTab onImported={() => setImportVersion((v) => v + 1)} />
        )}
      </Layout>
    </AuthGuard>
  );
}