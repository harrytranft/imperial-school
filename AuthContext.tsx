// Trong AuthContext.tsx
import { supabase } from './supabaseClient';

// Đăng nhập Google
const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) alert("Đăng nhập thất bại: " + error.message);
};

// Đăng xuất
const logout = async () => {
  await supabase.auth.signOut();
};