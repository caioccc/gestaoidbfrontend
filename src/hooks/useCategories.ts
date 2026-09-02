import { useEffect, useState } from 'react';
import { Category, DepartmentCategory } from '../types';
import { financeApi } from '../api/finance';

const FALLBACK: Category[] = [
  { value: 'DIZIMO', label: 'Dízimo' },
  { value: 'OFERTA', label: 'Oferta' },
  { value: 'CONSTRUCAO', label: 'Construção' },
  { value: 'ESPECIAL', label: 'Especial' },
  { value: 'MISSOES', label: 'Missões' },
  { value: 'MULHERES', label: 'Mulheres' },
  { value: 'HOMENS', label: 'Homens' },
  { value: 'JOVENS', label: 'Jovens' },
  { value: 'ESC_BIBLICA', label: 'Escola Bíblica' },
  { value: 'INFANTIL', label: 'Infantil' },
  { value: 'ADOLESCENTES', label: 'Adolescentes' },
];

export function useCategories(): { categories: Category[]; loading: boolean } {
  const [categories, setCategories] = useState<Category[]>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    financeApi
      .categories()
      .then((data) => {
        if (active && Array.isArray(data) && data.length) setCategories(data);
      })
      .catch(() => {
        /* usa fallback */
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { categories, loading };
}

export function categoryLabel(
  value: DepartmentCategory | undefined
): string {
  const found = FALLBACK.find((c) => c.value === value);
  return found?.label ?? value ?? '—';
}

export { FALLBACK as CATEGORY_OPTIONS };
