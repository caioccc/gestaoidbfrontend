import { IconCalendarEvent, IconExternalLink } from '@tabler/icons-react';
import { landingLinks, schedule } from '../../data/landingContent';
import type { LandingEvent } from '../../types/landing';
import Reveal from './Reveal';
import SectionHeading from './SectionHeading';
import { LightRays } from './Symbols';

interface ScheduleProps {
  events?: LandingEvent[];
}

export default function Schedule({ events = [] }: ScheduleProps) {
  const calendarUrl = landingLinks.calendar.url;

  return (
    <section
      id="agenda"
      className="tw:relative tw:overflow-hidden tw:bg-[#071b3a] tw:py-20 tw:text-white tw:lg:py-28"
    >
      <LightRays className="tw:pointer-events-none tw:absolute tw:-left-52 tw:top-20 tw:h-[42rem] tw:w-[42rem] tw:opacity-40" />

      <div className="tw:relative tw:mx-auto tw:max-w-7xl tw:px-5 tw:lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Agenda"
            title="Agenda de Cultos e Atividades da Igreja"
            description="Encontros permanentes da igreja para comunhão, ensino, missões e crescimento espiritual."
            light
          />
        </Reveal>

        <Reveal delay={100}>
          <ol className="tw:mt-16 tw:border-t tw:border-white/15">
            {schedule.map((item, index) => (
              <li
                key={item.activity}
                className="tw:grid tw:gap-4 tw:border-b tw:border-white/10 tw:py-8 tw:transition tw:duration-300 tw:hover:bg-white/[0.03] tw:md:grid-cols-[3.5rem_12rem_1fr] tw:md:items-center tw:md:gap-8 tw:md:px-4"
              >
                <span className="landing-display tw:text-2xl tw:font-bold tw:text-[#fbbf24]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="tw:flex tw:items-center tw:gap-2">
                  <IconCalendarEvent size={18} stroke={1.8} className="tw:shrink-0 tw:text-[#fbbf24]" aria-hidden="true" />
                  <p className="tw:text-sm tw:font-bold tw:uppercase tw:tracking-[0.12em] tw:text-[#fbbf24]">
                    {item.period}
                  </p>
                </div>
                <div>
                  <h3 className="landing-display tw:text-2xl tw:font-bold tw:leading-snug tw:text-white">
                    {item.activity}
                  </h3>
                  <p className="tw:mt-2 tw:max-w-2xl tw:text-base tw:font-medium tw:leading-relaxed tw:text-white/85">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal delay={160}>
          <div className="tw:mt-12 tw:rounded-[1.75rem] tw:border tw:border-[#fbbf24]/25 tw:bg-[#fbbf24]/[0.06] tw:p-7">
            <div className="tw:flex tw:flex-col tw:gap-5 tw:md:flex-row tw:md:items-center tw:md:justify-between">
              <div>
                <h3 className="landing-display tw:text-2xl tw:font-bold tw:text-white">
                  Cultos e eventos agendados
                </h3>
                <p className="tw:mt-2 tw:text-base tw:font-medium tw:leading-relaxed tw:text-white/85">
                  {events.length > 0
                    ? 'Confira os próximos encontros divulgados pela igreja.'
                    : 'A agenda do sistema será exibida aqui assim que houver eventos publicados.'}
                </p>
              </div>
              <a
                href={calendarUrl}
                className="tw:inline-flex tw:w-fit tw:items-center tw:gap-2 tw:whitespace-nowrap tw:rounded-full tw:border tw:border-white/20 tw:px-6 tw:py-3 tw:text-base tw:font-bold tw:no-underline tw:text-white tw:transition tw:hover:bg-white/10"
              >
                <IconCalendarEvent size={20} stroke={1.8} aria-hidden="true" />
                Acessar agenda completa
                <IconExternalLink size={18} stroke={1.8} aria-hidden="true" />
              </a>
            </div>

            {events.length > 0 && (
              <ul className="tw:mt-6 tw:grid tw:gap-3 tw:border-t tw:border-white/10 tw:pt-6 tw:sm:grid-cols-2 tw:lg:grid-cols-3">
                {events.map((event) => (
                  <li
                    key={`${event.title}-${event.date}`}
                    className="tw:rounded-xl tw:bg-white/5 tw:p-4"
                  >
                    <p className="tw:text-base tw:font-bold tw:text-white">{event.title}</p>
                    <p className="tw:mt-1 tw:text-sm tw:font-medium tw:text-white/80">
                      {event.date}
                      {event.time ? ` · ${event.time}` : ''}
                    </p>
                    {event.location && (
                      <p className="tw:mt-1 tw:text-sm tw:font-medium tw:text-white/80">{event.location}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
