import React, { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { eventCheckinApi } from '../api/checkin';
import CheckinMemberPicker from './CheckinMemberPicker';
import { useLanguage } from '../i18n';
import { useFeedback } from '../hooks/useFeedback';
import type { EventCheckinTeamMember } from '../types';

interface CheckinTeamPanelProps {
  configId: number;
  members: EventCheckinTeamMember[];
  onChanged: () => void;
}

export default function CheckinTeamPanel({ configId, members, onChanged }: CheckinTeamPanelProps) {
  const { t } = useLanguage();
  const fb = useFeedback();
  const [memberId, setMemberId] = useState<number | null>(null);
  const [role, setRole] = useState<'LEAD' | 'OPERATOR'>('OPERATOR');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!memberId) return;
    setSaving(true);
    try {
      await eventCheckinApi.addTeamMember({ config: configId, member: memberId, role });
      fb.success(t.common.toast.created);
      setMemberId(null);
      onChanged();
    } catch (err) {
      fb.fromError(err, t.common.toast.operationFailed);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (member: EventCheckinTeamMember) => {
    if (!window.confirm(t.eventCheckin.team.removeConfirm)) return;
    try {
      await eventCheckinApi.removeTeamMember(member.id);
      fb.success(t.common.toast.deleted);
      onChanged();
    } catch (err) {
      fb.fromError(err, t.common.toast.deleteFailed);
    }
  };

  return (
    <Stack gap="md" data-testid="checkin-team-panel">
      <Paper withBorder p="md" radius="md">
        <Stack gap="md">
          <Text fw={700}>{t.eventCheckin.team.addTitle}</Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <CheckinMemberPicker
              label={t.eventCheckin.team.member}
              value={memberId}
              onChange={setMemberId}
              testId="checkin-team-member"
            />
            <Select
              data-testid="checkin-team-role"
              label={t.eventCheckin.team.role}
              data={[
                { value: 'LEAD', label: t.eventCheckin.team.lead },
                { value: 'OPERATOR', label: t.eventCheckin.team.operator },
              ]}
              value={role}
              onChange={(value) => setRole((value as 'LEAD' | 'OPERATOR') ?? 'OPERATOR')}
              allowDeselect={false}
            />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button
              data-testid="checkin-team-add"
              loading={saving}
              disabled={!memberId}
              onClick={add}
            >
              {t.eventCheckin.team.add}
            </Button>
          </Group>
        </Stack>
      </Paper>

      {members.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">{t.eventCheckin.team.empty}</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
          {members.map((member) => (
            <Paper key={member.id} withBorder p="sm" radius="md" data-testid={`checkin-team-${member.id}`}>
              <Group justify="space-between" wrap="nowrap">
                <Stack gap={2} style={{ minWidth: 0 }}>
                  <Text size="sm" fw={600} truncate>{member.member_name}</Text>
                  <Group gap={6}>
                    <Badge size="xs" variant="light" color={member.role === 'LEAD' ? 'blue' : 'gray'}>
                      {member.role_display || (member.role === 'LEAD' ? t.eventCheckin.team.lead : t.eventCheckin.team.operator)}
                    </Badge>
                    {member.card_number ? (
                      <Text size="xs" c="dimmed" truncate>{member.card_number}</Text>
                    ) : null}
                  </Group>
                </Stack>
                <Tooltip label={t.eventCheckin.team.remove}>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    aria-label={t.eventCheckin.team.remove}
                    onClick={() => remove(member)}
                  >
                    <IconTrash size={15} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}
