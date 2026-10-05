import { useMemo } from 'react';
import { useLanguage } from '../i18n';
import { toast as rawToast } from '../utils/toast';
import type { ToastKind, ToastOptions } from '../utils/toast';

/**
 * Mensagens padrao de feedback, ja traduzidas, com `{placeholders}` opcionais.
 *
 * Sao as chaves de `t.common.toast`. O resto das telas continua usando as
 * chaves proprias do seu dominio (`t.membersPage.saved`, `t.linksPage.configDone`)
 * atraves de `key`, sem perder a rastreabilidade do `t.*` no codigo.
 */
export interface ToastStrings {
  saved: string;
  created: string;
  deleted: string;
  copied: string;
  savedWithName: string;
  updatedWithName: string;
  addedWithName: string;
  deletedWithName: string;
  copiedWithName: string;
  processing: string;
  sending: string;
  operationFailed: string;
  saveFailed: string;
  deleteFailed: string;
  loadFailed: string;
  downloadFailed: string;
  downloaded: string;
  networkError: string;
}

type Vars = Record<string, string | number | undefined>;

/** Substitui `{chave}` pelos valores informados, como ja se faz no resto do i18n. */
function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined ? match : String(value);
  });
}

export interface Feedback {
  /** Toast generico do tipo pedido, com o texto ja traduzido. */
  show: (kind: ToastKind, message: string, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;

  /** Erro com o detalhe do DRF, caindo em `common.toast.operationFailed`. */
  fromError: (err: unknown, fallback?: string, options?: ToastOptions) => void;
  /** Erro de rede, para `catch` de fetch/axios sem resposta do servidor. */
  fromNetworkError: (err: unknown, options?: ToastOptions) => void;

  /** Action + nome, sem problema de concordancia de genero. */
  savedWithName: (name: string, options?: ToastOptions) => void;
  updatedWithName: (name: string, options?: ToastOptions) => void;
  addedWithName: (name: string, options?: ToastOptions) => void;
  deletedWithName: (name: string, options?: ToastOptions) => void;
  copiedWithName: (name: string, options?: ToastOptions) => void;

  /** Toast de progresso para acoes longas; fechar com `taskSuccess`/`taskError`. */
  task: (id: string, message?: string) => void;
  taskSuccess: (id: string, message: string) => void;
  taskError: (id: string, err: unknown, fallback?: string) => void;
  dismiss: (id: string) => void;

  /** Acesso sem traducao, para texto montado na hora. */
  raw: typeof rawToast;
  /** Atalho para as mensagens padrao com `{placeholders}` resolvidos. */
  t: (key: keyof ToastStrings, vars?: Vars) => string;
}

/**
 * Fachada de feedback: `toast` (visual) + `t` (traducao).
 *
 *   const fb = useFeedback();
 *   try {
 *     await api.save();
 *     fb.success(t.membersPage.saved);
 *   } catch (err) {
 *     fb.fromError(err, t.common.toast.saveFailed);
 *   }
 */
export function useFeedback(): Feedback {
  const { t } = useLanguage();
  const strings = t.common.toast as ToastStrings;

  return useMemo<Feedback>(
    () => ({
      show: (kind, message, options) => rawToast.show(kind, message, options),
      success: (message, options) => rawToast.success(message, options),
      error: (message, options) => rawToast.error(message, options),
      info: (message, options) => rawToast.info(message, options),
      warning: (message, options) => rawToast.warning(message, options),

      fromError: (err, fallback, options) =>
        rawToast.fromError(err, fallback ?? strings.operationFailed, options),
      fromNetworkError: (err, options) =>
        err && typeof err === 'object' && 'response' in err && (err as { response?: unknown }).response
          ? rawToast.fromError(err, strings.operationFailed, options)
          : rawToast.error(strings.networkError, options),

      savedWithName: (name, options) =>
        rawToast.success(interpolate(strings.savedWithName, { name }), options),
      updatedWithName: (name, options) =>
        rawToast.success(interpolate(strings.updatedWithName, { name }), options),
      addedWithName: (name, options) =>
        rawToast.success(interpolate(strings.addedWithName, { name }), options),
      deletedWithName: (name, options) =>
        rawToast.success(interpolate(strings.deletedWithName, { name }), options),
      copiedWithName: (name, options) =>
        rawToast.success(interpolate(strings.copiedWithName, { name }), options),

      task: (id, message) => rawToast.task(id, message ?? strings.processing),
      taskSuccess: (id, message) => rawToast.taskSuccess(id, message),
      taskError: (id, err, fallback) =>
        rawToast.taskError(id, err, fallback ?? strings.operationFailed),
      dismiss: (id) => rawToast.dismiss(id),

      raw: rawToast,
      t: (key, vars) => interpolate(strings[key], vars),
    }),
    [strings],
  );
}

export default useFeedback;
