import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Center,
  FileInput,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDownload, IconTrash, IconUpload } from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { accountsApi } from '../api/accounts';
import type { Member, MemberDocument, MemberDocumentType } from '../types';

function fmtDateTime(iso: string, locale = 'pt-br'): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
}

export default function MemberDocumentsModal({
  member,
  opened,
  onClose,
}: {
  member: Member | null;
  opened: boolean;
  onClose: () => void;
}) {
  const { t, locale } = useLanguage();
  const [docs, setDocs] = useState<MemberDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<MemberDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<string | null>('RESIDENCE_PROOF');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    if (!member) return;
    setLoading(true);
    accountsApi
      .memberDocuments(member.id)
      .then(setDocs)
      .catch(() => {
        notifications.show({ color: 'red', message: t.overview });
      })
      .finally(() => setLoading(false));
  }, [member, t]);

  useEffect(() => {
    if (opened) {
      setFile(null);
      setDocType('RESIDENCE_PROOF');
      setNotes('');
      load();
    }
  }, [opened, load]);

  const download = async (doc: MemberDocument) => {
    setBusyId(doc.id);
    try {
      const blob = await accountsApi.documentDownload(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      notifications.show({ color: 'red', message: t.overview });
    } finally {
      setBusyId(null);
    }
  };

  const upload = async () => {
    if (!member || !file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType || 'RESIDENCE_PROOF');
    if (notes) formData.append('notes', notes);
    try {
      await accountsApi.uploadMemberDocument(member.id, formData);
      notifications.show({ color: 'green', message: t.membersPage.saved });
      setFile(null);
      setNotes('');
      load();
    } catch (err: any) {
      const data = err?.response?.data;
      const msg =
        data?.file?.[0] ||
        data?.doc_type?.[0] ||
        data?.detail ||
        t.overview;
      notifications.show({ color: 'red', message: msg });
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await accountsApi.deleteMemberDocument(toDelete.id);
      setDocs((prev) => prev.filter((d) => d.id !== toDelete.id));
    } catch {
      notifications.show({ color: 'red', message: t.overview });
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const typeOptions = [
    { value: 'RESIDENCE_PROOF', label: t.documents.typeResidenceProof },
    { value: 'OTHER', label: t.documents.typeOther },
  ];

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={`${t.documents.title}${member ? ` — ${member.name}` : ''}`}
        size="lg"
        centered
      >
        {loading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : docs.length === 0 ? (
          <Text size="sm" c="dimmed" mb="md">
            {t.documents.empty}
          </Text>
        ) : (
          <Table striped mb="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t.documents.docType}</Table.Th>
                <Table.Th>{t.documents.file}</Table.Th>
                <Table.Th>{t.documents.uploadedBy}</Table.Th>
                <Table.Th>{t.documents.uploadedAt}</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>
                  {t.common.actions}
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {docs.map((doc) => (
                <Table.Tr key={doc.id}>
                  <Table.Td>{doc.doc_type_display}</Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={1}>
                      {doc.file_name}
                    </Text>
                    {doc.notes && (
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {doc.notes}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>{doc.uploaded_by_name || '—'}</Table.Td>
                  <Table.Td>{fmtDateTime(doc.uploaded_at, locale)}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Group gap={4} justify="flex-end">
                      <Button
                        size="xs"
                        variant="subtle"
                        leftSection={<IconDownload size={14} />}
                        loading={busyId === doc.id}
                        onClick={() => download(doc)}
                        data-testid={`doc-download-${doc.id}`}
                      >
                        {t.documents.download}
                      </Button>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => setToDelete(doc)}
                        data-testid={`doc-delete-${doc.id}`}
                      >
                        {t.documents.delete}
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

        <Stack gap="sm">
          <Text fw={600}>{t.documents.upload}</Text>
          <Group align="flex-end" grow preventGrowOverflow={false} wrap="wrap">
            <Select
              label={t.documents.docType}
              data={typeOptions}
              value={docType}
              onChange={(v) => setDocType(v || 'RESIDENCE_PROOF')}
              style={{ minWidth: 190 }}
              data-testid="doc-type"
            />
            <FileInput
              label={t.documents.file}
              placeholder={t.documents.filePlaceholder}
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              value={file}
              onChange={setFile}
              clearable
              style={{ minWidth: 260, flex: 2 }}
              data-testid="doc-file"
            />
          </Group>
          <TextInput
            label={t.documents.notes}
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            placeholder="—"
            data-testid="doc-notes"
          />
          <Group justify="flex-end">
            <Button
              leftSection={<IconUpload size={16} />}
              loading={uploading}
              disabled={!file}
              onClick={upload}
              data-testid="doc-upload"
            >
              {t.documents.upload}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={!!toDelete}
        onClose={() => setToDelete(null)}
        title={t.documents.delete}
        centered
      >
        <Stack gap="md">
          <Text>
            {t.documents.deleteBody.replace(
              '{name}',
              toDelete?.file_name || ''
            )}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setToDelete(null)}>
              {t.common.cancel}
            </Button>
            <Button
              color="red"
              loading={deleting}
              onClick={confirmDelete}
              data-testid="doc-delete-confirm"
            >
              {t.documents.delete}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}