import React from 'react';
import PageHeader from '../../../components/PageHeader';
import CalendarEventsBoard, { CalendarEventsGateway } from '../../../components/CalendarEventsBoard';
import { useLanguage } from '../../../i18n';
import { AdminFinanceApi } from '../../../api/adminFinance';

export default function CalendarSection({ api, churchLabel }: { api: AdminFinanceApi; churchLabel: string }) {
  const { t, locale } = useLanguage();

  const gateway: CalendarEventsGateway = {
    list: () => api.listCalendarEvents(),
    create: (p) => api.createCalendarEvent(p),
    update: (id, p) => api.updateCalendarEvent(id, p),
    delete: (id) => api.deleteCalendarEvent(id),
    canManageGeneral: true,
    canManageFinance: true,
  };

  return (
    <>
      <PageHeader title={t.calendarPage.title} description={churchLabel} />
      <CalendarEventsBoard gateway={gateway} locale={locale} />
    </>
  );
}
