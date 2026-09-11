import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Grid,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  TextInput,
  Text,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCopy, IconSearch, IconQrcode } from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { copyToClipboard } from '../utils/share';
import { buildPixPayload } from '../utils/pix';
import MaskedTextInput from './MaskedTextInput';
import QrShareCard from './QrShareCard';
import type { ChurchLinkType, ChurchPixAmountMode, ChurchPublicLink } from '../types';

const PIX_TYPES = ['CNPJ', 'CPF', 'Telefone', 'E-mail', 'Chave Aleatória'];
const DEFAULT_GRID = [30, 50, 100, 200];

function formatWpp(digits: string): string {
  let d = digits.replace(/\D/g, '');
  let country = '';
  let local = d;
  if (d.startsWith('55') && d.length >= 12) {
    country = '55 ';
    local = d.slice(2);
  }
  if (local.length >= 10) {
    const area = local.slice(0, 2);
    const rest = local.slice(2);
    if (rest.length >= 9) local = `${area} ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
    else if (rest.length >= 8) local = `${area} ${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
    else local = `${area} ${rest}`;
  }
  return `+${country}${local}`;
}

interface LinkFormValues {
  title: string;
  link_type: ChurchLinkType | null;
  url: string;
  description: string;
  highlight: boolean;
  is_active: boolean;
  pix_key: string;
  pix_type: string | null;
  pix_amount_mode: ChurchPixAmountMode;
  pix_fixed_amount: string;
  pix_grid_amounts: number[];
  pix_open_amount: boolean;
  whatsapp_number: string;
  address_cep: string;
  address_street: string;
  address_number: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
}

const EMPTY_VALUES: LinkFormValues = {
  title: '',
  link_type: null,
  url: '',
  description: '',
  highlight: false,
  is_active: true,
  pix_key: '',
  pix_type: null,
  pix_amount_mode: 'OPEN',
  pix_fixed_amount: '',
  pix_grid_amounts: [...DEFAULT_GRID],
  pix_open_amount: true,
  whatsapp_number: '',
  address_cep: '',
  address_street: '',
  address_number: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
};

interface LinkModalProps {
  opened: boolean;
  initial?: ChurchPublicLink | null;
  defaultPix?: { key?: string | null; type?: string | null } | null;
  onClose: () => void;
  onSaved: (payload: Partial<ChurchPublicLink>) => void;
}

export default function LinkModal({
  opened,
  initial,
  defaultPix,
  onClose,
  onSaved,
}: LinkModalProps) {
  const { t } = useLanguage();
  const [gridPreview, setGridPreview] = useState<number | null>(null);
  const [openAmount, setOpenAmount] = useState<string>('');

  const form = useForm<LinkFormValues>({
    initialValues: { ...EMPTY_VALUES },
    validate: {
      title: (v) =>
        v.trim().length ? null : t.linksPage.requiredTitle,
      link_type: (v) => (v ? null : t.linksPage.typeLabel),
      url: (v, values) => {
        if (values.link_type === 'PIX') return null;
        if (
          values.link_type === 'CALENDAR' ||
          values.link_type === 'MEMBERSHIP' ||
          values.link_type === 'WHATSAPP' ||
          values.link_type === 'MAPS'
        ) {
          return null;
        }
        const trimmed = v.trim();
        if (!trimmed) return t.linksPage.requiredUrl;
        if (!/^https?:\/\/\S+$/i.test(trimmed)) return t.linksPage.invalidUrl;
        return null;
      },
      pix_key: (v, values) =>
        values.link_type === 'PIX' && !v.trim()
          ? t.linksPage.requiredPix
          : null,
      pix_fixed_amount: (v, values) =>
        values.link_type === 'PIX' &&
        values.pix_amount_mode === 'FIXED' &&
        Number(v) <= 0
          ? t.linksPage.pixFixedRequired
          : null,
      pix_grid_amounts: (v, values) =>
        values.link_type === 'PIX' &&
        values.pix_amount_mode === 'GRID' &&
        !v.some((x) => Number(x) > 0)
          ? t.linksPage.pixGridRequired
          : null,
      whatsapp_number: (v, values) =>
        values.link_type === 'WHATSAPP' &&
        v.replace(/\D/g, '').length < 12
          ? t.linksPage.whatsappRequired
          : null,
      address_street: (v, values) =>
        values.link_type === 'MAPS' && !v.trim()
          ? t.linksPage.mapRequired
          : null,
      address_number: (v, values) =>
        values.link_type === 'MAPS' && !v.trim()
          ? t.linksPage.mapRequired
          : null,
    },
  });

  useEffect(() => {
    if (!opened) return;
    setGridPreview(null);
    setOpenAmount('');
    if (initial) {
      const grid =
        initial.pix_grid_amounts && initial.pix_grid_amounts.length
          ? initial.pix_grid_amounts.map(Number)
          : [...DEFAULT_GRID];
      form.setValues({
        title: initial.title || '',
        link_type: initial.link_type,
        url: initial.url || '',
        description: initial.description || '',
        highlight: initial.highlight,
        is_active: initial.is_active,
        pix_key: initial.pix_key || '',
        pix_type: initial.pix_type || null,
        pix_amount_mode: initial.pix_amount_mode || 'OPEN',
        pix_fixed_amount:
          initial.pix_fixed_amount != null && initial.pix_fixed_amount !== ''
            ? String(initial.pix_fixed_amount)
            : '',
        pix_grid_amounts: grid,
        pix_open_amount: initial.pix_open_amount ?? true,
        whatsapp_number: formatWpp(initial.whatsapp_number || ''),
        address_cep: initial.address_cep || '',
        address_street: initial.address_street || '',
        address_number: initial.address_number || '',
        address_neighborhood: initial.address_neighborhood || '',
        address_city: initial.address_city || '',
        address_state: initial.address_state || '',
      });
    } else {
      form.setValues({
        ...EMPTY_VALUES,
        pix_key: defaultPix?.key || '',
        pix_type: defaultPix?.type || (defaultPix?.key ? PIX_TYPES[0] : null),
      });
    }
    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, initial, defaultPix]);

  const linkType = form.values.link_type;
  const showUrl =
    linkType !== null &&
    linkType !== 'PIX' &&
    linkType !== 'CALENDAR' &&
    linkType !== 'MEMBERSHIP' &&
    linkType !== 'WHATSAPP' &&
    linkType !== 'MAPS';
  const showPix = linkType === 'PIX';
  const showWhatsapp = linkType === 'WHATSAPP';
  const showMaps = linkType === 'MAPS';
  const isSystem = linkType === 'CALENDAR' || linkType === 'MEMBERSHIP';

  const pixMode = form.values.pix_amount_mode;
  const previewAmount = ((): string | number | null => {
    if (pixMode === 'FIXED') {
      return Number(form.values.pix_fixed_amount) > 0 ? form.values.pix_fixed_amount : null;
    }
    if (pixMode === 'GRID') {
      if (openAmount && Number(openAmount) > 0) return openAmount;
      const chosen = form.values.pix_grid_amounts[gridPreview ?? 0];
      return Number(chosen) > 0 ? chosen : null;
    }
    return null;
  })();

  const pixPayload = showPix
    ? buildPixPayload({
        key: form.values.pix_key,
        pixType: form.values.pix_type,
        name: form.values.title.trim(),
        city: 'N/A',
        amount: previewAmount,
      })
    : '';

  const copyKey = async () => {
    await copyToClipboard(form.values.pix_key.trim());
    notifications.show({ color: 'green', message: t.publicLinks.pixCopied });
  };

  const copyPayload = async () => {
    if (!pixPayload) return;
    await copyToClipboard(pixPayload);
    notifications.show({ color: 'green', message: t.linksPage.pixPayloadCopied });
  };

  const buscarCep = async () => {
    const clean = form.values.address_cep.replace(/\D/g, '');
    if (clean.length !== 8) {
      form.setFieldError('address_cep', t.registerPage.cepInvalid);
      return;
    }
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (data.erro) {
        form.setFieldError('address_cep', t.registerPage.cepError);
      } else {
        form.setValues((prev) => ({
          ...prev,
          address_street: data.logradouro ?? prev.address_street,
          address_neighborhood: data.bairro ?? prev.address_neighborhood,
          address_city: data.localidade ?? prev.address_city,
          address_state: data.uf ?? prev.address_state,
        }));
      }
    } catch {
      form.setFieldError('address_cep', t.registerPage.cepError);
    }
  };

  const mapAddress = [
    form.values.address_street.trim(),
    form.values.address_number.trim(),
    form.values.address_neighborhood.trim(),
    form.values.address_city.trim(),
    form.values.address_state.trim(),
  ]
    .filter(Boolean)
    .join(', ');
  const showMap = showMaps && form.values.address_street && form.values.address_number && form.values.address_city;

  const handleSubmit = form.onSubmit(async (values) => {
    const base: Record<string, unknown> = {
      title: values.title.trim(),
      link_type: values.link_type,
      description: values.description.trim(),
      highlight: values.highlight,
      is_active: values.is_active,
    };
    const clearOther: Record<string, unknown> = {
      pix_key: null,
      pix_type: null,
      pix_amount_mode: 'OPEN',
      pix_fixed_amount: null,
      pix_grid_amounts: null,
      pix_open_amount: false,
      whatsapp_number: '',
      address_cep: '',
      address_street: '',
      address_number: '',
      address_neighborhood: '',
      address_city: '',
      address_state: '',
    };

    if (showPix) {
      onSaved({
        ...base,
        ...clearOther,
        pix_key: values.pix_key.trim(),
        pix_type: values.pix_type,
        pix_amount_mode: values.pix_amount_mode,
        pix_fixed_amount:
          values.pix_amount_mode === 'FIXED'
            ? values.pix_fixed_amount
            : null,
        pix_grid_amounts:
          values.pix_amount_mode === 'GRID'
            ? values.pix_grid_amounts.filter((x) => Number(x) > 0)
            : null,
        pix_open_amount:
          values.pix_amount_mode === 'GRID' ? values.pix_open_amount : false,
        url: '',
      } as Partial<ChurchPublicLink>);
    } else if (showWhatsapp) {
      onSaved({
        ...base,
        ...clearOther,
        whatsapp_number: values.whatsapp_number.replace(/\D/g, ''),
        url: '',
      } as Partial<ChurchPublicLink>);
    } else if (showMaps) {
      onSaved({
        ...base,
        ...clearOther,
        address_cep: values.address_cep.trim(),
        address_street: values.address_street.trim(),
        address_number: values.address_number.trim(),
        address_neighborhood: values.address_neighborhood.trim(),
        address_city: values.address_city.trim(),
        address_state: values.address_state.trim(),
        url: '',
      } as Partial<ChurchPublicLink>);
    } else if (isSystem) {
      onSaved({
        ...base,
        ...clearOther,
        url: '',
      } as Partial<ChurchPublicLink>);
    } else {
      onSaved({
        ...base,
        ...clearOther,
        url: values.url.trim(),
      } as Partial<ChurchPublicLink>);
    }
    onClose();
  });

  const typeOptions = (['CUSTOM', 'PIX', 'WHATSAPP', 'YOUTUBE', 'MAPS', 'INSTAGRAM', 'CALENDAR', 'MEMBERSHIP'] as ChurchLinkType[]).map(
    (type) => ({
      value: type,
      label: t.linkTypes[type] || type,
    })
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={initial ? t.linksPage.editTitle : t.linksPage.modalTitle}
      centered
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label={t.linksPage.titleLabel}
            required
            data-autofocus
            {...form.getInputProps('title')}
          />

          <Select
            label={t.linksPage.typeLabel}
            placeholder={t.linksPage.typeLabel}
            data={typeOptions}
            required
            onChange={(v) => {
              form.setFieldValue('link_type', (v as ChurchLinkType) || null);
              form.setFieldValue('url', '');
              form.setFieldValue('pix_key', '');
              form.setFieldValue('pix_type', null);
              form.setFieldValue('pix_amount_mode', 'OPEN');
              form.setFieldValue('pix_fixed_amount', '');
              form.setFieldValue('pix_grid_amounts', [...DEFAULT_GRID]);
              form.setFieldValue('pix_open_amount', true);
              form.setFieldValue('whatsapp_number', '');
              form.setFieldValue('address_cep', '');
              form.setFieldValue('address_street', '');
              form.setFieldValue('address_number', '');
              form.setFieldValue('address_neighborhood', '');
              form.setFieldValue('address_city', '');
              form.setFieldValue('address_state', '');
            }}
            value={form.values.link_type || null}
            error={form.errors.link_type}
            data-testid="link-type"
          />

          {showUrl && (
            <TextInput
              label={t.linksPage.urlLabel}
              placeholder="https://..."
              required
              {...form.getInputProps('url')}
            />
          )}

          {showWhatsapp && (
            <>
              <MaskedTextInput
                label={t.linksPage.whatsappNumberLabel}
                mask="+55 (00) 00000-0000"
                required
                placeholder="+55 (00) 00000-0000"
                value={form.values.whatsapp_number}
                error={form.errors.whatsapp_number}
                onAccept={(value: string) =>
                  form.setFieldValue('whatsapp_number', value)
                }
              />
              <Text size="xs" c="dimmed">
                {t.linksPage.whatsappHint}
              </Text>
            </>
          )}

          {showMaps && (
            <>
              <Group grow align="flex-end">
                <MaskedTextInput
                  label={t.registerPage.cep}
                  mask="00000-000"
                  value={form.values.address_cep}
                  error={form.errors.address_cep}
                  onAccept={(value: string) =>
                    form.setFieldValue('address_cep', value)
                  }
                />
                <Button
                  variant="light"
                  leftSection={<IconSearch size={16} />}
                  onClick={buscarCep}
                  mb={form.errors.address_cep ? 20 : 0}
                >
                  {t.linksPage.cepSearch}
                </Button>
              </Group>
              <Grid>
                <Grid.Col span={8}>
                  <TextInput
                    label={t.registerPage.street}
                    required
                    {...form.getInputProps('address_street')}
                  />
                </Grid.Col>
                <Grid.Col span={4}>
                  <TextInput
                    label={t.registerPage.number}
                    required
                    {...form.getInputProps('address_number')}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label={t.registerPage.neighborhood}
                    {...form.getInputProps('address_neighborhood')}
                  />
                </Grid.Col>
                <Grid.Col span={4}>
                  <TextInput
                    label={t.registerPage.city}
                    required
                    {...form.getInputProps('address_city')}
                  />
                </Grid.Col>
                <Grid.Col span={2}>
                  <TextInput
                    label={t.registerPage.state}
                    {...form.getInputProps('address_state')}
                  />
                </Grid.Col>
              </Grid>
              {showMap ? (
                <Box style={{ height: 220, borderRadius: 8, overflow: 'hidden' }}>
                  <iframe
                    title="mapa-previa"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(mapAddress)}&z=16&output=embed`}
                    style={{ border: 0, width: '100%', height: '100%' }}
                    loading="lazy"
                  />
                </Box>
              ) : (
                <Text size="xs" c="dimmed">
                  {t.linksPage.mapPreviewHint}
                </Text>
              )}
            </>
          )}

          {showPix && (
            <>
              <TextInput
                label={t.linksPage.pixKeyLabel}
                required
                {...form.getInputProps('pix_key')}
              />
              <Select
                label={t.linksPage.pixTypeLabel}
                placeholder={t.linksPage.pixTypeLabel}
                data={PIX_TYPES}
                clearable
                {...form.getInputProps('pix_type')}
              />

              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  {t.linksPage.pixValueModeLabel}
                </Text>
                <SegmentedControl
                  fullWidth
                  data={[
                    { value: 'OPEN', label: t.linksPage.pixModeOpen },
                    { value: 'FIXED', label: t.linksPage.pixModeFixed },
                    { value: 'GRID', label: t.linksPage.pixModeGrid },
                  ]}
                  value={form.values.pix_amount_mode}
                  onChange={(v) =>
                    form.setFieldValue('pix_amount_mode', v as ChurchPixAmountMode)
                  }
                />
              </Stack>

              {pixMode === 'FIXED' && (
                <NumberInput
                  label={t.linksPage.pixFixedLabel}
                  required
                  min={0}
                  decimalScale={2}
                  prefix="R$ "
                  value={
                    form.values.pix_fixed_amount
                      ? Number(form.values.pix_fixed_amount)
                      : undefined
                  }
                  onChange={(v) =>
                    form.setFieldValue('pix_fixed_amount', String(v ?? ''))
                  }
                  error={form.errors.pix_fixed_amount}
                />
              )}

              {pixMode === 'GRID' && (
                <>
                  <Text size="sm" fw={500}>
                    {t.linksPage.pixGridLabel}
                  </Text>
                  <Grid>
                    {form.values.pix_grid_amounts.map((val, i) => (
                      <Grid.Col key={i} span={3}>
                        <NumberInput
                          label={`${i + 1}`}
                          min={0}
                          decimalScale={2}
                          prefix="R$ "
                          value={Number(val) > 0 ? val : undefined}
                          onChange={(v) => {
                            const next = [...form.values.pix_grid_amounts];
                            next[i] = Number(v);
                            form.setFieldValue('pix_grid_amounts', next);
                          }}
                        />
                      </Grid.Col>
                    ))}
                  </Grid>
                  <Text size="xs" c="dimmed">
                    {t.linksPage.pixGridHint}
                  </Text>
                  <Switch
                    label={t.linksPage.pixOpenAmountLabel}
                    checked={form.values.pix_open_amount}
                    {...form.getInputProps('pix_open_amount', { type: 'checkbox' })}
                  />
                  <Group gap={6}>
                    {form.values.pix_grid_amounts.map((val, i) => (
                      <Button
                        key={i}
                        size="xs"
                        variant={gridPreview === i ? 'filled' : 'light'}
                        onClick={() => setGridPreview(i)}
                      >
                        {Number(val) > 0 ? `R$ ${Number(val).toFixed(2)}` : '—'}
                      </Button>
                    ))}
                    {form.values.pix_open_amount && (
                      <NumberInput
                        size="xs"
                        min={0}
                        decimalScale={2}
                        prefix="R$ "
                        placeholder={t.linksPage.pixOtherAmountLabel}
                        w={140}
                        value={Number(openAmount) || undefined}
                        onChange={(v) => setOpenAmount(String(v ?? ''))}
                      />
                    )}
                  </Group>
                </>
              )}

              <Stack align="center" gap="sm">
                {pixPayload ? (
                  <QrShareCard url={pixPayload} size={180} />
                ) : (
                  <Text size="xs" c="dimmed">
                    {t.linksPage.pixQrHint}
                  </Text>
                )}
                <Group justify="center" gap="xs">
                  <Button
                    variant="light"
                    leftSection={<IconCopy size={16} />}
                    onClick={copyKey}
                    disabled={!form.values.pix_key.trim()}
                  >
                    {t.publicLinks.copyPix}
                  </Button>
                  <Button
                    variant="light"
                    leftSection={<IconCopy size={16} />}
                    onClick={copyPayload}
                    disabled={!pixPayload}
                  >
                    {t.linksPage.copyPixPayload}
                  </Button>
                </Group>
              </Stack>
            </>
          )}

          {isSystem && (
            <Text size="xs" c="dimmed">
              {t.linksPage.urlAutoHint}
            </Text>
          )}

          <TextInput
            label={t.linksPage.descLabel}
            {...form.getInputProps('description')}
          />

          <Grid>
            <Grid.Col span={6}>
              <Switch
                label={t.linksPage.highlightLabel}
                description={t.linksPage.highlightHint}
                {...form.getInputProps('highlight', { type: 'checkbox' })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Switch
                label={t.linksPage.activeLabel}
                {...form.getInputProps('is_active', { type: 'checkbox' })}
              />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" type="button" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" leftSection={<IconQrcode size={16} />}>
              {t.common.save}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}