import React from 'react';
import { useRouter } from 'next/router';
import {
  Badge,
  Box,
  Group,
  Skeleton,
  Text,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import { IconBuildingChurch } from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { useCurrentChurch } from '../hooks/useCurrentChurch';
import { useAuth, useRoleHelpers } from '../contexts/AuthContext';

const SEGMENT_KEYS: Record<string, string> = {
  dashboard: 'dashboard',
  import: 'import',
  entries: 'entries',
  exits: 'exits',
  tithers: 'tithers',
  closings: 'closings',
  reports: 'reports',
  dre: 'dre',
  statement: 'statement',
  validation: 'validation',
  calendar: 'calendar',
  cultos: 'cultos',
  atas: 'minutes',
  inventory: 'inventory',
  settings: 'settings',
  approvals: 'approvals',
  members: 'members',
  'members-reports': 'memberReports',
  users: 'users',
  churches: 'churches',
};

function flatSectionFromPathname(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  return last && SEGMENT_KEYS[last] !== undefined ? last : null;
}

const GLOBAL_PAGES = [
  '/admin/churches',
  '/churches',
  '/approvals',
  '/login',
  '/register',
  '/404',
];

export default function ContentContextHeader() {
  const { t } = useLanguage();
  const router = useRouter();
  const { church, loading } = useCurrentChurch();
  const { user } = useAuth();
  const { canFinance } = useRoleHelpers(user);

  const qChurch = router.query.churchId;
  const qCong = router.query.congregationId;
  const adminScope = !!(qChurch && !Array.isArray(qChurch));
  const congScope = !!(qCong && !Array.isArray(qCong));
  const scope = adminScope || congScope;

  if (GLOBAL_PAGES.includes(router.pathname)) return null;

  const qSection = router.query.section;
  const section =
    (qSection && !Array.isArray(qSection) ? qSection : null) ??
    flatSectionFromPathname(router.pathname);

  if (loading) {
    return (
      <Box
        px="md"
        py="xs"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
      >
        <Skeleton height={28} width={380} radius="sm" />
      </Box>
    );
  }

  if (!church || !section) return null;

  const isSede = church.church_type === 'INDEPENDENT';
  const badge = isSede ? t.churchesPage.sede : t.churchesPage.congregation;
  const sectionLabel = (t.nav as Record<string, string>)[section] ?? section;

  const rootCrumb = scope
    ? {
        label: adminScope ? t.adminChurches.title : t.nav.churches,
        href: adminScope ? '/admin/churches' : '/churches',
      }
    : section !== 'dashboard'
      ? {
          label: canFinance ? t.nav.dashboard : t.secretaryDashboard.title,
          href: '/dashboard',
        }
      : null;

  const separator = (
    <Text c="dimmed" size="sm" component="span">
      ›
    </Text>
  );

  return (
    <Box
      px="md"
      py={6}
      mb="lg"
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
        backgroundColor: 'var(--mantine-color-default-hover)',
      }}
    >
      <Group justify="space-between" gap="md" wrap="wrap">
        <Group gap={6} wrap="wrap" miw={0}>
          {rootCrumb && (
            <>
              <UnstyledButton
                onClick={() => router.push(rootCrumb.href)}
                style={{ color: 'var(--mantine-color-dimmed)', fontSize: 'var(--mantine-font-size-sm)' }}
              >
                {rootCrumb.label}
              </UnstyledButton>
              {separator}
            </>
          )}

          <Group gap={6} wrap="nowrap" miw={0}>
            <ThemeIcon color={isSede ? 'blue' : 'teal'} variant="light" size="sm">
              <IconBuildingChurch size={14} />
            </ThemeIcon>
            <Text size="sm" fw={600} truncate maw={240}>
              {church.name}
            </Text>
          </Group>

          {separator}

          <Text size="sm" fw={700}>
            {sectionLabel}
          </Text>
        </Group>

        <Badge color={isSede ? 'blue' : 'teal'} variant="light" size="sm">
          {badge}
        </Badge>
      </Group>
    </Box>
  );
}