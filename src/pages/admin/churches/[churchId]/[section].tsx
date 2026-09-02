import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Center, Stack, Text, Button, Loader } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import AuthGuard from '../../../../components/AuthGuard';
import Layout from '../../../../components/Layout';
import { createAdminFinance, AdminFinanceApi } from '../../../../api/adminFinance';
import { accountsApi } from '../../../../api/accounts';
import { PendingChurch } from '../../../../types';
import { useLanguage } from '../../../../i18n';

import DashboardSection from '../../../../components/admin/sections/DashboardSection';
import ImportSection from '../../../../components/admin/sections/ImportSection';
import EntriesSection from '../../../../components/admin/sections/EntriesSection';
import ExitsSection from '../../../../components/admin/sections/ExitsSection';
import TithersSection from '../../../../components/admin/sections/TithersSection';
import ClosingsSection from '../../../../components/admin/sections/ClosingsSection';
import ReportsSection from '../../../../components/admin/sections/ReportsSection';
import DreSection from '../../../../components/admin/sections/DreSection';
import StatementSection from '../../../../components/admin/sections/StatementSection';
import CalendarSection from '../../../../components/admin/sections/CalendarSection';
import SettingsSection from '../../../../components/admin/sections/SettingsSection';
import ValidationSection from '../../../../components/admin/sections/ValidationSection';

const SECTIONS: Record<
  string,
  (p: { api: AdminFinanceApi; churchLabel: string; churchId: number }) => React.ReactNode
> = {
  dashboard: (p) => <DashboardSection {...p} />,
  import: (p) => <ImportSection {...p} />,
  entries: (p) => <EntriesSection {...p} />,
  exits: (p) => <ExitsSection {...p} />,
  tithers: (p) => <TithersSection {...p} />,
  closings: (p) => <ClosingsSection {...p} />,
  reports: (p) => <ReportsSection {...p} />,
  dre: (p) => <DreSection {...p} />,
  statement: (p) => <StatementSection {...p} />,
  calendar: (p) => <CalendarSection {...p} />,
  settings: (p) => <SettingsSection {...p} />,
  validation: (p) => <ValidationSection {...p} />,
};

export default function AdminChurchSectionPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { churchId, section } = router.query;

  const numericId = useMemo(() => Number(churchId), [churchId]);
  const sectionName = Array.isArray(section) ? section[0] : section;

  const [church, setChurch] = useState<PendingChurch | null>(null);
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
      const all = await accountsApi.allChurches();
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
      <AuthGuard adminOnly>
        <Layout>
          <Center h="60vh">
            <Loader />
          </Center>
        </Layout>
      </AuthGuard>
    );
  }

  const renderSection = SECTIONS[sectionName ?? ''];

  if (!api || !renderSection || !church || church.status === 'PENDING' || church.status === 'REJECTED') {
    return (
      <AuthGuard adminOnly>
        <Layout>
          <Center h="60vh">
            <Stack align="center" gap="sm">
              <Text c="dimmed">{t.common.noData}</Text>
              <Button
                leftSection={<IconArrowLeft size={16} />}
                variant="light"
                onClick={() => router.push('/admin/churches')}
              >
                {t.adminChurches.back}
              </Button>
            </Stack>
          </Center>
        </Layout>
      </AuthGuard>
    );
  }

  const churchLabel = church.name;

  return (
    <AuthGuard adminOnly>
      <Layout>{renderSection({ api, churchLabel, churchId: numericId })}</Layout>
    </AuthGuard>
  );
}
