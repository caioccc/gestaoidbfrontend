import {
  Alert,
  Badge,
  Group,
  List,
  Stack,
  Text,
} from '@mantine/core';
import { IconAlertTriangle, IconFileSpreadsheet, IconCheck } from '@tabler/icons-react';
import { ImportResult } from '../types';
import { useLanguage } from '../i18n';

function fileImportedCount(label: string, result: ImportResult): number | null {
  if (label.includes('modelo_entradas')) return result.entries_imported;
  if (label.includes('modelo_saidas')) return result.exits_imported;
  if (label.includes('membros_dizimistas')) return result.tithers_imported;
  return null;
}

export default function ImportErrorsPanel({ result }: { result: ImportResult }) {
  const { t } = useLanguage();
  const byFile = result.errors_by_file;

  if (!byFile || Object.keys(byFile).length === 0) {
    if (result.errors?.length > 0) {
      return (
        <Alert
          icon={<IconAlertTriangle size={16} />}
          color="yellow"
          title={t.importPage.errorsTitle}
          w="100%"
        >
          <List size="sm">
            {result.errors.slice(0, 20).map((e, i) => (
              <List.Item key={i}>{e}</List.Item>
            ))}
          </List>
        </Alert>
      );
    }
    return null;
  }

  const entries = Object.entries(byFile);

  return (
    <Stack w="100%" gap="md">
      <Group gap="xs" wrap="wrap">
        {entries.map(([label, errs]) => {
          const count = errs.length;
          const imported = fileImportedCount(label, result);
          return (
            <Badge
              key={label}
              variant="light"
              color={count > 0 ? 'red' : 'green'}
              size="lg"
              rightSection={
                <Text size="xs" fw={700} span>
                  {count > 0 ? count : t.importPage.ok}
                </Text>
              }
            >
              {imported != null
                ? `${label}: ${imported} ${t.importPage.rowsImported}`
                : label}
            </Badge>
          );
        })}
      </Group>

      {entries.map(([label, errs]) => {
        const imported = fileImportedCount(label, result);
        if (errs.length === 0) {
          return (
            <Alert
              key={label}
              icon={<IconCheck size={16} />}
              color="green"
              title={`${label}: ${t.importPage.ok}`}
              w="100%"
            >
              {imported != null
                ? `${imported} ${t.importPage.rowsImported} ${t.importPage.fullfileOk}`
                : ''}
            </Alert>
          );
        }
        return (
          <Alert
            key={label}
            icon={<IconFileSpreadsheet size={16} />}
            color="red"
            title={label}
            w="100%"
          >
            <List size="sm">
              {errs.slice(0, 20).map((e, i) => (
                <List.Item key={i}>{e}</List.Item>
              ))}
            </List>
          </Alert>
        );
      })}
    </Stack>
  );
}