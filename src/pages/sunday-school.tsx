import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Modal,
  ScrollArea,
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
  IconDeviceFloppy,
  IconFileTypePdf,
  IconMapPin,
  IconPencil,
  IconPlus,
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
    <AuthGuard roles={['PASTOR', 'SECRETARIA']}>
      <Layout>
        <PageHeader title={t.sundaySchool.title} description={t.sundaySchool.subtitle}>
          <Tabs value={tab} onChange={setTab} variant="pills">
            <Tabs.List>
              <Tabs.Tab value="classes">{t.sundaySchool.tabClasses}</Tabs.Tab>
              <Tabs.Tab value="report">{t.sundaySchool.tabReport}</Tabs.Tab>
              <Tabs.Tab value="students">{t.sundaySchool.tabStudents}</Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </PageHeader>
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
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {t.sundaySchool.noClassesHint}
        </Text>
        <Button
          leftSection={<IconPlus size={16} />}
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
        <Card withBorder>
          <Center h={160}>
            <Text c="dimmed">{t.sundaySchool.noClasses}</Text>
          </Center>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          {classes.map((c) => (
            <Card key={c.id} withBorder padding="md">
              <Stack gap="xs">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={700} truncate>
                      {c.name}
                    </Text>
                    <Group gap={6} wrap="wrap">
                      <Badge color="grape" variant="light" size="sm">
                        {c.category_display}
                      </Badge>
                      <Badge
                        color={c.is_active ? 'green' : 'gray'}
                        variant="light"
                        size="sm"
                      >
                        {c.is_active ? t.sundaySchool.active : t.sundaySchool.inactive}
                      </Badge>
                    </Group>
                  </Stack>
                  <Group gap={4} wrap="nowrap">
                    <Tooltip label={t.sundaySchool.editClass}>
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => {
                          setEditing(c);
                          setFormOpen(true);
                        }}
                      >
                        <IconPencil size={17} />
                      </ActionIcon>
                    </Tooltip>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => setDeleting(c)}
                    >
                      <IconTrash size={17} />
                    </ActionIcon>
                  </Group>
                </Group>

                <Text size="sm" c="dimmed">
                  {t.sundaySchool.teacherName}: {c.teacher_name || '—'}
                </Text>
                {c.co_teacher_name ? (
                  <Text size="sm" c="dimmed">
                    {t.sundaySchool.coTeacherName}: {c.co_teacher_name}
                  </Text>
                ) : null}
                {c.room_location ? (
                  <Group gap={4} align="center">
                    <IconMapPin size={14} />
                    <Text size="sm" c="dimmed">
                      {c.room_location}
                    </Text>
                  </Group>
                ) : null}
                <Group gap={6} align="center">
                  <IconUsers size={14} />
                  <Text size="sm" c="dimmed">
                    {c.enrollment_count}
                  </Text>
                </Group>

                <Group gap="sm" wrap="wrap">
                  <Button
                    leftSection={<IconCalendarEvent size={16} />}
                    variant="light"
                    disabled={!c.is_active}
                    onClick={() => {
                      setCallRollFor(c);
                      setCallRollDate(nextSundayKey());
                    }}
                    data-testid={`call-roll-${c.id}`}
                  >
                    {t.sundaySchool.registerCall}
                  </Button>
                  <Button
                    leftSection={<IconBrandWhatsapp size={16} />}
                    variant="light"
                    color="green"
                    disabled={!c.is_active}
                    onClick={() => setAnnounceFor(c)}
                    data-testid={`announce-${c.id}`}
                  >
                    {t.sundaySchool.announceClass}
                  </Button>
                </Group>
              </Stack>
            </Card>
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
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
        <Select
          label={t.sundaySchool.selectClass}
          placeholder={t.sundaySchool.selectClass}
          data={classes.map((c) => ({ value: String(c.id), label: c.name }))}
          value={classId}
          onChange={setClassId}
          w={260}
        />
        <TextInput
          placeholder={t.sundaySchool.searchStudent}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          w={260}
        />
      </Group>

      <Card withBorder padding="md">
        <Stack gap="xs">
          <Text fw={600} size="sm">
            {t.sundaySchool.addStudent}
          </Text>
          <Group align="flex-end" wrap="wrap" gap="sm">
            <TextInput
              label={t.sundaySchool.studentName}
              placeholder={t.sundaySchool.studentName}
              value={newName}
              onChange={(e) => setNewName(e.currentTarget.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <TextInput
              label={t.sundaySchool.studentPhone}
              placeholder="(11) 99999-9999"
              value={newPhone}
              onChange={(e) => setNewPhone(maskPhone(e.currentTarget.value))}
              style={{ flex: 1, minWidth: 200 }}
            />
            <Button
              leftSection={<IconPlus size={16} />}
              loading={adding}
              onClick={addStudent}
              data-testid="add-student"
            >
              {t.sundaySchool.addStudent}
            </Button>
          </Group>
        </Stack>
      </Card>

      {loading ? (
        <Center h={220}>
          <Loader />
        </Center>
      ) : students.length === 0 ? (
        <Card withBorder>
          <Center h={160}>
            <Text c="dimmed">{t.sundaySchool.noStudents}</Text>
          </Center>
        </Card>
      ) : (
        <Stack gap="xs">
          {students.map((s) => (
            <Card key={s.id} withBorder padding="xs">
              <Group justify="space-between" wrap="wrap" gap="sm">
                <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 160 }}>
                  <Text fw={600} size="sm" truncate>
                    {s.student_name}
                  </Text>
                  {s.member_name ? (
                    <Badge color="blue" variant="light" size="xs">
                      {s.member_name}
                    </Badge>
                  ) : null}
                </Group>
                <Group gap="xs" wrap="wrap">
                  <Text size="xs" c="dimmed">
                    {s.phone || '—'}
                  </Text>
                  {s.whatsapp_url ? (
                    <Tooltip label={t.sundaySchool.whatsappAbsence}>
                      <ActionIcon
                        component="a"
                        href={s.whatsapp_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="light"
                        color="green"
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
                      await accountsApi.deleteSundaySchoolStudent(s.sunday_school_class, s.id);
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
              </Group>
            </Card>
          ))}
        </Stack>
      )}
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
            { value: '', label: t.sundaySchool.allClasses },
            ...classes.map((c) => ({ value: String(c.id), label: c.name })),
          ]}
          value={classId ?? ''}
          onChange={(v) => setClassId(v || null)}
          allowDeselect
          clearable
          w={240}
        />
        <Button
          leftSection={<IconFileTypePdf size={16} />}
          loading={exporting}
          onClick={exportPdf}
          data-testid="export-report-pdf"
        >
          {t.sundaySchool.exportPdf}
        </Button>
      </Group>

      {loading ? (
        <Center h={220}>
          <Loader />
        </Center>
      ) : !report || report.classes.length === 0 ? (
        <Card withBorder>
          <Center h={160}>
            <Stack gap={4} align="center">
              <IconCalendarEvent size={28} />
              <Text c="dimmed">{t.sundaySchool.noReportData}</Text>
              <Text size="xs" c="dimmed">
                {t.sundaySchool.noReportDataHint}
              </Text>
            </Stack>
          </Center>
        </Card>
      ) : (
        <Stack gap="md">
          {report.classes.map((c) => (
            <Card key={c.class_id} withBorder padding="md">
              <Stack gap="sm">
                <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
                  <Stack gap={2}>
                    <Text fw={700}>{c.class_name}</Text>
                    <Group gap={6} wrap="wrap">
                      <Badge color="grape" variant="light" size="sm">
                        {c.category_display}
                      </Badge>
                      {c.teacher_name ? (
                        <Group gap={4} align="center">
                          <IconUser size={14} />
                          <Text size="xs" c="dimmed">
                            {c.teacher_name}
                          </Text>
                        </Group>
                      ) : null}
                      {c.room_location ? (
                        <Group gap={4} align="center">
                          <IconMapPin size={14} />
                          <Text size="xs" c="dimmed">
                            {c.room_location}
                          </Text>
                        </Group>
                      ) : null}
                    </Group>
                  </Stack>
                  <Stack gap={2} align="flex-end">
                    <Text fw={600}>{formatBRL(Number(c.offering_total))}</Text>
                    <Text size="xs" c="dimmed">
                      {t.sundaySchool.offeringTotal}
                    </Text>
                  </Stack>
                </Group>

                <SimpleGrid cols={{ base: 2, md: 5 }} spacing="xs">
                  <StatsChip
                    label={t.sundaySchool.sessionsCount}
                    value={String(c.session_count)}
                  />
                  <StatsChip label={t.sundaySchool.avgBibles} value={String(c.avg_bibles)} />
                  <StatsChip
                    label={t.sundaySchool.avgMagazines}
                    value={String(c.avg_magazines)}
                  />
                  <StatsChip
                    label={t.sundaySchool.visitorsTotal}
                    value={String(c.visitors_total)}
                  />
                  <StatsChip
                    label={t.sundaySchool.retention}
                    value={`${retentionCount(c)}/${c.students.length}`}
                    hint={t.sundaySchool.retentionHint}
                  />
                </SimpleGrid>

                <Box visibleFrom="sm">
                  <Table.ScrollContainer minWidth={520}>
                    <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="sm">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>{t.sundaySchool.studentName}</Table.Th>
                          {c.columns.map((col) => (
                            <Table.Th key={col.date} ta="center">
                              <Stack gap={2} align="center">
                                <Text size="xs" fw={600}>
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
                                  <Badge color="teal" variant="light" size="xs" radius="xl">
                                    {t.sundaySchool.present}
                                  </Badge>
                                ) : (
                                  <Badge color="red" variant="light" size="xs" radius="xl">
                                    {t.sundaySchool.absent}
                                  </Badge>
                                )}
                              </Table.Td>
                            ))}
                            <Table.Td ta="center">
                              <Badge
                                color={s.presence_percent >= 75 ? 'teal' : s.presence_percent >= 50 ? 'yellow' : 'red'}
                                variant="light"
                                size="sm"
                              >
                                {s.presence_percent}%
                              </Badge>
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
                    <Card key={s.enrollment_id} withBorder padding="xs">
                      <Group justify="space-between" wrap="wrap" gap="xs">
                        <Text fw={600} size="sm" truncate style={{ flex: 1, minWidth: 140 }}>
                          {s.student_name}
                        </Text>
                        <Group gap={4}>
                          <Badge
                            color={s.presence_percent >= 75 ? 'teal' : s.presence_percent >= 50 ? 'yellow' : 'red'}
                            variant="light"
                            size="sm"
                          >
                            {s.presence_percent}%
                          </Badge>
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
                          >
                            {value === null ? '—' : value ? t.sundaySchool.present : t.sundaySchool.absent}
                          </Badge>
                        ))}
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function StatsChip({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card withBorder padding="xs">
      <Stack gap={0}>
        <Text size="xs" c="dimmed">
          {label}
        </Text>
        <Text fw={700} size="lg">
          {value}
        </Text>
        {hint ? (
          <Text size="xs" c="dimmed">
            {hint}
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}

function retentionCount(c: SundaySchoolClassReport): number {
  return c.students.filter(
    (s) =>
      s.total_sessions > 0 && s.present_count >= s.total_sessions,
  ).length;
}