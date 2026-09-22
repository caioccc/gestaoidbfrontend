import React from 'react';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import MembersFunnelTab from '../components/MembersFunnelTab';
import { useLanguage } from '../i18n';
import { useCurrentChurch } from '../hooks/useCurrentChurch';
import { useChurchCardConfig } from '../hooks/useChurchCardConfig';

export default function VisitorsPage() {
  const { t } = useLanguage();
  const { church } = useCurrentChurch();
  const cardData = useChurchCardConfig();

  return (
    <AuthGuard roles={['PASTOR', 'SECRETARIA', 'TESOUREIRO']}>
      <Layout>
        <PageHeader
          title={t.membersPage.tabsVisitors}
          description={t.funnel.description}
        />
        <MembersFunnelTab
          churchName={church?.name || ''}
          churchCity={church?.city || ''}
          cardConfig={cardData.config}
          churchContact={cardData.contact}
        />
      </Layout>
    </AuthGuard>
  );
}
