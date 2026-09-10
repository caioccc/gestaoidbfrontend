import React, { useEffect, useState } from 'react';
import { Center, Container, Group, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MemberCard from '../../components/MemberCard';
import { publicCardApi } from '../../api/accounts';
import { useLanguage } from '../../i18n';
import type { CardConfig, Member, PublicCardPayload } from '../../types';
import type { ChurchContact } from '../../hooks/useChurchCardConfig';
import { cardValidityDate, formatCardDate } from '../../utils/memberCard';

export default function PublicMemberCardPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const hash = typeof router.query.hash === 'string' ? router.query.hash : '';

  const [card, setCard] = useState<PublicCardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hash) return;
    let active = true;
    setLoading(true);
    setError(false);
    publicCardApi
      .get(hash)
      .then((data) => {
        if (active) setCard(data);
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
  }, [hash]);

  if (!card) {
    return (
      <Container size="sm" py="xl">
        {loading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : error ? (
          <Paper withBorder radius="md" p="xl" ta="center">
            <Text size="lg">{t.publicCard.invalid}</Text>
          </Paper>
        ) : null}
      </Container>
    );
  }

  const member = {
    id: 0,
    church: 0,
    name: card.name,
    phone: card.church_phone,
    email: '',
    birth_date: card.birth_date,
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
    card_number: card.card_number || null,
    church_entry: '',
    church_entry_display: '',
    church_entry_other: '',
    ministry_areas: [],
    ministry_areas_display: [],
    photo: card.photo,
    status: card.status,
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
  } as Member;

  const churchContact: ChurchContact = {
    pastor_name: '',
    phone: card.church_phone,
    street: '',
    number: '',
    neighborhood: '',
    city: card.church_city,
    state: card.church_state,
  };

  const config: CardConfig = {
    card_primary_color: card.card_primary_color,
    card_secondary_color: card.card_secondary_color,
    card_valid_until: card.card_valid_until,
    card_front_phrase: card.card_front_phrase,
    card_back_phrase: card.card_back_phrase,
  };

  const validity = cardValidityDate(config);

  return (
    <>
      <Head>
        <title>
          {card.church_name} • {t.publicCard.title}
        </title>
      </Head>
      <Container size="md" py="xl">
        <Stack gap="md" align="center">
          <Stack gap={2} ta="center">
            <Title order={2}>{card.church_name}</Title>
            <Text size="sm" c="dimmed">
              {t.publicCard.title}
            </Text>
          </Stack>

          <MemberCard
            member={member}
            churchName={card.church_name}
            config={config}
            churchContact={churchContact}
            hideAddress
          />

          <Paper withBorder radius="md" p="sm" w="100%" maw={400}>
            <Group gap="lg" justify="center">
              <Stack gap={0} ta="center">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  {t.publicCard.member}
                </Text>
                <Text size="sm" fw={700}>
                  {card.name}
                </Text>
              </Stack>
              {card.birth_date && (
                <Stack gap={0} ta="center">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    Nascimento
                  </Text>
                  <Text size="sm" fw={700}>
                    {card.birth_date}
                  </Text>
                </Stack>
              )}
              <Stack gap={0} ta="center">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  {t.publicCard.cardNumber}
                </Text>
                <Text size="sm" fw={700}>
                  {card.card_number || t.memberCard.notGenerated}
                </Text>
              </Stack>
              <Stack gap={0} ta="center">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  {t.publicCard.validity}
                </Text>
                <Text size="sm" fw={700}>
                  {formatCardDate(validity)}
                </Text>
              </Stack>
            </Group>
            <Text size="xs" c="dimmed" ta="center" mt="xs">
              {t.publicCard.withoutAddress}
            </Text>
          </Paper>
        </Stack>
      </Container>
    </>
  );
}