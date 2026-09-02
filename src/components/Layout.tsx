import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  AppShell,
  Burger,
  Group,
  Text,
  ThemeIcon,
  ActionIcon,
  UnstyledButton,
  Box,
  ScrollArea,
  Flex,
  Menu,
  Avatar,
  useMantineColorScheme,
  Tooltip,
  Badge,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconLayoutDashboard,
  IconUpload,
  IconArrowUpCircle,
  IconArrowDownCircle,
  IconUsers,
  IconCalendarStats,
  IconReport,
  IconChartBar,
  IconWallet,
  IconCalendarEvent,
  IconSettings,
  IconShieldCheck,
  IconClipboardCheck,
  IconSun,
  IconMoon,
  IconLogout,
  IconLanguage,
  IconChevronDown,
} from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage, SupportedLocale } from '../i18n';

const LOCALES: { value: SupportedLocale; label: string }[] = [
  { value: 'pt-br', label: 'PT-BR' },
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
];

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  adminOnly?: boolean;
  keepAbsolute?: boolean;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useLanguage();
  const router = useRouter();
  const { user } = useAuth();

  // Usar router.query.churchId (valor resolvido, ex.: "7") em vez de
  // fazer parse de router.pathname — que no Next.js contém o placeholder
  // literal "[churchId]" e desfazeria a base de navegação.
  const q = router.query.churchId;
  const adminChurchId = q && !Array.isArray(q) ? String(q) : null;
  const basePath = adminChurchId ? `/admin/churches/${adminChurchId}` : '';

  const nav = (href: string) => (basePath ? `${basePath}${href}` : href);
  const isActive = (href: string) => {
    if (adminChurchId) {
      return router.asPath.replace(/\/$/, '') === nav(href).replace(/\/$/, '');
    }
    return router.pathname === href;
  };

  const hasChurch = !!user?.church;
  const isAdminWithoutChurch = !!user?.is_staff && !hasChurch;
  // Um admin (aprovador) sem igreja só vê as seções de gestão financeira
  // quando está dentro de uma igreja específica. Na lista de igrejas,
  // aparece apenas o menu "Igrejas".
  const showChurchSections = !isAdminWithoutChurch || !!adminChurchId;

  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: t.section.overview,
      items: [
        { label: t.nav.dashboard, icon: <IconLayoutDashboard size={18} />, href: '/dashboard' },
        { label: t.nav.import, icon: <IconUpload size={18} />, href: '/import' },
      ],
    },
    {
      title: t.section.ledger,
      items: [
        { label: t.nav.entries, icon: <IconArrowUpCircle size={18} />, href: '/entries' },
        { label: t.nav.exits, icon: <IconArrowDownCircle size={18} />, href: '/exits' },
        { label: t.nav.tithers, icon: <IconUsers size={18} />, href: '/tithers' },
        { label: t.nav.closings, icon: <IconCalendarStats size={18} />, href: '/closings' },
      ],
    },
    {
      title: t.section.reports,
      items: [
        { label: t.nav.reports, icon: <IconReport size={18} />, href: '/reports' },
        { label: t.nav.dre, icon: <IconChartBar size={18} />, href: '/dre' },
        { label: t.nav.statement, icon: <IconWallet size={18} />, href: '/statement' },
        { label: t.nav.validation, icon: <IconClipboardCheck size={18} />, href: '/validation' },
      ],
    },
    {
      title: t.section.secretary,
      items: [
        { label: t.nav.calendar, icon: <IconCalendarEvent size={18} />, href: '/calendar' },
      ],
    },
    ...(showChurchSections
      ? [
          {
            title: t.section.settings,
            items: [
              { label: t.nav.settings, icon: <IconSettings size={18} />, href: '/settings' },
            ],
          },
        ]
      : []),
    ...(user?.is_staff
      ? [
          {
            title: t.adminChurches.title,
            items: [
              {
                label: t.adminChurches.title,
                icon: <IconShieldCheck size={18} />,
                href: '/admin/churches',
                adminOnly: true,
                keepAbsolute: true,
              } as NavItem,
            ],
          },
        ]
      : []),
  ];

  return (
    <ScrollArea>
      <Flex direction="column" gap={4} p="xs">
        {sections
          .filter(
            (section) =>
              section.title === t.adminChurches.title || showChurchSections
          )
          .map((section) => (
          <Box key={section.title} mb="xs">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" px="xs" mb={4}>
              {section.title}
            </Text>
            {section.items.map((item) => {
              const href = item.keepAbsolute ? item.href : nav(item.href);
              const active = isActive(item.href);
              return (
                <UnstyledButton
                  key={item.href}
                  onClick={() => {
                    router.push(href);
                    onNavigate?.();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--mantine-radius-sm)',
                    backgroundColor: active
                      ? 'var(--mantine-primary-color-light)'
                      : 'transparent',
                    color: active
                      ? 'var(--mantine-primary-color-light-color)'
                      : 'var(--mantine-color-dimmed)',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <ThemeIcon
                    variant={active ? 'filled' : 'subtle'}
                    color={active ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-dimmed)'}
                    size="sm"
                  >
                    {item.icon}
                  </ThemeIcon>
                  <Text size="sm">{item.label}</Text>
                </UnstyledButton>
              );
            })}
          </Box>
        ))}
      </Flex>
    </ScrollArea>
  );
}

function HeaderControls() {
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { locale, setLocale } = useLanguage();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && colorScheme === 'dark';

  return (
    <Group gap="xs">
      <Menu shadow="md" width={140}>
        <Menu.Target>
          <ActionIcon variant="subtle" aria-label="language" size="lg">
            <IconLanguage size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {LOCALES.map((l) => (
            <Menu.Item
              key={l.value}
              onClick={() => setLocale(l.value)}
              style={{ fontWeight: locale === l.value ? 700 : 400 }}
            >
              {l.label}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>

      <Tooltip label={mounted ? (isDark ? 'Light' : 'Dark') : 'Dark'}>
        <ActionIcon variant="subtle" onClick={() => toggleColorScheme()} aria-label="toggle theme" size="lg">
          {mounted ? (isDark ? <IconSun size={18} /> : <IconMoon size={18} />) : <IconMoon size={18} />}
        </ActionIcon>
      </Tooltip>

      {user && (
        <Menu shadow="md" width={220}>
          <Menu.Target>
            <UnstyledButton>
              <Flex align="center" gap={8}>
                <Avatar size="sm" radius="xl" color="blue">
                  {user.name?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Box style={{ textAlign: 'left' }} w={130} visibleFrom="sm">
                  <Text size="sm" fw={600} truncate>
                    {user.name}
                  </Text>
                  {user.is_staff ? (
                    <Badge size="xs" color="grape" variant="light">
                      Admin
                    </Badge>
                  ) : (
                    <Text size="xs" c="dimmed" truncate>
                      {user.church?.name}
                    </Text>
                  )}
                </Box>
                <IconChevronDown size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
              </Flex>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            {user.is_staff && !user.church ? (
              <Menu.Item leftSection={<IconShieldCheck size={14} />} onClick={() => router.push('/admin/churches')}>
                {t.adminChurches.back}
              </Menu.Item>
            ) : (
              <Menu.Item leftSection={<IconSettings size={14} />} onClick={() => router.push('/settings')}>
                {t.section.settings}
              </Menu.Item>
            )}
            <Menu.Divider />
            <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={logout}>
              {t.logout}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const isMobile = useMediaQuery('(max-width: 60em)');

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 270,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Flex align="center" gap={8}>
              <ThemeIcon size="md" radius="md" color="blue" variant="filled">
                <IconLayoutDashboard size={16} />
              </ThemeIcon>
              <Text fw={800} size="lg">
                Financeiro{' '}
                <Text component="span" c="blue" fw={800}>
                  IDB
                </Text>
              </Text>
            </Flex>
          </Group>
          <HeaderControls />
        </Group>
      </AppShell.Header>

      {isMobile ? (
        <AppShell.Navbar p="xs">
          <SidebarContent onNavigate={close} />
        </AppShell.Navbar>
      ) : (
        <AppShell.Navbar p="xs">
          <SidebarContent />
        </AppShell.Navbar>
      )}

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
