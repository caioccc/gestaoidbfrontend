import { ActionIcon, Button, Grid, Group, Paper, Select, Stack, Text, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import MaskedTextInput from './MaskedTextInput';
import { useLanguage } from '../i18n';
import type { Kinship } from '../types';

/** Valor de um parente no formulário. Espelha `RelativeForm` nos dois
 *  formularios que consomem esta seção (modal da secretaria e formulário
 *  público), por isso o tipo vive aqui. */
export interface RelativeFormValue {
  name: string;
  kinship: Kinship | '';
  birth_date: Date | null;
  phone: string;
}

interface RelativesFormSectionProps {
  relatives: RelativeFormValue[];
  /**
   * Mensagens de erro indexadas por posição, ex.: `relatives.0.name`.
   * O tipo do `useForm` do Mantine aceita `ReactNode`, então o mapa é tipado
   * como `ReactNode` para repassar direto ao `error` dos inputs.
   */
  errors: Record<string, React.ReactNode>;
  kinshipOptions: { value: string; label: string }[];
  locale: string;
  /** Aplica em `TextInput`, `Select` e no botão de remover. */
  readOnly?: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: <K extends keyof RelativeFormValue>(
    index: number,
    field: K,
    value: RelativeFormValue[K],
  ) => void;
  /** Prefixo dos `data-testid`, para não colidir entre os dois formulários. */
  testIdPrefix: string;
}

/**
 * Seção "Parentes" do cadastro de membros.
 *
 * Cada parente é um `Paper` próprio: no desktop os quatro campos ficam numa
 * linha só, mas no mobile empilham em uma grade de 2 colunas. Antes eles
 * compartilhavam um `Group` com `wrap="nowrap"` e `flex` proporcional, o que
 * espremia os inputs a ponto de cortar os rótulos e dificultar o toque.
 */
export default function RelativesFormSection({
  relatives,
  errors,
  kinshipOptions,
  locale,
  readOnly = false,
  onAdd,
  onRemove,
  onChange,
  testIdPrefix,
}: RelativesFormSectionProps) {
  const { t } = useLanguage();

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text fw={600} size="sm">
          {t.membersPage.relatives}
        </Text>
        {!readOnly && (
          <Button
            size="xs"
            variant="light"
            leftSection={<IconPlus size={14} />}
            onClick={onAdd}
            data-testid={`${testIdPrefix}-add-relative`}
          >
            {t.membersPage.addRelative}
          </Button>
        )}
      </Group>

      {relatives.length === 0 ? (
        // Borda pontilhada para o estado vazio não competir com os cards reais.
        <Paper withBorder p="md" radius="md" style={{ borderStyle: 'dashed' }}>
          <Text size="sm" c="dimmed">
            {t.membersPage.relativesEmpty}
          </Text>
        </Paper>
      ) : (
        <Stack gap="sm">
          {relatives.map((r, i) => (
            <Paper key={i} withBorder p="md" radius="md" data-testid={`${testIdPrefix}-relative-${i}`}>
              <Text size="xs" c="dimmed" mb="xs">
                {t.membersPage.relativeItemLabel.replace('{n}', String(i + 1))}
              </Text>
              {/* `gap` (não `gutter`): Mantine v9 renomeou a prop. */}
              <Grid align="flex-end" gap="xs">
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <TextInput
                    label={t.membersPage.relativeName}
                    readOnly={readOnly}
                    error={errors[`relatives.${i}.name`]}
                    value={r.name}
                    onChange={(e) => onChange(i, 'name', e.currentTarget.value)}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, md: 3 }}>
                  <Select
                    label={t.membersPage.relativeKinship}
                    placeholder={t.membersPage.relativeKinship}
                    data={kinshipOptions}
                    disabled={readOnly}
                    error={errors[`relatives.${i}.kinship`]}
                    value={r.kinship}
                    onChange={(v) =>
                      onChange(i, 'kinship', (v as Kinship) || ('' as Kinship | ''))
                    }
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, md: 2 }}>
                  <DateInput
                    label={t.membersPage.birthDate}
                    locale={locale}
                    valueFormat="DD/MM/YYYY"
                    clearable
                    readOnly={readOnly}
                    value={r.birth_date}
                    onChange={(value) =>
                      onChange(i, 'birth_date', value as Date | null)
                    }
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 9, md: 2 }}>
                  <MaskedTextInput
                    label={t.membersPage.phone}
                    mask="(00) 00000-0000"
                    readOnly={readOnly}
                    value={r.phone}
                    onAccept={(value: string) => onChange(i, 'phone', value)}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 3, md: 1 }} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {!readOnly && (
                    <ActionIcon
                      color="red"
                      variant="light"
                      onClick={() => onRemove(i)}
                      data-testid={`${testIdPrefix}-remove-relative-${i}`}
                      aria-label={t.membersPage.removeRelative}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  )}
                </Grid.Col>
              </Grid>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
