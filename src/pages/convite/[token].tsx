import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Avatar,
  Box,
  Button,
  Center,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconBuildingChurch,
  IconCheck,
  IconUserPlus,
} from '@tabler/icons-react';
import { publicInviteApi } from '../../api/accounts';
import { useLanguage } from '../../i18n';
import type { PublicInviteMeta, PublicInviteSignupResult } from '../../types';
import { hasFullName, maskPhone, toSentenceCase, toUpperCamelWords } from '../../utils/format';

type Phase = 'loading' | 'form' | 'done';

interface FormValues {
  name: string;
  phone: string;
  birthDate: string | null;
  notes: string;
}

const EMPTY: FormValues = { name: '', phone: '', birthDate: null, notes: '' };

function phoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export default function PublicInvitePage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';

  const [phase, setPhase] = useState<Phase>('loading');
  const [meta, setMeta] = useState<PublicInviteMeta | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicInviteSignupResult | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setPhase('loading');
    setNotFound(false);
    publicInviteApi
      .meta(token)
      .then((data) => {
        if (!active) return;
        setMeta(data);
        setPhase('form');
      })
      .catch(() => {
        if (active) setNotFound(true);
      })
      .finally(() => {
        if (active) setPhase((p) => (p === 'loading' ? 'form' : p));
      });
    return () => {
      active = false;
    };
  }, [token]);

  const validate = () => {
    const next: { name?: string; phone?: string } = {};
    if (!values.name.trim()) next.name = t.publicInvite.requiredName;
    else if (!hasFullName(values.name)) next.name = t.publicInvite.nameFull;
    const digits = phoneDigits(values.phone);
    if (digits.length < 10 || digits.length > 13) next.phone = t.publicInvite.invalidPhone;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    const fullName = toUpperCamelWords(values.name);
    const notes = toSentenceCase(values.notes);
    setValues((v) => ({ ...v, name: fullName, notes }));
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await publicInviteApi.signup(token, {
        name: fullName,
        phone: values.phone.trim(),
        birth_date: values.birthDate,
        notes,
      });
      setResult(res);
      setPhase('done');
    } catch (err: any) {
      const data = err?.response?.data;
      const message =
        data?.detail ||
        data?.token?.[0] ||
        data?.phone?.[0] ||
        data?.name?.[0] ||
        t.publicInvite.inactive;
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setValues(EMPTY);
    setErrors({});
    setServerError(null);
    setResult(null);
    setPhase('form');
  };

  const themeColor = '#1c7ed6';
  const title = meta ? `${t.publicInvite.title} — ${meta.church_name}` : t.publicInvite.title;
  const blocked = meta != null && meta.status !== 'ACTIVE';

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
      </Head>
      <Box
        style={{
          minHeight: '100vh',
          background: `linear-gradient(180deg, ${themeColor} 0%, #f8f9fa 38%)`,
        }}
        data-testid="public-invite-page"
      >
        <Center mih="100vh" px="md" py="xl">
          <Stack w="100%" maw={520} gap="md">
            <Stack align="center" gap={6}>
              <Avatar size={64} radius="xl" color={themeColor}>
                <IconBuildingChurch size={32} color="#fff" />
              </Avatar>
              <Title order={2} c="white" ta="center">
                {t.publicInvite.title}
              </Title>
              {meta && (
                <Text c="white" size="sm" ta="center">
                  {t.publicInvite.invitedBy
                    .replace('{name}', meta.inviter_name)
                    .replace('{church}', meta.church_name)}
                </Text>
              )}
            </Stack>

            {phase === 'loading' && (
              <Paper withBorder radius="md" p="md" shadow="xs">
                <Stack gap="sm">
                  <Skeleton height={14} width="45%" radius="sm" />
                  <Skeleton height={40} radius="sm" />
                  <Skeleton height={40} radius="sm" />
                  <Skeleton height={40} radius="sm" />
                </Stack>
              </Paper>
            )}

            {notFound && (
              <Paper withBorder radius="md" p="lg" shadow="xs">
                <Text ta="center" fw={600} c="red">
                  {t.publicInvite.notFound}
                </Text>
              </Paper>
            )}

            {!notFound && phase === 'form' && meta && (
              <Paper withBorder radius="md" p="md" shadow="xs" data-testid="public-invite-form">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                  }}
                >
                  <Stack gap="sm">
                    <Group gap="xs">
                      <IconUserPlus size={18} style={{ color: 'var(--mantine-color-dimmed)' }} />
                      <Text size="sm" fw={600}>
                        {t.publicInvite.formTitle}
                      </Text>
                    </Group>

                    <TextInput
                      data-testid="invite-name"
                      label={t.publicInvite.name}
                      placeholder={t.publicInvite.name}
                      value={values.name}
                      onChange={(e) => setValues({ ...values, name: e.currentTarget.value })}
                      error={errors.name}
                      required
                      disabled={blocked}
                    />
                    <TextInput
                      data-testid="invite-phone"
                      label={t.publicInvite.phone}
                      placeholder="(83) 99999-0000"
                      maxLength={15}
                      value={values.phone}
                      onChange={(e) =>
                        setValues({ ...values, phone: maskPhone(e.currentTarget.value) })
                      }
                      error={errors.phone}
                      required
                      disabled={blocked}
                    />
                    <DateInput
                      data-testid="invite-birthdate"
                      label={t.publicInvite.birthDate}
                      placeholder={t.publicInvite.birthDate}
                      locale={locale}
                      valueFormat="DD/MM/YYYY"
                      value={values.birthDate}
                      onChange={(v) => setValues({ ...values, birthDate: v })}
                      clearable
                      maxDate={new Date()}
                      disabled={blocked}
                    />
                    <Textarea
                      data-testid="invite-notes"
                      label={t.publicInvite.notes}
                      placeholder={t.publicInvite.notes}
                      rows={3}
                      value={values.notes}
                      onChange={(e) => setValues({ ...values, notes: e.currentTarget.value })}
                      disabled={blocked}
                    />

                    {blocked && (
                      <Text size="sm" c="red" ta="center">
                        {t.publicInvite.inactive}
                      </Text>
                    )}
                    {serverError && !blocked && (
                      <Text size="sm" c="red" ta="center">
                        {serverError}
                      </Text>
                    )}

                    {!blocked && (
                      <Button
                        type="submit"
                        fullWidth
                        leftSection={<IconCheck size={18} />}
                        loading={submitting}
                        data-testid="invite-submit"
                      >
                        {submitting ? t.publicInvite.submitting : t.publicInvite.submit}
                      </Button>
                    )}
                  </Stack>
                </form>
              </Paper>
            )}

            {phase === 'done' && result && (
              <Paper withBorder radius="md" p="lg" shadow="xs" data-testid="public-invite-success">
                <Stack align="center" gap="sm">
                  <Avatar size={56} radius="xl" color="teal">
                    <IconCheck size={30} color="#fff" />
                  </Avatar>
                  <Title order={3} ta="center">
                    {t.publicInvite.successTitle}
                  </Title>
                  <Text ta="center" size="sm" c="dimmed">
                    {t.publicInvite.successBody
                      .replace('{name}', values.name.trim() || result.inviter_name)
                      .replace('{inviter}', result.inviter_name)}
                  </Text>
                  <SimpleGrid cols={1} w="100%">
                    <Button variant="default" onClick={reset} data-testid="invite-another">
                      {t.publicInvite.registerAnother}
                    </Button>
                  </SimpleGrid>
                </Stack>
              </Paper>
            )}

            {meta && (
              <Text size="xs" ta="center" c="white">
                {meta.church_city || meta.church_state
                  ? [meta.church_city, meta.church_state].filter(Boolean).join(' — ')
                  : ''}
              </Text>
            )}
          </Stack>
        </Center>
      </Box>
    </>
  );
}
