import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Avatar,
  Box,
  Button,
  Center,
  Grid,
  Group,
  Loader,
  Paper,
  Progress,
  Select,
  Stack,
  Stepper,
  Switch,
  Text,
  TextInput,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { IconBuildingChurch, IconCheck, IconHeartHandshake } from '@tabler/icons-react';
import { accountsApi } from '../../../api/accounts';
import MaskedTextInput from '../../../components/MaskedTextInput';
import { SkeletonPublicHeader, SkeletonPublicLinkRows } from '../../../components/LoadingSkeleton';
import { useLanguage } from '../../../i18n';
import { useFeedback } from '../../../hooks/useFeedback';
import { useIsMobile } from '../../../hooks/useIsMobile';
import type { PublicVisitorMeta } from '../../../types';

const HOW_KNOWN_KEYS = ['friend', 'social', 'passing', 'internet', 'event', 'other'] as const;
type HowKnownKey = (typeof HOW_KNOWN_KEYS)[number];

export default function PublicVisitorPage() {
  const router = useRouter();
  const slug = typeof router.query.slug === 'string' ? router.query.slug : '';
  const { t } = useLanguage();
  const fb = useFeedback();
  const isMobile = useIsMobile();
  const { colorScheme } = useMantineColorScheme();

  const [meta, setMeta] = useState<PublicVisitorMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [active, setActive] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [howKnownKey, setHowKnownKey] = useState<HowKnownKey | null>(null);
  const [howKnownOther, setHowKnownOther] = useState('');

  const [wantsVisit, setWantsVisit] = useState(false);
  const [cep, setCep] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [stateUf, setStateUf] = useState('');

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setLoading(true);
    setLoadError(false);
    accountsApi
      .publicVisitorMeta(slug)
      .then((data) => {
        if (alive) setMeta(data);
      })
      .catch(() => {
        if (alive) setLoadError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  const howKnownOptions = useMemo(
    () => HOW_KNOWN_KEYS.map((k) => ({ value: k, label: t.publicVisitor.howKnownOptions[k] })),
    [t]
  );

  const howKnownValue = useMemo(() => {
    if (!howKnownKey) return '';
    if (howKnownKey === 'other') return howKnownOther.trim();
    return t.publicVisitor.howKnownOptions[howKnownKey];
  }, [howKnownKey, howKnownOther, t]);

  const steps = ['identity', 'visit', 'review'] as const;
  const currentIndex = Math.min(active, steps.length - 1);
  const currentKey = steps[currentIndex];

  const stepTitle = (key: (typeof steps)[number]) => {
    if (key === 'identity') return t.publicVisitor.stepIdentity;
    if (key === 'visit') return t.publicVisitor.stepVisit;
    return t.publicVisitor.stepReview;
  };

  const goBack = () => setActive((a) => Math.max(0, a - 1));

  const validateIdentity = (): boolean => {
    if (name.trim().length < 2) {
      fb.error(t.publicVisitor.requiredName);
      return false;
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) {
      fb.error(t.publicVisitor.requiredPhone);
      return false;
    }
    if (!howKnownKey) {
      fb.error(t.publicVisitor.requiredHowKnown);
      return false;
    }
    if (howKnownKey === 'other' && !howKnownOther.trim()) {
      fb.error(t.publicVisitor.requiredHowKnown);
      return false;
    }
    return true;
  };

  const validateVisit = (): boolean => {
    if (!wantsVisit) return true;
    const missing: string[] = [];
    if (cep.replace(/\D/g, '').length !== 8) missing.push(t.publicVisitor.cep);
    if (!street.trim()) missing.push(t.publicVisitor.street);
    if (!number.trim()) missing.push(t.publicVisitor.number);
    if (!neighborhood.trim()) missing.push(t.publicVisitor.neighborhood);
    if (!city.trim()) missing.push(t.publicVisitor.city);
    if (stateUf.trim().length !== 2) missing.push(t.publicVisitor.state);
    if (missing.length) {
      fb.error(t.publicVisitor.requiredVisitFields.replace('{fields}', missing.join(', ')));
      return false;
    }
    return true;
  };

  const advance = () => {
    if (currentKey === 'identity' && !validateIdentity()) return;
    if (currentKey === 'visit' && !validateVisit()) return;
    setActive((a) => Math.min(steps.length - 1, a + 1));
  };

  const buscarCep = async () => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        if (data.logradouro) setStreet(data.logradouro);
        if (data.bairro) setNeighborhood(data.bairro);
        if (data.localidade) setCity(data.localidade);
        if (data.uf) setStateUf(data.uf);
      }
    } catch {
      // usuário pode preencher manualmente
    } finally {
      setCepLoading(false);
    }
  };

  const submit = async () => {
    if (!validateIdentity()) {
      setActive(0);
      return;
    }
    if (!validateVisit()) {
      setActive(1);
      return;
    }
    setSubmitting(true);
    try {
      await accountsApi.publicCreateVisitor(slug, {
        name: name.trim(),
        phone: phone.trim(),
        how_known: howKnownValue,
        wants_visit: wantsVisit,
        cep: wantsVisit ? cep.replace(/\D/g, '') : '',
        street: wantsVisit ? street.trim() : '',
        number: wantsVisit ? number.trim() : '',
        complement: wantsVisit ? complement.trim() : '',
        neighborhood: wantsVisit ? neighborhood.trim() : '',
        city: wantsVisit ? city.trim() : '',
        state: wantsVisit ? stateUf.trim().toUpperCase() : '',
      });
      setSubmitted(true);
    } catch {
      fb.error(t.publicVisitor.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  const pageTitle = meta
    ? `${meta.church_name} • ${t.publicVisitor.title}`
    : t.publicVisitor.title;

  const theme = '#1c7ed6';

  const addressSummary = [
    street,
    number ? `nº ${number}` : '',
    complement,
    neighborhood,
    city,
    stateUf,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
      </Head>
      <Box
        style={{
          minHeight: '100vh',
          background: `linear-gradient(180deg, ${theme} 0%, ${colorScheme === 'dark' ? '#1A1B1E' : '#f8f9fa'} 38%)`,
        }}
      >
        <Stack align="center" pt="xl" pb="lg" px="md" maw={640} mx="auto" style={{ width: '100%' }}>
          {loading && (
            <>
              <SkeletonPublicHeader avatarSize={72} titleWidth="60%" subtitleWidth="40%" tone="dark" />
              <SkeletonPublicLinkRows count={4} tone="dark" />
            </>
          )}

          {!loading && loadError && (
            <Center h="50vh">
              <Stack align="center" gap="xs">
                <IconBuildingChurch size={40} color="#fff" />
                <Text c="white" fw={600} ta="center">
                  {t.publicVisitor.loadError}
                </Text>
              </Stack>
            </Center>
          )}

          {!loading && !loadError && meta && (
            <>
              <Stack align="center" gap={4} mb="sm">
                <Avatar size={72} radius="xl" color={theme}>
                  <IconBuildingChurch size={34} color="#fff" />
                </Avatar>
                <Title order={3} c="white" ta="center">
                  {meta.church_name}
                </Title>
                {(meta.church_city || meta.church_state) && (
                  <Text c="white" size="sm" ta="center">
                    {[meta.church_city, meta.church_state].filter(Boolean).join(' / ')}
                  </Text>
                )}
              </Stack>

              <Paper withBorder radius="md" p="md" shadow="xs" w="100%">
                {submitted ? (
                  <Stack align="center" gap="sm" py="xl">
                    <IconCheck size={44} color="green" />
                    <Text fw={700} ta="center" size="lg">
                      {t.publicVisitor.successTitle}
                    </Text>
                    <Text ta="center" c="dimmed">
                      {t.publicVisitor.successBody}
                    </Text>
                    <Button variant="light" mt="sm" onClick={() => router.push(`/p/${slug}`)}>
                      {t.publicVisitor.close}
                    </Button>
                  </Stack>
                ) : (
                  <Stack gap="md">
                    <Stack gap={2}>
                      <Text fw={700}>{t.publicVisitor.title}</Text>
                      <Text size="sm" c="dimmed">
                        {t.publicVisitor.subtitle}
                      </Text>
                    </Stack>

                    {isMobile ? (
                      <Stack gap={4}>
                        <Text size="sm" fw={600}>
                          {t.publicVisitor.stepCounter
                            .replace('{current}', String(currentIndex + 1))
                            .replace('{total}', String(steps.length))
                            .replace('{label}', stepTitle(currentKey))}
                        </Text>
                        <Progress value={((currentIndex + 1) / steps.length) * 100} size="xs" radius="xl" />
                      </Stack>
                    ) : null}

                    <Stepper
                      active={currentIndex}
                      allowNextStepsSelect={false}
                      onStepClick={(i) => {
                        if (i <= currentIndex) setActive(i);
                      }}
                      iconSize={28}
                      styles={isMobile ? { steps: { display: 'none' } } : undefined}
                    >
                      <Stepper.Step label={t.publicVisitor.stepIdentity}>
                        <Stack gap="sm" mt="sm">
                          <TextInput
                            label={t.publicVisitor.name}
                            placeholder={t.publicVisitor.namePlaceholder}
                            value={name}
                            onChange={(e) => setName(e.currentTarget.value)}
                            required
                            maxLength={150}
                          />
                          <MaskedTextInput
                            label={t.publicVisitor.phone}
                            placeholder={t.publicVisitor.phonePlaceholder}
                            mask="(00) 00000-0000"
                            value={phone}
                            onAccept={(v) => setPhone(v)}
                            required
                          />
                          <Select
                            label={t.publicVisitor.howKnown}
                            placeholder={t.publicVisitor.howKnownPlaceholder}
                            data={howKnownOptions}
                            value={howKnownKey}
                            onChange={(v) => setHowKnownKey(v as HowKnownKey | null)}
                            required
                          />
                          {howKnownKey === 'other' && (
                            <TextInput
                              label={t.publicVisitor.howKnownOther}
                              placeholder={t.publicVisitor.howKnownOtherPlaceholder}
                              value={howKnownOther}
                              onChange={(e) => setHowKnownOther(e.currentTarget.value)}
                              maxLength={120}
                              required
                            />
                          )}
                        </Stack>
                      </Stepper.Step>

                      <Stepper.Step label={t.publicVisitor.stepVisit}>
                        <Stack gap="sm" mt="sm">
                          <Switch
                            label={
                              <Group gap={6}>
                                <IconHeartHandshake size={16} color="blue" />
                                <span>{t.publicVisitor.wantsVisit}</span>
                              </Group>
                            }
                            description={t.publicVisitor.wantsVisitHint}
                            checked={wantsVisit}
                            onChange={(e) => setWantsVisit(e.currentTarget.checked)}
                          />
                          {wantsVisit && (
                            <>
                              <Text size="xs" c="dimmed">{t.publicVisitor.cepHint}</Text>
                              <Group align="flex-end" gap={6}>
                                <MaskedTextInput
                                  label={t.publicVisitor.cep}
                                  placeholder={t.publicVisitor.cepPlaceholder}
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
                                <Grid.Col span={{ base: 12, sm: 8 }}>
                                  <TextInput
                                    label={t.publicVisitor.street}
                                    value={street}
                                    onChange={(e) => setStreet(e.currentTarget.value)}
                                    required
                                    maxLength={150}
                                  />
                                </Grid.Col>
                                <Grid.Col span={{ base: 12, sm: 4 }}>
                                  <TextInput
                                    label={t.publicVisitor.number}
                                    value={number}
                                    onChange={(e) => setNumber(e.currentTarget.value)}
                                    required
                                    maxLength={20}
                                  />
                                </Grid.Col>
                                <Grid.Col span={{ base: 12, sm: 6 }}>
                                  <TextInput
                                    label={t.publicVisitor.complement}
                                    placeholder={t.publicVisitor.complementPlaceholder}
                                    value={complement}
                                    onChange={(e) => setComplement(e.currentTarget.value)}
                                    maxLength={100}
                                  />
                                </Grid.Col>
                                <Grid.Col span={{ base: 12, sm: 6 }}>
                                  <TextInput
                                    label={t.publicVisitor.neighborhood}
                                    value={neighborhood}
                                    onChange={(e) => setNeighborhood(e.currentTarget.value)}
                                    required
                                    maxLength={100}
                                  />
                                </Grid.Col>
                                <Grid.Col span={{ base: 12, sm: 8 }}>
                                  <TextInput
                                    label={t.publicVisitor.city}
                                    value={city}
                                    onChange={(e) => setCity(e.currentTarget.value)}
                                    required
                                    maxLength={100}
                                  />
                                </Grid.Col>
                                <Grid.Col span={{ base: 12, sm: 4 }}>
                                  <TextInput
                                    label={t.publicVisitor.state}
                                    value={stateUf}
                                    onChange={(e) => setStateUf(e.currentTarget.value.toUpperCase().slice(0, 2))}
                                    required
                                    maxLength={2}
                                  />
                                </Grid.Col>
                              </Grid>
                            </>
                          )}
                        </Stack>
                      </Stepper.Step>

                      <Stepper.Step label={t.publicVisitor.stepReview}>
                        <Stack gap="sm" mt="sm">
                          <Text fw={600}>{t.publicVisitor.reviewTitle}</Text>
                          <Stack gap={4}>
                            <Text size="sm"><b>{t.publicVisitor.reviewName}:</b> {name.trim() || '—'}</Text>
                            <Text size="sm"><b>{t.publicVisitor.reviewPhone}:</b> {phone || '—'}</Text>
                            <Text size="sm"><b>{t.publicVisitor.reviewHowKnown}:</b> {howKnownValue || '—'}</Text>
                            <Text size="sm"><b>{t.publicVisitor.reviewWantsVisit}:</b> {wantsVisit ? t.publicVisitor.yes : t.publicVisitor.no}</Text>
                          </Stack>
                          {wantsVisit && (
                            <Stack gap={4} p="xs" style={{ borderRadius: 8, backgroundColor: 'var(--mantine-color-default-hover)' }}>
                              <Text size="xs" c="dimmed">{t.publicVisitor.reviewAddress}</Text>
                              <Text size="sm">{addressSummary || '—'}</Text>
                              {cep ? <Text size="xs" c="dimmed">CEP {cep}</Text> : null}
                            </Stack>
                          )}
                        </Stack>
                      </Stepper.Step>
                    </Stepper>

                    <Group justify="space-between" mt="xs">
                      <Button variant="subtle" onClick={goBack} disabled={currentIndex === 0 || submitting}>
                        {t.publicVisitor.back}
                      </Button>
                      {currentKey === 'review' ? (
                        <Button onClick={submit} loading={submitting} leftSection={<IconCheck size={16} />}>
                          {t.publicVisitor.submit}
                        </Button>
                      ) : (
                        <Button onClick={advance}>{t.publicVisitor.next}</Button>
                      )}
                    </Group>
                  </Stack>
                )}
              </Paper>
            </>
          )}
        </Stack>
      </Box>
    </>
  );
}
