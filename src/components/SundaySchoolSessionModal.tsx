import React, { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Grid,
  Group,
  Loader,
  Modal,
  NumberInput,
  ScrollArea,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBrandWhatsapp, IconDeviceFloppy } from '@tabler/icons-react';
import { accountsApi } from '../api/accounts';
import { useLanguage } from '../i18n';
import type { SundaySchoolAttendance, SundaySchoolSession } from '../types';
import { toSentenceCase, toUpperCamelWords } from '../utils/format';

interface SundaySchoolSessionModalProps {
  opened: boolean;
  onClose: () => void;
  classId: number;
  className: string;
  date: string;
  onSaved: () => void;
}

function formatDate(value: string): string {
  if (!value) return value;
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export default function SundaySchoolSessionModal({
  opened,
  onClose,
  classId,
  className,
  date,
  onSaved,
}: SundaySchoolSessionModalProps) {
  const { t } = useLanguage();
  const [session, setSession] = useState<SundaySchoolSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [topic, setTopic] = useState('');
  const [bibles, setBibles] = useState<number>(0);
  const [magazines, setMagazines] = useState<number>(0);
  const [visitors, setVisitors] = useState<number>(0);
  const [offering, setOffering] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [attendance, setAttendance] = useState<SundaySchoolAttendance[]>([]);

  useEffect(() => {
    if (!opened) return;
    setLoading(true);
    setSession(null);
    setTopic('');
    setBibles(0);
    setMagazines(0);
    setVisitors(0);
    setOffering('');
    setNotes('');
    setAttendance([]);
    accountsApi
      .sundaySchoolSession(classId, date)
      .then((data) => {
        setSession(data);
        setTopic(data.topic);
        setBibles(data.bibles_count);
        setMagazines(data.magazines_count);
        setVisitors(data.visitors_count);
        setOffering(data.offering_amount === '0.00' ? '' : String(data.offering_amount));
        setNotes(data.notes);
        setAttendance(data.attendances);
      })
      .catch(() => {
        notifications.show({ color: 'red', message: t.sundaySchool.noReportData });
      })
      .finally(() => setLoading(false));
  }, [opened, classId, date, t.sundaySchool.noReportData]);

  const presentCount = useMemo(
    () => attendance.filter((a) => a.is_present).length,
    [attendance],
  );

  const toggle = (id: number, field: 'is_present' | 'brought_bible' | 'brought_magazine') => {
    setAttendance((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: !a[field] } : a)),
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      await accountsApi.saveSundaySchoolSession({
        sunday_school_class: classId,
        date,
        topic: toUpperCamelWords(topic),
        bibles_count: bibles,
        magazines_count: magazines,
        visitors_count: visitors,
        offering_amount: offering || '0.00',
        notes: toSentenceCase(notes),
        attendance: attendance.map((a) => ({
          enrollment_id: a.enrollment,
          is_present: a.is_present,
          brought_bible: a.brought_bible,
          brought_magazine: a.brought_magazine,
        })),
      });
      notifications.show({ color: 'green', message: t.sundaySchool.attendanceSaved });
      onSaved();
      onClose();
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
      size="xl"
      centered
      title={
        <Stack gap={2}>
          <Text fw={700}>{t.sundaySchool.tabClasses}</Text>
          <Text size="xs" c="dimmed">
            {className} • {formatDate(date)}
          </Text>
        </Stack>
      }
    >
      {loading ? (
        <Loader mt="xl" />
      ) : (
        <Stack gap="md">
          {session && (
            <Group gap="xs" wrap="wrap">
              <Badge color="blue" variant="light">
                {presentCount}/{attendance.length} • {t.sundaySchool.present}
              </Badge>
              {attendance.length === 0 ? (
                <Badge color="gray" variant="light">
                  {t.sundaySchool.noStudents}
                </Badge>
              ) : null}
            </Group>
          )}

          <TextInput
            label={t.sundaySchool.topicLabel}
            placeholder={t.sundaySchool.topicPlaceholder}
            value={topic}
            onChange={(e) => setTopic(e.currentTarget.value)}
          />

          <Grid>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <NumberInput
                label={t.sundaySchool.bibles}
                min={0}
                value={bibles}
                onChange={(v) => setBibles(Number(v) || 0)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <NumberInput
                label={t.sundaySchool.magazines}
                min={0}
                value={magazines}
                onChange={(v) => setMagazines(Number(v) || 0)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <NumberInput
                label={t.sundaySchool.visitors}
                min={0}
                value={visitors}
                onChange={(v) => setVisitors(Number(v) || 0)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <NumberInput
                label={t.sundaySchool.offering}
                min={0}
                decimalScale={2}
                prefix="R$ "
                value={offering}
                onChange={(v) => setOffering(v === '' ? '' : String(v))}
              />
            </Grid.Col>
          </Grid>

          {attendance.length > 0 ? (
            <ScrollArea.Autosize mah={360} type="auto">
              <Stack gap="xs">
                {attendance.map((a) => (
                  <Card key={a.id} withBorder radius="md" p="xs">
                    <Group justify="space-between" wrap="wrap" gap="sm">
                      <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 160 }}>
                        <Switch
                          checked={a.is_present}
                          onChange={() => toggle(a.id, 'is_present')}
                          size="lg"
                          onLabel="P"
                          offLabel="F"
                          color="teal"
                        />
                        <Text fw={600} size="sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {a.student_name}
                        </Text>
                      </Group>
                      <Group gap="xs" wrap="wrap">
                        {a.whatsapp_url ? (
                          <Tooltip
                            label={t.sundaySchool.absentWhatsAppTooltip}
                            disabled={a.is_present}
                          >
                            <ActionIcon
                              component="a"
                              href={a.whatsapp_url}
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
                        {a.is_present ? (
                          <>
                            <Switch
                              label={t.sundaySchool.broughtBible}
                              checked={a.brought_bible}
                              onChange={() => toggle(a.id, 'brought_bible')}
                              size="xs"
                            />
                            <Switch
                              label={t.sundaySchool.broughtMagazine}
                              checked={a.brought_magazine}
                              onChange={() => toggle(a.id, 'brought_magazine')}
                              size="xs"
                            />
                          </>
                        ) : (
                          <Badge color="gray" variant="light" size="sm">
                            {t.sundaySchool.absent}
                          </Badge>
                        )}
                      </Group>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </ScrollArea.Autosize>
          ) : (
            <Text size="sm" c="dimmed">
              {t.sundaySchool.noStudents}
            </Text>
          )}

          <Textarea
            label={t.sundaySchool.notes}
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            minRows={2}
            maxRows={4}
          />

          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            loading={saving}
            onClick={save}
            fullWidth
          >
            {t.sundaySchool.saveAttendance}
          </Button>
        </Stack>
      )}
    </Modal>
  );
}