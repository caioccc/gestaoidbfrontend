import {
  IconLayoutDashboard,
  IconLogin,
  IconMenu2,
  IconX,
} from '@tabler/icons-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { site } from '../../data/landingContent';

const NAV_ITEMS = [
  { label: 'Sobre', href: '#sobre' },
  { label: 'Serviços', href: '#servicos' },
  { label: 'Crenças', href: '#crencas' },
  { label: 'Agenda', href: '#agenda' },
  { label: 'Liderança', href: '#lideranca' },
  { label: 'Contato', href: '#contato' },
];

const primaryButton =
  'tw:inline-flex tw:items-center tw:justify-center tw:gap-2 tw:rounded-full tw:bg-[#fbbf24] tw:px-5 tw:py-2.5 tw:text-sm tw:font-bold tw:no-underline tw:whitespace-nowrap tw:text-[#071b3a] tw:shadow-[0_10px_30px_rgba(251,191,36,0.18)] tw:transition tw:hover:-translate-y-0.5 tw:hover:bg-[#fcd34d] tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#fbbf24] tw:sm:text-base';

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();
  const closeMenu = () => setOpen(false);

  const authArea = (mobile = false) => {
    if (!isLoading && isAuthenticated && user) {
      return (
        <div
          className={
            mobile
              ? 'tw:flex tw:flex-col tw:gap-3 tw:border-t tw:border-white/15 tw:px-2 tw:pt-4'
              : 'tw:flex tw:items-center tw:gap-4'
          }
        >
          {/* <span className="tw:text-sm tw:font-bold tw:text-white/95 tw:sm:text-base">
            Olá, {user.name}
          </span> */}
          <Link href="/dashboard" onClick={closeMenu} className={primaryButton}>
            <IconLayoutDashboard size={18} stroke={1.9} aria-hidden="true" />
            Acessar painel
          </Link>
        </div>
      );
    }

    return (
      <Link href="/login" onClick={closeMenu} className={primaryButton}>
        <IconLogin size={18} stroke={1.9} aria-hidden="true" />
        Entrar
      </Link>
    );
  };

  return (
    <header className="tw:sticky tw:top-0 tw:z-50 tw:border-b tw:border-white/10 tw:bg-[#04132d]/95 tw:backdrop-blur-xl">
      <div className="tw:mx-auto tw:flex tw:max-w-7xl tw:items-center tw:justify-between tw:gap-3 tw:px-5 tw:py-3 tw:lg:gap-4 tw:lg:px-8">
        <Link
          href="/"
          onClick={closeMenu}
          className="tw:group tw:flex tw:min-w-0 tw:items-center tw:gap-2 tw:no-underline tw:sm:gap-3"
        >
          <span className="tw:relative tw:flex tw:h-11 tw:w-11 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-white/5 tw:sm:h-12 tw:sm:w-12">
            <Image
              src="/android-icon-192x192.png"
              alt={`Logo da ${site.fullName}`}
              width={64}
              height={64}
              priority
              className="tw:relative tw:h-9 tw:w-9 tw:object-contain tw:sm:h-10 tw:sm:w-10"
            />
          </span>
          <span className="tw:flex tw:min-w-0 tw:flex-col tw:leading-tight">
            <span className="landing-display tw:truncate tw:text-sm tw:font-bold tw:tracking-wide tw:text-white tw:sm:text-base">
              {site.name}
            </span>
            <span className="tw:hidden tw:truncate tw:text-xs tw:font-semibold tw:uppercase tw:tracking-[0.1em] tw:text-white/80 tw:sm:block tw:sm:text-sm">
              Igreja de Deus no Brasil - Centenário
            </span>
          </span>
        </Link>

        <nav
          aria-label="Navegação principal"
          className="tw:hidden tw:items-center tw:gap-8 tw:lg:flex"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={closeMenu}
              className="landing-nav-link tw:text-sm tw:font-semibold tw:no-underline tw:text-white/80 tw:transition tw:hover:text-white tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-4 tw:focus-visible:outline-[#fbbf24] tw:lg:text-base"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="tw:hidden tw:lg:block">{authArea()}</div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          className="landing-menu-toggle tw:inline-flex tw:h-11 tw:w-11 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:border tw:text-white tw:transition tw:lg:hidden"
        >
          {open ? (
            <IconX size={24} stroke={2.2} aria-hidden="true" />
          ) : (
            <IconMenu2 size={24} stroke={2.2} aria-hidden="true" />
          )}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-navigation"
          aria-label="Navegação principal mobile"
          className="tw:border-t tw:border-white/10 tw:bg-[#04132d] tw:px-5 tw:pb-6 tw:pt-3 tw:shadow-2xl tw:lg:hidden"
        >
          <div className="tw:flex tw:flex-col tw:gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="tw:rounded-xl tw:px-3 tw:py-3 tw:text-base tw:font-semibold tw:no-underline tw:text-white/90 tw:transition tw:hover:bg-white/10 tw:hover:text-white"
              >
                {item.label}
              </a>
            ))}
            {authArea(true)}
          </div>
        </nav>
      )}
    </header>
  );
}
