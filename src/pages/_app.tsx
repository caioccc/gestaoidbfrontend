import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/carousel/styles.css';
import '@mantine/tiptap/styles.css';
import 'mantine-datatable/styles.css';
import 'dayjs/locale/pt-br';
import 'dayjs/locale/es';

import React from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { MantineProvider, createTheme } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import { AuthProvider } from '../contexts/AuthContext';
import { LanguageProvider, useLanguage, SupportedLocale } from '../i18n';
import Layout from '../components/Layout';
import AuthGuard from '../components/AuthGuard';

const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
});

const APP_ROUTES = [
  '/dashboard',
  '/import',
  '/entries',
  '/exits',
  '/receipts',
  '/tithers',
  '/closings',
  '/reports',
  '/dre',
  '/statement',
  '/calendar',
  '/visitation',
  '/prayer-requests',
  '/settings',
  '/validation',
];

const FINANCE_ROUTES = [
  '/import',
  '/entries',
  '/exits',
  '/receipts',
  '/tithers',
  '/closings',
  '/reports',
  '/dre',
  '/statement',
  '/validation',
];

const FINANCE_ROLES = ['TESOUREIRO', 'PASTOR', 'ADMIN'];

const PUBLIC_ROUTES = [
  '/p/[slug]',
  '/gc/[slug]',
  '/perfil/[hash]',
  '/cartao/[hash]',
  '/calendario/[hash]',
  '/formulario/[hash]',
  '/ata/[hash]',
];

// Registro central de papéis por rota (item "Gestão de Acessos"/PROFESSOR_EBD).
// Estas páginas possuem AuthGuard próprio; o guarda aqui garante que papéis sem
// acesso nem renderizem o conteúdo, mesmo acessando a URL diretamente.
const ALL_ROLES = [
  'PASTOR',
  'SECRETARIA',
  'TESOUREIRO',
  'INTERCESSAO',
  'LOUVOR',
  'MUSICO',
  'PROFESSOR_EBD',
];

const ROUTE_ROLES: Record<string, string[]> = {
  '/sunday-school': ['PASTOR', 'SECRETARIA', 'PROFESSOR_EBD'],
  '/growth-groups': ['PASTOR', 'SECRETARIA', 'TESOUREIRO', 'INTERCESSAO', 'PROFESSOR_EBD'],
  // Módulos de secretaria/administrativa: PROFESSOR_EBD fica de fora.
  '/cultos': ALL_ROLES.filter((r) => r !== 'PROFESSOR_EBD'),
  '/atas': ALL_ROLES.filter((r) => r !== 'PROFESSOR_EBD'),
};

const PUBLIC_ROOT_ID = 'public-root';

const ADMIN_ONLY: string[] = [];

const DATE_LOCALE: Record<SupportedLocale, string> = {
  'pt-br': 'pt-br',
  en: 'en',
  es: 'es',
};

function AppContent({ children }: { children: React.ReactNode }) {
  const { locale } = useLanguage();
  return (
    <DatesProvider settings={{ locale: DATE_LOCALE[locale] }}>{children}</DatesProvider>
  );
}

function RouteGate({
  Component,
  pageProps,
}: {
  Component: AppProps['Component'];
  pageProps: AppProps['pageProps'];
}) {
  const router = useRouter();
  const isAppRoute = APP_ROUTES.includes(router.pathname);
  const isPublicRoute = PUBLIC_ROUTES.includes(router.pathname);
  const isAdminRoute = ADMIN_ONLY.includes(router.pathname);
  const isFinanceRoute = FINANCE_ROUTES.includes(router.pathname);

  if (!isAppRoute) {
    if (isPublicRoute) {
      return (
        <MantineProvider
          forceColorScheme="light"
          getRootElement={() => document.getElementById(PUBLIC_ROOT_ID) ?? undefined}
          cssVariablesSelector={`#${PUBLIC_ROOT_ID}`}
        >
          <div id={PUBLIC_ROOT_ID} data-mantine-color-scheme="light">
            <Component {...pageProps} />
          </div>
        </MantineProvider>
      );
    }
    const routeRoles = ROUTE_ROLES[router.pathname];
    if (routeRoles) {
      return (
        <AuthGuard roles={routeRoles}>
          <Component {...pageProps} />
        </AuthGuard>
      );
    }
    return <Component {...pageProps} />;
  }

  return (
    <AuthGuard adminOnly={isAdminRoute} roles={isFinanceRoute ? FINANCE_ROLES : undefined}>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AuthGuard>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Head>
        <title>Gestão IDB - Sistema Integrado de Gestão Eclesial</title>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
      </Head>
      <Notifications position="top-right" />
      <LanguageProvider>
        <AppContent>
          <AuthProvider>
            <RouteGate Component={Component} pageProps={pageProps} />
          </AuthProvider>
        </AppContent>
      </LanguageProvider>
    </MantineProvider>
  );
}
