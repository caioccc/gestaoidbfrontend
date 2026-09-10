import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Card,
  Center,
  Container,
  Group,
  Stack,
  Text,
  ThemeIcon,
  ActionIcon,
  Menu,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconSun,
  IconMoon,
  IconLanguage,
  IconBuildingChurch,
  IconArrowLeft,
} from '@tabler/icons-react';
import { useLanguage, SupportedLocale } from '../i18n';

const LOCALES: { value: SupportedLocale; label: string }[] = [
  { value: 'pt-br', label: 'PT-BR' },
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
];

export default function AuthShell({
  children,
  maxWidth = 440,
}: {
  children: React.ReactNode;
  maxWidth?: number;
}) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { t, locale, setLocale } = useLanguage();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && colorScheme === 'dark';

  return (
    <Box bg={isDark ? 'dark.8' : 'gray.0'} mih="100vh">
      <Container size="md" py="md">
        <Group justify="space-between">
          <Group
            gap="xs"
            style={{ cursor: 'pointer' }}
            onClick={() => router.push('/')}
          >
            <ActionIcon variant="subtle">
              <IconArrowLeft size={18} />
            </ActionIcon>
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
            <ActionIcon
              variant="subtle"
              onClick={() => toggleColorScheme()}
              aria-label="toggle theme"
              size="lg"
            >
              {mounted ? (isDark ? <IconSun size={18} /> : <IconMoon size={18} />) : <IconMoon size={18} />}
            </ActionIcon>
          </Group>
        </Group>
      </Container>
      <Center px="md" style={{ minHeight: 'calc(100vh - 180px)' }}>
        <Card withBorder shadow="sm" radius="md" padding="xl" style={{ width: '100%', maxWidth }}>
          <Stack>{children}</Stack>
        </Card>
      </Center>
    </Box>
  );
}
