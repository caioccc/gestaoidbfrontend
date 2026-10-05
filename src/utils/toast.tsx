/**
 * Camada unica de feedback "toast" do projeto.
 *
 * Antes desta centralizacao cada tela chamava `notifications.show` direto, o
 * que gerava tres problemas recorrentes:
 *
 * 1. Toast de erro SEM cor (o Mantine cai no azul primario, indistinguivel de
 *    sucesso) ou com a mensagem errada (ex.: "erro ao carregar" ao falhar um
 *    salvamento).
 * 2. `.catch(() => notifications.show(...))` sem o `err`, jogando fora a
 *    mensagem real do DRF — um "Logo invalido." de 400 chegava como toast
 *    generico e so aparecia no devtools.
 * 3. Sem `icon` e sem `autoClose` explicito, entao todo toast vivia 4000ms
 *    (default do Mantine), inclusive os de erro.
 *
 * Aqui o visual e o tempo de vida sao decididos em um unico lugar por tipo de
 * resultado. A traducao NAO acontece neste arquivo: os call sites continuam
 * passando texto ja traduzido (ou usam `useFeedback`, que traduz). Assim o
 * padrao `t.*` continua greppavel em todo o codigo.
 *
 * Uso tipico:
 *
 *   import { toast } from '../utils/toast';
 *
 *   try {
 *     await api.save();
 *     toast.success(t.membersPage.saved);
 *   } catch (err) {
 *     toast.fromError(err, t.common.toast.saveFailed);
 *   }
 *
 * Para acoes longas (importar planilha, gerar PDF, subir logo) use o par
 * `task`/`taskSuccess`/`taskError`, que mantem um unico toast vivo e troca o
 * conteudo no lugar de piscar dois toasts:
 *
 *   toast.task('import', t.importPage.processing);
 *   try {
 *     await runImport();
 *     toast.taskSuccess('import', t.importPage.done);
 *   } catch (err) {
 *     toast.taskError('import', err, t.common.toast.operationFailed);
 *   }
 */

import React from 'react';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconInfoCircle,
  IconLoader2,
} from '@tabler/icons-react';
import { firstFieldError } from './apiError';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

interface ToastStyle {
  color: string;
  icon: React.ReactNode;
  /** Milissegundos. `false` deixa o toast na tela ate ser fechado. */
  autoClose: number | false;
  withCloseButton: boolean;
}

/**
 * Tempos escolhidos por impacto percebido:
 * - sucesso 3s: o usuario so precisa de um piscar de confirmacao;
 * - info/warning 4s: um pouco mais de tempo para ler;
 * - erro 8s + botao de fechar: a mensagem precisa ser lida com calma e o
 *   usuario pode querer copia-la sem perder o texto.
 */
const STYLE: Record<ToastKind, ToastStyle> = {
  success: {
    color: 'green',
    icon: <IconCircleCheck size={18} />,
    autoClose: 3000,
    withCloseButton: false,
  },
  error: {
    color: 'red',
    icon: <IconCircleX size={18} />,
    autoClose: 8000,
    withCloseButton: true,
  },
  info: {
    color: 'blue',
    icon: <IconInfoCircle size={18} />,
    autoClose: 4000,
    withCloseButton: false,
  },
  warning: {
    color: 'yellow',
    icon: <IconAlertTriangle size={18} />,
    autoClose: 4000,
    withCloseButton: false,
  },
};

export interface ToastOptions {
  /** Sobrescreve o tempo padrao do tipo. `false` mantem o toast fixo. */
  autoClose?: number | false;
  /** Reusa um `id` existente para atualizar o toast no lugar. */
  id?: string;
  withCloseButton?: boolean;
}

/** Toast "de resultado": cor, icone e tempo de vida vem do tipo. */
function show(kind: ToastKind, message: React.ReactNode, options: ToastOptions = {}) {
  const style = STYLE[kind];
  notifications.show({
    message,
    color: style.color,
    icon: style.icon,
    autoClose: options.autoClose ?? style.autoClose,
    withCloseButton: options.withCloseButton ?? style.withCloseButton,
    ...(options.id ? { id: options.id } : {}),
  });
}

/**
 * Extrai a mensagem real do DRF (`{campo: ["..."]}`, `{detail: "..."}`,
 * `{non_field_errors: [...]}`) e cai no texto informado quando o corpo nao
 * traz nada utilizavel. Usar sempre no lugar de `.catch(() => ...)` para nao
 * perder o motivo da falha.
 */
function messageFromError(err: unknown, fallback: string): string {
  const detail = firstFieldError((err as { response?: { data?: unknown } })?.response?.data);
  return detail || fallback;
}

export const toast = {
  show,

  success: (message: React.ReactNode, options?: ToastOptions) =>
    show('success', message, options),

  error: (message: React.ReactNode, options?: ToastOptions) =>
    show('error', message, options),

  info: (message: React.ReactNode, options?: ToastOptions) => show('info', message, options),

  warning: (message: React.ReactNode, options?: ToastOptions) =>
    show('warning', message, options),

  /** Toast de erro com o detalhe do DRF, caindo em `fallback`. */
  fromError: (err: unknown, fallback: string, options?: ToastOptions) =>
    show('error', messageFromError(err, fallback), options),

  /**
   * Abre o toast de progresso de uma acao longa. Fica com `autoClose: false`
   * e `loading: true`, ou seja, nao some sozinho: quem fecha e o
   * `taskSuccess`/`taskError` do mesmo `id`.
   */
  task: (id: string, message: React.ReactNode) => {
    notifications.show({
      id,
      message,
      color: STYLE.info.color,
      icon: <IconLoader2 size={18} />,
      loading: true,
      autoClose: false,
      allowClose: false,
      withCloseButton: false,
    });
  },

  /** Fecha o toast de `task` como sucesso. */
  taskSuccess: (id: string, message: React.ReactNode) => {
    notifications.update({
      id,
      message,
      color: STYLE.success.color,
      icon: STYLE.success.icon,
      loading: false,
      autoClose: STYLE.success.autoClose,
      allowClose: true,
      withCloseButton: STYLE.success.withCloseButton,
    });
  },

  /** Fecha o toast de `task` como erro, preservando o detalhe do DRF. */
  taskError: (id: string, err: unknown, fallback: string) => {
    notifications.update({
      id,
      message: messageFromError(err, fallback),
      color: STYLE.error.color,
      icon: STYLE.error.icon,
      loading: false,
      autoClose: STYLE.error.autoClose,
      allowClose: true,
      withCloseButton: STYLE.error.withCloseButton,
    });
  },

  /** Some com um toast pelo `id` (use quando a acao for cancelada). */
  dismiss: (id: string) => {
    notifications.hide(id);
  },
};

export default toast;
