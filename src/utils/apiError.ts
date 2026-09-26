/** Leitura de erros de campo de uma resposta do Django REST Framework.
 *
 *  O DRF responde `{ "campo": ["mensagem"] }` para erro de campo e
 *  `{ "detail": "..." }` para erro geral. Um toast que só lê `detail` esconde
 *  o motivo real da falha — foi assim que um "Logo inválido." de 400 ficou
 *  invisível na tela e só apareceu no devtools.
 */

function firstMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value || undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstMessage(item);
      if (message) return message;
    }
    return undefined;
  }
  if (value && typeof value === 'object') {
    return firstMessage(Object.values(value)[0]);
  }
  return undefined;
}

/**
 * @param data corpo da resposta de erro (normalmente `err.response.data`)
 * @param preferredFields campos cuja mensagem tem prioridade
 */
export function firstFieldError(
  data: unknown,
  preferredFields: string[] = [],
): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;

  for (const field of preferredFields) {
    const message = firstMessage(record[field]);
    if (message) return message;
  }

  for (const [key, value] of Object.entries(record)) {
    if (key === 'detail' || key === 'non_field_errors') continue;
    const message = firstMessage(value);
    if (message) return message;
  }

  return (
    firstMessage(record.non_field_errors) ?? firstMessage(record.detail) ?? undefined
  );
}
