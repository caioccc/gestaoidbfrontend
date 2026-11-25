import { historyMilestones, landingTexts, site } from '../../data/landingContent';
import Reveal from './Reveal';
import SectionHeading from './SectionHeading';
import { CrossMark, Ornament } from './Symbols';

export default function About() {
  const videoEmbed = site.videoEmbedUrl;

  return (
    <section id="sobre" className="tw:bg-[#f7f3ea] tw:py-20 tw:lg:py-28">
      <div className="tw:mx-auto tw:max-w-7xl tw:px-5 tw:lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Sobre nós"
            title={landingTexts.about_title}
            description={landingTexts.about_description}
          />
        </Reveal>

        <div className="tw:mt-16 tw:grid tw:gap-12 tw:lg:grid-cols-[0.78fr_1.22fr]">
          <Reveal>
            <div className="tw:relative tw:overflow-hidden tw:rounded-[2rem] tw:bg-[#071b3a] tw:p-8 tw:text-white tw:shadow-xl">
              <CrossMark className="tw:pointer-events-none tw:absolute tw:-bottom-16 tw:-right-14 tw:h-72 tw:w-56 tw:opacity-[0.12]" />
              <p className="tw:text-sm tw:font-bold tw:uppercase tw:tracking-[0.18em] tw:text-[#fbbf24]">
                Nossa raiz
              </p>
              <p className="landing-display tw:relative tw:mt-8 tw:text-3xl tw:font-semibold tw:leading-snug">
                “A fé que recebemos não é para ser guardada, mas vivida e multiplicada.”
              </p>
              <Ornament className="tw:relative tw:mt-8 tw:h-5 tw:w-24" />
            </div>
          </Reveal>

          <Reveal delay={100}>
            <ol className="tw:relative tw:border-l tw:border-[#071b3a]/15 tw:pl-8 tw:sm:pl-10">
              {historyMilestones.map((item) => (
                <li key={item.year} className="tw:relative tw:pb-10 tw:last:pb-0">
                  <span className="tw:absolute tw:-left-[2.44rem] tw:top-1 tw:h-3 tw:w-3 tw:rounded-full tw:border-4 tw:border-[#f7f3ea] tw:bg-[#fbbf24] tw:shadow-[0_0_0_1px_rgba(251,191,36,0.45)] tw:sm:-left-[3.44rem]" />
                  <p className="tw:text-xs tw:font-extrabold tw:uppercase tw:tracking-[0.16em] tw:text-[#1c4ed8]">
                    {item.year}
                  </p>
                  <h3 className="landing-display tw:mt-2 tw:text-2xl tw:font-semibold tw:text-[#071b3a]">
                    {item.title}
                  </h3>
                  <p className="tw:mt-3 tw:max-w-2xl tw:text-base tw:font-medium tw:leading-relaxed tw:text-slate-700">
                    {item.text}
                  </p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>

        <div className="tw:mt-20 tw:grid tw:gap-6 tw:lg:grid-cols-[1.15fr_0.85fr]">
          <Reveal>
            <article className="tw:relative tw:h-full tw:overflow-hidden tw:rounded-[2rem] tw:bg-[#071b3a] tw:p-8 tw:text-white tw:shadow-xl tw:lg:p-12">
              <CrossMark className="tw:pointer-events-none tw:absolute tw:-right-10 tw:top-8 tw:h-64 tw:w-48 tw:opacity-[0.09]" />
              <p className="tw:text-sm tw:font-bold tw:uppercase tw:tracking-[0.18em] tw:text-[#fbbf24]">
                Nossa missão
              </p>
              <h3 className="landing-display tw:relative tw:mt-5 tw:text-3xl tw:font-semibold tw:leading-snug tw:lg:text-4xl">
                {landingTexts.mission_title}
              </h3>
              <p className="tw:relative tw:mt-5 tw:max-w-2xl tw:text-base tw:font-medium tw:leading-relaxed tw:text-white/85 tw:lg:text-lg">
                {landingTexts.mission_text}
              </p>
            </article>
          </Reveal>

          <Reveal delay={100}>
            <article className="tw:flex tw:h-full tw:flex-col tw:justify-center tw:rounded-[2rem] tw:border tw:border-[#071b3a]/10 tw:bg-white tw:p-8 tw:shadow-sm tw:lg:p-10">
              <p className="tw:text-sm tw:font-bold tw:uppercase tw:tracking-[0.18em] tw:text-[#1c4ed8]">
                Nossa visão
              </p>
              <h3 className="landing-display tw:mt-5 tw:text-3xl tw:font-semibold tw:text-[#071b3a]">
                {landingTexts.vision_title}
              </h3>
              <p className="tw:mt-5 tw:text-base tw:font-medium tw:leading-relaxed tw:text-slate-700 tw:lg:text-lg">
                {landingTexts.vision_text}
              </p>
              <Ornament className="tw:mt-8 tw:h-5 tw:w-24" />
            </article>
          </Reveal>
        </div>

        <Reveal>
          <div className="tw:my-8 tw:grid tw:gap-0 tw:overflow-hidden tw:rounded-[2rem] tw:bg-white tw:py-12 tw:shadow-xl tw:lg:grid-cols-[0.82fr_1.18fr]">
            <div className="tw:p-8 tw:lg:p-12">
              <p className="tw:text-sm tw:font-bold tw:uppercase tw:tracking-[0.18em] tw:text-[#1c4ed8]">
                Vídeo institucional
              </p>
              <h3 className="landing-display tw:mt-5 tw:text-2xl tw:font-semibold tw:leading-snug tw:text-[#071b3a] tw:lg:text-3xl">
                Conheça a História da Igreja de Deus no Brasil
              </h3>
              <p className="tw:mt-5 tw:text-base tw:font-medium tw:leading-relaxed tw:text-slate-700">
                Convidamos você a conhecer a trajetória da Igreja de Deus, desde a primeira
                reunião de fundação até a presença missionária no Brasil e em Campina Grande.
              </p>
            </div>
            <div className="tw:p-4 tw:sm:p-6">
              <div className="tw:aspect-video tw:w-full tw:overflow-hidden tw:rounded-2xl tw:bg-[#04132d]">
                {videoEmbed ? (
                  <iframe
                    src={videoEmbed}
                    title="História da Igreja de Deus no Brasil"
                    className="tw:h-full tw:w-full"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : null}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
