import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Chip,
  Divider,
  Group,
  Menu,
  Modal,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconBrandGoogle,
  IconBrandWhatsapp,
  IconCalendar,
  IconCalendarPlus,
  IconChevronLeft,
  IconChevronRight,
  IconDeviceMobile,
  IconExternalLink,
  IconMapPin,
  IconSparkles,
} from '@tabler/icons-react';
import {
  addDays,
  dateToApi,
  eventOccursOn,
  expandEvents,
} from '../utils/calendarRecurrence';
import {
  downloadIcs,
  googleCalendarUrl,
  mapsUrl,
  whatsappInviteUrl,
} from '../utils/ical';
import { useLanguage } from '../i18n';
import type { PublicCalendarEvent, PublicCalendarPayload } from '../types';

const MOBILE_BREAKPOINT = '(max-width: 767px)';
const UPCOMING_DAYS = 90;
const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

type FilterKey = 'all' | 'culto' | 'event' | 'ensaio';
type DesktopView = 'grid' | 'list';

interface AgendaItem {
  key: string;
  date: Date;
  dateISO: string;
  event: PublicCalendarEvent;
}

interface EventCardProps {
  item: AgendaItem;
  church: PublicCalendarPayload['church'];
  mapsLink: string;
  dayLabel: string;
}

const eventTime = (ev: PublicCalendarEvent) =>
  ev.start_time ? ev.start_time.slice(0, 5) : '';

function formatAddress(church: PublicCalendarPayload['church']): string {
  const { street, number, neighborhood, city, state, cep } = church.address;
  return [street, number, neighborhood, city, state, cep]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}

function EventCard({ item, church, mapsLink, dayLabel }: EventCardProps) {
  const { t } = useLanguage();
  const pc = t.publicCalendar;
  const { event, date } = item;
  const time = eventTime(event);

  const start = useMemo(() => {
    const [h, m] = time ? time.split(':').map(Number) : [9, 0];
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m);
  }, [date, time]);

  const end = useMemo(() => {
    if (event.end_time) {
      const [h, m] = event.end_time.slice(0, 5).split(':').map(Number);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m);
    }
    return new Date(start.getTime() + 60 * 60 * 1000);
  }, [date, event.end_time, start]);

  const description = event.description || pc.defaultDescription;
  const location = formatAddress(church) || pc.locationUnknown;

  const invite = pc.whatsappMessage
    .replace('{event}', event.title)
    .replace('{day}', dayLabel)
    .replace('{time}', time || pc.timeUnknown)
    .replace('{church}', church.name)
    .replace('{maps}', mapsLink);

  const calendarEvent = {
    title: event.title,
    description: event.description,
    location,
    start,
    end: end > start ? end : new Date(start.getTime() + 60 * 60 * 1000),
  };

  const monthShort = t.months[date.getMonth()].slice(0, 3);

  return (
    <Paper
      withBorder
      radius="md"
      p="md"
      mb="sm"
      shadow="xs"
      data-testid="agenda-card"
    >
      <Group align="stretch" wrap="nowrap" gap="md">
        <Stack
          gap={2}
          align="center"
          style={{ flexShrink: 0, minWidth: 64 }}
        >
          <Text fz="xl" fw={800} lh={1} ta="center">
            {date.getDate()}
          </Text>
          <Text fz="xs" c="dimmed" tt="uppercase" ta="center" fw={600} lh={1.2}>
            {monthShort} &middot; {WEEKDAY_LABELS[date.getDay()]}
          </Text>
          <Badge
            size="sm"
            variant="light"
            color="blue"
            tt="none"
            mt={2}
            data-testid="agenda-time"
          >
            {time || pc.timeUnknown}
          </Badge>
        </Stack>

        <Box
          style={{
            flexShrink: 0,
            width: 1,
            background: 'var(--mantine-color-default-border)',
          }}
          aria-hidden
        />

        <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" wrap="wrap">
            <Badge size="sm" variant="light" color={event.color ? undefined : 'blue'}>
              {event.category_display}
            </Badge>
            {event.repeat_monthly || event.repeat_weekly ? (
              <Badge size="xs" variant="default" color="gray">
                {event.repeat_monthly ? pc.recurringMonthly : pc.recurringWeekly}
              </Badge>
            ) : null}
          </Group>

          <Text fw={600} fz="md" style={{ wordBreak: 'break-word' }}>
            {event.title}
          </Text>

          <Text size="sm" c="dimmed" lineClamp={3}>
            {description}
          </Text>

          <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
            <IconMapPin size={14} style={{ flexShrink: 0, color: 'var(--mantine-color-dimmed)' }} />
            <Text size="xs" c="dimmed" truncate style={{ minWidth: 0 }}>
              {location}
            </Text>
          </Group>

          <Divider my={4} />

          <Group gap="xs" wrap="nowrap" align="center">
            <Button
              size="sm"
              fullWidth
              miw={0}
              color="teal"
              variant="light"
              leftSection={<IconBrandWhatsapp size={18} />}
              component="a"
              href={whatsappInviteUrl(invite)}
              target="_blank"
              rel="noreferrer"
              data-testid="agenda-whatsapp"
            >
              {pc.inviteWhatsapp}
            </Button>

            <Menu position="top-end" width={260} withinPortal shadow="md">
              <Menu.Target>
                <Button
                  size="sm"
                  variant="subtle"
                  color="gray"
                  px={{ base: 8, sm: 12 }}
                  style={{ flexShrink: 0 }}
                  leftSection={<IconCalendarPlus size={18} />}
                  data-testid="agenda-save-menu"
                >
                  <Text inherit visibleFrom="sm">
                    {pc.saveToMyAgenda}
                  </Text>
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconBrandGoogle size={16} />}
                  component="a"
                  href={googleCalendarUrl(calendarEvent)}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="agenda-google"
                >
                  {pc.addToGoogle}
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconDeviceMobile size={16} />}
                  onClick={() => downloadIcs(calendarEvent)}
                  data-testid="agenda-ics"
                >
                  {pc.saveIcsDetail}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Stack>
      </Group>
    </Paper>
  );
}

export default function PublicCalendarAgenda({
  payload,
}: {
  payload: PublicCalendarPayload;
}) {
  const { t } = useLanguage();
  const pc = t.publicCalendar;
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT, false, {
    getInitialValueInEffect: true,
  });

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [filter, setFilter] = useState<FilterKey>('all');
  const [desktopView, setDesktopView] = useState<DesktopView>('grid');
  const [selectedDay, setSelectedDay] = useState<{ iso: string; items: AgendaItem[] } | null>(
    null
  );
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const church = payload.church;
  const address = formatAddress(church);
  const mapsLink = mapsUrl(address, church.latitude, church.longitude);
  const linksPage =
    church.public_links_enabled && church.slug ? `/p/${church.slug}` : null;

  const events = useMemo(() => {
    const list = payload.events ?? [];
    if (filter === 'all') return list;
    return list.filter((ev) => ev.category === filter);
  }, [payload.events, filter]);

  const upcoming = useMemo<AgendaItem[]>(
    () =>
      expandEvents(events, today, UPCOMING_DAYS).map(({ date, event }) => ({
        key: `${dateToApi(date)}-${event.id}`,
        date,
        dateISO: dateToApi(date) ?? '',
        event,
      })),
    [events, today]
  );

  const dayLabel = (iso: string) => {
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  };

  const todayItems = upcoming.filter((i) => i.dateISO === dateToApi(today));
  const nextDays = upcoming.filter((i) => {
    const offset = Math.round(
      (i.date.getTime() - today.getTime()) / 86400000
    );
    return offset > 0 && offset <= 7;
  });
  const thisMonth = upcoming.filter((i) => {
    const offset = Math.round((i.date.getTime() - today.getTime()) / 86400000);
    return (
      i.date.getFullYear() === today.getFullYear() &&
      i.date.getMonth() === today.getMonth() &&
      offset > 7
    );
  });

  const monthCells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { day: number; iso: string; items: AgendaItem[] }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const iso = dateToApi(date) ?? '';
      cells.push({
        day: d,
        iso,
        items: events
          .filter((ev) => eventOccursOn(ev, date))
          .map((ev) => ({ key: `${iso}-${ev.id}`, date, dateISO: iso, event: ev })),
      });
    }
    return { cells, firstDay, year, month };
  }, [cursor, events]);

  const listItems = upcoming.slice(0, 40);

  const filters: { value: FilterKey; label: string }[] = [
    { value: 'all', label: pc.filterAll },
    { value: 'culto', label: pc.filterCultos },
    { value: 'event', label: pc.filterEvents },
    { value: 'ensaio', label: pc.filterEnsaios },
  ];

  const renderSection = (title: string, hint: string, items: AgendaItem[]) => (
    <Stack key={title} gap="sm">
      <Group gap="xs">
        <ThemeIcon color="blue" variant="light" size="sm" radius="xl">
          <IconCalendar size={14} />
        </ThemeIcon>
        <Text fw={700} size="sm">
          {title}
        </Text>
        <Badge size="xs" variant="light" color="gray">
          {items.length}
        </Badge>
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      </Group>
      {items.length === 0 ? (
        <Text size="sm" c="dimmed" pl={28}>
          {pc.nothingHere}
        </Text>
      ) : (
        <Stack gap="sm" pl={28}>
          {items.map((item) => (
            <EventCard
              key={item.key}
              item={item}
              church={church}
              mapsLink={mapsLink}
              dayLabel={dayLabel(item.dateISO)}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );

  return (
    <Stack gap="lg">
      <Paper withBorder radius="lg" p="lg" data-testid="agenda-hero">
        <Stack gap="md" align="center" ta="center">
          <Group gap="md" justify="center" wrap="nowrap">
            {church.logo ? (
              <Avatar src={church.logo} size={64} radius="xl" />
            ) : (
              <ThemeIcon size={64} radius="xl" variant="light" color="blue">
                <IconSparkles size={30} />
              </ThemeIcon>
            )}
            <Stack gap={2} align="flex-start" style={{ minWidth: 0 }}>
              <Title order={2} style={{ wordBreak: 'break-word' }}>
                {church.name}
              </Title>
              <Text size="sm" c="dimmed">
                {pc.subtitle}
              </Text>
            </Stack>
          </Group>

          {address ? (
            <Group gap={6} justify="center" wrap="wrap">
              <ThemeIcon color="gray" variant="light" size="sm" radius="xl">
                <IconMapPin size={14} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">
                {address}
              </Text>
            </Group>
          ) : null}

          <Group gap="xs" justify="center" wrap="wrap">
            <Button
              size="sm"
              variant="light"
              leftSection={<IconMapPin size={16} />}
              component="a"
              href={mapsLink}
              target="_blank"
              rel="noreferrer"
              data-testid="agenda-maps"
            >
              {pc.openMaps}
            </Button>
            {linksPage ? (
              <Button
                size="sm"
                variant="default"
                leftSection={<IconExternalLink size={16} />}
                component="a"
                href={linksPage}
                data-testid="agenda-links"
              >
                {pc.openLinks}
              </Button>
            ) : null}
          </Group>
        </Stack>
      </Paper>

      <Paper
        radius="lg"
        p={{ base: 'lg', sm: 'xl' }}
        mih={{ base: 160, sm: 180 }}
        shadow="md"
        data-testid="agenda-welcome"
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: isDark
            ? 'linear-gradient(135deg, var(--mantine-color-dark-6) 0%, var(--mantine-color-dark-5) 45%, var(--mantine-color-orange-9) 100%)'
            : 'linear-gradient(135deg, var(--mantine-color-orange-0) 0%, var(--mantine-color-yellow-0) 55%, var(--mantine-color-grape-0) 100%)',
        }}
      >
        {church.logo ? (
          <Box
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${church.logo})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(26px) saturate(125%)',
              transform: 'scale(1.25)',
              opacity: isDark ? 0.16 : 0.2,
            }}
          />
        ) : null}
        <Box
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: isDark ? 'rgba(0, 0, 0, 0.38)' : 'rgba(255, 255, 255, 0.45)',
          }}
        />
        <Stack gap={8} style={{ position: 'relative' }} maw={640}>
          <Title order={3} fw={700} fz={{ base: 'lg', sm: 'xl' }} lh={1.25}>
            {pc.welcomeTitle}
          </Title>
          <Text fz={{ base: 'sm', sm: 'md' }} c={isDark ? 'gray-3' : 'gray-8'} lh={1.5}>
            {pc.welcomeSubtitle}
          </Text>
        </Stack>
      </Paper>

      <Group gap="xs" wrap="wrap" justify={isMobile ? 'flex-start' : 'center'}>
        {filters.map((f) => (
          <Chip
            key={f.value}
            type="radio"
            size="sm"
            radius="xl"
            checked={filter === f.value}
            onChange={() => setFilter(f.value)}
            data-testid={`agenda-filter-${f.value}`}
          >
            {f.label}
          </Chip>
        ))}
      </Group>

      {isMobile ? (
        <Stack gap="lg">
          {renderSection(pc.groupToday, pc.groupTodayHint, todayItems)}
          {renderSection(pc.groupNextDays, pc.groupNextDaysHint, nextDays)}
          {renderSection(pc.groupThisMonth, pc.groupThisMonthHint, thisMonth)}
        </Stack>
      ) : (
        <Stack gap="md">
          <SegmentedControl
            value={desktopView}
            onChange={(v) => setDesktopView(v as DesktopView)}
            data={[
              { value: 'grid', label: pc.viewMonth },
              { value: 'list', label: pc.viewList },
            ]}
            data-testid="agenda-view"
          />

          {desktopView === 'grid' ? (
            <Paper withBorder radius="md" p="md">
              <Group justify="space-between" mb="sm">
                <Button
                  variant="subtle"
                  size="compact-sm"
                  leftSection={<IconChevronLeft size={16} />}
                  onClick={() =>
                    setCursor(
                      (c) => new Date(c.getFullYear(), c.getMonth() - 1, 1)
                    )
                  }
                  aria-label={pc.previousMonth}
                />
                <Text fw={700}>
                  {t.months[monthCells.month]} {monthCells.year}
                </Text>
                <Button
                  variant="subtle"
                  size="compact-sm"
                  rightSection={<IconChevronRight size={16} />}
                  onClick={() =>
                    setCursor(
                      (c) => new Date(c.getFullYear(), c.getMonth() + 1, 1)
                    )
                  }
                  aria-label={pc.nextMonth}
                />
              </Group>

              <SimpleGrid cols={7} spacing={4}>
                {WEEKDAY_LABELS.map((w) => (
                  <Text key={w} size="xs" fw={700} c="dimmed" ta="center" tt="uppercase">
                    {w}
                  </Text>
                ))}
                {Array.from({ length: monthCells.firstDay }).map((_, i) => (
                  <Box key={`empty-${i}`} />
                ))}
                {monthCells.cells.map((cell) => {
                  const isToday = cell.iso === dateToApi(today);
                  const hasEvents = cell.items.length > 0;
                  return (
                    <Paper
                      key={cell.iso}
                      withBorder
                      p={4}
                      radius="sm"
                      component="button"
                      type="button"
                      onClick={() =>
                        hasEvents && setSelectedDay({ iso: cell.iso, items: cell.items })
                      }
                      aria-label={pc.dayAriaLabel
                        .replace('{day}', String(cell.day))
                        .replace('{count}', String(cell.items.length))}
                      data-testid={`agenda-day-${cell.iso}`}
                      style={{
                        minHeight: 84,
                        width: '100%',
                        textAlign: 'left',
                        font: 'inherit',
                        cursor: hasEvents ? 'pointer' : 'default',
                        transition: 'border-color 120ms ease, background-color 120ms ease',
                        background: isToday
                          ? 'var(--mantine-color-blue-1)'
                          : undefined,
                        borderColor: isToday
                          ? 'var(--mantine-color-blue-6)'
                          : undefined,
                      }}
                    >
                      <Text size="sm" fw={isToday ? 800 : 600} ta="center">
                        {cell.day}
                      </Text>
                      <Stack gap={2} mt={2}>
                        {cell.items.slice(0, 2).map((item) => (
                          <Text
                            key={item.key}
                            size="xs"
                            truncate
                            fw={500}
                            style={{
                              background: 'var(--mantine-color-blue-0)',
                              borderRadius: 4,
                              padding: '1px 4px',
                            }}
                          >
                            {eventTime(item.event)
                              ? `${eventTime(item.event)} ${item.event.title}`
                              : item.event.title}
                          </Text>
                        ))}
                        {cell.items.length > 2 ? (
                          <Text size="xs" c="dimmed" ta="center">
                            {pc.moreEvents.replace('{count}', String(cell.items.length - 2))}
                          </Text>
                        ) : null}
                      </Stack>
                    </Paper>
                  );
                })}
              </SimpleGrid>

              {monthCells.cells.every((c) => c.items.length === 0) ? (
                <Center py="lg">
                  <Text size="sm" c="dimmed">
                    {pc.emptyMonth}
                  </Text>
                </Center>
              ) : (
                <Text size="xs" c="dimmed" ta="center" mt="sm">
                  {pc.dayDetailsHint}
                </Text>
              )}
            </Paper>
          ) : (
            <Stack gap="sm" maw={800} mx="auto" w="100%">
              {listItems.length === 0 ? (
                <Center py="xl">
                  <Text size="sm" c="dimmed">
                    {pc.empty}
                  </Text>
                </Center>
              ) : (
                listItems.map((item) => (
                  <EventCard
                    key={item.key}
                    item={item}
                    church={church}
                    mapsLink={mapsLink}
                    dayLabel={dayLabel(item.dateISO)}
                  />
                ))
              )}
            </Stack>
          )}
        </Stack>
      )}

      <Modal
        opened={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? `${pc.dayDetailsTitle} — ${dayLabel(selectedDay.iso)}` : ''}
        centered
        size="lg"
      >
        <Stack gap="sm" mih={120}>
          {selectedDay?.items.map((item) => (
            <EventCard
              key={item.key}
              item={item}
              church={church}
              mapsLink={mapsLink}
              dayLabel={dayLabel(item.dateISO)}
            />
          ))}
        </Stack>
      </Modal>

      <Text size="xs" c="dimmed" ta="center">
        {pc.footer.replace('{church}', church.name)}
      </Text>
    </Stack>
  );
}
