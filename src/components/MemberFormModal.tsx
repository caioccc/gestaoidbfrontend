import React, { useEffect, useState } from 'react';
import {
  ActionIcon,
  Button,
  Grid,
  Group,
  Loader,
  Modal,
  MultiSelect,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import ImageUpload from './ImageUpload';
import MaskedTextInput from './MaskedTextInput';
import MemberCard from './MemberCard';
import MemberCardModal from './MemberCardModal';
import { useLanguage } from '../i18n';
import {
  isValidEmail,
  toISO,
  toSentenceCase,
  toUpperCamelWords,
} from '../utils/format';
import type {
  ChurchEntry,
  EducationLevel,
  Kinship,
  MaritalStatus,
  Member,
  MemberStatus,
  MinistryArea,
  CardConfig,
} from '../types';
import type { ChurchContact } from '../hooks/useChurchCardConfig';

interface RelativeForm {
  id?: number;
  name: string;
  kinship: Kinship | '';
  birth_date: Date | null;
  phone: string;
}

export interface MemberFormValues {
  name: string;
  phone: string;
  email: string;
  birth_date: Date | null;
  baptism_date: Date | null;
  cpf: string;
  rg: string;
  born_in_city: string;
  born_in_state: string;
  profession: string;
  education_level: EducationLevel | '';
  marital_status: MaritalStatus | '';
  marriage_date: Date | null;
  father_name: string;
  mother_name: string;
  church_entry: ChurchEntry | '';
  church_entry_other: string;
  ministry_areas: (number | string)[];
  photo: string | null;
  status: MemberStatus;
  notes: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  relatives: RelativeForm[];
}

const EMPTY_FORM: MemberFormValues = {
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
  marital_status: '',
  marriage_date: null,
  father_name: '',
  mother_name: '',
  church_entry: '',
  church_entry_other: '',
  ministry_areas: [],
  photo: null,
  status: 'ACTIVE',
  notes: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  cep: '',
  relatives: [],
};

interface MemberFormModalProps {
  opened: boolean;
  onClose: () => void;
  member: Member | null;
  areas: MinistryArea[];
  churchName: string;
  cardConfig?: CardConfig;
  churchContact?: ChurchContact;
  onSave: (
    payload: Record<string, unknown>,
    isEdit: boolean
  ) => Promise<Member>;
}

export default function MemberFormModal({
  opened,
  onClose,
  member,
  areas,
  churchName,
  cardConfig,
  churchContact,
  onSave,
}: MemberFormModalProps) {
  const { t, locale } = useLanguage();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cardMember, setCardMember] = useState<Member | null>(null);

  const isoToDate = (iso: string): Date | null => {
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

  const fromMember = (m: Member): MemberFormValues => ({
    name: m.name,
    phone: m.phone,
    email: m.email,
    birth_date: isoToDate(m.birth_date || ''),
    baptism_date: isoToDate(m.baptism_date || ''),
    cpf: m.cpf || '',
    rg: m.rg || '',
    born_in_city: m.born_in_city || '',
    born_in_state: m.born_in_state || '',
    profession: m.profession || '',
    education_level: m.education_level || '',
    marital_status: m.marital_status || '',
    marriage_date: isoToDate(m.marriage_date || ''),
    father_name: m.father_name || '',
    mother_name: m.mother_name || '',
    church_entry: m.church_entry || '',
    church_entry_other: m.church_entry_other || '',
    ministry_areas: (m.ministry_areas || []).map(String),
    photo: m.photo || null,
    status: m.status,
    notes: m.notes || '',
    street: m.street || '',
    number: m.number || '',
    complement: m.complement || '',
    neighborhood: m.neighborhood || '',
    city: m.city || '',
    state: m.state || '',
    cep: m.cep || '',
    relatives: (m.relatives || []).map((r) => ({
      id: r.id,
      name: r.name,
      kinship: r.kinship,
      birth_date: isoToDate(r.birth_date || ''),
      phone: r.phone || '',
    })),
  });

  const form = useForm<MemberFormValues>({
    initialValues: EMPTY_FORM,
    validate: {
      name: (v) => (v.trim().length ? null : t.membersPage.name),
      email: (v) => (v && !isValidEmail(v) ? t.email : null),
    },
  });

  useEffect(() => {
    if (!opened) return;
    setStep(0);
    setCardMember(null);
    if (member) {
      form.setValues(fromMember(member));
    } else {
      form.setValues(EMPTY_FORM);
    }
    form.resetDirty();
    form.clearErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, member]);

  const areaOptions = areas.map((a) => ({ value: String(a.id), label: a.name }));

  const churchEntryOptions = [
    { value: 'ACLAMACAO', label: t.membersPage.entryAclamacao },
    { value: 'BATISMO', label: t.membersPage.entryBatismo },
    { value: 'RECONCILIACAO', label: t.membersPage.entryReconciliacao },
    { value: 'TRANSFERENCIA', label: t.membersPage.entryTransferencia },
    { value: 'OUTRO', label: t.membersPage.entryOther },
  ];

  const maritalOptions = [
    { value: 'SOLTEIRO', label: t.membersPage.single },
    { value: 'CASADO', label: t.membersPage.married },
    { value: 'UNIAO_ESTAVEL', label: t.membersPage.stableUnion },
    { value: 'SEPARADO', label: t.membersPage.separated },
    { value: 'DIVORCIADO', label: t.membersPage.divorced },
    { value: 'VIUVO', label: t.membersPage.widower },
  ];

  const educationOptions = [
    { value: 'SEM_ESCOLARIDADE', label: t.membersPage.noSchooling },
    { value: 'FUNDAMENTAL', label: t.membersPage.fundamental },
    { value: 'MEDIO_INCOMPLETO', label: t.membersPage.highSchoolIncomplete },
    { value: 'MEDIO', label: t.membersPage.highSchool },
    { value: 'SUPERIOR_INCOMPLETO', label: t.membersPage.collegeIncomplete },
    { value: 'SUPERIOR', label: t.membersPage.college },
    { value: 'POS_GRADUACAO', label: t.membersPage.graduate },
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
      form.values.relatives.filter((_, i) => i !== index)
    );
  };

  const next = () => {
    let valid = true;
    if (step === 0) {
      const res = form.validate();
      if (res.hasErrors) valid = false;
      if (
        form.values.church_entry === 'OUTRO' &&
        !form.values.church_entry_other.trim()
      ) {
        valid = false;
        form.setFieldError(
          'church_entry_other',
          t.membersPage.churchEntryOtherRequired
        );
      }
    }
    if (valid && step === 2) {
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
            t.membersPage.relativeKinship
          );
        }
      });
    }
    if (valid) setStep((s) => Math.min(s + 1, 3));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const buildPayload = (): Record<string, unknown> => ({
    name: toUpperCamelWords(form.values.name),
    phone: form.values.phone.replace(/\D/g, ''),
    email: form.values.email.trim(),
    birth_date: toISO(form.values.birth_date) ?? null,
    baptism_date: toISO(form.values.baptism_date) ?? null,
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
    ministry_areas: form.values.ministry_areas,
    status: form.values.status,
    notes: toSentenceCase(form.values.notes),
    street: toUpperCamelWords(form.values.street.trim()),
    number: form.values.number.trim(),
    complement: toUpperCamelWords(form.values.complement.trim()),
    neighborhood: toUpperCamelWords(form.values.neighborhood.trim()),
    city: toUpperCamelWords(form.values.city.trim()),
    state: form.values.state.trim().toUpperCase(),
    cep: form.values.cep.replace(/\D/g, ''),
    relatives: form.values.relatives.map((r) => {
      const out: Record<string, unknown> = {
        name: toUpperCamelWords(r.name),
        kinship: r.kinship,
        birth_date: toISO(r.birth_date) ?? null,
        phone: r.phone.replace(/\D/g, ''),
      };
      if (r.id) out.id = r.id;
      return out;
    }),
  });

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

  const handleFinish = async () => {
    setSaving(true);
    const payload = buildPayload();
    if (
      form.values.photo !== (member?.photo || null)
    ) {
      payload.photo = form.values.photo ?? '';
    }
    try {
      const saved = await onSave(payload, !!member);
      notifications.show({ color: 'green', message: t.membersPage.saved });
      setCardMember(saved);
    } catch (err: any) {
      const data = err?.response?.data;
      const msg =
        data?.relatives?.[0]?.name?.[0] ||
        data?.relatives?.[0]?.kinship?.[0] ||
        data?.ministry_areas?.[0] ||
        data?.name?.[0] ||
        data?.photo?.[0] ||
        data?.detail;
      notifications.show({ color: 'red', message: msg || t.overview });
    } finally {
      setSaving(false);
    }
  };

  const buildDraft = (): Member => {
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
    const educationLabel =
      educationOptions.find((o) => o.value === form.values.education_level)
        ?.label ?? '';
    return {
      id: member?.id ?? 0,
      church: member?.church ?? 0,
      name: form.values.name,
      phone: form.values.phone,
      email: form.values.email,
      birth_date: toISO(form.values.birth_date) ?? null,
      baptism_date: toISO(form.values.baptism_date) ?? null,
      cpf: form.values.cpf,
      rg: form.values.rg,
      born_in_city: form.values.born_in_city,
      born_in_state: form.values.born_in_state,
      profession: form.values.profession,
      education_level: form.values.education_level || '',
      education_level_display: educationLabel,
      marital_status: form.values.marital_status || '',
      marital_status_display: maritalLabel,
      marriage_date: toISO(form.values.marriage_date) ?? null,
      father_name: form.values.father_name,
      mother_name: form.values.mother_name,
      card_number: member?.card_number ?? null,
      church_entry: form.values.church_entry || '',
      church_entry_display: entryDisplay,
      church_entry_other: form.values.church_entry_other,
      ministry_areas: [],
      ministry_areas_display: [],
      photo: form.values.photo,
      status: form.values.status,
      status_display:
        form.values.status === 'ACTIVE'
          ? t.membersPage.active
          : t.membersPage.inactive,
      notes: form.values.notes,
      street: form.values.street,
      number: form.values.number,
      complement: form.values.complement,
      neighborhood: form.values.neighborhood,
      city: form.values.city,
      state: form.values.state,
      cep: form.values.cep,
      relatives: [],
      created_at: member?.created_at ?? '',
      updated_at: member?.updated_at ?? '',
    };
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={member ? t.membersPage.editMember : t.membersPage.addMember}
        centered
        size="xl"
      >
        <Stepper
          active={step}
          onStepClick={(s) => setStep(s)}
          allowNextStepsSelect={false}
          color="teal"
          size="sm"
        >
          <Stepper.Step label={t.membersPage.stepPersonal}>
            <ScrollArea.Autosize mah={440} type="auto">
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
                        data-testid="member-name"
                        {...form.getInputProps('name')}
                      />
                      <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        <MaskedTextInput
                          label={t.membersPage.phone}
                          data-testid="member-phone"
                          placeholder="(00) 00000-0000"
                          mask="(00) 00000-0000"
                          value={form.values.phone}
                          error={form.errors.phone}
                          onAccept={(value: string) =>
                            form.setFieldValue('phone', value)
                          }
                        />
                        <TextInput
                          label={t.membersPage.email}
                          data-testid="member-email"
                          {...form.getInputProps('email')}
                        />
                      </SimpleGrid>
                      <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        <MaskedTextInput
                          label={t.membersPage.cpf}
                          data-testid="member-cpf"
                          placeholder="000.000.000-00"
                          maxLength={14}
                          mask="000.000.000-00"
                          value={form.values.cpf}
                          error={form.errors.cpf}
                          onAccept={(value: string) =>
                            form.setFieldValue('cpf', value)
                          }
                        />
                        <TextInput
                          label={t.membersPage.rg}
                          data-testid="member-rg"
                          {...form.getInputProps('rg')}
                        />
                      </SimpleGrid>
                      <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        <DateInput
                          label={t.membersPage.birthDate}
                          data-testid="member-birth-date"
                          locale={locale}
                          valueFormat="DD/MM/YYYY"
                          clearable
                          maxDate={new Date()}
                          value={form.values.birth_date}
                          onChange={(value) =>
                            form.setFieldValue('birth_date', toDateValue(value))
                          }
                          error={form.errors.birth_date}
                        />
                        <TextInput
                          label={t.membersPage.bornInCity}
                          data-testid="member-born-city"
                          {...form.getInputProps('born_in_city')}
                        />
                      </SimpleGrid>
                      <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        <TextInput
                          label={t.membersPage.bornInState}
                          maxLength={2}
                          data-testid="member-born-state"
                          {...form.getInputProps('born_in_state')}
                        />
                        <TextInput
                          label={t.membersPage.profession}
                          data-testid="member-profession"
                          {...form.getInputProps('profession')}
                        />
                      </SimpleGrid>
                      <Select
                        label={t.membersPage.educationLevel}
                        placeholder={t.membersPage.educationLevel}
                        clearable
                        data={educationOptions}
                        data-testid="member-education"
                        {...form.getInputProps('education_level')}
                      />
                    </Stack>
                  </Grid.Col>
                </Grid>
                <Text fw={600} size="sm" mt="md">
                  {t.membersPage.addressTitle}
                </Text>
                <Text size="xs" c="dimmed">
                  {t.registerPage.cepHint}
                </Text>
                <Grid>
                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <MaskedTextInput
                      label={t.membersPage.addressCep}
                      placeholder="00000-000"
                      mask="00000-000"
                      maxLength={9}
                      value={form.values.cep}
                      rightSection={cepLoading ? <Loader size="xs" /> : null}
                      error={form.errors.cep}
                      onAccept={(value: string) =>
                        form.setFieldValue('cep', value)
                      }
                      onBlur={() => handleCepBlur(form.values.cep)}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 8 }}>
                    <TextInput
                      label={t.membersPage.addressStreet}
                      data-testid="member-street"
                      {...form.getInputProps('street')}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <TextInput
                      label={t.membersPage.addressNumber}
                      data-testid="member-number"
                      {...form.getInputProps('number')}
                    />
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <TextInput
                      label={t.membersPage.addressComplement}
                      data-testid="member-complement"
                      {...form.getInputProps('complement')}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 8 }}>
                    <TextInput
                      label={t.membersPage.addressNeighborhood}
                      data-testid="member-neighborhood"
                      {...form.getInputProps('neighborhood')}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 8 }}>
                    <TextInput
                      label={t.membersPage.addressCity}
                      data-testid="member-city"
                      {...form.getInputProps('city')}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <TextInput
                      label={t.membersPage.addressState}
                      maxLength={2}
                      data-testid="member-state"
                      {...form.getInputProps('state')}
                    />
                  </Grid.Col>
                </Grid>
              </Stack>
            </ScrollArea.Autosize>
          </Stepper.Step>

          <Stepper.Step label={t.membersPage.stepMinistry}>
            <ScrollArea.Autosize mah={440} type="auto">
              <Stack gap="md" pt="xs">
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <Select
                    label={t.membersPage.churchEntry}
                    placeholder={t.membersPage.churchEntryPlaceholder}
                    clearable
                    data={churchEntryOptions}
                    data-testid="member-church-entry"
                    {...form.getInputProps('church_entry')}
                  />
                  <DateInput
                    label={t.membersPage.baptismDate}
                    data-testid="member-baptism"
                    locale={locale}
                    valueFormat="DD/MM/YYYY"
                    clearable
                    value={form.values.baptism_date}
                    onChange={(value) =>
                      form.setFieldValue('baptism_date', toDateValue(value))
                    }
                    error={form.errors.baptism_date}
                  />
                </SimpleGrid>
                {form.values.church_entry === 'OUTRO' && (
                  <TextInput
                    label={t.membersPage.churchEntryOther}
                    placeholder={t.membersPage.churchEntryOtherPlaceholder}
                    data-testid="member-church-entry-other"
                    {...form.getInputProps('church_entry_other')}
                  />
                )}
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <Select
                    label={t.membersPage.status}
                    data={[
                      { value: 'ACTIVE', label: t.membersPage.active },
                      { value: 'INACTIVE', label: t.membersPage.inactive },
                    ]}
                    data-testid="member-status"
                    {...form.getInputProps('status')}
                  />
                </SimpleGrid>
                <MultiSelect
                  label={t.membersPage.ministryAreas}
                  placeholder={t.membersPage.ministryAreas}
                  data={areaOptions}
                  clearable
                  data-testid="member-ministry-areas"
                  {...form.getInputProps('ministry_areas')}
                />
                <Textarea
                  label={t.membersPage.notes}
                  minRows={2}
                  data-testid="member-notes"
                  {...form.getInputProps('notes')}
                />
              </Stack>
            </ScrollArea.Autosize>
          </Stepper.Step>

          <Stepper.Step label={t.membersPage.stepFamily}>
            <ScrollArea.Autosize mah={440} type="auto">
              <Stack gap="md" pt="xs">
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <Select
                    label={t.membersPage.maritalStatus}
                    placeholder={t.membersPage.maritalStatusPlaceholder}
                    clearable
                    data={maritalOptions}
                    data-testid="member-marital-status"
                    {...form.getInputProps('marital_status')}
                  />
                  <DateInput
                    label={t.membersPage.marriageDate}
                    data-testid="member-marriage"
                    locale={locale}
                    valueFormat="DD/MM/YYYY"
                    clearable
                    value={form.values.marriage_date}
                    onChange={(value) =>
                      form.setFieldValue('marriage_date', toDateValue(value))
                    }
                    error={form.errors.marriage_date}
                  />
                </SimpleGrid>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput
                    label={t.membersPage.fatherName}
                    data-testid="member-father"
                    {...form.getInputProps('father_name')}
                  />
                  <TextInput
                    label={t.membersPage.motherName}
                    data-testid="member-mother"
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
                      data-testid="member-add-relative"
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
                      data-testid={`member-relative-${i}`}
                    >
                      <TextInput
                        label={t.membersPage.relativeName}
                        style={{ flex: 2 }}
                        error={form.errors[`relatives.${i}.name`]}
                        value={r.name}
                        onChange={(e) =>
                          form.setFieldValue(`relatives.${i}.name`, e.currentTarget.value)
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
                            (v as Kinship) || ''
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
                            toDateValue(value)
                          )
                        }
                      />
                      <MaskedTextInput
                        label={t.membersPage.phone}
                        style={{ flex: 1.4 }}
                        mask="(00) 00000-0000"
                        value={r.phone}
                        onAccept={(value: string) =>
                          form.setFieldValue(`relatives.${i}.phone`, value)
                        }
                      />
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={() => removeRelative(i)}
                        data-testid={`member-remove-relative-${i}`}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  ))}
                </Stack>
              </Stack>
            </ScrollArea.Autosize>
          </Stepper.Step>

          <Stepper.Step label={t.membersPage.stepCard}>
            <Stack align="center" gap="md" pt="xs">
              <Text size="sm" c="dimmed">
                {t.membersPage.cardPreview}
              </Text>
              <MemberCard
                member={buildDraft()}
                churchName={churchName}
                config={cardConfig}
                churchContact={churchContact}
              />
            </Stack>
          </Stepper.Step>
        </Stepper>

        <Group justify="space-between" mt="lg">
          <Button
            variant="default"
            onClick={back}
            disabled={step === 0}
            data-testid="member-stepper-back"
          >
            {t.membersPage.back}
          </Button>
          {step < 3 ? (
            <Button
              onClick={next}
              data-testid="member-stepper-next"
            >
              {t.membersPage.next}
            </Button>
          ) : (
            <Button
              loading={saving}
              onClick={handleFinish}
              data-testid="member-submit"
            >
              {t.membersPage.finish}
            </Button>
          )}
        </Group>
      </Modal>

      <MemberCardModal
        opened={!!cardMember}
        member={cardMember}
        churchName={churchName}
        config={cardConfig}
        churchContact={churchContact}
        onClose={() => {
          setCardMember(null);
          onClose();
        }}
      />
    </>
  );
}