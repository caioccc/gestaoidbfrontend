import React, { useEffect, useState } from 'react';
import {
  Button,
  Center,
  Container,
  Divider,
  Grid,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { IconBuildingChurch, IconCheck, IconSend } from '@tabler/icons-react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { publicFormApi } from '../../api/accounts';
import { useLanguage } from '../../i18n';
import type { PublicFormMeta } from '../../types';

type DateOrNull = Date | null;

interface FormValues {
  name: string;
  phone: string;
  email: string;
  birth_date: DateOrNull;
  cpf: string;
  rg: string;
  born_in_city: string;
  born_in_state: string;
  profession: string;
  education_level: string | null;
  marital_status: string | null;
  marriage_date: DateOrNull;
  father_name: string;
  mother_name: string;
  church_entry: string | null;
  church_entry_other: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  notes: string;
}

function isoDate(d: Date | null): string | null {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function PublicMemberFormPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const hash = typeof router.query.hash === 'string' ? router.query.hash : '';

  const [meta, setMeta] = useState<PublicFormMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormValues>({
    initialValues: {
      name: '',
      phone: '',
      email: '',
      birth_date: null,
      cpf: '',
      rg: '',
      born_in_city: '',
      born_in_state: '',
      profession: '',
      education_level: null,
      marital_status: null,
      marriage_date: null,
      father_name: '',
      mother_name: '',
      church_entry: null,
      church_entry_other: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      cep: '',
      notes: '',
    },
    validate: {
      name: (v) => (v.trim().length ? null : t.publicForm.nameRequired),
      church_entry_other: (v, values) =>
        values.church_entry === 'OUTRO' && !v.trim().length
          ? t.membersPage.churchEntryOtherRequired
          : null,
    },
  });

  useEffect(() => {
    if (!hash) return;
    let active = true;
    setLoading(true);
    setError(false);
    publicFormApi
      .get(hash)
      .then((data) => {
        if (!active) return;
        setMeta(data);
        if (data.type === 'member' && data.member_name) {
          form.setFieldValue('name', data.member_name);
        }
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  const educationOptions = [
    { value: 'SEM_ESCOLARIDADE', label: t.membersPage.noSchooling },
    { value: 'FUNDAMENTAL', label: t.membersPage.fundamental },
    { value: 'MEDIO_INCOMPLETO', label: t.membersPage.highSchoolIncomplete },
    { value: 'MEDIO', label: t.membersPage.highSchool },
    { value: 'SUPERIOR_INCOMPLETO', label: t.membersPage.collegeIncomplete },
    { value: 'SUPERIOR', label: t.membersPage.college },
    { value: 'POS_GRADUACAO', label: t.membersPage.graduate },
  ];

  const maritalOptions = [
    { value: 'SOLTEIRO', label: t.membersPage.single },
    { value: 'CASADO', label: t.membersPage.married },
    { value: 'UNIAO_ESTAVEL', label: t.membersPage.stableUnion },
    { value: 'SEPARADO', label: t.membersPage.separated },
    { value: 'DIVORCIADO', label: t.membersPage.divorced },
    { value: 'VIUVO', label: t.membersPage.widower },
  ];

  const churchEntryOptions = [
    { value: 'ACLAMACAO', label: t.membersPage.entryAclamacao },
    { value: 'BATISMO', label: t.membersPage.entryBatismo },
    { value: 'RECONCILIACAO', label: t.membersPage.entryReconciliacao },
    { value: 'TRANSFERENCIA', label: t.membersPage.entryTransferencia },
    { value: 'OUTRO', label: t.membersPage.entryOther },
  ];

  const handleSubmit = async (values: FormValues) => {
    const payload: Record<string, unknown> = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      birth_date: isoDate(values.birth_date),
      cpf: values.cpf.trim(),
      rg: values.rg.trim(),
      born_in_city: values.born_in_city.trim(),
      born_in_state: values.born_in_state.trim(),
      profession: values.profession.trim(),
      education_level: values.education_level || '',
      marital_status: values.marital_status || '',
      marriage_date: isoDate(values.marriage_date),
      father_name: values.father_name.trim(),
      mother_name: values.mother_name.trim(),
      church_entry: values.church_entry || '',
      church_entry_other: values.church_entry_other.trim(),
      street: values.street.trim(),
      number: values.number.trim(),
      complement: values.complement.trim(),
      neighborhood: values.neighborhood.trim(),
      city: values.city.trim(),
      state: values.state.trim().toUpperCase(),
      cep: values.cep.trim(),
      notes: values.notes.trim(),
    };
    setSubmitting(true);
    try {
      await publicFormApi.submit(hash, payload);
      setSubmitted(true);
    } catch {
      // erro exibido pelo botão? manutenção simples: mantém o form
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container size="md" py="xl">
        <Center py="xl">
          <Loader />
        </Center>
      </Container>
    );
  }

  if (error || !meta) {
    return (
      <Container size="sm" py="xl">
        <Paper withBorder radius="md" p="xl" ta="center">
          <Text size="lg">{t.publicForm.invalid}</Text>
        </Paper>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>
          {meta.church_name} • {t.publicForm.title}
        </title>
      </Head>
      <Container size="md" py="xl">
        <Paper withBorder radius="md" p="md" mb="md" bg="gray.0">
          <Group gap="sm">
            <ThemeIcon size="xl" radius="xl" color="teal" variant="light">
              <IconBuildingChurch size={26} />
            </ThemeIcon>
            <Stack gap={0}>
              <Title order={3}>{meta.church_name}</Title>
              <Text size="sm" c="dimmed">
                {t.publicForm.title} • {meta.church_city}/{meta.church_state}
              </Text>
            </Stack>
          </Group>
          <Text size="sm" mt="sm" c="dimmed">
            {meta.type === 'member'
              ? t.publicForm.memberNote.replace('{church}', meta.church_name)
              : t.publicForm.candidateNote.replace('{church}', meta.church_name)}
          </Text>
          {meta.type === 'member' && meta.member_name && (
            <Text size="sm" mt="xs">
              {t.publicForm.alreadyMember
                .replace('{name}', meta.member_name)
                .replace('{card}', meta.card_number || '—')}
            </Text>
          )}
        </Paper>

        {submitted ? (
          <Paper withBorder radius="md" p="xl" ta="center">
            <ThemeIcon size={56} radius="xl" color="green" variant="light" mx="auto">
              <IconCheck size={28} />
            </ThemeIcon>
            <Title order={3} mt="md">
              {t.publicForm.successTitle}
            </Title>
            <Text size="sm" c="dimmed" mt="xs">
              {t.publicForm.successBody}
            </Text>
            <Text size="xs" c="dimmed" mt="xs">
              {t.publicForm.privacyNote}
            </Text>
            <Button
              variant="default"
              mt="md"
              onClick={() => {
                setSubmitted(false);
                form.reset();
              }}
            >
              {t.publicForm.submitAgain}
            </Button>
          </Paper>
        ) : (
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Paper withBorder radius="md" p="md">
              <Text fw={700} size="sm" mb="sm">
                {t.membersPage.stepPersonal}
              </Text>
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label={t.membersPage.name}
                    required
                    data-testid="pf-name"
                    {...form.getInputProps('name')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label={t.membersPage.phone}
                    data-testid="pf-phone"
                    {...form.getInputProps('phone')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label={t.membersPage.email}
                    data-testid="pf-email"
                    {...form.getInputProps('email')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <DateInput
                    label={t.membersPage.birthDate}
                    locale={locale}
                    valueFormat="DD/MM/YYYY"
                    clearable
                    data-testid="pf-birth_date"
                    {...form.getInputProps('birth_date')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label={t.membersPage.cpf}
                    data-testid="pf-cpf"
                    {...form.getInputProps('cpf')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput label={t.membersPage.rg} data-testid="pf-rg" {...form.getInputProps('rg')} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label={t.membersPage.bornInCity}
                    data-testid="pf-born_in_city"
                    {...form.getInputProps('born_in_city')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label={t.membersPage.bornInState}
                    maxLength={2}
                    data-testid="pf-born_in_state"
                    {...form.getInputProps('born_in_state')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label={t.membersPage.profession}
                    data-testid="pf-profession"
                    {...form.getInputProps('profession')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Select
                    label={t.membersPage.educationLevel}
                    data={educationOptions}
                    clearable
                    searchable
                    data-testid="pf-education_level"
                    {...form.getInputProps('education_level')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Select
                    label={t.membersPage.maritalStatus}
                    placeholder={t.membersPage.maritalStatusPlaceholder}
                    data={maritalOptions}
                    clearable
                    data-testid="pf-marital_status"
                    {...form.getInputProps('marital_status')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <DateInput
                    label={t.membersPage.marriageDate}
                    locale={locale}
                    valueFormat="DD/MM/YYYY"
                    clearable
                    data-testid="pf-marriage_date"
                    {...form.getInputProps('marriage_date')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label={t.membersPage.fatherName}
                    data-testid="pf-father_name"
                    {...form.getInputProps('father_name')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label={t.membersPage.motherName}
                    data-testid="pf-mother_name"
                    {...form.getInputProps('mother_name')}
                  />
                </Grid.Col>
              </Grid>
            </Paper>

            <Paper withBorder radius="md" p="md" mt="md">
              <Text fw={700} size="sm" mb="sm">
                {t.membersPage.stepMinistry}
              </Text>
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Select
                    label={t.membersPage.churchEntry}
                    placeholder={t.membersPage.churchEntryPlaceholder}
                    data={churchEntryOptions}
                    clearable
                    data-testid="pf-church_entry"
                    {...form.getInputProps('church_entry')}
                  />
                </Grid.Col>
                {form.values.church_entry === 'OUTRO' && (
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label={t.membersPage.churchEntryOther}
                      placeholder={t.membersPage.churchEntryOtherPlaceholder}
                      required
                      data-testid="pf-church_entry_other"
                      {...form.getInputProps('church_entry_other')}
                    />
                  </Grid.Col>
                )}
              </Grid>
            </Paper>

            <Paper withBorder radius="md" p="md" mt="md">
              <Text fw={700} size="sm" mb="sm">
                {t.membersPage.addressTitle}
              </Text>
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label={t.membersPage.addressStreet}
                    data-testid="pf-street"
                    {...form.getInputProps('street')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 3 }}>
                  <TextInput
                    label={t.membersPage.addressNumber}
                    data-testid="pf-number"
                    {...form.getInputProps('number')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 3 }}>
                  <TextInput
                    label={t.membersPage.addressComplement}
                    data-testid="pf-complement"
                    {...form.getInputProps('complement')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label={t.membersPage.addressNeighborhood}
                    data-testid="pf-neighborhood"
                    {...form.getInputProps('neighborhood')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <TextInput
                    label={t.membersPage.addressCity}
                    data-testid="pf-city"
                    {...form.getInputProps('city')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 2 }}>
                  <TextInput
                    label={t.membersPage.addressState}
                    maxLength={2}
                    data-testid="pf-state"
                    {...form.getInputProps('state')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label={t.membersPage.addressCep}
                    data-testid="pf-cep"
                    {...form.getInputProps('cep')}
                  />
                </Grid.Col>
              </Grid>
            </Paper>

            <Paper withBorder radius="md" p="md" mt="md">
              <TextInput
                label={t.membersPage.notes}
                data-testid="pf-notes"
                {...form.getInputProps('notes')}
              />
            </Paper>

            <Divider my="md" />

            <Text size="xs" c="dimmed" mb="sm" ta="center">
              {t.publicForm.privacyNote}
            </Text>
            <Button
              size="md"
              fullWidth
              type="submit"
              leftSection={<IconSend size={18} />}
              loading={submitting}
              data-testid="pf-submit"
            >
              {submitting ? t.publicForm.submitting : t.publicForm.submit}
            </Button>
          </form>
        )}
      </Container>
    </>
  );
}