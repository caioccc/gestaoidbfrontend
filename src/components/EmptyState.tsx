import React from 'react';
import { Center, Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import type { MantineColor } from '@mantine/core';

/**
 * Estado vazio padronizado do app.
 *
 * Antes cada tela escrevia o proprio bloco (`Center h={160}` + `Text c="dimmed"`
 * + as vezes um `ThemeIcon size={48}` solto), o que gerava quatro problemas:
 *
 * 1. altura arbitraria por call site (`h={100}`, `h={120}`, `h={160}`, `h={200}`,
 *    `py="xl"`), entao trocar o texto acabou quebrando o layout em varias telas;
 * 2. icone nem sempre presente, e quando presente com tamanho/raio/cores
 *    diferentes em cada tela;
 * 3. sem espaco para um texto de apoio que explique o proximo passo;
 * 4. sem acao: a maioria dos estados vazios nao oferecia botao nenhum.
 *
 * Este componente centraliza os quatro. O texto continua vindo do i18n da
 * propria tela (`t.music.noSongs`, `t.membersPage.empty`), entao o padrao `t.*`
 * continua greppavel e cada dominio fala a propria lingua.
 *
 * Como usar:
 *
 *   // lista vazia de verdade, dentro de um card que a tela ja desenhou
 *   <EmptyState
 *     variant="center"
 *     icon={<IconMusic size={24} />}
 *     title={t.music.noSongs}
 *     hint={t.music.noSongsHint}
 *   />
 *
 *   // tela sem container proprio: o componente traz o Paper
 *   <EmptyState icon={<IconUsersGroup size={24} />} title={t.membersPage.empty} />
 *
 *   // acao: so inclua `action` quando a tela nao tem a acao primaria no header.
 *   // Se ja existe "Adicionar" no topo, o botao aqui fica duplicado.
 *   action={<Button leftSection={<IconPlus size={16} />} onClick={openCreate}>...</Button>}
 *
 * O `icon` recebe o `Icon*` cru porque o `ThemeIcon` (fundo suave, raio grande)
 * e criado aqui: e ele que mantem tamanho, raio e cor iguais em todas as telas.
 */
export type EmptyStateVariant = 'panel' | 'center' | 'inline' | 'compact';

export interface EmptyStateProps {
  /** Titulo do estado vazio. Use a chave da tela (`t.music.noSongs`). */
  title: string;
  /** Segunda linha: o que o usuario pode fazer dali (ex.: `emptyHint`). */
  hint?: string;
  /** Icone Tabler cru, ex.: `<IconMusic size={24} />`. O `ThemeIcon` e interno. */
  icon?: React.ReactNode;
  /** Botao de chamada. Deixe de fora quando a tela ja tem a acao no header. */
  action?: React.ReactNode;
  /**
   * - `panel` (padrao): traz `Paper` com borda. Use quando a tela nao tem
   *   container proprio para o estado vazio.
   * - `center`: so centraliza e reserva altura minima. Use DENTRO de um
   *   `Paper`/`Card` que a tela ja desenhou, para nao criar borda dupla.
   * - `inline`: linha horizontal alinhada a esquerda. Use em sub-secoes de
   *   formulario (ex.: parentes), onde o vazio e um aviso e nao o assunto.
   * - `compact`: micro-estado (cards do dashboard, colunas, badges).
   */
  variant?: EmptyStateVariant;
  /** Altura minima da area central. Padrao 160 (era `Center h={160}`). */
  minHeight?: number | string;
  /** Cor do `ThemeIcon`. Padrao `gray`. */
  color?: MantineColor;
  /** Borda tracejada, para o vazio nao competir com os cards reais. */
  dashed?: boolean;
}

function ActionSlot({ action }: { action?: React.ReactNode }) {
  if (!action) return null;
  return <div style={{ marginTop: 'var(--mantine-spacing-xs)' }}>{action}</div>;
}

export default function EmptyState({
  title,
  hint,
  icon,
  action,
  variant = 'panel',
  minHeight,
  color = 'gray',
  dashed = false,
}: EmptyStateProps) {
  const dashedBorder = dashed ? { borderStyle: 'dashed' as const } : undefined;

  if (variant === 'inline') {
    return (
      <Paper withBorder p="md" radius="md" style={dashedBorder}>
        <Group align="center" gap="xs" wrap="nowrap">
          {icon && (
            <ThemeIcon size={24} radius="xl" color={color} variant="light">
              {icon}
            </ThemeIcon>
          )}
          <Stack gap={2} style={{ flex: 1 }}>
            <Text size="sm" fw={500}>
              {title}
            </Text>
            {hint && (
              <Text size="xs" c="dimmed">
                {hint}
              </Text>
            )}
          </Stack>
          {action}
        </Group>
      </Paper>
    );
  }

  if (variant === 'compact') {
    return (
      <Stack gap={4} align="center">
        {icon && (
          <ThemeIcon size={32} radius="xl" color={color} variant="light">
            {icon}
          </ThemeIcon>
        )}
        <Text size="sm" c="dimmed" ta="center">
          {title}
        </Text>
        {hint && (
          <Text size="xs" c="dimmed" ta="center" maw={340}>
            {hint}
          </Text>
        )}
        <ActionSlot action={action} />
      </Stack>
    );
  }

  const centered = (
    <Center style={{ minHeight: minHeight ?? 160 }}>
      <Stack gap="xs" align="center" w="100%">
        {icon && (
          <ThemeIcon size={48} radius="xl" color={color} variant="light">
            {icon}
          </ThemeIcon>
        )}
        <Text size="md" fw={500} ta="center">
          {title}
        </Text>
        {hint && (
          <Text size="sm" c="dimmed" ta="center" maw={340}>
            {hint}
          </Text>
        )}
        <ActionSlot action={action} />
      </Stack>
    </Center>
  );

  if (variant === 'center') return centered;

  return (
    <Paper withBorder p="md" radius="md" style={dashedBorder}>
      {centered}
    </Paper>
  );
}
