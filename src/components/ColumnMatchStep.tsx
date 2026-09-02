import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Stack,
  Text,
  Paper,
  Title,
  Badge,
  Alert,
  Group,
  Select,
  Loader,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconListCheck,
  IconAlertTriangle,
  IconCheck,
} from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { SpreadsheetInspection } from '../types';

type MatchKind = 'entries' | 'exits' | 'tithers';

interface ColumnMatchStepProps {
  kind: MatchKind;
  file: File;
  label: string;
  inspect: (kind: MatchKind, file: File) => Promise<SpreadsheetInspection>;
  value: Record<string, string>;
  onChange: (mapping: Record<string, string>) => void;
  onComplete: (complete: boolean) => void;
  onInspection?: (kind: MatchKind, inspection: SpreadsheetInspection) => void;
}

export default function ColumnMatchStep({
  kind,
  file,
  label,
  inspect,
  value,
  onChange,
  onComplete,
  onInspection,
}: ColumnMatchStepProps) {
  const { t } = useLanguage();
  const [inspection, setInspection] = useState<SpreadsheetInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(false);
  const lastComplete = useRef<boolean | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let active = true;
    setLoading(true);
    inspect(kind, file)
      .then((data) => {
        if (!active) return;
        setInspection(data);
        onInspection?.(kind, data);
        const next = { ...value };
        for (const col of data.expected) {
          if (data.suggested?.[col.key] && !next[col.key]) {
            next[col.key] = data.suggested[col.key];
          }
        }
        onChange(next);
      })
      .catch((err: any) => {
        if (!active) return;
        notifications.show({
          color: 'red',
          title: 'Erro',
          message:
            err?.response?.data?.detail || 'Não foi possível ler os cabeçalhos da planilha.',
        });
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          mounted.current = true;
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, file]);

  const isComplete = useMemo(() => {
    if (!inspection) return null;
    const incomplete = inspection.expected
      .filter((col) => col.required)
      .some((col) => !value[col.key]);
    return !incomplete;
  }, [inspection, value]);

  useEffect(() => {
    if (isComplete === null || !mounted.current) return;
    if (lastComplete.current !== isComplete) {
      lastComplete.current = isComplete;
      onCompleteRef.current(isComplete);
    }
  }, [isComplete]);

  const setField = useCallback(
    (key: string, real: string | null) => {
      const next = { ...value };
      if (!real) delete next[key];
      else next[key] = real;
      onChange(next);
    },
    [value, onChange]
  );

  const requiredCount = inspection?.expected.filter((c) => c.required).length ?? 0;
  const mappedCount = Object.keys(value).filter(
    (k) => inspection?.expected.some((c) => c.key === k)
  ).length;

  if (loading) {
    return (
      <Stack align="center" py="xl">
        <Loader />
        <Text size="sm" c="dimmed">
          {t.importPage.mappingLoading}
        </Text>
      </Stack>
    );
  }

  if (!inspection) {
    return (
      <Alert icon={<IconAlertTriangle size={16} />} color="red">
        {t.importPage.mappingError}
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <Title order={5} data-testid={`mapping-title-${kind}`}>
          {label}
        </Title>
        <Group gap="xs">
          <Badge variant="light" color="blue">
            {mappedCount}/{inspection.expected.length} {t.importPage.mappingMapped}
          </Badge>
          <Badge variant="light" color={mappedCount >= requiredCount ? 'green' : 'gray'}>
            {mappedCount >= requiredCount ? t.importPage.mappingOk : t.importPage.mappingIncomplete}
          </Badge>
        </Group>
      </Group>

      <Alert icon={<IconListCheck size={16} />} color="blue" variant="light">
        {t.importPage.mappingHint}
      </Alert>

      <Paper withBorder p="md" radius="md">
        <Stack gap="xs">
          {inspection.expected.map((col) => {
            const options = inspection.headers
              .filter((h) => h)
              .map((h) => ({ value: h, label: h }));
            return (
              <Stack key={col.key} gap={2}>
                <Text size="sm" fw={col.required ? 700 : 500}>
                  {col.label}
                  {col.required && (
                    <Text span c="red" ml={4}>
                      *
                    </Text>
                  )}
                </Text>
                <Select
                  data-testid={`mapping-select-${kind}-${col.key}`}
                  placeholder={t.importPage.mappingSelectPlaceholder}
                  data={options}
                  value={value[col.key] ?? null}
                  onChange={(v) => setField(col.key, v)}
                  clearable
                  searchable
                />
                {!col.required && (
                  <Text size="xs" c="dimmed">
                    {t.importPage.mappingOptional}
                  </Text>
                )}
              </Stack>
            );
          })}
        </Stack>
      </Paper>

      {mappedCount < requiredCount && (
        <Alert icon={<IconCheck size={16} />} color="yellow">
          {t.importPage.mappingRequiredPending}
        </Alert>
      )}
    </Stack>
  );
}
