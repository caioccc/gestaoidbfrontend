import React, { useEffect, useState } from 'react';
import {
  BasePortalProps,
  Button,
  Grid,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Stepper,
  Switch,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconHeartHandshake, IconHandStop, IconPray } from '@tabler/icons-react';
import { accountsApi } from '../api/accounts';
import { useLanguage } from '../i18n';
import MaskedTextInput from './MaskedTextInput';
import {
  PrayerRequestCategory,
  PrayerRequestPreferredPeriod,
} from '../types';

const PRAYER_CATEGORY_KEYS: PrayerRequestCategory[] = [
  'HEALTH',
  'FAMILY',
  'SPIRITUAL',
  'FINANCIAL',
  'GRIEF',
  'THANKSGIVING',
  'OTHER',
];

const PRAYER_PERIOD_KEYS: PrayerRequestPreferredPeriod[] = [
  'ANY',
  'MORNING',
  'AFTERNOON',
  'NIGHT',
];

interface Props {
  opened: boolean;
  onClose: () => void;
  slug: string;
  portalProps?: BasePortalProps;
}

export default function PrayerRequestPublicModal({ opened, onClose, slug, portalProps }: Props) {
  const { t } = useLanguage();
  const categoryData = PRAYER_CATEGORY_KEYS.map((k) => ({
    value: k,
    label: t.prayerRequestsPage.categoryLabel[k],
  }));
  const periodData = PRAYER_PERIOD_KEYS.map((k) => ({
    value: k,
    label: t.prayerRequestsPage.periodLabel[k],
  }));
  const [active, setActive] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<PrayerRequestCategory | null>(null);
  const [description, setDescription] = useState('');
  const [wantsVisit, setWantsVisit] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [cep, setCep] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [preferredPeriod, setPreferredPeriod] = useState<PrayerRequestPreferredPeriod | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const STEP_KEYS: ReadonlyArray<'contact' | 'reason' | 'visit' | 'review'> = wantsVisit
    ? ['contact', 'reason', 'visit', 'review']
    : ['contact', 'reason', 'review'];
  const currentKey = STEP_KEYS[Math.min(active, STEP_KEYS.length - 1)];

  useEffect(() => {
    if (!opened) return;
    setActive(0);
    setName('');
    setPhone('');
    setCategory(null);
    setDescription('');
    setWantsVisit(false);
    setAnonymous(false);
    setCep('');
    setCepLoading(false);
    setStreet('');
    setNumber('');
    setComplement('');
    setNeighborhood('');
    setCity('');
    setState('');
    setPreferredPeriod(null);
    setSubmitted(false);
  }, [opened]);

  const goTo = (key: (typeof STEP_KEYS)[number]) => {
    const idx = STEP_KEYS.indexOf(key);
    if (idx >= 0) setActive(idx);
  };

  // Complemento é a única exceção: fica sempre opcional, mesmo na visita.
  const validateVisitStep = (): boolean => {
    const missing: string[] = [];
    if (cep.replace(/\D/g, '').length !== 8) missing.push(t.registerPage.cep);
    if (!street.trim()) missing.push(t.registerPage.street);
    if (!number.trim()) missing.push(t.registerPage.number);
    if (!neighborhood.trim()) missing.push(t.prayerPublicModal.neighborhood);
    if (!city.trim()) missing.push(t.registerPage.city);
    if (state.trim().length !== 2) missing.push(t.registerPage.state);
    if (!preferredPeriod) missing.push(t.prayerPublicModal.preferredPeriod);
    if (missing.length) {
      notifications.show({
        color: 'red',
        message: t.prayerPublicModal.requiredVisitFields.replace(
          '{fields}',
          missing.join(', ')
        ),
      });
      return false;
    }
    return true;
  };

  const advance = () => {
    if (currentKey === 'contact') {
      if (!anonymous && name.trim().length < 2) {
        notifications.show({ color: 'red', message: t.prayerPublicModal.requiredName });
        return;
      }
    }
    if (currentKey === 'reason') {
      if (!category) {
        notifications.show({ color: 'red', message: t.prayerPublicModal.categoryPlaceholder });
        return;
      }
      if (!description.trim()) {
        notifications.show({
          color: 'red',
          message: t.prayerPublicModal.requiredDescription,
        });
        return;
      }
    }
    if (currentKey === 'visit' && !validateVisitStep()) {
      return;
    }
    const idx = STEP_KEYS.indexOf(currentKey);
    if (idx < STEP_KEYS.length - 1) setActive(idx + 1);
  };

  const goBack = () => {
    const idx = STEP_KEYS.indexOf(currentKey);
    if (idx > 0) setActive(idx - 1);
  };

  const buscarCep = async () => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) {
      notifications.show({ color: 'red', message: t.registerPage.cepInvalid });
      return;
    }
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (data.erro) {
        notifications.show({ color: 'red', message: t.registerPage.cepError });
      } else {
        if (data.logradouro) setStreet(data.logradouro);
        if (data.bairro) setNeighborhood(data.bairro);
        if (data.localidade) setCity(data.localidade);
        if (data.uf) setState(data.uf);
      }
    } catch {
      notifications.show({ color: 'red', message: t.registerPage.cepError });
    } finally {
      setCepLoading(false);
    }
  };

  const submit = async () => {
    if (!category) return;
    if (!description.trim()) {
      notifications.show({
        color: 'red',
        message: t.prayerPublicModal.requiredDescription,
      });
      return;
    }
    if (!anonymous && name.trim().length < 2) {
      notifications.show({ color: 'red', message: t.prayerPublicModal.requiredName });
      return;
    }
    if (wantsVisit && !validateVisitStep()) {
      return;
    }
    setSubmitting(true);
    try {
      await accountsApi.publicCreatePrayerRequest(slug, {
        requester_name: anonymous ? 'Anônimo' : name.trim(),
        requester_phone: phone.trim(),
        is_anonymous: anonymous,
        category,
        description: description.trim(),
        wants_visit: wantsVisit,
        cep: wantsVisit ? cep.replace(/\D/g, '') : '',
        street: wantsVisit ? street.trim() : '',
        number: wantsVisit ? number.trim() : '',
        complement: wantsVisit ? complement.trim() : '',
        neighborhood: wantsVisit ? neighborhood.trim() : '',
        city: wantsVisit ? city.trim() : '',
        state: wantsVisit ? state.trim().toUpperCase() : '',
        preferred_period: wantsVisit ? preferredPeriod ?? 'ANY' : 'ANY',
      });
      setSubmitted(true);
      notifications.show({ color: 'green', message: t.prayerPublicModal.submitDone });
    } catch {
      notifications.show({ color: 'red', message: t.prayerPublicModal.submitError });
    } finally {
      setSubmitting(false);
    }
  };

  const addressSummary = [
    street,
    number ? `nº ${number}` : '',
    complement,
    neighborhood,
    city,
    state,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t.prayerPublicModal.title}
      centered
      size="xl"
      portalProps={portalProps}
    >
      {submitted ? (
        <Stack align="center" gap="sm" py="xl">
          <IconHandStop size={44} color="green" />
          <Text fw={600} ta="center">
            {t.prayerPublicModal.submitDone}
          </Text>
          <Button variant="light" mt="sm" onClick={onClose}>
            {t.prayerPublicModal.close}
          </Button>
        </Stack>
      ) : (
        <Stack gap="md">
          <Text size="xs" c="dimmed">
            {t.prayerPublicModal.subtitle}
          </Text>

          <Stepper
            active={Math.min(active, STEP_KEYS.length - 1)}
            allowNextStepsSelect={false}
            onStepClick={(i) => {
              if (i <= Math.min(active, STEP_KEYS.length - 1)) setActive(i);
            }}
            iconSize={28}
          >
            <Stepper.Step label={t.prayerPublicModal.stepContact}>
              <Stack gap="sm">
                {!anonymous ? (
                  <TextInput
                    label={t.prayerPublicModal.name}
                    placeholder={t.prayerPublicModal.namePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                    maxLength={150}
                  />
                ) : null}

                <MaskedTextInput
                  label={t.prayerPublicModal.phone}
                  placeholder={t.prayerPublicModal.phonePlaceholder}
                  mask="(00) 00000-0000"
                  value={phone}
                  onAccept={(v) => setPhone(v)}
                />

                <Switch
                  label={
                    <Stack gap={0}>
                      <span>{t.prayerPublicModal.anonymous}</span>
                      <Text size="xs" c="dimmed">
                        {t.prayerPublicModal.anonymousHelp}
                      </Text>
                    </Stack>
                  }
                  checked={anonymous}
                  onChange={(e) => {
                    setAnonymous(e.currentTarget.checked);
                    if (e.currentTarget.checked) setName('');
                  }}
                />
              </Stack>
            </Stepper.Step>

            <Stepper.Step label={t.prayerPublicModal.stepReason}>
              <Stack gap="sm">
                <Select
                  label={t.prayerPublicModal.category}
                  placeholder={t.prayerPublicModal.categoryPlaceholder}
                  data={categoryData}
                  value={category}
                  onChange={(v) => setCategory(v as PrayerRequestCategory | null)}
                  searchable
                  required
                />

                <Textarea
                  label={t.prayerPublicModal.description}
                  placeholder={t.prayerPublicModal.descriptionPlaceholder}
                  value={description}
                  onChange={(e) => setDescription(e.currentTarget.value)}
                  minRows={4}
                  maxRows={6}
                  maxLength={2000}
                  required
                />

                <Switch
                  label={
                    <Group gap={6}>
                      <IconHeartHandshake size={16} color="blue" />
                      <span>{t.prayerPublicModal.wantsVisit}</span>
                    </Group>
                  }
                  checked={wantsVisit}
                  onChange={(e) => setWantsVisit(e.currentTarget.checked)}
                />
              </Stack>
            </Stepper.Step>

            {wantsVisit ? (
              <Stepper.Step label={t.prayerPublicModal.stepVisit}>
                <Stack gap="sm">
                  <Text size="xs" c="dimmed">
                    {t.prayerPublicModal.cepHint}
                  </Text>
                  <Group align="flex-end" gap={6}>
                    <MaskedTextInput
                      label={t.registerPage.cep}
                      placeholder="00000-000"
                      mask="00000-000"
                      value={cep}
                      onAccept={(v) => setCep(v)}
                      onBlur={buscarCep}
                      style={{ flex: 1 }}
                      required
                    />
                    {cepLoading ? <Loader size="sm" mb={8} /> : null}
                  </Group>
                  <Grid>
                    <Grid.Col span={8}>
                      <TextInput
                        label={t.registerPage.street}
                        value={street}
                        onChange={(e) => setStreet(e.currentTarget.value)}
                        maxLength={200}
                        required
                      />
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <TextInput
                        label={t.registerPage.number}
                        value={number}
                        onChange={(e) => setNumber(e.currentTarget.value)}
                        maxLength={20}
                        required
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <TextInput
                        label={t.registerPage.complement}
                        placeholder={t.prayerPublicModal.complementPlaceholder}
                        value={complement}
                        onChange={(e) => setComplement(e.currentTarget.value)}
                        maxLength={100}
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <TextInput
                        label={t.prayerPublicModal.neighborhood}
                        placeholder={t.prayerPublicModal.neighborhoodPlaceholder}
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.currentTarget.value)}
                        maxLength={120}
                        required
                      />
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <TextInput
                        label={t.registerPage.city}
                        value={city}
                        onChange={(e) => setCity(e.currentTarget.value)}
                        maxLength={100}
                        required
                      />
                    </Grid.Col>
                    <Grid.Col span={2}>
                      <TextInput
                        label={t.registerPage.state}
                        value={state}
                        onChange={(e) =>
                          setState(e.currentTarget.value.toUpperCase().slice(0, 2))
                        }
                        maxLength={2}
                        required
                      />
                    </Grid.Col>
                  </Grid>
                  <Select
                    label={t.prayerPublicModal.preferredPeriod}
                    data={periodData}
                    value={preferredPeriod}
                    onChange={(v) =>
                      setPreferredPeriod(v as PrayerRequestPreferredPeriod | null)
                    }
                    clearable
                    required
                  />
                </Stack>
              </Stepper.Step>
            ) : null}

            <Stepper.Step label={t.prayerPublicModal.stepReview}>
              <Stack gap="sm" py="xs">
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    {category
                      ? t.prayerRequestsPage.categoryLabel[category]
                      : t.prayerPublicModal.category}
                  </Text>
                  <Text fw={600} size="sm">
                    {anonymous ? t.prayerPublicModal.anonymous : name.trim() || '—'}
                  </Text>
                  {phone.trim() ? (
                    <Text size="xs" c="dimmed">
                      {phone.trim()}
                    </Text>
                  ) : null}
                  <Text size="sm" lineClamp={3} mt={4}>
                    {description.trim()}
                  </Text>
                </Stack>

                {wantsVisit ? (
                  <Stack gap={2} p="xs" style={{ borderRadius: 8, backgroundColor: '#f1f3f5' }}>
                    <Text size="xs" c="dimmed">
                      {t.prayerPublicModal.stepVisit}
                    </Text>
                    {addressSummary ? <Text size="sm">{addressSummary}</Text> : null}
                    {cep ? <Text size="xs" c="dimmed">CEP {cep}</Text> : null}
                    {preferredPeriod ? (
                      <Text size="xs" c="dimmed">
                        {t.prayerPublicModal.preferredPeriod}:{' '}
                        {t.prayerRequestsPage.periodLabel[preferredPeriod]}
                      </Text>
                    ) : null}
                  </Stack>
                ) : null}
              </Stack>
            </Stepper.Step>
          </Stepper>

          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" onClick={goBack} disabled={active === 0}>
              {t.prayerPublicModal.back}
            </Button>
            {currentKey === 'review' ? (
              <Button
                leftSection={<IconPray size={16} />}
                loading={submitting}
                disabled={submitting || !category || !description.trim()}
                onClick={submit}
              >
                {t.prayerPublicModal.submit}
              </Button>
            ) : (
              <Button onClick={advance}>{t.prayerPublicModal.next}</Button>
            )}
          </Group>
        </Stack>
      )}
    </Modal>
  );
}