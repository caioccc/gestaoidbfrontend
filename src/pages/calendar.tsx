import React from 'react';
import PageHeader from '../components/PageHeader';
import CalendarEventsBoard, { CalendarEventsGateway } from '../components/CalendarEventsBoard';
import { useLanguage } from '../i18n';
import { calendarEventsApi } from '../api/finance';

const gateway: CalendarEventsGateway = {
  list: () => calendarEventsApi.list(),
  create: (p) => calendarEventsApi.create(p),
  update: (id, p) => calendarEventsApi.update(id, p),
  delete: (id) => calendarEventsApi.delete(id),
};

export default function CalendarPage() {
  const { t, locale } = useLanguage();

  return (
    <>
      <PageHeader title={t.calendarPage.title} />
      <CalendarEventsBoard gateway={gateway} locale={locale} />
    </>
  );
}
