import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import {
  Box,
  Card,
  Center,
  Container,
  Group,
  Stack,
  Text,
  ActionIcon,
  Menu,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconSun,
  IconMoon,
  IconLanguage,
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
            <Image
              src="/android-icon-192x192.png"
              alt="Gestão IDB"
              width={32}
              height={32}
              style={{ objectFit: 'contain', borderRadius: 6 }}
              priority
            />
            <Box style={{ lineHeight: 1.15 }} miw={0}>
              <Text fw={800} size="md" c="blue" lh={1.1}>
                {t.appTitle}
              </Text>
              <Text
                size="xs"
                c="dimmed"
                tt="uppercase"
                fw={700}
                lh={1.1}
                style={{ letterSpacing: '0.08em' }}
              >
                Igreja de Deus
              </Text>
            </Box>
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
