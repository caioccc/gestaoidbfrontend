'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Grid,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCrosshair } from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import ChurchMap from './ChurchMap';
import MaskedTextInput from './MaskedTextInput';
import type { GrowthGroup, GrowthGroupPayload, Member } from '../types';

interface GrowthGroupFormModalProps {
  opened: boolean;
  editing: GrowthGroup | null;
  members: Member[];
  saving: boolean;
  onClose: () => void;
  onSaved: (payload: GrowthGroupPayload) => void;
}

interface FormValues {
  name: string;
  leader: string | null;
  host: string | null;
  weekday: string | null;
  time: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  radius: number;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
}

const WEEKDAY_OPTIONS = [
  { value: '0', key: 'monday' },
  { value: '1', key: 'tuesday' },
  { value: '2', key: 'wednesday' },
  { value: '4', key: 'friday' },
] as const;

export default function GrowthGroupFormModal({
  opened,
  editing,
  members,
  saving,
  onClose,
  onSaved,
}: GrowthGroupFormModalProps) {
  const { t } = useLanguage();

  const empty = (): FormValues => ({
    name: '',
    leader: null,
    host: null,
    weekday: '1',
    time: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    radius: 1000,
    is_active: true,
    latitude: null,
    longitude: null,
  });

  const form = useForm<FormValues>({
    initialValues: empty(),
    validate: {
      name: (v) => (v.trim() ? null : t.growthGroups.nameRequired),
      leader: (v) => (v ? null : t.growthGroups.leaderRequired),
      weekday: (v) => (v ? null : t.growthGroups.weekdayRequired),
      time: (v) =>
        v
          ? /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
            ? null
            : t.growthGroups.timeInvalid
          : t.growthGroups.timeRequired,
      city: (v, values) =>
        v.trim() && values.street.trim()
          ? null
          : t.growthGroups.addressRequired,
      latitude: (v, values) =>
        v === null && values.longitude !== null
          ? t.growthGroups.coordsHint
          : null,
      longitude: (v, values) =>
        v === null && values.latitude !== null
          ? t.growthGroups.coordsHint
          : null,
    },
  });

  useEffect(() => {
    if (!opened) return;
    form.setValues(
      editing
        ? {
            name: editing.name,
            leader: String(editing.leader),
            host: editing.host ? String(editing.host) : null,
            weekday: String(editing.weekday),
            time: editing.time ? editing.time.slice(0, 5) : '',
            cep: editing.cep || '',
            street: editing.street || '',
            number: editing.number || '',
            complement: editing.complement || '',
            neighborhood: editing.neighborhood || '',
            city: editing.city || '',
            state: editing.state || '',
            radius: editing.radius_meters,
            is_active: editing.is_active,
            latitude: editing.latitude,
            longitude: editing.longitude,
          }
        : empty()
    );
    form.resetDirty();
    setCepLoading(false);
    setGeoCoding(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, editing]);

  // CEP: autopreenche logradouro/bairro/cidade/UF (padrão do sistema, ViaCEP).
  const [cepLoading, setCepLoading] = useState(false);

  const handleCepBlur = async (cepValue: string) => {
    const clean = cepValue.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      if (!res.ok) throw new Error('viacep');
      const data = await res.json();
      if (data.erro || !data.uf) {
        notifications.show({ color: 'red', message: t.registerPage.cepError });
      } else {
        form.setValues((prev) => ({
          ...prev,
          street: data.logradouro ?? prev.street,
          neighborhood: data.bairro ?? prev.neighborhood,
          city: data.localidade ?? prev.city,
          state: data.uf ?? prev.state,
        }));
      }
    } catch {
      notifications.show({ color: 'red', message: t.registerPage.cepError });
    } finally {
      setCepLoading(false);
    }
  };

  // Geocodificação do endereço completo (Nominatim/OSM) → ajusta o marcador.
  const [geoCoding, setGeoCoding] = useState(false);

  const geocodeAddress = useCallback(
    async (): Promise<{ lat: number; lng: number } | null> => {
      const street = form.values.street.trim();
      const number = form.values.number.trim();
      const city = form.values.city.trim();
      if (!street || !number || !city) return null;
      const query = [
        street,
        number,
        form.values.neighborhood.trim(),
        `${city}/${form.values.state.trim()}`,
      ]
        .filter(Boolean)
        .join(', ');
      if (query.length < 8) return null;
      setGeoCoding(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&countrycodes=br&limit=1`
        );
        if (!res.ok) throw new Error('nominatim');
        const results: Array<{ lat: string; lon: string }> = await res.json();
        if (!results.length) {
          notifications.show({ color: 'red', message: t.growthGroups.geocodeError });
          return null;
        }
        return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
      } catch {
        notifications.show({ color: 'red', message: t.growthGroups.geocodeError });
        return null;
      } finally {
        setGeoCoding(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.values.street, form.values.number, form.values.neighborhood, form.values.city, form.values.state]
  );

  const [debouncedFill] = useDebouncedValue(
    `${form.values.street}|${form.values.number}|${form.values.neighborhood}|${form.values.city}|${form.values.state}`,
    600
  );

  // "por fim o número que ajusta o pointer no mapa": geocode automático somente
  // após o CEP autopreencher o endereço e o número ser informado — usando o
  // endereço completo (rua, número, bairro, cidade/UF) para um ponto exato.
  useEffect(() => {
    if (!opened) return;
    const [street, num, neighborhood, city, state] = debouncedFill.split('|');
    if (!street.trim() || !num.trim() || !city.trim()) return;
    if (form.values.latitude != null && form.values.longitude != null) return;
    let active = true;
    setGeoCoding(true);
    const query = [street, num, neighborhood, `${city}/${state}`]
      .filter(Boolean)
      .join(', ');
    if (query.length < 8) {
      setGeoCoding(false);
      return;
    }
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&countrycodes=br&limit=1`
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('nominatim'))))
      .then((results: Array<{ lat: string; lon: string }>) => {
        if (!active || !results.length) return;
        form.setFieldValue('latitude', parseFloat(results[0].lat));
        form.setFieldValue('longitude', parseFloat(results[0].lon));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setGeoCoding(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFill, opened]);

  const locateNow = async () => {
    const coords = await geocodeAddress();
    if (coords) {
      form.setFieldValue('latitude', coords.lat);
      form.setFieldValue('longitude', coords.lng);
      notifications.show({
        color: 'green',
        message: t.growthGroups.saved,
      });
    }
  };

  // Duplo clique no mini-mapa: marca o ponto e preenche CEP/rua/bairro/UF/cidade
  // via geocodificação reversa (Nominatim/OSM).
  const handleMapPick = async (lat: number, lng: number) => {
    form.setFieldValue('latitude', lat);
    form.setFieldValue('longitude', lng);
    setGeoCoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=pt-BR`
      );
      if (!res.ok) throw new Error('nominatim');
      const data = await res.json();
      const a: Record<string, string | undefined> = data.address ?? {};
      const setIf = (k: string, v: string | undefined | null) => {
        const clean = (v ?? '').trim();
        if (clean) form.setFieldValue(k, clean);
      };
      setIf('street', a.road);
      setIf('number', a.house_number);
      setIf('neighborhood', a.neighbourhood ?? a.suburb ?? a.city_district);
      setIf(
        'city',
        a.city ?? a.town ?? a.village ?? a.municipality ?? a.county
      );
      // Converte o nome por extenso de um estado brasileiro em sua UF (sigla).
      // Ex.: "Paraíba" → "PB", "São Paulo" → "SP", "Distrito Federal" → "DF".
      const ufFromStateName = (name: string): string => {
        const key = name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();
        const BR_STATES: Record<string, string> = {
          acre: 'AC',
          alagoas: 'AL',
          amapa: 'AP',
          amazonas: 'AM',
          bahia: 'BA',
          ceara: 'CE',
          'distrito federal': 'DF',
          'espirito santo': 'ES',
          goias: 'GO',
          maranhao: 'MA',
          'mato grosso': 'MT',
          'mato grosso do sul': 'MS',
          'minas gerais': 'MG',
          para: 'PA',
          paraiba: 'PB',
          parana: 'PR',
          pernambuco: 'PE',
          piaui: 'PI',
          'rio de janeiro': 'RJ',
          'rio grande do norte': 'RN',
          'rio grande do sul': 'RS',
          rondonia: 'RO',
          roraima: 'RR',
          'santa catarina': 'SC',
          'sao paulo': 'SP',
          sergipe: 'SE',
          tocantins: 'TO',
        };
        return BR_STATES[key] ?? '';
      };

      const canonicalUf = [
        a.state_code,
        a.short_code,
        a['ISO3166-2-lvl4'],
        data.short_code,
      ]
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
        .map((v) => v.split('-').pop() ?? '')
        .find((v) => /^[a-zA-Z]{2}$/.test(v));
      const ufSigla = (ufFromStateName(a.state ?? '') ||
        (canonicalUf ?? '').toUpperCase());

      setIf('state', ufSigla || a.state || '');
      const postcode = (a.postcode ?? '').replace(/\D/g, '');
      if (postcode.length === 8) {
        form.setFieldValue('cep', `${postcode.slice(0, 5)}-${postcode.slice(5)}`);
      }
    } catch {
      // ponto já foi marcado; endereço pode ser digitado/CEP manualmente
    } finally {
      setGeoCoding(false);
    }
  };

  const memberOptions = members.map((m) => ({
    value: String(m.id),
    label: m.name,
  }));

  const weekdayOptions = WEEKDAY_OPTIONS.map((w) => ({
    value: w.value,
    label: t.growthGroups[w.key],
  }));

  // Horário no padrão 24h (apenas hora e minuto HH:MM): os dígitos são
  // inseridos sem acolchoar (ex.: "2" → "2", "20" → "20", "20:0", "20:00")
  // e a validação de intervalo acontece no submit.
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.currentTarget.value.replace(/\D/g, '').slice(0, 4);
    if (!digits) {
      form.setFieldValue('time', '');
      return;
    }
    const hh = digits.slice(0, 2);
    const mm = digits.length > 2 ? digits.slice(2, 4) : '';
    form.setFieldValue('time', mm ? `${hh}:${mm}` : hh);
  };

  const handleSubmit = form.onSubmit(async (values) => {
    let lat = values.latitude;
    let lng = values.longitude;
    if (lat == null || lng == null) {
      const coords = await geocodeAddress();
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
        values.latitude = lat;
        values.longitude = lng;
      }
    }
    onSaved({
      name: values.name.trim(),
      leader: values.leader ? Number(values.leader) : null,
      host: values.host ? Number(values.host) : null,
      weekday: (Number(values.weekday) as 0 | 1 | 2 | 4) ?? 1,
      time: values.time ? `${values.time}:00` : '',
      cep: values.cep.trim(),
      street: values.street.trim(),
      number: values.number.trim(),
      complement: values.complement.trim(),
      neighborhood: values.neighborhood.trim(),
      city: values.city.trim(),
      state: values.state.trim().toUpperCase(),
      radius_meters: values.radius > 0 ? values.radius : 1,
      latitude: lat,
      longitude: lng,
      is_active: values.is_active,
    });
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editing ? t.growthGroups.editGroup : t.growthGroups.newGroup}
      size="lg"
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="sm">
          <TextInput
            label={t.growthGroups.nameLabel}
            required
            data-testid="gc-name"
            {...form.getInputProps('name')}
          />

          <Group grow align="flex-start">
            <Select
              label={t.growthGroups.leaderLabel}
              placeholder={t.growthGroups.leaderPlaceholder}
              required
              searchable
              data={memberOptions}
              value={form.values.leader}
              onChange={(v) => form.setFieldValue('leader', v ?? null)}
              error={form.errors.leader}
              data-testid="gc-leader"
            />
            <Select
              label={t.growthGroups.hostLabel}
              placeholder={t.growthGroups.hostPlaceholder}
              searchable
              clearable
              data={memberOptions}
              value={form.values.host}
              onChange={(v) => form.setFieldValue('host', v ?? null)}
              data-testid="gc-host"
            />
          </Group>

          <Group grow align="flex-end">
            <Select
              label={t.growthGroups.weekdayLabel}
              required
              data={weekdayOptions}
              value={form.values.weekday}
              onChange={(v) => form.setFieldValue('weekday', v ?? null)}
              error={form.errors.weekday}
              data-testid="gc-weekday"
            />
            <TextInput
              label={t.growthGroups.timeLabel}
              required
              placeholder="20:00"
              inputMode="numeric"
              maxLength={5}
              value={form.values.time}
              onChange={handleTimeChange}
              error={form.errors.time}
              data-testid="gc-time"
            />
            <NumberInput
              label={t.growthGroups.radiusLabel}
              required
              min={1}
              step={100}
              value={form.values.radius}
              onChange={(v) => form.setFieldValue('radius', Number(v) || 1)}
              data-testid="gc-radius"
            />
          </Group>
          <Text size="xs" c="dimmed">
            {t.growthGroups.weekdayHint}
          </Text>

          <Grid>
            <Grid.Col span={12}>
              <MaskedTextInput
                mask="00000-000"
                label={t.registerPage.cep}
                description={t.registerPage.cepHint}
                required
                value={form.values.cep}
                rightSection={cepLoading ? <Loader size="xs" /> : null}
                onAccept={(value: string) => form.setFieldValue('cep', value)}
                onBlur={() => handleCepBlur(form.values.cep)}
                data-testid="gc-cep"
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <TextInput
                label={t.membersPage.addressStreet}
                required
                data-testid="gc-street"
                value={form.values.street}
                onChange={(e) => form.setFieldValue('street', e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TextInput
                label={t.membersPage.addressNumber}
                required
                inputMode="numeric"
                data-testid="gc-number"
                value={form.values.number}
                onChange={(e) => form.setFieldValue('number', e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 8 }}>
              <TextInput
                label={t.membersPage.addressComplement}
                data-testid="gc-complement"
                value={form.values.complement}
                onChange={(e) =>
                  form.setFieldValue('complement', e.currentTarget.value)
                }
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 8 }}>
              <TextInput
                label={t.membersPage.addressNeighborhood}
                data-testid="gc-neighborhood"
                value={form.values.neighborhood}
                onChange={(e) =>
                  form.setFieldValue('neighborhood', e.currentTarget.value)
                }
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <TextInput
                label={t.membersPage.addressState}
                required
                maxLength={2}
                data-testid="gc-state"
                value={form.values.state}
                onChange={(e) =>
                  form.setFieldValue('state', e.currentTarget.value.toUpperCase())
                }
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <TextInput
                label={t.membersPage.addressCity}
                required
                error={form.errors.city}
                data-testid="gc-city"
                value={form.values.city}
                onChange={(e) => form.setFieldValue('city', e.currentTarget.value)}
              />
            </Grid.Col>
          </Grid>

          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              leftSection={geoCoding ? <Loader size={13} /> : <IconCrosshair size={14} />}
              onClick={locateNow}
              disabled={geoCoding}
              data-testid="gc-locate"
            >
              {t.growthGroups.geocodeLabel}
            </Button>
          </Group>

          <ChurchMap
            latitude={form.values.latitude}
            longitude={form.values.longitude}
            draggable
            scrollWheelZoom
            hint={t.growthGroups.pickHint}
            onMove={(lat, lng) => {
              form.setFieldValue('latitude', lat);
              form.setFieldValue('longitude', lng);
            }}
            onPick={handleMapPick}
          />

          <Switch
            label={t.growthGroups.activeLabel}
            checked={form.values.is_active}
            onChange={(e) => form.setFieldValue('is_active', e.currentTarget.checked)}
            data-testid="gc-active"
          />

          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" loading={saving} data-testid="gc-submit">
              {t.common.save}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}