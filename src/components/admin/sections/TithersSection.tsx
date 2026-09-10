import React, { useEffect, useState } from 'react';
import {
  Card,
  Group,
  Stack,
  Select,
  SimpleGrid,
  Text,
  Badge,
  Paper,
  Table,
  ScrollArea,
  Skeleton,
  Title,
  ThemeIcon,
  Button,
  Modal,
  TextInput,
  ActionIcon,
  Tooltip,
  Switch,
  Box,
  Divider,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconAlertTriangle,
  IconUsers,
  IconPlus,
  IconPencil,
  IconTrash,
  IconCoins,
  IconRepeat,
} from '@tabler/icons-react';
import PageHeader from '../../../components/PageHeader';
import MoneyInput from '../../../components/MoneyInput';
import { useLanguage } from '../../../i18n';
import { TitherMatrix, TitherMatrixMember, Reconciliation, Tither, TitherRepeatAudit } from '../../../types';
import { AdminFinanceApi } from '../../../api/adminFinance';
import { formatBRL } from '../../../utils/format';

const YEARS = [2022, 2023, 2024, 2025, 2026, 2027];

export default function TithersSection({ api, churchLabel }: { api: AdminFinanceApi; churchLabel: string }) {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<number>(currentMonth);

  const [matrix, setMatrix] = useState<TitherMatrix | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(true);
  const [recon, setRecon] = useState<Reconciliation | null>(null);
  const [reconLoading, setReconLoading] = useState(true);

  const [members, setMembers] = useState<Tither[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tither | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tither | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tithesTarget, setTithesTarget] = useState<TitherMatrixMember | null>(null);
  const [tithesMonths, setTithesMonths] = useState<(number | '')[]>(Array(12).fill(''));
  const [tithesSaving, setTithesSaving] = useState(false);
  const [memberMatrixYear, setMemberMatrixYear] = useState<number>(currentYear);
  const [memberMatrixMonths, setMemberMatrixMonths] = useState<(number | '')[]>(Array(12).fill(''));
  const [memberMatrixLoading, setMemberMatrixLoading] = useState(false);

  const [repeat, setRepeat] = useState<TitherRepeatAudit | null>(null);
  const [repeatLoading, setRepeatLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setMembersLoading(true);
    api
      .listTithers()
      .then((data) => active && setMembers(data))
      .catch(() => active && setMembers([]))
      .finally(() => active && setMembersLoading(false));
    return () => {
      active = false;
    };
  }, [api]);

  useEffect(() => {
    let active = true;
    setMatrixLoading(true);
    api
      .tithersMatrix(year)
      .then((data) => active && setMatrix(data))
      .catch(() => active && setMatrix(null))
      .finally(() => active && setMatrixLoading(false));
    return () => {
      active = false;
    };
  }, [year]);

  useEffect(() => {
    let active = true;
    setReconLoading(true);
    api
      .reconciliation(year, month)
      .then((data) => active && setRecon(data))
      .catch(() => active && setRecon(null))
      .finally(() => active && setReconLoading(false));
    return () => {
      active = false;
    };
  }, [year, month]);

  useEffect(() => {
    let active = true;
    setRepeatLoading(true);
    api
      .titherRepeatAudit(year, month)
      .then((data) => active && setRepeat(data))
      .catch(() => active && setRepeat(null))
      .finally(() => active && setRepeatLoading(false));
    return () => {
      active = false;
    };
  }, [year, month]);

  const reconciled = recon?.status === 'CONCILIADO';

  const form = useForm({
    initialValues: {
      name: '',
      is_anonymous: false,
    },
    validate: {
      name: (v) => (v.trim() ? null : t.common.name),
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset();
    setMemberMatrixYear(currentYear);
    setMemberMatrixMonths(Array(12).fill(''));
    setModalOpen(true);
  };

  const loadMemberMatrix = async (member: Tither | null, y: number) => {
    setMemberMatrixLoading(true);
    if (!member) {
      setMemberMatrixMonths(Array(12).fill(''));
      setMemberMatrixLoading(false);
      return;
    }
    try {
      const m = await api.tithersMatrix(y);
      const row = m.members.find((x) => x.id === member.id);
      setMemberMatrixMonths(
        Array.from({ length: 12 }, (_, i) =>
          row && row.months[i] != null ? Number(row.months[i]) : ''
        )
      );
    } catch {
      setMemberMatrixMonths(Array(12).fill(''));
    } finally {
      setMemberMatrixLoading(false);
    }
  };

  const openEdit = (member: Tither) => {
    setEditing(member);
    form.setValues({ name: member.name, is_anonymous: member.is_anonymous });
    setMemberMatrixYear(currentYear);
    setModalOpen(true);
    void loadMemberMatrix(member, currentYear);
  };

  const handleSave = async () => {
    const valid = form.validate();
    if (valid.hasErrors) return;
    setSaving(true);
    try {
      const payload = {
        name: form.values.name.trim(),
        is_anonymous: form.values.is_anonymous,
      };
      let saved: Tither;
      if (editing) {
        saved = await api.updateTither(editing.id, payload);
        notifications.show({ color: 'green', message: 'Membro atualizado.' });
      } else {
        saved = await api.createTither(payload);
        notifications.show({ color: 'green', message: 'Membro adicionado.' });
      }
      const months = memberMatrixMonths.map((v) =>
        v === '' || v == null ? null : String(v)
      );
      await api.updateTitherTitheRecords(saved.id, memberMatrixYear, months);
      setModalOpen(false);
      setEditing(null);
      form.reset();
      setMembers(await api.listTithers());
      setMatrix(await api.tithersMatrix(year));
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
      await api.deleteTither(deleteTarget.id);
      notifications.show({ color: 'green', message: 'Membro excluído.' });
      setDeleteTarget(null);
      setMembers(await api.listTithers());
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao excluir.' });
    } finally {
      setDeleting(false);
    }
  };

  const openEditTithes = (member: TitherMatrixMember) => {
    setTithesTarget(member);
    setTithesMonths(
      Array.from({ length: 12 }, (_, i) =>
        member.months[i] != null ? Number(member.months[i]) : ''
      )
    );
  };

  const saveTithes = async () => {
    if (!tithesTarget) return;
    setTithesSaving(true);
    try {
      const months = tithesMonths.map((v) =>
        v === '' || v == null ? null : String(v)
      );
      await api.updateTitherTitheRecords(tithesTarget.id, year, months);
      notifications.show({ color: 'green', message: 'Dízimos atualizados.' });
      setTithesTarget(null);
      setMatrix(await api.tithersMatrix(year));
    } catch (err: any) {
      notifications.show({
        color: 'red',
        title: 'Erro',
        message: err?.response?.data?.detail || 'Não foi possível salvar.',
      });
    } finally {
      setTithesSaving(false);
    }
  };

  return (
    <>
      <PageHeader title={t.tithersPage.title} description={churchLabel}>
        <Group gap="md" wrap="wrap">
          <Select
            data-testid="tithers-year"
            label={t.common.year}
            value={String(year)}
            onChange={(v) => v && setYear(Number(v))}
            data={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
            w={110}
          />
          <Select
            data-testid="tithers-month"
            label={t.common.month}
            value={String(month)}
            onChange={(v) => v && setMonth(Number(v))}
            data={t.months.map((m, i) => ({ value: String(i + 1), label: m }))}
            w={180}
          />
        </Group>
      </PageHeader>

      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="lg">
        <Card withBorder shadow="sm" padding="lg">
          {reconLoading ? (
            <Skeleton height={80} />
          ) : (
            <Stack gap={2}>
              <Text size="sm" c="dimmed">
                {t.tithersPage.totalTithe}
              </Text>
              <Text fw={800} size="xl" c="teal">
                {formatBRL(recon?.total_tithe_records)}
              </Text>
              <Badge
                mt="xs"
                color={reconciled ? 'teal' : 'red'}
                variant="light"
                leftSection={
                  reconciled ? <IconCheck size={14} /> : <IconAlertTriangle size={14} />
                }
              >
                {reconciled ? t.tithersPage.reconciled : t.tithersPage.divergent}
              </Badge>
            </Stack>
          )}
        </Card>
        <Card withBorder shadow="sm" padding="lg">
          {reconLoading ? (
            <Skeleton height={80} />
          ) : (
            <Stack gap={2}>
              <Text size="sm" c="dimmed">
                {t.tithersPage.totalDizimo}
              </Text>
              <Text fw={800} size="xl" c="blue">
                {formatBRL(recon?.total_entries_dizimo)}
              </Text>
              <Text size="xs" c="dimmed">
                {t.months[month - 1]} / {year}
              </Text>
            </Stack>
          )}
        </Card>
        <Card withBorder shadow="sm" padding="lg">
          {reconLoading ? (
            <Skeleton height={80} />
          ) : (
            <Stack gap={2}>
              <Text size="sm" c="dimmed">
                {t.tithersPage.difference}
              </Text>
              <Text fw={800} size="xl" c={reconciled ? 'gray' : 'red'}>
                {formatBRL(recon?.difference)}
              </Text>
              <Text size="xs" c="dimmed">
                {reconciled ? 'R$ 0,00' : 'Saldo deve ser zerado'}
              </Text>
            </Stack>
          )}
        </Card>
      </SimpleGrid>

      <Paper withBorder radius="md" p="md" mb="lg">
        <Group mb="md">
          <ThemeIcon color="orange" variant="light" size="lg">
            <IconRepeat size={20} />
          </ThemeIcon>
          <Stack gap={0} style={{ flex: 1 }}>
            <Group gap="sm" justify="space-between" w="100%">
              <Title order={4}>{t.tithersPage.repeatAudit.title}</Title>
              {repeat && (
                <Badge color={repeat.ok ? 'green' : 'red'} variant="light">
                  {repeat.ok
                    ? t.tithersPage.repeatAudit.ok
                    : t.tithersPage.repeatAudit.below}
                </Badge>
              )}
            </Group>
          </Stack>
        </Group>

        {repeatLoading ? (
          <Skeleton height={90} />
        ) : !repeat || repeat.base_count === 0 ? (
          <Text c="dimmed" ta="center" py="md">
            {t.tithersPage.repeatAudit.noData}
          </Text>
        ) : (
          <Stack gap="md">
            <SimpleGrid cols={{ base: 2, sm: 4 }}>
              <RepeatStat
                label={`${t.tithersPage.repeatAudit.basePeriod}: ${t.months[repeat.base_month - 1]}/${repeat.base_year}`}
                value={`${repeat.base_count} ${t.tithersPage.repeatAudit.activeMembers}`}
              />
              <RepeatStat
                label={`${t.tithersPage.repeatAudit.currentPeriod}: ${t.months[repeat.month - 1]}/${repeat.year}`}
                value={`${repeat.current_count} ${t.tithersPage.repeatAudit.activeMembers}`}
              />
              <RepeatStat
                label={t.tithersPage.repeatAudit.repeated}
                value={String(repeat.repeated_count)}
              />
              <RepeatStat
                label={`${t.tithersPage.repeatAudit.rate} (${t.tithersPage.repeatAudit.threshold}: ${repeat.threshold}%)`}
                value={repeat.repeat_percent != null ? `${Number(repeat.repeat_percent).toFixed(1)}%` : '—'}
                accent={repeat.ok ? 'green' : 'red'}
              />
            </SimpleGrid>
            {repeat.missing_members.length > 0 && (
              <Box>
                <Text size="sm" fw={600} mb="xs">
                  {t.tithersPage.repeatAudit.missingTitle}
                </Text>
                <Group gap="xs">
                  {repeat.missing_members.map((m) => (
                    <Badge key={m.id} variant="light" color="red">
                      {m.name}
                    </Badge>
                  ))}
                </Group>
              </Box>
            )}
          </Stack>
        )}
      </Paper>

      <Paper withBorder radius="md" p="md" mb="lg">
        <Group justify="space-between" mb="md">
          <Group>
            <ThemeIcon color="teal" variant="light" size="lg">
              <IconUsers size={20} />
            </ThemeIcon>
            <Title order={4}>{t.tithersPage.membersCard}</Title>
          </Group>
          <Button data-testid="member-new" leftSection={<IconPlus size={16} />} onClick={openCreate}>
            {t.tithersPage.addMember}
          </Button>
        </Group>

        {membersLoading ? (
          <Skeleton height={120} />
        ) : members.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            {t.common.noData}
          </Text>
        ) : (
          <ScrollArea>
            <Table striped withTableBorder highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t.common.name}</Table.Th>
                  <Table.Th>{t.common.type}</Table.Th>
                  <Table.Th ta="right">{t.common.actions}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {members.map((member) => (
                  <Table.Tr key={member.id}>
                    <Table.Td>{member.name}</Table.Td>
                    <Table.Td>
                      {member.is_anonymous ? (
                        <Badge variant="light" color="gray">
                          {t.tithersPage.anonymous}
                        </Badge>
                      ) : (
                        <Text c="dimmed">—</Text>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <Tooltip label={t.common.edit}>
                          <ActionIcon color="blue" variant="subtle" onClick={() => openEdit(member)}>
                            <IconPencil size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label={t.common.delete}>
                          <ActionIcon color="red" variant="subtle" onClick={() => setDeleteTarget(member)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Paper>

      <Paper withBorder radius="md" p="md">
        <Group mb="md">
          <ThemeIcon color="blue" variant="light" size="lg">
            <IconUsers size={20} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={4}>{t.tithersPage.reconcileCard}</Title>
            <Text size="xs" c="dimmed">
              {t.months[month - 1]} / {year}
            </Text>
          </Stack>
        </Group>

        {matrixLoading ? (
          <Skeleton height={300} />
        ) : !matrix || matrix.members.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            {t.common.noData}
          </Text>
        ) : (
          <ScrollArea>
            <Table striped withTableBorder highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th />
                  <Table.Th>{t.common.name}</Table.Th>
                  {t.months.map((m, i) => (
                    <Table.Th key={i} ta="right">
                      {m.slice(0, 3)}
                    </Table.Th>
                  ))}
                  <Table.Th ta="right">{t.common.total}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {matrix.members.map((member) => (
                  <Table.Tr key={member.id}>
                    <Table.Td>
                      <Tooltip label={t.tithersPage.editTithes}>
                        <ActionIcon color="teal" variant="subtle" onClick={() => openEditTithes(member)}>
                          <IconCoins size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td c={member.is_anonymous ? 'dimmed' : undefined}>
                      {member.name}
                    </Table.Td>
                    {member.months.map((val, i) => (
                      <Table.Td key={i} ta="right">
                        {val ? formatBRL(val) : '—'}
                      </Table.Td>
                    ))}
                    <Table.Td ta="right" fw={700}>
                      {formatBRL(member.total)}
                    </Table.Td>
                  </Table.Tr>
                ))}
                <Table.Tr
                  style={{
                    background: 'var(--mantine-color-default-hover)',
                    borderTop: '2px solid var(--mantine-color-default-border)',
                  }}
                >
                  <Table.Td />
                  <Table.Td fw={700}>{t.common.total}</Table.Td>
                  {matrix.month_totals.map((val, i) => (
                    <Table.Td key={i} ta="right" fw={600}>
                      {val ? formatBRL(val) : '—'}
                    </Table.Td>
                  ))}
                  <Table.Td ta="right" fw={800}>
                    {formatBRL(matrix.grand_total)}
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Paper>

      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? t.tithersPage.editMember : t.tithersPage.addMember}
        centered
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack gap="md">
            <TextInput
              data-testid="member-name"
              label={t.common.name}
              placeholder="Nome do membro"
              required
              {...form.getInputProps('name')}
            />
            <Switch
              label={t.tithersPage.anonymous}
              {...form.getInputProps('is_anonymous', { type: 'checkbox' })}
            />
            <Divider label={t.tithersPage.tithesMatrix} labelPosition="left" />
            <Group gap="md" wrap="wrap" align="flex-end">
              <Select
                data-testid="member-matrix-year"
                label={t.common.year}
                value={String(memberMatrixYear)}
                onChange={(v) => {
                  const y = Number(v);
                  if (!Number.isNaN(y)) {
                    setMemberMatrixYear(y);
                    void loadMemberMatrix(editing, y);
                  }
                }}
                data={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
                w={110}
                disabled={memberMatrixLoading}
              />
              <Text size="xs" c="dimmed" mb={4}>
                {t.tithersPage.emptyHint}
              </Text>
            </Group>
            <ScrollArea.Autosize mah="40vh" type="always">
              <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
                {t.months.map((m, i) => (
                  <MoneyInput
                    key={i}
                    label={m}
                    placeholder="0,00"
                    value={memberMatrixMonths[i]}
                    onValueChange={(v) =>
                      setMemberMatrixMonths((prev) => {
                        const next = [...prev];
                        next[i] = v;
                        return next;
                      })
                    }
                  />
                ))}
              </SimpleGrid>
            </ScrollArea.Autosize>
            <Group justify="flex-end" mt="xs">
              <Button
                variant="default"
                onClick={() => {
                  setModalOpen(false);
                  setEditing(null);
                }}
              >
                {t.common.cancel}
              </Button>
              <Button data-testid="member-save" type="submit" loading={saving}>
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

      <Modal
        opened={!!tithesTarget}
        onClose={() => setTithesTarget(null)}
        title={
          tithesTarget
            ? `${t.tithersPage.editTithesFor} ${tithesTarget.name}`
            : t.tithersPage.editTithes
        }
        centered
        size="lg"
      >
        <ScrollArea.Autosize mah="60vh" type="always">
          <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
            {t.months.map((m, i) => (
              <MoneyInput
                key={i}
                label={m}
                placeholder="0,00"
                value={tithesMonths[i]}
                onValueChange={(v) =>
                  setTithesMonths((prev) => {
                    const next = [...prev];
                    next[i] = v;
                    return next;
                  })
                }
              />
            ))}
          </SimpleGrid>
        </ScrollArea.Autosize>
        <Text size="xs" c="dimmed" mt="md">
          {t.tithersPage.emptyHint}
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setTithesTarget(null)}>
            {t.common.cancel}
          </Button>
          <Button color="teal" loading={tithesSaving} onClick={saveTithes}>
            {t.common.save}
          </Button>
        </Group>
      </Modal>
    </>
  );
}

function RepeatStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Paper withBorder p="sm" radius="md" ta="center">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="lg" fw={800} c={accent}>
        {value}
      </Text>
    </Paper>
  );
}