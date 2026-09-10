import React from 'react';
import { AdminFinanceApi } from '../../../api/adminFinance';
import { ChurchType } from '../../../types';

import DashboardSection from './DashboardSection';
import ImportSection from './ImportSection';
import EntriesSection from './EntriesSection';
import ExitsSection from './ExitsSection';
import TithersSection from './TithersSection';
import ClosingsSection from './ClosingsSection';
import ReportsSection from './ReportsSection';
import DreSection from './DreSection';
import StatementSection from './StatementSection';
import CalendarSection from './CalendarSection';
import SettingsSection from './SettingsSection';
import ValidationSection from './ValidationSection';
import UsersSection from './UsersSection';
import MembersSection from './MembersSection';

export interface ChurchSectionProps {
  api: AdminFinanceApi;
  churchLabel: string;
  churchId: number;
  churchType?: ChurchType;
  staffAccess?: boolean;
}

export const SECTIONS: Record<
  string,
  (p: ChurchSectionProps) => React.ReactNode
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
  users: (p) => <UsersSection {...p} />,
  members: (p) => <MembersSection {...p} />,
};