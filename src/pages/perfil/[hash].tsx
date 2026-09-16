import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconBrandWhatsapp,
  IconBuildingChurch,
  IconCheck,
  IconDownload,
  IconShieldCheck,
} from '@tabler/icons-react';
import { publicMemberProfileApi } from '../../api/accounts';
import type { PublicMemberProfile } from '../../types';
import { useLanguage } from '../../i18n';
import { buildWhatsAppUrl } from '../../utils/whatsapp';
import { downloadVcf, memberPublicProfileUrl } from '../../utils/memberCard';

export default function PublicMemberProfilePage() {
  const { t } = useLanguage();
  const { colorScheme } = useMantineColorScheme();
  const router = useRouter();
  const hash = typeof router.query.hash === 'string' ? router.query.hash : '';

  const [data, setData] = useState<PublicMemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hash) return;
    let active = true;
    setLoading(true);
    setError(false);
    publicMemberProfileApi
      .get(hash)
      .then((payload) => {
        if (active) setData(payload);
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

  const profileUrl = hash ? memberPublicProfileUrl(hash) : '';

  const isActive = data?.status === 'ACTIVE';

  const handleSaveContact = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await downloadVcf({
        name: data.name,
        phone: data.whatsapp,
        photo: data.photo,
        note: profileUrl,
      });
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head>
        <title>{data ? `${data.name} • ${data.church.name}` : t.perfil.title}</title>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
      </Head>
      <Box
        data-testid="perfil-page"
        style={{
          minHeight: '100vh',
          background: `linear-gradient(180deg, #0f1115 0%, ${
            colorScheme === 'dark' ? '#1A1B1E' : '#f8f9fa'
          } 36%)`,
        }}
      >
        {loading && (
          <Center h="60vh">
            <Loader size="lg" color="white" />
          </Center>
        )}

        {error && (
          <Center h="70vh">
            <Stack align="center" gap="xs">
              <IconBuildingChurch size={40} style={{ color: '#adb5bd' }} />
              <Text fw={600}>{t.perfil.notFound}</Text>
            </Stack>
          </Center>
        )}

        {data && (
          <Box pb="xl">
            <Stack align="center" pt="xl" pb="lg" px="md" gap="xs">
              {data.church.logo ? (
                <Avatar src={data.church.logo} size={64} radius="xl" />
              ) : (
                <Avatar size={64} radius="xl" color="gray">
                  <IconBuildingChurch size={32} color="#fff" />
                </Avatar>
              )}
              <Title
                order={3}
                c="white"
                ta="center"
                data-testid="perfil-church-name"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}
              >
                {data.church.name}
              </Title>
              <Text
                c="white"
                size="sm"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
              >
                {data.church.city} — {data.church.state}
              </Text>
            </Stack>

            <Center px="md">
              <Paper withBorder radius="lg" shadow="sm" p="lg" maw={520} w="100%">
                <Stack gap="md" align="center">
                  {data.photo ? (
                    <Avatar
                      data-testid="perfil-photo"
                      src={data.photo}
                      size={120}
                      radius="50%"
                    />
                  ) : (
                    <Avatar data-testid="perfil-photo" size={120} radius="50%" color="teal">
                      <Text fz={40} fw={700}>
                        {data.name.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </Avatar>
                  )}

                  <Stack gap={2} align="center" ta="center">
                    <Title order={2} data-testid="perfil-holder-name">
                      {data.name}
                    </Title>
                    {data.role_title && (
                      <Text size="sm" fw={600} c="dimmed">
                        {data.role_title}
                      </Text>
                    )}
                  </Stack>

                  {data.ministry_areas.length > 0 && (
                    <Group gap={6} justify="center" wrap="wrap">
                      {data.ministry_areas.map((area) => (
                        <Badge key={area} variant="light" color="teal" size="sm">
                          {area}
                        </Badge>
                      ))}
                    </Group>
                  )}

                  <Badge
                    data-testid="perfil-communion-badge"
                    color={isActive ? 'green' : 'gray'}
                    variant="filled"
                    size="lg"
                    radius="sm"
                    fullWidth
                    style={{ justifyContent: 'center' }}
                    leftSection={isActive ? <IconCheck size={14} /> : undefined}
                  >
                    {isActive ? t.perfil.communionBadge : data.status_label || data.status}
                  </Badge>

                  {(data.member_since || data.valid_until) && (
                    <Group gap="lg" justify="center">
                      {data.member_since && (
                        <Stack gap={0} align="center">
                          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                            {t.perfil.memberSince}
                          </Text>
                          <Text size="sm" fw={700}>
                            {data.member_since}
                          </Text>
                        </Stack>
                      )}
                      {data.valid_until && (
                        <Stack gap={0} align="center">
                          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                            {t.perfil.validUntil}
                          </Text>
                          <Text size="sm" fw={700}>
                            {data.valid_until}
                          </Text>
                        </Stack>
                      )}
                    </Group>
                  )}

                  <Stack gap="sm" w="100%" maw={360}>
                    <Button
                      data-testid="perfil-save-contact"
                      variant="gradient"
                      gradient={{ from: 'teal', to: 'green' }}
                      fullWidth
                      leftSection={<IconDownload size={16} />}
                      loading={saving}
                      onClick={handleSaveContact}
                    >
                      {t.perfil.saveContact}
                    </Button>
                    {data.whatsapp && (
                      <Button
                        data-testid="perfil-whatsapp"
                        component="a"
                        href={buildWhatsAppUrl(data.whatsapp, '')}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="green"
                        variant="light"
                        fullWidth
                        leftSection={<IconBrandWhatsapp size={16} />}
                      >
                        {t.perfil.speakWhatsapp}
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Paper>
            </Center>

            <Center py="lg">
              <Text size="xs" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconShieldCheck size={14} />
                {t.perfil.verifiedBy}
              </Text>
            </Center>
          </Box>
        )}
      </Box>
    </>
  );
}