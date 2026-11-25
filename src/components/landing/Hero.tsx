import { IconArrowRight, IconCalendarEvent } from '@tabler/icons-react';
import Image from 'next/image';
import { landingLinks, landingTexts, site } from '../../data/landingContent';
import Reveal from './Reveal';
import { LightRays } from './Symbols';

const primaryButton =
  'tw:inline-flex tw:items-center tw:justify-center tw:gap-2 tw:rounded-full tw:bg-[#fbbf24] tw:px-7 tw:py-4 tw:text-base tw:font-bold tw:no-underline tw:whitespace-nowrap tw:text-[#071b3a] tw:shadow-[0_16px_36px_rgba(0,0,0,0.28)] tw:transition tw:hover:-translate-y-0.5 tw:hover:bg-[#fcd34d] tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#fbbf24] tw:sm:text-lg';

const secondaryButton =
  'tw:inline-flex tw:items-center tw:justify-center tw:gap-2 tw:rounded-full tw:border tw:border-white/25 tw:px-7 tw:py-4 tw:text-base tw:font-bold tw:no-underline tw:whitespace-nowrap tw:text-white tw:transition tw:hover:-translate-y-0.5 tw:hover:border-white/50 tw:hover:bg-white/10 tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-white tw:sm:text-lg';

export default function Hero() {
  return (
    <section
      id="inicio"
      className="tw:relative tw:min-h-[42rem] tw:overflow-hidden tw:bg-[#04132d] tw:text-white"
    >
      <Image
        src={site.heroImage}
        alt=""
        fill
        priority
        quality={85}
        sizes="100vw"
        className="tw:object-cover"
      />
      <div
        className="tw:absolute tw:inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(4,19,45,0.97) 0%, rgba(4,19,45,0.88) 45%, rgba(4,19,45,0.46) 100%), linear-gradient(0deg, rgba(4,19,45,0.9) 0%, rgba(4,19,45,0.08) 55%)',
        }}
      />
      <LightRays className="landing-drift tw:pointer-events-none tw:absolute tw:-right-40 tw:-top-40 tw:h-[48rem] tw:w-[48rem] tw:opacity-60" />

      <div className="tw:relative tw:mx-auto tw:max-w-5xl tw:px-5 tw:py-20 tw:sm:py-24 tw:lg:px-8 tw:lg:py-28">
        <Reveal>
          <h1 className="landing-display tw:mt-2 tw:max-w-4xl tw:text-4xl tw:font-bold tw:leading-[1.08] tw:text-white tw:sm:text-5xl tw:lg:text-[4.5rem]">
            {landingTexts.hero_title}
          </h1>

          <p className="tw:mt-7 tw:max-w-3xl tw:text-lg tw:font-medium tw:leading-relaxed tw:text-white/85 tw:sm:text-xl">
            {landingTexts.hero_description}
          </p>

          <div className="tw:mt-10 tw:flex tw:flex-col tw:items-start tw:gap-3 tw:sm:flex-row tw:sm:flex-wrap">
            <a href="#sobre" className={primaryButton}>
              {landingTexts.hero_primary_label}
              <IconArrowRight size={20} stroke={2} aria-hidden="true" />
            </a>
            <a href={landingLinks.calendar.url} className={secondaryButton}>
              <IconCalendarEvent size={20} stroke={1.9} aria-hidden="true" />
              {landingTexts.hero_secondary_label}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
