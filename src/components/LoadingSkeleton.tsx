import React from 'react';
import {
  Box,
  Card,
  Flex,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
} from '@mantine/core';

/**
 * Esqueletos de carregamento que espelham o layout real das telas.
 *
 * Regras seguidas em todo o projeto:
 * 1. Reutilizar o MESMO container do conteudo real (mesmo `SimpleGrid` com os
 *    mesmos `cols`, mesmo `Card withBorder`, mesmo `visibleFrom`/`hiddenFrom`).
 *    Assim o skeleton ocupa a mesma area e nao gera layout shift quando o dado
 *    chega.
 * 2. `radius="md"` como padrao.
 * 3. Altura em px apenas onde o conteudo real tem altura estavel. Quando a
 *    altura depende da largura da coluna (ex.: thumbnail 16:9), usar
 *    `aspectRatio` em vez de um numero fixo.
 *
 * IMPORTANTE: Skeleton NAO deve substituir `Loader` em micro-estados
 * (CEP, busca, botao exportando, contadores). Spinner continua sendo o
 * indicador correto ali porque o feedback precisa ser immediate e local.
 */

export type SkeletonTone = 'auto' | 'dark';

/**
 * Cor de fundo para telas publicas com gradiente escuro.
 *
 * O fundo usa `dark.5` (conforme decisao do projeto para paginas publicas
 * escuras) e o brilho do `Skeleton` usa `dark.4`, um tom acima do fundo, para
 * o carregamento continuar visivel sem "estourar" o contraste do gradiente.
 */
function toneColor(tone: SkeletonTone): React.CSSProperties | undefined {
  if (tone !== 'dark') return undefined;
  return {
    backgroundColor: 'var(--mantine-color-dark-5)',
    '--skeleton-background-color': 'var(--mantine-color-dark-4)',
  } as React.CSSProperties;
}

interface BaseProps {
  tone?: SkeletonTone;
}

/* -------------------------------------------------------------------------- */
/* Tabelas: o padrao dominante do projeto                                      */
/* -------------------------------------------------------------------------- */

/**
 * Esqueleto do container de lista completo, no formato padrao do projeto:
 * `<Card withBorder p={0}>` com `<Box visibleFrom>` para a tabela e
 * `<Stack hiddenFrom gap="xs" p="sm">` com os cards mobile.
 *
 * Cobre atas, cultivos, certificados, inventario, usuarios, EBD etc. — as telas
 * que repetem essa estrutura, evitando reescrever o par responsive em cada uma.
 */
export function SkeletonResponsiveTable({
  rows = 6,
  columns = 6,
  breakpoint = 'lg',
  mobileCards = 6,
  rowHeight,
  inCard = true,
}: {
  rows?: number;
  columns?: number;
  breakpoint?: string;
  mobileCards?: number;
  rowHeight?: number;
  inCard?: boolean;
}) {
  const body = (
    <>
      <Box visibleFrom={breakpoint}>
        <SkeletonTableCells rows={rows} columns={columns} rowHeight={rowHeight ?? 48} />
      </Box>
      <Stack hiddenFrom={breakpoint} gap="xs" p="sm">
        <SkeletonMobileCards count={mobileCards} />
      </Stack>
    </>
  );

  if (!inCard) return body;
  return <Card withBorder p={0}>{body}</Card>;
}

/**
 * Esqueleto de tabela sem variante mobile, para telas que renderizam apenas
 * `<Table>` dentro de um `Card withBorder p={0}`.
 */
export function SkeletonTableOnly({
  rows = 6,
  columns = 4,
  rowHeight = 48,
}: {
  rows?: number;
  columns?: number;
  rowHeight?: number;
}) {
  return <SkeletonTableCells rows={rows} columns={columns} rowHeight={rowHeight} />;
}

/**
 * Esqueleto do par `<Table visibleFrom="lg">` + `<MobileItemCard hiddenFrom="lg">`.
 *
 * Reproduz a estrutura real: cabecalho + N linhas na tabela, e N cards
 * empilhados no mobile, respeitando o mesmo breakpoint da tela.
 */
export function SkeletonTableRows({
  rows = 6,
  rowHeight = 44,
  cardHeight = 90,
  breakpoint = 'lg',
  withHeader = true,
  tone = 'auto',
}: BaseProps & {
  rows?: number;
  rowHeight?: number;
  cardHeight?: number;
  breakpoint?: string;
  withHeader?: boolean;
}) {
  return (
    <>
      <Box visibleFrom={breakpoint} p="md">
        {withHeader ? <Skeleton height={rowHeight} mb="md" radius="md" /> : null}
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} height={rowHeight} mb="sm" radius="md" />
        ))}
      </Box>
      <Stack hiddenFrom={breakpoint} gap="xs" p="sm">
        {Array.from({ length: Math.min(rows, 4) }).map((_, i) => (
          <Skeleton key={i} height={cardHeight} radius="md" />
        ))}
      </Stack>
    </>
  );
}

/**
 * Esqueleto de tabela que mantem o `<Table>` real, para telas cuja tabela tem
 * colunas visiveis desde o loading. Use quando as colunas agregam informacao
 * (ex.: data/tipo/status) e um bloco unico ficaria ambiguo.
 */
export function SkeletonTableCells({
  rows = 6,
  columns = 4,
  rowHeight = 48,
}: {
  rows?: number;
  columns?: number;
  rowHeight?: number;
}) {
  return (
    <Table verticalSpacing="sm" horizontalSpacing="md">
      <Table.Thead>
        <Table.Tr>
          {Array.from({ length: columns }).map((_, c) => (
            <Table.Th key={c}>
              <Skeleton height={14} width={`${Math.max(28, 70 - c * 8)}%`} radius="sm" />
            </Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <Table.Tr key={r}>
            {Array.from({ length: columns }).map((__, c) => (
              <Table.Td key={c}>
                <Skeleton height={rowHeight - 24} width={`${Math.max(30, 80 - c * 12)}%`} radius="sm" />
              </Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

/* -------------------------------------------------------------------------- */
/* Grids de cards                                                              */
/* -------------------------------------------------------------------------- */

/** Grid de skeletons com os mesmos `cols`/`spacing` do grid real. */
export function SkeletonCardGrid({
  count = 6,
  height = 118,
  cols,
  spacing = 'md',
  radius = 'md',
}: {
  count?: number;
  height?: number;
  cols?: Record<string, number>;
  spacing?: string;
  radius?: string;
}) {
  return (
    <SimpleGrid cols={cols} spacing={spacing}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={height} radius={radius} />
      ))}
    </SimpleGrid>
  );
}

/* -------------------------------------------------------------------------- */
/* Card de louvor / setlist                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Card de louvor no formato da galeria: midia 16:9 + titulo + artista.
 *
 * A midia usa `aspectRatio` (e nao px) de proposito: o card real tem
 * `aspect-ratio: 16 / 9`, entao a altura muda com o numero de colunas. Com px
 * fixo o skeleton ficaria com proporcao errada em cada breakpoint.
 */
export function SkeletonSongCard({
  showBadge = true,
  tone = 'auto',
}: BaseProps & {
  /** Pill de tom/banda sobreposto a midia (o card real mostra em hover/permanente). */
  showBadge?: boolean;
}) {
  return (
    <Card
      withBorder
      radius="md"
      padding={0}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Box style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9' }}>
        <Skeleton
          height="100%"
          radius={0}
          style={{ position: 'absolute', inset: 0, ...toneColor(tone) }}
        />
        {showBadge ? (
          <>
            <Skeleton
              height={18}
              width={52}
              radius="xl"
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
              }}
            />
            <Skeleton
              height={18}
              width={38}
              radius="xl"
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
              }}
            />
          </>
        ) : null}
      </Box>

      <Stack gap={4} px="sm" pb="sm" pt={8}>
        <Skeleton height={13} width="85%" radius="sm" style={toneColor(tone)} />
        <Skeleton height={11} width="55%" radius="sm" style={toneColor(tone)} />
      </Stack>
    </Card>
  );
}

/** Grid de skeletons do card de louvor, espelhando os `cols` da galeria real. */
export function SkeletonSongGallery({
  count = 12,
  cols = { base: 1, xs: 1, sm: 2, md: 3, lg: 4, xl: 6 },
  spacing = 'md',
}: {
  count?: number;
  cols?: Record<string, number>;
  spacing?: string;
}) {
  return (
    <SimpleGrid cols={cols} spacing={spacing}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonSongCard key={i} />
      ))}
    </SimpleGrid>
  );
}

/** Linha da vista de lista: thumbnail 104x59 + titulo + badges + artista. */
export function SkeletonSongListRow({ tone = 'auto' }: BaseProps) {
  return (
    <Group align="center" gap="sm" wrap="nowrap" w="100%">
      <Skeleton width={104} height={59} radius={8} style={{ flexShrink: 0, ...toneColor(tone) }} />
      <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
        <Skeleton height={14} width="40%" radius="sm" style={toneColor(tone)} />
        <Group gap={6}>
          <Skeleton height={18} width={72} radius="xl" style={toneColor(tone)} />
          <Skeleton height={18} width={72} radius="xl" style={toneColor(tone)} />
          <Skeleton height={18} width={56} radius="xl" style={toneColor(tone)} />
        </Group>
        <Skeleton height={11} width="30%" radius="sm" style={toneColor(tone)} />
      </Stack>
    </Group>
  );
}

export function SkeletonSongList({ count = 10, tone = 'auto' }: BaseProps & { count?: number }) {
  return (
    <Stack gap="xs">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonSongListRow key={i} tone={tone} />
      ))}
    </Stack>
  );
}

/**
 * Cards da visao mobile: `Paper withBorder radius="md" p="xs"` com avatar
 * circular + nome + linha de apoio, como no `MobileItemCard` das listas do
 * projeto. Usar dentro de `<Stack hiddenFrom="lg">`.
 */
export function SkeletonMobileCards({
  count = 6,
  avatarSize = 36,
  titleWidth = '45%',
  subWidth = '28%',
  tone = 'auto',
}: BaseProps & {
  count?: number;
  avatarSize?: number;
  titleWidth?: string;
  subWidth?: string;
}) {
  return (
    <Stack gap="xs">
      {Array.from({ length: count }).map((_, i) => (
        <Paper key={i} withBorder radius="md" p="xs">
          <Group align="center" gap="sm" wrap="nowrap">
            <Skeleton width={avatarSize} height={avatarSize} radius="xl" style={{ flexShrink: 0, ...toneColor(tone) }} />
            <Stack gap={5} style={{ flex: 1, minWidth: 0 }}>
              <Skeleton height={13} width={titleWidth} radius="sm" style={toneColor(tone)} />
              <Skeleton height={10} width={subWidth} radius="sm" style={toneColor(tone)} />
            </Stack>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}

/**
 * Grid de cards "entidade": icone circular + titulo + subtitulo + acao no topo
 * direito, como os cards de area/grupo/ministerio do projeto
 * (`Card withBorder p="md"` + `ThemeIcon radius="xl"` + `Menu`).
 */
export function SkeletonEntityCards({
  count = 6,
  iconSize = 42,
  cols,
  spacing = 'md',
  height = 76,
  withAction = true,
  withIcon = true,
  tone = 'auto',
}: BaseProps & {
  count?: number;
  iconSize?: number;
  cols?: Record<string, number>;
  spacing?: string;
  height?: number;
  withAction?: boolean;
  /** Desligue em cards que usam titulo + badge no lugar de um icone. */
  withIcon?: boolean;
}) {
  const cards = Array.from({ length: count }).map((_, i) => (
    <Card key={i} withBorder shadow="sm" p="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
          {withIcon ? (
            <Skeleton width={iconSize} height={iconSize} radius="xl" style={{ flexShrink: 0, ...toneColor(tone) }} />
          ) : null}
          <Stack gap={5} style={{ minWidth: 0 }}>
            <Group gap={6} wrap="nowrap">
              <Skeleton height={15} width={height * 2.4} radius="sm" style={toneColor(tone)} />
              <Skeleton height={18} width={62} radius="xl" style={{ flexShrink: 0, ...toneColor(tone) }} />
            </Group>
            <Skeleton height={10} width={height * 1.2} radius="sm" style={toneColor(tone)} />
          </Stack>
        </Group>
        {withAction ? (
          <Skeleton width={28} height={28} radius="md" style={{ flexShrink: 0, ...toneColor(tone) }} />
        ) : null}
      </Group>
    </Card>
  ));

  if (!cols) {
    return <Stack gap={spacing}>{cards}</Stack>;
  }
  return <SimpleGrid cols={cols} spacing={spacing}>{cards}</SimpleGrid>;
}

/**
 * Linha de lista com bloco de midia + textos, para cartoes horizontais cujo
 * thumbnail tem altura propria (ex.: carousel de setlist com `height={104}`).
 * `mediaWidth`/`mediaHeight` devem refletir o bloco real.
 */
export function SkeletonMediaRow({
  mediaWidth,
  mediaHeight,
  titleWidth = '45%',
  badges = 3,
  subWidth = '30%',
  tone = 'auto',
}: BaseProps & {
  mediaWidth: number | string;
  mediaHeight: number;
  titleWidth?: string;
  badges?: number;
  subWidth?: string;
}) {
  return (
    <Group align="center" gap="md" wrap="nowrap" w="100%">
      <Skeleton
        width={mediaWidth}
        height={mediaHeight}
        radius="md"
        style={{ flexShrink: 0, ...toneColor(tone) }}
      />
      <Stack gap={6} style={{ flex: '1 1 280px', minWidth: 0 }}>
        <Skeleton height={14} width={titleWidth} radius="sm" style={toneColor(tone)} />
        {badges > 0 ? (
          <Group gap={6}>
            {Array.from({ length: badges }).map((_, i) => (
              <Skeleton
                key={i}
                height={18}
                width={60 + i * 12}
                radius="xl"
                style={toneColor(tone)}
              />
            ))}
          </Group>
        ) : null}
        <Skeleton height={11} width={subWidth} radius="sm" style={toneColor(tone)} />
      </Stack>
    </Group>
  );
}

/* -------------------------------------------------------------------------- */
/* Listas genericas (modais, listas ordenadas)                                 */
/* -------------------------------------------------------------------------- */

/**
 * Linha de lista simples: barra de titulo + barra de apoio.
 * Espelha `Paper withBorder p="sm"` com `Text fw={600}` + `Text size="xs"`.
 */
export function SkeletonListRows({
  count = 5,
  height = 44,
  width = '55%',
  gap = 'xs',
  tone = 'auto',
}: BaseProps & {
  count?: number;
  height?: number;
  width?: string;
  gap?: string;
}) {
  return (
    <Stack gap={gap}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={height} width={width} radius="md" style={toneColor(tone)} />
      ))}
    </Stack>
  );
}

/** Bloco generico para painel unico (grafico, mapa, player, area de texto). */export function SkeletonPanel({
  height = 280,
  radius = 'md',
  tone = 'auto',
}: BaseProps & {
  height?: number | string;
  radius?: string;
}) {
  return <Skeleton height={height} radius={radius} style={toneColor(tone)} />;
}

/**
 * Cards de entidade identificada por cor: `Card withBorder p="md"` com um
 * quadradinho colorido (avatar/cor da banda), nome, icone de remover e uma
 * linha de apoio. Com `badgesSection`, acrescenta um `Divider` + titulo + linha
 * de badges, como nos cards de ministerios.
 */
export function SkeletonColorEntityCards({
  count = 6,
  cols,
  spacing = 'md',
  withBadge = true,
  badgesSection = false,
  badges = 3,
  tone = 'auto',
}: BaseProps & {
  count?: number;
  cols?: Record<string, number>;
  spacing?: string;
  withBadge?: boolean;
  badgesSection?: boolean;
  badges?: number;
}) {
  const cards = Array.from({ length: count }).map((_, i) => (
    <Card key={i} withBorder p="md">
      <Group justify="space-between" mb={4} wrap="nowrap" gap="xs">
        <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
          <Skeleton width={32} height={32} radius="sm" style={{ flexShrink: 0, ...toneColor(tone) }} />
          <Skeleton height={15} width={`${80 + ((i * 23) % 70)}px`} radius="sm" style={{ minWidth: 0, ...toneColor(tone) }} />
        </Group>
        <Skeleton width={28} height={28} radius="md" style={{ flexShrink: 0, ...toneColor(tone) }} />
      </Group>

      <Group gap={8} wrap="nowrap">
        <Skeleton height={11} width={96} radius="sm" style={toneColor(tone)} />
        {withBadge ? (
          <Skeleton height={16} width={68} radius="xl" style={toneColor(tone)} />
        ) : null}
      </Group>

      {badgesSection ? (
        <>
          <Skeleton height={1} my="sm" radius="sm" style={{ opacity: 0.4, ...toneColor(tone) }} />
          <Skeleton height={11} width={62} mb={4} radius="sm" style={toneColor(tone)} />
          <Group gap={4} mb={4}>
            {Array.from({ length: badges }).map((__, b) => (
              <Skeleton key={b} height={20} width={64 + b * 10} radius="xl" style={toneColor(tone)} />
            ))}
          </Group>
        </>
      ) : null}
    </Card>
  ));

  if (!cols) return <Stack gap={spacing}>{cards}</Stack>;
  return <SimpleGrid cols={cols} spacing={spacing}>{cards}</SimpleGrid>;
}

/**
 * Linha com titulo, badges e acoes a direita, usada em listas dentro de modal
 * (modelos de mensagem, documentos, itens com acao no fim da linha).
 */
export function SkeletonActionRows({
  count = 5,
  gap = 'xs',
  padding = 'xs',
  titleWidth = '40%',
  badges = 2,
  actions = 2,
  bordered = false,
  tone = 'auto',
}: BaseProps & {
  count?: number;
  gap?: string;
  padding?: string;
  titleWidth?: string;
  badges?: number;
  actions?: number;
  bordered?: boolean;
}) {
  return (
    <Stack gap={gap}>
      {Array.from({ length: count }).map((_, i) => {
        const body = (
          <Group justify="space-between" wrap="nowrap" gap="sm" p={padding}>
            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
              <Skeleton height={13} width={titleWidth} radius="sm" style={toneColor(tone)} />
              {badges > 0 ? (
                <Group gap={4}>
                  {Array.from({ length: badges }).map((__, b) => (
                    <Skeleton key={b} height={16} width={70 + b * 14} radius="sm" style={toneColor(tone)} />
                  ))}
                </Group>
              ) : null}
            </Stack>
            <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
              {Array.from({ length: actions }).map((___, a) => (
                <Skeleton key={a} width={28} height={28} radius="md" style={toneColor(tone)} />
              ))}
            </Group>
          </Group>
        );
        return bordered ? (
          <Paper key={i} withBorder radius="md" style={toneColor(tone)}>
            {body}
          </Paper>
        ) : (
          <Box key={i} style={toneColor(tone)}>
            {body}
          </Box>
        );
      })}
    </Stack>
  );
}

/**
 * Cartoes de metadados: `<Paper withBorder radius="md" p="lg">` com rotulo em
 * caixa alta e valor abaixo, repetidos em `<Group grow>`. Usado na ata publica
 * (data/tipo/local/responsavel).
 */
export function SkeletonMetaCards({
  count = 2,
  grow = true,
  tone = 'auto',
}: BaseProps & {
  count?: number;
  grow?: boolean;
}) {
  const cards = Array.from({ length: count }).map((_, i) => (
    <Paper key={i} withBorder radius="md" p="lg" style={grow ? { flex: 1 } : toneColor(tone)}>
      <Skeleton height={11} width="56%" radius="sm" mb={8} style={toneColor(tone)} />
      <Skeleton height={14} width={`${60 + ((i * 17) % 30)}%`} radius="sm" style={toneColor(tone)} />
    </Paper>
  ));

  return grow ? <Group grow>{cards}</Group> : <SimpleGrid cols={{ base: 1, sm: count }} spacing="md">{cards}</SimpleGrid>;
}

/**
 * Esqueleto da agenda publica (`PublicCalendarAgenda`): hero com logo e titulo,
 * faixa de boas-vindas, alternador grid/lista, calendario mensal
 * (`SimpleGrid cols={7}`) e rodape.
 */
export function SkeletonCalendarAgenda({ tone = 'auto' }: BaseProps) {
  return (
    <Stack gap="lg">
      <Paper withBorder radius="lg" p="lg">
        <Stack gap="md" align="center" ta="center">
          <Group gap="md" justify="center" wrap="nowrap">
            <Skeleton circle radius="xl" height={64} width={64} style={{ flexShrink: 0, ...toneColor(tone) }} />
            <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
              <Skeleton height={26} width="72%" radius="sm" style={toneColor(tone)} />
              <Skeleton height={13} width="52%" radius="sm" style={toneColor(tone)} />
            </Stack>
          </Group>
          <Skeleton height={12} width="46%" radius="sm" style={toneColor(tone)} />
          <Group gap="xs" justify="center" wrap="wrap">
            <Skeleton height={30} width={124} radius="md" style={toneColor(tone)} />
            <Skeleton height={30} width={124} radius="md" style={toneColor(tone)} />
          </Group>
        </Stack>
      </Paper>

      <Paper radius="lg" p={{ base: 'lg', sm: 'xl' }} mih={{ base: 160, sm: 180 }}>
        <Stack gap={10} maw={640} mx="auto" w="100%" mt="md">
          <Skeleton height={20} width="58%" mx="auto" radius="sm" style={toneColor(tone)} />
          <Skeleton height={13} width="82%" mx="auto" radius="sm" style={toneColor(tone)} />
          <Skeleton height={13} width="64%" mx="auto" radius="sm" style={toneColor(tone)} />
          <Group gap="xs" justify="center" wrap="wrap" mt={4}>
            <Skeleton height={18} width={116} radius="xl" style={toneColor(tone)} />
            <Skeleton height={18} width={96} radius="xl" style={toneColor(tone)} />
          </Group>
        </Stack>
      </Paper>

      <Skeleton height={36} radius="md" style={toneColor(tone)} />

      <Paper withBorder radius="md" p="md">
        <Group justify="space-between" mb="sm">
          <Skeleton width={28} height={28} radius="md" style={toneColor(tone)} />
          <Skeleton height={16} width={132} radius="sm" style={toneColor(tone)} />
          <Skeleton width={28} height={28} radius="md" style={toneColor(tone)} />
        </Group>
        <SimpleGrid cols={7} spacing={4}>
          {Array.from({ length: 7 }).map((_, w) => (
            <Skeleton key={`w-${w}`} height={13} radius="sm" style={toneColor(tone)} />
          ))}
          {Array.from({ length: 42 }).map((_, c) => (
            <Skeleton
              key={`c-${c}`}
              height={54}
              radius="sm"
              style={{
                opacity: c % 7 === 5 || c % 7 === 6 ? 0.45 : 1,
                ...toneColor(tone),
              }}
            />
          ))}
        </SimpleGrid>
      </Paper>

      <Skeleton height={11} width="48%" mx="auto" radius="sm" style={toneColor(tone)} />
    </Stack>
  );
}

/**
 * Cabecalho das paginas publicas: avatar circular + nome da igreja + linha de
 * cidade/estado. `avatarSize` acompanha o `Avatar size` da tela real para nao
 * gerar layout shift.
 */
export function SkeletonPublicHeader({
  avatarSize = 64,
  titleWidth = '58%',
  subtitleWidth = '34%',
  tone = 'auto',
}: BaseProps & {
  avatarSize?: number;
  titleWidth?: string;
  subtitleWidth?: string;
}) {
  return (
    <Stack align="center" gap="xs" mb="xs">
      <Skeleton circle radius="xl" height={avatarSize} width={avatarSize} style={toneColor(tone)} />
      <Skeleton height={22} width={titleWidth} radius="sm" mt={4} style={toneColor(tone)} />
      <Skeleton height={13} width={subtitleWidth} radius="sm" style={toneColor(tone)} />
    </Stack>
  );
}

/**
 * Link publico em `Button variant="subtle" h="auto"` com `borderRadius: 14`:
 * avatar circular de 44px ao lado de titulo (e descricao opcional). Espelha a
 * lista de links de `p/[slug]` e os cards de `gc/[slug]`.
 */
export function SkeletonPublicLinkRows({
  count = 5,
  gap = 'sm',
  withDescription = true,
  tone = 'auto',
}: BaseProps & {
  count?: number;
  gap?: string;
  withDescription?: boolean;
}) {
  return (
    <Stack gap={gap} style={{ width: '100%' }}>
      {Array.from({ length: count }).map((_, i) => (
        <Paper key={i} radius={14} p="md" style={toneColor(tone)}>
          <Group gap="md" wrap="nowrap" style={{ width: '100%' }}>
            <Skeleton circle radius="xl" height={44} width={44} style={{ flexShrink: 0, ...toneColor(tone) }} />
            <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
              <Skeleton height={14} width={`${55 + ((i * 19) % 35)}%`} radius="sm" style={toneColor(tone)} />
              {withDescription ? (
                <Skeleton height={11} width={`${35 + ((i * 23) % 40)}%`} radius="sm" style={toneColor(tone)} />
              ) : null}
            </Stack>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}

/**
 * Bloco de compartilhamento com QR: quadrado centralizado + linhas de texto +
 * linha de botoes, como o `ShareLinkModal`.
 */
export function SkeletonQrShare({
  size = 200,
  buttons = 2,
  tone = 'auto',
}: BaseProps & {
  size?: number;
  buttons?: number;
}) {
  return (
    <Stack gap="md" align="center">
      <Skeleton width={size} height={size} radius="md" style={toneColor(tone)} />
      <Stack gap={6} align="center" w="100%">
        <Skeleton height={13} width="72%" radius="sm" style={toneColor(tone)} />
        <Skeleton height={11} width="52%" radius="sm" style={toneColor(tone)} />
      </Stack>
      <Group gap="xs">
        {Array.from({ length: buttons }).map((_, i) => (
          <Skeleton key={i} height={36} width={i === 0 ? 130 : 110} radius="md" style={toneColor(tone)} />
        ))}
      </Group>
    </Stack>
  );
}

/**
 * Card de visita pastoral: `Paper withBorder p="sm"` com nome + badge de status
 * e linhas de apoio (endereco, data, observacao).
 */
export function SkeletonVisitCards({
  count = 6,
  tone = 'auto',
}: BaseProps & { count?: number }) {
  return (
    <Stack gap="xs">
      {Array.from({ length: count }).map((_, i) => (
        <Paper key={i} withBorder p="sm" radius="md" shadow="xs" style={toneColor(tone)}>
          <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs" mb={6}>
            <Skeleton height={14} width={`${110 + ((i * 31) % 100)}px`} radius="sm" style={{ flex: 1, minWidth: 0, ...toneColor(tone) }} />
            <Skeleton height={18} width={72} radius="xl" style={{ flexShrink: 0, ...toneColor(tone) }} />
          </Group>
          <Stack gap={5}>
            <Skeleton height={11} width={`${80 + ((i * 23) % 60)}%`} radius="sm" style={toneColor(tone)} />
            <Skeleton height={11} width={`${45 + ((i * 17) % 35)}%`} radius="sm" style={toneColor(tone)} />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

/**
 * Card de escala/roster: `Card withBorder p="md"` com cabecalho (data + badge
 * de status + icones de acao), linhas de metadados, tabela deicial e lista de
 * musicas do setlist.
 */
export function SkeletonRosterCards({
  count = 6,
  cols = { base: 1, md: 2, lg: 3 },
  assignments = 4,
  songs = 3,
  tone = 'auto',
}: BaseProps & {
  count?: number;
  cols?: Record<string, number>;
  assignments?: number;
  songs?: number;
}) {
  return (
    <SimpleGrid cols={cols} spacing="md">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} withBorder p="md">
          <Group justify="space-between" mb="xs" wrap="nowrap" gap="xs">
            <Skeleton height={20} width={`${100 + ((i * 17) % 60)}px`} radius="sm" style={toneColor(tone)} />
            <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
              <Skeleton height={20} width={62} radius="xl" style={toneColor(tone)} />
              <Skeleton width={28} height={28} radius="md" style={toneColor(tone)} />
              <Skeleton width={28} height={28} radius="md" style={toneColor(tone)} />
            </Group>
          </Group>

          <Stack gap={5}>
            <Skeleton height={13} width="52%" radius="sm" style={toneColor(tone)} />
            <Skeleton height={13} width="64%" radius="sm" style={toneColor(tone)} />
          </Stack>

          <Stack gap={6} mt="sm">
            {Array.from({ length: assignments }).map((__, a) => (
              <Group key={a} gap={4} wrap="nowrap">
                <Skeleton width={8} height={8} radius="xl" style={{ flexShrink: 0, ...toneColor(tone) }} />
                <Skeleton height={11} width={`${80 + ((a * 23) % 70)}px`} radius="sm" style={toneColor(tone)} />
                <Skeleton height={11} width={64} radius="sm" style={toneColor(tone)} />
                <Skeleton height={16} width={54} radius="xl" style={{ marginLeft: 'auto', ...toneColor(tone) }} />
              </Group>
            ))}
          </Stack>

          <Group justify="space-between" mt="sm" wrap="nowrap" gap="xs">
            <Skeleton height={11} width={64} radius="sm" style={toneColor(tone)} />
            <Skeleton width={24} height={24} radius="md" style={{ flexShrink: 0, ...toneColor(tone) }} />
          </Group>
          <Stack gap={4} mt={4}>
            {Array.from({ length: songs }).map((__, s) => (
              <Skeleton
                key={s}
                height={11}
                width={`${70 + ((s * 31) % 60)}%`}
                radius="sm"
                style={toneColor(tone)}
              />
            ))}
          </Stack>
        </Card>
      ))}
    </SimpleGrid>
  );
}

/**
 * Campos rotulados: `label` acima do input, como um `TextInput`/`Select` do
 * Mantine. Usar dentro de `SimpleGrid cols={{ base: 1, sm: 2 }}` para
 * reproduzir formularios de configuracao em duas colunas.
 */
export function SkeletonFormFields({
  count = 4,
  cols = { base: 1, sm: 2 },
  spacing = 'md',
  labelWidth = '45%',
  inputHeight = 36,
  showLabels = true,
  tone = 'auto',
}: BaseProps & {
  count?: number;
  cols?: Record<string, number>;
  spacing?: string;
  labelWidth?: string;
  inputHeight?: number;
  showLabels?: boolean;
}) {
  return (
    <SimpleGrid cols={cols} spacing={spacing}>
      {Array.from({ length: count }).map((_, i) => (
        <Stack key={i} gap={6}>
          {showLabels ? (
            <Skeleton height={12} width={labelWidth} radius="sm" style={toneColor(tone)} />
          ) : null}
          <Skeleton height={inputHeight} radius="md" style={toneColor(tone)} />
        </Stack>
      ))}
    </SimpleGrid>
  );
}

/**
 * Linha de link ordenavel: `Paper withBorder p="sm"` com alca de arrasto, icone
 * do tipo, titulo + subtitulo e acoes (switch + dois botoes).
 */
export function SkeletonLinkRows({
  count = 5,
  tone = 'auto',
}: BaseProps & { count?: number }) {
  return (
    <Stack gap="xs">
      {Array.from({ length: count }).map((_, i) => (
        <Paper key={i} withBorder p="sm" radius="md" shadow="xs" style={toneColor(tone)}>
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
              <Skeleton width={18} height={18} radius="sm" style={{ flexShrink: 0, ...toneColor(tone) }} />
              <Skeleton width={34} height={34} radius="md" style={{ flexShrink: 0, ...toneColor(tone) }} />
              <Stack gap={4} style={{ minWidth: 0 }}>
                <Group gap={6} wrap="nowrap">
                  <Skeleton height={13} width={`${90 + ((i * 29) % 90)}px`} radius="sm" style={{ minWidth: 0, ...toneColor(tone) }} />
                  <Skeleton height={16} width={54} radius="xl" style={{ flexShrink: 0, ...toneColor(tone) }} />
                </Group>
                <Skeleton height={10} width={`${130 + ((i * 41) % 120)}px`} radius="sm" style={{ minWidth: 0, ...toneColor(tone) }} />
              </Stack>
            </Group>
            <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
              <Skeleton width={38} height={22} radius="xl" style={toneColor(tone)} />
              <Skeleton width={28} height={28} radius="md" style={toneColor(tone)} />
              <Skeleton width={28} height={28} radius="md" style={toneColor(tone)} />
            </Group>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}

/**
 * Card de pedido de oracao na vista de lista: `Paper withBorder p="md"` com
 * linha de cabecalho (nome + badges + status) e o texto do pedido com
 * `lineClamp={3}`.
 */
export function SkeletonPrayerList({ count = 6, tone = 'auto' }: BaseProps & { count?: number }) {
  return (
    <Stack gap="sm" maw={960}>
      {Array.from({ length: count }).map((_, i) => (
        <Paper key={i} withBorder p="md" radius="md" shadow="xs" style={toneColor(tone)}>
          <Group justify="space-between" align="flex-start" mb="xs" wrap="nowrap" gap="xs">
            <Group gap="xs" wrap="wrap" style={{ minWidth: 0, flex: 1 }}>
              <Skeleton height={14} width={`${110 + ((i * 23) % 70)}px`} radius="sm" style={toneColor(tone)} />
              <Skeleton height={10} width={70} radius="sm" style={toneColor(tone)} />
              <Skeleton height={18} width={78} radius="xl" style={toneColor(tone)} />
            </Group>
            <Skeleton height={18} width={86} radius="xl" style={{ flexShrink: 0, ...toneColor(tone) }} />
          </Group>
          <Stack gap={6}>
            <Skeleton height={12} width="100%" radius="sm" style={toneColor(tone)} />
            <Skeleton height={12} width="92%" radius="sm" style={toneColor(tone)} />
            <Skeleton height={12} width="64%" radius="sm" style={toneColor(tone)} />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

/**
 * Kanban de pedidos de oracao: `SimpleGrid` com uma coluna por status, cada
 * uma com cabecalho (ponto colorido + titulo + badge) e N cards.
 */
export function SkeletonPrayerKanban({
  columns = 4,
  cardsPerColumn = 3,
  cols = { base: 1, sm: 2, lg: 4 },
  tone = 'auto',
}: BaseProps & {
  columns?: number;
  cardsPerColumn?: number;
  cols?: Record<string, number>;
}) {
  return (
    <SimpleGrid cols={cols} spacing="sm">
      {Array.from({ length: columns }).map((_, c) => (
        <Stack key={c} gap="xs">
          <Paper p="xs" withBorder>
            <Group justify="space-between">
              <Group gap={6}>
                <Skeleton width={10} height={10} radius="xl" style={toneColor(tone)} />
                <Skeleton height={14} width={`${58 + ((c * 17) % 40)}px`} radius="sm" style={toneColor(tone)} />
              </Group>
              <Skeleton height={18} width={30} radius="xl" style={toneColor(tone)} />
            </Group>
          </Paper>
          <Stack gap="xs">
            {Array.from({ length: cardsPerColumn }).map((__, k) => (
              <Card key={k} withBorder radius="md" p="xs">
                <Stack gap={6}>
                  <Group gap="xs" wrap="nowrap" align="flex-start">
                    <Skeleton
                      width={24}
                      height={24}
                      radius="xl"
                      style={{ flexShrink: 0, ...toneColor(tone) }}
                    />
                    <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                      <Skeleton height={12} width={`${50 + ((k * 19) % 35)}%`} radius="sm" style={toneColor(tone)} />
                      <Skeleton height={10} width="34%" radius="sm" style={toneColor(tone)} />
                    </Stack>
                  </Group>
                  <Skeleton height={10} width="100%" radius="sm" style={toneColor(tone)} />
                  <Skeleton height={10} width="72%" radius="sm" style={toneColor(tone)} />
                </Stack>
              </Card>
            ))}
          </Stack>
        </Stack>
      ))}
    </SimpleGrid>
  );
}

/**
 * Esqueleto do calendario, no formato `SimpleGrid cols={7}` com cabecalho de
 * dia da semana e celulas com numero do dia + badges de evento.
 *
 * `view` espelha as tres exibicoes reais:
 *  - `month`: grade 7 colunas com celula de 70px
 *  - `week`:  colunas com min-height 120px e varios badges
 *  - `day`:   timeline em lista
 */
export function SkeletonCalendarBoard({
  view = 'month',
  weekDays = 7,
  cells = 35,
  cellMinHeight = 70,
  columnMinHeight = 120,
}: {
  view?: 'month' | 'week' | 'day';
  weekDays?: number;
  cells?: number;
  cellMinHeight?: number;
  columnMinHeight?: number;
}) {
  if (view === 'day') {
    return (
      <Stack gap="xs">
        <Skeleton height={12} width={110} radius="sm" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Group key={i} gap="xs" wrap="nowrap" align="flex-start">
            <Skeleton height={12} width={44} radius="sm" style={{ flexShrink: 0, marginTop: 6 }} />
            <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
              <Skeleton height={30} radius="md" />
              {i % 2 === 0 ? <Skeleton height={30} radius="md" /> : null}
            </Stack>
          </Group>
        ))}
      </Stack>
    );
  }

  const isMonth = view === 'month';

  return (
    <SimpleGrid cols={weekDays} spacing={isMonth ? 4 : 8}>
      {Array.from({ length: weekDays }).map((_, i) => (
        <Skeleton
          key={`h${i}`}
          height={11}
          radius="sm"
          style={{ marginBottom: isMonth ? 0 : 4 }}
        />
      ))}

      {Array.from({ length: isMonth ? cells : weekDays }).map((_, i) => (
        <Paper
          key={`c${i}`}
          withBorder
          p={4}
          style={{
            minHeight: isMonth ? cellMinHeight : columnMinHeight,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Group justify="space-between" align="flex-start" wrap="nowrap" gap={2}>
            <Skeleton
              height={14}
              width={18}
              radius="sm"
              style={{ margin: '0 auto' }}
            />
            {isMonth && i % 5 === 0 ? <Skeleton height={12} width={12} radius="sm" /> : null}
          </Group>
          <Stack gap={2} px={2} mt={2}>
            {Array.from({ length: isMonth ? 2 : 4 }).map((__, b) => (
              <Skeleton
                key={b}
                height={16}
                radius="xl"
                style={{ opacity: b > 0 ? 0.7 : 1 }}
              />
            ))}
          </Stack>
        </Paper>
      ))}
    </SimpleGrid>
  );
}

/**
 * Esqueleto de board/kanban: colunas de largura fixa com cabecalho (titulo +
 * badge de contagem) e N cards, dentro de um `ScrollArea` horizontal.
 * Espelha o funil de membros (`Paper w={290}` + cards com avatar e nome).
 */
export function SkeletonKanbanBoard({
  columns = 6,
  cardsPerColumn = 3,
  columnWidth = 290,
  columnMinHeight = 180,
  withActionRow = true,
  tone = 'auto',
}: BaseProps & {
  columns?: number;
  cardsPerColumn?: number;
  columnWidth?: number;
  columnMinHeight?: number;
  withActionRow?: boolean;
}) {
  return (
    <Box>
      {withActionRow ? (
        <Group justify="space-between" mb="sm">
          <Skeleton height={16} width={220} radius="sm" style={toneColor(tone)} />
          <Skeleton height={26} width={54} radius="xl" style={toneColor(tone)} />
        </Group>
      ) : null}
      <ScrollArea scrollbars="x" pb="md" type="never">
        <Flex gap="md" align="flex-start">
          {Array.from({ length: columns }).map((_, c) => (
            <Paper
              key={c}
              withBorder
              radius="md"
              p="sm"
              style={{
                width: columnWidth,
                flexShrink: 0,
                minHeight: columnMinHeight,
                backgroundColor:
                  tone === 'dark'
                    ? 'var(--mantine-color-dark-6)'
                    : 'var(--mantine-color-gray-1)',
              }}
            >
              <Group justify="space-between" mb="sm">
                <Skeleton height={14} width={`${50 + ((c * 11) % 35)}%`} radius="sm" style={toneColor(tone)} />
                <Skeleton height={20} width={38} radius="xl" style={toneColor(tone)} />
              </Group>
              <Stack gap="xs">
                {Array.from({ length: cardsPerColumn }).map((__, r) => (
                  <Paper key={r} withBorder radius="md" p="sm" shadow="xs">
                    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                      <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                        <Skeleton width={10} height={18} radius="sm" style={{ flexShrink: 0, ...toneColor(tone) }} />
                        <Skeleton width={28} height={28} radius="xl" style={{ flexShrink: 0, ...toneColor(tone) }} />
                        <Skeleton height={13} width={`${45 + ((r * 17) % 30)}%`} radius="sm" style={{ minWidth: 0, ...toneColor(tone) }} />
                      </Group>
                      <Skeleton width={28} height={28} radius="md" style={{ flexShrink: 0, ...toneColor(tone) }} />
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          ))}
        </Flex>
      </ScrollArea>
    </Box>
  );
}

/**
 * Card de distribuicao: `Card withBorder p="md"` com titulo e N pares
 * rotulo/contagem seguidos de barra de progresso, como o `DistributionCard`
 * dos relatorios de membros.
 */
export function SkeletonDistributionCards({
  count = 6,
  bars = 4,
  cols = { base: 1, sm: 2, lg: 3 },
  spacing = 'md',
}: {
  count?: number;
  bars?: number;
  cols?: Record<string, number>;
  spacing?: string;
}) {
  return (
    <SimpleGrid cols={cols} spacing={spacing}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} withBorder shadow="sm" p="md">
          <Skeleton height={15} width="62%" mb="sm" radius="sm" />
          <Stack gap="xs">
            {Array.from({ length: bars }).map((__, b) => (
              <Box key={b}>
                <Group justify="space-between" gap="xs" mb={2}>
                  <Skeleton height={12} width={`${45 + ((b * 13) % 30)}%`} radius="sm" />
                  <Skeleton height={12} width={22} radius="sm" />
                </Group>
                <Skeleton height={6} radius="xl" />
              </Box>
            ))}
          </Stack>
        </Card>
      ))}
    </SimpleGrid>
  );
}

/**
 * Esqueleto de `<Accordion variant="separated">`: N itens, cada um com a barra
 * do `Accordion.Control` e as linhas do `Accordion.Panel` abaixo.
 */
export function SkeletonAccordionRows({
  items = 3,
  panelRows = 4,
  panelColumns = 3,
}: {
  items?: number;
  panelRows?: number;
  panelColumns?: number;
}) {
  return (
    <Stack gap="sm">
      {Array.from({ length: items }).map((_, i) => (
        <Paper key={i} withBorder radius="md" p="md">
          <Skeleton height={16} width={`${38 + i * 9}%`} radius="sm" />
          <Stack gap={6} mt="sm">
            {Array.from({ length: panelRows }).map((__, r) => (
              <Group key={r} gap="xs" wrap="nowrap">
                {Array.from({ length: panelColumns }).map((___, c) => (
                  <Skeleton
                    key={c}
                    height={12}
                    width={`${c === 0 ? 30 : 18}%`}
                    radius="sm"
                    style={{ flexShrink: 0 }}
                  />
                ))}
              </Group>
            ))}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

/**
 * Cards de KPI: `Paper withBorder p="sm"` com `ThemeIcon size="lg"` ao lado de
 * rotulo em caixa alta + valor em `size="xl"`, como o `KpiCard` do projeto.
 */
export function SkeletonKpiRow({
  count = 4,
  cols = { base: 2, md: 4 },
  spacing = 'sm',
  iconSize = 42,
  withHint = false,
}: {
  count?: number;
  cols?: Record<string, number>;
  spacing?: string;
  iconSize?: number;
  withHint?: boolean;
}) {
  return (
    <SimpleGrid cols={cols} spacing={spacing}>
      {Array.from({ length: count }).map((_, i) => (
        <Paper key={i} withBorder p="sm" radius="md">
          <Group gap="sm" wrap="nowrap">
            <Skeleton width={iconSize} height={iconSize} radius="md" style={{ flexShrink: 0 }} />
            <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
              <Skeleton height={11} width="70%" radius="sm" />
              <Skeleton height={24} width="45%" mt={6} radius="sm" />
              {withHint ? <Skeleton height={10} width="85%" mt={6} radius="sm" /> : null}
            </Stack>
          </Group>
        </Paper>
      ))}
    </SimpleGrid>
  );
}

/**
 * Cabecalho de pagina: titulo + subtitulo, espelhando o `PageHeader` real.
 * `width`/`subWidth` sao strings para respeitar o `%` do layout real.
 */
export function SkeletonPageHeader({
  width = '38%',
  subWidth = '22%',
}: {
  width?: string;
  subWidth?: string;
}) {
  return (
    <Stack gap={6}>
      <Skeleton height={24} width={width} radius="sm" />
      <Skeleton height={13} width={subWidth} radius="sm" />
    </Stack>
  );
}
