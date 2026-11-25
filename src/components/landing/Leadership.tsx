import Image from 'next/image';
import { IconUsersGroup } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  internationalCouncilRows,
  internationalCouncilTitle,
  internationalLeaders,
  nationalLeaders,
  nationalSuperintendent,
  regions,
} from '../../data/landingContent';
import type { Leader } from '../../types/landing';
import LandingTabs from './LandingTabs';
import Reveal from './Reveal';
import SectionHeading from './SectionHeading';

const tabs = [
  { id: 'internacional', label: 'Diretoria Internacional' },
  { id: 'brasil', label: 'Brasil' },
  { id: 'regioes', label: '6 Regiões' },
];

function initials(name: string) {
  const cleanName = name.replace(/^(Dr\.|Pra\.|Pr\.|Bp\.|Ev\.)\s+/, '');
  return cleanName
    .split(/\s+e\s+|\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function LeaderCard({ leader, featured = false }: { leader: Leader; featured?: boolean }) {
  return (
    <article
      className={`tw:group tw:flex tw:gap-5 tw:rounded-[1.5rem] tw:p-5 tw:transition tw:duration-300 tw:hover:-translate-y-1 ${
        featured
          ? 'tw:bg-[#071b3a] tw:text-white tw:shadow-xl'
          : 'tw:border tw:border-[#071b3a]/10 tw:bg-white tw:shadow-sm tw:hover:shadow-lg'
      }`}
    >
      <div
        className={`tw:relative tw:h-20 tw:w-20 tw:shrink-0 tw:overflow-hidden tw:rounded-2xl ${
          featured ? 'tw:bg-[#fbbf24]/15' : 'tw:bg-[#071b3a]/5'
        }`}
      >
        {leader.photo ? (
          <Image
            src={leader.photo}
            alt={leader.name}
            fill
            sizes="80px"
            className="tw:object-cover"
          />
        ) : (
          <span
            className={`tw:flex tw:h-full tw:w-full tw:items-center tw:justify-center tw:text-lg tw:font-bold ${
              featured ? 'tw:text-[#fbbf24]' : 'tw:text-[#1c4ed8]'
            }`}
          >
            {initials(leader.name)}
          </span>
        )}
      </div>
      <div className="tw:min-w-0">
        <h3
          className={`landing-display tw:text-lg tw:font-semibold tw:leading-snug ${
            featured ? 'tw:text-white' : 'tw:text-[#071b3a]'
          }`}
        >
          {leader.name}
        </h3>
        <p
          className={`tw:mt-2 tw:text-sm tw:font-medium tw:leading-relaxed ${
            featured ? 'tw:text-[#fbbf24]' : 'tw:text-slate-600'
          }`}
        >
          {leader.role}
        </p>
      </div>
    </article>
  );
}

export default function Leadership() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;

    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="lideranca" className="tw:bg-[#f7f3ea] tw:py-20 tw:lg:py-28">
      <div className="tw:mx-auto tw:max-w-7xl tw:px-5 tw:lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Liderança"
            title="Quem conduz a obra"
            description="Conheça a liderança internacional, nacional e regional da Igreja de Deus no Brasil."
          />
        </Reveal>

        <Reveal delay={80}>
          <LandingTabs
            items={tabs}
            active={active}
            onSelect={setActive}
            onKeyDown={handleKeyDown}
            tabRefs={tabRefs}
            idPrefix="lideranca"
            ariaLabel="Grupos de liderança"
            className="tw:mt-12"
          />
        </Reveal>

        <div className="tw:mt-8">
          <div
            role="tabpanel"
            id="lideranca-panel-internacional"
            aria-labelledby="lideranca-tab-internacional"
            hidden={active !== 0}
            className={active === 0 ? 'tw:block' : 'tw:hidden'}
          >
            <div className="tw:grid tw:gap-5 tw:md:grid-cols-3">
              {internationalLeaders.map((leader) => (
                <LeaderCard key={leader.name} leader={leader} />
              ))}
            </div>

            <div className="tw:mt-8 tw:rounded-[1.75rem] tw:border tw:border-[#071b3a]/10 tw:bg-white/80 tw:p-6 tw:shadow-sm tw:lg:p-8">
              <div className="tw:flex tw:items-center tw:gap-3">
                <span className="tw:inline-flex tw:h-11 tw:w-11 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl tw:bg-[#1c4ed8]/10 tw:text-[#1c4ed8]">
                  <IconUsersGroup size={22} stroke={1.8} aria-hidden="true" />
                </span>
                <h3 className="landing-display tw:text-xl tw:font-bold tw:uppercase tw:leading-snug tw:text-[#071b3a] tw:sm:text-2xl">
                  {internationalCouncilTitle}
                </h3>
              </div>

              <div className="tw:mt-6 tw:grid tw:gap-4 tw:md:grid-cols-2">
                {internationalCouncilRows.map((row) => (
                  <article
                    key={row.label}
                    className="tw:rounded-2xl tw:border tw:border-[#071b3a]/10 tw:bg-white tw:p-5 tw:shadow-sm"
                  >
                    <p className="tw:text-sm tw:font-bold tw:uppercase tw:tracking-[0.12em] tw:text-[#fbbf24]">
                      {row.label}
                    </p>
                    <ul className="tw:mt-3 tw:grid tw:gap-1.5">
                      {row.names.map((name) => (
                        <li
                          key={name}
                          className="tw:text-sm tw:font-medium tw:leading-relaxed tw:text-slate-700 tw:sm:text-base"
                        >
                          {name}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div
            role="tabpanel"
            id="lideranca-panel-brasil"
            aria-labelledby="lideranca-tab-brasil"
            hidden={active !== 1}
            className={active === 1 ? 'tw:block' : 'tw:hidden'}
          >
            <LeaderCard leader={nationalSuperintendent} featured />
            <div className="tw:mt-5 tw:grid tw:gap-4 tw:sm:grid-cols-2 tw:lg:grid-cols-3">
              {nationalLeaders.map((leader) => (
                <LeaderCard key={`${leader.name}-${leader.role}`} leader={leader} />
              ))}
            </div>
          </div>

          <div
            role="tabpanel"
            id="lideranca-panel-regioes"
            aria-labelledby="lideranca-tab-regioes"
            hidden={active !== 2}
            className={
              active === 2
                ? 'tw:grid tw:gap-5 tw:sm:grid-cols-2 tw:lg:grid-cols-3'
                : 'tw:hidden'
            }
          >
            {regions.map((region) => (
              <article
                key={region.region}
                className="tw:flex tw:items-center tw:gap-5 tw:rounded-[1.5rem] tw:border tw:border-[#071b3a]/10 tw:bg-white tw:p-5 tw:shadow-sm"
              >
                <span className="tw:flex tw:h-12 tw:w-12 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-[#1c4ed8]/10 tw:text-sm tw:font-bold tw:text-[#1c4ed8]">
                  {initials(region.supervisor)}
                </span>
                <div>
                  <p className="tw:text-sm tw:font-bold tw:uppercase tw:tracking-[0.12em] tw:text-[#1c4ed8]">
                    {region.region}
                  </p>
                  <h3 className="landing-display tw:mt-1 tw:text-lg tw:font-semibold tw:text-[#071b3a]">
                    {region.supervisor}
                  </h3>
                  <p className="tw:mt-1 tw:text-sm tw:font-medium tw:text-slate-600">
                    Supervisor Regional
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
