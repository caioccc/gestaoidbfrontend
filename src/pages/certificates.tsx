import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
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
import CertificateIssueModal from '../components/CertificateIssueModal';
import CertificateTemplateModal from '../components/CertificateTemplateModal';
import { useLanguage } from '../i18n';
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
  const [certificates, setCertificates] = useState<EcclesiasticalCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [issueOpen, setIssueOpen] = useState(false);
  const [deleting, setDeleting] = useState<EcclesiasticalCertificate | null>(null);
  const [search, setSearch] = useState('');
  const [certsType, setCertsType] = useState<string>('');
  const [year, setYear] = useState<string>('');

  const years = useMemo(
    () =>
      Array.from(
        new Set(
          certificates
            .map((c) => c.event_date.slice(0, 4))
            .filter(Boolean)
            .sort((a, b) => Number(b) - Number(a)),
        ),
      ),
    [certificates],
  );

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

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <Group gap="sm">
          <TextInput
            placeholder={t.certificates.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            w={260}
          />
          <Select
            placeholder={t.certificates.allTypes}
            data={typeOptions}
            value={certsType || null}
            onChange={(v) => setCertsType(v ?? '')}
            clearable
            w={210}
          />
          <Select
            placeholder={t.certificates.allYears}
            data={years.map((y) => ({ value: y, label: y }))}
            value={year || null}
            onChange={(v) => setYear(v ?? '')}
            clearable
            w={130}
          />
        </Group>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setIssueOpen(true)}
          data-testid="issue-certificate"
        >
          {t.certificates.issue}
        </Button>
      </Group>

      {loading ? (
        <Center h={220}>
          <Loader />
        </Center>
      ) : certificates.length === 0 ? (
        <Card withBorder>
          <Center h={160}>
            <Text c="dimmed">{t.certificates.emptyIssued}</Text>
          </Center>
        </Card>
      ) : (
        <Card withBorder padding={0}>
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
              {certificates.map((cert) => (
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
                  <Table.Td>
                    <Group justify="flex-end" gap={4}>
                      <Tooltip label={t.certificates.reprint}>
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          onClick={() => handleDownload(cert)}
                          data-testid="cert-download"
                        >
                          <IconDownload size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => setDeleting(cert)}
                        data-testid="cert-delete"
                      >
                        <IconTrash size={17} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      <CertificateIssueModal
        opened={issueOpen}
        onClose={() => setIssueOpen(false)}
        onIssued={load}
      />

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

  return (
    <Stack gap="md">
      <Group justify="flex-end">
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
            {templates.map((tmpl) => (
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
                <Table.Td>
                  <Group justify="flex-end" gap={4}>
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      onClick={() => {
                        setEditing(tmpl);
                        setModalOpen(true);
                      }}
                      data-testid="template-edit"
                    >
                      <IconPencil size={17} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => setDeleting(tmpl)}
                      data-testid="template-delete"
                    >
                      <IconTrash size={17} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

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