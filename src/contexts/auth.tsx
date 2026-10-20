import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

type Outlet = {
  id: string;
  nama: string;
  alamat: string | null;
  telepon: string | null;
  logo_url: string | null;
  kode: string | null; // ← Tambahkan ini untuk kode struk
};

type Profile = {
  id: string;
  nama: string;
  role: 'kasir' | 'admin';
  outlet_id: string;
  aktif: boolean;
};

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  outlet: Outlet | null;
  loading: boolean;
  initialized: boolean;
  setSession: (session: Session | null) => void;
  loadProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ error: string | null }>;
  
};

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  outlet: null,
  loading: false,
  initialized: false,

  setSession: (session) => {
    set({ session, user: session?.user ?? null });
    if (!session) {
      set({ profile: null, outlet: null });
    }
  },

  loadProfile: async () => {
    const { user } = get();
    if (!user) {
      set({ profile: null, outlet: null });
      return;
    }

    try {
      // Timeout 5 detik
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 5000)
      );

      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const result = await Promise.race([fetchPromise, timeoutPromise]);

      if (!result) {
       // console.log('loadProfile timeout');
        set({ profile: null });
        return;
      }

      const { data, error } = result as any;

      if (error) {
        console.error('loadProfile error:', error.message);
        set({ profile: null });
        return;
      }

      const prof = data as Profile;
      set({ profile: prof });

      // cek apakah aktif
       if (prof.aktif === false) {
        // console.log('Akun nonakti, logout...');
        await get().signOut();
        return;
      }

      // Fetch outlet
      if (prof.outlet_id) {
        const { data: outletData, error: outletErr } = await supabase
          .from('outlets')
          .select('id, nama, alamat, telepon, logo_url')
          .eq('id', prof.outlet_id)
          .single();

        if (outletErr) {
          console.error('loadOutlet error:', outletErr.message);
          set({ outlet: null });
        } else {
          set({ outlet: outletData as Outlet });
        }
      }
    } catch (e: any) {
      console.error('loadProfile exception:', e?.message ?? e);
      set({ profile: null });
    }
  },

    signIn: async (email, password) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      set({ loading: false });
      return { error: error.message };
    }

    // 1. Set session sementara
    set({ session: data.session, user: data.user });

    // 2. Cek profile SEBELUM mengizinkan masuk
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('aktif')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profileData) {
      await supabase.auth.signOut();
      set({ session: null, user: null, profile: null, outlet: null, loading: false });
      return { error: 'Data profil tidak ditemukan.' };
    }

    if (profileData.aktif === false) {
      await supabase.auth.signOut();
      set({ session: null, user: null, profile: null, outlet: null, loading: false });
      return { error: 'Akun Anda sudah dinonaktifkan. Hubungi Admin.' };
    }

    // 3. Jika aktif, load data lengkap (outlet, dll)
    await get().loadProfile();
    set({ loading: false });
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, outlet: null });
  },

    changePassword: async (oldPassword, newPassword) => {
    set({ loading: true });
    
    // 1. Verifikasi password lama dengan cara login ulang
    const { session } = get();
    if (!session?.user?.email) {
      set({ loading: false });
      return { error: 'Sesi tidak valid. Silakan login ulang.' };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: oldPassword,
    });

    if (signInError) {
      set({ loading: false });
      return { error: 'Password lama salah.' };
    }

    // 2. Update ke password baru
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    set({ loading: false });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  },

    initialize: async () => {
    // 1. Coba ambil session dari cache storage HP (super cepat, tanpa internet)
    const { data: cachedData } = await supabase.auth.getSession();
    const cachedSession = cachedData?.session ?? null;

    if (cachedSession) {
      // Jika ada cache, langsung set state agar aplikasi tidak stuck di spinner
      set({ 
        session: cachedSession, 
        user: cachedSession.user,
        initialized: true // Aplikasi langsung lanjut
      });

      // 2. Di belakang layar, coba refresh session & ambil profile terbaru dari internet
      try {
        await get().loadProfile();
      } catch (e) {
        // console.log('Gagal load profile saat startup (offline?)');
      }
    } else {
      // Jika tidak ada cache sama sekali, baru tampilkan loading
      set({ initialized: true, session: null, user: null });
    }
  },
}));