import React from 'react';
import { Avatar, Badge, Group, Paper, Stack, Text } from '@mantine/core';
import type { EventCheckinPerson } from '../types';
import { useLanguage } from '../i18n';
import { formatCheckinDateTime } from '../utils/eventCheckin';

interface CheckinPersonCardProps {
  person: EventCheckinPerson;
  inRoster: boolean;
  checkedAt?: string | null;
}

export default function CheckinPersonCard({ person, inRoster, checkedAt }: CheckinPersonCardProps) {
  const { t, locale } = useLanguage();

  return (
    <Paper withBorder radius="md" p="md" data-testid="checkin-person-card">
      <Group wrap="nowrap" gap="md">
        <Avatar src={person.photo || undefined} radius="xl" size="lg" color="blue">
          {person.name.charAt(0).toUpperCase()}
        </Avatar>
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700} size="lg" truncate>{person.name}</Text>
          <Text size="sm" c="dimmed">
            {person.card_number ? `${t.publicCard.cardNumber}: ${person.card_number}` : person.church_name}
          </Text>
          <Group gap="xs">
            <Badge color={inRoster ? 'green' : 'orange'} variant="light" size="sm">
              {inRoster ? t.eventCheckin.checkins.inRoster : t.eventCheckin.public.outsideRoster}
            </Badge>
            {person.kind ? (
              <Badge variant="default" size="sm">
                {person.kind === 'MEMBER'
                  ? t.events.registrationPanel.member
                  : t.events.registrationPanel.external}
              </Badge>
            ) : null}
            {person.kind === 'EXTERNAL' && person.code ? (
              <Text size="xs" c="dimmed">
                {t.events.registrationPanel.code}: {person.code}
              </Text>
            ) : null}
            {checkedAt ? (
              <Text size="xs" c="dimmed">
                {t.eventCheckin.checkins.checkedAt}: {formatCheckinDateTime(checkedAt, locale)}
              </Text>
            ) : null}
          </Group>
        </Stack>
      </Group>
    </Paper>
  );
}
