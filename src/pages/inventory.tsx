import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  FileInput,
  Grid,
  Group,
  Image,
  Loader,
  Modal,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Tooltip,
  useMantineColorScheme,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconArrowRotaryLeft,
  IconBellRinging,
  IconBox,
  IconBuildingWarehouse,
  IconFileText,
  IconMapPin,
  IconPencil,
  IconPlus,
  IconReceipt,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconTruckReturn,
} from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import MobileItemCard from '../components/MobileItemCard';
import { ListPagination, useListPagination } from '../components/ListPagination';
import { accountsApi } from '../api/accounts';
import { useLanguage } from '../i18n';
import { toISO, toSentenceCase, toUpperCamelWords, maskPhone } from '../utils/format';
import type { Loan, MaterialItem, Member, StorageLocation } from '../types';

function formatISODate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function isoToDateLocal(iso: string): Date | null {
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isOpen(loan: Loan): boolean {
  return !loan.returned_at;
}

function isOverdue(loan: Loan): boolean {
  if (!isOpen(loan)) return false;
  const expected = new Date(`${loan.expected_return}T00:00:00`);
  return expected < startOfToday();
}

function isDueToday(loan: Loan): boolean {
  if (!isOpen(loan)) return false;
  const expected = new Date(`${loan.expected_return}T00:00:00`);
  return expected.getTime() === startOfToday().getTime();
}

function ItemsTab() {
  const { t } = useLanguage();
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<MaterialItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [toDelete, setToDelete] = useState<MaterialItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const photoPreview = useMemo(() => {
    if (photoFile) return URL.createObjectURL(photoFile);
    return null;
  }, [photoFile]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([accountsApi.materials(), accountsApi.storageLocations()])
      .then(([mats, locs]) => {
        setItems(mats);
        setLocations(locs);
      })
      .catch(() => {
        setItems([]);
        setLocations([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const form = useForm<{ name: string; description: string; location: string | null }>({
    initialValues: { name: '', description: '', location: null },
    validate: {
      name: (v) => (v.trim().length ? null : t.inventoryPage.itemName),
      location: (v) => (v ? null : t.inventoryPage.locationRequired),
    },
  });

  const openCreate = () => {
    setEditing(null);
    setPhotoFile(null);
    setManualFile(null);
    form.setValues({ name: '', description: '', location: null });
    form.resetDirty();
    setOpened(true);
  };

  const openEdit = (item: MaterialItem) => {
    setEditing(item);
    setPhotoFile(null);
    setManualFile(null);
    form.setValues({
      name: item.name,
      description: item.description || '',
      location: item.location != null ? String(item.location) : null,
    });
    form.resetDirty();
    setOpened(true);
  };

  const handleSave = async () => {
    const valid = form.validate();
    if (valid.hasErrors) return;
    setSaving(true);
    const payload = {
      name: toUpperCamelWords(form.values.name),
      description: toSentenceCase(form.values.description),
      location: form.values.location ? Number(form.values.location) : null,
      photo: photoFile,
      manual: manualFile,
    };
    try {
      if (editing) {
        await accountsApi.updateMaterial(editing.id, payload);
      } else {
        await accountsApi.createMaterial(payload);
      }
      notifications.show({ color: 'green', message: t.inventoryPage.itemSaved });
      setOpened(false);
      load();
    } catch (err: any) {
      const data = err?.response?.data;
      const msg =
        data?.name?.[0] || data?.location?.[0] || data?.detail || t.overview;
      notifications.show({ color: 'red', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await accountsApi.deleteMaterial(toDelete.id);
      notifications.show({ color: 'green', message: t.inventoryPage.itemDeleted });
      setToDelete(null);
      load();
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.detail || t.inventoryPage.deleteBlocked;
      notifications.show({ color: 'red', message: msg });
    } finally {
      setDeleting(false);
    }
  };

  const locationOptions = locations.map((l) => ({
    value: String(l.id),
    label: l.name,
  }));

  const filtered = items.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q) ||
      (item.location_name || '').toLowerCase().includes(q)
    );
  });

  const itemPagination = useListPagination(filtered);

  const itemActions = (item: MaterialItem) => (
    <Group gap={4} justify="flex-end" wrap="nowrap">
      {item.manual && (
        <Button
          component="a"
          href={item.manual}
          target="_blank"
          rel="noreferrer"
          size="xs"
          variant="light"
        >
          {t.inventoryPage.itemManual}
        </Button>
      )}
      <Button
        size="xs"
        variant="subtle"
        leftSection={<IconPencil size={14} />}
        onClick={() => openEdit(item)}
        data-testid={`item-edit-${item.id}`}
      >
        {t.common.edit}
      </Button>
      <Button
        size="xs"
        variant="subtle"
        color="red"
        leftSection={<IconTrash size={14} />}
        onClick={() => setToDelete(item)}
        data-testid={`item-delete-${item.id}`}
      >
        {t.common.delete}
      </Button>
    </Group>
  );

  const rows = itemPagination.pageItems.map((item) => {
    const loan = item.current_loan;
    return (
      <Table.Tr key={item.id} data-testid={`item-row-${item.id}`}>
        <Table.Td>
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon size="sm" radius="xl" color="teal" variant="light">
              <IconTruckReturn size={14} />
            </ThemeIcon>
            <Text fw={600}>{item.name}</Text>
            {item.photo && (
              <Image
                src={item.photo}
                alt={item.name}
                h={34}
                w={44}
                fit="cover"
                radius="xs"
              />
            )}
            {item.manual && (
              <Button
                component="a"
                href={item.manual}
                target="_blank"
                rel="noreferrer"
                size="xs"
                variant="light"
              >
                {t.inventoryPage.itemManual}
              </Button>
            )}
          </Group>
        </Table.Td>
        <Table.Td>
          <Text size="sm" lineClamp={2}>
            {item.description || '—'}
          </Text>
        </Table.Td>
        <Table.Td>{item.location_name || '—'}</Table.Td>
        <Table.Td>
          {loan ? (
            <Badge size="sm" variant="light" color="red">
              {t.inventoryPage.loanedUntil
                .replace('{date}', formatISODate(loan.expected_return))
                .replace('{person}', loan.borrower_display)}
            </Badge>
          ) : (
            <Badge size="sm" variant="light" color="green">
              {t.inventoryPage.available}
            </Badge>
          )}
        </Table.Td>
        <Table.Td style={{ textAlign: 'right' }}>
          <Group gap={4} justify="flex-end" wrap="nowrap">
            <Button
              size="xs"
              variant="subtle"
              leftSection={<IconPencil size={14} />}
              onClick={() => openEdit(item)}
              data-testid={`item-edit-${item.id}`}
            >
              {t.common.edit}
            </Button>
            <Button
              size="xs"
              variant="subtle"
              color="red"
              leftSection={<IconTrash size={14} />}
              onClick={() => setToDelete(item)}
              data-testid={`item-delete-${item.id}`}
            >
              {t.common.delete}
            </Button>
          </Group>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <>
      <Group gap="xs" mb="md" justify="space-between">
        <TextInput
          placeholder={t.inventoryPage.itemsSearchPlaceholder}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          data-testid="items-search"
          style={{ maxWidth: 320, flex: 1 }}
        />
        <Group gap="xs">
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            onClick={load}
            data-testid="items-refresh"
          >
            {t.common.filter}
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={openCreate}
            data-testid="items-new"
          >
            {t.inventoryPage.addItem}
          </Button>
        </Group>
      </Group>
      <Card withBorder shadow="sm" p={0}>
        {loading ? (
          <Center h={200}>
            <Loader />
          </Center>
        ) : filtered.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <ThemeIcon size={48} radius="xl" color="teal" variant="light">
              <IconBuildingWarehouse size={24} />
            </ThemeIcon>
            <Text c="dimmed">{t.inventoryPage.itemsEmpty}</Text>
          </Stack>
        ) : (
          <>
            <Box visibleFrom="lg">
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t.inventoryPage.itemName}</Table.Th>
                    <Table.Th>{t.inventoryPage.itemDescription}</Table.Th>
                    <Table.Th>{t.inventoryPage.itemLocation}</Table.Th>
                    <Table.Th>{t.inventoryPage.itemStatus}</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>{t.common.actions}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{rows}</Table.Tbody>
              </Table>
            </Box>
            <Stack hiddenFrom="lg" gap="xs" p="sm">
              {itemPagination.pageItems.map((item) => {
                const loan = item.current_loan;
                return (
                  <MobileItemCard
                    key={item.id}
                    testId={`item-mobile-${item.id}`}
                    media={
                      item.photo ? (
                        <Image
                          src={item.photo}
                          alt={item.name}
                          h={48}
                          w={64}
                          fit="cover"
                          radius="md"
                        />
                      ) : (
                        <ThemeIcon color="teal" variant="light" radius="md" size="lg">
                          <IconBox size={20} />
                        </ThemeIcon>
                      )
                    }
                    actions={itemActions(item)}
                  >
                    <Stack gap={4}>
                      <Text fw={600} truncate>
                        {item.name}
                      </Text>
                      <Text size="sm" c="dimmed" truncate>
                        {item.description || '—'}
                      </Text>
                      <Group gap={4} wrap="nowrap" align="center">
                        <IconMapPin size={14} style={{ flexShrink: 0 }} />
                        <Text size="sm" c="dimmed" truncate style={{ flex: 1, minWidth: 0 }}>
                          {item.location_name || '—'}
                        </Text>
                      </Group>
                      {loan ? (
                        <Badge
                          size="sm"
                          variant="light"
                          color="red"
                          style={{ width: 'fit-content' }}
                        >
                          {t.inventoryPage.loanedUntil
                            .replace('{date}', formatISODate(loan.expected_return))
                            .replace('{person}', loan.borrower_display)}
                        </Badge>
                      ) : (
                        <Badge
                          size="sm"
                          variant="light"
                          color="green"
                          style={{ width: 'fit-content' }}
                        >
                          {t.inventoryPage.available}
                        </Badge>
                      )}
                    </Stack>
                  </MobileItemCard>
                );
              })}
            </Stack>
          </>
        )}
      </Card>

      <ListPagination
        page={itemPagination.page}
        onPageChange={itemPagination.setPage}
        pageSize={itemPagination.pageSize}
        onPageSizeChange={itemPagination.changePageSize}
        total={itemPagination.total}
        totalPages={itemPagination.totalPages}
        rangeStart={itemPagination.rangeStart}
        rangeEnd={itemPagination.rangeEnd}
        testId="inventory-items-pagination"
      />

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={editing ? t.inventoryPage.editItem : t.inventoryPage.addItem}
        centered
      >
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack gap="md">
            <TextInput
              label={t.inventoryPage.itemName}
              required
              data-testid="item-name"
              {...form.getInputProps('name')}
            />
            <Textarea
              label={t.inventoryPage.itemDescription}
              minRows={2}
              data-testid="item-description"
              {...form.getInputProps('description')}
            />
            <Select
              label={t.inventoryPage.itemLocation}
              placeholder={t.inventoryPage.itemLocation}
              required
              data={locationOptions}
              data-testid="item-location"
              {...form.getInputProps('location')}
            />
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <FileInput
                  label={t.inventoryPage.itemPhoto}
                  placeholder={t.inventoryPage.itemPhoto}
                  accept="image/*"
                  clearable
                  value={photoFile}
                  onChange={setPhotoFile}
                  data-testid="item-photo"
                />
                {(photoPreview || editing?.photo) && (
                  <Box mt="xs">
                    <Image
                      src={photoPreview || editing?.photo || ''}
                      alt={form.values.name || t.inventoryPage.itemPhoto}
                      h={96}
                      w={96}
                      fit="cover"
                      radius="sm"
                      style={{ objectFit: 'cover' }}
                    />
                  </Box>
                )}
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <FileInput
                  label={t.inventoryPage.itemManual}
                  placeholder={t.inventoryPage.itemManual}
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  clearable
                  value={manualFile}
                  onChange={setManualFile}
                  data-testid="item-manual"
                />
                {manualFile ? (
                  <Text size="xs" c="dimmed" mt="xs" truncate>
                    {manualFile.name}
                  </Text>
                ) : editing?.manual ? (
                  <Button
                    component="a"
                    href={editing.manual}
                    target="_blank"
                    rel="noreferrer"
                    size="xs"
                    variant="light"
                    mt="xs"
                    leftSection={<IconFileText size={14} />}
                  >
                    {t.inventoryPage.itemManual}
                  </Button>
                ) : null}
              </Grid.Col>
            </Grid>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setOpened(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" loading={saving} data-testid="item-submit">
                {t.common.save}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={!!toDelete}
        onClose={() => setToDelete(null)}
        title={t.inventoryPage.itemDeleteTitle}
        centered
      >
        <Stack gap="md">
          <Text>
            {t.inventoryPage.itemDeleteBody.replace('{name}', toDelete?.name || '')}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setToDelete(null)}>
              {t.common.cancel}
            </Button>
            <Button
              color="red"
              loading={deleting}
              onClick={handleDelete}
              data-testid="item-delete-confirm"
            >
              {t.common.delete}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

function LocationsTab() {
  const { t } = useLanguage();
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<StorageLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<StorageLocation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const locationPagination = useListPagination(locations);

  const load = useCallback(() => {
    setLoading(true);
    accountsApi
      .storageLocations()
      .then(setLocations)
      .catch(() => setLocations([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const form = useForm<{ name: string }>({
    initialValues: { name: '' },
    validate: {
      name: (v) => (v.trim().length ? null : t.inventoryPage.locationName),
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.setValues({ name: '' });
    form.resetDirty();
    setOpened(true);
  };

  const openEdit = (loc: StorageLocation) => {
    setEditing(loc);
    form.setValues({ name: loc.name });
    form.resetDirty();
    setOpened(true);
  };

  const handleSave = async () => {
    const valid = form.validate();
    if (valid.hasErrors) return;
    setSaving(true);
    const payload = { name: toUpperCamelWords(form.values.name) };
    try {
      if (editing) {
        await accountsApi.updateStorageLocation(editing.id, payload);
      } else {
        await accountsApi.createStorageLocation(payload);
      }
      notifications.show({ color: 'green', message: t.inventoryPage.locationSaved });
      setOpened(false);
      load();
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.name?.[0] || data?.detail || t.overview;
      notifications.show({ color: 'red', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await accountsApi.deleteStorageLocation(toDelete.id);
      notifications.show({ color: 'green', message: t.inventoryPage.locationDeleted });
      setToDelete(null);
      load();
    } catch (err: any) {
      const data = err?.response?.data;
      notifications.show({ color: 'red', message: data?.detail || t.overview });
    } finally {
      setDeleting(false);
    }
  };

  const locationActions = (loc: StorageLocation) => (
    <Group gap={4} justify="flex-end">
      <Button
        size="xs"
        variant="subtle"
        leftSection={<IconPencil size={14} />}
        onClick={() => openEdit(loc)}
        data-testid={`location-edit-${loc.id}`}
      >
        {t.common.edit}
      </Button>
      <Button
        size="xs"
        variant="subtle"
        color="red"
        leftSection={<IconTrash size={14} />}
        onClick={() => setToDelete(loc)}
        data-testid={`location-delete-${loc.id}`}
      >
        {t.common.delete}
      </Button>
    </Group>
  );

  const rows = locationPagination.pageItems.map((loc) => (
    <Table.Tr key={loc.id} data-testid={`location-row-${loc.id}`}>
      <Table.Td>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="sm" radius="xl" color="teal" variant="light">
            <IconBuildingWarehouse size={14} />
          </ThemeIcon>
          <Text fw={600}>{loc.name}</Text>
        </Group>
      </Table.Td>
      <Table.Td style={{ textAlign: 'right' }}>
        {locationActions(loc)}
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Group gap="xs" mb="md" justify="flex-end">
        <Button
          variant="default"
          leftSection={<IconRefresh size={16} />}
          onClick={load}
          data-testid="locations-refresh"
        >
          {t.common.filter}
        </Button>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={openCreate}
          data-testid="locations-new"
        >
          {t.inventoryPage.addLocation}
        </Button>
      </Group>
      <Card withBorder shadow="sm" p={0}>
        {loading ? (
          <Center h={200}>
            <Loader />
          </Center>
        ) : locations.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <ThemeIcon size={48} radius="xl" color="teal" variant="light">
              <IconBuildingWarehouse size={24} />
            </ThemeIcon>
            <Text c="dimmed">{t.inventoryPage.locationsEmpty}</Text>
          </Stack>
        ) : (
          <>
            <Box visibleFrom="lg">
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t.inventoryPage.locationName}</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>{t.common.actions}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{rows}</Table.Tbody>
              </Table>
            </Box>
            <Stack hiddenFrom="lg" gap="xs" p="sm">
              {locationPagination.pageItems.map((loc) => (
                <MobileItemCard
                  key={loc.id}
                  testId={`location-mobile-${loc.id}`}
                  media={
                    <ThemeIcon color="teal" variant="light" radius="md" size="lg">
                      <IconBuildingWarehouse size={20} />
                    </ThemeIcon>
                  }
                  actions={locationActions(loc)}
                >
                  <Stack gap={4}>
                    <Text fw={600} truncate>
                      {loc.name}
                    </Text>
                  </Stack>
                </MobileItemCard>
              ))}
            </Stack>
          </>
        )}
      </Card>

      <ListPagination
        page={locationPagination.page}
        onPageChange={locationPagination.setPage}
        pageSize={locationPagination.pageSize}
        onPageSizeChange={locationPagination.changePageSize}
        total={locationPagination.total}
        totalPages={locationPagination.totalPages}
        rangeStart={locationPagination.rangeStart}
        rangeEnd={locationPagination.rangeEnd}
        testId="inventory-locations-pagination"
      />

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={editing ? t.inventoryPage.editLocation : t.inventoryPage.addLocation}
        centered
      >
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack gap="md">
            <TextInput
              label={t.inventoryPage.locationName}
              required
              data-testid="location-name"
              {...form.getInputProps('name')}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setOpened(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" loading={saving} data-testid="location-submit">
                {t.common.save}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={!!toDelete}
        onClose={() => setToDelete(null)}
        title={t.inventoryPage.locationDeleteTitle}
        centered
      >
        <Stack gap="md">
          <Text>
            {t.inventoryPage.locationDeleteBody.replace('{name}', toDelete?.name || '')}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setToDelete(null)}>
              {t.common.cancel}
            </Button>
            <Button
              color="red"
              loading={deleting}
              onClick={handleDelete}
              data-testid="location-delete-confirm"
            >
              {t.common.delete}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

interface LoanFormValues {
  item: string | null;
  member: string | null;
  borrower_name: string;
  borrower_phone: string;
  borrowed_at: Date | null;
  expected_return: Date | null;
  notes: string;
}

function LoansTab() {
  const { t } = useLanguage();
  const { colorScheme } = useMantineColorScheme();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [saving, setSaving] = useState(false);
  const [toReturn, setToReturn] = useState<Loan | null>(null);
  const [returning, setReturning] = useState(false);
  const [toDelete, setToDelete] = useState<Loan | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([accountsApi.loans(), accountsApi.materials()])
      .then(([ln, mat]) => {
        setLoans(ln);
        setItems(mat);
      })
      .catch(() => {
        setLoans([]);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    accountsApi.members?.().then(setMembers).catch(() => setMembers([]));
  }, [load]);

  const form = useForm<LoanFormValues>({
    initialValues: {
      item: null,
      member: null,
      borrower_name: '',
      borrower_phone: '',
      borrowed_at: null,
      expected_return: null,
      notes: '',
    },
    validate: {
      item: (v) => (v ? null : t.inventoryPage.loanItem),
      borrowed_at: (v) => (v ? null : t.inventoryPage.borrowedAt),
      expected_return: (v, values) =>
        v == null
          ? t.inventoryPage.expectedReturn
          : values.borrowed_at && v < values.borrowed_at
            ? t.inventoryPage.expectedReturn
            : null,
      borrower_name: (v, values) =>
        !values.member && !v.trim() ? t.inventoryPage.loanBorrower : null,
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.setValues({
      item: null,
      member: null,
      borrower_name: '',
      borrower_phone: '',
      borrowed_at: startOfToday(),
      expected_return: null,
      notes: '',
    });
    form.resetDirty();
    setOpened(true);
  };

  const openEdit = (loan: Loan) => {
    setEditing(loan);
    form.setValues({
      item: String(loan.item),
      member: loan.member != null ? String(loan.member) : null,
      borrower_name: loan.borrower_name || '',
      borrower_phone: loan.borrower_phone || '',
      borrowed_at: new Date(`${loan.borrowed_at}T00:00:00`),
      expected_return: new Date(`${loan.expected_return}T00:00:00`),
      notes: loan.notes || '',
    });
    form.resetDirty();
    setOpened(true);
  };

  const handleSave = async () => {
    const valid = form.validate();
    if (valid.hasErrors) return;
    setSaving(true);
    const payload = {
      item: Number(form.values.item),
      member: form.values.member ? Number(form.values.member) : null,
      borrower_name: form.values.member
        ? ''
        : toUpperCamelWords(form.values.borrower_name),
      borrower_phone: form.values.member ? '' : form.values.borrower_phone,
      borrowed_at: toISO(form.values.borrowed_at) || '',
      expected_return: toISO(form.values.expected_return) || '',
      notes: toSentenceCase(form.values.notes),
    };
    try {
      if (editing) {
        await accountsApi.updateLoan(editing.id, payload);
      } else {
        await accountsApi.createLoan(payload);
      }
      notifications.show({ color: 'green', message: t.inventoryPage.loanSaved });
      setOpened(false);
      load();
    } catch (err: any) {
      const data = err?.response?.data;
      const msg =
        data?.item?.[0] || data?.borrower_name?.[0] || data?.detail || t.overview;
      notifications.show({ color: 'red', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async () => {
    if (!toReturn) return;
    setReturning(true);
    try {
      await accountsApi.returnLoan(toReturn.id);
      notifications.show({ color: 'green', message: t.inventoryPage.loanSaved });
      setToReturn(null);
      load();
    } catch (err: any) {
      const data = err?.response?.data;
      notifications.show({ color: 'red', message: data?.detail || t.overview });
    } finally {
      setReturning(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await accountsApi.deleteLoan(toDelete.id);
      notifications.show({ color: 'green', message: t.inventoryPage.loanDeleted });
      setToDelete(null);
      load();
    } catch (err: any) {
      const data = err?.response?.data;
      notifications.show({ color: 'red', message: data?.detail || t.overview });
    } finally {
      setDeleting(false);
    }
  };

  const memberOptions = members.map((m) => ({
    value: String(m.id),
    label: m.name,
  }));

  const itemOptions = useMemo(() => {
    const base = items
      .filter((item) => !item.current_loan)
      .map((item) => ({
        value: String(item.id),
        label: item.location_name
          ? `${item.name} — ${item.location_name}`
          : item.name,
      }));
    const current = editing?.item;
    if (current != null && !base.some((o) => Number(o.value) === current)) {
      const item = items.find((it) => it.id === current);
      if (item) {
        base.push({
          value: String(item.id),
          label: item.location_name
            ? `${item.name} — ${item.location_name}`
            : item.name,
        });
      }
    }
    return base;
  }, [items, editing]);

  const visibleLoans = useMemo(() => {
    const list = [...loans];
    if (filter === 'open') return list.filter(isOpen);
    if (filter === 'overdue') return list.filter(isOverdue);
    if (filter === 'returned') return list.filter((l) => !isOpen(l));
    return list;
  }, [loans, filter]);

  const sortedLoans = useMemo(() => {
    const open = visibleLoans
      .filter(isOpen)
      .sort((a, b) => a.expected_return.localeCompare(b.expected_return));
    const returned = visibleLoans
      .filter((l) => !isOpen(l))
      .sort((a, b) => (b.returned_at || '').localeCompare(a.returned_at || ''));
    return [...open, ...returned];
  }, [visibleLoans]);

  const loanPagination = useListPagination(sortedLoans);

  const loanWhatsApp = (loan: Loan, kind: 'receipt' | 'charge'): string | null => {
    if (!loan.contact_phone) return null;
    const msg =
      kind === 'receipt'
        ? t.inventoryPage.loanWhatsReceiptMsg
            .replace('{name}', loan.borrower_display)
            .replace('{item}', loan.item_name)
        : t.inventoryPage.loanWhatsChargeMsg
            .replace('{name}', loan.borrower_display)
            .replace('{item}', loan.item_name)
            .replace('{date}', formatISODate(loan.expected_return));
    const phone = loan.contact_phone.replace(/\D/g, '');
    return `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
  };

  const loanWhatsAppButtons = (loan: Loan) => {
    const receipt = loanWhatsApp(loan, 'receipt');
    const charge = loanWhatsApp(loan, 'charge');
    if (!receipt && !charge) return null;
    return (
      <Group gap={2} mt={2} wrap="nowrap">
        {receipt ? (
          <Tooltip label={t.inventoryPage.loanWhatsReceipt}>
            <ActionIcon
              component="a"
              href={receipt}
              target="_blank"
              rel="noopener noreferrer"
              variant="light"
              color="green"
              size="sm"
              data-testid={`loan-receipt-${loan.id}`}
            >
              <IconReceipt size={14} />
            </ActionIcon>
          </Tooltip>
        ) : null}
        {charge ? (
          <Tooltip label={t.inventoryPage.loanWhatsCharge}>
            <ActionIcon
              component="a"
              href={charge}
              target="_blank"
              rel="noopener noreferrer"
              variant="light"
              color="orange"
              size="sm"
              data-testid={`loan-charge-${loan.id}`}
            >
              <IconBellRinging size={14} />
            </ActionIcon>
          </Tooltip>
        ) : null}
      </Group>
    );
  };

  const loanActions = (loan: Loan) => {
    const open = isOpen(loan);
    return (
      <Group gap={4} justify="flex-end" wrap="nowrap">
        {open && (
          <>
            <Button
              size="xs"
              variant="subtle"
              color="green"
              leftSection={<IconArrowRotaryLeft size={14} />}
              onClick={() => setToReturn(loan)}
              data-testid={`loan-return-${loan.id}`}
            >
              {t.inventoryPage.markReturn}
            </Button>
            <Button
              size="xs"
              variant="subtle"
              leftSection={<IconPencil size={14} />}
              onClick={() => openEdit(loan)}
              data-testid={`loan-edit-${loan.id}`}
            >
              {t.common.edit}
            </Button>
          </>
        )}
        <Button
          size="xs"
          variant="subtle"
          color="red"
          leftSection={<IconTrash size={14} />}
          onClick={() => setToDelete(loan)}
          data-testid={`loan-delete-${loan.id}`}
        >
          {t.common.delete}
        </Button>
      </Group>
    );
  };

  const loanRows = loanPagination.pageItems.map((loan) => {
    const open = isOpen(loan);
    const overdue = isOverdue(loan);
    const dueToday = isDueToday(loan);
    const rowBackground = open
      ? colorScheme === 'dark'
        ? `rgba(224, 49, 49, ${overdue ? 0.16 : 0.08})`
        : overdue
          ? 'var(--mantine-color-red-1)'
          : 'var(--mantine-color-red-0)'
      : undefined;
    return (
      <Table.Tr
        key={loan.id}
        data-testid={`loan-row-${loan.id}`}
        style={{ background: rowBackground }}
      >
        <Table.Td>
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon size="sm" radius="xl" color={overdue ? 'red' : 'teal'} variant="light">
              <IconTruckReturn size={14} />
            </ThemeIcon>
            <div>
              <Text fw={600} c={open ? 'red' : undefined}>
                {loan.item_name}
              </Text>
              {loan.notes && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {loan.notes}
                </Text>
              )}
            </div>
          </Group>
        </Table.Td>
        <Table.Td>
          <Text fw={500} c={open ? 'red' : undefined}>
            {loan.borrower_display}
          </Text>
          {loan.member_name && (
            <Text size="xs" c="dimmed">
              {loan.member_name}
            </Text>
          )}
          {loanWhatsAppButtons(loan)}
        </Table.Td>
        <Table.Td>{formatISODate(loan.borrowed_at)}</Table.Td>
        <Table.Td>
          <Text fw={500} c={overdue ? 'red' : open ? 'orange' : undefined}>
            {formatISODate(loan.expected_return)}
          </Text>
        </Table.Td>
        <Table.Td>
          {open ? (
            overdue ? (
              <Badge size="sm" variant="filled" color="red">
                {t.inventoryPage.overdueSince.replace(
                  '{date}',
                  formatISODate(loan.expected_return),
                )}
              </Badge>
            ) : dueToday ? (
              <Badge size="sm" variant="filled" color="orange">
                {t.inventoryPage.dueToday}
              </Badge>
            ) : (
              <Badge size="sm" variant="light" color="red">
                {t.inventoryPage.statusActive}
              </Badge>
            )
          ) : (
            <Badge size="sm" variant="light" color="green">
              {t.inventoryPage.statusReturned}
            </Badge>
          )}
        </Table.Td>
        <Table.Td style={{ textAlign: 'right' }}>{loanActions(loan)}</Table.Td>
      </Table.Tr>
    );
  });

  return (
    <>
      <Stack gap="xs" mb="md">
        <Group gap="xs" justify="space-between">
          <Grid w="100%" align="flex-end">
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Select
                label={t.inventoryPage.filterStatus}
                value={filter}
                onChange={(v) => setFilter(v || 'all')}
                data={[
                  { value: 'all', label: t.inventoryPage.filterAll },
                  { value: 'open', label: t.inventoryPage.filterOpen },
                  { value: 'overdue', label: t.inventoryPage.filterOverdue },
                  { value: 'returned', label: t.inventoryPage.filterReturned },
                ]}
                data-testid="loan-filter"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Group gap="xs" justify="flex-end">
                <Button
                  variant="default"
                  leftSection={<IconRefresh size={16} />}
                  onClick={load}
                  data-testid="loans-refresh"
                >
                  {t.common.filter}
                </Button>
              </Group>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Group justify="flex-end">
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={openCreate}
                  data-testid="loans-new"
                >
                  {t.inventoryPage.addLoan}
                </Button>
              </Group>
            </Grid.Col>
          </Grid>
        </Group>
        <Text size="xs" c="dimmed">
          {t.inventoryPage.noteReturnHint}
        </Text>
      </Stack>

      <Card withBorder shadow="sm" p={0}>
        {loading ? (
          <Center h={200}>
            <Loader />
          </Center>
        ) : loanRows.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <ThemeIcon size={48} radius="xl" color="teal" variant="light">
              <IconTruckReturn size={24} />
            </ThemeIcon>
            <Text c="dimmed">{t.inventoryPage.loansEmpty}</Text>
          </Stack>
        ) : (
          <>
            <Box visibleFrom="lg">
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t.inventoryPage.loanItem}</Table.Th>
                    <Table.Th>{t.inventoryPage.loanBorrower}</Table.Th>
                    <Table.Th>{t.inventoryPage.borrowedAt}</Table.Th>
                    <Table.Th>{t.inventoryPage.expectedReturn}</Table.Th>
                    <Table.Th>{t.inventoryPage.itemStatus}</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>{t.common.actions}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{loanRows}</Table.Tbody>
              </Table>
            </Box>
            <Stack hiddenFrom="lg" gap="xs" p="sm">
              {loanPagination.pageItems.map((loan) => {
                const open = isOpen(loan);
                const overdue = isOverdue(loan);
                const dueToday = isDueToday(loan);
                return (
                  <MobileItemCard
                    key={loan.id}
                    testId={`loan-mobile-${loan.id}`}
                    media={
                      <ThemeIcon
                        color={overdue ? 'red' : 'teal'}
                        variant="light"
                        radius="md"
                        size="lg"
                      >
                        <IconTruckReturn size={20} />
                      </ThemeIcon>
                    }
                    actions={loanActions(loan)}
                  >
                    <Stack gap={4}>
                      <Text fw={600} truncate c={open ? 'red' : undefined}>
                        {loan.item_name}
                      </Text>
                      {loan.notes && (
                        <Text size="sm" c="dimmed" truncate>
                          {loan.notes}
                        </Text>
                      )}
                      <Text size="sm" fw={500} c={open ? 'red' : undefined} truncate>
                        {loan.borrower_display}
                      </Text>
{loan.member_name && (
                          <Text size="xs" c="dimmed" truncate>
                            {loan.member_name}
                          </Text>
                        )}
                        {loanWhatsAppButtons(loan)}
                      <Text size="xs" c="dimmed">
                        {t.inventoryPage.borrowedAt}: {formatISODate(loan.borrowed_at)}
                      </Text>
                      <Text
                        size="xs"
                        fw={500}
                        c={overdue ? 'red' : open ? 'orange' : undefined}
                      >
                        {t.inventoryPage.expectedReturn}: {formatISODate(loan.expected_return)}
                      </Text>
                      {open ? (
                        overdue ? (
                          <Badge
                            size="sm"
                            variant="filled"
                            color="red"
                            style={{ width: 'fit-content' }}
                          >
                            {t.inventoryPage.overdueSince.replace(
                              '{date}',
                              formatISODate(loan.expected_return),
                            )}
                          </Badge>
                        ) : dueToday ? (
                          <Badge
                            size="sm"
                            variant="filled"
                            color="orange"
                            style={{ width: 'fit-content' }}
                          >
                            {t.inventoryPage.dueToday}
                          </Badge>
                        ) : (
                          <Badge
                            size="sm"
                            variant="light"
                            color="red"
                            style={{ width: 'fit-content' }}
                          >
                            {t.inventoryPage.statusActive}
                          </Badge>
                        )
                      ) : (
                        <Badge
                          size="sm"
                          variant="light"
                          color="green"
                          style={{ width: 'fit-content' }}
                        >
                          {t.inventoryPage.statusReturned}
                        </Badge>
                      )}
                    </Stack>
                  </MobileItemCard>
                );
              })}
            </Stack>
          </>
        )}
      </Card>

      <ListPagination
        page={loanPagination.page}
        onPageChange={loanPagination.setPage}
        pageSize={loanPagination.pageSize}
        onPageSizeChange={loanPagination.changePageSize}
        total={loanPagination.total}
        totalPages={loanPagination.totalPages}
        rangeStart={loanPagination.rangeStart}
        rangeEnd={loanPagination.rangeEnd}
        testId="inventory-loans-pagination"
      />

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={editing ? t.inventoryPage.editLoan : t.inventoryPage.addLoan}
        centered
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack gap="md">
            <Select
              label={t.inventoryPage.loanItem}
              placeholder={t.inventoryPage.loanItemPlaceholder}
              required
              data={itemOptions}
              searchable
              data-testid="loan-item"
              {...form.getInputProps('item')}
            />
            <Text size="xs" c="dimmed">
              {t.inventoryPage.onlyAvailableInfo}
            </Text>
            <Select
              label={t.inventoryPage.loanMember}
              placeholder={t.inventoryPage.loanMember}
              clearable
              searchable
              data={memberOptions}
              data-testid="loan-member"
              {...form.getInputProps('member')}
            />
            <TextInput
              label={t.inventoryPage.loanBorrowerName}
              placeholder={t.inventoryPage.loanBorrowerName}
              data-testid="loan-borrower-name"
              {...form.getInputProps('borrower_name')}
            />
            <TextInput
              label={t.inventoryPage.loanBorrowerPhone}
              placeholder="(11) 99999-9999"
              disabled={!!form.values.member}
              data-testid="loan-borrower-phone"
              value={form.values.borrower_phone}
              onChange={(e) =>
                form.setFieldValue('borrower_phone', maskPhone(e.currentTarget.value))
              }
            />
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <DateInput
                  label={t.inventoryPage.borrowedAt}
                  valueFormat="DD/MM/YYYY"
                  clearable
                  data-testid="loan-borrowed-at"
                  {...form.getInputProps('borrowed_at')}
                  onChange={(v) =>
                    form.setFieldValue('borrowed_at', v ? isoToDateLocal(v) : null)
                  }
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <DateInput
                  label={t.inventoryPage.expectedReturn}
                  valueFormat="DD/MM/YYYY"
                  clearable
                  required
                  data-testid="loan-expected-return"
                  {...form.getInputProps('expected_return')}
                  onChange={(v) =>
                    form.setFieldValue('expected_return', v ? isoToDateLocal(v) : null)
                  }
                />
              </Grid.Col>
            </Grid>
            <Textarea
              label={t.inventoryPage.loanNotes}
              minRows={2}
              data-testid="loan-notes"
              {...form.getInputProps('notes')}
            />
            <Text size="xs" c="dimmed">
              {t.inventoryPage.noteReturnHint}
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setOpened(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" loading={saving} data-testid="loan-submit">
                {t.common.save}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={!!toReturn}
        onClose={() => setToReturn(null)}
        title={t.inventoryPage.returnTitle}
        centered
      >
        <Stack gap="md">
          <Text>
            {t.inventoryPage.returnBody.replace(
              '{item}',
              toReturn?.item_name || '',
            )}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setToReturn(null)}>
              {t.common.cancel}
            </Button>
            <Button
              color="green"
              loading={returning}
              onClick={handleReturn}
              data-testid="loan-return-confirm"
            >
              {t.inventoryPage.markReturn}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={!!toDelete}
        onClose={() => setToDelete(null)}
        title={t.common.deleteTitle}
        centered
      >
        <Stack gap="md">
          <Text>{t.common.deleteConfirm}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setToDelete(null)}>
              {t.common.cancel}
            </Button>
            <Button
              color="red"
              loading={deleting}
              onClick={handleDelete}
              data-testid="loan-delete-confirm"
            >
              {t.common.delete}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

const VALID_INVENTORY_TABS = ['loans', 'locations', 'items'];

export default function InventoryPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [tab, setTab] = useState<string | null>('loans');

  useEffect(() => {
    const q = router.query.tab;
    if (typeof q === 'string' && VALID_INVENTORY_TABS.includes(q)) {
      setTab(q);
    }
  }, [router.query.tab]);

  const handleTabChange = (value: string | null) => {
    setTab(value);
    if (value) {
      router.push(
        { pathname: router.pathname, query: { ...router.query, tab: value } },
        undefined,
        { shallow: true }
      );
    }
  };

  return (
    <AuthGuard roles={['PASTOR', 'SECRETARIA', 'TESOUREIRO']}>
      <Layout>
        <PageHeader title={t.inventoryPage.title} description={t.inventoryPage.subtitle}>
          <Tabs value={tab} onChange={handleTabChange} variant="default">
            <Tabs.List>
              <Tabs.Tab
                value="loans"
                data-testid="tab-loans"
                leftSection={<IconTruckReturn size={16} />}
              >
                {t.inventoryPage.loansTab}
              </Tabs.Tab>
              <Tabs.Tab
                value="locations"
                data-testid="tab-locations"
                leftSection={<IconBuildingWarehouse size={16} />}
              >
                {t.inventoryPage.locationsTab}
              </Tabs.Tab>
              <Tabs.Tab
                value="items"
                data-testid="tab-items"
                leftSection={<IconBox size={16} />}
              >
                {t.inventoryPage.itemsTab}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </PageHeader>

        {tab === 'items' ? (
          <ItemsTab />
        ) : tab === 'locations' ? (
          <LocationsTab />
        ) : (
          <LoansTab />
        )}
      </Layout>
    </AuthGuard>
  );
}