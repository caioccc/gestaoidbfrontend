import React, { useEffect, useMemo, useState } from 'react';
import { Group, Pagination, Select, Stack, Text } from '@mantine/core';
import { useLanguage } from '../i18n';

export const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];

interface ListPaginationState<T> {
  page: number;
  setPage: (next: number) => void;
  pageSize: number;
  changePageSize: (next: number) => void;
  total: number;
  totalPages: number;
  pageItems: T[];
  rangeStart: number;
  rangeEnd: number;
  reset: () => void;
}

export function useListPagination<T>(items: readonly T[]): ListPaginationState<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize]
  );

  const changePageSize = (next: number) => {
    setPageSize(next);
    setPage(1);
  };

  return {
    page,
    setPage,
    pageSize,
    changePageSize,
    total,
    totalPages,
    pageItems,
    rangeStart: total === 0 ? 0 : (page - 1) * pageSize + 1,
    rangeEnd: Math.min(page * pageSize, total),
    reset: () => setPage(1),
  };
}

interface ServerListPaginationState {
  page: number;
  setPage: (next: number) => void;
  pageSize: number;
  changePageSize: (next: number) => void;
  total: number;
  setTotal: (next: number) => void;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  reset: () => void;
}

/**
 * Estado de paginação para listas que já vêm paginadas do servidor.
 *
 * Diferente de `useListPagination`, aqui não existe `pageItems`: a página
 * renderiza direto o array retornado pela API, e informa o total com
 * `setTotal(count)`. A busca precisa reagir a `page`/`pageSize` (e aos filtros,
 * que devem chamar `reset()`), normalmente dentro de um `useEffect` da própria
 * tela.
 */
export function useServerPagination(options?: { pageSize?: number }): ServerListPaginationState {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(options?.pageSize ?? PAGE_SIZE_OPTIONS[0]);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const changePageSize = (next: number) => {
    setPageSize(next);
    setPage(1);
  };

  return {
    page,
    setPage,
    pageSize,
    changePageSize,
    total,
    setTotal,
    totalPages,
    rangeStart: total === 0 ? 0 : (page - 1) * pageSize + 1,
    rangeEnd: Math.min(page * pageSize, total),
    reset: () => setPage(1),
  };
}

interface ListPaginationProps {
  page: number;
  onPageChange: (next: number) => void;
  pageSize: number;
  onPageSizeChange: (next: number) => void;
  total: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  testId?: string;
}

export function ListPagination({
  page,
  onPageChange,
  pageSize,
  onPageSizeChange,
  total,
  totalPages,
  rangeStart,
  rangeEnd,
  testId,
}: ListPaginationProps) {
  const { t } = useLanguage();

  if (total === 0) return null;

  return (
    <Stack gap="xs" pt="sm" data-testid={testId}>
      <Group justify="space-between" align="center" wrap="wrap" gap="xs">
        <Text size="xs" c="dimmed">
          {t.common.showingRange
            .replace('{start}', String(rangeStart))
            .replace('{end}', String(rangeEnd))
            .replace('{total}', String(total))
            .replace('{page}', String(page))
            .replace('{totalPages}', String(totalPages))}
        </Text>
        <Group gap={6} align="center">
          <Text size="xs" c="dimmed">
            {t.common.perPage}
          </Text>
          <Select
            aria-label={t.common.perPage}
            size="xs"
            w={84}
            allowDeselect={false}
            data={PAGE_SIZE_OPTIONS.map((size) => ({ value: String(size), label: String(size) }))}
            value={String(pageSize)}
            onChange={(value) => value && onPageSizeChange(Number(value))}
            data-testid={testId ? `${testId}-page-size` : undefined}
          />
        </Group>
      </Group>
      {total > pageSize && (
        <Group justify="center">
          <Pagination
            value={page}
            onChange={onPageChange}
            total={totalPages}
            size="sm"
            data-testid={testId ? `${testId}-pager` : undefined}
          />
        </Group>
      )}
    </Stack>
  );
}
