import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppShell, Avatar, Badge, Box, Burger, Button, Card, Center, Container, Group, Loader, NavLink, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconBuildingHospital, IconHome, IconLogout, IconShieldLock } from '@tabler/icons-react';
import { useForm } from 'react-hook-form';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useSession } from './app/auth/session-store';

const schema = z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(8, 'Password must have at least 8 characters') });
type LoginValues = z.infer<typeof schema>;
const homes = { ADMIN:'/admin/dashboard', RECEPTIONIST:'/front-office/dashboard', DOCTOR:'/doctor/dashboard', PHARMACIST:'/pharmacy/dashboard', PATIENT:'/patient/dashboard' } as const;

function Login() {
  const login = useSession((state)=>state.login); const user = useSession((state)=>state.user); const navigate = useNavigate();
  const { register, handleSubmit, formState:{errors,isSubmitting} } = useForm<LoginValues>({resolver:zodResolver(schema),defaultValues:{email:'',password:''}});
  if (user) return <Navigate to={homes[user.role]} replace />;
  const submit = handleSubmit(async (values)=>{ try { await login(values.email,values.password); const current=useSession.getState().user; if(current) navigate(homes[current.role]); } catch { notifications.show({color:'red',title:'Unable to sign in',message:'Check your credentials and try again.'}); } });
  return <Box bg="gray.0" mih="100vh"><Container size={440} py={80}><Stack align="center" mb="xl"><Avatar size={56} color="teal"><IconBuildingHospital/></Avatar><Title order={1}>Mini Clinic</Title><Text c="dimmed">Secure clinic workspace</Text></Stack><Paper withBorder shadow="sm" p="xl" radius="lg"><form onSubmit={submit}><Stack><TextInput label="Email" autoComplete="username" {...register('email')} error={errors.email?.message}/><PasswordInput label="Password" autoComplete="current-password" {...register('password')} error={errors.password?.message}/><Button type="submit" loading={isSubmitting} fullWidth>Sign in</Button></Stack></form></Paper></Container></Box>;
}

function Workspace() {
  const user=useSession((state)=>state.user); const logout=useSession((state)=>state.logout); const [opened,{toggle}]=useDisclosure(); const navigate=useNavigate();
  if(!user) return <Navigate to="/login" replace/>;
  return <AppShell header={{height:64}} navbar={{width:260,breakpoint:'sm',collapsed:{mobile:!opened}}} padding="lg">
    <AppShell.Header><Group h="100%" px="md" justify="space-between"><Group><Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm"/><IconBuildingHospital color="var(--mantine-color-teal-6)"/><Text fw={700}>Mini Clinic</Text></Group><Group><Badge variant="light">{user.role}</Badge><Avatar size="sm">{user.fullName.slice(0,1)}</Avatar></Group></Group></AppShell.Header>
    <AppShell.Navbar p="md"><AppShell.Section grow><NavLink active label="Dashboard" leftSection={<IconHome size={18}/>}/></AppShell.Section><AppShell.Section><NavLink label="Sign out" leftSection={<IconLogout size={18}/>} onClick={async()=>{await logout();navigate('/login');}}/></AppShell.Section></AppShell.Navbar>
    <AppShell.Main><Container size="lg" px={0}><Stack><div><Text c="dimmed" size="sm">Welcome back</Text><Title order={2}>{user.fullName}</Title></div><Card withBorder radius="lg" p="xl"><Group align="flex-start" wrap="nowrap"><Avatar color="teal" radius="md"><IconShieldLock/></Avatar><div><Title order={3}>Foundation is ready</Title><Text c="dimmed" mt="xs">Authentication, trusted permissions, responsive navigation, and the clinic design system are active. Clinical modules are introduced incrementally in the next phases.</Text></div></Group></Card></Stack></Container></AppShell.Main>
  </AppShell>;
}

function Router() { const initialize=useSession((state)=>state.initialize); const ready=useSession((state)=>state.ready); useEffect(()=>{void initialize();},[initialize]); if(!ready)return <Center mih="100vh"><Loader/></Center>; return <Routes><Route path="/login" element={<Login/>}/><Route path="/*" element={<Workspace/>}/></Routes>; }
export function Phase1App(){return <BrowserRouter><Router/></BrowserRouter>;}
