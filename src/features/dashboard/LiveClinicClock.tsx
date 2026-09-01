import { Group, Paper, Text, ThemeIcon, Title } from '@mantine/core';
import { IconClockHour4 } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

const dateFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Makassar', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

export function LiveClinicClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1_000); return () => window.clearInterval(timer); }, []);
  return <Paper withBorder p="md" radius="lg"><Group wrap="nowrap"><ThemeIcon size={46} radius="md" variant="light" color="teal"><IconClockHour4 size={25}/></ThemeIcon><div><Text size="xs" tt="uppercase" fw={700} c="dimmed">Clinic local time · WITA</Text><Title order={3} lh={1.15}>{timeFormatter.format(now)}</Title><Text size="sm" c="dimmed">{dateFormatter.format(now)}</Text></div></Group></Paper>;
}
