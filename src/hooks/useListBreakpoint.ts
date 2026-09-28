import { useMediaQuery } from '@mantine/hooks';

/**
 * Query do corte em que as telas de listagem trocam tabela por cards.
 *
 * Casa com o `lg` do Mantine (62em = 992px), que e o mesmo breakpoint usado em
 * `visibleFrom="lg"` / `hiddenFrom="lg"` nas paginas de listagem. Por isso
 * `991.98px` e nao `992px`: evita a faixa morta em que nenhum dos dois lados
 * casaria.
 *
 * Use este hook (e nao o `useIsMobile`, que corta em 768px) para decidir
 * `fullScreen` de modais: um modal em tela cheia abaixo de `lg` acompanha
 * exatamente a troca tabela/cards, enquanto abaixo de 768px o modal ainda
 * estaria contido em tablets que ja estao vendo cards.
 */
export const COMPACT_LIST_QUERY = '(max-width: 991.98px)';

/**
 * `true` em celular e tablet, abaixo do corte de listagem (992px).
 *
 * Mantine le `matchMedia` durante o render, entao nao ha flash de layout
 * desktop no primeiro paint. Em SSR cai para `false`.
 */
export function useIsCompactList(): boolean {
  return useMediaQuery(COMPACT_LIST_QUERY);
}
