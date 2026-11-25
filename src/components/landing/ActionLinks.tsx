import {
  IconArrowUpRight,
  IconBuildingChurch,
  IconLink,
  IconPray,
  IconUserPlus,
  IconUsersGroup,
} from '@tabler/icons-react';
import { landingLinks } from '../../data/landingContent';
import Reveal from './Reveal';
import SectionHeading from './SectionHeading';

const ACTIONS = [
  {
    label: 'Todos os links',
    description: 'Acesse os canais e formulários oficiais da igreja em um só lugar.',
    href: landingLinks.links.url,
    Icon: IconLink,
  },
  {
    label: 'Pedidos de Oração',
    description: 'Envie seu pedido e seja acompanhado pela equipe de intercessão.',
    href: landingLinks.prayer.url,
    Icon: IconPray,
  },
  {
    label: 'Grupos de Crescimento',
    description: 'Encontre uma célula perto de você e cresça em comunhão.',
    href: landingLinks.growth_groups.url,
    Icon: IconUsersGroup,
  },
  {
    label: 'Cadastro de Visitante',
    description: 'Faça seu cadastro e receba as informações da sua primeira visita.',
    href: landingLinks.visitor.url,
    Icon: IconUserPlus,
  },
  {
    label: 'Ficha de Membro',
    description: 'Atualize seus dados e dê continuidade à sua caminhada eclesial.',
    href: landingLinks.member_form.url,
    Icon: IconBuildingChurch,
  },
];

export default function ActionLinks() {
  return (
    <section id="recursos" className="tw:bg-white tw:py-20 tw:lg:py-28">
      <div className="tw:mx-auto tw:max-w-7xl tw:px-5 tw:lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Caminhos e recursos"
            title="Serviços para você"
            description="Ferramentas simples para acompanhar a vida da igreja, pedir oração e dar os próximos passos na fé."
          />
        </Reveal>

        <div className="tw:mt-14 tw:grid tw:gap-5 tw:sm:grid-cols-2 tw:lg:grid-cols-3">
          {ACTIONS.map(({ label, description, href, Icon }, index) => (
            <Reveal key={label} delay={index * 60}>
              <a
                href={href}
                className="tw:group tw:flex tw:h-full tw:flex-col tw:rounded-[1.75rem] tw:border tw:border-[#071b3a]/10 tw:bg-[#f7f3ea]/60 tw:p-7 tw:no-underline tw:shadow-sm tw:transition tw:duration-300 tw:hover:-translate-y-1 tw:hover:border-[#1c4ed8]/30 tw:hover:bg-white tw:hover:shadow-lg"
              >
                <span className="tw:inline-flex tw:h-12 tw:w-12 tw:items-center tw:justify-center tw:rounded-2xl tw:bg-[#1c4ed8]/10 tw:text-[#1c4ed8]">
                  <Icon size={24} stroke={1.8} aria-hidden="true" />
                </span>
                <h3 className="landing-display tw:mt-7 tw:text-xl tw:font-bold tw:text-[#071b3a]">
                  {label}
                </h3>
                <p className="tw:mt-3 tw:flex-1 tw:text-base tw:font-medium tw:leading-relaxed tw:text-slate-700">
                  {description}
                </p>
                <span className="tw:mt-6 tw:inline-flex tw:items-center tw:gap-2 tw:text-sm tw:font-bold tw:text-[#1c4ed8]">
                  Acessar
                  <IconArrowUpRight
                    size={18}
                    stroke={2}
                    aria-hidden="true"
                    className="tw:transition tw:group-hover:translate-x-0.5 tw:group-hover:-translate-y-0.5"
                  />
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
