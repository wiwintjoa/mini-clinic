import { create } from 'zustand';
import { authApi, Identity, setAccessToken } from '../api/client';
type SessionState = { user: Identity|null; ready: boolean; initialize: () => Promise<void>; login: (email:string,password:string)=>Promise<void>; logout:()=>Promise<void> };
export const useSession = create<SessionState>((set) => ({
  user: null, ready: false,
  initialize: async () => { try { const session = await authApi.refresh(); setAccessToken(session.accessToken); set({ user: session.user, ready: true }); } catch { setAccessToken(null); set({ user: null, ready: true }); } },
  login: async (email,password) => { const session = await authApi.login({email,password}); setAccessToken(session.accessToken); set({user:session.user}); },
  logout: async () => { try { await authApi.logout(); } finally { setAccessToken(null); set({user:null}); } },
}));
