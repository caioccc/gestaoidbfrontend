import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Grid,
  Loader,
  Menu,
  Modal,
  Paper,
  Progress,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  IconBrandWhatsapp,
  IconCalendarEvent,
  IconChecklist,
  IconClipboardCheck,
  IconDeviceFloppy,
  IconDoor,
  IconDotsVertical,
  IconFileSpreadsheet,
  IconPencil,
  IconPhone,
  IconPlus,
  IconReportAnalytics,
  IconSearch,
  IconTrash,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import SundaySchoolSessionModal from '../components/SundaySchoolSessionModal';
import { useLanguage } from '../i18n';
import { accountsApi } from '../api/accounts';
import { saveBlob } from '../api/finance';
import { formatBRL, maskPhone, toUpperCamelWords } from '../utils/format';
import type {
  SundaySchoolCategory,
  SundaySchoolClass,
  SundaySchoolClassPayload,
  SundaySchoolClassReport,
  SundaySchoolEnrollment,
  SundaySchoolMonthlyReport,
  SundaySchoolWhatsAppRow,
} from '../types';

function nextSundayKey(): string {
  const d = new Date();
  const dow = d.getDay();
  const diff = dow === 0 ? 7 : 7 - dow;
  const n = new Date(d);
  n.setDate(n.getDate() + diff);
  const mm = String(n.getMonth() + 1).padStart(2, '0');
  const dd = String(n.getDate()).padStart(2, '0');
  return `${n.getFullYear()}-${mm}-${dd}`;
}

function formatKey(value: string): string {
  if (!value) return value;
  const [y, m, d] = value.split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

const CATEGORY_OPTIONS: { value: SundaySchoolCategory; key: string }[] = [
  { value: 'CHILDREN', key: 'categoryChildren' },
  { value: 'TEENS', key: 'categoryTeens' },
  { value: 'YOUTH', key: 'categoryYouth' },
  { value: 'ADULTS', key: 'categoryAdults' },
  { value: 'COUPLES', key: 'categoryCouples' },
  { value: 'DISCIPLESHIP', key: 'categoryDiscipleship' },
];

export default function SundaySchoolPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<string | null>('classes');

  return (
    <AuthGuard roles={['PASTOR', 'SECRETARIA', 'PROFESSOR_EBD']}>
      <Layout>
        <PageHeader title={t.sundaySchool.title} description={t.sundaySchool.subtitle} />
        <Tabs value={tab} onChange={setTab} variant="default" mb="lg">
          <Tabs.List>
            <Tabs.Tab value="classes" leftSection={<IconChecklist size={16} />}>
              {t.sundaySchool.tabClasses}
            </Tabs.Tab>
            <Tabs.Tab value="students" leftSection={<IconUsers size={16} />}>
              {t.sundaySchool.tabStudents}
            </Tabs.Tab>
            <Tabs.Tab value="report" leftSection={<IconReportAnalytics size={16} />}>
              {t.sundaySchool.tabReport}
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
        {tab === 'classes' ? <ClassesTab /> : null}
        {tab === 'report' ? <ReportTab /> : null}
        {tab === 'students' ? <StudentsTab /> : null}
      </Layout>
    </AuthGuard>
  );
}

function ClassesTab() {
  const { t } = useLanguage();
  const [classes, setClasses] = useState<SundaySchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SundaySchoolClass | null>(null);
  const [deleting, setDeleting] = useState<SundaySchoolClass | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [callRollFor, setCallRollFor] = useState<SundaySchoolClass | null>(null);
  const [callRollDate, setCallRollDate] = useState<string | null>(nextSundayKey());
  const [sessionClass, setSessionClass] = useState<SundaySchoolClass | null>(null);
  const [sessionDate, setSessionDate] = useState('');
  const [announceFor, setAnnounceFor] = useState<SundaySchoolClass | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    accountsApi
      .sundaySchoolClasses()
      .then(setClasses)
      .catch(() => notifications.show({ color: 'red', message: t.sundaySchool.noReportData }))
      .finally(() => setLoading(false));
  }, [t.sundaySchool.noReportData]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Stack gap="md">
      <Group justify="space-between" mb="md">
        <Text size="sm" c="dimmed">
          {t.sundaySchool.noClassesHint}
        </Text>
        <Button
          leftSection={<IconPlus size={16} />}
          variant="filled"
          color="blue"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          data-testid="new-class"
        >
          {t.sundaySchool.newClass}
        </Button>
      </Group>

      {loading ? (
        <Center h={220}>
          <Loader />
        </Center>
      ) : classes.length === 0 ? (
        <Paper withBorder p="md" radius="md">
          <Center h={160}>
            <Text c="dimmed">{t.sundaySchool.noClasses}</Text>
          </Center>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {classes.map((c) => (
            <Paper
              key={c.id}
              withBorder
              p="md"
              radius="md"
              shadow="xs"
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              <Group justify="space-between" align="flex-start" mb="xs" wrap="nowrap">
                <Text fw={600} size="md" truncate style={{ flex: 1, minWidth: 0 }}>
                  {c.name}
                </Text>
                <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                  <Badge size="sm" variant="light" color="grape">
                    {c.category_display}
                  </Badge>
                  <Menu position="bottom-end" shadow="md">
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray" aria-label={t.sundaySchool.editClass}>
                        <IconDotsVertical size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconPencil size={14} />}
                        onClick={() => {
                          setEditing(c);
                          setFormOpen(true);
                        }}
                      >
                        {t.common.edit}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconTrash size={14} />}
                        color="red"
                        onClick={() => setDeleting(c)}
                      >
                        {t.common.delete}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Group>

              <Stack gap={6} style={{ flex: 1 }}>
                <Group gap="xs" c="dimmed" wrap="nowrap">
                  <IconUser size={14} />
                  <Text size="xs" c="dimmed" truncate>
                    {c.teacher_name || '—'}
                  </Text>
                </Group>
                {c.room_location ? (
                  <Group gap="xs" c="dimmed" wrap="nowrap">
                    <IconDoor size={14} />
                    <Text size="xs" c="dimmed" truncate>
                      {c.room_location}
                    </Text>
                  </Group>
                ) : null}
                <Badge
                  variant="outline"
                  color="gray"
                  size="sm"
                  style={{ alignSelf: 'flex-start' }}
                >
                  {t.sundaySchool.studentsCount.replace('{count}', String(c.enrollment_count))}
                </Badge>
              </Stack>

              <Group gap="xs" mt="md" wrap="nowrap">
                <Button
                  fullWidth
                  variant="light"
                  color="blue"
                  leftSection={<IconClipboardCheck size={16} />}
                  disabled={!c.is_active}
                  onClick={() => {
                    setCallRollFor(c);
                    setCallRollDate(nextSundayKey());
                  }}
                  data-testid={`call-roll-${c.id}`}
                  style={{ flex: 1 }}
                >
                  {t.sundaySchool.registerCallShort}
                </Button>
                <Tooltip label={t.sundaySchool.announceWhatsAppHint}>
                  <ActionIcon
                    color="teal"
                    variant="light"
                    size="lg"
                    disabled={!c.is_active}
                    onClick={() => setAnnounceFor(c)}
                    data-testid={`announce-${c.id}`}
                  >
                    <IconBrandWhatsapp size={18} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>
      )}

      <ClassFormModal
        opened={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          load();
        }}
        editing={editing}
      />

      <Modal
        opened={!!callRollFor}
        onClose={() => setCallRollFor(null)}
        title={t.sundaySchool.registerCall}
        centered
      >
        {callRollFor ? (
          <Stack gap="md">
            <Text size="sm" fw={600}>
              {callRollFor.name}
            </Text>
            <DateInput
              value={callRollDate}
              onChange={setCallRollDate}
              label={t.sundaySchool.selectSunday}
              valueFormat="DD/MM/YYYY"
              clearable={false}
              firstDayOfWeek={0}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setCallRollFor(null)}>
                {t.sundaySchool.back}
              </Button>
              <Button
                leftSection={<IconCalendarEvent size={16} />}
                disabled={!callRollDate}
                onClick={() => {
                  if (!callRollDate) return;
                  setSessionDate(callRollDate);
                  setSessionClass(callRollFor);
                  setCallRollFor(null);
                }}
                data-testid="open-call-roll"
              >
                {t.sundaySchool.registerCall}
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>

      {sessionClass ? (
        <SundaySchoolSessionModal
          opened={!!sessionClass}
          onClose={() => setSessionClass(null)}
          classId={sessionClass.id}
          className={sessionClass.name}
          date={sessionDate}
          onSaved={load}
        />
      ) : null}

      <AnnounceModal
        sundayClass={announceFor}
        onClose={() => setAnnounceFor(null)}
      />

      <Modal
        opened={!!deleting}
        onClose={() => setDeleting(null)}
        title={t.sundaySchool.deleteClassTitle}
        centered
      >
        <Stack gap="md">
          <Text size="sm">{t.sundaySchool.deleteClassBody}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleting(null)}>
              {t.common.cancel}
            </Button>
            <Button
              color="red"
              loading={deletingBusy}
              onClick={async () => {
                if (!deleting) return;
                setDeletingBusy(true);
                try {
                  await accountsApi.deleteSundaySchoolClass(deleting.id);
                  notifications.show({
                    color: 'green',
                    message: t.sundaySchool.classDeleted,
                  });
                  setDeleting(null);
                  load();
                } catch {
                  notifications.show({ color: 'red', message: t.sundaySchool.noReportData });
                } finally {
                  setDeletingBusy(false);
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

function ClassFormModal({
  opened,
  onClose,
  onSaved,
  editing,
}: {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: SundaySchoolClass | null;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SundaySchoolCategory | null>('ADULTS');
  const [teacherName, setTeacherName] = useState('');
  const [coTeacherName, setCoTeacherName] = useState('');
  const [roomLocation, setRoomLocation] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setName(editing?.name ?? '');
    setCategory(editing?.category ?? 'ADULTS');
    setTeacherName(editing?.teacher_name ?? '');
    setCoTeacherName(editing?.co_teacher_name ?? '');
    setRoomLocation(editing?.room_location ?? '');
    setIsActive(editing?.is_active ?? true);
  }, [opened, editing]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const payload: SundaySchoolClassPayload = {
      name: toUpperCamelWords(name),
      category: category ?? 'ADULTS',
      teacher_name: toUpperCamelWords(teacherName),
      co_teacher_name: coTeacherName.trim() ? toUpperCamelWords(coTeacherName) : undefined,
      room_location: roomLocation.trim() ? toUpperCamelWords(roomLocation) : undefined,
      is_active: isActive,
    };
    try {
      if (editing) {
        await accountsApi.updateSundaySchoolClass(editing.id, payload);
      } else {
        await accountsApi.createSundaySchoolClass(payload);
      }
      notifications.show({ color: 'green', message: t.sundaySchool.classSaved });
      onSaved();
    } catch {
      notifications.show({ color: 'red', message: t.sundaySchool.noReportData });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editing ? t.sundaySchool.editClass : t.sundaySchool.newClass}
      centered
    >
      <Stack gap="sm">
        <TextInput
          label={t.sundaySchool.className}
          placeholder={t.sundaySchool.classNamePlaceholder}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
        />
        <Select
          label={t.sundaySchool.category}
          data={CATEGORY_OPTIONS.map((o) => ({
            value: o.value,
            label: t.sundaySchool[o.key as keyof typeof t.sundaySchool],
          }))}
          value={category}
          onChange={(v) => setCategory((v as SundaySchoolCategory) ?? 'ADULTS')}
        />
        <TextInput
          label={t.sundaySchool.teacherName}
          value={teacherName}
          onChange={(e) => setTeacherName(e.currentTarget.value)}
        />
        <TextInput
          label={t.sundaySchool.coTeacherName}
          placeholder={t.sundaySchool.coTeacherName}
          value={coTeacherName}
          onChange={(e) => setCoTeacherName(e.currentTarget.value)}
        />
        <TextInput
          label={t.sundaySchool.roomLocation}
          placeholder={t.sundaySchool.roomLocationPlaceholder}
          value={roomLocation}
          onChange={(e) => setRoomLocation(e.currentTarget.value)}
        />
        <Switch
          label={t.sundaySchool.active}
          checked={isActive}
          onChange={(e) => setIsActive(e.currentTarget.checked)}
          labelPosition="left"
        />
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            loading={saving}
            onClick={save}
          >
            {t.common.save}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function AnnounceModal({
  sundayClass,
  onClose,
}: {
  sundayClass: SundaySchoolClass | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [topic, setTopic] = useState('');
  const [rows, setRows] = useState<SundaySchoolWhatsAppRow[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [preparedName, setPreparedName] = useState('');

  useEffect(() => {
    if (!sundayClass) return;
    setRows([]);
    setTopic('');
    setPreparedName('');
  }, [sundayClass]);

  const prepare = async () => {
    if (!sundayClass) return;
    setPreparing(true);
    try {
      const data = await accountsApi.prepareSundaySchoolWhatsApp(sundayClass.id, {
        kind: 'EBD_CLASS_ANNOUNCEMENT',
        topic: topic.trim() || undefined,
      });
      setRows(data.rows);
      setPreparedName(data.class_name);
    } catch {
      notifications.show({ color: 'red', message: t.sundaySchool.noReportData });
    } finally {
      setPreparing(false);
    }
  };

  return (
    <Modal
      opened={!!sundayClass}
      onClose={onClose}
      title={t.sundaySchool.announceClass}
      centered
      size="lg"
    >
      {sundayClass ? (
        <Stack gap="md">
          <Text size="sm" fw={600}>
            {sundayClass.name}
          </Text>
          <TextInput
            label={t.sundaySchool.topicLabel}
            placeholder={t.sundaySchool.topicPlaceholder}
            value={topic}
            onChange={(e) => setTopic(e.currentTarget.value)}
          />
          <Button
            leftSection={<IconBrandWhatsapp size={16} />}
            color="green"
            loading={preparing}
            onClick={prepare}
            data-testid="prepare-whatsapp"
          >
            {t.sundaySchool.announceClass}
          </Button>

          {rows.length > 0 ? (
            <>
              <Badge color="green" variant="light" style={{ width: 'fit-content' }}>
                {t.sundaySchool.announceDone}
              </Badge>
              <ScrollArea.Autosize mah={320} type="auto">
                <Stack gap="xs">
                  {rows.map((row) => (
                    <Group key={row.enrollment_id} justify="space-between" wrap="wrap" gap="xs">
                      <Text size="sm" truncate style={{ flex: 1, minWidth: 140 }}>
                        {row.student_name}
                      </Text>
                      <Button
                        component="a"
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="xs"
                        variant="light"
                        color="green"
                        leftSection={<IconBrandWhatsapp size={14} />}
                      >
                        {t.sundaySchool.openWhatsApp}
                      </Button>
                    </Group>
                  ))}
                </Stack>
              </ScrollArea.Autosize>
            </>
          ) : rows.length === 0 && preparedName ? (
            <Text size="sm" c="dimmed">
              {t.sundaySchool.noStudents}
            </Text>
          ) : null}
        </Stack>
      ) : null}
    </Modal>
  );
}

function StudentsTab() {
  const { t } = useLanguage();
  const [classes, setClasses] = useState<SundaySchoolClass[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<SundaySchoolEnrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<SundaySchoolEnrollment | null>(null);

  useEffect(() => {
    accountsApi
      .sundaySchoolClasses()
      .then((data) => {
        setClasses(data);
        if (data.length > 0) setClassId((prev) => prev ?? String(data[0].id));
      })
      .catch(() => null);
  }, []);

  const load = useCallback(() => {
    if (!classId) return;
    setLoading(true);
    accountsApi
      .sundaySchoolStudents(Number(classId), search.trim() || undefined)
      .then(setStudents)
      .catch(() => notifications.show({ color: 'red', message: t.sundaySchool.noReportData }))
      .finally(() => setLoading(false));
  }, [classId, search, t.sundaySchool.noReportData]);

  useEffect(() => {
    const h = window.setTimeout(load, 250);
    return () => window.clearTimeout(h);
  }, [load]);

  const addStudent = async () => {
    if (!classId || !newName.trim()) return;
    setAdding(true);
    try {
      await accountsApi.createSundaySchoolStudent(Number(classId), {
        student_name: toUpperCamelWords(newName),
        phone: newPhone.trim() || undefined,
      });
      notifications.show({ color: 'green', message: t.sundaySchool.studentAdded });
      setNewName('');
      setNewPhone('');
      load();
    } catch {
      notifications.show({ color: 'red', message: t.sundaySchool.noReportData });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Stack gap="md">
      {classes.length > 0 ? (
        <SegmentedControl
          size="sm"
          radius="md"
          mb="md"
          value={classId ?? (classes[0] ? String(classes[0].id) : '')}
          onChange={(v) => setClassId(v)}
          data={classes.map((c) => ({ value: String(c.id), label: c.name }))}
          style={{ overflowX: 'auto' }}
        />
      ) : null}

      <Paper withBorder p="md" radius="md" mb="md" maw={900}>
        <Grid align="flex-end">
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label={t.sundaySchool.studentName}
              placeholder={t.sundaySchool.studentName}
              leftSection={<IconUser size={15} />}
              value={newName}
              onChange={(e) => setNewName(e.currentTarget.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <TextInput
              label={t.sundaySchool.studentPhone}
              placeholder="(11) 99999-9999"
              leftSection={<IconPhone size={15} />}
              value={newPhone}
              onChange={(e) => setNewPhone(maskPhone(e.currentTarget.value))}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 2 }}>
            <Button
              fullWidth
              variant="filled"
              color="blue"
              leftSection={<IconPlus size={16} />}
              loading={adding}
              onClick={addStudent}
              data-testid="add-student"
            >
              {t.sundaySchool.addStudent}
            </Button>
          </Grid.Col>
        </Grid>
      </Paper>

      <Box maw={900}>
        <Paper withBorder radius="md" p="sm" mb="sm">
          <Group justify="space-between" wrap="wrap" gap="sm">
            <TextInput
              placeholder={t.sundaySchool.searchStudent}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              maw={320}
            />
          </Group>
        </Paper>

        {loading ? (
          <Center h={220}>
            <Loader />
          </Center>
        ) : students.length === 0 ? (
          <Paper withBorder p="md" radius="md">
            <Center h={160}>
              <Text c="dimmed">{t.sundaySchool.noStudents}</Text>
            </Center>
          </Paper>
        ) : (
          <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
            <Table.ScrollContainer minWidth={560}>
              <Table highlightOnHover striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t.sundaySchool.studentName}</Table.Th>
                    <Table.Th>{t.sundaySchool.studentPhone}</Table.Th>
                    <Table.Th ta="right" />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {students.map((s) => (
                    <Table.Tr key={s.id}>
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <Text fw={600} size="sm">
                            {s.student_name}
                          </Text>
                          {s.member_name ? (
                            <Badge color="blue" variant="light" size="xs">
                              {s.member_name}
                            </Badge>
                          ) : null}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {s.phone || '—'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          {s.whatsapp_url ? (
                            <Tooltip label={t.sundaySchool.whatsappAbsence}>
                              <ActionIcon
                                component="a"
                                href={s.whatsapp_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="subtle"
                                color="teal"
                                size="md"
                              >
                                <IconBrandWhatsapp size={16} />
                              </ActionIcon>
                            </Tooltip>
                          ) : null}
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            size="md"
                            onClick={() => setEditing(s)}
                            data-testid={`edit-student-${s.id}`}
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="md"
                            onClick={async () => {
                              await accountsApi.deleteSundaySchoolStudent(
                                s.sunday_school_class,
                                s.id
                              );
                              notifications.show({
                                color: 'green',
                                message: t.sundaySchool.studentRemoved,
                              });
                              load();
                            }}
                            data-testid={`remove-student-${s.id}`}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>
        )}
      </Box>
      <EditStudentModal
        opened={!!editing}
        onClose={() => setEditing(null)}
        classId={Number(classId)}
        enrollment={editing}
        onSaved={load}
      />
    </Stack>
  );
}

interface EditStudentModalProps {
  opened: boolean;
  onClose: () => void;
  classId: number;
  enrollment: SundaySchoolEnrollment | null;
  onSaved: () => void;
}

function EditStudentModal({ opened, onClose, classId, enrollment, onSaved }: EditStudentModalProps) {
  const { t } = useLanguage();
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!enrollment) return;
    setStudentName(enrollment.student_name);
    setStudentPhone(enrollment.phone || '');
  }, [enrollment]);

  const save = async () => {
    if (!studentName.trim()) return;
    setSaving(true);
    try {
      await accountsApi.updateSundaySchoolStudent(classId, enrollment!.id, {
        student_name: toUpperCamelWords(studentName),
        phone: studentPhone.trim() || undefined,
      });
      notifications.show({ color: 'green', message: t.sundaySchool.studentUpdated });
      onSaved();
      onClose();
    } catch {
      notifications.show({ color: 'red', message: t.sundaySchool.noReportData });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t.sundaySchool.editStudent} centered>
      <Stack gap="sm">
        <TextInput
          label={t.sundaySchool.studentName}
          value={studentName}
          onChange={(e) => setStudentName(e.currentTarget.value)}
          required
        />
        <TextInput
          label={t.sundaySchool.studentPhone}
          placeholder="(11) 99999-9999"
          value={studentPhone}
          onChange={(e) => setStudentPhone(maskPhone(e.currentTarget.value))}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            loading={saving}
            onClick={save}
            data-testid="save-edit-student"
          >
            {t.common.save}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function ReportTab() {
  const { t } = useLanguage();
  const now = new Date();
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [month, setMonth] = useState<string>(String(now.getMonth() + 1));
  const [classes, setClasses] = useState<SundaySchoolClass[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [report, setReport] = useState<SundaySchoolMonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y - 2, y - 1, y, y + 1].map((v) => String(v));
  }, [now]);

  useEffect(() => {
    accountsApi
      .sundaySchoolClasses()
      .then(setClasses)
      .catch(() => null);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    accountsApi
      .sundaySchoolMonthlyReport({
        year: Number(year),
        month: Number(month),
        ...(classId ? { class_id: Number(classId) } : {}),
      })
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [year, month, classId]);

  useEffect(() => {
    load();
  }, [load]);

  const exportPdf = async () => {
    setExporting(true);
    try {
      const blob = await accountsApi.printSundaySchoolReport({
        year: Number(year),
        month: Number(month),
        ...(classId ? { class_id: Number(classId) } : {}),
      });
      saveBlob(
        blob,
        `relatorio-ebd-${year}-${String(month).padStart(2, '0')}.pdf`,
      );
    } catch {
      notifications.show({ color: 'red', message: t.sundaySchool.noReportData });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Stack gap="md">
      <Paper withBorder p="sm" radius="md" mb="md">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group align="flex-end" wrap="wrap" gap="sm">
            <Select
              label={t.sundaySchool.selectYear}
              data={years.map((y) => ({ value: y, label: y }))}
              value={year}
              onChange={(v) => setYear(v ?? String(now.getFullYear()))}
              w={110}
            />
            <Select
              label={t.sundaySchool.selectMonth}
              data={t.months.map((m, i) => ({ value: String(i + 1), label: m }))}
              value={month}
              onChange={(v) => setMonth(v ?? '1')}
              w={200}
            />
            <Select
              label={t.sundaySchool.selectClass}
              data={[
                { value: '__all__', label: t.sundaySchool.allClasses },
                ...classes.map((c) => ({ value: String(c.id), label: c.name })),
              ]}
              value={classId ?? '__all__'}
              onChange={(v) => setClassId(v && v !== '__all__' ? v : null)}
              allowDeselect={false}
              w={220}
            />
          </Group>
          <Button
            leftSection={<IconFileSpreadsheet size={16} />}
            variant="default"
            size="sm"
            loading={exporting}
            onClick={exportPdf}
            data-testid="export-report-pdf"
          >
            {t.sundaySchool.exportPdf}
          </Button>
        </Group>
      </Paper>

      {loading ? (
        <Center h={220}>
          <Loader />
        </Center>
      ) : !report || report.classes.length === 0 ? (
        <Paper withBorder p="md" radius="md">
          <Center h={160}>
            <Stack gap={4} align="center">
              <IconCalendarEvent size={28} />
              <Text c="dimmed">{t.sundaySchool.noReportData}</Text>
              <Text size="xs" c="dimmed">
                {t.sundaySchool.noReportDataHint}
              </Text>
            </Stack>
          </Center>
        </Paper>
      ) : (
        <Accordion variant="separated">
          {report.classes.map((c) => {
            const avgFreq =
              c.students.length > 0
                ? Math.round(
                    c.students.reduce((acc, s) => acc + s.presence_percent, 0) /
                      c.students.length
                  )
                : 0;
            return (
              <Accordion.Item key={c.class_id} value={String(c.class_id)}>
                <Accordion.Control>
                  <Group justify="space-between" wrap="wrap" gap="xs" pr="md">
                    <Text fw={600} size="md">
                      {c.class_name}
                    </Text>
                    <Group gap="xs" wrap="wrap">
                      <Badge size="sm" variant="light" color="blue">
                        {t.sundaySchool.avgFrequency}: {avgFreq}%
                      </Badge>
                      <Badge size="sm" variant="light" color="orange">
                        {t.sundaySchool.avgBibles}: {c.avg_bibles}
                      </Badge>
                      <Badge size="sm" variant="light" color="green">
                        {t.sundaySchool.offeringTotal}:{' '}
                        {formatBRL(Number(c.offering_total))}
                      </Badge>
                    </Group>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Group gap="xs" wrap="wrap" mb="sm">
                    <Badge size="sm" variant="light" color="grape">
                      {t.sundaySchool.retention}: {retentionCount(c)}/{c.students.length}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {t.sundaySchool.retentionHint}
                    </Text>
                  </Group>

                  <Box visibleFrom="sm">
                    <Table.ScrollContainer minWidth={700}>
                      <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="sm">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>{t.sundaySchool.studentName}</Table.Th>
                            {c.columns.map((col, idx) => (
                              <Table.Th key={col.date} ta="center">
                                <Stack gap={2} align="center">
                                  <Text size="xs" fw={600}>
                                    D{idx + 1}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    {formatKey(col.date)}
                                  </Text>
                                </Stack>
                              </Table.Th>
                            ))}
                            <Table.Th ta="center">{t.sundaySchool.presencePercent}</Table.Th>
                            <Table.Th ta="center">{t.sundaySchool.consecutiveAbsences}</Table.Th>
                            <Table.Th ta="center">{t.sundaySchool.riskEvasion}</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {c.students.map((s) => (
                            <Table.Tr key={s.enrollment_id}>
                              <Table.Td>
                                <Text size="sm" fw={500}>
                                  {s.student_name}
                                </Text>
                              </Table.Td>
                              {s.attendance.map((value, idx) => (
                                <Table.Td key={idx} ta="center">
                                  {value === null ? (
                                    <Text size="xs" c="dimmed">
                                      —
                                    </Text>
                                  ) : value ? (
                                    <Badge
                                      color="teal"
                                      variant="light"
                                      size="xs"
                                      radius="xl"
                                      title={t.sundaySchool.present}
                                    >
                                      P
                                    </Badge>
                                  ) : (
                                    <Badge
                                      color="red"
                                      variant="light"
                                      size="xs"
                                      radius="xl"
                                      title={t.sundaySchool.absent}
                                    >
                                      F
                                    </Badge>
                                  )}
                                </Table.Td>
                              ))}
                              <Table.Td ta="center">
                                <Group gap={6} justify="center" wrap="nowrap">
                                  <Progress
                                    size="sm"
                                    radius="xl"
                                    value={s.presence_percent}
                                    color={
                                      s.presence_percent >= 75
                                        ? 'teal'
                                        : s.presence_percent >= 50
                                          ? 'yellow'
                                          : 'red'
                                    }
                                    w={90}
                                  />
                                  <Text size="sm" fw={600}>
                                    {s.presence_percent}%
                                  </Text>
                                </Group>
                              </Table.Td>
                              <Table.Td ta="center">
                                <Text size="sm">{s.consecutive_absences}</Text>
                              </Table.Td>
                              <Table.Td ta="center">
                                {s.risk_evasion ? (
                                  <Group gap={4} justify="center" wrap="nowrap">
                                    <Badge color="red" variant="filled" size="sm">
                                      {t.sundaySchool.riskEvasion}
                                    </Badge>
                                    {s.whatsapp_url ? (
                                      <Tooltip label={t.sundaySchool.absentWhatsAppTooltip}>
                                        <ActionIcon
                                          component="a"
                                          href={s.whatsapp_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          variant="light"
                                          color="green"
                                          size="sm"
                                        >
                                          <IconBrandWhatsapp size={14} />
                                        </ActionIcon>
                                      </Tooltip>
                                    ) : null}
                                  </Group>
                                ) : (
                                  <Text size="xs" c="dimmed">
                                    —
                                  </Text>
                                )}
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Table.ScrollContainer>
                  </Box>

                  <Stack hiddenFrom="sm" gap="xs">
                    {c.students.map((s) => (
                      <Paper key={s.enrollment_id} withBorder p="xs" radius="md">
                        <Group justify="space-between" wrap="wrap" gap="xs">
                          <Text fw={600} size="sm" truncate style={{ flex: 1, minWidth: 140 }}>
                            {s.student_name}
                          </Text>
                          <Group gap={4}>
                            <Progress
                              size="sm"
                              radius="xl"
                              value={s.presence_percent}
                              color={
                                s.presence_percent >= 75
                                  ? 'teal'
                                  : s.presence_percent >= 50
                                    ? 'yellow'
                                    : 'red'
                              }
                              w={60}
                            />
                            <Text size="sm" fw={600}>
                              {s.presence_percent}%
                            </Text>
                            {s.risk_evasion ? (
                              <>
                                <Badge color="red" variant="filled" size="sm">
                                  {t.sundaySchool.riskEvasion}
                                </Badge>
                                {s.whatsapp_url ? (
                                  <ActionIcon
                                    component="a"
                                    href={s.whatsapp_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    variant="light"
                                    color="green"
                                    size="sm"
                                  >
                                    <IconBrandWhatsapp size={14} />
                                  </ActionIcon>
                                ) : null}
                              </>
                            ) : null}
                          </Group>
                        </Group>
                        <Group gap={4} mt={4} wrap="wrap">
                          {s.attendance.map((value, idx) => (
                            <Badge
                              key={idx}
                              color={value === null ? 'gray' : value ? 'teal' : 'red'}
                              variant="light"
                              size="xs"
                              radius="xl"
                            >
                              {value === null ? '—' : value ? 'P' : 'F'}
                            </Badge>
                          ))}
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>
      )}
    </Stack>
  );
}

function retentionCount(c: SundaySchoolClassReport): number {
  return c.students.filter(
    (s) =>
      s.total_sessions > 0 && s.present_count >= s.total_sessions,
  ).length;
}