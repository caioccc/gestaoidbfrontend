import React, { useRef, useState } from 'react';
import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import {
  IconDownload,
  IconFileExport,
  IconPrinter,
  IconShare2,
  IconX,
} from '@tabler/icons-react';
import MemberCard, { MemberCardPair } from './MemberCard';
import ShareLinkModal from './ShareLinkModal';
import { useLanguage } from '../i18n';
import { accountsApi } from '../api/accounts';
import type { CardConfig, Member } from '../types';
import type { ChurchContact } from '../hooks/useChurchCardConfig';
import {
  downloadMemberCardPairPdf,
  downloadMemberCardPairPng,
  printMemberCardPair,
} from '../utils/memberCard';

interface MemberCardModalProps {
  opened: boolean;
  onClose: () => void;
  member: Member | null;
  churchName: string;
  config?: CardConfig;
  churchContact?: ChurchContact;
}

export default function MemberCardModal({
  opened,
  onClose,
  member,
  churchName,
  config,
  churchContact,
}: MemberCardModalProps) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const node = () => ref.current;

  const run = async (fn: (el: HTMLElement) => Promise<void>) => {
    const el = node();
    if (!el) return;
    setBusy(true);
    try {
      await fn(el);
    } catch {
      // nenhuma ação extra: o usuário pode tentar novamente
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t.memberCard.title}
      centered
      size="auto"
      withCloseButton
    >
      {member && (
        <Stack align="center" gap="md">
          <Text size="xs" c="dimmed" ta="center">
            {t.memberCard.flipHint}
          </Text>
          <MemberCard
            member={member}
            churchName={churchName}
            config={config}
            churchContact={churchContact}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: -9999,
              opacity: 0,
              pointerEvents: 'none',
            }}
            aria-hidden
          >
            <MemberCardPair
              ref={ref}
              member={member}
              churchName={churchName}
              config={config}
              churchContact={churchContact}
            />
          </div>
          <Group gap="xs">
            <Button
              size="xs"
              leftSection={<IconPrinter size={14} />}
              loading={busy}
              onClick={() => run((el) => printMemberCardPair(el, t.memberCard.title))}
              data-testid="membercard-print"
            >
              {t.memberCard.print}
            </Button>
            <Button
              size="xs"
              variant="default"
              leftSection={<IconDownload size={14} />}
              loading={busy}
              onClick={() => run((el) => downloadMemberCardPairPng(el, member.name))}
              data-testid="membercard-png"
            >
              {t.memberCard.downloadPng}
            </Button>
            <Button
              size="xs"
              variant="default"
              leftSection={<IconShare2 size={14} />}
              onClick={() => setShareOpen(true)}
              data-testid="membercard-share"
            >
              {t.memberCard.share}
            </Button>
            <Button
              size="xs"
              variant="default"
              leftSection={<IconFileExport size={14} />}
              loading={busy}
              onClick={() => run((el) => downloadMemberCardPairPdf(el, member.name))}
              data-testid="membercard-pdf"
            >
              {t.memberCard.downloadPdf}
            </Button>
            <Button
              size="xs"
              variant="subtle"
              leftSection={<IconX size={14} />}
              onClick={onClose}
            >
              {t.memberCard.close}
            </Button>
          </Group>
        </Stack>
      )}
      {member && (
        <ShareLinkModal
          opened={shareOpen}
          onClose={() => setShareOpen(false)}
          title={t.qrShare.cardTitle}
          subtitle={t.qrShare.subtitle}
          getUrl={() => accountsApi.memberPublicLink(member.id).then((r) => r.public_url)}
          regenerate={() =>
            accountsApi
              .memberPublicLinkRegenerate(member.id)
              .then((r) => r.public_url)
          }
        />
      )}
    </Modal>
  );
}