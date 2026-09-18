import { Html, Head, Main, NextScript } from 'next/document';
import { ColorSchemeScript } from '@mantine/core';

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        <ColorSchemeScript defaultColorScheme="light" />

        <title>Gestão IDB — Sistema Integrado de Gestão Eclesial</title>
        <meta
          name="description"
          content="Plataforma de gestão integrada para a Igreja de Deus no Brasil: secretaria, membresia, tesouraria, liturgia e prestação de contas oficial da Convenção Regional."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1c4ed8" />
        <meta name="msapplication-TileColor" content="#1c4ed8" />
        <meta name="msapplication-TileImage" content="/ms-icon-144x144.png" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />

        <link rel="apple-touch-icon" sizes="57x57" href="/apple-icon-57x57.png" />
        <link rel="apple-touch-icon" sizes="60x60" href="/apple-icon-60x60.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/apple-icon-72x72.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/apple-icon-76x76.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/apple-icon-114x114.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/apple-icon-120x120.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/apple-icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon-180x180.png" />

        <link rel="manifest" href="/manifest.json" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Gestão IDB" />
        <meta
          property="og:title"
          content="Gestão IDB — Gestão eclesiástica completa para a Igreja de Deus no Brasil"
        />
        <meta
          property="og:description"
          content="Centralize membresia, atas, relatórios de culto, tesouraria e livro-caixa oficial da Convenção Regional em um só lugar."
        />
        <meta property="og:image" content="/images/og-image.png" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Gestão IDB" />
        <meta
          name="twitter:description"
          content="Sistema de gestão integrado para as congregações da Igreja de Deus no Brasil."
        />
        <meta name="twitter:image" content="/images/og-image.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}