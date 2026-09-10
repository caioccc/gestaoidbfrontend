import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Center, Stack, Text, Button, Loader } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import AuthGuard from '../../../components/AuthGuard';
import Layout from '../../../components/Layout';
import { createAdminFinance } from '../../../api/adminFinance';
import { accountsApi } from '../../../api/accounts';
import { Church } from '../../../types';
import { useLanguage } from '../../../i18n';
import { SECTIONS } from '../../../components/admin/sections';

export default function CongregationSectionPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { congregationId, section } = router.query;

  const numericId = useMemo(() => Number(congregationId), [congregationId]);
  const sectionName = Array.isArray(section) ? section[0] : section;

  const [church, setChurch] = useState<Church | null>(null);
  const [resolved, setResolved] = useState(false);

  const api = useMemo(
    () => (Number.isFinite(numericId) ? createAdminFinance(numericId) : null),
    [numericId]
  );

  const load = useCallback(async () => {
    if (!Number.isFinite(numericId)) {
      setResolved(true);
      return;
    }
    try {
      const all = await accountsApi.churches();
      const found = all.find((c) => c.id === numericId) || null;
      setChurch(found);
    } catch {
      setChurch(null);
    } finally {
      setResolved(true);
    }
  }, [numericId]);

  useEffect(() => {
    if (!router.isReady) return;
    load();
  }, [router.isReady, load]);

  if (!router.isReady || !resolved) {
    return (
      <AuthGuard roles={['PASTOR']}>
        <Layout>
          <Center h="60vh">
            <Loader />
          </Center>
        </Layout>
      </AuthGuard>
    );
  }

  const renderSection = SECTIONS[sectionName ?? ''];

  if (
    !api ||
    !renderSection ||
    !church ||
    church.church_type !== 'CONGREGATION' ||
    church.status === 'PENDING' ||
    church.status === 'REJECTED'
  ) {
    return (
      <AuthGuard roles={['PASTOR']}>
        <Layout>
          <Center h="60vh">
            <Stack align="center" gap="sm">
              <Text c="dimmed">{t.common.noData}</Text>
              <Button
                leftSection={<IconArrowLeft size={16} />}
                variant="light"
                onClick={() => router.push('/churches')}
              >
                {t.churchesPage.title}
              </Button>
            </Stack>
          </Center>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard roles={['PASTOR']}>
      <Layout churchType={church.church_type}>
        {renderSection({
          api,
          churchLabel: church.name,
          churchId: numericId,
          churchType: church.church_type,
          staffAccess: false,
        })}
      </Layout>
    </AuthGuard>
  );
}