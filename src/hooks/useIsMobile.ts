import { useMediaQuery } from '@mantine/hooks';

/**
 * Query mobile usada na dashboard e nas demais telas de listagem.
 *
 * `<= 768px` em vez de `768px` para nao deixar faixa morta entre 768 e 769.
 */
export const MOBILE_QUERY = '(max-width: 768px)';

/**
 * `true` em celulares/tablets estreitos (<= 768px).
 *
 * Mantine le `matchMedia` durante o render (nao em `useEffect`), entao nao ha
 * flash de layout desktop no primeiro paint. Em SSR cai para `false`, o que e
 * seguro porque o hydrate Happens antes do primeiro frame util.
 */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}
