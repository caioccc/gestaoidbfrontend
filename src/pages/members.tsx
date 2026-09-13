import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
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
  Menu,
  ActionIcon,
  Pagination,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useMediaQuery } from '@mantine/hooks';
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
  IconFileTypePdf,
  IconShare2,
  IconDotsVertical,
  IconBrandWhatsapp,
} from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import MobileItemCard from '../components/MobileItemCard';
import MemberFormModal from '../components/MemberFormModal';
import MemberCardModal from '../components/MemberCardModal';
import MemberCardBatchModal from '../components/MemberCardBatchModal';
import MemberDocumentsModal from '../components/MemberDocumentsModal';
import MemberImportTab from '../components/MemberImportTab';
import CardConfigTab from '../components/CardConfigTab';
import TransfersTab from '../components/TransfersTab';
import SubmissionsTab from '../components/SubmissionsTab';
import ShareLinkModal from '../components/ShareLinkModal';
import MembersFunnelTab from '../components/MembersFunnelTab';
import SendWhatsAppModal from '../components/SendWhatsAppModal';
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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [areas, setAreas] = useState<MinistryArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [cardMember, setCardMember] = useState<Member | null>(null);
  const [shareMember, setShareMember] = useState<Member | null>(null);
  const [waMember, setWaMember] = useState<Member | null>(null);
  const [docsMember, setDocsMember] = useState<Member | null>(null);
  const [toDelete, setToDelete] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [batchOpen, setBatchOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewDate, setRenewDate] = useState<Date | null>(null);
  const [renewing, setRenewing] = useState(false);
  const [fSearch, setFSearch] = useState('');
  const [dbSearch, setDbSearch] = useState('');
  const [fStatus, setFStatus] = useState<string | null>(null);
  const [fArea, setFArea] = useState<string | null>(null);
  const [fEducation, setFEducation] = useState<string | null>(null);
  const [fMarital, setFMarital] = useState<string | null>(null);
  const [fEntry, setFEntry] = useState<string | null>(null);
  const PAGE_SIZE = 25;
  const isWide = useMediaQuery('(min-width: 1300px)');

  useEffect(() => {
    const handle = setTimeout(() => setDbSearch(fSearch), 300);
    return () => clearTimeout(handle);
  }, [fSearch]);

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

  const filterParams = (): Record<string, string> => {
    const params: Record<string, string> = {};
    if (dbSearch.trim()) params.search = dbSearch.trim();
    if (fStatus) params.status = fStatus;
    if (fArea) params.area = fArea;
    if (fEducation) params.education = fEducation;
    if (fMarital) params.marital_status = fMarital;
    if (fEntry) params.church_entry = fEntry;
    return params;
  };

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
    setPage(1);
  };

  const exportRolCsv = async () => {
    try {
      const full = await accountsApi.members(filterParams());
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
        ...full.map((m) =>
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
    } catch {
      notifications.show({ color: 'red', message: t.overview });
    }
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
    const params = {
      page,
      page_size: PAGE_SIZE,
      ...filterParams(),
    };
    Promise.all([accountsApi.membersPage(params), accountsApi.ministryAreas()])
      .then(([{ results, count }, areasData]) => {
        setMembers(results);
        setTotal(count);
        setAreas(areasData);
        setSelected(new Set());
        if (results.length === 0 && count > 0 && page > 1) {
          setPage(page - 1);
        }
      })
      .catch(() => {
        setMembers([]);
        setTotal(0);
        setAreas([]);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, dbSearch, fStatus, fArea, fEducation, fMarital, fEntry]);

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
    members.length > 0 && members.every((m) => selected.has(m.id));

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(members.map((m) => m.id)));

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

  const memberMenuItems = (m: Member) => (
    <>
      <Menu.Item
        leftSection={<IconId size={14} />}
        onClick={() => setCardMember(m)}
        data-testid={`member-card-${m.id}`}
      >
        {t.membersPage.viewCard}
      </Menu.Item>
      <Menu.Item
        leftSection={<IconShare2 size={14} />}
        disabled={m.status !== 'ACTIVE'}
        onClick={() => setShareMember(m)}
        data-testid={`member-share-${m.id}`}
      >
        {t.membersPage.shareCard}
      </Menu.Item>
      <Menu.Item
        leftSection={<IconFileDescription size={14} />}
        onClick={() => downloadDeclaration(m)}
        data-testid={`member-declaration-${m.id}`}
      >
        {t.membersPage.declaration}
      </Menu.Item>
      <Menu.Item
        leftSection={<IconBrandWhatsapp size={14} />}
        color="green"
        disabled={!m.phone}
        onClick={() => setWaMember(m)}
        data-testid={`member-wa-menu-${m.id}`}
      >
        {t.membersPage.sendWhatsApp}
      </Menu.Item>
      <Menu.Item
        leftSection={<IconFileDescription size={14} />}
        onClick={() => setDocsMember(m)}
        data-testid={`member-docs-${m.id}`}
      >
        {t.documents.title}
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        leftSection={<IconPencil size={14} />}
        onClick={() => openEdit(m)}
        data-testid={`member-edit-${m.id}`}
      >
        {t.common.edit}
      </Menu.Item>
      <Menu.Item
        leftSection={<IconTrash size={14} />}
        color="red"
        onClick={() => setToDelete(m)}
        data-testid={`member-delete-${m.id}`}
      >
        {t.common.delete}
      </Menu.Item>
    </>
  );

  const rows = members.map((m) => (
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
      <Table.Td>
        <Group gap={4} wrap="nowrap">
          <Text truncate maw={150}>
            {m.phone || '—'}
          </Text>
          {m.phone && (
            <ActionIcon
              variant="subtle"
              color="green"
              size="sm"
              onClick={() => setWaMember(m)}
              data-testid={`member-wa-${m.id}`}
            >
              <IconBrandWhatsapp size={14} />
            </ActionIcon>
          )}
        </Group>
      </Table.Td>
      {isWide && (
        <Table.Td>
          <Text truncate maw={190}>
            {m.email || '—'}
          </Text>
        </Table.Td>
      )}
      <Table.Td>
        <Text truncate maw={140}>
          {m.church_entry_display || '—'}
        </Text>
      </Table.Td>
      <Table.Td hiddenFrom="sm" />
      <Table.Td>
        <Badge color={m.status === 'ACTIVE' ? 'green' : 'gray'} variant="light">
          {m.status === 'ACTIVE' ? t.membersPage.active : t.membersPage.inactive}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Menu shadow="md" width={200} position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="subtle" data-testid={`member-menu-${m.id}`}>
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>{memberMenuItems(m)}</Menu.Dropdown>
        </Menu>
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
            disabled={total === 0}
            data-testid="members-export-csv"
          >
            {t.memberReports.exportCsv}
          </Button>
          <Button
            variant="default"
            leftSection={<IconFileTypePdf size={16} />}
            onClick={downloadReport}
            disabled={total === 0}
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
            onChange={(e) => {
              setFSearch(e.currentTarget.value);
              setPage(1);
            }}
            style={{ flex: 1, minWidth: 200 }}
            data-testid="members-filter-search"
          />
          <Select
            placeholder={t.membersPage.filterStatus}
            clearable
            data={statusFilterOptions}
            value={fStatus}
            onChange={(v) => {
              setFStatus(v);
              setPage(1);
            }}
            w={130}
            data-testid="members-filter-status"
          />
          <Select
            placeholder={t.membersPage.filterArea}
            clearable
            data={areaFilterOptions}
            value={fArea}
            onChange={(v) => {
              setFArea(v);
              setPage(1);
            }}
            w={150}
            searchable
            data-testid="members-filter-area"
          />
          <Select
            placeholder={t.membersPage.filterEducation}
            clearable
            data={educationFilterOptions}
            value={fEducation}
            onChange={(v) => {
              setFEducation(v);
              setPage(1);
            }}
            w={170}
            searchable
            data-testid="members-filter-education"
          />
          <Select
            placeholder={t.membersPage.filterMarital}
            clearable
            data={maritalFilterOptions}
            value={fMarital}
            onChange={(v) => {
              setFMarital(v);
              setPage(1);
            }}
            w={150}
            data-testid="members-filter-marital"
          />
          <Select
            placeholder={t.membersPage.filterEntry}
            clearable
            data={entryFilterOptions}
            value={fEntry}
            onChange={(v) => {
              setFEntry(v);
              setPage(1);
            }}
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
              String(members.length)
            ).replace('{total}', String(total))}
          </Text>
        </Group>
      </Card>
      <Card withBorder shadow="sm" p={0}>
        {loading ? (
          <Center h={200}>
            <Loader />
          </Center>
        ) : total === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <ThemeIcon size={48} radius="xl" color="gray" variant="light">
              <IconUsersGroup size={24} />
            </ThemeIcon>
            <Text c="dimmed">{t.membersPage.empty}</Text>
          </Stack>
        ) : members.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <Text c="dimmed">{t.membersPage.noResults}</Text>
          </Stack>
        ) : (
          <>
            <Box visibleFrom="lg">
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
                  {isWide && <Table.Th>{t.membersPage.email}</Table.Th>}
                  <Table.Th>{t.membersPage.churchEntry}</Table.Th>
                  <Table.Th>{t.membersPage.status}</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>{t.common.actions}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows}</Table.Tbody>
              </Table>
            </Box>
            <Stack hiddenFrom="lg" gap="xs" p="sm">
              {members.map((m) => (
                <MobileItemCard
                  key={m.id}
                  testId={`member-mobile-${m.id}`}
                  media={
                    <Avatar
                      src={m.photo || null}
                      radius="xl"
                      size={48}
                      data-testid={`member-mobile-avatar-${m.id}`}
                    >
                      {m.name?.charAt(0)?.toUpperCase()}
                    </Avatar>
                  }
                  actions={memberMenuItems(m)}
                >
                  <Stack gap={4}>
                    <Text fw={600} truncate>
                      {m.name}
                    </Text>
                    {m.card_number && (
                      <Text size="xs" c="dimmed" truncate>
                        #{m.card_number}
                      </Text>
                    )}
                    <Group gap={4} wrap="nowrap">
                      <Text size="sm" truncate style={{ flex: 1, minWidth: 0 }}>
                        {m.phone || '—'}
                      </Text>
                      {m.phone && (
                        <ActionIcon
                          variant="subtle"
                          color="green"
                          size="sm"
                          onClick={() => setWaMember(m)}
                          data-testid={`member-mobile-wa-${m.id}`}
                        >
                          <IconBrandWhatsapp size={14} />
                        </ActionIcon>
                      )}
                    </Group>
                    <Text size="sm" c="dimmed" truncate>
                      {m.email || '—'}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {m.church_entry_display || '—'}
                    </Text>
                    <Badge
                      color={m.status === 'ACTIVE' ? 'green' : 'gray'}
                      variant="light"
                      size="sm"
                      style={{ width: 'fit-content' }}
                    >
                      {m.status === 'ACTIVE'
                        ? t.membersPage.active
                        : t.membersPage.inactive}
                    </Badge>
                  </Stack>
                </MobileItemCard>
              ))}
            </Stack>
            {total > PAGE_SIZE && (
              <Group justify="center" py="sm">
                <Pagination
                  value={page}
                  onChange={(p) => {
                    setPage(p);
                    setSelected(new Set());
                  }}
                  total={Math.max(1, Math.ceil(total / PAGE_SIZE))}
                  size="sm"
                  data-testid="members-pagination"
                />
              </Group>
            )}
          </>
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

      <SendWhatsAppModal
        opened={!!waMember}
        onClose={() => setWaMember(null)}
        member={waMember}
        churchName={churchName}
        churchCity={churchContact?.city || ''}
        onSent={(id) =>
          setMembers((prev) =>
            prev.map((m) =>
              m.id === id ? { ...m, last_contact_at: new Date().toISOString() } : m,
            ),
          )
        }
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
    if (router.query.tab === 'funnel') {
      setTab('funnel');
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
              <Tabs.Tab value="funnel" data-testid="tab-funnel">
                {t.membersPage.tabsFunnel}
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
        ) : tab === 'funnel' ? (
          <MembersFunnelTab
            churchName={church?.name || ''}
            churchCity={church?.city || ''}
            cardConfig={cardData.config}
            churchContact={cardData.contact}
          />
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