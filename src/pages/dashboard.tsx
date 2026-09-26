import React, { useEffect, useMemo, useState } from 'react';
import { Select } from '@mantine/core';
import { useRouter } from 'next/router';
import PageHeader from '../components/PageHeader';
import SecretaryDashboard from '../components/SecretaryDashboard';
import AdminView from '../components/dashboard/AdminView';
import PastorView from '../components/dashboard/PastorView';
import TreasurerView from '../components/dashboard/TreasurerView';
import { useAuth, useRoleHelpers } from '../contexts/AuthContext';
import { useLanguage } from '../i18n';

const FIRST_YEAR = 2022;

type DashboardView = 'ADMIN' | 'TESOUREIRO' | 'PASTOR';

function buildYears(): number[] {
  const current = new Date().getFullYear();
  const first = Math.min(FIRST_YEAR, current - 1);
  const last = current + 1;
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

function resolveView(isAdmin: boolean, role: string | null): DashboardView | null {
  if (isAdmin) return 'ADMIN';
  if (role === 'TESOUREIRO') return 'TESOUREIRO';
  if (role === 'PASTOR') return 'PASTOR';
  return null;
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { isAdmin, role } = useRoleHelpers(user);

  const [year, setYear] = useState<number>(() => new Date().getFullYear());
  const [hour, setHour] = useState<number | null>(null);

  const years = useMemo(buildYears, []);
  const view = useMemo(() => resolveView(isAdmin, role ?? null), [isAdmin, role]);

  const staffWithoutChurch = !!user?.is_staff && !user.church;

  useEffect(() => {
    if (isLoading) return;
    if (staffWithoutChurch) {
      router.replace('/admin/churches');
    } else if (
      user?.role === 'MUSICO' ||
      user?.role === 'LOUVOR' ||
      user?.role === 'INTERCESSAO' ||
      user?.role === 'PROFESSOR_EBD'
    ) {
      router.replace('/calendar');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user, staffWithoutChurch]);

  useEffect(() => {
    setHour(new Date().getHours());
  }, []);

  if (staffWithoutChurch || isLoading) return null;

  if (!view) return <SecretaryDashboard />;

  const firstName = user?.name?.split(' ')[0] ?? '';
  const greeting = !hour
    ? t.dashboard.greeting.replace('{name}', firstName)
    : hour < 12
      ? t.dashboardViews.greetingMorning.replace('{name}', firstName)
      : hour < 18
        ? t.dashboardViews.greetingAfternoon.replace('{name}', firstName)
        : t.dashboardViews.greetingEvening.replace('{name}', firstName);

  const description =
    view === 'ADMIN'
      ? t.dashboardViews.subtitleAdmin
      : view === 'PASTOR'
        ? t.dashboardViews.subtitlePastor
        : t.dashboardViews.subtitleTreasurer;

  const competence = hour === null ? null : `${t.months[new Date().getMonth()]} ${year}`;

  return (
    <>
      <PageHeader
        title={greeting || t.dashboard.title}
        description={competence ? `${description} · ${competence}` : description}
      >
        <Select
          data-testid="dashboard-year"
          label={t.dashboard.yearLabel}
          value={String(year)}
          onChange={(value) => value && setYear(Number(value))}
          data={years.map((item) => ({ value: String(item), label: String(item) }))}
          w={130}
        />
      </PageHeader>

      {view === 'ADMIN' ? <AdminView year={year} /> : null}
      {view === 'TESOUREIRO' ? <TreasurerView year={year} /> : null}
      {view === 'PASTOR' ? <PastorView year={year} /> : null}
    </>
  );
}
