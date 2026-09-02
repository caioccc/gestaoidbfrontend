import React, { useState } from 'react';
import {
  Stack,
  Text,
  Paper,
  Title,
  Group,
  Badge,
  SimpleGrid,
  Alert,
  Table,
  Textarea,
  Button,
  Skeleton,
  ThemeIcon,
} from '@mantine/core';
import {
  IconCheck,
  IconAlertTriangle,
  IconClipboardCheck,
  IconRepeat,
  IconCoins,
  IconListCheck,
  IconExternalLink,
} from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { MonthlyValidationResponse } from '../types';
import { formatBRL, toNumber } from '../utils/format';
import SignatureViewerModal from './SignatureViewerModal';

interface ValidationPanelProps {
  data: MonthlyValidationResponse | null;
  loading: boolean;
  note: string;
  onNoteChange: (value: string) => void;
  approving: boolean;
  rejecting: boolean;
  onApprove: () => void;
  onReject: () => void;
  role: 'treasury' | 'leadership';
}

export default function ValidationPanel({
  data,
  loading,
  note,
  onNoteChange,
  approving,
  rejecting,
  onApprove,
  onReject,
  role,
}: ValidationPanelProps) {
  const { t } = useLanguage();
  if (loading) {
    return <Skeleton height={320} />;
  }
  if (!data) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        {t.validationPage.noData}
      </Text>
    );
  }

  const { checks, validation } = data;
  const closing = checks.closing;
  const prebenda = checks.prebenda;
  const repeat = checks.tither_repeat;
  const nature = checks.nature_summary ?? [];
  const isTreasury = role === 'treasury';

  const treasuryApproved = !!validation?.treasury_approved_at;
  const treasuryRejected = !!validation?.treasury_rejected_at;
  const leadershipApproved = !!validation?.leadership_approved_at;
  const leadershipRejected = !!validation?.leadership_rejected_at;

  // Tesouraria e Liderança assinam o MESMO slot da Tesouraria ("marcado
  // apenas para a tesouraria"); a Liderança pode assinar pela Tesouraria.
  // A competência precisa estar fechada para aprovar.
  const canApprove = closing.is_closed && !treasuryApproved;
  const canReject = !treasuryApproved;

  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <Stack gap="lg">
      <Paper withBorder radius="md" p="md">
        <Group mb="md">
          <ThemeIcon color="blue" variant="light" size="lg">
            <IconClipboardCheck size={20} />
          </ThemeIcon>
          <Title order={4}>{t.validationPage.checksTitle}</Title>
        </Group>

        <Alert
          icon={
            closing.is_closed ? <IconCheck size={16} /> : <IconAlertTriangle size={16} />
          }
          color={closing.is_closed ? 'green' : 'yellow'}
          title={
            closing.is_closed
              ? t.validationPage.closed
              : t.validationPage.notClosed
          }
          mb="md"
        >
          {!closing.is_closed && t.validationPage.closeRequired}
        </Alert>

        <SimpleGrid cols={{ base: 2, sm: 4 }}>
          <ValueBox label="Saldo anterior" value={closing.previous_balance} money />
          <ValueBox label={t.dashboard.totalEntries} value={closing.total_entries} money />
          <ValueBox label={t.dashboard.totalExits} value={closing.total_exits} money />
          <ValueBox
            label={t.closingsPage.final}
            value={closing.final_balance}
            money
            accent="blue"
          />
        </SimpleGrid>
      </Paper>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Paper withBorder radius="md" p="md">
          <Group justify="space-between" mb="sm">
            <Group>
              <ThemeIcon color="grape" variant="light" size="lg">
                <IconCoins size={20} />
              </ThemeIcon>
              <Title order={5}>{t.validationPage.prebenda}</Title>
            </Group>
            <Badge color={prebenda.ok ? 'green' : 'red'} variant="light">
              {prebenda.ok
                ? t.validationPage.prebendaOk
                : t.validationPage.prebendaMismatch}
            </Badge>
          </Group>
          <SimpleGrid cols={2}>
            <ValueBox label="%" value={`${prebenda.percent}%`} />
            <ValueBox label="Esperado" value={prebenda.expected} money />
            <ValueBox label="Registrado" value={prebenda.recorded} money />
            <ValueBox
              label={`Diferença (tol: ${prebenda.tolerance})`}
              value={prebenda.difference}
              money
              accent={prebenda.ok ? 'green' : 'red'}
            />
          </SimpleGrid>
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Group justify="space-between" mb="sm">
            <Group>
              <ThemeIcon color="orange" variant="light" size="lg">
                <IconRepeat size={20} />
              </ThemeIcon>
              <Title order={5}>{t.validationPage.titherRepeat}</Title>
            </Group>
            {repeat.base_count > 0 && (
              <Badge color={repeat.ok ? 'green' : 'red'} variant="light">
                {repeat.ok ? t.validationPage.repeatOk : t.validationPage.repeatBelow}
              </Badge>
            )}
          </Group>
          {repeat.base_count === 0 ? (
            <Text c="dimmed" size="sm" ta="center" py="md">
              {t.tithersPage.repeatAudit.noData}
            </Text>
          ) : (
            <SimpleGrid cols={2}>
              <ValueBox
                label={`${t.tithersPage.repeatAudit.basePeriod}: ${t.months[repeat.base_month - 1]}/${repeat.base_year}`}
                value={String(repeat.base_count)}
              />
              <ValueBox
                label={`${t.tithersPage.repeatAudit.currentPeriod}: ${t.months[repeat.month - 1]}/${repeat.year}`}
                value={String(repeat.current_count)}
              />
              <ValueBox
                label={t.tithersPage.repeatAudit.rate}
                value={repeat.repeat_percent != null ? `${Number(repeat.repeat_percent).toFixed(1)}%` : '—'}
                accent={repeat.ok ? 'green' : 'red'}
              />
              <ValueBox
                label={t.tithersPage.repeatAudit.repeated}
                value={String(repeat.repeated_count)}
              />
            </SimpleGrid>
          )}
        </Paper>
      </SimpleGrid>

      <Paper withBorder radius="md" p="md">
        <Group mb="md">
          <ThemeIcon color="teal" variant="light" size="lg">
            <IconListCheck size={20} />
          </ThemeIcon>
          <Title order={5}>{t.validationPage.nature}</Title>
        </Group>
        {nature.length === 0 ? (
          <Text c="dimmed" ta="center" py="md">
            {t.common.noData}
          </Text>
        ) : (
          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t.common.category}</Table.Th>
                <Table.Th ta="right">{t.common.value}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {nature.map((row) => (
                <Table.Tr key={row.nature}>
                  <Table.Td>{row.label}</Table.Td>
                  <Table.Td ta="right">{formatBRL(toNumber(row.value))}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      <Paper withBorder radius="md" p="md">
        <Group justify="space-between" wrap="wrap" mb="md">
          <Group>
            <ThemeIcon color="blue" variant="light" size="lg">
              <IconClipboardCheck size={20} />
            </ThemeIcon>
            <Stack gap={0}>
              <Title order={5}>{t.validationPage.status}</Title>
              <Text size="xs" c="dimmed">
                {t.validationPage.approvalFlow}
              </Text>
            </Stack>
          </Group>
          <Group gap="xs">
            <Badge
              color={treasuryApproved ? 'green' : treasuryRejected ? 'red' : 'gray'}
              variant="light"
            >
              {t.validationPage.treasuryApproved}:{' '}
              {treasuryApproved
                ? t.validationPage.approved
                : treasuryRejected
                  ? t.validationPage.rejected
                  : t.validationPage.pending}
            </Badge>
            {leadershipApproved && (
              <Badge color="teal" variant="light">
                {t.validationPage.leadershipApproved}: {t.validationPage.approved}
              </Badge>
            )}
          </Group>
        </Group>

        {validation?.note && (
          <Text size="sm" c="dimmed" mb="md">
            {t.validationPage.noteLabel}: {validation.note}
          </Text>
        )}

        <Group gap="md" mb="md">
          {(treasuryApproved || treasuryRejected) && (
            <Button
              variant="light"
              color={treasuryApproved ? 'green' : 'red'}
              size="xs"
              leftSection={<IconExternalLink size={14} />}
              onClick={() => setViewerOpen(true)}
              data-testid="validation-signature-link"
            >
              {t.validationPage.treasuryApproved}{' '}
              {treasuryApproved ? '✓' : '✗'}{' '}
              {(validation?.treasury_approved_at || validation?.treasury_rejected_at || '').slice(0, 16)}
            </Button>
          )}
          {!treasuryApproved && !treasuryRejected && (
            <Text size="xs" c="dimmed">
              {t.validationPage.pending}
            </Text>
          )}
        </Group>

        <Stack gap="md">
          <Textarea
            data-testid="validation-note"
            label={t.validationPage.noteLabel}
            placeholder={t.validationPage.notePlaceholder}
            value={note}
            onChange={(e) => onNoteChange(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button
              data-testid="validation-reject"
              variant="outline"
              color="red"
              loading={rejecting}
              disabled={!canReject}
              onClick={onReject}
            >
              {t.validationPage.reject}
            </Button>
            <Button
              data-testid="validation-approve"
              color="green"
              leftSection={<IconCheck size={16} />}
              loading={approving}
              disabled={!canApprove}
              onClick={onApprove}
            >
              {role === 'treasury'
                ? t.validationPage.approveTreasury
                : t.validationPage.approveLeadership}
            </Button>
          </Group>
        </Stack>
      </Paper>

      <SignatureViewerModal
        opened={viewerOpen}
        onClose={() => setViewerOpen(false)}
        photoUrl={validation?.treasury_photo_url ?? null}
        signatureUrl={validation?.treasury_signature_url ?? null}
        signatureHash={validation?.signature_hash ?? null}
        roleLabel={t.validationPage.treasuryApproved}
        signedAt={
          (validation?.treasury_approved_at ||
            validation?.treasury_rejected_at || '')?.slice(0, 19)
        }
        approved={treasuryApproved}
      />
    </Stack>
  );
}

function ValueBox({
  label,
  value,
  accent,
  money,
}: {
  label: string;
  value: string;
  accent?: string;
  money?: boolean;
}) {
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="md" fw={700} c={accent}>
        {money ? formatBRL(toNumber(value)) : value}
      </Text>
    </Stack>
  );
}