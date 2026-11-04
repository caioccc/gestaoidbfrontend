import React, { useRef } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Center,
  Group,
  Paper,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { IconMusic, IconStarFilled } from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { formatMusicalKey } from '../utils/format';
import type { Song } from '../types';

type SongHighlightsCarouselProps = {
  songs: Song[];
  onOpen: (song: Song) => void;
  onToggleHighlight: (song: Song) => void;
};

export default function SongHighlightsCarousel({
  songs,
  onOpen,
  onToggleHighlight,
}: SongHighlightsCarouselProps) {
  const { t } = useLanguage();
  const autoplay = useRef(Autoplay({
    delay: 2000,
    stopOnInteraction: false,
    stopOnMouseEnter: true,
    stopOnFocusIn: true,
  }));

  if (songs.length === 0) return null;

  return (
    <Paper withBorder radius="md" p="sm" mb="md" data-testid="song-highlights-carousel">
      <Group justify="space-between" align="center" mb="xs">
        <Group gap={6}>
          <IconStarFilled size={17} color="var(--mantine-color-yellow-6)" />
          <Text fw={600}>{t.music.highlightsTitle}</Text>
          <Badge variant="light" color="yellow" size="sm">{songs.length}</Badge>
        </Group>
      </Group>

      <Carousel
        slideSize={{ base: '100%', sm: '50%', md: '33.333333%', lg: '25%' }}
        slideGap="sm"
        emblaOptions={{
          align: 'start',
          loop: songs.length > 1,
          containScroll: 'trimSnaps',
        }}
        plugins={[autoplay.current]}
        withControls={songs.length > 1}
        withIndicators={songs.length > 1}
        controlSize={26}
        controlsOffset="xs"
      >
        {songs.map((song) => (
          <Carousel.Slide key={song.id}>
            <Card
              withBorder
              radius="md"
              padding={0}
              h="100%"
              onClick={() => onOpen(song)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <Box
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 9',
                  background:
                    'linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-grape-6))',
                }}
              >
                {song.thumbnail_url ? (
                  <img
                    src={song.thumbnail_url}
                    alt={`Capa de ${song.title}`}
                    loading="lazy"
                    draggable={false}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <Center h="100%">
                    <IconMusic size={42} color="white" style={{ opacity: 0.85 }} />
                  </Center>
                )}

                {song.church_key ? (
                  <Badge
                    variant="filled"
                    color="dark"
                    size="sm"
                    style={{ position: 'absolute', left: 8, bottom: 8 }}
                  >
                    {formatMusicalKey(song.church_key)}
                  </Badge>
                ) : null}

                {song.band_name ? (
                  <Badge
                    variant="filled"
                    color={song.band_color}
                    size="sm"
                    style={{ position: 'absolute', right: 8, bottom: 8 }}
                  >
                    {song.band_name}
                  </Badge>
                ) : null}

                <Tooltip label={t.music.unhighlightSong} position="left" withArrow>
                  <ActionIcon
                    variant="filled"
                    color="dark"
                    radius="xl"
                    aria-label={t.music.unhighlightSong}
                    style={{ position: 'absolute', top: 8, right: 8 }}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleHighlight(song);
                    }}
                  >
                    <IconStarFilled size={18} color="var(--mantine-color-yellow-4)" />
                  </ActionIcon>
                </Tooltip>
              </Box>

              <Stack gap={2} p="sm" style={{ flex: 1, minWidth: 0 }}>
                <Text fw={600} size="sm" lineClamp={1}>{song.title}</Text>
                <Text size="xs" c="dimmed" lineClamp={1}>{song.artist || '-'}</Text>
              </Stack>
            </Card>
          </Carousel.Slide>
        ))}
      </Carousel>
    </Paper>
  );
}
