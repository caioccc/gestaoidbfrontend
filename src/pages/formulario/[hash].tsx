import React, { useEffect, useState } from 'react';
import {
  ActionIcon,
  Button,
  Center,
  Container,
  Divider,
  Grid,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  Table,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconBuildingChurch,
  IconCheck,
  IconPlus,
  IconSend,
  IconTrash,
} from '@tabler/icons-react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { publicFormApi } from '../../api/accounts';
import { useLanguage } from '../../i18n';
import ImageUpload from '../../components/ImageUpload';
import {
  isValidCpf,
  isValidEmail,
  maskCep,
  maskCpf,
  maskPhone,
  toISO,
  toSentenceCase,
  toUpperCamelWords,
} from '../../utils/format';
import type { Kinship, PublicFormMeta } from '../../types';

interface RelativeForm {
  name: string;
  kinship: Kinship | '';
  birth_date: Date | null;
  phone: string;
}

interface FormValues {
  photo: string | null;
  name: string;
  phone: string;
  email: string;
  birth_date: Date | null;
  cpf: string;
  rg: string;
  born_in_city: string;
  born_in_state: string;
  profession: string;
  education_level: string | null;
  marital_status: string | null;
  marriage_date: Date | null;
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
  relatives: RelativeForm[];
}

const EMPTY_FORM: FormValues = {
  photo: null,
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
  relatives: [],
};

const isoToDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};

const toDateValue = (
  value: Date | string | number | null | undefined
): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  return typeof value === 'string' ? isoToDate(value) : null;
};

export default function PublicMemberFormPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const hash = typeof router.query.hash === 'string' ? router.query.hash : '';

  const [meta, setMeta] = useState<PublicFormMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(0);
  const [cepLoading, setCepLoading] = useState(false);

  const form = useForm<FormValues>({
    initialValues: EMPTY_FORM,
    validate: {
      name: (v) => (v.trim().length ? null : t.membersPage.name),
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

  const kinshipOptions = [
    { value: 'CONJUGE', label: t.membersPage.kinshipSpouse },
    { value: 'PAI', label: t.membersPage.kinshipFather },
    { value: 'MAE', label: t.membersPage.kinshipMother },
    { value: 'FILHO', label: t.membersPage.kinshipChild },
    { value: 'IRMAO', label: t.membersPage.kinshipSibling },
    { value: 'AVO', label: t.membersPage.kinshipGrandparent },
    { value: 'NETO', label: t.membersPage.kinshipGrandchild },
    { value: 'OUTRO', label: t.membersPage.kinshipOther },
  ];

  const addRelative = () => {
    form.setFieldValue('relatives', [
      ...form.values.relatives,
      { name: '', kinship: '', birth_date: null, phone: '' },
    ]);
  };

  const removeRelative = (index: number) => {
    form.setFieldValue(
      'relatives',
      form.values.relatives.filter((_, i) => i !== index),
    );
  };

  const handleCepBlur = async (cepValue: string) => {
    const clean = cepValue.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      if (!res.ok) throw new Error('viacep');
      const data = await res.json();
      if (data.erro) {
        notifications.show({ color: 'red', message: t.registerPage.cepError });
      } else if (data.uf) {
        form.setFieldValue('street', data.logradouro || '');
        form.setFieldValue('neighborhood', data.bairro || '');
        form.setFieldValue('city', data.localidade || '');
        form.setFieldValue('state', data.uf || '');
      } else {
        notifications.show({ color: 'red', message: t.registerPage.cepError });
      }
    } catch {
      notifications.show({ color: 'red', message: t.registerPage.cepError });
    } finally {
      setCepLoading(false);
    }
  };

  const next = () => {
    let valid = true;
    const res = form.validate();
    if (res.hasErrors) valid = false;

    if (step === 0) {
      if (!valid) return;
      const phoneDigits = (form.values.phone || '').replace(/\D/g, '');
      if (phoneDigits.length && phoneDigits.length < 10) {
        valid = false;
        form.setFieldError('phone', t.membersPage.phoneInvalid);
      }
      const cpfValue = form.values.cpf;
      if (cpfValue.replace(/\D/g, '').length && !isValidCpf(cpfValue)) {
        valid = false;
        form.setFieldError('cpf', t.membersPage.cpfInvalid);
      }
      const emailValue = form.values.email;
      if (emailValue.trim() && !isValidEmail(emailValue)) {
        valid = false;
        form.setFieldError('email', t.email || t.membersPage.email);
      }
    }

    if (step === 3) {
      form.values.relatives.forEach((r, i) => {
        const filled =
          r.name.trim() || r.kinship || r.phone.trim() || r.birth_date;
        if (!filled) return;
        if (!r.name.trim()) {
          valid = false;
          form.setFieldError(`relatives.${i}.name`, t.membersPage.name);
        }
        if (!r.kinship) {
          valid = false;
          form.setFieldError(
            `relatives.${i}.kinship`,
            t.membersPage.relativeKinship,
          );
        }
      });
    }

    if (step === 2) {
      const cepDigits = (form.values.cep || '').replace(/\D/g, '');
      if (cepDigits.length && cepDigits.length !== 8) {
        valid = false;
        form.setFieldError('cep', t.membersPage.addressCep);
      }
    }

    if (valid) setStep((s) => Math.min(s + 1, 3));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const buildPayload = (): Record<string, unknown> => ({
    name: toUpperCamelWords(form.values.name),
    phone: form.values.phone.replace(/\D/g, ''),
    email: form.values.email.trim(),
    birth_date: toISO(form.values.birth_date) ?? null,
    cpf: form.values.cpf.trim(),
    rg: form.values.rg.trim(),
    born_in_city: toUpperCamelWords(form.values.born_in_city.trim()),
    born_in_state: form.values.born_in_state.trim().toUpperCase(),
    profession: toUpperCamelWords(form.values.profession.trim()),
    education_level: form.values.education_level || '',
    marital_status: form.values.marital_status || '',
    marriage_date: toISO(form.values.marriage_date) ?? null,
    father_name: toUpperCamelWords(form.values.father_name.trim()),
    mother_name: toUpperCamelWords(form.values.mother_name.trim()),
    church_entry: form.values.church_entry || '',
    church_entry_other:
      form.values.church_entry === 'OUTRO'
        ? toUpperCamelWords(form.values.church_entry_other.trim())
        : '',
    photo: form.values.photo ?? '',
    street: toUpperCamelWords(form.values.street.trim()),
    number: form.values.number.trim(),
    complement: toUpperCamelWords(form.values.complement.trim()),
    neighborhood: toUpperCamelWords(form.values.neighborhood.trim()),
    city: toUpperCamelWords(form.values.city.trim()),
    state: form.values.state.trim().toUpperCase(),
    cep: form.values.cep.replace(/\D/g, ''),
    notes: toSentenceCase(form.values.notes),
    relatives: form.values.relatives
      .filter(
        (r) => r.name.trim() || r.kinship || r.phone.trim() || r.birth_date,
      )
      .map((r) => ({
        name: toUpperCamelWords(r.name),
        kinship: r.kinship,
        birth_date: toISO(r.birth_date) ?? null,
        phone: r.phone.replace(/\D/g, ''),
      })),
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await publicFormApi.submit(hash, buildPayload());
      setSubmitted(true);
    } catch {
      notifications.show({ color: 'red', message: t.overview });
    } finally {
      setSubmitting(false);
    }
  };

  const entryLabel =
    churchEntryOptions.find((o) => o.value === form.values.church_entry)
      ?.label ?? '';
  const entryDisplay =
    form.values.church_entry === 'OUTRO' && form.values.church_entry_other
      ? form.values.church_entry_other
      : entryLabel;
  const maritalLabel =
    maritalOptions.find((o) => o.value === form.values.marital_status)
      ?.label ?? '';

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
      <Container size="lg" py="xl">
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
                form.setValues(EMPTY_FORM);
                form.clearErrors();
                setStep(0);
              }}
            >
              {t.publicForm.submitAgain}
            </Button>
          </Paper>
        ) : (
          <Paper withBorder radius="md" p="md">
            <Stepper
              active={step}
              onStepClick={setStep}
              allowNextStepsSelect={false}
              color="teal"
              size="sm"
            >
              <Stepper.Step label={t.membersPage.stepPersonal}>
                <ScrollArea.Autosize mah={520} type="auto">
                  <Stack gap="md" pt="xs">
                    <Grid>
                      <Grid.Col span={{ base: 12, sm: 4 }}>
                        <ImageUpload
                          label={t.membersPage.photo}
                          placeholder={t.membersPage.photoHint}
                          value={form.values.photo}
                          onChange={(dataUrl) =>
                            form.setFieldValue('photo', dataUrl)
                          }
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, sm: 8 }}>
                        <Stack gap="sm">
                          <TextInput
                            label={t.membersPage.name}
                            required
                            data-testid="pf-name"
                            {...form.getInputProps('name')}
                          />
                          <SimpleGrid cols={{ base: 1, sm: 2 }}>
                            <TextInput
                              label={t.membersPage.phone}
                              data-testid="pf-phone"
                              placeholder="(00) 00000-0000"
                              maxLength={15}
                              value={form.values.phone}
                              onChange={(e) =>
                                form.setFieldValue(
                                  'phone',
                                  maskPhone(e.currentTarget.value),
                                )
                              }
                              error={form.errors.phone}
                            />
                            <TextInput
                              label={t.membersPage.email}
                              data-testid="pf-email"
                              {...form.getInputProps('email')}
                            />
                          </SimpleGrid>
                          <SimpleGrid cols={{ base: 1, sm: 2 }}>
                            <TextInput
                              label={t.membersPage.cpf}
                              data-testid="pf-cpf"
                              placeholder="000.000.000-00"
                              maxLength={14}
                              value={form.values.cpf}
                              onChange={(e) =>
                                form.setFieldValue(
                                  'cpf',
                                  maskCpf(e.currentTarget.value),
                                )
                              }
                              error={form.errors.cpf}
                            />
                            <TextInput
                              label={t.membersPage.rg}
                              data-testid="pf-rg"
                              {...form.getInputProps('rg')}
                            />
                          </SimpleGrid>
                          <SimpleGrid cols={{ base: 1, sm: 2 }}>
                            <DateInput
                              label={t.membersPage.birthDate}
                              data-testid="pf-birth_date"
                              locale={locale}
                              valueFormat="DD/MM/YYYY"
                              clearable
                              value={form.values.birth_date}
                              onChange={(value) =>
                                form.setFieldValue(
                                  'birth_date',
                                  toDateValue(value),
                                )
                              }
                              error={form.errors.birth_date}
                            />
                            <TextInput
                              label={t.membersPage.bornInState}
                              maxLength={2}
                              data-testid="pf-born_in_state"
                              {...form.getInputProps('born_in_state')}
                            />
                          </SimpleGrid>
                          <SimpleGrid cols={{ base: 1, sm: 2 }}>
                            <TextInput
                              label={t.membersPage.bornInCity}
                              data-testid="pf-born_in_city"
                              {...form.getInputProps('born_in_city')}
                            />
                            <TextInput
                              label={t.membersPage.profession}
                              data-testid="pf-profession"
                              {...form.getInputProps('profession')}
                            />
                          </SimpleGrid>
                          <Select
                            label={t.membersPage.educationLevel}
                            placeholder={t.membersPage.educationLevel}
                            data={educationOptions}
                            clearable
                            searchable
                            data-testid="pf-education_level"
                            {...form.getInputProps('education_level')}
                          />
                        </Stack>
                      </Grid.Col>
                    </Grid>
                  </Stack>
                </ScrollArea.Autosize>
              </Stepper.Step>

              <Stepper.Step label={t.membersPage.stepMinistry}>
                <ScrollArea.Autosize mah={520} type="auto">
                  <Stack gap="md" pt="xs">
                    <Select
                      label={t.membersPage.churchEntry}
                      placeholder={t.membersPage.churchEntryPlaceholder}
                      data={churchEntryOptions}
                      clearable
                      data-testid="pf-church_entry"
                      {...form.getInputProps('church_entry')}
                    />
                    {form.values.church_entry === 'OUTRO' && (
                      <TextInput
                        label={t.membersPage.churchEntryOther}
                        placeholder={t.membersPage.churchEntryOtherPlaceholder}
                        required
                        data-testid="pf-church_entry_other"
                        {...form.getInputProps('church_entry_other')}
                      />
                    )}
                    <Textarea
                      label={t.membersPage.notes}
                      minRows={2}
                      data-testid="pf-notes"
                      {...form.getInputProps('notes')}
                    />
                  </Stack>
                </ScrollArea.Autosize>
              </Stepper.Step>

              <Stepper.Step label={t.membersPage.addressTitle}>
                <ScrollArea.Autosize mah={520} type="auto">
                  <Stack gap="md" pt="xs">
                    <Text size="xs" c="dimmed">
                      {t.registerPage.cepHint}
                    </Text>
                    <Grid>
                      <Grid.Col span={{ base: 12, sm: 4 }}>
                        <TextInput
                          label={t.membersPage.addressCep}
                          placeholder="00000-000"
                          maxLength={9}
                          rightSection={cepLoading ? <Loader size="xs" /> : null}
                          value={form.values.cep}
                          onChange={(e) =>
                            form.setFieldValue(
                              'cep',
                              maskCep(e.currentTarget.value),
                            )
                          }
                          onBlur={() => handleCepBlur(form.values.cep)}
                          error={form.errors.cep}
                          data-testid="pf-cep"
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, sm: 8 }}>
                        <TextInput
                          label={t.membersPage.addressStreet}
                          data-testid="pf-street"
                          {...form.getInputProps('street')}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, sm: 4 }}>
                        <TextInput
                          label={t.membersPage.addressNumber}
                          data-testid="pf-number"
                          {...form.getInputProps('number')}
                        />
                      </Grid.Col>
                      <Grid.Col span={12}>
                        <TextInput
                          label={t.membersPage.addressComplement}
                          data-testid="pf-complement"
                          {...form.getInputProps('complement')}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, sm: 8 }}>
                        <TextInput
                          label={t.membersPage.addressNeighborhood}
                          data-testid="pf-neighborhood"
                          {...form.getInputProps('neighborhood')}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, sm: 8 }}>
                        <TextInput
                          label={t.membersPage.addressCity}
                          data-testid="pf-city"
                          {...form.getInputProps('city')}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, sm: 4 }}>
                        <TextInput
                          label={t.membersPage.addressState}
                          maxLength={2}
                          data-testid="pf-state"
                          {...form.getInputProps('state')}
                        />
                      </Grid.Col>
                    </Grid>
                  </Stack>
                </ScrollArea.Autosize>
              </Stepper.Step>

              <Stepper.Step label={t.membersPage.stepFamily}>
                <ScrollArea.Autosize mah={520} type="auto">
                  <Stack gap="md" pt="xs">
                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                      <Select
                        label={t.membersPage.maritalStatus}
                        placeholder={t.membersPage.maritalStatusPlaceholder}
                        data={maritalOptions}
                        clearable
                        data-testid="pf-marital_status"
                        {...form.getInputProps('marital_status')}
                      />
                      <DateInput
                        label={t.membersPage.marriageDate}
                        data-testid="pf-marriage_date"
                        locale={locale}
                        valueFormat="DD/MM/YYYY"
                        clearable
                        value={form.values.marriage_date}
                        onChange={(value) =>
                          form.setFieldValue(
                            'marriage_date',
                            toDateValue(value),
                          )
                        }
                        error={form.errors.marriage_date}
                      />
                    </SimpleGrid>
                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                      <TextInput
                        label={t.membersPage.fatherName}
                        data-testid="pf-father_name"
                        {...form.getInputProps('father_name')}
                      />
                      <TextInput
                        label={t.membersPage.motherName}
                        data-testid="pf-mother_name"
                        {...form.getInputProps('mother_name')}
                      />
                    </SimpleGrid>
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text fw={600} size="sm">
                          {t.membersPage.relatives}
                        </Text>
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconPlus size={14} />}
                          onClick={addRelative}
                          data-testid="pf-add-relative"
                        >
                          {t.membersPage.addRelative}
                        </Button>
                      </Group>
                      {form.values.relatives.map((r, i) => (
                        <Group
                          key={i}
                          gap="xs"
                          align="flex-end"
                          wrap="nowrap"
                          data-testid={`pf-relative-${i}`}
                        >
                          <TextInput
                            label={t.membersPage.relativeName}
                            style={{ flex: 2 }}
                            error={form.errors[`relatives.${i}.name`]}
                            value={r.name}
                            onChange={(e) =>
                              form.setFieldValue(
                                `relatives.${i}.name`,
                                e.currentTarget.value,
                              )
                            }
                          />
                          <Select
                            label={t.membersPage.relativeKinship}
                            placeholder={t.membersPage.relativeKinship}
                            style={{ flex: 1.4 }}
                            data={kinshipOptions}
                            error={form.errors[`relatives.${i}.kinship`]}
                            value={r.kinship}
                            onChange={(v) =>
                              form.setFieldValue(
                                `relatives.${i}.kinship`,
                                (v as Kinship) || '',
                              )
                            }
                          />
                          <DateInput
                            label={t.membersPage.birthDate}
                            style={{ flex: 1.2 }}
                            locale={locale}
                            valueFormat="DD/MM/YYYY"
                            clearable
                            value={r.birth_date}
                            onChange={(value) =>
                              form.setFieldValue(
                                `relatives.${i}.birth_date`,
                                toDateValue(value),
                              )
                            }
                          />
                          <TextInput
                            label={t.membersPage.phone}
                            style={{ flex: 1.4 }}
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                            value={r.phone}
                            onChange={(e) =>
                              form.setFieldValue(
                                `relatives.${i}.phone`,
                                maskPhone(e.currentTarget.value),
                              )
                            }
                          />
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => removeRelative(i)}
                            data-testid={`pf-remove-relative-${i}`}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      ))}
                    </Stack>
                    <Divider my="xs" />
                    <Text fw={600} size="sm">
                      {t.publicForm.review}
                    </Text>
                    <Table withColumnBorders>
                      <Table.Tbody>
                        <ReviewRow
                          label={t.membersPage.name}
                          value={form.values.name}
                        />
                        <ReviewRow
                          label={t.membersPage.churchEntry}
                          value={entryDisplay}
                        />
                        <ReviewRow
                          label={t.membersPage.maritalStatus}
                          value={maritalLabel}
                        />
                        <ReviewRow
                          label={t.membersPage.addressCity}
                          value={
                            form.values.city
                              ? `${form.values.city}/${form.values.state.toUpperCase()}`
                              : ''
                          }
                        />
                        <ReviewRow
                          label={t.membersPage.relatives}
                          value={
                            form.values.relatives.filter(
                              (r) => r.name.trim() || r.kinship,
                            ).length
                              ? String(
                                  form.values.relatives.filter(
                                    (r) => r.name.trim() || r.kinship,
                                  ).length,
                                )
                              : ''
                          }
                        />
                      </Table.Tbody>
                    </Table>
                  </Stack>
                </ScrollArea.Autosize>
              </Stepper.Step>
            </Stepper>

            <Group justify="space-between" mt="lg">
              <Button
                variant="default"
                onClick={back}
                disabled={step === 0}
                data-testid="pf-stepper-back"
              >
                {t.membersPage.back}
              </Button>
              {step < 3 ? (
                <Button onClick={next} data-testid="pf-stepper-next">
                  {t.membersPage.next}
                </Button>
              ) : (
                <Button
                  loading={submitting}
                  onClick={handleSubmit}
                  leftSection={<IconSend size={18} />}
                  data-testid="pf-submit"
                >
                  {submitting ? t.publicForm.submitting : t.publicForm.submit}
                </Button>
              )}
            </Group>
          </Paper>
        )}

        <Text size="xs" c="dimmed" mt="sm" ta="center">
          {t.publicForm.privacyNote}
        </Text>
      </Container>
    </>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <Table.Tr>
      <Table.Td w="40%">
        <Text size="sm" fw={600}>
          {label}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{value || '—'}</Text>
      </Table.Td>
    </Table.Tr>
  );
}