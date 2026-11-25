import {
  IconBook2,
  IconBuildingChurch,
  IconHeartHandshake,
  IconPray,
  IconUserPlus,
  IconUsersGroup,
} from '@tabler/icons-react';
import { landingTexts } from '../../data/landingContent';
import Reveal from './Reveal';
import SectionHeading from './SectionHeading';
import { CrossMark, LightRays } from './Symbols';

const paths = [
  {
    number: '01',
    title: 'Culto e comunhão',
    text: 'Encontros dominicais para louvor, ensino da Palavra, Santa Ceia e comunhão intergeracional.',
    Icon: IconBuildingChurch,
  },
  {
    number: '02',
    title: 'Discipulado e EBD',
    text: 'Formação bíblica em todas as faixas etárias, com acompanhamento e crescimento na fé.',
    Icon: IconBook2,
  },
  {
    number: '03',
    title: 'Grupos de Crescimento',
    text: 'Celebras em pequenos grupos para estudo, oração, serviço e cuidado pastoral.',
    Icon: IconUsersGroup,
  },
  {
    number: '04',
    title: 'Oração e intercessão',
    text: 'Momentos de entrega, pedido e gratidão, alicerçados na fé e na presença de Deus.',
    Icon: IconPray,
  },
  {
    number: '05',
    title: 'Visitantes e membros',
    text: 'Acolhimento, acompanhamento e caminhada eclesial para cada pessoa e cada família.',
    Icon: IconUserPlus,
  },
  {
    number: '06',
    title: 'Missões e ação social',
    text: 'Intercessão, evangelismo e cuidado com famílias em Campina Grande e além.',
    Icon: IconHeartHandshake,
  },
];

export default function Journeys() {
  return (
    <section
      id="servicos"
      className="tw:relative tw:overflow-hidden tw:bg-[#f7f3ea] tw:py-20 tw:lg:py-28"
    >
      <LightRays className="tw:pointer-events-none tw:absolute tw:-right-52 tw:top-10 tw:h-[40rem] tw:w-[40rem] tw:opacity-30" />
      <CrossMark className="tw:pointer-events-none tw:absolute tw:-bottom-20 tw:-left-20 tw:h-80 tw:w-64 tw:opacity-[0.05]" />

      <div className="tw:relative tw:mx-auto tw:max-w-7xl tw:px-5 tw:lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Serviços"
            title={landingTexts.journeys_title}
            description={landingTexts.journeys_description}
          />
        </Reveal>

        <div className="tw:mt-16 tw:grid tw:gap-6 tw:sm:grid-cols-2 tw:lg:grid-cols-3">
          {paths.map((path, index) => (
            <Reveal key={path.number} delay={index * 60}>
              <article className="tw:h-full tw:rounded-[1.75rem] tw:border tw:border-[#071b3a]/10 tw:bg-white tw:p-7 tw:shadow-sm tw:transition tw:duration-300 tw:hover:-translate-y-1 tw:hover:shadow-lg">
                <span className="tw:inline-flex tw:h-12 tw:w-12 tw:items-center tw:justify-center tw:rounded-2xl tw:bg-[#1c4ed8]/10 tw:text-[#1c4ed8]">
                  <path.Icon size={24} stroke={1.8} aria-hidden="true" />
                </span>
                <p className="tw:mt-8 tw:text-sm tw:font-extrabold tw:uppercase tw:tracking-[0.16em] tw:text-[#fbbf24]">
                  {path.number}
                </p>
                <h3 className="landing-display tw:mt-2 tw:text-xl tw:font-bold tw:text-[#071b3a]">
                  {path.title}
                </h3>
                <p className="tw:mt-3 tw:text-base tw:font-medium tw:leading-relaxed tw:text-slate-700">
                  {path.text}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
