import React from 'react';
import { Stack, Text, Paper, Table, ScrollArea, Badge, Group } from '@mantine/core';
import { useLanguage } from '../i18n';
import { SpreadsheetInspection } from '../types';

type MatchKind = 'entries' | 'exits' | 'tithers';

interface ColumnPreviewProps {
  kind: MatchKind;
  inspection: SpreadsheetInspection | null;
  mapping: Record<string, string>;
  label: string;
}

export default function ColumnPreview({ inspection, mapping, label }: ColumnPreviewProps) {
  const { t } = useLanguage();

  if (!inspection) {
    return null;
  }

  const mappedCols = inspection.expected
    .map((col) => {
      const real = mapping[col.key];
      if (!real) return null;
      const index = inspection.headers.indexOf(real);
      return { col, real, index };
    })
    .filter((m): m is { col: (typeof inspection.expected)[number]; real: string; index: number } => m !== null);

  if (mappedCols.length === 0) {
    return (
      <Paper withBorder p="md" radius="md">
        <Text size="sm" c="dimmed">
          {t.importPage.mappingPreviewNoData}
        </Text>
      </Paper>
    );
  }

  const rows = inspection.rows ?? [];

  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between" mb="xs" wrap="wrap">
        <Text size="sm" fw={600}>
          {label}
        </Text>
        <Badge variant="light" color="blue">
          {mappedCols.length} {t.importPage.mappingMapped}
        </Badge>
      </Group>
      <Text size="xs" c="dimmed" mb="sm">
        {t.importPage.mappingPreviewDesc}
      </Text>
      <ScrollArea>
        <Table withTableBorder withColumnBorders highlightOnHover miw={420} style={{ tableLayout: 'auto' }}>
          <Table.Thead>
            <Table.Tr>
              {mappedCols.map(({ col, real }) => (
                <Table.Th key={col.key}>
                  {real}
                  <Text size="xs" c="dimmed" fw={500}>
                    {col.label}
                  </Text>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={mappedCols.length} ta="center" c="dimmed">
                  {t.importPage.mappingPreviewNoRows}
                </Table.Td>
              </Table.Tr>
            ) : (
              rows.map((row, ri) => (
                <Table.Tr key={ri}>
                  {mappedCols.map(({ col, index }) => (
                    <Table.Td key={col.key}>
                      {index >= 0 && index < row.length ? row[index] : ''}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
}
