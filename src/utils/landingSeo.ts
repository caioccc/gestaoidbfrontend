import { landingChurch, site, socialLinks } from '../data/landingContent';
import { absoluteUrl } from './landingConfig';

export function buildLandingSeo() {
  const canonicalUrl = absoluteUrl('/');

  return {
    canonicalUrl,
    title: site.fullName,
    description: site.description,
    siteName: site.name,
    orgName: landingChurch.name,
    ogImage: absoluteUrl('/images/og-image.png'),
    imageAlt: `Logo da ${landingChurch.name}`,
    themeColor: landingChurch.themeColor,
    locale: 'pt_BR',
  };
}

export function buildStructuredData() {
  const seo = buildLandingSeo();
  const organizationId = `${seo.canonicalUrl}#organization`;
  const websiteId = `${seo.canonicalUrl}#website`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: seo.canonicalUrl,
        name: seo.siteName,
        alternateName: seo.orgName,
        inLanguage: 'pt-BR',
        publisher: { '@id': organizationId },
        image: seo.ogImage,
      },
      {
        '@type': ['Organization', 'Church'],
        '@id': organizationId,
        name: seo.orgName,
        alternateName: seo.siteName,
        url: seo.canonicalUrl,
        logo: absoluteUrl(landingChurch.logo),
        image: seo.ogImage,
        address: {
          '@type': 'PostalAddress',
          streetAddress: landingChurch.address,
          addressLocality: landingChurch.city,
          addressRegion: landingChurch.state,
          addressCountry: 'BR',
        },
        sameAs: socialLinks.map((link) => link.href),
      },
    ],
  };
}

export function structuredDataJson(): string {
  return JSON.stringify(buildStructuredData()).replace(/</g, '\\u003c');
}
