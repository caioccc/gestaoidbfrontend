import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { accountsApi } from '../api/accounts';
import type { ChurchType } from '../types';

export interface CurrentChurch {
  id: number;
  name: string;
  church_type: ChurchType;
}

interface UseCurrentChurchReturn {
  church: CurrentChurch | null;
  loading: boolean;
}

function toCurrentChurch(c: {
  id: number;
  name: string;
  church_type?: string | null;
}): CurrentChurch {
  const normalized = ['INDEPENDENT', 'CONGREGATION'].includes(c.church_type ?? '')
    ? (c.church_type as ChurchType)
    : 'INDEPENDENT';
  return { id: c.id, name: c.name, church_type: normalized };
}

export function useCurrentChurch(): UseCurrentChurchReturn {
  const router = useRouter();
  const { user } = useAuth();
  const [church, setChurch] = useState<CurrentChurch | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const qChurch = router.query.churchId;
    const qCong = router.query.congregationId;
    const adminId = qChurch && !Array.isArray(qChurch) ? Number(qChurch) : null;
    const congId = qCong && !Array.isArray(qCong) ? Number(qCong) : null;

    let active = true;

    if (adminId || congId) {
      setLoading(true);
      const fetch = adminId
        ? accountsApi.allChurches().then((list) => list.find((c) => c.id === adminId) ?? null)
        : accountsApi.churches().then((list) => list.find((c) => c.id === congId) ?? null);
      fetch
        .then((c) => {
          if (active) setChurch(c ? toCurrentChurch(c) : null);
        })
        .catch(() => {
          if (active) setChurch(null);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else if (user?.church) {
      setChurch(toCurrentChurch(user.church));
      setLoading(false);
    } else {
      setChurch(null);
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [router.query.churchId, router.query.congregationId, user?.church?.id]);

  return { church, loading };
}