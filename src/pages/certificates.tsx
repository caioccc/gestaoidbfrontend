import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Indicator,
  Loader,
  Modal,
  Paper,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { YearPickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  IconAdjustmentsHorizontal,
  IconCertificate,
  IconDownload,
  IconFileTypePdf,
  IconPencil,
  IconPhoto,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import MobileItemCard from '../components/MobileItemCard';
import { ListPagination, useListPagination } from '../components/ListPagination';
import CertificateIssueModal from '../components/CertificateIssueModal';
import CertificateTemplateModal from '../components/CertificateTemplateModal';
import { useLanguage } from '../i18n';
import { useIsCompactList } from '../hooks/useListBreakpoint';
import { accountsApi } from '../api/accounts';
import { saveBlob } from '../api/finance';
import { formatPtDate } from '../utils/certificate';
import type { CertificateTemplate, CertificateType, EcclesiasticalCertificate } from '../types';

export default function CertificatesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [tab, setTab] = useState<string | null>('issued');

  useEffect(() => {
    if (router.query.tab === 'templates') setTab('templates');
  }, [router.query.tab]);

  return (
    <AuthGuard roles={['PASTOR', 'SECRETARIA']}>
      <Layout>
        <PageHeader title={t.certificates.title} description={t.certificates.subtitle}>
          <Tabs value={tab} onChange={setTab} variant="pills">
            <Tabs.List>
              <Tabs.Tab value="issued" data-testid="tab-issued">
                {t.certificates.tabIssued}
              </Tabs.Tab>
              <Tabs.Tab value="templates" data-testid="tab-templates">
                {t.certificates.tabTemplates}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </PageHeader>
        {tab === 'issued' ? <IssuedTab /> : <TemplatesTab />}
      </Layout>
    </AuthGuard>
  );
}

function IssuedTab() {
  const { t } = useLanguage();
  const isCompact = useIsCompactList();
  const [certificates, setCertificates] = useState<EcclesiasticalCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [issueOpen, setIssueOpen] = useState(false);
  const [deleting, setDeleting] = useState<EcclesiasticalCertificate | null>(null);
  const [search, setSearch] = useState('');
  const [certsType, setCertsType] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [filterOpen, setFilterOpen] = useState(false);
  // Rascunho do modal mobile/tablet; so vira filtro real em "Aplicar filtros".
  const [dSearch, setDSearch] = useState('');
  const [dType, setDType] = useState<string | null>(null);
  const [dYear, setDYear] = useState<string | null>(null);
  const pagination = useListPagination(certificates);

  const load = useCallback(() => {
    setLoading(true);
    accountsApi
      .certificates({
        ...(certsType ? { type: certsType as CertificateType } : {}),
        ...(year ? { year } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      })
      .then(setCertificates)
      .catch(() => notifications.show({ color: 'red', message: t.certificates.error }))
      .finally(() => setLoading(false));
  }, [search, certsType, year, t]);

  useEffect(() => {
    const handle = window.setTimeout(load, 250);
    return () => window.clearTimeout(handle);
  }, [load]);

  const hasFilters = search.trim() !== '' || !!certsType || !!year;
  const activeFilterCount = [search.trim(), certsType, year].filter(Boolean).length;

  const clearFilters = () => {
    setSearch('');
    setCertsType('');
    setYear('');
    pagination.reset();
  };

  const openFilters = () => {
    setDSearch(search);
    setDType(certsType || null);
    setDYear(year || null);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setSearch(dSearch);
    setCertsType(dType ?? '');
    setYear(dYear ?? '');
    pagination.reset();
    setFilterOpen(false);
  };

  const clearDraft = () => {
    setDSearch('');
    setDType(null);
    setDYear(null);
  };

  const thisYear = () => String(new Date().getFullYear());

  const handleDownload = async (cert: EcclesiasticalCertificate) => {
    try {
      const blob = await accountsApi.certificatePdfDownload(cert.id);
      saveBlob(blob, `${cert.generated_pdf_name ?? 'certificado.pdf'}`);
    } catch {
      notifications.show({ color: 'red', message: t.certificates.error });
    }
  };

  const typeOptions = [
    { value: 'BAPTISM', label: t.certificates.typeBaptism },
    { value: 'CHILD_PRESENTATION', label: t.certificates.typeChild },
    { value: 'MEMBERSHIP_COURSE', label: t.certificates.typeMembershipCourse },
    { value: 'CUSTOM', label: t.certificates.typeCustom },
  ];

  const filterTrigger = (
    <Indicator
      inline
      disabled={activeFilterCount === 0}
      label={activeFilterCount}
      size={16}
      color="grape"
      withBorder
      data-testid="cert-filter-indicator"
    >
      <ActionIcon
        variant="default"
        size="md"
        onClick={openFilters}
        data-testid="cert-open-filters"
        aria-label={t.certificates.filterTitle}
      >
        <IconAdjustmentsHorizontal size={16} />
      </ActionIcon>
    </Indicator>
  );

  const certActions = (cert: EcclesiasticalCertificate) => (
    <Group gap={4} justify="flex-end" wrap="nowrap">
      <Tooltip label={t.certificates.reprint}>
        <ActionIcon
          variant="subtle"
          color="blue"
          onClick={() => handleDownload(cert)}
          data-testid={`cert-download-${cert.id}`}
        >
          <IconDownload size={18} />
        </ActionIcon>
      </Tooltip>
      <ActionIcon
        variant="subtle"
        color="red"
        onClick={() => setDeleting(cert)}
        data-testid={`cert-delete-${cert.id}`}
      >
        <IconTrash size={17} />
      </ActionIcon>
    </Group>
  );

  return (
    <Stack gap="md">
      <Box visibleFrom="lg">
        <Group justify="flex-end">
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setIssueOpen(true)}
            data-testid="issue-certificate"
          >
            {t.certificates.issue}
          </Button>
        </Group>
      </Box>
      <Group hiddenFrom="lg" gap="xs" wrap="nowrap" justify="space-between">
        {filterTrigger}
        <Button
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={() => setIssueOpen(true)}
          data-testid="issue-certificate-mobile"
          style={{ flexShrink: 0 }}
        >
          {t.certificates.issue}
        </Button>
      </Group>

      <Box visibleFrom="lg">
        <Paper withBorder radius="md" p="sm">
          <Group gap="xs" wrap="wrap" align="flex-end">
            <TextInput
              placeholder={t.certificates.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              style={{ flex: 1, minWidth: 200 }}
              data-testid="cert-filter-search"
            />
            <Select
              placeholder={t.certificates.allTypes}
              data={typeOptions}
              value={certsType || null}
              onChange={(v) => setCertsType(v ?? '')}
              clearable
              size="sm"
              w={200}
              data-testid="cert-filter-type"
            />
            <YearPickerInput
              label={t.common.year}
              placeholder={t.certificates.allYears}
              value={year ? `${year}-01-01` : null}
              onChange={(v) => setYear(v ? String(v).slice(0, 4) : '')}
              clearable
              size="sm"
              w={150}
              data-testid="cert-filter-year"
            />
            <Button
              variant="light"
              size="xs"
              onClick={() => setYear(thisYear())}
              disabled={year === thisYear()}
              data-testid="cert-filter-this-year"
            >
              {t.certificates.thisYear}
            </Button>
            <Button
              variant="subtle"
              size="xs"
              onClick={clearFilters}
              disabled={!hasFilters}
              mb={1}
              data-testid="cert-clear-filters"
            >
              {t.common.clearFilters}
            </Button>
          </Group>
        </Paper>
      </Box>

      {hasFilters && (
        <Group hiddenFrom="lg" gap="xs" wrap="nowrap" justify="space-between">
          <Text size="xs" c="dimmed">
            {t.common.showingRange
              .replace('{start}', String(pagination.rangeStart))
              .replace('{end}', String(pagination.rangeEnd))
              .replace('{total}', String(pagination.total))
              .replace('{page}', String(pagination.page))
              .replace('{totalPages}', String(pagination.totalPages))}
          </Text>
          <Button
            variant="subtle"
            size="compact-xs"
            onClick={clearFilters}
            data-testid="cert-clear-filters-mobile"
            style={{ flexShrink: 0 }}
          >
            {t.common.clearFilters}
          </Button>
        </Group>
      )}

      {loading ? (
        <Center h={220}>
          <Loader />
        </Center>
      ) : certificates.length === 0 ? (
        <Card withBorder>
          <Center h={160}>
            <Stack gap="sm" align="center">
              <Text c="dimmed" data-testid="cert-empty">
                {hasFilters ? t.certificates.filterEmpty : t.certificates.emptyIssued}
              </Text>
              {hasFilters && (
                <Button
                  variant="light"
                  size="xs"
                  onClick={clearFilters}
                  data-testid="cert-empty-clear-filters"
                >
                  {t.common.clearFilters}
                </Button>
              )}
            </Stack>
          </Center>
        </Card>
      ) : (
        <Card withBorder padding={0}>
          <Box visibleFrom="lg">
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t.certificates.templateType}</Table.Th>
                  <Table.Th>{t.certificates.recipient}</Table.Th>
                  <Table.Th>{t.certificates.eventDate}</Table.Th>
                  <Table.Th>{t.certificates.registry}</Table.Th>
                  <Table.Th ta="right">{t.common.actions}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pagination.pageItems.map((cert) => (
                  <Table.Tr key={cert.id}>
                    <Table.Td>
                      <Badge color="teal" variant="light" size="sm">
                        {cert.certificate_type_display}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500} size="sm">
                        {cert.recipient_name}
                      </Text>
                      {cert.member_name ? (
                        <Text size="xs" c="dimmed">
                          {cert.member_name}
                        </Text>
                      ) : null}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatPtDate(cert.event_date)}</Text>
                      {cert.officiant_name ? (
                        <Text size="xs" c="dimmed">
                          {cert.officiant_name}
                        </Text>
                      ) : null}
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs">
                        {[cert.registry_number && `${t.certificates.term} ${cert.registry_number}`,
                          cert.registry_page && `${t.certificates.page} ${cert.registry_page}`,
                          cert.registry_book && `${t.certificates.book} ${cert.registry_book}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </Table.Td>
                    <Table.Td>{certActions(cert)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
          <Stack hiddenFrom="lg" gap="xs" p="sm">
            {pagination.pageItems.map((cert) => (
              <MobileItemCard
                key={cert.id}
                testId={`cert-mobile-${cert.id}`}
                media={
                  <ThemeIcon color="grape" variant="light" radius="md" size="lg">
                    <IconCertificate size={20} />
                  </ThemeIcon>
                }
                actions={certActions(cert)}
              >
                <Stack gap={4}>
                  <Badge color="teal" variant="light" size="sm" style={{ width: 'fit-content' }}>
                    {cert.certificate_type_display}
                  </Badge>
                  <Text fw={600} truncate>
                    {cert.recipient_name}
                  </Text>
                  {cert.member_name ? (
                    <Text size="xs" c="dimmed" truncate>
                      {cert.member_name}
                    </Text>
                  ) : null}
                  <Group gap={4} wrap="nowrap" align="center">
                    <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
                      {formatPtDate(cert.event_date)}
                    </Text>
                    {cert.officiant_name ? (
                      <Text size="xs" c="dimmed" truncate style={{ flex: 1, minWidth: 0 }}>
                        {cert.officiant_name}
                      </Text>
                    ) : null}
                  </Group>
                  <Text size="xs" c="dimmed" truncate>
                    {[cert.registry_number && `${t.certificates.term} ${cert.registry_number}`,
                      cert.registry_page && `${t.certificates.page} ${cert.registry_page}`,
                      cert.registry_book && `${t.certificates.book} ${cert.registry_book}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </Stack>
                </MobileItemCard>
              ))}
          </Stack>
        </Card>
      )}

      <Box visibleFrom="lg">
        <ListPagination
          page={pagination.page}
          onPageChange={pagination.setPage}
          pageSize={pagination.pageSize}
          onPageSizeChange={pagination.changePageSize}
          total={pagination.total}
          totalPages={pagination.totalPages}
          rangeStart={pagination.rangeStart}
          rangeEnd={pagination.rangeEnd}
          testId="certificates-pagination"
        />
      </Box>

      <CertificateIssueModal
        opened={issueOpen}
        onClose={() => setIssueOpen(false)}
        onIssued={load}
      />

      <Modal
        opened={filterOpen}
        onClose={() => setFilterOpen(false)}
        title={t.certificates.filterTitle}
        size="lg"
        centered
        fullScreen={isCompact}
        data-testid="cert-filter-modal"
      >
        <Stack gap="md">
          <Stack gap="sm" style={{ overflowY: 'auto', flex: 1 }}>
            <TextInput
              label={t.certificates.filterSearch}
              placeholder={t.certificates.searchPlaceholder}
              leftSection={<IconSearch size={16} />}
              value={dSearch}
              onChange={(e) => setDSearch(e.currentTarget.value)}
              data-testid="cert-draft-search"
            />
            <Select
              label={t.certificates.filterType}
              placeholder={t.certificates.allTypes}
              data={typeOptions}
              value={dType}
              onChange={setDType}
              clearable
              data-testid="cert-draft-type"
            />
            <YearPickerInput
              label={t.common.year}
              placeholder={t.certificates.allYears}
              value={dYear ? `${dYear}-01-01` : null}
              onChange={(v) => setDYear(v ? String(v).slice(0, 4) : null)}
              clearable
              data-testid="cert-draft-year"
            />
            <Group gap="xs">
              <Button
                variant="light"
                size="xs"
                onClick={() => setDYear(thisYear())}
                disabled={dYear === thisYear()}
                data-testid="cert-draft-this-year"
              >
                {t.certificates.thisYear}
              </Button>
            </Group>
          </Stack>
          <Group gap="xs" wrap="nowrap">
            <Button
              variant="default"
              style={{ flex: 1 }}
              onClick={clearDraft}
              data-testid="cert-draft-clear"
            >
              {t.common.clearFilters}
            </Button>
            <Button
              style={{ flex: 1 }}
              onClick={applyFilters}
              data-testid="cert-draft-apply"
            >
              {t.common.applyFilters}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={!!deleting}
        onClose={() => setDeleting(null)}
        title={t.certificates.deleteCertTitle}
        centered
      >
        <Stack gap="md">
          <Text size="sm">{t.certificates.deleteCertBody}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleting(null)}>
              {t.common.cancel}
            </Button>
            <Button
              color="red"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await accountsApi.deleteCertificate(deleting.id);
                  notifications.show({ color: 'green', message: t.certificates.deleteCertDone });
                  setDeleting(null);
                  load();
                } catch {
                  notifications.show({ color: 'red', message: t.certificates.error });
                }
              }}
            >
              {t.common.delete}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function TemplatesTab() {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CertificateTemplate | null>(null);
  const [deleting, setDeleting] = useState<CertificateTemplate | null>(null);
  const pagination = useListPagination(templates);

  const load = useCallback(() => {
    setLoading(true);
    accountsApi
      .certificateTemplates()
      .then(setTemplates)
      .catch(() => notifications.show({ color: 'red', message: t.certificates.error }))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const templateActions = (tmpl: CertificateTemplate) => (
    <Group gap={4} justify="flex-end" wrap="nowrap">
      <ActionIcon
        variant="subtle"
        color="blue"
        onClick={() => {
          setEditing(tmpl);
          setModalOpen(true);
        }}
        data-testid={`template-edit-${tmpl.id}`}
      >
        <IconPencil size={17} />
      </ActionIcon>
      <ActionIcon
        variant="subtle"
        color="red"
        onClick={() => setDeleting(tmpl)}
        data-testid={`template-delete-${tmpl.id}`}
      >
        <IconTrash size={17} />
      </ActionIcon>
    </Group>
  );

  return (
    <Stack gap="md">
      <Group justify="flex-end">
        <Box visibleFrom="lg">
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            data-testid="new-template"
          >
            {t.certificates.newTemplate}
          </Button>
        </Box>
        <Box hiddenFrom="lg" w="100%">
          <Button
            fullWidth
            leftSection={<IconPlus size={14} />}
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            data-testid="new-template-mobile"
          >
            {t.certificates.newTemplate}
          </Button>
        </Box>
      </Group>

      {loading ? (
        <Center h={220}>
          <Loader />
        </Center>
      ) : templates.length === 0 ? (
        <Card withBorder>
          <Center h={160}>
            <Text c="dimmed">{t.certificates.emptyTemplates}</Text>
          </Center>
        </Card>
      ) : (
        <>
          <Box visibleFrom="lg">
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t.certificates.templateName}</Table.Th>
                <Table.Th>{t.certificates.templateType}</Table.Th>
                <Table.Th>{t.certificates.layoutMode}</Table.Th>
                <Table.Th>{t.common.status}</Table.Th>
                <Table.Th ta="right">{t.common.actions}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pagination.pageItems.map((tmpl) => (
                <Table.Tr key={tmpl.id}>
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      <ThemeIcon
                        radius="md"
                        size={34}
                        variant="light"
                        color={tmpl.layout_mode === 'CUSTOM_IMAGE' ? 'grape' : 'blue'}
                      >
                        {tmpl.layout_mode === 'CUSTOM_IMAGE' ? (
                          <IconPhoto size={18} />
                        ) : tmpl.layout_mode === 'BASE_PDF' ? (
                          <IconFileTypePdf size={18} />
                        ) : (
                          <IconCertificate size={18} />
                        )}
                      </ThemeIcon>
                      <Text fw={500} size="sm">
                        {tmpl.name}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="teal" variant="light" size="sm">
                      {tmpl.certificate_type_display}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{tmpl.layout_mode_display}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={tmpl.is_active ? 'green' : 'gray'} variant="light" size="sm">
                      {tmpl.is_active ? t.certificates.active : t.certificates.inactive}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{templateActions(tmpl)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
        <Stack hiddenFrom="lg" gap="xs">
          {pagination.pageItems.map((tmpl) => (
            <MobileItemCard
              key={tmpl.id}
              testId={`template-mobile-${tmpl.id}`}
              media={
                <ThemeIcon
                  radius="md"
                  size="lg"
                  variant="light"
                  color={tmpl.layout_mode === 'CUSTOM_IMAGE' ? 'grape' : 'blue'}
                >
                  {tmpl.layout_mode === 'CUSTOM_IMAGE' ? (
                    <IconPhoto size={20} />
                  ) : tmpl.layout_mode === 'BASE_PDF' ? (
                    <IconFileTypePdf size={20} />
                  ) : (
                    <IconCertificate size={20} />
                  )}
                </ThemeIcon>
              }
              actions={templateActions(tmpl)}
            >
              <Stack gap={4}>
                <Text fw={600} truncate>
                  {tmpl.name}
                </Text>
                <Badge color="teal" variant="light" size="sm" style={{ width: 'fit-content' }}>
                  {tmpl.certificate_type_display}
                </Badge>
                <Group gap={4} wrap="nowrap" align="center">
                  <Text size="sm" c="dimmed">
                    {tmpl.layout_mode_display}
                  </Text>
                  <Badge color={tmpl.is_active ? 'green' : 'gray'} variant="light" size="sm">
                    {tmpl.is_active ? t.certificates.active : t.certificates.inactive}
                  </Badge>
                </Group>
              </Stack>
</MobileItemCard>
            ))}
          </Stack>
        </>
      )}

      <ListPagination
        page={pagination.page}
        onPageChange={pagination.setPage}
        pageSize={pagination.pageSize}
        onPageSizeChange={pagination.changePageSize}
        total={pagination.total}
        totalPages={pagination.totalPages}
        rangeStart={pagination.rangeStart}
        rangeEnd={pagination.rangeEnd}
        testId="certificate-templates-pagination"
      />

      <CertificateTemplateModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        editing={editing}
      />

      <Modal
        opened={!!deleting}
        onClose={() => setDeleting(null)}
        title={t.certificates.deleteTemplateTitle}
        centered
      >
        <Stack gap="md">
          <Text size="sm">{t.certificates.deleteTemplateBody}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleting(null)}>
              {t.common.cancel}
            </Button>
            <Button
              color="red"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await accountsApi.deleteCertificateTemplate(deleting.id);
                  notifications.show({
                    color: 'green',
                    message: t.certificates.deleteTemplateDone,
                  });
                  setDeleting(null);
                  load();
                } catch {
                  notifications.show({ color: 'red', message: t.certificates.error });
                }
              }}
            >
              {t.common.delete}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}