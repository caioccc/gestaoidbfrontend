import React, { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Menu,
  Modal,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  useMantineColorScheme,
} from '@mantine/core';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { notifications } from '@mantine/notifications';
import {
  IconBrandWhatsapp,
  IconDotsVertical,
  IconGripVertical,
  IconPencil,
  IconTrash,
  IconUserPlus,
  IconUsers,
} from '@tabler/icons-react';
import { accountsApi } from '../api/accounts';
import { useLanguage } from '../i18n';
import MemberFormModal from './MemberFormModal';
import SendWhatsAppModal from './SendWhatsAppModal';
import VisitorFormModal, { type VisitorFormValues } from './VisitorFormModal';
import {
  FUNNEL_STAGES,
  daysSinceLastContact,
  lifecycleCategoryHint,
} from '../utils/whatsapp';
import type {
  CardConfig,
  LifecycleStage,
  Member,
  MinistryArea,
} from '../types';
import type { ChurchContact } from '../hooks/useChurchCardConfig';

const STAGE_COLORS: Record<string, string> = {
  VISITOR: 'violet',
  INTEGRATION: 'blue',
  ACTIVE: 'green',
  ABSENT_CARE: 'orange',
  TRANSITION: 'gray',
  INACTIVE: 'red',
};

const FUNNEL_COLUMNS: string[] = [...FUNNEL_STAGES, 'INACTIVE'];

const MEMBER_STAGES: LifecycleStage[] = ['ACTIVE', 'ABSENT_CARE', 'TRANSITION'];

function isVisitorStage(stage: LifecycleStage | string): boolean {
  return stage === 'VISITOR' || stage === 'INTEGRATION';
}

function isMemberStage(stage: LifecycleStage | string): boolean {
  return MEMBER_STAGES.includes(stage as LifecycleStage);
}

function isAllowedTransition(source: string, target: string): boolean {
  if (source === target) return true;
  if (target === 'VISITOR') {
    // Visitantes podem voltar para a coluna Visitantes; membros não.
    return isVisitorStage(source);
  }
  if (source === 'INACTIVE') return true;
  if (isVisitorStage(source)) {
    // Visita → colunas de membro é tratado no drop (modal de promoção).
    return !isMemberStage(target);
  }
  return true;
}

interface MembersFunnelTabProps {
  churchName?: string;
  churchCity?: string;
  cardConfig?: CardConfig;
  churchContact?: ChurchContact;
}

interface DragStartInfo {
  id: string;
  member: Member;
  stage: string;
  index: number;
}

function simpleDragId(memberId: number): string {
  return `member-${memberId}`;
}

function dragIdToMemberId(id: string): number | null {
  const match = /^member-(\d+)$/.exec(id);
  return match ? Number(match[1]) : null;
}

function SortableFunnelCard({
  member,
  stage,
  color,
  isVisitor,
  onWhatsApp,
  onEdit,
  onDelete,
  onPromote,
}: {
  member: Member;
  stage: string;
  color: string;
  isVisitor: boolean;
  onWhatsApp: (member: Member) => void;
  onEdit?: (member: Member) => void;
  onDelete?: (member: Member) => void;
  onPromote?: (member: Member) => void;
}) {
  const { t } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: simpleDragId(member.id),
  });

  const days = daysSinceLastContact(member.last_contact_at);
  const contactLabel =
    days === null
      ? t.funnel.noContact
      : days === 0
        ? t.funnel.today
        : days === 1
          ? t.funnel.yesterday
          : t.funnel.daysSince.replace('{n}', String(days));

  return (
    <Card
      ref={setNodeRef}
      withBorder
      radius="md"
      p="xs"
      shadow={isDragging ? 'md' : undefined}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      data-testid={`funnel-card-${member.id}`}
    >
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <BoxHandler {...attributes} {...listeners} />
        <Avatar src={member.photo || null} radius="xl" size="md" />
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={600} truncate>
            {member.name}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {member.phone || '—'}
          </Text>
          <Tooltip label={contactLabel} openDelay={300}>
            <Badge
              size="xs"
              color={color}
              variant="light"
              radius="sm"
              mt={2}
              style={{ alignSelf: 'flex-start', maxWidth: '100%' }}
              data-testid={`funnel-contact-${member.id}`}
            >
              {contactLabel}
            </Badge>
          </Tooltip>
        </Stack>
        <Tooltip label={t.membersPage.sendWhatsApp}>
          <Button
            variant="subtle"
            color="green"
            size="compact-sm"
            px={4}
            onClick={() => onWhatsApp(member)}
            data-testid={`funnel-wa-${member.id}`}
          >
            <IconBrandWhatsapp size={16} />
          </Button>
        </Tooltip>
        {isVisitor && (onEdit || onDelete || onPromote) ? (
          <Menu shadow="md" width={200} position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" size="sm" color="gray" data-testid={`funnel-menu-${member.id}`}>
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {stage === 'INTEGRATION' && onPromote ? (
                <Menu.Item
                  leftSection={<IconUserPlus size={16} />}
                  onClick={() => onPromote(member)}
                  data-testid={`funnel-promote-${member.id}`}
                >
                  {t.funnel.promote}
                </Menu.Item>
              ) : null}
              {onEdit ? (
                <Menu.Item
                  leftSection={<IconPencil size={16} />}
                  onClick={() => onEdit(member)}
                  data-testid={`funnel-edit-${member.id}`}
                >
                  {t.common.edit}
                </Menu.Item>
              ) : null}
              {onDelete ? (
                <Menu.Item
                  leftSection={<IconTrash size={16} />}
                  color="red"
                  onClick={() => onDelete(member)}
                  data-testid={`funnel-delete-${member.id}`}
                >
                  {t.common.delete}
                </Menu.Item>
              ) : null}
            </Menu.Dropdown>
          </Menu>
        ) : null}
      </Group>
    </Card>
  );
}

function BoxHandler(props: React.HTMLAttributes<HTMLElement>) {
  return (
    <ThemeIcon size="sm" variant="subtle" color="gray" style={{ cursor: 'grab', touchAction: 'none' }} {...props}>
      <IconGripVertical size={14} />
    </ThemeIcon>
  );
}

function FunnelColumn({
  id,
  colorScheme,
  title,
  color,
  count,
  emptyLabel,
  children,
}: {
  id: string;
  colorScheme: string;
  title: string;
  color: string;
  count: number;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <Stack
      ref={setNodeRef}
      gap="xs"
      w={260}
      style={{
        flexShrink: 0,
        borderRadius: 'var(--mantine-radius-md)',
        backgroundColor:
          colorScheme === 'dark'
            ? 'var(--mantine-color-dark-6)'
            : 'var(--mantine-color-gray-1)',
        border: '1px solid var(--mantine-color-default-border)',
        padding: 'var(--mantine-spacing-xs)',
        minHeight: 180,
      }}
    >
      <Group justify="space-between" px={4}>
        <Text size="sm" fw={700}>
          {title}
        </Text>
        <Badge color={color} variant="light" size="sm">
          {count}
        </Badge>
      </Group>
      {count === 0 ? (
        <Text size="xs" c="dimmed" px={4}>
          {emptyLabel}
        </Text>
      ) : (
        children
      )}
    </Stack>
  );
}

export default function MembersFunnelTab({
  churchName = '',
  churchCity = '',
  cardConfig,
  churchContact,
}: MembersFunnelTabProps) {
  const { t } = useLanguage();
  const { colorScheme } = useMantineColorScheme();
  const [boards, setBoards] = useState<Record<string, Member[]>>(() =>
    Object.fromEntries(FUNNEL_COLUMNS.map((s) => [s, [] as Member[]])),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<DragStartInfo | null>(null);
  const [waMember, setWaMember] = useState<Member | null>(null);
  const [areas, setAreas] = useState<MinistryArea[]>([]);
  const [visitorForm, setVisitorForm] = useState<{ opened: boolean; visitor: Member | null }>({
    opened: false,
    visitor: null,
  });
  const [pendingPromotion, setPendingPromotion] = useState<{
    member: Member;
    memberStage: LifecycleStage;
  } | null>(null);
  const [toDelete, setToDelete] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = () => {
    setLoading(true);
    setError(false);
    Promise.all([accountsApi.members(), accountsApi.ministryAreas()])
      .then(([all, areasData]) => {
        setAreas(areasData);
        const next = Object.fromEntries(
          FUNNEL_COLUMNS.map((s) => [s, [] as Member[]]),
        ) as Record<string, Member[]>;
        for (const m of all) {
          if (m.status === 'INACTIVE') {
            next.INACTIVE.push(m);
            continue;
          }
          const stage = (m.lifecycle_stage || 'ACTIVE') as string;
          if (stage in next) next[stage].push(m);
        }
        setBoards(next);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const findBoard = (id: string): string | null => {
    if (FUNNEL_COLUMNS.includes(id)) return id;
    const memberId = dragIdToMemberId(id);
    if (memberId === null) return null;
    const boardKey = FUNNEL_COLUMNS.find((s) => boards[s].some((m) => m.id === memberId));
    return boardKey ?? null;
  };

  const findMember = (id: number): Member | null => {
    for (const s of FUNNEL_COLUMNS) {
      const found = boards[s].find((m) => m.id === id);
      if (found) return found;
    }
    return null;
  };

  const onDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    const memberId = dragIdToMemberId(id);
    const stage = findBoard(id);
    const index = stage ? boards[stage].findIndex((m) => m.id === memberId) : -1;
    const member = stage && memberId !== null ? boards[stage].find((m) => m.id === memberId) ?? null : null;
    setDraggingId(id);
    setDragStart(
      member && stage && index >= 0
        ? { id, member, stage, index }
        : null,
    );
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeBoard = findBoard(String(active.id));
    const overBoard = findBoard(String(over.id));
    if (!activeBoard || !overBoard) return;

    const activeId = dragIdToMemberId(String(active.id));
    if (activeId === null) return;
    const moving = findMember(activeId);
    if (!moving) return;

    if (activeBoard === overBoard) {
      return;
    }
    if (!isAllowedTransition(activeBoard, overBoard)) {
      return;
    }

    setBoards((prev) => {
      const from = prev[activeBoard].filter((m) => m.id !== activeId);
      const overMemberId = dragIdToMemberId(String(over.id));
      const overIndex = overMemberId === null
        ? prev[overBoard].length
        : prev[overBoard].findIndex((m) => m.id === overMemberId);
      const to = [...prev[overBoard]];
      to.splice(overIndex >= 0 ? overIndex : to.length, 0, moving);
      return { ...prev, [activeBoard]: from, [overBoard]: to };
    });
  };

  const revertVisualMove = (index: number, sourceStage: string, member: Member) => {
    setBoards((prev) => {
      const clean = Object.fromEntries(
        FUNNEL_COLUMNS.map((s) => [s, prev[s].filter((m) => m.id !== member.id)]),
      ) as Record<string, Member[]>;
      const to = [...clean[sourceStage]];
      to.splice(Math.min(index, to.length), 0, member);
      return { ...clean, [sourceStage]: to };
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = dragIdToMemberId(String(active.id));
    if (activeId === null) {
      setDraggingId(null);
      setDragStart(null);
      return;
    }
    const sourceStage = dragStart?.stage ?? (findBoard(String(active.id)) as string | null);
    const member = dragStart?.member ?? findMember(activeId);
    const overBoard = over ? (findBoard(String(over.id)) as string | null) : null;

    if (!sourceStage) {
      setDraggingId(null);
      setDragStart(null);
      return;
    }

    if (!overBoard || overBoard === sourceStage) {
      const overMemberId = over ? dragIdToMemberId(String(over.id)) : null;
      if (overMemberId !== null) {
        const oldIndex = boards[sourceStage].findIndex((m) => m.id === activeId);
        const newIndex = boards[sourceStage].findIndex((m) => m.id === overMemberId);
        if (oldIndex !== newIndex && newIndex >= 0 && oldIndex >= 0) {
          setBoards((prev) => ({
            ...prev,
            [sourceStage]: arrayMove(prev[sourceStage], oldIndex, newIndex),
          }));
        }
      }
      setDraggingId(null);
      setDragStart(null);
      return;
    }

    if (member && isVisitorStage(sourceStage) && isMemberStage(overBoard)) {
      // Visitante → membro: abre o cadastro de membro pré-preenchido.
      if (dragStart) revertVisualMove(dragStart.index, sourceStage, member);
      setPendingPromotion({ member, memberStage: overBoard as LifecycleStage });
    } else if (member && isAllowedTransition(sourceStage, overBoard)) {
      applyMove(member, overBoard);
    } else {
      if (dragStart && member) revertVisualMove(dragStart.index, sourceStage, member);
      notifications.show({ color: 'red', message: t.funnel.moveError });
    }

    setDraggingId(null);
    setDragStart(null);
  };

  const applyMove = (member: Member, targetStage: string) => {
    const requests: Promise<unknown>[] = [];
    let nextStatus: Member['status'] = member.status;
    let nextStage: string = targetStage;

    if (targetStage === 'INACTIVE') {
      if (member.status !== 'INACTIVE') {
        requests.push(accountsApi.updateMember(member.id, { status: 'INACTIVE' }));
        nextStatus = 'INACTIVE';
      }
      nextStage = member.lifecycle_stage || 'ACTIVE';
    } else {
      requests.push(accountsApi.setMemberStage(member.id, targetStage as LifecycleStage));
      if (member.status === 'INACTIVE') {
        requests.push(accountsApi.updateMember(member.id, { status: 'ACTIVE' }));
        nextStatus = 'ACTIVE';
      }
      nextStage = targetStage;
    }

    Promise.all(requests)
      .then(() => {
        removeMemberFromBoards(member.id);
        setBoards((prev) => ({
          ...prev,
          [targetStage]: [
            ...prev[targetStage],
            { ...member, lifecycle_stage: nextStage as LifecycleStage, status: nextStatus },
          ],
        }));
        notifications.show({ color: 'green', message: t.funnel.moved });
      })
      .catch(() => {
        notifications.show({ color: 'red', message: t.funnel.moveError });
        load();
      });
  };

  const replaceMemberInBoards = (updated: Member) => {
    setBoards((prev) => {
      const next = { ...prev };
      for (const s of FUNNEL_COLUMNS) {
        next[s] = next[s].map((m) => (m.id === updated.id ? updated : m));
      }
      return next;
    });
  };

  const removeMemberFromBoards = (id: number) => {
    setBoards((prev) => {
      const next = { ...prev };
      for (const s of FUNNEL_COLUMNS) {
        next[s] = next[s].filter((m) => m.id !== id);
      }
      return next;
    });
  };

  const openCreateVisitor = () => setVisitorForm({ opened: true, visitor: null });

  const openEditVisitor = (m: Member) => setVisitorForm({ opened: true, visitor: m });

  const handleVisitorSave = async (
    payload: VisitorFormValues,
    isEdit: boolean,
  ): Promise<Member> => {
    if (isEdit && visitorForm.visitor) {
      const saved = await accountsApi.updateMember(visitorForm.visitor.id, payload);
      replaceMemberInBoards(saved);
      notifications.show({ color: 'green', message: t.funnel.visitorSaved });
      return saved;
    }
    const created = await accountsApi.createMember({
      ...payload,
      lifecycle_stage: 'VISITOR',
    });
    setBoards((prev) => ({
      ...prev,
      VISITOR: [...prev.VISITOR, { ...created, lifecycle_stage: 'VISITOR' }],
    }));
    notifications.show({ color: 'green', message: t.funnel.visitorSaved });
    return created;
  };

  const openPromote = (m: Member) => {
    setPendingPromotion({ member: m, memberStage: 'ACTIVE' });
  };

  const handlePromote = async (payload: Record<string, unknown>, _isEdit: boolean): Promise<Member> => {
    if (!pendingPromotion) throw new Error('No pending promotion');
    const saved = await accountsApi.updateMember(pendingPromotion.member.id, payload);
    const res = await accountsApi.setMemberStage(saved.id, pendingPromotion.memberStage);
    removeMemberFromBoards(saved.id);
    setBoards((prev) => ({
      ...prev,
      [pendingPromotion.memberStage]: [
        ...prev[pendingPromotion.memberStage],
        { ...saved, lifecycle_stage: res.lifecycle_stage as LifecycleStage },
      ],
    }));
    notifications.show({ color: 'green', message: t.funnel.promoted });
    return saved;
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await accountsApi.deleteMember(toDelete.id);
      removeMemberFromBoards(toDelete.id);
      notifications.show({ color: 'green', message: t.funnel.visitorDeleted });
      setToDelete(null);
    } catch {
      notifications.show({ color: 'red', message: t.overview });
    } finally {
      setDeleting(false);
    }
  };

  const handleContactSent = (memberId: number) => {
    setBoards((prev) => {
      const next = { ...prev };
      for (const s of FUNNEL_COLUMNS) {
        next[s] = next[s].map((m) =>
          m.id === memberId ? { ...m, last_contact_at: new Date().toISOString() } : m,
        );
      }
      return next;
    });
  };

  const draggingMember = useMemo(() => {
    const activeBoard = draggingId ? findBoard(draggingId) : null;
    const memberId = draggingId ? dragIdToMemberId(draggingId) : null;
    if (!activeBoard || memberId === null) return null;
    return boards[activeBoard].find((m) => m.id === memberId) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingId, boards]);

  if (loading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (error) {
    return (
      <Center py="xl">
        <Stack align="center" gap="sm">
          <Text c="dimmed">{t.funnel.loadError}</Text>
          <Button variant="light" onClick={load}>
            {t.funnel.retry}
          </Button>
        </Stack>
      </Center>
    );
  }

  const total = FUNNEL_COLUMNS.reduce((acc, s) => acc + boards[s].length, 0);

  return (
    <>
      <Group justify="space-between" mb="sm">
        <Group gap="sm">
          <Text size="sm" c="dimmed">
            {t.funnel.subtitle.replace('{total}', String(total))}
          </Text>
          <Button
            variant="light"
            color="violet"
            leftSection={<IconUserPlus size={16} />}
            onClick={openCreateVisitor}
            data-testid="funnel-add-visitor"
          >
            {t.funnel.addVisitor}
          </Button>
        </Group>
        <Badge variant="light" size="lg">
          <Group gap={6} wrap="nowrap">
            <IconUsers size={14} />
            {total}
          </Group>
        </Badge>
      </Group>
      <ScrollArea type="always" offsetScrollbars style={{ whiteSpace: 'nowrap' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={() => {
            setDraggingId(null);
            setDragStart(null);
          }}
        >
          <Group align="flex-start" gap="md" wrap="nowrap">
            {FUNNEL_COLUMNS.map((stage) => (
              <SortableContext
                key={stage}
                items={boards[stage].map((m) => simpleDragId(m.id))}
                strategy={verticalListSortingStrategy}
              >
                <FunnelColumn
                  id={stage}
                  colorScheme={colorScheme}
                  title={t.funnel[stageToKey(stage)]}
                  color={STAGE_COLORS[stage]}
                  count={boards[stage].length}
                  emptyLabel={isVisitorStage(stage) ? t.funnel.visitorEmpty : t.funnel.empty}
                >
                  {boards[stage].map((member) => (
                    <SortableFunnelCard
                      key={member.id}
                      member={member}
                      stage={stage}
                      color={STAGE_COLORS[stage]}
                      isVisitor={isVisitorStage(stage)}
                      onWhatsApp={(m) => setWaMember(m)}
                      onEdit={isVisitorStage(stage) ? openEditVisitor : undefined}
                      onDelete={isVisitorStage(stage) ? (m) => setToDelete(m) : undefined}
                      onPromote={isVisitorStage(stage) ? openPromote : undefined}
                    />
                  ))}
                </FunnelColumn>
              </SortableContext>
            ))}
          </Group>
          <DragOverlay>
            {draggingMember ? (
              <Card withBorder radius="md" p="xs" shadow="lg">
                <Group gap="xs" wrap="nowrap">
                  <Avatar src={draggingMember.photo || null} radius="xl" size="md" />
                  <Text size="sm" fw={600}>
                    {draggingMember.name}
                  </Text>
                </Group>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      </ScrollArea>

      <VisitorFormModal
        opened={visitorForm.opened}
        onClose={() => setVisitorForm({ opened: false, visitor: null })}
        visitor={visitorForm.visitor}
        onSave={handleVisitorSave}
      />

      <MemberFormModal
        opened={!!pendingPromotion}
        onClose={() => setPendingPromotion(null)}
        member={pendingPromotion?.member ?? null}
        areas={areas}
        churchName={churchName}
        cardConfig={cardConfig}
        churchContact={churchContact}
        onSave={handlePromote}
      />

      <SendWhatsAppModal
        opened={!!waMember}
        onClose={() => setWaMember(null)}
        member={waMember}
        defaultCategory={
          waMember
            ? lifecycleCategoryHint(waMember.lifecycle_stage ?? 'ACTIVE')
            : undefined
        }
        churchName={churchName}
        churchCity={churchCity}
        onSent={handleContactSent}
      />

      <Modal
        opened={!!toDelete}
        onClose={() => setToDelete(null)}
        title={t.funnel.deleteVisitorTitle}
        centered
      >
        <Stack>
          <Text size="sm">{t.funnel.deleteVisitorConfirm}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setToDelete(null)}>
              {t.common.cancel}
            </Button>
            <Button color="red" loading={deleting} onClick={handleDelete}>
              {t.common.delete}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

function stageToKey(stage: string): keyof ReturnType<typeof funnelKeys> {
  switch (stage) {
    case 'VISITOR':
      return 'visitor';
    case 'INTEGRATION':
      return 'integration';
    case 'ACTIVE':
      return 'active';
    case 'ABSENT_CARE':
      return 'absentCare';
    case 'TRANSITION':
      return 'transition';
    case 'INACTIVE':
      return 'inactive';
    default:
      return 'active';
  }
}

type FunnelTranslation = {
  visitor: string;
  integration: string;
  active: string;
  absentCare: string;
  transition: string;
  inactive: string;
};

function funnelKeys(): FunnelTranslation {
  return {
    visitor: 'visitor',
    integration: 'integration',
    active: 'active',
    absentCare: 'absentCare',
    transition: 'transition',
    inactive: 'inactive',
  };
}