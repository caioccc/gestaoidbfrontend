import React, { useEffect, useState } from 'react';
import {
  Button,
  Grid,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconHeartHandshake, IconPray } from '@tabler/icons-react';
import { accountsApi } from '../api/accounts';
import { useLanguage } from '../i18n';
import MaskedTextInput from './MaskedTextInput';
import type {
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
  onCreated: () => void;
}

export default function CreatePrayerRequestModal({ opened, onClose, onCreated }: Props) {
  const { t } = useLanguage();
  const categoryData = PRAYER_CATEGORY_KEYS.map((k) => ({
    value: k,
    label: t.prayerRequestsPage.categoryLabel[k],
  }));
  const periodData = PRAYER_PERIOD_KEYS.map((k) => ({
    value: k,
    label: t.prayerRequestsPage.periodLabel[k],
  }));

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

  useEffect(() => {
    if (!opened) return;
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
  }, [opened]);

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
    if (!category) {
      notifications.show({ color: 'red', message: t.prayerPublicModal.categoryPlaceholder });
      return;
    }
    if (!description.trim()) {
      notifications.show({ color: 'red', message: t.prayerPublicModal.requiredDescription });
      return;
    }
    if (!anonymous && name.trim().length < 2) {
      notifications.show({ color: 'red', message: t.prayerPublicModal.requiredName });
      return;
    }
    setSubmitting(true);
    try {
      await accountsApi.createPrayerRequest({
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
      notifications.show({ color: 'green', message: t.prayerRequestsPage.drawer.notesSaved });
      onCreated();
      onClose();
    } catch {
      notifications.show({ color: 'red', message: t.prayerPublicModal.submitError });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t.prayerPublicModal.title} centered size="lg">
      <Stack gap="md">
        <Text size="xs" c="dimmed">
          {t.prayerPublicModal.subtitle}
        </Text>

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

        {wantsVisit ? (
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
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <TextInput
                  label={t.registerPage.number}
                  value={number}
                  onChange={(e) => setNumber(e.currentTarget.value)}
                  maxLength={20}
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
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <TextInput
                  label={t.registerPage.city}
                  value={city}
                  onChange={(e) => setCity(e.currentTarget.value)}
                  maxLength={100}
                />
              </Grid.Col>
              <Grid.Col span={2}>
                <TextInput
                  label={t.registerPage.state}
                  value={state}
                  onChange={(e) => setState(e.currentTarget.value.toUpperCase().slice(0, 2))}
                  maxLength={2}
                />
              </Grid.Col>
            </Grid>
            <Select
              label={t.prayerPublicModal.preferredPeriod}
              data={periodData}
              value={preferredPeriod}
              onChange={(v) => setPreferredPeriod(v as PrayerRequestPreferredPeriod | null)}
              clearable
            />
          </Stack>
        ) : null}

        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button
            leftSection={<IconPray size={16} />}
            loading={submitting}
            disabled={submitting || !category || !description.trim()}
            onClick={submit}
          >
            {t.prayerPublicModal.submit}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}