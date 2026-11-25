import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconBrandYoutube,
  IconExternalLink,
  IconLogin,
} from '@tabler/icons-react';
import Image from 'next/image';
import Link from 'next/link';
import { landingLinks, landingTexts, site } from '../../data/landingContent';
import { CrossMark, Ornament } from './Symbols';

type SocialKey = 'instagram' | 'youtube' | 'facebook' | 'whatsapp';

const SOCIAL_KEYS: SocialKey[] = ['instagram', 'youtube', 'facebook', 'whatsapp'];

function SocialIcon({ socialKey }: { socialKey: SocialKey }) {
  if (socialKey === 'instagram') {
    return <IconBrandInstagram size={18} stroke={1.8} aria-hidden="true" />;
  }
  if (socialKey === 'youtube') {
    return <IconBrandYoutube size={18} stroke={1.8} aria-hidden="true" />;
  }
  if (socialKey === 'facebook') {
    return <IconBrandFacebook size={18} stroke={1.8} aria-hidden="true" />;
  }
  return <IconBrandWhatsapp size={18} stroke={1.8} aria-hidden="true" />;
}

export default function SiteFooter() {
  const socialLinks = SOCIAL_KEYS.map((key) => ({
    key,
    label: landingLinks[key].label,
    href: landingLinks[key].url,
  }));

  return (
    <footer className="tw:relative tw:overflow-hidden tw:bg-[#030f24] tw:py-14 tw:text-white/85">
      <CrossMark className="tw:pointer-events-none tw:absolute tw:-right-16 tw:-top-24 tw:h-80 tw:w-64 tw:opacity-[0.06]" />

      <div className="tw:relative tw:mx-auto tw:max-w-7xl tw:px-5 tw:lg:px-8">
        <div className="tw:grid tw:gap-12 tw:border-b tw:border-white/10 tw:pb-12 tw:md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="tw:flex tw:items-center tw:gap-4">
              <Image
                src="/android-icon-192x192.png"
                alt={`Logo da ${site.fullName}`}
                width={56}
                height={56}
                className="tw:h-12 tw:w-12 tw:object-contain"
              />
              <div>
                <p className="landing-display tw:text-xl tw:font-bold tw:text-white">
                  {landingTexts.site_name}
                </p>
                <p className="tw:text-sm tw:font-semibold tw:uppercase tw:tracking-[0.12em] tw:text-white/80">
                  {landingTexts.footer_note}
                </p>
              </div>
            </div>
            <p className="tw:mt-6 tw:max-w-sm tw:text-base tw:font-medium tw:leading-relaxed tw:text-white/85">
              {site.address}
            </p>
            <Ornament className="tw:mt-6 tw:h-5 tw:w-24" />
          </div>

          <nav aria-label="Links do rodapé" className="tw:flex tw:flex-col tw:gap-3 tw:text-base">
            <p className="tw:text-sm tw:font-bold tw:uppercase tw:tracking-[0.18em] tw:text-[#fbbf24]">
              Navegue
            </p>
            {[
              { label: 'Sobre', href: '#sobre' },
              { label: 'Serviços', href: '#servicos' },
              { label: 'Crenças', href: '#crencas' },
              { label: 'Agenda', href: '#agenda' },
              { label: 'Liderança', href: '#lideranca' },
              { label: 'Contato', href: '#contato' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="tw:w-fit tw:text-base tw:font-semibold tw:no-underline tw:text-white/85 tw:transition tw:hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div>
            <p className="tw:text-sm tw:font-bold tw:uppercase tw:tracking-[0.18em] tw:text-[#fbbf24]">
              Conecte-se
            </p>
            <div className="tw:mt-4 tw:flex tw:flex-col tw:gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.key}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${social.label} da ${site.fullName}`}
                  className="tw:group tw:flex tw:w-fit tw:items-center tw:gap-2 tw:text-base tw:font-semibold tw:no-underline tw:whitespace-nowrap tw:text-white/85 tw:transition tw:hover:text-white"
                >
                  <span className="tw:inline-flex tw:h-8 tw:w-8 tw:items-center tw:justify-center tw:rounded-full tw:border tw:border-white/15 tw:text-[#fbbf24] tw:transition tw:group-hover:bg-white/10">
                    <SocialIcon socialKey={social.key} />
                  </span>
                  {social.label}
                  <IconExternalLink
                    size={16}
                    stroke={1.8}
                    className="tw:text-white/60 tw:transition tw:group-hover:text-[#fbbf24]"
                    aria-hidden="true"
                  />
                </a>
              ))}
              <Link
                href="/login"
                className="tw:mt-1 tw:inline-flex tw:w-fit tw:items-center tw:gap-2 tw:rounded-full tw:border tw:border-white/20 tw:px-4 tw:py-2 tw:text-sm tw:font-bold tw:no-underline tw:whitespace-nowrap tw:text-white tw:transition tw:hover:bg-white/10 tw:sm:text-base"
              >
                <IconLogin size={18} stroke={1.9} aria-hidden="true" />
                Acessar sistema
              </Link>
            </div>
          </div>
        </div>

        <p className="tw:pt-7 tw:text-center tw:text-sm tw:font-medium tw:leading-relaxed tw:text-white/80">
          © {new Date().getFullYear()} {landingTexts.site_name} ·{' '}
          {landingTexts.footer_note}
        </p>
      </div>
    </footer>
  );
}
