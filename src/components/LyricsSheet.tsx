import React, { useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Group,
  ScrollArea,
  SegmentedControl,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCopy, IconPlayerTrackNext, IconPlayerTrackPrev } from '@tabler/icons-react';
import { useLanguage } from '../i18n';

interface LyricsSheetProps {
  lyrics: string;
}

const SCROLL_SPEEDS = {
  slow: 12,
  normal: 26,
  fast: 42,
} as const;

type ScrollSpeed = keyof typeof SCROLL_SPEEDS;

export default function LyricsSheet({ lyrics }: LyricsSheetProps) {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [autoOn, setAutoOn] = useState(false);
  const [speed, setSpeed] = useState<ScrollSpeed>('normal');
  const timerRef = useRef<number | null>(null);

  const stanzas = useMemo(
    () =>
      (lyrics || '')
        .split(/\n\s*\n/)
        .map((s) => s.trim())
        .filter(Boolean),
    [lyrics],
  );

  const stopScroll = () => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setAutoOn(false);
  };

  const startScroll = (nextSpeed: ScrollSpeed) => {
    if (timerRef.current != null) window.clearInterval(timerRef.current);
    const wrap = scrollRef.current;
    if (!wrap) {
      setAutoOn(true);
      setSpeed(nextSpeed);
      return;
    }
    const initial = wrap.scrollTop;
    const tickMs = 40;
    let elapsed = 0;
    timerRef.current = window.setInterval(() => {
      elapsed += tickMs;
      wrap.scrollTop = initial + SCROLL_SPEEDS[nextSpeed] * (elapsed / 1000);
      const maxScroll = wrap.scrollHeight - wrap.clientHeight;
      if (wrap.scrollTop >= maxScroll) stopScroll();
    }, tickMs);
    setAutoOn(true);
    setSpeed(nextSpeed);
  };

  const toggleAuto = () => {
    if (autoOn) {
      stopScroll();
    } else {
      startScroll(speed);
    }
  };

  const copyForProjection = async () => {
    const clean = stanzas.join('\n\n') || lyrics || '';
    try {
      await navigator.clipboard.writeText(clean);
      notifications.show({ color: 'green', message: t.music.projectionCopied });
    } catch {
      notifications.show({ color: 'red', message: t.music.copyFailed });
    }
  };

  if (!stanzas.length) {
    return <Text c="dimmed">{t.music.noLyrics}</Text>;
  }

  return (
    <Card withBorder p={0}>
      <Group justify="space-between" align="center" p="xs" wrap="wrap" gap="xs">
        <Group gap="xs" wrap="nowrap">
          <Button
            size="xs"
            variant={autoOn ? 'filled' : 'light'}
            color={autoOn ? 'blue' : undefined}
            leftSection={
              autoOn ? <IconPlayerTrackPrev size={16} /> : <IconPlayerTrackNext size={16} />
            }
            onClick={toggleAuto}
          >
            {t.music.autoScroll}
          </Button>
          {autoOn ? (
            <SegmentedControl
              size="xs"
              value={speed}
              onChange={(v) => startScroll(v as ScrollSpeed)}
              data={[
                { value: 'slow', label: t.music.scrollSlow },
                { value: 'normal', label: t.music.scrollNormal },
                { value: 'fast', label: t.music.scrollFast },
              ]}
            />
          ) : null}
        </Group>
        <Tooltip label={t.music.copyProjection}>
          <Button
            size="xs"
            variant="light"
            color="teal"
            leftSection={<IconCopy size={16} />}
            onClick={copyForProjection}
          >
            {t.music.copyProjection}
          </Button>
        </Tooltip>
      </Group>

      <ScrollArea viewportRef={scrollRef} h={440} offsetScrollbars>
        <Box p="lg" maw={760} mx="auto">
          {stanzas.map((stanza, i) => (
            <Box
              key={i}
              style={{
                whiteSpace: 'pre-wrap',
                marginBottom: i < stanzas.length - 1 ? 22 : 0,
              }}
            >
              <Text size="lg" lh={1.9}>
                {stanza}
              </Text>
            </Box>
          ))}
        </Box>
      </ScrollArea>
    </Card>
  );
}