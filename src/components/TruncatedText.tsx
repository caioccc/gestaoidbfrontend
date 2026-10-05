import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Text, Tooltip } from '@mantine/core';
import type { TextProps } from '@mantine/core';

/**
 * Corte elegante de texto longo com tooltip apenas quando o corte aconteceu.
 *
 * O problema que resolve: um `Text` com `truncate`/`lineClamp` dentro de um
 * `Group wrap="nowrap"` impede o container de crescer, e o espaco que sobrou
 * some da linha do lado. Na pratica o efeito e pior que o corte: o titulo
 * empurra o botao e o badge para fora da linha, ou o proprio botao e espremido
 * ate sumir. Foi o que apareceu com "Kleber Lucas - Aos Pés Da Cruz" nos cards
 * de setlist e com os titulos do YouTube (que podem passar de 120 caracteres).
 *
 * A alternativa obvia seria `title="..."` nativo: zero componentes, mas o
 * tooltip do navegador demora ~1s, some sozinho, nao quebra linha e tem o visual
 * do SO em vez do do app. Envolver *tudo* em `<Tooltip>` tambem resolve, porem
 * passa a mostrar baloes em textos curtos que nao precisam de nenhum aviso.
 *
 * Aqui a decisao e so mostrar o baloe quando o texto e realmente cortado,
 * medindo o overflow real do elemento (`scrollWidth > clientWidth` para o
 * `truncate`, `scrollHeight > clientHeight` para o `lineClamp`).
 *
 * Como usar:
 *
 *   // titulo com duas linhas e baloe so se nao couber
 *   <TruncatedText lines={2} tooltip={r.title}>{r.title}</TruncatedText>
 *
 *   // uma linha com reticencias (padrao)
 *   <TruncatedText single tooltip={song.title}>{song.title}</TruncatedText>
 *
 *   // dentro de flex: o `minWidth: 0` ja vem aplicado, senao o
 *   // `truncate`/`lineClamp` nao funciona dentro de `Group`/`Flex`
 *   <TruncatedText size="sm">{e.song?.title}</TruncatedText>
 *
 * `tooltip` aceita um conteudo diferente dos children (util quando o children
 * tem nos aninhados, como o `{order}. {song_title}` com a tonalidade em
 * `<Text span>`), e `tooltip={false}` desliga o baloe mantendo o corte.
 */
export interface TruncatedTextProps extends Omit<TextProps, 'truncate'> {
  /** Numero de linhas no `lineClamp`. Ignorado quando `single` e true. */
  lines?: number;
  /** Uma unica linha com reticencias (`truncate`). Tem precedencia sobre `lines`. */
  single?: boolean;
  /** Conteudo do baloe. Padrao: o proprio `children`. `false` desliga o baloe. */
  tooltip?: React.ReactNode | false;
  /** Largura maxima do baloe, para titulos com varias linhas. */
  tooltipMaxWidth?: number | string;
  children?: React.ReactNode;
}

export default function TruncatedText({
  lines = 1,
  single = false,
  tooltip,
  tooltipMaxWidth = 320,
  style,
  children,
  ...rest
}: TruncatedTextProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const overflows =
      node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight;
    // Mantem o estado quando nada mudou: sem isso, cada render abriria um novo
    // ciclo de medicao em listas com dezenas de linhas.
    setIsTruncated((prev) => (prev === overflows ? prev : overflows));
  }, []);

  // Mede ao montar e quando o texto (string) muda. Depender de `children`
  // direto re-mediria a cada render, ja que JSX e um objeto novo sempre.
  const textKey = typeof children === 'string' ? children : undefined;
  useLayoutEffect(() => {
    measure();
  }, [measure, textKey]);

  // Re-mede quando a largura disponivel muda: resize da janela, sidebar
  // recolhida, troca de tabela para cards no breakpoint do `useListBreakpoint`.
  // Cobre tambem o caso em que o item estava escondido (`display: none` mede 0)
  // e volta a aparecer, ja que o tamanho sai de zero.
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [measure]);

  const text = (
    <Text
      ref={ref}
      truncate={single}
      lineClamp={single ? undefined : lines}
      // `minWidth: 0` e obrigatorio: sem ele, um item flex nao encolhe abaixo
      // do conteudo e o corte vira quebra de linha (o bug original).
      style={{ minWidth: 0, ...style }}
      {...rest}
    >
      {children}
    </Text>
  );

  // Sem baloe quando o texto cabe inteiro: evita tooltip barulhento em todos
  // os cards e mantem o DOM igual ao de antes nos casos que nao cortam.
  if (!isTruncated || tooltip === false) return text;

  return (
    <Tooltip label={tooltip ?? children} withArrow multiline maw={tooltipMaxWidth}>
      {text}
    </Tooltip>
  );
}
