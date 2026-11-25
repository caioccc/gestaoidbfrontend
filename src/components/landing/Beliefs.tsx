import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { beliefs, beliefsIntro } from '../../data/landingContent';
import LandingTabs from './LandingTabs';
import Reveal from './Reveal';
import SectionHeading from './SectionHeading';
import { BibleSymbol, Ornament } from './Symbols';

const groups = [
  { id: 'fundamentos', label: '01–05 · Fundamentos', items: beliefs.slice(0, 5) },
  { id: 'espirito', label: '06–10 · Vida e Espírito', items: beliefs.slice(5, 10) },
  { id: 'esperanca', label: '11–14 · Esperança', items: beliefs.slice(10, 14) },
];

export default function Beliefs() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % groups.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + groups.length) % groups.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = groups.length - 1;
    else return;

    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="crencas" className="tw:bg-white tw:py-20 tw:lg:py-28">
      <div className="tw:mx-auto tw:max-w-7xl tw:px-5 tw:lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Declaração de fé"
            title="Nossas Crenças"
            description={beliefsIntro}
          />
        </Reveal>

        <div className="tw:mt-14 tw:grid tw:gap-10 tw:lg:grid-cols-[0.76fr_1.24fr]">
          <Reveal>
            <aside className="tw:relative tw:h-full tw:overflow-hidden tw:rounded-[2rem] tw:bg-[#071b3a] tw:p-8 tw:text-white tw:shadow-xl">
              <div className="tw:absolute tw:-bottom-8 tw:-right-10 tw:h-52 tw:w-72 tw:opacity-25">
                <BibleSymbol className="tw:h-full tw:w-full" />
              </div>
              <div className="tw:relative">
                <p className="tw:text-sm tw:font-bold tw:uppercase tw:tracking-[0.18em] tw:text-[#fbbf24]">
                  Fundamento
                </p>
                <h3 className="landing-display tw:mt-6 tw:text-3xl tw:font-bold tw:leading-snug">
                  As Escrituras como alicerce
                </h3>
                <p className="tw:mt-5 tw:text-base tw:font-medium tw:leading-relaxed tw:text-white/80">
                  Cada crença que confessamos está enraizada na Palavra de Deus e orienta a vida
                  da igreja em adoração, discipulado e missão.
                </p>
                <Ornament className="tw:mt-8 tw:h-5 tw:w-24" />
              </div>
            </aside>
          </Reveal>

          <Reveal delay={100}>
            <LandingTabs
              items={groups.map((group) => ({ id: group.id, label: group.label }))}
              active={active}
              onSelect={setActive}
              onKeyDown={handleKeyDown}
              tabRefs={tabRefs}
              idPrefix="crencas"
              ariaLabel="Grupos da declaração de fé"
            />

            <div className="tw:mt-6">
              {groups.map((group, index) => (
                <div
                  key={group.id}
                  role="tabpanel"
                  id={`crencas-panel-${group.id}`}
                  aria-labelledby={`crencas-tab-${group.id}`}
                  hidden={active !== index}
                  className={active === index ? 'tw:block' : 'tw:hidden'}
                >
                  {group.items.map((belief) => (
                    <article
                      key={belief.number}
                      className="tw:grid tw:gap-3 tw:border-b tw:border-slate-200 tw:py-6 tw:last:border-b-0 tw:sm:grid-cols-[5rem_1fr] tw:sm:gap-6"
                    >
                      <p className="landing-display tw:text-4xl tw:font-bold tw:text-[#fbbf24]">
                        {belief.number}
                      </p>
                      <p className="tw:text-base tw:font-medium tw:leading-relaxed tw:text-slate-700 tw:lg:text-lg">
                        <span className="tw:font-bold tw:text-[#071b3a]">Cremos: </span>
                        {belief.text}
                      </p>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
