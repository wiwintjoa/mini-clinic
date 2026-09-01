import { Alert, Card, Center, Group, Loader, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCalendarEvent, IconCash, IconListNumbers, IconStethoscope, IconUsers } from '@tabler/icons-react';
import { useSession } from '../../app/auth/session-store';
import { AdminDashboardPanels, AdminQuickActions } from './AdminDashboardPanels';
import { useDashboard } from './api';
import { LiveClinicClock } from './LiveClinicClock';

const money = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const metricIcons = [IconUsers, IconCalendarEvent, IconListNumbers, IconStethoscope, IconCash];

export function StaffDashboard() {
  const user = useSession((state) => state.user)!;
  const query = useDashboard();
  if (query.isLoading) return <Center py={80}><Loader/></Center>;
  if (query.isError || !query.data) return <Alert color="red">Unable to load dashboard metrics.</Alert>;
  const data = query.data;
  const isAdmin = user.role === 'ADMIN';
  return <Stack gap="lg"><Group justify="space-between" align="flex-end"><div><Text c="dimmed">Welcome back, {user.fullName}</Text><Title order={2}>{data.title}</Title><Text size="xs" c="dimmed">Metrics refresh automatically every 30 seconds.</Text></div>{isAdmin ? <AdminQuickActions/> : null}</Group>{isAdmin ? <LiveClinicClock/> : null}<SimpleGrid cols={{ base: 1, xs: 2, lg: isAdmin ? 3 : 4 }}>{data.cards.map((card, index) => { const Icon = metricIcons[index % metricIcons.length]; return <Card key={card.label} withBorder p="lg" radius="lg"><Group justify="space-between" align="flex-start" wrap="nowrap"><div><Text size="sm" c="dimmed">{card.label}</Text><Title order={3} mt={4}>{card.format === 'currency' ? money.format(card.value) : card.value}</Title></div><ThemeIcon variant="light" size="lg"><Icon size={20}/></ThemeIcon></Group></Card>; })}</SimpleGrid>{isAdmin ? <AdminDashboardPanels appointments={data.appointments ?? []} queue={data.queue ?? []} alerts={data.alerts ?? []}/> : null}</Stack>;
}
