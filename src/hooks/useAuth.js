import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase.js';
import profileService from '../services/profileService.js';

export default function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const p = await profileService.getProfile();
      setProfile(p);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoaded(true);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          setProfile(null);
          setProfileLoaded(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Fetch the profile once per session. This effect is the single trigger —
  // onAuthStateChange only updates session state, so the profile is SELECTed
  // exactly once on load/sign-in instead of twice.
  useEffect(() => {
    if (session && !profileLoaded) {
      fetchProfile();
    }
  }, [session, profileLoaded, fetchProfile]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return { error };
  }, []);

  const signInWithGithub = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin },
    });
    return { error };
  }, []);

  const signInWithLinkedin = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: { redirectTo: window.location.origin },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
    profile,
    profileLoaded,
    signInWithGoogle,
    signInWithGithub,
    signInWithLinkedin,
    signOut,
    refreshProfile,
  };
}
