import Head from 'next/head';
import About from './About';
import ActionLinks from './ActionLinks';
import Beliefs from './Beliefs';
import Contact from './Contact';
import Hero from './Hero';
import Journeys from './Journeys';
import Leadership from './Leadership';
import Schedule from './Schedule';
import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';
import { site, upcomingEvents } from '../../data/landingContent';
import { buildLandingSeo, structuredDataJson } from '../../utils/landingSeo';

export default function InstitutionalLanding() {
  const seo = buildLandingSeo();
  const siteDomain = new URL(seo.canonicalUrl).hostname;

  return (
    <>
      <Head>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} key="description" />
        <meta name="keywords" content={site.keywords.join(', ')} />
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content={seo.themeColor} key="theme-color" />
        <link rel="canonical" href={seo.canonicalUrl} />

        <meta property="og:type" content="website" />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={seo.canonicalUrl} />
        <meta property="og:site_name" content={seo.siteName} />
        <meta property="og:locale" content={seo.locale} />
        <meta property="og:image" content={seo.ogImage} />
        <meta property="og:image:secure_url" content={seo.ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:alt" content={seo.imageAlt} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seo.title} />
        <meta name="twitter:description" content={seo.description} />
        <meta name="twitter:url" content={seo.canonicalUrl} />
        <meta name="twitter:domain" content={siteDomain} />
        <meta name="twitter:image" content={seo.ogImage} />
        <meta name="twitter:image:alt" content={seo.imageAlt} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredDataJson() }}
        />
      </Head>

      <div className="landing-page tw:min-h-screen tw:bg-white tw:text-base tw:leading-relaxed tw:text-[#071b3a]">
        <a
          href="#conteudo"
          className="tw:sr-only tw:focus:not-sr-only tw:focus:absolute tw:focus:left-4 tw:focus:top-4 tw:focus:z-50 tw:focus:rounded-lg tw:focus:bg-white tw:focus:px-4 tw:focus:py-2 tw:focus:text-sm tw:focus:font-bold tw:focus:text-[#071b3a]"
        >
          Pular para o conteúdo
        </a>

        <SiteHeader />

        <main id="conteudo">
          <Hero />
          <About />
          <Beliefs />
          <Journeys />
          <ActionLinks />
          <Schedule events={upcomingEvents} />
          <Leadership />
          <Contact />
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
