// This file would interact with your backend authentication API if not using Supabase client directly.
// For Supabase, direct client usage is common as shown in AuthContext.
// If you had custom backend auth, methods would go here.

/**
 * Placeholder for auth service.
 * With Supabase, most auth interactions happen directly via the Supabase client library.
 * This file is kept for conceptual structure or if you extend with custom backend auth.
 */

import { supabase } from '@/lib/supabaseClient';

export async function changePassword(newPassword: string): Promise<void> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
  } catch (error: any) {
    console.error('Failed to change password:', error);
    throw error;
  }
}

export async function changeEmail(newEmail: string): Promise<void> {
  try {
    const { error } = await supabase.auth.updateUser({
      email: newEmail
    });

    if (error) throw error;
  } catch (error: any) {
    console.error('Failed to change email:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) throw error;
  } catch (error: any) {
    console.error('Failed to send password reset email:', error);
    throw error;
  }
}

// Example:
// export async function updateUserPassword(password: string): Promise<void> {
//   console.log(`[AuthService Stub] Updating user password`);
//   // const { error } = await supabase.auth.updateUser({ password });
//   // if (error) throw error;
//   return Promise.resolve();
// }
