import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  ColorInput,
  Grid,
  Group,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Textarea,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconInfoCircle, IconDeviceFloppy } from '@tabler/icons-react';
import MemberCard from './MemberCard';
import { useLanguage } from '../i18n';
import { useChurchCardConfig } from '../hooks/useChurchCardConfig';
import { accountsApi } from '../api/accounts';
import { toSentenceCase } from '../utils/format';
import type { CardConfig, CardTheme } from '../types';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

function toISO(date: Date | null): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface CardConfigTabProps {
  churchName: string;
  data: ReturnType<typeof useChurchCardConfig>;
}

export default function CardConfigTab({ churchName, data }: CardConfigTabProps) {
  const { t, locale } = useLanguage();
  const { config, contact, profile, refresh } = data;
  const [saving, setSaving] = useState(false);

  const form = useForm({
    initialValues: {
      card_primary_color: config.card_primary_color,
      card_secondary_color: config.card_secondary_color,
      card_valid_until: toDate(config.card_valid_until),
      card_front_phrase: config.card_front_phrase,
      card_back_phrase: config.card_back_phrase,
      card_theme: config.card_theme ?? 'CLASSIC' as CardTheme,
    },
    validate: {
      card_primary_color: (v) => (HEX_RE.test(v) ? null : t.cardConfig.invalidColor),
      card_secondary_color: (v) => (HEX_RE.test(v) ? null : t.cardConfig.invalidColor),
    },
  });

  useEffect(() => {
    form.setValues({
      card_primary_color: config.card_primary_color,
      card_secondary_color: config.card_secondary_color,
      card_valid_until: toDate(config.card_valid_until),
      card_front_phrase: config.card_front_phrase,
      card_back_phrase: config.card_back_phrase,
      card_theme: config.card_theme ?? 'CLASSIC' as CardTheme,
    });
    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const previewConfig: CardConfig = {
    card_primary_color: form.values.card_primary_color,
    card_secondary_color: form.values.card_secondary_color,
    card_valid_until: toISO(form.values.card_valid_until),
    card_front_phrase: form.values.card_front_phrase,
    card_back_phrase: form.values.card_back_phrase,
    card_theme: form.values.card_theme,
  };

  const handleSave = async () => {
    const res = form.validate();
    if (res.hasErrors) return;
    setSaving(true);
    try {
      const payload = {
        ...(profile ?? {}),
        card_primary_color: form.values.card_primary_color.trim().toUpperCase(),
        card_secondary_color: form.values.card_secondary_color.trim().toUpperCase(),
        card_valid_until: toISO(form.values.card_valid_until),
        card_front_phrase: toSentenceCase(form.values.card_front_phrase),
        card_back_phrase: toSentenceCase(form.values.card_back_phrase),
        card_theme: form.values.card_theme,
      };
      await accountsApi.updateProfile(payload);
      notifications.show({ color: 'green', message: t.cardConfig.saved });
      refresh();
    } catch (err: any) {
      notifications.show({
        color: 'red',
        message: err?.response?.data?.detail || t.cardConfig.saveError,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Grid gap="lg" align="flex-start">
      <Grid.Col span={{ base: 12, lg: 6 }}>
        <Card withBorder shadow="sm" p="md">
          <Stack gap="sm">
            <Text fw={600}>{t.cardConfig.appearance}</Text>
            <SegmentedControl
              data-testid="member-card-theme"
              fullWidth
              value={form.values.card_theme}
              onChange={(v) => form.setFieldValue('card_theme', v as CardTheme)}
              data={[
                { label: t.cardConfig.themeClassic, value: 'CLASSIC' },
                { label: t.cardConfig.themeBlackPremium, value: 'BLACK_PREMIUM' },
              ]}
            />
            <Group grow align="flex-start">
              <ColorInput
                label={t.cardConfig.primaryColor}
                data-testid="cardconfig-primary"
                {...form.getInputProps('card_primary_color')}
              />
              <ColorInput
                label={t.cardConfig.secondaryColor}
                data-testid="cardconfig-secondary"
                {...form.getInputProps('card_secondary_color')}
              />
            </Group>

            <Text fw={600} mt="sm">{t.cardConfig.validityTitle}</Text>
            <DateInput
              label={t.cardConfig.validity}
              description={t.cardConfig.validityHint}
              data-testid="cardconfig-validity"
              locale={locale}
              valueFormat="DD/MM/YYYY"
              clearable
              value={form.values.card_valid_until}
              onChange={(v) => form.setFieldValue('card_valid_until', toDate(v))}
            />

            <Text fw={600} mt="sm">{t.cardConfig.phrases}</Text>
            <TextInput
              label={t.cardConfig.frontPhrase}
              description={t.cardConfig.frontPhraseHint}
              data-testid="cardconfig-front-phrase"
              {...form.getInputProps('card_front_phrase')}
            />
            <Textarea
              label={t.cardConfig.backPhrase}
              description={t.cardConfig.backPhraseHint}
              minRows={3}
              data-testid="cardconfig-back-phrase"
              {...form.getInputProps('card_back_phrase')}
            />

            <Alert
              icon={<IconInfoCircle size={16} />}
              color="teal"
              variant="light"
              mt="xs"
            >
              {t.cardConfig.flipHint}
            </Alert>

            <Group justify="flex-end" mt="sm">
              <Button
                leftSection={<IconDeviceFloppy size={16} />}
                loading={saving}
                onClick={handleSave}
                data-testid="cardconfig-save"
              >
                {t.common.save}
              </Button>
            </Group>
          </Stack>
        </Card>
      </Grid.Col>

      <Grid.Col span={{ base: 12, lg: 6 }}>
        <Card withBorder shadow="sm" p="md" style={{ position: 'sticky', top: 12 }}>
          <Text fw={600} mb="sm">{t.cardConfig.preview}</Text>
          <MemberCard
            member={{
              id: 0,
              church: 0,
              name: '',
              phone: '',
              email: '',
              birth_date: null,
              baptism_date: null,
              cpf: '',
              rg: '',
              born_in_city: '',
              born_in_state: '',
              profession: '',
              education_level: '',
              education_level_display: '',
              marital_status: '',
              marital_status_display: '',
              marriage_date: null,
              father_name: '',
              mother_name: '',
              card_number: '0001',
              church_entry: '',
              church_entry_display: '',
              church_entry_other: '',
              ministry_areas: [],
              ministry_areas_display: [],
              photo: null,
              status: 'ACTIVE',
              status_display: '',
              notes: '',
              street: '',
              number: '',
              complement: '',
              neighborhood: '',
              city: '',
              state: '',
              cep: '',
              relatives: [],
              created_at: '',
              updated_at: '',
            }}
            churchName={churchName}
            config={previewConfig}
            churchContact={contact}
          />
        </Card>
      </Grid.Col>
    </Grid>
  );
}