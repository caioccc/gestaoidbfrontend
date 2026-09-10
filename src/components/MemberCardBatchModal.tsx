import React, { useRef, useState } from 'react';
import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import {
  IconFileExport,
  IconGridDots,
  IconPrinter,
} from '@tabler/icons-react';
import {
  MemberCardBack,
  MemberCardFront,
  MemberCardPair,
} from './MemberCard';
import { useLanguage } from '../i18n';
import type { CardConfig, Member } from '../types';
import type { ChurchContact } from '../hooks/useChurchCardConfig';
import {
  exportMemberCardFacesGridPdf,
  exportMemberCardPairsPdf,
  printMemberCards,
} from '../utils/memberCard';

interface MemberCardBatchModalProps {
  opened: boolean;
  onClose: () => void;
  members: Member[];
  churchName: string;
  config?: CardConfig;
  churchContact?: ChurchContact;
}

export default function MemberCardBatchModal({
  opened,
  onClose,
  members,
  churchName,
  config,
  churchContact,
}: MemberCardBatchModalProps) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState<'one' | 'grid' | 'print' | null>(null);
  const pairCells = useRef(new Map<number, HTMLDivElement>());
  const frontCells = useRef(new Map<number, HTMLDivElement>());
  const backCells = useRef(new Map<number, HTMLDivElement>());

  const pairRef = (id: number) => (el: HTMLDivElement | null) => {
    if (el) pairCells.current.set(id, el);
    else pairCells.current.delete(id);
  };
  const frontRef = (id: number) => (el: HTMLDivElement | null) => {
    if (el) frontCells.current.set(id, el);
    else frontCells.current.delete(id);
  };
  const backRef = (id: number) => (el: HTMLDivElement | null) => {
    if (el) backCells.current.set(id, el);
    else backCells.current.delete(id);
  };

  const fileName = () =>
    `carteirinhas_lote_${new Date().toISOString().slice(0, 10)}`;

  const run = async (
    kind: 'one' | 'grid' | 'print',
    fn: () => Promise<void>
  ) => {
    setBusy(kind);
    try {
      await fn();
    } catch {
      // nada: usuário pode tentar novamente
    } finally {
      setBusy(null);
    }
  };

  const pairs = members.map((m) => pairCells.current.get(m.id) ?? null);
  const fronts = members.map((m) => frontCells.current.get(m.id) ?? null);
  const backs = members.map((m) => backCells.current.get(m.id) ?? null);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t.cardBatch.title}
      centered
      size="md"
    >
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
        {members.map((m) => (
          <React.Fragment key={m.id}>
            <div ref={pairRef(m.id)}>
              <MemberCardPair
                member={m}
                churchName={churchName}
                config={config}
                churchContact={churchContact}
              />
            </div>
            <div ref={frontRef(m.id)}>
              <MemberCardFront
                member={m}
                churchName={churchName}
                config={config}
              />
            </div>
            <div ref={backRef(m.id)}>
              <MemberCardBack
                member={m}
                churchName={churchName}
                config={config}
                churchContact={churchContact}
              />
            </div>
          </React.Fragment>
        ))}
      </div>

      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t.cardBatch.countTitle} {members.length}
        </Text>
        <Group gap="xs">
          <Button
            leftSection={<IconFileExport size={16} />}
            loading={busy === 'one'}
            disabled={members.length === 0}
            onClick={() =>
              run('one', () =>
                exportMemberCardPairsPdf(pairs, fileName())
              )
            }
            data-testid="batch-pdf-one"
          >
            {t.cardBatch.onePerPage}
          </Button>
          <Button
            variant="default"
            leftSection={<IconGridDots size={16} />}
            loading={busy === 'grid'}
            disabled={members.length === 0}
            onClick={() =>
              run('grid', () =>
                exportMemberCardFacesGridPdf(fronts, backs, fileName())
              )
            }
            data-testid="batch-pdf-grid"
          >
            {t.cardBatch.grid}
          </Button>
          <Button
            variant="default"
            leftSection={<IconPrinter size={16} />}
            loading={busy === 'print'}
            disabled={members.length === 0}
            onClick={() =>
              run('print', () => printMemberCards(pairs, t.cardBatch.title))
            }
            data-testid="batch-print"
          >
            {t.cardBatch.print}
          </Button>
        </Group>
        {members.length === 0 && (
          <Text size="xs" c="dimmed">
            {t.cardBatch.empty}
          </Text>
        )}
      </Stack>
    </Modal>
  );
}