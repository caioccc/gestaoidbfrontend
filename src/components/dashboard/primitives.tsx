import React from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconMinus,
} from '@tabler/icons-react';

export type DashboardTone =
  | 'teal'
  | 'emerald'
  | 'red'
  | 'rose'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'grape'
  | 'orange'
  | 'cyan'
  | 'gray';

export function SkeletonCards({ count, height = 118 }: { count: number; height?: number }) {
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, md: count > 4 ? 4 : count }} spacing="lg">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} height={height} radius="md" />
      ))}
    </SimpleGrid>
  );
}

export function SkeletonPanel({ height = 280 }: { height?: number }) {
  return <Skeleton height={height} radius="md" />;
}

export function SectionCard({
  title,
  description,
  color,
  icon,
  action,
  loading,
  skeletonHeight = 280,
  children,
  minHeight,
}: {
  title: string;
  description?: string;
  color?: DashboardTone;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  loading?: boolean;
  skeletonHeight?: number;
  minHeight?: number;
  children: React.ReactNode;
}) {
  return (
    <Paper withBorder radius="md" p="lg" shadow="sm" style={{ minHeight }}>
      <Group justify="space-between" align="flex-start" wrap="nowrap" mb="md" gap="sm">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          {icon ? (
            <ThemeIcon color={color ?? 'blue'} variant="light" size="lg" radius="md">
              {icon}
            </ThemeIcon>
          ) : null}
          <Box style={{ minWidth: 0 }}>
            <Text fw={700} size="md" lineClamp={1}>{title}</Text>
            {description ? (
              <Text c="dimmed" size="xs" lineClamp={2}>{description}</Text>
            ) : null}
          </Box>
        </Group>
        {action ? <Box style={{ flexShrink: 0 }}>{action}</Box> : null}
      </Group>
      {loading ? <SkeletonPanel height={skeletonHeight} /> : children}
    </Paper>
  );
}

export function KpiCard({
  label,
  value,
  icon,
  color = 'blue',
  trend,
  hint,
  footer,
  loading,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: DashboardTone;
  trend?: number | null;
  hint?: string;
  footer?: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <Paper
      withBorder
      radius="md"
      p="lg"
      shadow="sm"
      style={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 120ms ease',
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <Stack gap={4} style={{ minWidth: 0 }}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700} lineClamp={1}>
            {label}
          </Text>
          {loading ? (
            <Skeleton height={30} width={120} mt={4} />
          ) : (
            <Text fw={800} size="clamp(1.15rem, 2.4vw, 1.5rem)" lineClamp={1}>
              {value}
            </Text>
          )}
          {loading ? (
            <Skeleton height={12} width={90} mt={6} />
          ) : trend !== undefined && trend !== null ? (
            <TrendBadge value={trend} />
          ) : hint ? (
            <Text size="xs" c="dimmed" lineClamp={1}>{hint}</Text>
          ) : null}
        </Stack>
        <ThemeIcon color={color} variant="light" size={44} radius="md" style={{ flexShrink: 0 }}>
          {icon}
        </ThemeIcon>
      </Group>
      {!loading && footer ? (
        <Box mt="sm" pt="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
          {footer}
        </Box>
      ) : null}
    </Paper>
  );

  if (!onClick) return body;
  return (
    <UnstyledButton onClick={onClick} style={{ display: 'block', height: '100%' }}>
      {body}
    </UnstyledButton>
  );
}

export function TrendBadge({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const neutral = Math.abs(value) < 0.05;
  const positive = value > 0;
  const color = neutral ? 'gray' : positive ? 'teal' : 'red';
  const Icon = neutral ? IconMinus : positive ? IconArrowUpRight : IconArrowDownRight;

  return (
    <Badge
      color={color}
      variant="light"
      size="sm"
      leftSection={<Icon size={12} />}
      style={{ alignSelf: 'flex-start' }}
    >
      {positive ? '+' : ''}
      {value.toFixed(1)}
      {suffix}
    </Badge>
  );
}

export function StatBadge({
  label,
  color = 'gray',
  variant = 'light',
}: {
  label: string;
  color?: DashboardTone;
  variant?: 'light' | 'dot' | 'outline' | 'filled';
}) {
  return (
    <Badge color={color} variant={variant} size="sm">
      {label}
    </Badge>
  );
}

export interface QuickAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: DashboardTone;
  onClick: () => void;
  disabled?: boolean;
}

export function QuickActionsGroup({ actions }: { actions: QuickAction[] }) {
  return (
    <Group gap="xs" wrap="wrap">
      {actions.map((action) => (
        <Button
          key={action.key}
          variant="light"
          color={action.color}
          leftSection={action.icon}
          onClick={action.onClick}
          disabled={action.disabled}
          size="xs"
        >
          {action.label}
        </Button>
      ))}
    </Group>
  );
}

export function FeedRow({
  icon,
  color = 'gray',
  title,
  description,
  trailing,
  onClick,
  action,
  actionLabel,
}: {
  icon: React.ReactNode;
  color?: DashboardTone;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <Group gap="sm" wrap="nowrap" p="xs" style={{ borderRadius: 'var(--mantine-radius-sm)' }}>
      <ThemeIcon color={color} variant="light" size="md" radius="md" style={{ flexShrink: 0 }}>
        {icon}
      </ThemeIcon>
      <Box style={{ flex: 1, minWidth: 0 }}>
        {onClick ? (
          <UnstyledButton onClick={onClick} w="100%" style={{ textAlign: 'left' }}>
            <Text size="sm" fw={500} lineClamp={1}>{title}</Text>
          </UnstyledButton>
        ) : (
          <Text size="sm" fw={500} lineClamp={1}>{title}</Text>
        )}
        {description ? (
          <Text size="xs" c="dimmed" lineClamp={1}>{description}</Text>
        ) : null}
      </Box>
      {trailing}
      {action && actionLabel ? (
        <Tooltip label={actionLabel} withArrow>
          <ActionIcon
            variant="subtle"
            color="green"
            size="sm"
            aria-label={actionLabel}
            onClick={action}
          >
            {icon}
          </ActionIcon>
        </Tooltip>
      ) : null}
    </Group>
  );
}

export function EmptyState({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <Center h={140}>
      <Stack gap="xs" align="center">
        {icon}
        <Text c="dimmed" size="sm" ta="center">
          {label}
        </Text>
      </Stack>
    </Center>
  );
}
