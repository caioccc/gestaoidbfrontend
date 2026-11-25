import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconBrandYoutube,
  IconExternalLink,
  IconMapPin,
} from '@tabler/icons-react';
import { landingLinks, landingTexts, site } from '../../data/landingContent';
import { mapsEmbedUrl } from '../../utils/landingConfig';
import Reveal from './Reveal';
import SectionHeading from './SectionHeading';
import { CrossMark, Ornament } from './Symbols';

type SocialKey = 'instagram' | 'youtube' | 'facebook' | 'whatsapp';

const SOCIAL_KEYS: SocialKey[] = ['instagram', 'youtube', 'facebook', 'whatsapp'];

function SocialIcon({ socialKey }: { socialKey: SocialKey }) {
  if (socialKey === 'instagram') {
    return <IconBrandInstagram size={20} stroke={1.8} aria-hidden="true" />;
  }
  if (socialKey === 'youtube') {
    return <IconBrandYoutube size={20} stroke={1.8} aria-hidden="true" />;
  }
  if (socialKey === 'facebook') {
    return <IconBrandFacebook size={20} stroke={1.8} aria-hidden="true" />;
  }
  return <IconBrandWhatsapp size={20} stroke={1.8} aria-hidden="true" />;
}

export default function Contact() {
  const socialLinks = SOCIAL_KEYS.map((key) => ({
    key,
    label: landingLinks[key].label,
    href: landingLinks[key].url,
  }));
  const mapUrl = landingLinks.maps.url;

  return (
    <section
      id="contato"
      className="tw:relative tw:overflow-hidden tw:border-t tw:border-[#fbbf24]/15 tw:bg-[#04132d] tw:py-20 tw:text-white tw:lg:py-28"
    >
      <div
        className="tw:pointer-events-none tw:absolute tw:inset-0"
        style={{
          background:
            'radial-gradient(circle at 82% 18%, rgba(251,191,36,0.12), transparent 42%), radial-gradient(circle at 18% 82%, rgba(28,78,216,0.18), transparent 46%)',
        }}
      />
      <CrossMark className="tw:pointer-events-none tw:absolute tw:-left-24 tw:-top-20 tw:h-96 tw:w-72 tw:opacity-[0.06]" />

      <div className="tw:relative tw:mx-auto tw:max-w-7xl tw:px-5 tw:lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Contato e localização"
            title="Venha nos visitar"
            description={landingTexts.contact_description}
            light
          />
        </Reveal>

        <div className="tw:mt-16 tw:grid tw:gap-8 tw:lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <div className="tw:flex tw:h-full tw:flex-col tw:justify-between tw:rounded-[2rem] tw:border tw:border-white/10 tw:bg-white/[0.05] tw:p-8 tw:backdrop-blur-xl tw:lg:p-10">
              <div>
                <p className="tw:flex tw:items-center tw:gap-2 tw:text-sm tw:font-bold tw:uppercase tw:tracking-[0.18em] tw:text-[#fbbf24]">
                  <IconMapPin size={18} stroke={1.8} aria-hidden="true" />
                  Endereço
                </p>
                <address className="landing-display tw:mt-6 tw:text-3xl tw:font-semibold tw:leading-snug tw:not-italic tw:text-white tw:lg:text-4xl">
                  {site.address}
                </address>
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tw:mt-8 tw:inline-flex tw:w-fit tw:items-center tw:gap-2 tw:whitespace-nowrap tw:rounded-full tw:bg-[#fbbf24] tw:px-6 tw:py-3.5 tw:text-base tw:font-bold tw:no-underline tw:text-[#071b3a] tw:transition tw:hover:-translate-y-0.5 tw:hover:bg-[#fcd34d]"
                >
                  <IconMapPin size={20} stroke={1.9} aria-hidden="true" />
                  Ver no Google Maps
                  <IconExternalLink size={18} stroke={1.8} aria-hidden="true" />
                </a>
              </div>

              <div className="tw:mt-12">
                <div className="tw:flex tw:items-center tw:gap-4">
                  <p className="tw:text-sm tw:font-bold tw:uppercase tw:tracking-[0.18em] tw:text-white/85">
                    Redes sociais
                  </p>
                  <Ornament className="tw:h-4 tw:w-16" />
                </div>
                <div className="tw:mt-5 tw:flex tw:flex-col tw:gap-2">
                  {socialLinks.map((social) => (
                    <a
                      key={social.key}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${social.label} da ${site.fullName}`}
                      className="tw:group tw:flex tw:items-center tw:gap-2 tw:border-b tw:border-white/10 tw:py-3 tw:text-base tw:font-semibold tw:no-underline tw:text-white tw:transition tw:hover:border-[#fbbf24]/50"
                    >
                      <span className="tw:inline-flex tw:h-9 tw:w-9 tw:items-center tw:justify-center tw:rounded-full tw:bg-white/10 tw:text-[#fbbf24] tw:transition tw:group-hover:bg-[#fbbf24]/20">
                        <SocialIcon socialKey={social.key} />
                      </span>
                      <span className="tw:flex-1">{social.label}</span>
                      <IconExternalLink
                        size={18}
                        stroke={1.8}
                        className="tw:text-white/70 tw:transition tw:group-hover:text-[#fbbf24]"
                        aria-hidden="true"
                      />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="tw:h-full tw:overflow-hidden tw:rounded-[2rem] tw:border tw:border-white/10 tw:bg-white tw:p-2 tw:shadow-2xl">
              <iframe
                src={mapsEmbedUrl(site.address)}
                title={`Mapa de localização da ${site.fullName}`}
                className="tw:h-full tw:min-h-[28rem] tw:w-full tw:rounded-[1.5rem]"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
