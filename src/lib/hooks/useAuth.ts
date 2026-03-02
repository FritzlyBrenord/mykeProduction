'use client';

import { createClient } from '@/lib/supabase/client';
import { User } from '@/lib/types';
import { SupabaseClient } from '@supabase/supabase-js';
import React from 'react';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 20 * 60 * 1000;
const VERIFICATION_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_GUARD_PREFIX = 'myke:auth:login-guard:';
const VERIFICATION_EXPIRY_PREFIX = 'myke:auth:verification-expiry:';

type SignInCode =
  | 'EMAIL_NOT_VERIFIED'
  | 'INVALID_CREDENTIALS'
  | 'LOCKED_OUT'
  | 'UNKNOWN';

type SignUpCode = 'EMAIL_EXISTS' | 'RATE_LIMITED' | 'UNKNOWN';
type ResendCode = 'RATE_LIMITED' | 'UNKNOWN';

interface SignInResult {
  error: Error | null;
  code?: SignInCode;
  message?: string;
  emailNotVerified?: boolean;
  remainingAttempts?: number;
  lockoutRemainingMs?: number;
  verificationExpiresAtMs?: number;
}

interface SignUpResult {
  error: Error | null;
  code?: SignUpCode;
  emailExists?: boolean;
  emailRateLimit?: boolean;
  verificationExpiresAtMs?: number;
}

interface ResendResult {
  error: Error | null;
  code?: ResendCode;
  verificationExpiresAtMs?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  initError: string | null;
  pendingEmail: string | null;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (email: string, password: string, fullName: string) => Promise<SignUpResult>;
  resendVerificationEmail: (email: string) => Promise<ResendResult>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearPendingEmail: () => void;
  getLoginLockRemainingMs: (email: string) => number;
  getVerificationExpiryMs: (email: string) => number | null;
}

interface LoginGuardState {
  failedAttempts: number;
  lockoutUntil: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isBrowser() {
  return typeof window !== 'undefined';
}

function getLoginGuardKey(email: string) {
  return `${LOGIN_GUARD_PREFIX}${normalizeEmail(email)}`;
}

function getVerificationExpiryKey(email: string) {
  return `${VERIFICATION_EXPIRY_PREFIX}${normalizeEmail(email)}`;
}

function readLoginGuardState(email: string): LoginGuardState {
  if (!isBrowser()) return { failedAttempts: 0, lockoutUntil: null };

  try {
    const raw = window.localStorage.getItem(getLoginGuardKey(email));
    if (!raw) return { failedAttempts: 0, lockoutUntil: null };

    const parsed = JSON.parse(raw) as Partial<LoginGuardState>;
    return {
      failedAttempts:
        typeof parsed.failedAttempts === 'number' && parsed.failedAttempts > 0
          ? Math.floor(parsed.failedAttempts)
          : 0,
      lockoutUntil: typeof parsed.lockoutUntil === 'number' ? parsed.lockoutUntil : null,
    };
  } catch {
    return { failedAttempts: 0, lockoutUntil: null };
  }
}

function writeLoginGuardState(email: string, state: LoginGuardState) {
  if (!isBrowser()) return;

  try {
    if (state.failedAttempts <= 0 && !state.lockoutUntil) {
      window.localStorage.removeItem(getLoginGuardKey(email));
      return;
    }

    window.localStorage.setItem(getLoginGuardKey(email), JSON.stringify(state));
  } catch {
    // ignore
  }
}

function getLoginLockRemainingMsInternal(email: string): number {
  const state = readLoginGuardState(email);
  if (!state.lockoutUntil) return 0;

  const remaining = state.lockoutUntil - Date.now();
  if (remaining <= 0) {
    writeLoginGuardState(email, { failedAttempts: 0, lockoutUntil: null });
    return 0;
  }
  return remaining;
}

function registerFailedAttempt(email: string): {
  remainingAttempts: number;
  lockoutRemainingMs: number;
} {
  const current = readLoginGuardState(email);

  if (current.lockoutUntil && current.lockoutUntil > Date.now()) {
    return {
      remainingAttempts: 0,
      lockoutRemainingMs: current.lockoutUntil - Date.now(),
    };
  }

  const nextFailedAttempts = (current.failedAttempts || 0) + 1;
  if (nextFailedAttempts >= MAX_LOGIN_ATTEMPTS) {
    const lockoutUntil = Date.now() + LOGIN_LOCKOUT_MS;
    writeLoginGuardState(email, { failedAttempts: MAX_LOGIN_ATTEMPTS, lockoutUntil });
    return {
      remainingAttempts: 0,
      lockoutRemainingMs: LOGIN_LOCKOUT_MS,
    };
  }

  writeLoginGuardState(email, {
    failedAttempts: nextFailedAttempts,
    lockoutUntil: null,
  });

  return {
    remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - nextFailedAttempts),
    lockoutRemainingMs: 0,
  };
}

function clearFailedAttempts(email: string) {
  writeLoginGuardState(email, { failedAttempts: 0, lockoutUntil: null });
}

function setVerificationExpiry(email: string, expiresAtMs: number) {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(getVerificationExpiryKey(email), String(expiresAtMs));
  } catch {
    // ignore
  }
}

function getVerificationExpiryInternal(email: string): number | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(getVerificationExpiryKey(email));
    if (!raw) return null;
    const value = Number(raw);
    if (!Number.isFinite(value)) return null;

    const now = Date.now();
    if (value <= now) {
      clearVerificationExpiry(email);
      return null;
    }

    // Migrate legacy long expirations (e.g. 1h/24h) to the current 5-minute policy.
    const maxAllowed = now + VERIFICATION_WINDOW_MS;
    if (value > maxAllowed) {
      setVerificationExpiry(email, maxAllowed);
      return maxAllowed;
    }

    return value;
  } catch {
    return null;
  }
}

function clearVerificationExpiry(email: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(getVerificationExpiryKey(email));
  } catch {
    // ignore
  }
}

function ensureVerificationExpiry(email: string): number {
  const existing = getVerificationExpiryInternal(email);
  if (existing && existing > Date.now()) return existing;

  const next = Date.now() + VERIFICATION_WINDOW_MS;
  setVerificationExpiry(email, next);
  return next;
}

function isEmailNotConfirmedError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('email not confirmed') || normalized.includes('email_not_confirmed');
}

function isInvalidCredentialsError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid_credentials') ||
    normalized.includes('invalid credentials')
  );
}

function roleFromMetadata(metadata: unknown): 'client' | 'admin' {
  if (!metadata || typeof metadata !== 'object') return 'client';
  const role = (metadata as Record<string, unknown>).role;
  return role === 'admin' ? 'admin' : 'client';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      const errorMsg =
        'Variables Supabase manquantes. Verifie NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY';
      console.error(errorMsg);
      setInitError(errorMsg);
      setLoading(false);
      return;
    }

    try {
      const client = createClient();
      setSupabase(client);
      setInitError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to initialize Supabase client:', error);
      setInitError(`Erreur initialisation Supabase: ${message}`);
      setLoading(false);
    }
  }, []);

  const fetchUser = useCallback(async () => {
    if (!supabase) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile) {
          const profileWithOptionalFields = profile as {
            phone_encrypted?: string | null;
            country?: string | null;
            bio?: string | null;
          };

          setUser({
            ...profile,
            email: session.user.email!,
            phone: profileWithOptionalFields.phone_encrypted ?? null,
            country: profileWithOptionalFields.country ?? null,
            bio: profileWithOptionalFields.bio ?? null,
          } as User);
          return;
        }

        if (profileError) {
          console.warn('Profile fetch warning, using session fallback:', profileError);
        }

        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          full_name:
            (session.user.user_metadata?.full_name as string | undefined) ?? null,
          avatar_url:
            (session.user.user_metadata?.avatar_url as string | undefined) ?? null,
          role: roleFromMetadata(session.user.app_metadata),
          phone: null,
          country: null,
          bio: null,
          is_active: true,
          two_fa_enabled: false,
          created_at: session.user.created_at ?? new Date().toISOString(),
        } as User);
        return;
      }

      setUser(null);
    } catch (error) {
      console.error('Error fetching user:', error);
      // Keep the previous in-memory user if this is a transient network issue.
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchUser();

    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchUser]);

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    if (!supabase) return { error: new Error('Supabase not initialized'), code: 'UNKNOWN' };

    const normalizedEmail = normalizeEmail(email);
    const lockoutRemainingMs = getLoginLockRemainingMsInternal(normalizedEmail);
    if (lockoutRemainingMs > 0) {
      return {
        error: new Error('Trop de tentatives. Reessayez plus tard.'),
        code: 'LOCKED_OUT',
        message: 'Compte temporairement verrouille apres plusieurs tentatives.',
        lockoutRemainingMs,
      };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      const message = error.message || '';

      if (isEmailNotConfirmedError(message)) {
        setPendingEmail(normalizedEmail);
        const verificationExpiresAtMs = ensureVerificationExpiry(normalizedEmail);
        return {
          error,
          code: 'EMAIL_NOT_VERIFIED',
          message: "Votre email n'est pas verifie. Verifiez votre boite mail.",
          emailNotVerified: true,
          verificationExpiresAtMs,
        };
      }

      if (isInvalidCredentialsError(message)) {
        const attemptState = registerFailedAttempt(normalizedEmail);
        if (attemptState.lockoutRemainingMs > 0) {
          return {
            error,
            code: 'LOCKED_OUT',
            message:
              '5 tentatives incorrectes detectees. Connexion bloquee pendant 20 minutes.',
            lockoutRemainingMs: attemptState.lockoutRemainingMs,
          };
        }

        return {
          error,
          code: 'INVALID_CREDENTIALS',
          message: 'Email ou mot de passe incorrect.',
          remainingAttempts: attemptState.remainingAttempts,
        };
      }

      return {
        error,
        code: 'UNKNOWN',
        message: "Impossible de se connecter pour le moment. Reessayez plus tard.",
      };
    }

    clearFailedAttempts(normalizedEmail);
    clearVerificationExpiry(normalizedEmail);
    setPendingEmail(null);
    await fetchUser();
    return { error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
  ): Promise<SignUpResult> => {
    if (!supabase) return { error: new Error('Supabase not initialized'), code: 'UNKNOWN' };

    const normalizedEmail = normalizeEmail(email);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) {
        if (
          authError.message?.includes('rate limit') ||
          authError.message?.includes('over_email_send_rate_limit')
        ) {
          return {
            error: authError,
            code: 'RATE_LIMITED',
            emailRateLimit: true,
          };
        }

        if (
          authError.message?.includes('already registered') ||
          authError.message?.includes('user_already_exists')
        ) {
          return {
            error: new Error('Cet email est deja utilise'),
            code: 'EMAIL_EXISTS',
            emailExists: true,
          };
        }

        return { error: authError, code: 'UNKNOWN' };
      }

      if (!authData.user) {
        return {
          error: new Error('Erreur lors de la creation du compte'),
          code: 'UNKNOWN',
        };
      }

      const verificationExpiresAtMs = ensureVerificationExpiry(normalizedEmail);
      setPendingEmail(normalizedEmail);
      return { error: null, verificationExpiresAtMs };
    } catch (error) {
      return { error: error as Error, code: 'UNKNOWN' };
    }
  };

  const signInWithGoogle = async () => {
    if (!supabase) return { error: new Error('Supabase not initialized') };
    if (!isBrowser()) return { error: new Error('Google OAuth requires a browser context') };

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    return { error };
  };

  const resendVerificationEmail = async (email: string): Promise<ResendResult> => {
    if (!supabase) return { error: new Error('Supabase not initialized'), code: 'UNKNOWN' };

    const normalizedEmail = normalizeEmail(email);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail,
      });

      if (error) {
        if (
          error.message?.includes('rate limit') ||
          error.message?.includes('over_email_send_rate_limit')
        ) {
          return {
            error,
            code: 'RATE_LIMITED',
          };
        }

        return { error, code: 'UNKNOWN' };
      }

      const verificationExpiresAtMs = Date.now() + VERIFICATION_WINDOW_MS;
      setVerificationExpiry(normalizedEmail, verificationExpiresAtMs);
      return { error: null, verificationExpiresAtMs };
    } catch (err) {
      return { error: err as Error, code: 'UNKNOWN' };
    }
  };

  const clearPendingEmail = () => {
    setPendingEmail(null);
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setPendingEmail(null);
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const value = {
    user,
    loading,
    initError,
    pendingEmail,
    signIn,
    signUp,
    resendVerificationEmail,
    signInWithGoogle,
    signOut,
    refreshUser,
    clearPendingEmail,
    getLoginLockRemainingMs: getLoginLockRemainingMsInternal,
    getVerificationExpiryMs: getVerificationExpiryInternal,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
