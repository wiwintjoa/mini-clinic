import { Badge, Button, Card, Grid, Group, Paper, SimpleGrid, Stack, Table, Text, ThemeIcon, Title } from '@mantine/core';
import { IconAlertTriangle, IconCalendarEvent, IconCash, IconChevronRight, IconListNumbers, IconPackage } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import type { DashboardAlert, DashboardAppointment, DashboardQueueItem } from './api';

const statusColor = (status: string) => status === 'COMPLETED' ? 'teal' : status === 'IN_PROGRESS' || status === 'IN_CONSULTATION' ? 'blue' : status === 'CANCELLED' || status === 'NO_SHOW' ? 'red' : status === 'CALLED' ? 'orange' : 'gray';

function EmptyPanel({ message }: { message: string }) { return <Text c="dimmed" ta="center" py="xl">{message}</Text>; }

function AppointmentsPanel({ rows }: { rows: DashboardAppointment[] }) {
  const navigate = useNavigate();
  return <Paper withBorder p="md" radius="lg" h="100%"><Group justify="space-between" mb="sm"><div><Title order={4}>Today's appointments</Title><Text size="sm" c="dimmed">Scheduled clinical activity</Text></div><Button size="xs" variant="subtle" rightSection={<IconChevronRight size={15}/>} onClick={() => navigate('/front-office/appointments')}>View all</Button></Group>{rows.length === 0 ? <EmptyPanel message="No appointments scheduled today."/> : <Table.ScrollContainer minWidth={620}><Table verticalSpacing="sm" highlightOnHover><Table.Thead><Table.Tr><Table.Th>Time</Table.Th><Table.Th>Patient</Table.Th><Table.Th>Doctor / service</Table.Th><Table.Th>Status</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{rows.map((row) => <Table.Tr key={row.id}><Table.Td><Text fw={700}>{row.startTime.slice(0, 5)}</Text></Table.Td><Table.Td><Text fw={500}>{row.patientName}</Text><Text size="xs" c="dimmed">{row.mrn}</Text></Table.Td><Table.Td><Text size="sm">{row.doctorName}</Text><Text size="xs" c="dimmed">{row.serviceName}</Text></Table.Td><Table.Td><Badge color={statusColor(row.status)} variant="light">{row.status.replace(/_/g, ' ')}</Badge></Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>}</Paper>;
}

function QueuePanel({ rows }: { rows: DashboardQueueItem[] }) {
  const navigate = useNavigate();
  return <Paper withBorder p="md" radius="lg" h="100%"><Group justify="space-between" mb="sm"><div><Title order={4}>Today's queue</Title><Text size="sm" c="dimmed">Live check-in and consultation status</Text></div><Button size="xs" variant="subtle" rightSection={<IconChevronRight size={15}/>} onClick={() => navigate('/front-office/queue')}>Open queue</Button></Group>{rows.length === 0 ? <EmptyPanel message="No patients are in today's queue."/> : <Table.ScrollContainer minWidth={540}><Table verticalSpacing="sm" highlightOnHover><Table.Thead><Table.Tr><Table.Th>Queue</Table.Th><Table.Th>Patient</Table.Th><Table.Th>Doctor</Table.Th><Table.Th>Status</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{rows.map((row) => <Table.Tr key={row.id}><Table.Td><Badge size="lg" variant="filled">{row.queueNumber}</Badge></Table.Td><Table.Td><Text fw={500}>{row.patientName}</Text><Text size="xs" c="dimmed">{row.mrn}</Text></Table.Td><Table.Td><Text size="sm">{row.doctorName}</Text></Table.Td><Table.Td><Badge color={statusColor(row.status)} variant="light">{row.status.replace(/_/g, ' ')}</Badge></Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>}</Paper>;
}

function AttentionPanel({ alerts }: { alerts: DashboardAlert[] }) {
  const navigate = useNavigate();
  const icons = [IconCash, IconPackage, IconAlertTriangle];
  return <Stack gap="sm"><div><Title order={4}>Needs attention</Title><Text size="sm" c="dimmed">Items that may require an owner or staff action</Text></div><SimpleGrid cols={{ base: 1, sm: 3 }}>{alerts.map((alert, index) => { const Icon = icons[index] ?? IconAlertTriangle; const color = alert.tone === 'danger' ? 'red' : alert.tone === 'warning' ? 'orange' : 'teal'; return <Card key={alert.label} withBorder padding="md"><Group wrap="nowrap"><ThemeIcon color={color} variant="light" size="lg"><Icon size={20}/></ThemeIcon><div style={{ flex: 1 }}><Text size="sm" c="dimmed">{alert.label}</Text><Text fw={700} size="xl">{alert.value}</Text></div><Button variant="subtle" size="compact-sm" aria-label={`Open ${alert.label}`} onClick={() => navigate(alert.href)}><IconChevronRight size={17}/></Button></Group></Card>; })}</SimpleGrid></Stack>;
}

export function AdminDashboardPanels({ appointments, queue, alerts }: { appointments: DashboardAppointment[]; queue: DashboardQueueItem[]; alerts: DashboardAlert[] }) {
  return <Stack gap="lg"><Grid><Grid.Col span={{ base: 12, xl: 7 }}><AppointmentsPanel rows={appointments}/></Grid.Col><Grid.Col span={{ base: 12, xl: 5 }}><QueuePanel rows={queue}/></Grid.Col></Grid><AttentionPanel alerts={alerts}/></Stack>;
}

export function AdminQuickActions() {
  const navigate = useNavigate();
  return <Group gap="xs"><Button size="xs" variant="light" leftSection={<IconCalendarEvent size={16}/>} onClick={() => navigate('/front-office/appointments')}>Appointments</Button><Button size="xs" variant="light" leftSection={<IconListNumbers size={16}/>} onClick={() => navigate('/front-office/queue')}>Queue</Button><Button size="xs" variant="light" leftSection={<IconCash size={16}/>} onClick={() => navigate('/front-office/billing')}>Billing</Button></Group>;
}
