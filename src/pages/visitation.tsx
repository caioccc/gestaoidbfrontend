import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Drawer,
  Flex,
  Grid,
  Group,
  Loader,
  Modal,
  MultiSelect,
  Paper,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { DateInput, DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDebouncedValue, useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconBrandWhatsapp,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCircleCheck,
  IconCrosshair,
  IconListDetails,
  IconMap,
  IconMapPin,
  IconPhone,
  IconPlus,
  IconRoute,
  IconSearch,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { accountsApi } from '../api/accounts';
import AuthGuard from '../components/AuthGuard';
import ChurchMap from '../components/ChurchMap';
import MaskedTextInput from '../components/MaskedTextInput';
import VisitationMap, { type VisitationAction } from '../components/VisitationMap';
import { useLanguage } from '../i18n';
import type {
  Member,
  PastoralVisit,
  PastoralVisitStatus,
  PastoralVisitSummary,
  PastoralVisitType,
} from '../types';
import { formatDate, parseISODate, toISO } from '../utils/format';
import attentionStyles from '../styles/attention.module.css';

const VISIT_TYPES: PastoralVisitType[] = [
  "ROUTINE",
  "ILLNESS",
  "BEREAVEMENT",
  "NEW_CONVERT",
  "SOCIAL_AID",
  "SPECIAL",
];

const LOCALE_MAP: Record<string, string> = {
  "pt-br": "pt-BR",
  en: "en-US",
  es: "es-ES",
};

interface AddressParts {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
}

export default function VisitationPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const isCompact = useMediaQuery("(max-width: 991px)");
  const { colorScheme } = useMantineColorScheme();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  const [visits, setVisits] = useState<PastoralVisit[]>([]);
  const [summary, setSummary] = useState<PastoralVisitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [view, setView] = useState<"map" | "list">("map");
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PastoralVisitStatus[]>([]);
  const [drawerVisit, setDrawerVisit] = useState<PastoralVisit | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const [completeTarget, setCompleteTarget] = useState<PastoralVisit | null>(
    null,
  );
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<PastoralVisit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PastoralVisit | null>(null);
  const [confirming, setConfirming] = useState(false);

  const [fromPrayerId, setFromPrayerId] = useState<number | null>(null);
  const handledFromPrayer = useRef(false);

  const monthName = (m: number) => {
    const label = new Date(2000, m - 1, 1).toLocaleDateString(
      LOCALE_MAP[locale],
      { month: "long" },
    );
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: monthName(i + 1),
  }));
  const yearOptions = Array.from({ length: 5 }, (_, i) =>
    String(today.getFullYear() - i),
  );

  const focusVisit = (id: number) => {
    setFocusedId(id);
    setFocusNonce((n) => n + 1);
  };

  const handleMapAction = (id: number, action: VisitationAction) => {
    const v = visits.find((x) => x.id === id);
    if (!v) return;
    if (action === "complete") openComplete(v);
    else setCancelTarget(v);
  };

  useEffect(() => {
    setFocusedId(null);
    setSearch("");
  }, [year, month]);

  useEffect(() => {
    accountsApi
      .members()
      .then(setMembers)
      .catch(() => setMembers([]));
  }, []);

  useEffect(() => {
    if (!router.isReady || handledFromPrayer.current) return;
    const raw = router.query.fromPrayer;
    if (!raw || typeof raw !== "string" || !/^\d+$/.test(raw)) return;
    handledFromPrayer.current = true;
    const prayerId = Number(raw);
    accountsApi
      .prayerRequest(prayerId)
      .then((prayer) => {
        setFromPrayerId(prayer.id);
        form.setValues({
          refer: "avulso",
          member: "",
          target_name:
            prayer.is_anonymous || !prayer.requester_name
              ? "Visitado(a) anônimo(a)"
              : prayer.requester_name,
          target_phone: prayer.requester_phone || "",
          visit_type: "ROUTINE",
          scheduled_date: new Date(),
          cep: "",
          street: "",
          number: "",
          neighborhood: prayer.neighborhood || "",
          city: "",
          state: "",
          latitude: null,
          longitude: null,
        });
        setCreateOpen(true);
        reload();
      })
      .catch(() => {
        notifications.show({
          color: "red",
          message: "Não foi possível abrir o pedido de oração.",
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.fromPrayer]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      accountsApi.pastoralVisits({ year, month }),
      accountsApi.pastoralVisitSummary(year, month),
    ])
      .then(([v, s]) => {
        setVisits(v);
        setSummary(s);
      })
      .catch(() => {
        setVisits([]);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, [year, month, reloadKey]);

  const filteredVisits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visits.filter((v) => {
      if (statusFilter.length > 0 && !statusFilter.includes(v.status))
        return false;
      if (!q) return true;
      return (
        (v.member_name || v.target_name || "").toLowerCase().includes(q) ||
        (v.neighborhood || "").toLowerCase().includes(q) ||
        (v.city || "").toLowerCase().includes(q)
      );
    });
  }, [visits, search, statusFilter]);

  const moveMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  };

  const geocodeAddress = async (
    parts: AddressParts,
  ): Promise<{ lat: number; lng: number } | null> => {
    const street = (parts.street || "").trim();
    const number = (parts.number || "").trim();
    const city = (parts.city || "").trim();
    if (street.length < 3 || !city) return null;
    const query = [
      street,
      number,
      (parts.neighborhood || "").trim(),
      `${city}/${(parts.state || "").trim()}`,
    ]
      .filter(Boolean)
      .join(", ");
    if (query.length < 8) return null;
    let loaded = false;
    setGeoLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=br&limit=1`,
      );
      loaded = res.ok;
      if (!res.ok) return null;
      const results = await res.json();
      if (!Array.isArray(results) || results.length === 0) return null;
      return {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon),
      };
    } catch {
      return null;
    } finally {
      if (loaded) setGeoLoading(false);
    }
  };

  const form = useForm({
    initialValues: {
      refer: "member" as "member" | "avulso",
      member: "",
      target_name: "",
      target_phone: "",
      visit_type: "ROUTINE" as PastoralVisitType,
      scheduled_date: new Date(),
      cep: "",
      street: "",
      number: "",
      neighborhood: "",
      city: "",
      state: "",
      latitude: null as number | null,
      longitude: null as number | null,
    },
    validate: {
      member: (v, values) =>
        values.refer === "member" && !v
          ? t.visitationPage.form.memberField
          : null,
      target_name: (v, values) =>
        values.refer === "avulso" && !v.trim()
          ? t.visitationPage.form.targetName
          : null,
      scheduled_date: (v) => (v ? null : t.visitationPage.form.date),
    },
  });

  const resetForm = () => {
    setFromPrayerId(null);
    form.setValues({
      refer: "member",
      member: "",
      target_name: "",
      target_phone: "",
      visit_type: "ROUTINE",
      scheduled_date: new Date(),
      cep: "",
      street: "",
      number: "",
      neighborhood: "",
      city: "",
      state: "",
      latitude: null,
      longitude: null,
    });
  };

  const handleMemberChange = async (value: string | null) => {
    form.setFieldValue("member", value ?? "");
    form.setFieldValue("target_name", "");
    form.setFieldValue("target_phone", "");
    form.setFieldValue("cep", "");
    form.setFieldValue("street", "");
    form.setFieldValue("number", "");
    form.setFieldValue("neighborhood", "");
    form.setFieldValue("city", "");
    form.setFieldValue("state", "");
    form.setFieldValue("latitude", null);
    form.setFieldValue("longitude", null);
    if (!value) return;
    try {
      const snap = await accountsApi.pastoralVisitMemberSnapshot(Number(value));
      form.setFieldValue("target_name", snap.name);
      form.setFieldValue("target_phone", snap.phone);
      form.setFieldValue("cep", snap.cep);
      form.setFieldValue("street", snap.street);
      form.setFieldValue("number", snap.number);
      form.setFieldValue("neighborhood", snap.neighborhood);
      form.setFieldValue("city", snap.city);
      form.setFieldValue("state", snap.state);
      const coords = await geocodeAddress(snap);
      if (coords) {
        form.setFieldValue("latitude", coords.lat);
        form.setFieldValue("longitude", coords.lng);
      }
    } catch {
      /* address must be filled manually */
    }
  };

  const locateNow = async () => {
    const coords = await geocodeAddress(form.values);
    if (coords) {
      form.setFieldValue("latitude", coords.lat);
      form.setFieldValue("longitude", coords.lng);
      notifications.show({
        color: "green",
        message: t.visitationPage.form.geocode,
      });
    } else {
      notifications.show({
        color: "red",
        message: t.visitationPage.form.geocodeError,
      });
    }
  };

  const handleCepBlur = async (cepValue: string) => {
    const clean = cepValue.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      if (!res.ok) throw new Error("viacep");
      const data = await res.json();
      if (data.erro || !data.uf) {
        notifications.show({ color: "red", message: t.registerPage.cepError });
      } else {
        form.setValues((prev) => ({
          ...prev,
          street: data.logradouro ?? prev.street,
          neighborhood: data.bairro ?? prev.neighborhood,
          city: data.localidade ?? prev.city,
          state: data.uf ?? prev.state,
        }));
      }
    } catch {
      notifications.show({ color: "red", message: t.registerPage.cepError });
    } finally {
      setCepLoading(false);
    }
  };

  const [debouncedFill] = useDebouncedValue(
    `${form.values.street}|${form.values.number}|${form.values.neighborhood}|${form.values.city}|${form.values.state}`,
    600,
  );

  useEffect(() => {
    if (!createOpen) return;
    const [street, num, neighborhood, city, state] = debouncedFill.split("|");
    if (!street.trim() || !num.trim() || !city.trim()) return;
    if (form.values.latitude != null && form.values.longitude != null) return;
    let active = true;
    setGeoLoading(true);
    const query = [street, num, neighborhood, `${city}/${state}`]
      .filter(Boolean)
      .join(", ");
    if (query.length < 8) {
      setGeoLoading(false);
      return;
    }
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query,
      )}&countrycodes=br&limit=1`,
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("nominatim"))))
      .then((results: Array<{ lat: string; lon: string }>) => {
        if (!active || !results.length) return;
        form.setFieldValue("latitude", parseFloat(results[0].lat));
        form.setFieldValue("longitude", parseFloat(results[0].lon));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setGeoLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFill, createOpen]);

  const handleMapPick = async (lat: number, lng: number) => {
    form.setFieldValue("latitude", lat);
    form.setFieldValue("longitude", lng);
    setGeoLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=pt-BR`,
      );
      if (!res.ok) throw new Error("nominatim");
      const data = await res.json();
      const a: Record<string, string | undefined> = data.address ?? {};
      const setIf = (
        k: "street" | "number" | "neighborhood" | "city" | "state",
        v: string | undefined | null,
      ) => {
        const clean = (v ?? "").trim();
        if (clean) form.setFieldValue(k, clean);
      };
      setIf("street", a.road);
      setIf("number", a.house_number);
      setIf("neighborhood", a.neighbourhood ?? a.suburb ?? a.city_district);
      setIf(
        "city",
        a.city ?? a.town ?? a.village ?? a.municipality ?? a.county,
      );
      const ufFromStateName = (name: string): string => {
        const key = name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();
        const BR_STATES: Record<string, string> = {
          acre: "AC",
          alagoas: "AL",
          amapa: "AP",
          amazonas: "AM",
          bahia: "BA",
          ceara: "CE",
          "distrito federal": "DF",
          "espirito santo": "ES",
          goias: "GO",
          maranhao: "MA",
          "mato grosso": "MT",
          "mato grosso do sul": "MS",
          "minas gerais": "MG",
          para: "PA",
          paraiba: "PB",
          parana: "PR",
          pernambuco: "PE",
          piaui: "PI",
          "rio de janeiro": "RJ",
          "rio grande do norte": "RN",
          "rio grande do sul": "RS",
          rondonia: "RO",
          roraima: "RR",
          "santa catarina": "SC",
          "sao paulo": "SP",
          sergipe: "SE",
          tocantins: "TO",
        };
        return BR_STATES[key] ?? "";
      };
      const canonicalUf = [
        a.state_code,
        a.short_code,
        a["ISO3166-2-lvl4"],
        data.short_code,
      ]
        .filter((v): v is string => typeof v === "string" && v.length > 0)
        .map((v) => v.split("-").pop() ?? "")
        .find((v) => /^[a-zA-Z]{2}$/.test(v));
      const ufSigla =
        ufFromStateName(a.state ?? "") || (canonicalUf ?? "").toUpperCase();
      setIf("state", ufSigla || a.state || "");
      const postcode = (a.postcode ?? "").replace(/\D/g, "");
      if (postcode.length === 8) {
        form.setFieldValue(
          "cep",
          `${postcode.slice(0, 5)}-${postcode.slice(5)}`,
        );
      }
    } catch {
      // ponto já foi marcado; endereço pode ser ajustado manualmente
    } finally {
      setGeoLoading(false);
    }
  };

  const handleSave = form.onSubmit(async (values) => {
    let lat = values.latitude;
    let lng = values.longitude;
    if (lat == null || lng == null) {
      const coords = await geocodeAddress(values);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }
    const dateISO = toISO(values.scheduled_date);
    if (!dateISO) return;
    setSaving(true);
    try {
      await accountsApi.createPastoralVisit({
        member:
          values.refer === "member" && values.member
            ? Number(values.member)
            : null,
        target_name: values.refer === "avulso" ? values.target_name.trim() : "",
        target_phone: (values.target_phone || "").trim(),
        visit_type: values.visit_type,
        competence_year: year,
        competence_month: month,
        scheduled_date: dateISO,
        cep: values.cep.trim(),
        street: values.street.trim(),
        number: values.number.trim(),
        neighborhood: values.neighborhood.trim(),
        city: values.city.trim(),
        state: values.state.trim().toUpperCase(),
        latitude: lat,
        longitude: lng,
        prayer_request: fromPrayerId,
      });
      notifications.show({
        color: "green",
        message: t.visitationPage.form.created,
      });
      setCreateOpen(false);
      resetForm();
      reload();
    } catch {
      notifications.show({
        color: "red",
        message: "Erro ao agendar a visita.",
      });
    } finally {
      setSaving(false);
    }
  });

  const completeForm = useForm({
    initialValues: {
      completed_at: new Date(),
      visited_by: "",
      notes: "",
      needs_followup: false,
    },
  });

  const openComplete = (v: PastoralVisit) => {
    setCompleteTarget(v);
    completeForm.setValues({
      completed_at: v.completed_at ? new Date(v.completed_at) : new Date(),
      visited_by: v.visited_by || "",
      notes: v.notes || "",
      needs_followup: v.needs_followup,
    });
    setCompleteOpen(true);
  };

  const handleComplete = completeForm.onSubmit(async (values) => {
    if (!completeTarget) return;
    setCompleting(true);
    try {
      await accountsApi.completePastoralVisit(completeTarget.id, {
        visited_by: values.visited_by.trim(),
        notes: values.notes.trim(),
        needs_followup: values.needs_followup,
        completed_at: values.completed_at.toISOString(),
      });
      notifications.show({
        color: "green",
        message: t.visitationPage.complete.saved,
      });
      setCompleteOpen(false);
      setCompleteTarget(null);
      setDrawerVisit(null);
      reload();
    } catch {
      notifications.show({
        color: "red",
        message: "Erro ao registrar a visita.",
      });
    } finally {
      setCompleting(false);
    }
  });

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setConfirming(true);
    try {
      await accountsApi.cancelPastoralVisit(cancelTarget.id);
      notifications.show({
        color: "green",
        message: t.visitationPage.actions.cancelDone,
      });
      setCancelTarget(null);
      setDrawerVisit(null);
      reload();
    } catch {
      notifications.show({ color: "red", message: "Erro ao cancelar." });
    } finally {
      setConfirming(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setConfirming(true);
    try {
      await accountsApi.deletePastoralVisit(deleteTarget.id);
      notifications.show({
        color: "green",
        message: t.visitationPage.actions.deleteDone,
      });
      setDeleteTarget(null);
      setDrawerVisit(null);
      reload();
    } catch {
      notifications.show({ color: "red", message: "Erro ao excluir." });
    } finally {
      setConfirming(false);
    }
  };

  const memberOptions = members.map((m) => ({
    value: String(m.id),
    label: m.name,
  }));

  const visitTypeOptions = VISIT_TYPES.map((type) => ({
    value: type,
    label: t.visitationPage.visitType[type],
  }));

  const statusOptions: { value: PastoralVisitStatus; label: string }[] = (
    ["PLANNED", "COMPLETED", "CANCELLED"] as PastoralVisitStatus[]
  ).map((status) => ({
    value: status,
    label: t.visitationPage.statusLabel[status],
  }));

  const stats = [
    {
      key: "total",
      label: t.visitationPage.total,
      value: summary?.total ?? 0,
      color: "blue.6",
    },
    {
      key: "planned",
      label: t.visitationPage.planned,
      value: summary?.planned ?? 0,
      color: "orange.6",
    },
    {
      key: "completed",
      label: t.visitationPage.completed,
      value: summary?.completed ?? 0,
      color: "green.7",
    },
    {
      key: "cancelled",
      label: t.visitationPage.cancelled,
      value: summary?.cancelled ?? 0,
      color: "gray.6",
    },
    {
      key: "followups",
      label: t.visitationPage.followups,
      value: summary?.needs_followup ?? 0,
      color: "blue.7",
    },
  ];

  const mapLabels = useMemo(
    () => ({
      watcha: t.visitationPage.actions.whatsapp,
      route: t.visitationPage.actions.route,
      complete: t.visitationPage.actions.complete,
      cancel: t.visitationPage.actions.cancel,
    }),
    [t],
  );
  const mapLegend = useMemo(
    () => ({
      planned: t.visitationPage.planned,
      completed: t.visitationPage.completed,
      cancelled: t.visitationPage.cancelled,
    }),
    [t],
  );

  // Visita planejada é a que ainda exige ação da equipe, então recebe o mesmo
  // tratamento do pedido de oração novo: borda colorida + pulso.
  const plannedCardClass = (v: PastoralVisit) =>
    v.status === "PLANNED"
      ? `${attentionStyles.attentionCard} ${
          colorScheme === "dark" ? attentionStyles.attentionCardDark : ""
        }`
      : undefined;
  const attentionDotClass = () =>
    `${attentionStyles.attentionDot} ${
      colorScheme === "dark" ? attentionStyles.attentionDotDark : ""
    }`;

  const visitCard = (v: PastoralVisit) => (
    <Paper
      key={v.id}
      withBorder
      p="sm"
      radius="md"
      mb="xs"
      shadow="xs"
      className={plannedCardClass(v)}
      data-testid={`visit-card-${v.id}`}
      data-planned={v.status === "PLANNED" ? "true" : undefined}
      style={{ cursor: "pointer" }}
      onClick={() => {
        focusVisit(v.id);
        if (isCompact) setView("map");
      }}
    >
      <Stack gap={6}>
        <Group
          justify="space-between"
          align="flex-start"
          wrap="nowrap"
          gap="xs"
        >
          {v.status === "PLANNED" ? (
            <span className={attentionDotClass()} style={{ marginTop: 6 }} aria-hidden />
          ) : null}
          <Text fw={600} size="sm" truncate style={{ flex: 1, minWidth: 0 }}>
            {v.member_name || v.target_name}
          </Text>
          <Badge
            size="xs"
            variant="light"
            style={{ flexShrink: 0 }}
            color={
              v.status === "PLANNED"
                ? "orange"
                : v.status === "COMPLETED"
                  ? "teal"
                  : "gray"
            }
          >
            {t.visitationPage.statusLabel[v.status]}
          </Badge>
        </Group>
        <Text size="xs" c="dimmed" lineClamp={2}>
          {t.visitationPage.visitType[v.visit_type]} &middot;{" "}
          {formatDate(v.scheduled_date)}
          {v.full_address ? ` — ${v.full_address}` : ""}
        </Text>
        <Group
          gap={4}
          justify="flex-end"
          wrap="nowrap"
          onClick={(e) => e.stopPropagation()}
        >
          {v.maps_url ? (
            <ActionIcon
              component="a"
              href={v.maps_url}
              target="_blank"
              rel="noreferrer"
              variant="default"
              size="sm"
              title={t.visitationPage.actions.route}
            >
              <IconMapPin size={15} />
            </ActionIcon>
          ) : null}
          {v.member_whatsapp_url ? (
            <ActionIcon
              component="a"
              href={v.member_whatsapp_url}
              target="_blank"
              rel="noreferrer"
              variant="default"
              size="sm"
              title={t.visitationPage.actions.whatsapp}
            >
              <IconBrandWhatsapp size={15} />
            </ActionIcon>
          ) : null}
          {v.status === "PLANNED" ? (
            <ActionIcon
              color="green"
              variant="light"
              size="sm"
              title={t.visitationPage.actions.complete}
              onClick={() => openComplete(v)}
            >
              <IconCheck size={15} />
            </ActionIcon>
          ) : null}
          <ActionIcon
            color="red"
            variant="subtle"
            size="sm"
            title={t.visitationPage.actions.delete}
            onClick={() => setDeleteTarget(v)}
          >
            <IconTrash size={15} />
          </ActionIcon>
        </Group>
      </Stack>
    </Paper>
  );

  return (
    <AuthGuard roles={["PASTOR", "SECRETARIA", "INTERCESSAO"]}>
      <>
        <Group
          justify="space-between"
          align="center"
          mb="md"
          wrap="wrap"
          gap="sm"
        >
          <Stack gap={0}>
            <Title order={3}>{t.visitationPage.title}</Title>
            <Text size="xs" c="dimmed">
              {t.visitationPage.subtitle}
            </Text>
          </Stack>
        </Group>

        <Paper withBorder p="sm" radius="md" mb="md">
          <Group justify="space-between" wrap="wrap" gap="sm">
            <Group gap={4} align="center" wrap="nowrap">
              <ActionIcon
                variant="default"
                onClick={() => moveMonth(-1)}
                aria-label="previous"
              >
                <IconChevronLeft size={16} />
              </ActionIcon>
              <Select
                value={String(month)}
                onChange={(v) => v && setMonth(Number(v))}
                data={monthOptions}
                w={150}
                allowDeselect={false}
                size="xs"
              />
              <Select
                value={String(year)}
                onChange={(v) => v && setYear(Number(v))}
                data={yearOptions}
                w={90}
                allowDeselect={false}
                size="xs"
              />
              <ActionIcon
                variant="default"
                onClick={() => moveMonth(1)}
                aria-label="next"
              >
                <IconChevronRight size={16} />
              </ActionIcon>
            </Group>

            <Group gap="sm" wrap="wrap">
              <MultiSelect
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as PastoralVisitStatus[])}
                data={statusOptions}
                placeholder={t.visitationPage.statusFilterPlaceholder}
                clearable
                size="xs"
                w={180}
              />
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  resetForm();
                  setCreateOpen(true);
                }}
              >
                {t.visitationPage.newVisit}
              </Button>
            </Group>
          </Group>
        </Paper>

        <SimpleGrid cols={{ base: 2, sm: 5 }} mb="md" spacing="sm">
          {stats.map((s) => (
            <Paper
              key={s.key}
              withBorder
              p="xs"
              radius="md"
              style={{ textAlign: "center" }}
            >
              <Text fw={700} size="xl" lh={1.2} c={s.color}>
                {s.value}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {s.label}
              </Text>
            </Paper>
          ))}
        </SimpleGrid>

        {isCompact ? (
          <>
            <SegmentedControl
              value={view}
              onChange={(v) => setView(v as "map" | "list")}
              data={[
                {
                  value: "map",
                  label: (
                    <Group gap={6} wrap="nowrap">
                      <IconMap size={15} />
                      <Text size="sm">{t.visitationPage.map}</Text>
                    </Group>
                  ),
                },
                {
                  value: "list",
                  label: (
                    <Group gap={6} wrap="nowrap">
                      <IconListDetails size={15} />
                      <Text size="sm">
                        {t.visitationPage.listWithCount.replace(
                          "{count}",
                          String(visits.length),
                        )}
                      </Text>
                    </Group>
                  ),
                },
              ]}
              fullWidth
              mb="md"
            />

            {view === "map" ? (
              loading ? (
                <Group p="xl" justify="center">
                  <Loader />
                </Group>
              ) : (
                <VisitationMap
                  visits={filteredVisits}
                  focusedId={focusedId}
                  focusNonce={focusNonce}
                  height="calc(100vh - 280px)"
                  minHeight={400}
                  popupOnClick={false}
                  onSelect={(v) => setDrawerVisit(v)}
                  onAction={handleMapAction}
                  labels={mapLabels}
                  legend={mapLegend}
                />
              )
            ) : (
              <ScrollArea
                type="auto"
                style={{ height: "calc(100vh - 260px)", minHeight: 400 }}
                scrollbarSize={6}
              >
                <Stack gap="xs" px={2} pb="xl">
                  {loading ? (
                    <Group p="xl" justify="center">
                      <Loader />
                    </Group>
                  ) : visits.length === 0 ? (
                    <Stack p="xl" align="center" gap={4}>
                      <Text c="dimmed">{t.visitationPage.empty}</Text>
                      <Text c="dimmed" size="xs">
                        {t.visitationPage.emptyHint}
                      </Text>
                    </Stack>
                  ) : filteredVisits.length === 0 ? (
                    <Stack p="xl" align="center">
                      <Text c="dimmed">{t.visitationPage.searchEmpty}</Text>
                    </Stack>
                  ) : (
                    filteredVisits.map(visitCard)
                  )}
                </Stack>
              </ScrollArea>
            )}
          </>
        ) : (
          <Flex gap="md" align="flex-start">
            <Stack w={380} gap="xs" style={{ flexShrink: 0 }}>
              <TextInput
                placeholder={t.visitationPage.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                size="xs"
                leftSection={<IconSearch size={14} />}
              />
              <Box style={{ height: "calc(100vh - 240px)" }}>
                <ScrollArea
                  type="auto"
                  offsetScrollbars
                  style={{ height: "100%" }}
                  scrollbarSize={6}
                >
                  {loading ? (
                    <Group p="xl" justify="center">
                      <Loader />
                    </Group>
                  ) : visits.length === 0 ? (
                    <Stack p="xl" align="center" gap={4}>
                      <Text c="dimmed">{t.visitationPage.empty}</Text>
                      <Text c="dimmed" size="xs">
                        {t.visitationPage.emptyHint}
                      </Text>
                    </Stack>
                  ) : filteredVisits.length === 0 ? (
                    <Stack p="xl" align="center">
                      <Text c="dimmed">{t.visitationPage.searchEmpty}</Text>
                    </Stack>
                  ) : (
                    <Stack gap={0} px={2} pb="xs">
                      {filteredVisits.map(visitCard)}
                    </Stack>
                  )}
                </ScrollArea>
              </Box>
            </Stack>

            <Box
              style={{
                flex: 1,
                minWidth: 0,
                height: "calc(100vh - 240px)",
              }}
            >
              <Paper
                withBorder
                radius="md"
                style={{ overflow: "hidden", height: "100%" }}
              >
                <VisitationMap
                  visits={filteredVisits}
                  focusedId={focusedId}
                  focusNonce={focusNonce}
                  height="100%"
                  onSelect={(v) => focusVisit(v.id)}
                  onAction={handleMapAction}
                  labels={mapLabels}
                  legend={mapLegend}
                />
              </Paper>
            </Box>
          </Flex>
        )}

        <Drawer
          opened={!!drawerVisit}
          onClose={() => setDrawerVisit(null)}
          position="bottom"
          size="auto"
          title={
            drawerVisit
              ? drawerVisit.member_name || drawerVisit.target_name
              : ""
          }
          styles={{ body: { paddingBottom: 24 } }}
        >
          {drawerVisit ? (
            <Stack gap="md">
              <Box>
                <Group gap="xs" mb={4}>
                  <BadgeView
                    status={drawerVisit.status}
                    label={t.visitationPage.statusLabel[drawerVisit.status]}
                  />
                  <Text size="xs" c="dimmed">
                    {t.visitationPage.visitType[drawerVisit.visit_type]}
                  </Text>
                </Group>
                {drawerVisit.full_address ? (
                  <Group gap={4} wrap="nowrap">
                    <IconMapPin
                      size={13}
                      style={{
                        color: "var(--mantine-color-gray-5)",
                        flexShrink: 0,
                      }}
                    />
                    <Text size="xs" c="dimmed">
                      {drawerVisit.full_address}
                    </Text>
                  </Group>
                ) : null}
                {drawerVisit.notes ? (
                  <Text size="xs" c="teal.8" mt={4}>
                    {drawerVisit.notes}
                  </Text>
                ) : null}
              </Box>

              <Stack gap="xs">
                {drawerVisit.status === "PLANNED" ? (
                  <Button
                    fullWidth
                    color="green"
                    leftSection={<IconCircleCheck size={16} />}
                    onClick={() => {
                      setDrawerVisit(null);
                      openComplete(drawerVisit);
                    }}
                  >
                    {t.visitationPage.actions.complete}
                  </Button>
                ) : null}
                {drawerVisit.member_whatsapp_url ? (
                  <Button
                    fullWidth
                    variant="light"
                    color="green"
                    leftSection={<IconPhone size={16} />}
                    component="a"
                    href={drawerVisit.member_whatsapp_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setDrawerVisit(null)}
                  >
                    {t.visitationPage.actions.whatsapp}
                  </Button>
                ) : null}
                {drawerVisit.maps_url ? (
                  <Button
                    fullWidth
                    variant="light"
                    leftSection={<IconRoute size={16} />}
                    component="a"
                    href={drawerVisit.maps_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setDrawerVisit(null)}
                  >
                    {t.visitationPage.actions.route}
                  </Button>
                ) : null}
                {drawerVisit.status === "PLANNED" ? (
                  <Button
                    variant="light"
                    color="orange"
                    leftSection={<IconX size={16} />}
                    onClick={() => {
                      setDrawerVisit(null);
                      setCancelTarget(drawerVisit);
                    }}
                  >
                    {t.visitationPage.actions.cancel}
                  </Button>
                ) : null}
                <Group grow>
                  <Button
                    variant="subtle"
                    color="red"
                    leftSection={<IconTrash size={16} />}
                    onClick={() => {
                      setDrawerVisit(null);
                      setDeleteTarget(drawerVisit);
                    }}
                  >
                    {t.visitationPage.actions.delete}
                  </Button>
                </Group>
              </Stack>
            </Stack>
          ) : null}
        </Drawer>

        <Modal
          opened={createOpen}
          onClose={() => setCreateOpen(false)}
          title={t.visitationPage.form.title}
          centered
          size="lg"
        >
          <form onSubmit={handleSave}>
            <Stack gap="md">
              <SegmentedControl
                value={form.values.refer}
                onChange={(v) =>
                  form.setFieldValue("refer", v as "member" | "avulso")
                }
                data={[
                  { value: "member", label: t.visitationPage.form.member },
                  { value: "avulso", label: t.visitationPage.form.avulso },
                ]}
                fullWidth
              />
              {form.values.refer === "member" ? (
                <Select
                  label={t.visitationPage.form.member}
                  data={memberOptions}
                  searchable
                  clearable
                  placeholder={t.visitationPage.form.memberPlaceholder}
                  value={form.values.member}
                  onChange={handleMemberChange}
                  error={form.errors.member}
                />
              ) : (
                <>
                  <TextInput
                    label={t.visitationPage.form.targetName}
                    required
                    {...form.getInputProps("target_name")}
                  />
                  <MaskedTextInput
                    label={t.visitationPage.form.targetPhone}
                    placeholder="(00) 00000-0000"
                    mask="(00) 00000-0000"
                    value={form.values.target_phone}
                    onAccept={(v: string) =>
                      form.setFieldValue("target_phone", v)
                    }
                  />
                </>
              )}
              <Group grow>
                <Select
                  label={t.visitationPage.form.visitType}
                  required
                  data={visitTypeOptions}
                  value={form.values.visit_type}
                  onChange={(v) =>
                    form.setFieldValue(
                      "visit_type",
                      (v ?? "ROUTINE") as PastoralVisitType,
                    )
                  }
                />
                <DateInput
                  label={t.visitationPage.form.date}
                  required
                  locale={locale}
                  value={form.values.scheduled_date}
                  onChange={(v) =>
                    form.setFieldValue(
                      "scheduled_date",
                      (v ?? new Date()) as Date,
                    )
                  }
                  error={form.errors.scheduled_date}
                />
              </Group>

              <Text fw={600} size="sm">
                {t.visitationPage.address}
              </Text>

              <Grid>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <MaskedTextInput
                    label={t.visitationPage.form.cep}
                    placeholder="00000-000"
                    mask="00000-000"
                    value={form.values.cep}
                    onAccept={(v: string) => form.setFieldValue("cep", v)}
                    onBlur={() => {
                      if (cepLoading) return;
                      handleCepBlur(form.values.cep);
                    }}
                    rightSection={cepLoading ? <Loader size={14} /> : null}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <TextInput
                    label={t.visitationPage.form.neighborhood}
                    {...form.getInputProps("neighborhood")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <TextInput
                    label={t.visitationPage.form.state}
                    maxLength={2}
                    {...form.getInputProps("state")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 9, sm: 9 }}>
                  <TextInput
                    label={t.visitationPage.form.street}
                    {...form.getInputProps("street")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 3, sm: 3 }}>
                  <TextInput
                    label={t.visitationPage.form.number}
                    {...form.getInputProps("number")}
                  />
                </Grid.Col>
                <Grid.Col span={12}>
                  <TextInput
                    label={t.visitationPage.form.city}
                    {...form.getInputProps("city")}
                  />
                </Grid.Col>
              </Grid>

              <Group gap="xs" align="center">
                <Button
                  variant="light"
                  size="xs"
                  leftSection={
                    geoLoading ? (
                      <Loader size={14} />
                    ) : (
                      <IconCrosshair size={14} />
                    )
                  }
                  onClick={locateNow}
                  disabled={geoLoading}
                >
                  {geoLoading
                    ? t.visitationPage.form.geocoding
                    : t.visitationPage.form.geocode}
                </Button>
              </Group>
              <ChurchMap
                latitude={form.values.latitude}
                longitude={form.values.longitude}
                draggable
                scrollWheelZoom
                hint={t.visitationPage.form.mapHint}
                onMove={(lat, lng) => {
                  form.setFieldValue("latitude", lat);
                  form.setFieldValue("longitude", lng);
                }}
                onPick={handleMapPick}
              />

              <Group justify="flex-end">
                <Button
                  variant="default"
                  onClick={() => setCreateOpen(false)}
                  disabled={saving}
                >
                  {t.common.cancel}
                </Button>
                <Button type="submit" loading={saving}>
                  {t.visitationPage.form.save}
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        <Modal
          opened={completeOpen}
          onClose={() => setCompleteOpen(false)}
          title={t.visitationPage.complete.title}
          centered
        >
          {completeTarget ? (
            <form onSubmit={handleComplete}>
              <Stack gap="md">
                <Box
                  p="xs"
                  style={{
                    border: "1px solid var(--mantine-color-gray-3)",
                    borderRadius: "var(--mantine-radius-md)",
                  }}
                >
                  <Stack gap={2}>
                    <Text fw={600} size="sm">
                      {completeTarget.member_name || completeTarget.target_name}
                    </Text>
                    {completeTarget.full_address ? (
                      <Text size="xs" c="dimmed">
                        {completeTarget.full_address}
                      </Text>
                    ) : null}
                    <Text size="xs" c="dimmed">
                      {t.visitationPage.visitType[completeTarget.visit_type]}{" "}
                      &middot; {formatDate(completeTarget.scheduled_date)}
                    </Text>
                  </Stack>
                </Box>
                <DateTimePicker
                  label={t.visitationPage.complete.completedDate}
                  locale={locale}
                  value={completeForm.values.completed_at}
                  onChange={(v) =>
                    completeForm.setFieldValue(
                      "completed_at",
                      (v ?? new Date()) as Date,
                    )
                  }
                />
                <TextInput
                  label={t.visitationPage.complete.visitedBy}
                  placeholder={t.visitationPage.complete.visitedByPlaceholder}
                  {...completeForm.getInputProps("visited_by")}
                />
                <Textarea
                  label={t.visitationPage.complete.notes}
                  placeholder={t.visitationPage.complete.notesPlaceholder}
                  autosize
                  minRows={3}
                  {...completeForm.getInputProps("notes")}
                />
                <Switch
                  label={t.visitationPage.complete.needsFollowup}
                  description={t.visitationPage.complete.followupHelp}
                  checked={completeForm.values.needs_followup}
                  onChange={(e) =>
                    completeForm.setFieldValue(
                      "needs_followup",
                      e.currentTarget.checked,
                    )
                  }
                />
                <Group justify="flex-end">
                  <Button
                    variant="default"
                    onClick={() => setCompleteOpen(false)}
                    disabled={completing}
                  >
                    {t.common.cancel}
                  </Button>
                  <Button type="submit" loading={completing} color="green">
                    {t.visitationPage.complete.save}
                  </Button>
                </Group>
              </Stack>
            </form>
          ) : null}
        </Modal>

        <Modal
          opened={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          title={t.visitationPage.actions.cancel}
          centered
          size="sm"
        >
          <Stack gap="md">
            <Text size="sm">{t.visitationPage.actions.cancelConfirm}</Text>
            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => setCancelTarget(null)}
                disabled={confirming}
              >
                {t.common.cancel}
              </Button>
              <Button
                color="orange"
                loading={confirming}
                onClick={handleCancel}
              >
                {t.visitationPage.actions.cancel}
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title={t.visitationPage.actions.delete}
          centered
          size="sm"
        >
          <Stack gap="md">
            <Text size="sm">{t.visitationPage.actions.deleteConfirm}</Text>
            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => setDeleteTarget(null)}
                disabled={confirming}
              >
                {t.common.cancel}
              </Button>
              <Button color="red" loading={confirming} onClick={handleDelete}>
                {t.visitationPage.actions.delete}
              </Button>
            </Group>
          </Stack>
        </Modal>
      </>
    </AuthGuard>
  );
}

function BadgeView({
  status,
  label,
}: {
  status: PastoralVisitStatus;
  label: string;
}) {
  return (
    <Paper
      px="sm"
      py={2}
      radius="xl"
      style={{
        flexShrink: 0,
        background:
          status === "PLANNED"
            ? "var(--mantine-color-yellow-light)"
            : status === "COMPLETED"
              ? "var(--mantine-color-green-light)"
              : "var(--mantine-color-gray-light)",
        color:
          status === "PLANNED"
            ? "var(--mantine-color-yellow-9)"
            : status === "COMPLETED"
              ? "var(--mantine-color-green-9)"
              : "var(--mantine-color-gray-7)",
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Paper>
  );
}
