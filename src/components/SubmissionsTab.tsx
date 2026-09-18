import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Center,
  Checkbox,
  Group,
  Loader,
  Menu,
  Modal,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Textarea,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconCopy,
  IconEye,
  IconLink,
  IconQrcode,
  IconRefresh,
  IconUserPlus,
  IconUsersGroup,
  IconX,
} from '@tabler/icons-react';
import { accountsApi } from '../api/accounts';
import { useLanguage } from '../i18n';
import { formatDate } from '../utils/format';
import { buildFormUrl, copyToClipboard } from '../utils/share';
import ShareLinkModal from './ShareLinkModal';
import MobileItemCard from './MobileItemCard';
import type { MemberSubmission, MemberSubmissionStatus } from '../types';

type Filter = MemberSubmissionStatus | 'ALL';

export default function SubmissionsTab() {
  const { t } = useLanguage();
  const [items, setItems] = useState<MemberSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [viewing, setViewing] = useState<MemberSubmission | null>(null);
  const [reviewing, setReviewing] = useState<MemberSubmission | null>(null);
  const [bulkIds, setBulkIds] = useState<number[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [formLink, setFormLink] = useState<string | null>(null);
  const [formLinkCopied, setFormLinkCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [confirmFormLinkRegen, setConfirmFormLinkRegen] = useState(false);
  const [regeneratingFormLink, setRegeneratingFormLink] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    accountsApi
      .memberSubmissions(filter === 'ALL' ? undefined : filter)
      .then((data) => {
        setItems(data);
        setSelected(new Set());
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    accountsApi
      .churchMemberFormLink()
      .then((res) => setFormLink(buildFormUrl(res.hash)))
      .catch(() => undefined);
  }, []);

  const regenerateFormLink = async () => {
    setRegeneratingFormLink(true);
    try {
      const res = await accountsApi.churchMemberFormLinkRegenerate();
      setFormLink(buildFormUrl(res.hash));
      setConfirmFormLinkRegen(false);
    } catch {
      notifications.show({ color: 'red', message: t.overview });
    } finally {
      setRegeneratingFormLink(false);
    }
  };

  const openReview = (item: MemberSubmission, action: 'approve' | 'reject') => {
    setBulkIds(null);
    setReviewing(item);
    setReviewAction(action);
    setNotes('');
  };

  const openBulkReview = (action: 'approve' | 'reject') => {
    setReviewing(null);
    setBulkIds(Array.from(selected));
    setReviewAction(action);
    setNotes('');
  };

  const toggleSelected = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pendingIds = items
    .filter((i) => i.status === 'PENDING')
    .map((i) => i.id);
  const allSelected = pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));

  const confirmReview = async () => {
    const ids = bulkIds ?? (reviewing ? [reviewing.id] : []);
    if (!ids.length) return;
    setBusy(true);
    try {
      for (const id of ids) {
        await accountsApi.reviewMemberSubmission(
          id,
          reviewAction,
          reviewAction === 'reject' && notes.trim() ? notes.trim() : undefined,
        );
      }
      notifications.show({
        color: 'green',
        message:
          reviewAction === 'approve'
            ? t.memberSubmissions.approvedMsg
            : t.memberSubmissions.rejectedMsg,
      });
      setReviewing(null);
      setBulkIds(null);
      setSelected(new Set());
      load();
    } catch {
      notifications.show({ color: 'red', message: t.overview });
    } finally {
      setBusy(false);
    }
  };

  const sourceLabel = (item: MemberSubmission) =>
    item.member ? t.memberSubmissions.fromCard : t.memberSubmissions.fromForm;

  const mobileMenuActions = (item: MemberSubmission) => (
    <>
      <Menu.Item
        leftSection={<IconEye size={16} />}
        onClick={() => setViewing(item)}
        data-testid={`submission-view-${item.id}`}
      >
        {t.memberSubmissions.view}
      </Menu.Item>
      {item.status === 'PENDING' && (
        <>
          <Menu.Item
            leftSection={<IconCheck size={16} />}
            color="green"
            onClick={() => openReview(item, 'approve')}
            data-testid={`submission-approve-${item.id}`}
          >
            {t.memberSubmissions.approve}
          </Menu.Item>
          <Menu.Item
            leftSection={<IconX size={16} />}
            color="red"
            onClick={() => openReview(item, 'reject')}
            data-testid={`submission-reject-${item.id}`}
          >
            {t.memberSubmissions.reject}
          </Menu.Item>
        </>
      )}
    </>
  );

  const rows = items.map((item) => (
    <Table.Tr key={item.id} data-testid={`submission-row-${item.id}`}>
      <Table.Td>
        <Checkbox
          checked={selected.has(item.id)}
          disabled={item.status !== 'PENDING'}
          onChange={() => toggleSelected(item.id)}
          aria-label={t.memberSubmissions.selectRow}
          data-testid={`submission-check-${item.id}`}
        />
      </Table.Td>
      <Table.Td>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="sm" radius="xl" color={item.member ? 'teal' : 'grape'} variant="light">
            {item.member ? <IconUsersGroup size={14} /> : <IconUserPlus size={14} />}
          </ThemeIcon>
          <Stack gap={0}>
            <Text fw={600}>{item.data?.name || '—'}</Text>
            <Text size="xs" c="dimmed">
              {item.member
                ? t.memberSubmissions.member
                : t.memberSubmissions.candidate}
            </Text>
          </Stack>
        </Group>
      </Table.Td>
      <Table.Td>
        <Stack gap={0}>
          <Text size="sm">
            {item.member_name || (item.data?.name || '—')}
          </Text>
          <Text size="xs" c="dimmed">
            {sourceLabel(item)}
          </Text>
        </Stack>
      </Table.Td>
      <Table.Td>
        <Badge color={statusBadgeColor(item.status)} variant="light">
          {item.status_display}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
          {formatDate(item.created_at)}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap={4} justify="flex-end">
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconEye size={14} />}
            onClick={() => setViewing(item)}
            data-testid={`submission-view-${item.id}`}
          >
            {t.memberSubmissions.view}
          </Button>
          {item.status === 'PENDING' && (
            <>
              <Button
                size="xs"
                color="green"
                variant="light"
                leftSection={<IconCheck size={14} />}
                onClick={() => openReview(item, 'approve')}
                data-testid={`submission-approve-${item.id}`}
              >
                {t.memberSubmissions.approve}
              </Button>
              <Button
                size="xs"
                color="red"
                variant="light"
                leftSection={<IconX size={14} />}
                onClick={() => openReview(item, 'reject')}
                data-testid={`submission-reject-${item.id}`}
              >
                {t.memberSubmissions.reject}
              </Button>
            </>
          )}
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      {formLink && (
        <Card withBorder radius="md" p="md" mb="md" data-testid="submissions-form-link">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Stack gap={2}>
              <Group gap="xs">
                <IconLink size={18} />
                <Text size="sm" fw={700}>
                  {t.memberSubmissions.formLinkTitle}
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                {t.memberSubmissions.formLinkHint}
              </Text>
              <Text size="sm" data-testid="submissions-form-link-url">
                {formLink}
              </Text>
            </Stack>
            <Group wrap="nowrap">
              <Button
                size="xs"
                variant="default"
                leftSection={<IconQrcode size={14} />}
                onClick={() => setQrOpen(true)}
              >
                {t.qrShare.qr}
              </Button>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconCopy size={14} />}
                onClick={async () => {
                  await copyToClipboard(formLink);
                  setFormLinkCopied(true);
                  setTimeout(() => setFormLinkCopied(false), 1500);
                }}
              >
                {formLinkCopied ? t.memberSubmissions.copied : t.memberSubmissions.copy}
              </Button>
              <Button
                size="xs"
                variant="default"
                leftSection={<IconRefresh size={14} />}
                onClick={() => setConfirmFormLinkRegen(true)}
              >
                {t.memberSubmissions.regenerate}
              </Button>
            </Group>
          </Group>
        </Card>
      )}

      <Group gap="xs" mb="md">
        <SegmentedControl
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          data={[
            { value: 'ALL', label: t.memberSubmissions.all },
            { value: 'PENDING', label: t.memberSubmissions.pending },
            { value: 'APPROVED', label: t.memberSubmissions.approved },
            { value: 'REJECTED', label: t.memberSubmissions.rejected },
          ]}
          data-testid="submissions-filter"
        />
        <Button variant="default" onClick={load}>
          {t.common.filter}
        </Button>
      </Group>

      <Card withBorder shadow="sm" p={0}>
        {loading ? (
          <Center h={200}>
            <Loader />
          </Center>
        ) : items.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <ThemeIcon size={48} radius="xl" color="gray" variant="light">
              <IconUsersGroup size={24} />
            </ThemeIcon>
            <Text c="dimmed">{t.memberSubmissions.empty}</Text>
          </Stack>
        ) : (
          <>
            {selected.size > 0 && (
              <Group gap="xs" px="md" py="sm" bg="gray.0">
                <Text size="sm" fw={600}>
                  {t.memberSubmissions.selectedCount.replace(
                    '{count}',
                    String(selected.size),
                  )}
                </Text>
                <Button
                  size="xs"
                  color="green"
                  variant="light"
                  leftSection={<IconCheck size={14} />}
                  onClick={() => openBulkReview('approve')}
                  data-testid="submissions-bulk-approve"
                >
                  {t.memberSubmissions.approveSelected}
                </Button>
                <Button
                  size="xs"
                  color="red"
                  variant="light"
                  leftSection={<IconX size={14} />}
                  onClick={() => openBulkReview('reject')}
                  data-testid="submissions-bulk-reject"
                >
                  {t.memberSubmissions.rejectSelected}
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() => setSelected(new Set())}
                >
                  {t.common.clear}
                </Button>
              </Group>
            )}
            <Box visibleFrom="md">
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={40}>
                      <Checkbox
                        checked={allSelected}
                        indeterminate={!allSelected && selected.size > 0}
                        onChange={() => {
                          if (allSelected) setSelected(new Set());
                          else setSelected(new Set(pendingIds));
                        }}
                        disabled={pendingIds.length === 0}
                        aria-label={t.memberSubmissions.selectAll}
                      />
                    </Table.Th>
                    <Table.Th>{t.membersPage.name}</Table.Th>
                    <Table.Th>{t.memberSubmissions.source}</Table.Th>
                    <Table.Th>{t.membersPage.status}</Table.Th>
                    <Table.Th>{t.memberSubmissions.submittedAt}</Table.Th>
                    <Table.Th ta="right">{t.common.actions}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{rows}</Table.Tbody>
              </Table>
            </Box>
            <Stack hiddenFrom="md" gap="xs" p="sm">
              {items.map((item) => (
                <MobileItemCard
                  key={item.id}
                  testId={`submission-mobile-${item.id}`}
                  media={
                    <ThemeIcon
                      size="lg"
                      radius="md"
                      color={item.member ? 'teal' : 'grape'}
                      variant="light"
                    >
                      {item.member ? <IconUsersGroup size={18} /> : <IconUserPlus size={18} />}
                    </ThemeIcon>
                  }
                  actions={mobileMenuActions(item)}
                >
                  <Stack gap={4}>
                    <Group gap="xs" justify="space-between" wrap="nowrap">
                      <Text fw={600} truncate>
                        {item.data?.name || '—'}
                      </Text>
                      <Badge
                        color={statusBadgeColor(item.status)}
                        variant="light"
                        style={{ flexShrink: 0 }}
                      >
                        {item.status_display}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed" truncate>
                      {item.member ? t.memberSubmissions.member : t.memberSubmissions.candidate} •{' '}
                      {sourceLabel(item)}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t.memberSubmissions.submittedAt}: {formatDate(item.created_at)}
                    </Text>
                  </Stack>
                </MobileItemCard>
              ))}
            </Stack>
          </>
        )}
      </Card>

      <SubmissionsDataModal
        opened={!!viewing}
        onClose={() => setViewing(null)}
        item={viewing}
      />

      <Modal
        opened={!!reviewing || !!bulkIds}
        onClose={() => {
          setReviewing(null);
          setBulkIds(null);
        }}
        title={
          reviewAction === 'approve'
            ? t.memberSubmissions.approveTitle
            : t.memberSubmissions.rejectTitle
        }
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            {bulkIds && bulkIds.length > 1
              ? (reviewAction === 'approve'
                  ? t.memberSubmissions.bulkApproveBody
                  : t.memberSubmissions.bulkRejectBody
                ).replace('{count}', String(bulkIds.length))
              : reviewAction === 'approve'
                ? t.memberSubmissions.approveBody.replace(
                    '{name}',
                    reviewing?.data?.name || '—',
                  )
                : t.memberSubmissions.rejectBody.replace(
                    '{name}',
                    reviewing?.data?.name || '—',
                  )}
          </Text>
          {reviewAction === 'reject' && (
            <Textarea
              label={t.memberSubmissions.notes}
              placeholder={t.memberSubmissions.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              data-testid="submission-reject-notes"
            />
          )}
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setReviewing(null);
                setBulkIds(null);
              }}
            >
              {t.common.cancel}
            </Button>
            <Button
              color={reviewAction === 'approve' ? 'green' : 'red'}
              loading={busy}
              onClick={confirmReview}
              data-testid="submission-review-confirm"
            >
              {reviewAction === 'approve'
                ? t.memberSubmissions.approve
                : t.memberSubmissions.reject}
            </Button>
          </Group>
        </Stack>
      </Modal>
    <Modal
        opened={confirmFormLinkRegen}
        onClose={() => setConfirmFormLinkRegen(false)}
        title={t.memberSubmissions.regenerate}
        centered
      >
        <Stack gap="md">
          <Text size="sm">{t.memberSubmissions.regenerateBody}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmFormLinkRegen(false)}>
              {t.common.cancel}
            </Button>
            <Button color="red" onClick={regenerateFormLink} loading={regeneratingFormLink}>
              {t.memberSubmissions.regenerate}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <ShareLinkModal
        opened={qrOpen}
        onClose={() => setQrOpen(false)}
        title={t.memberSubmissions.formLinkTitle}
        subtitle={t.memberSubmissions.formLinkHint}
        getUrl={() => Promise.resolve(formLink ?? '')}
        regenerate={() =>
          accountsApi.churchMemberFormLinkRegenerate().then((res) => {
            const url = buildFormUrl(res.hash);
            setFormLink(url);
            return url;
          })
        }
      />
    </>
  );
}

function statusBadgeColor(status: MemberSubmissionStatus): string {
  if (status === 'APPROVED') return 'green';
  if (status === 'REJECTED') return 'red';
  return 'yellow';
}

const DATA_LABEL_KEYS: Array<[string, string]> = [
  ['photo', 'membersPage|photo'],
  ['name', 'membersPage|name'],
  ['phone', 'membersPage|phone'],
  ['email', 'membersPage|email'],
  ['birth_date', 'membersPage|birthDate'],
  ['cpf', 'membersPage|cpf'],
  ['rg', 'membersPage|rg'],
  ['born_in_city', 'membersPage|bornInCity'],
  ['born_in_state', 'membersPage|bornInState'],
  ['profession', 'membersPage|profession'],
  ['education_level', 'membersPage|educationLevel'],
  ['marital_status', 'membersPage|maritalStatus'],
  ['marriage_date', 'membersPage|marriageDate'],
  ['father_name', 'membersPage|fatherName'],
  ['mother_name', 'membersPage|motherName'],
  ['church_entry', 'membersPage|churchEntry'],
  ['church_entry_other', 'membersPage|churchEntryOther'],
  ['street', 'membersPage|addressStreet'],
  ['number', 'membersPage|addressNumber'],
  ['complement', 'membersPage|addressComplement'],
  ['neighborhood', 'membersPage|addressNeighborhood'],
  ['city', 'membersPage|addressCity'],
  ['state', 'membersPage|addressState'],
  ['cep', 'membersPage|addressCep'],
  ['relatives', 'membersPage|relatives'],
  ['notes', 'membersPage|notes'],
];

function resolveKey(t: Record<string, any>, ref: string): string {
  const [section, key] = ref.split('|');
  return t[section]?.[key] ?? key;
}

const KINSHIP_TRANSLATION_KEYS: Record<string, string> = {
  CONJUGE: 'kinshipSpouse',
  PAI: 'kinshipFather',
  MAE: 'kinshipMother',
  FILHO: 'kinshipChild',
  IRMAO: 'kinshipSibling',
  AVO: 'kinshipGrandparent',
  NETO: 'kinshipGrandchild',
  OUTRO: 'kinshipOther',
};

function relativesKinshipLabel(t: Record<string, any>, kinship?: string | null): string {
  if (!kinship) return '—';
  const key = KINSHIP_TRANSLATION_KEYS[kinship];
  return key ? (t.membersPage?.[key] ?? kinship) : kinship;
}

function SubmissionsDataModal({
  opened,
  onClose,
  item,
}: {
  opened: boolean;
  onClose: () => void;
  item: MemberSubmission | null;
}) {
  const { t } = useLanguage();
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t.memberSubmissions.dataTitle}
      centered
      size="md"
    >
      {item && (
        <Table withColumnBorders>
          <Table.Tbody>
            {DATA_LABEL_KEYS.map(([field, ref]) => {
              const value = item.data?.[field as keyof typeof item.data];
              if (value === null || value === undefined || value === '') return null;
              return (
                <Table.Tr key={field}>
                  <Table.Td w="40%">
                    <Text size="sm" fw={600}>
                      {resolveKey(t, ref)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {field === 'photo' ? (
                      value ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={String(value)}
                          alt={t.membersPage.photo}
                          style={{
                            width: 48,
                            height: 48,
                            objectFit: 'cover',
                            borderRadius: 8,
                          }}
                        />
                      ) : (
                        <Text size="sm" c="dimmed">
                          —
                        </Text>
                      )
                    ) : field === 'relatives' && Array.isArray(value) ? (
                      value.length === 0 ? (
                        <Text size="sm" c="dimmed">
                          —
                        </Text>
                      ) : (
                        <Stack gap={2}>
                          {(value as any[]).map((rel, i) => (
                            <Text key={i} size="sm">
                              {rel.name} • {relativesKinshipLabel(t, rel.kinship)}
                            </Text>
                          ))}
                        </Stack>
                      )
                    ) : (
                      <Text size="sm" style={{ wordBreak: 'break-word' }}>
                        {field === 'birth_date' || field === 'marriage_date'
                          ? formatDate(String(value))
                          : String(value)}
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
            {!item.data ||
              (Object.keys(item.data).filter(
                (k) => item.data?.[k as keyof typeof item.data],
              ).length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={2} ta="center">
                    <Text size="sm" c="dimmed">
                      {t.memberSubmissions.emptyData}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
          </Table.Tbody>
        </Table>
      )}
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose}>
          {t.memberCard.close}
        </Button>
      </Group>
    </Modal>
  );
}