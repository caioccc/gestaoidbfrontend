import React from 'react';
import { Box, Text, Group, ActionIcon, Image } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { IconPhoto, IconUpload, IconX, IconTrash } from '@tabler/icons-react';

const MAX_DIMENSION = 800;
const QUALITY = 0.82;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = document.createElement('img');
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Imagem inválida'));
    };
    img.src = url;
  });
}

export interface ImageUploadProps {
  value?: string | null;
  onChange?: (dataUrl: string | null) => void;
  label?: string;
  placeholder?: string;
  imageAlt?: string;
  imageRadius?: 'xs' | 'sm' | 'md' | 'lg' | number;
  height?: number | string;
}

export default function ImageUpload({
  value,
  onChange,
  label,
  placeholder,
  imageAlt = 'pré-visualização',
  imageRadius = 'md',
  height = 160,
}: ImageUploadProps) {
  const handleFile = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    try {
      const img = await loadImage(file);
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
      onChange?.(dataUrl);
    } catch {
      onChange?.(null);
    }
  };

  return (
    <Box>
      {label && (
        <Text size="sm" fw={500} mb={4}>
          {label}
        </Text>
      )}
      {value ? (
        <Box pos="relative" style={{ maxWidth: 240 }}>
          <Image
            src={value}
            alt={imageAlt}
            radius={imageRadius}
            height={height}
            w="100%"
            fit="cover"
            style={{ objectFit: 'cover' }}
          />
          <ActionIcon
            color="red"
            variant="filled"
            radius="xl"
            size="sm"
            style={{ position: 'absolute', top: 6, right: 6 }}
            onClick={() => onChange?.(null)}
            aria-label="remover-imagem"
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Box>
      ) : (
        <Dropzone
          onDrop={handleFile}
          accept={IMAGE_MIME_TYPE}
          maxSize={5 * 1024 * 1024}
          maxFiles={1}
          multiple={false}
          h={height}
          style={{ maxWidth: 240 }}
          data-testid="image-upload"
        >
          <Group justify="center" align="center" gap="xs" style={{ height: '100%' }}>
            <IconUpload size={22} style={{ color: 'var(--mantine-color-dimmed)' }} />
            <Box ta="center">
              <Text size="sm" c="dimmed">
                {placeholder}
              </Text>
              <Text size="xs" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconPhoto size={12} /> JPG/PNG até 800px
              </Text>
            </Box>
            <ActionIcon color="gray" variant="subtle" style={{ pointerEvents: 'none' }}>
              <IconX size={16} />
            </ActionIcon>
          </Group>
        </Dropzone>
      )}
    </Box>
  );
}