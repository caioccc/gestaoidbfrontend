import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import {
  AppShell,
  Burger,
  Group,
  Text,
  ThemeIcon,
  ActionIcon,
  UnstyledButton,
  Box,
  ScrollArea,
  Flex,
  Menu,
  Avatar,
  useMantineColorScheme,
  Tooltip,
  Badge,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconLayoutDashboard,
  IconUpload,
  IconArrowUpCircle,
  IconArrowDownCircle,
  IconUsers,
  IconCalendarStats,
  IconReport,
  IconChartBar,
  IconWallet,
  IconCalendarEvent,
  IconSettings,
  IconShieldCheck,
  IconClipboardCheck,
  IconSun,
  IconMoon,
  IconLogout,
  IconLanguage,
  IconChevronDown,
  IconDotsVertical,
  IconBuildingChurch,
  IconUsersGroup,
  IconUserShield,
  IconSwitchHorizontal,
  IconChartPie,
  IconPackage,
  IconFileText,
  IconLink,
  IconHomeHeart,
  IconCertificate,
  IconReceipt,
  IconMap,
  IconPray,
  IconSchool,
  IconListCheck,
  IconMusic,
} from "@tabler/icons-react";
import { useAuth, useRoleHelpers } from "../contexts/AuthContext";
import { useLanguage, SupportedLocale } from "../i18n";
import { accountsApi } from "../api/accounts";
import { Church, ChurchType } from "../types";
import ContentContextHeader from "./ContentContextHeader";
import NotificationBell from "./NotificationBell";

const LOCALES: { value: SupportedLocale; label: string }[] = [
  { value: "pt-br", label: "PT-BR" },
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
];

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  adminOnly?: boolean;
  keepAbsolute?: boolean;
  fixed?: boolean;
  roles?: string[];
  badge?: number;
}

const ROLE_LABELS: Record<string, string> = {
  PASTOR: "Pastor(a)",
  SECRETARIA: "Secretaria",
  TESOUREIRO: "Tesoureiro(a)",
  INTERCESSAO: "Intercessão & Visitação",
  LOUVOR: "Líder de Louvor & Música",
  MUSICO: "Músico / Voluntário",
};

function SidebarContent({
  onNavigate,
  churchType,
}: {
  onNavigate?: () => void;
  churchType?: ChurchType;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const { user } = useAuth();
  const {
    hasRole,
    canFinance,
    canApproveCongregations,
    canManageMusic,
    canViewMusic,
  } = useRoleHelpers(user);

  // Usar router.query.churchId (valor resolvido, ex.: "7") em vez de
  // fazer parse de router.pathname — que no Next.js contém o placeholder
  // literal "[churchId]" e desfazeria a base de navegação.
  const q = router.query.churchId;
  const adminChurchId = q && !Array.isArray(q) ? String(q) : null;
  const qc = router.query.congregationId;
  const congregationId = qc && !Array.isArray(qc) ? String(qc) : null;
  const basePath = congregationId
    ? `/churches/${congregationId}`
    : adminChurchId
      ? `/admin/churches/${adminChurchId}`
      : "";
  // Na visão de congregação, Perfil da Igreja, Usuários e Membros são da
  // PRÓPRIA congregação (seções /churches/{id}/... ou /admin/churches/{id}/...).
  // Um ADMIN dentro de uma congregação também não gerencia a Central de
  // Aprovação da Sede (age como usuário daquela congregação).
  const congregationScope = !!congregationId || churchType === "CONGREGATION";

  const nav = (href: string) => (basePath ? `${basePath}${href}` : href);
  // Menus sem seção em /churches/[congregationId]/[section] (Atas, Cultos,
  // Patrimônio, Relatórios de Membros) devem abrir nas rotas FIXAS: as APIs
  // dessas telas já operam sobre user.church (a congregação ativa após o
  // switch), sem depender de uma seção administrada por churchId.
  const isFixedInCongregation = (item: NavItem) =>
    !!item.fixed && !!congregationId && !user?.is_staff;
  const resolveHref = (item: NavItem) =>
    item.keepAbsolute || isFixedInCongregation(item)
      ? item.href
      : nav(item.href);
  const isActive = (item: NavItem) => {
    const href = resolveHref(item);
    if (adminChurchId || congregationId) {
      return router.asPath.replace(/\/$/, "") === href.replace(/\/$/, "");
    }
    return router.pathname === item.href;
  };

  const hasChurch = !!user?.church;
  const isAdminWithoutChurch = !!user?.is_staff && !hasChurch;
  // Um admin (aprovador) sem igreja só vê as seções de gestão financeira
  // quando está dentro de uma igreja específica. Na lista de igrejas,
  // aparece apenas o menu "Igrejas".
  // Dentro de qualquer igreja (admin ou congregação), Perfil/Usuários/Membros
  // ficam no escopo da igreja atual; "Igrejas" e "Central de Aprovação" são
  // páginas globais.
  const showChurchSections =
    !isAdminWithoutChurch || !!adminChurchId || !!congregationId;

  const canManageChurch =
    !!user?.is_staff ||
    !!user?.can_manage_churches ||
    (user?.church?.church_type === "INDEPENDENT" && hasRole("PASTOR"));
  // Tesoureiro(a) e Pastor(a) lidam com o financeiro; Secretária não enxerga
  // os módulos financeiros no menu (entradas, saídas, dizimistas, fechamentos,
  // DRE, extratos e validação mensal). Tesoureiro(a) também acessa os módulos
  // de secretaria da igreja (membros, patrimônio, relatórios), mas não vê
  // Usuários nem Governança.
  const canSeeMembers = hasRole("PASTOR", "SECRETARIA", "TESOUREIRO");
  const canSeeVisitation = hasRole("PASTOR", "SECRETARIA", "INTERCESSAO");
  const canSeePrayerRequests = hasRole("INTERCESSAO", "PASTOR", "SECRETARIA");
  const canSeeUsers = hasRole("PASTOR");
  const isMusicRole = user?.role === "MUSICO" || user?.role === "LOUVOR";
  const hideDashboard = isMusicRole || user?.role === "INTERCESSAO";

  // Congregações não possuem Relatório Regional: o menu é ocultado nos três
  // contextos possíveis (usuário de congregação, rota /churches/[id] e a
  // página admin quando a igreja aberta é uma congregação).
  const isCongregationScope =
    churchType === "CONGREGATION" ||
    user?.church?.church_type === "CONGREGATION";

  const dashboardLabel = canFinance
    ? t.nav.dashboard
    : t.secretaryDashboard.title;

  const [pendingApprovals, setPendingApprovals] = useState(0);
  useEffect(() => {
    if (!canApproveCongregations || isCongregationScope) return;
    let cancelled = false;
    const load = () => {
      accountsApi
        .pendingCongregations()
        .then((items) => {
          if (!cancelled) setPendingApprovals(items.length);
        })
        .catch(() => undefined);
    };
    load();
    const interval = window.setInterval(load, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [canApproveCongregations, isCongregationScope]);

  const sections: {
    title: string;
    requiresChurch: boolean;
    items: NavItem[];
  }[] = [
    {
      title: t.section.overview,
      requiresChurch: false,
      items: [
        ...(hideDashboard
          ? []
          : [
              {
                label: dashboardLabel,
                icon: <IconLayoutDashboard size={18} />,
                href: "/dashboard",
              },
            ]),
        {
          label: t.nav.calendar,
          icon: <IconCalendarEvent size={18} />,
          href: "/calendar",
        },
      ],
    },
    ...(canApproveCongregations ||
    user?.is_staff ||
    (canManageChurch && !user?.is_staff)
      ? [
          {
            title: t.section.governance,
            requiresChurch: false,
            items: [
              ...(user?.is_staff
                ? [
                    {
                      label: t.nav.churches,
                      icon: <IconShieldCheck size={18} />,
                      href: "/admin/churches",
                      keepAbsolute: true,
                    } as NavItem,
                  ]
                : []),
              ...(canManageChurch && !user?.is_staff
                ? [
                    {
                      label: t.nav.congregations,
                      icon: <IconBuildingChurch size={18} />,
                      href: "/churches",
                      keepAbsolute: true,
                    } as NavItem,
                  ]
                : []),
              ...(canApproveCongregations && !congregationScope
                ? [
                    {
                      label: t.nav.approvals,
                      icon: <IconClipboardCheck size={18} />,
                      href: "/approvals",
                      keepAbsolute: true,
                      badge: pendingApprovals,
                    } as NavItem,
                  ]
                : []),
            ] as NavItem[],
          },
        ]
      : []),
    ...(showChurchSections && (canSeeMembers || canSeeVisitation)
      ? [
          {
            title: t.section.secretaryMembership,
            requiresChurch: true,
            items: [
              {
                label: t.nav.members,
                icon: <IconUsersGroup size={18} />,
                href: "/members",
                roles: ["PASTOR", "SECRETARIA", "TESOUREIRO"],
              } as NavItem,
              {
                label: t.nav.minutes,
                icon: <IconFileText size={18} />,
                href: "/atas",
                fixed: true,
                roles: ["PASTOR", "SECRETARIA", "TESOUREIRO"],
              } as NavItem,
              {
                label: t.nav.cultos,
                icon: <IconBuildingChurch size={18} />,
                href: "/cultos",
                fixed: true,
                roles: ["PASTOR", "SECRETARIA", "TESOUREIRO"],
              } as NavItem,
              {
                label: t.nav.inventory,
                icon: <IconPackage size={18} />,
                href: "/inventory",
                fixed: true,
                roles: ["PASTOR", "SECRETARIA", "TESOUREIRO"],
              } as NavItem,
              {
                label: t.nav.memberReports,
                icon: <IconChartPie size={18} />,
                href: "/members-reports",
                fixed: true,
                roles: ["PASTOR", "SECRETARIA", "TESOUREIRO"],
              } as NavItem,
              {
                label: t.nav.certificates,
                icon: <IconCertificate size={18} />,
                href: "/certificates",
                roles: ["PASTOR", "SECRETARIA"],
              } as NavItem,
              {
                label: t.nav.links,
                icon: <IconLink size={18} />,
                href: "/links",
                roles: ["PASTOR", "SECRETARIA"],
              } as NavItem,
              {
                label: t.nav.growthGroups,
                icon: <IconHomeHeart size={18} />,
                href: "/growth-groups",
                roles: ["PASTOR", "SECRETARIA", "TESOUREIRO", "INTERCESSAO"],
              } as NavItem,
              {
                label: t.nav.visitation,
                icon: <IconMap size={18} />,
                href: "/visitation",
                roles: ["PASTOR", "SECRETARIA", "INTERCESSAO"],
              } as NavItem,
              {
                label: t.nav.prayerRequests,
                icon: <IconPray size={18} />,
                href: "/prayer-requests",
                roles: ["INTERCESSAO", "PASTOR", "SECRETARIA"],
              } as NavItem,
              {
                label: t.nav.sundaySchool,
                icon: <IconSchool size={18} />,
                href: "/sunday-school",
                roles: ["PASTOR", "SECRETARIA"],
              } as NavItem,
            ],
          },
        ]
      : []),
    ...(showChurchSections && (canManageMusic || canViewMusic)
      ? [
          {
            title: t.section.music,
            requiresChurch: true,
            items: [
              {
                label: t.music.songsTitle,
                icon: <IconMusic size={18} />,
                href: "/songs",
              },
              {
                label: t.music.setlistsTitle,
                icon: <IconListCheck size={18} />,
                href: "/setlists",
              },
            ],
          },
        ]
      : []),
    ...(canFinance
      ? [
          {
            title: t.section.ledger,
            requiresChurch: true,
            items: [
              {
                label: t.nav.import,
                icon: <IconUpload size={18} />,
                href: "/import",
              },
              {
                label: t.nav.entries,
                icon: <IconArrowUpCircle size={18} />,
                href: "/entries",
              },
              {
                label: t.nav.exits,
                icon: <IconArrowDownCircle size={18} />,
                href: "/exits",
              },
              {
                label: t.nav.receipts,
                icon: <IconReceipt size={18} />,
                href: "/receipts",
              },
              {
                label: t.nav.tithers,
                icon: <IconUsers size={18} />,
                href: "/tithers",
              },
              {
                label: t.nav.closings,
                icon: <IconCalendarStats size={18} />,
                href: "/closings",
              },
            ],
          },
        ]
      : []),
    ...(canFinance
      ? [
          {
            title: t.section.reports,
            requiresChurch: true,
            items: [
              ...(!isCongregationScope
                ? [
                    {
                      label: t.nav.reports,
                      icon: <IconReport size={18} />,
                      href: "/reports",
                    },
                  ]
                : []),
              {
                label: t.nav.dre,
                icon: <IconChartBar size={18} />,
                href: "/dre",
              },
              {
                label: t.nav.statement,
                icon: <IconWallet size={18} />,
                href: "/statement",
              },
              {
                label: t.nav.validation,
                icon: <IconClipboardCheck size={18} />,
                href: "/validation",
              },
            ],
          },
        ]
      : []),
    ...(showChurchSections && !isMusicRole
      ? [
          {
            title: t.section.settings,
            requiresChurch: false,
            items: [
              {
                label: t.nav.settings,
                icon: <IconSettings size={18} />,
                href: "/settings",
              },
              ...(canSeeUsers
                ? [
                    {
                      label: t.nav.users,
                      icon: <IconUserShield size={18} />,
                      href: "/users",
                    },
                  ]
                : []),
            ] as NavItem[],
          },
        ]
      : []),
  ];

  return (
    <ScrollArea>
      <Flex direction="column" gap={4} p="xs">
        {sections
          .filter((section) => !section.requiresChurch || showChurchSections)
          .map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.roles || hasRole(...item.roles),
            );
            if (visibleItems.length === 0) return null;
            return (
              <Box key={section.title} mb="xs">
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  tt="uppercase"
                  px="xs"
                  mb={4}
                >
                  {section.title}
                </Text>
                {visibleItems.map((item) => {
                  const href = resolveHref(item);
                  const active = isActive(item);
                  return (
                    <UnstyledButton
                      key={item.href}
                      onClick={() => {
                        router.push(href);
                        onNavigate?.();
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "var(--mantine-radius-sm)",
                        backgroundColor: active
                          ? "var(--mantine-primary-color-light)"
                          : "transparent",
                        color: active
                          ? "var(--mantine-primary-color-light-color)"
                          : "var(--mantine-color-dimmed)",
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      <ThemeIcon
                        variant={active ? "filled" : "subtle"}
                        color={
                          active
                            ? "var(--mantine-primary-color-filled)"
                            : "var(--mantine-color-dimmed)"
                        }
                        size="sm"
                      >
                        {item.icon}
                      </ThemeIcon>
                      <Text size="sm">{item.label}</Text>
                      {item.badge != null && item.badge > 0 ? (
                        <Badge
                          size="xs"
                          color="red"
                          variant="filled"
                          style={{ marginLeft: "auto" }}
                        >
                          {item.badge}
                        </Badge>
                      ) : null}
                    </UnstyledButton>
                  );
                })}
              </Box>
            );
          })}
      </Flex>
    </ScrollArea>
  );
}

function ChurchSwitcher() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, switchChurch } = useAuth();
  const { hasRole } = useRoleHelpers(user);
  const [churches, setChurches] = useState<Church[]>([]);

  const canManage =
    !!user?.is_staff ||
    !!user?.can_manage_churches ||
    (user?.church?.church_type === "INDEPENDENT" && hasRole("PASTOR"));
  const show = canManage && !!user?.church;

  useEffect(() => {
    if (!show) return;
    let active = true;
    accountsApi
      .churches()
      .then((list) => active && setChurches(list))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [show]);

  if (!show || churches.length <= 1) return null;

  const handleSwitch = async (church: Church) => {
    if (church.id === user.church?.id) return;
    try {
      await switchChurch(church.id);
      const target = user?.is_staff
        ? `/admin/churches/${church.id}/dashboard`
        : church.church_type === "CONGREGATION" && hasRole("PASTOR")
          ? `/churches/${church.id}/dashboard`
          : "/dashboard";
      router.replace(target);
    } catch {
      void 0;
    }
  };

  return (
    <Menu shadow="md" width={240}>
      <Menu.Target>
        <Tooltip label={t.nav.switchChurch}>
          <ActionIcon variant="subtle" aria-label="switch-church" size="lg">
            <IconSwitchHorizontal size={18} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{t.nav.switchChurch}</Menu.Label>
        <ScrollArea.Autosize mah={320}>
          {churches.map((church) => (
            <Menu.Item
              key={church.id}
              leftSection={<IconBuildingChurch size={14} />}
              onClick={() => handleSwitch(church)}
              style={{ fontWeight: church.id === user.church?.id ? 700 : 400 }}
            >
              <Text size="sm" truncate>
                {church.name}
              </Text>
            </Menu.Item>
          ))}
        </ScrollArea.Autosize>
      </Menu.Dropdown>
    </Menu>
  );
}

function HeaderControls() {
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { locale, setLocale } = useLanguage();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && colorScheme === "dark";
  const roleLabel =
    user?.role_display || (user?.role ? ROLE_LABELS[user.role] : null);
  const currentLocale = LOCALES.find((l) => l.value === locale);
  const themeLabel = mounted
    ? isDark
      ? t.nav.lightTheme
      : t.nav.darkTheme
    : t.nav.darkTheme;
  const cycleLocale = () => {
    const idx = LOCALES.findIndex((l) => l.value === locale);
    const next = LOCALES[(idx + 1) % LOCALES.length];
    setLocale(next.value);
  };
  const themeIcon = mounted ? (
    isDark ? (
      <IconSun size={14} />
    ) : (
      <IconMoon size={14} />
    )
  ) : (
    <IconMoon size={14} />
  );

  return (
    <Group gap="xs" wrap="nowrap">
      <Box style={{ maxWidth: 140 }}>
        <ChurchSwitcher />
      </Box>

      <NotificationBell />

      <Box visibleFrom="sm">
        <Menu shadow="md" width={140}>
          <Menu.Target>
            <ActionIcon variant="subtle" aria-label="language" size="lg">
              <IconLanguage size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {LOCALES.map((l) => (
              <Menu.Item
                key={l.value}
                onClick={() => setLocale(l.value)}
                style={{ fontWeight: locale === l.value ? 700 : 400 }}
              >
                {l.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Box>

      <Box visibleFrom="sm">
        <Tooltip
          label={
            mounted
              ? isDark
                ? t.nav.lightTheme
                : t.nav.darkTheme
              : t.nav.darkTheme
          }
        >
          <ActionIcon
            variant="subtle"
            onClick={() => toggleColorScheme()}
            aria-label="toggle theme"
            size="lg"
          >
            {mounted ? (
              isDark ? (
                <IconSun size={18} />
              ) : (
                <IconMoon size={18} />
              )
            ) : (
              <IconMoon size={18} />
            )}
          </ActionIcon>
        </Tooltip>
      </Box>

      <Box hiddenFrom="sm">
        <Menu shadow="md" width={220}>
          <Menu.Target>
            <ActionIcon variant="subtle" aria-label="more options" size="lg">
              <IconDotsVertical size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconLanguage size={14} />}
              onClick={cycleLocale}
              data-testid="mobile-language"
            >
              {t.nav.language}: {currentLocale?.label || locale}
            </Menu.Item>
            <Menu.Item
              leftSection={themeIcon}
              onClick={() => toggleColorScheme()}
              data-testid="mobile-theme"
            >
              {t.nav.theme}: {themeLabel}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Box>

      {user && (
        <Menu shadow="md" width={220}>
          <Menu.Target>
            <UnstyledButton>
              <Flex align="center" gap={8}>
                <Avatar size="sm" radius="xl" color="blue">
                  {user.name?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Box style={{ textAlign: "left" }} w={150} visibleFrom="sm">
                  <Text size="sm" fw={600} truncate>
                    {user.name}
                  </Text>
                  {user.is_staff || !user.church ? (
                    <Badge size="xs" color="grape" variant="light">
                      Admin
                    </Badge>
                  ) : (
                    <Flex align="center" gap={4} wrap="nowrap">
                      {roleLabel && (
                        <Badge size="xs" color="blue" variant="light">
                          {roleLabel}
                        </Badge>
                      )}
                      <Text size="xs" c="dimmed" truncate>
                        {user.church.name}
                      </Text>
                    </Flex>
                  )}
                </Box>
                <IconChevronDown
                  size={14}
                  style={{ color: "var(--mantine-color-dimmed)" }}
                />
              </Flex>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            {user.is_staff && !user.church ? (
              <Menu.Item
                leftSection={<IconShieldCheck size={14} />}
                onClick={() => router.push("/admin/churches")}
              >
                {t.adminChurches.back}
              </Menu.Item>
            ) : (
              <Menu.Item
                leftSection={<IconSettings size={14} />}
                onClick={() => router.push("/settings")}
              >
                {t.section.settings}
              </Menu.Item>
            )}
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<IconLogout size={14} />}
              onClick={logout}
            >
              {t.logout}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}

export default function Layout({
  children,
  churchType,
  expanded = false,
}: {
  children: React.ReactNode;
  churchType?: ChurchType;
  expanded?: boolean;
}) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const isMobile = useMediaQuery("(max-width: 60em)");
  const { t } = useLanguage();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 270,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
      disabled={expanded}
    >
      <AppShell.Header>
        <Group
          h="100%"
          px="md"
          justify="space-between"
          wrap="nowrap"
          style={{ overflow: "hidden", width: "100%" }}
        >
          <Group gap="xs" wrap="nowrap">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <Flex align="center" gap={8}>
              <Image
                src="/android-icon-192x192.png"
                alt="Gestão IDB"
                width={32}
                height={32}
                style={{ objectFit: "contain", borderRadius: 6 }}
                priority
              />
              <Box style={{ lineHeight: 1.15 }} miw={0}>
                <Text fw={800} size="md" c="blue" lh={1.1}>
                  {t.appTitle}
                </Text>
                {!isMobile && (
                  <Text
                    size="xs"
                    c="dimmed"
                    tt="uppercase"
                    fw={700}
                    lh={1.1}
                    style={{ letterSpacing: "0.08em" }}
                  >
                    Igreja de Deus
                  </Text>
                )}
              </Box>
            </Flex>
          </Group>
          <HeaderControls />
        </Group>
      </AppShell.Header>

      {isMobile ? (
        <AppShell.Navbar p="xs">
          <SidebarContent onNavigate={close} churchType={churchType} />
        </AppShell.Navbar>
      ) : (
        <AppShell.Navbar p="xs">
          <SidebarContent churchType={churchType} />
        </AppShell.Navbar>
      )}

      <AppShell.Main>
        {!expanded ? <ContentContextHeader /> : null}
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
