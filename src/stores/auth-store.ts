import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { RoleName, Staff } from '@/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  staff: Staff | null;
  role: RoleName | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  setAuth: (session: Session | null) => Promise<void>;
}

async function fetchStaff(userId: string): Promise<{ staff: Staff; role: RoleName } | null> {
  const { data: staffData, error } = await supabase
    .from('staff')
    .select('*, role:roles(*)')
    .eq('id', userId)
    .maybeSingle();

  if (error || !staffData) return null;

  const role = staffData.role?.name ?? null;
  return { staff: staffData as Staff, role };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  staff: null,
  role: null,
  loading: false,
  initialized: false,

  setAuth: async (session) => {
    if (!session) {
      set({ user: null, session: null, staff: null, role: null });
      return;
    }

    const user = session.user;
    const staffInfo = await fetchStaff(user.id);

    if (!staffInfo) {
      // No staff record — could be a patient, check patients table
      const { data: patient } = await supabase
        .from('patients')
        .select('id, mrn, full_name')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!patient) {
        // Not staff or patient — sign out
        await supabase.auth.signOut();
        set({ user: null, session: null, staff: null, role: null });
        return;
      }

      set({
        user,
        session,
        staff: null,
        role: 'PATIENT',
      });
      return;
    }

    set({
      user,
      session,
      staff: staffInfo.staff,
      role: staffInfo.role,
    });
  },

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await get().setAuth(session);
    }
    set({ initialized: true });

    supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        await get().setAuth(session);
      })();
    });
  },

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.session) {
        await get().setAuth(data.session);
      }
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, staff: null, role: null });
  },
}));
