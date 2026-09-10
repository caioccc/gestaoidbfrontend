import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Center, Loader } from '@mantine/core';
import AuthGuard from '../../../../components/AuthGuard';
import Layout from '../../../../components/Layout';
import { useAuth } from '../../../../contexts/AuthContext';
import { accountsApi } from '../../../../api/accounts';

const SECTION_ROUTE: Record<string, string> = {
  dashboard: '/dashboard',
  import: '/import',
  entries: '/entries',
  exits: '/exits',
  tithers: '/tithers',
  closings: '/closings',
  reports: '/reports',
  dre: '/dre',
  statement: '/statement',
  calendar: '/calendar',
  settings: '/settings',
  validation: '/validation',
  users: '/users',
  members: '/members',
};

export default function AdminChurchSectionPage() {
  const router = useRouter();
  const { user, switchChurch } = useAuth();
  const { churchId, section } = router.query;

  const numericId = useMemo(() => Number(churchId), [churchId]);
  const sectionName = Array.isArray(section) ? section[0] : section;

  useEffect(() => {
    if (!router.isReady || !Number.isFinite(numericId)) return;
    const target = (sectionName && SECTION_ROUTE[sectionName]) || '/dashboard';
    (async () => {
      try {
        if (user?.church?.id === numericId) {
          router.replace(target);
          return;
        }
        const all = await accountsApi.allChurches();
        const church = all.find((c) => c.id === numericId);
        if (!church || church.status !== 'ACTIVE') {
          router.replace('/admin/churches');
          return;
        }
        await switchChurch(numericId);
        router.replace(target);
      } catch {
        router.replace('/admin/churches');
      }
    })();
  }, [router, router.isReady, numericId, sectionName, user?.church?.id, switchChurch]);

  return (
    <AuthGuard adminOnly>
      <Layout>
        <Center h="60vh">
          <Loader />
        </Center>
      </Layout>
    </AuthGuard>
  );
}