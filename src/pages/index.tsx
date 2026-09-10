import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Box,
  Button,
  Container,
  Group,
  Text,
  Title,
  ThemeIcon,
  SimpleGrid,
  Card,
  Stack,
  Flex,
  ActionIcon,
  Menu,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconArrowRight,
  IconFileSpreadsheet,
  IconScale,
  IconUpload,
  IconReport,
  IconSun,
  IconMoon,
  IconLanguage,
  IconBuildingChurch,
} from '@tabler/icons-react';
import { useLanguage, SupportedLocale } from '../i18n';
import { useAuth } from '../contexts/AuthContext';

const LOCALES: { value: SupportedLocale; label: string }[] = [
  { value: 'pt-br', label: 'PT-BR' },
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
];

const FEATURE_ICONS = [IconFileSpreadsheet, IconUpload, IconScale, IconReport];

export default function LandingPage() {
  const { t, locale, setLocale } = useLanguage();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && colorScheme === 'dark';

  useEffect(() => {
    if (!isAuthenticated) return;
    // se já estiver logado, o acesso ao painel fica no CTA
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, router]);

  const handleDashboard = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    router.push(user?.is_staff ? '/admin/churches' : '/dashboard');
  };

  return (
    <>
      <Head>
        <title>Gestão IDB - Sistema Integrado de Gestão Eclesial</title>
      </Head>
      <Box bg={isDark ? 'dark.8' : 'gray.0'} mih="100vh">
        {/* Header */}
        <Box component="header">
          <Container size="xl" py="md">
            <Group justify="space-between">
              <Group gap="xs">
                <ThemeIcon size="md" radius="md" color="blue" variant="filled">
                  <IconBuildingChurch size={18} />
                </ThemeIcon>
                <Text fw={800} size="lg" c="blue">
                  {t.appTitle}
                </Text>
              </Group>
              <Group gap="xs">
                <Menu shadow="md" width={140}>
                  <Menu.Target>
                    <ActionIcon variant="subtle" data-testid="index-language-toggle" aria-label="language" size="lg">
                      <IconLanguage size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {LOCALES.map((l) => (
                      <Menu.Item
                        key={l.value}
                        data-testid={`index-locale-${l.value}`}
                        onClick={() => setLocale(l.value)}
                        style={{ fontWeight: locale === l.value ? 700 : 400 }}
                      >
                        {l.label}
                      </Menu.Item>
                    ))}
                  </Menu.Dropdown>
                </Menu>
                <ActionIcon variant="subtle" data-testid="index-theme-toggle" onClick={() => toggleColorScheme()} aria-label="toggle theme" size="lg">
                  {mounted ? (isDark ? <IconSun size={18} /> : <IconMoon size={18} />) : <IconMoon size={18} />}
                </ActionIcon>
                <Button
                  variant="default"
                  data-testid="index-login"
                  onClick={() => router.push('/login')}
                  visibleFrom="xs"
                >
                  {t.login}
                </Button>
                <Button data-testid="index-register" onClick={() => router.push('/register')}>{t.register}</Button>
              </Group>
            </Group>
          </Container>
        </Box>

        {/* Hero */}
        <Container size="xl" py={60}>
          <Stack align="center" gap="md" maw={760} mx="auto" ta="center">
            <Title order={1} fw={900} style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)' }}>
              {t.landing.heroTitle}
            </Title>
            <Text size="lg" c="dimmed" maw={640} mx="auto">
              {t.landing.heroSubtitle}
            </Text>
            <Group mt="md">
              <Button size="lg" rightSection={<IconArrowRight size={18} />} data-testid="index-dashboard" onClick={handleDashboard}>
                {isAuthenticated ? t.accessDashboard : t.landing.ctaLogin}
              </Button>
              <Button
                size="lg"
                variant="default"
                data-testid="index-register-cta"
                onClick={() => router.push('/register')}
                visibleFrom="sm"
              >
                {t.landing.ctaRegister}
              </Button>
            </Group>
          </Stack>

          {/* Features */}
          <Stack mt={70} gap="md">
            <Title order={3} ta="center">
              {t.landing.featuresTitle}
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" mt="sm">
              {t.landing.features.map((feature, i) => {
                const Icon = FEATURE_ICONS[i] ?? IconFileSpreadsheet;
                return (
                  <Card key={i} withBorder shadow="sm" padding="lg" radius="md">
                    <Group wrap="nowrap" align="flex-start">
                      <ThemeIcon size="lg" radius="md" color="blue" variant="light">
                        <Icon size={22} />
                      </ThemeIcon>
                      <Text>{feature}</Text>
                    </Group>
                  </Card>
                );
              })}
            </SimpleGrid>
          </Stack>
        </Container>

        {/* Footer */}
        <Box component="footer" py="lg">
          <Container size="xl">
            <DividerFooter />
            <Flex justify="space-between" align="center" wrap="wrap" gap="sm">
              <Text size="sm" c="dimmed">
                © {new Date().getFullYear()} Gestão IDB
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                {t.landing.footer}
              </Text>
            </Flex>
          </Container>
        </Box>
      </Box>
    </>
  );
}

function DividerFooter() {
  return (
    <Box
      mb="sm"
      style={(theme) => ({
        height: 1,
        background: theme.colors.gray[3],
      })}
    />
  );
}
