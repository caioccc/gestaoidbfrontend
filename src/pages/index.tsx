import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Group,
  List,
  Menu,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconArrowRight,
  IconBuildingChurch,
  IconCashBanknote,
  IconCheck,
  IconDeviceMobile,
  IconLanguage,
  IconMoon,
  IconMusic,
  IconShieldCheck,
  IconSun,
  IconUsers,
} from '@tabler/icons-react';
import { useLanguage, SupportedLocale } from '../i18n';
import { useAuth } from '../contexts/AuthContext';

const LOCALES: { value: SupportedLocale; label: string }[] = [
  { value: 'pt-br', label: 'PT-BR' },
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
];

const TRUST_ICONS = [IconShieldCheck, IconDeviceMobile, IconUsers] as const;
const TRUST_COLORS = ['teal', 'blue', 'violet'] as const;

const PILLARS = [
  { key: 'secretariat' as const, icon: IconUsers, color: 'cyan' },
  { key: 'ministry' as const, icon: IconMusic, color: 'grape' },
  { key: 'finance' as const, icon: IconCashBanknote, color: 'teal' },
];

export default function LandingPage() {
  const { t, locale, setLocale } = useLanguage();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && colorScheme === 'dark';

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
                <Image
                  src="/apple-icon-180x180.png"
                  alt="Gestão IDB"
                  width={32}
                  height={32}
                  style={{ objectFit: 'contain', borderRadius: 6 }}
                  priority
                />
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
          <Stack align="center" gap="md" maw={900} mx="auto" ta="center">
            <Badge size="lg" variant="light" color="blue" radius="xl" px="lg" py="sm">
              {t.landingPage.badge}
            </Badge>
            <Title order={1} fw={900} style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)' }} maw={820}>
              {t.landingPage.title}
            </Title>
            <Text
              variant="gradient"
              gradient={{ from: 'blue', to: 'grape', deg: 135 }}
              fw={800}
              style={{ fontSize: 'clamp(1.15rem, 2.6vw, 1.6rem)' }}
            >
              {t.landingPage.titleHighlight}
            </Text>
            <Text size="lg" c="dimmed" maw={720} mx="auto">
              {t.landingPage.subtitle}
            </Text>
            <Group mt="md" justify="center" wrap="wrap">
              <Button size="lg" rightSection={<IconArrowRight size={18} />} data-testid="index-dashboard" onClick={handleDashboard}>
                {isAuthenticated ? t.accessDashboard : t.landingPage.ctaLogin}
              </Button>
              <Button
                size="lg"
                variant="default"
                leftSection={<IconBuildingChurch size={18} />}
                data-testid="index-register-cta"
                onClick={() => router.push('/register')}
                visibleFrom="sm"
              >
                {t.landingPage.ctaRegister}
              </Button>
            </Group>
          </Stack>

          {/* Trust bar */}
          <Paper withBorder radius="md" p="md" mt={70}>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
              {t.landingPage.trustBar.map((item, i) => {
                const Icon = TRUST_ICONS[i] ?? IconShieldCheck;
                const color = TRUST_COLORS[i] ?? 'teal';
                return (
                  <Stack key={item.label} gap={4} align="center" ta="center" p="sm">
                    <ThemeIcon size="lg" radius="xl" color={color} variant="light">
                      <Icon size={20} />
                    </ThemeIcon>
                    <Text fw={700} size="sm">
                      {item.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {item.description}
                    </Text>
                  </Stack>
                );
              })}
            </SimpleGrid>
          </Paper>

          {/* Pillars */}
          <Stack mt={80} gap="md">
            <Title order={3} ta="center">
              {t.landingPage.pillarsHeadline}
            </Title>
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" mt="sm">
              {PILLARS.map((p) => {
                const data = t.landingPage.pillars[p.key];
                const Icon = p.icon;
                return (
                  <Card key={p.key} withBorder shadow="sm" padding="xl" radius="md">
                    <Stack gap="md">
                      <ThemeIcon size="xl" radius="md" color={p.color} variant="light">
                        <Icon size={28} />
                      </ThemeIcon>
                      <Text fw={800} size="lg">
                        {data.title}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {data.description}
                      </Text>
                      <List
                        spacing="sm"
                        size="sm"
                        icon={
                          <IconCheck size={16} style={{ color: 'var(--mantine-color-teal-6)' }} />
                        }
                      >
                        {data.items.map((it) => (
                          <List.Item key={it}>{it}</List.Item>
                        ))}
                      </List>
                    </Stack>
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
              <Group gap={10} align="center" wrap="nowrap">
                <Image
                  src="/android-icon-192x192.png"
                  alt="Igreja de Deus no Brasil"
                  width={120}
                  height={28}
                  style={{ height: 28, width: 'auto', opacity: 0.8 }}
                />
                <Text size="sm" c="dimmed" ta="center">
                  {t.landingPage.footer}
                </Text>
              </Group>
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