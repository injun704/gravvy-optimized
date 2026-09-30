import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, ThemeMode } from '../types';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier | null;
  }
}

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAuthLoading: boolean;
  loginWithGoogle: () => Promise<{ success: boolean; message: string }>;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  loginAsDemoUser: () => Promise<{ success: boolean; message: string }>;
  signUpWithEmail: (
    email: string,
    pass: string,
    name: string,
    phone?: string
  ) => Promise<{ success: boolean; message: string }>;
  sendPhoneOtp: (
    phone: string,
    recaptchaElement?: HTMLElement
  ) => Promise<{ success: boolean; message: string }>;
  confirmPhoneOtp: (otp: string, name?: string) => Promise<{ success: boolean; message: string }>;
  resetPhoneOtpSession: () => void;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  toggleAdminMode: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [phoneConfirmationResult, setPhoneConfirmationResult] = useState<ConfirmationResult | null>(
    null
  );

  // Attempt versioning counter to invalidate stale async calls across logout/resets
  const authAttemptIdRef = useRef<number>(0);

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('gravvy_is_admin') === 'true';
    } catch {
      return false;
    }
  });

  const resetPhoneOtpSession = useCallback(() => {
    authAttemptIdRef.current += 1;
    setPhoneConfirmationResult(null);
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {
        // ignore clear error
      }
      window.recaptchaVerifier = null;
    }
  }, []);

  // Listen to Firebase Auth state changes with real-time Firestore sync
  useEffect(() => {
    let firestoreUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        firestoreUnsubscribe = null;
      }

      if (fbUser) {
        const userDocRef = doc(db, 'users', fbUser.uid);

        firestoreUnsubscribe = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setUser({
                id: fbUser.uid,
                name: data.name ?? fbUser.displayName ?? '',
                email: data.email ?? fbUser.email ?? '',
                phone: data.phone ?? fbUser.phoneNumber ?? '',
                avatar: data.avatar ?? fbUser.photoURL ?? '',
                themePreference: data.themePreference || 'UNI',
                addresses: data.addresses || [],
                savedPaymentMethods: data.savedPaymentMethods || [],
                wishlistProductIds: data.wishlistProductIds || [],
              });
            } else {
              // Initial Firestore document creation for new authenticated user
              const newProfile: UserProfile = {
                id: fbUser.uid,
                name: fbUser.displayName || '',
                email: fbUser.email || '',
                phone: fbUser.phoneNumber || '',
                avatar: fbUser.photoURL || '',
                themePreference: 'UNI',
                addresses: [],
                savedPaymentMethods: [],
                wishlistProductIds: [],
              };

              setDoc(userDocRef, {
                ...newProfile,
                createdAt: new Date().toISOString(),
              }).catch(() => {});

              setUser(newProfile);
            }
            setIsAuthLoading(false);
          },
          () => {
            // Offline/permission fallback
            setUser({
              id: fbUser.uid,
              name: fbUser.displayName || '',
              email: fbUser.email || '',
              phone: fbUser.phoneNumber || '',
              avatar: fbUser.photoURL || '',
              themePreference: 'UNI',
              addresses: [],
              savedPaymentMethods: [],
              wishlistProductIds: [],
            });
            setIsAuthLoading(false);
          }
        );
      } else {
        setUser(null);
        setPhoneConfirmationResult(null);
        setIsAuthLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }
    };
  }, []);

  // Google Sign In
  const loginWithGoogle = async (): Promise<{ success: boolean; message: string }> => {
    const currentAttemptId = ++authAttemptIdRef.current;
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;

      if (authAttemptIdRef.current !== currentAttemptId) {
        return { success: false, message: 'Authentication attempt cancelled.' };
      }

      if (fbUser) {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const docSnap = await getDoc(userDocRef);

        if (!docSnap.exists()) {
          await setDoc(userDocRef, {
            id: fbUser.uid,
            name: fbUser.displayName || '',
            email: fbUser.email || '',
            phone: fbUser.phoneNumber || '',
            avatar: fbUser.photoURL || '',
            createdAt: new Date().toISOString(),
          });
        }
      }

      return { success: true, message: 'Logged in with Google successfully' };
    } catch (err: any) {
      if (authAttemptIdRef.current !== currentAttemptId) {
        return { success: false, message: 'Authentication attempt cancelled.' };
      }
      const code = err?.code || '';
      let msg = err?.message || 'Google sign-in failed.';
      if (code === 'auth/popup-closed-by-user') {
        msg = 'Google login window was closed before completion.';
      } else if (code === 'auth/popup-blocked') {
        msg = 'Popup was blocked by your browser. Please allow popups or use Email Sign-In.';
      } else if (code === 'auth/unauthorized-domain') {
        msg = 'This domain is not whitelisted in Firebase Console. Please use Email or Demo Sign-In.';
      }
      return { success: false, message: msg };
    }
  };

  // Email / Password Login
  const loginWithEmail = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; message: string }> => {
    const currentAttemptId = ++authAttemptIdRef.current;
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      if (authAttemptIdRef.current !== currentAttemptId) {
        return { success: false, message: 'Authentication attempt cancelled.' };
      }
      return { success: true, message: 'Logged in successfully' };
    } catch (err: any) {
      if (authAttemptIdRef.current !== currentAttemptId) {
        return { success: false, message: 'Authentication attempt cancelled.' };
      }
      const code = err?.code || '';
      let msg = err?.message || 'Invalid email or password.';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        msg = 'No account found with these details or wrong password. Click "SIGN UP" tab to create a new account, or use 1-Click Demo Login.';
      } else if (code === 'auth/wrong-password') {
        msg = 'Incorrect password. Please try again or reset your password.';
      } else if (code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (code === 'auth/too-many-requests') {
        msg = 'Access temporarily disabled due to many failed attempts. Try again later or use Demo Login.';
      }
      return { success: false, message: msg };
    }
  };

  // One-Click Demo User Login
  const loginAsDemoUser = async (): Promise<{ success: boolean; message: string }> => {
    const demoEmail = 'customer.demo@gravvy.com';
    const demoPass = 'GravvyUser123!';

    // Try logging in first
    const loginRes = await loginWithEmail(demoEmail, demoPass);
    if (loginRes.success) return loginRes;

    // If account doesn't exist, create it automatically
    const signUpRes = await signUpWithEmail(demoEmail, demoPass, 'Demo Customer', '+919876543210');
    if (signUpRes.success) {
      return { success: true, message: 'Logged in as Demo Customer successfully!' };
    }
    return signUpRes;
  };

  // Email / Password Registration
  const signUpWithEmail = async (
    email: string,
    pass: string,
    name: string,
    phone?: string
  ): Promise<{ success: boolean; message: string }> => {
    const currentAttemptId = ++authAttemptIdRef.current;
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (authAttemptIdRef.current !== currentAttemptId) {
        return { success: false, message: 'Authentication attempt cancelled.' };
      }
      const fbUser = res.user;

      if (fbUser) {
        const userDocRef = doc(db, 'users', fbUser.uid);
        await setDoc(userDocRef, {
          id: fbUser.uid,
          name: name.trim(),
          email: email.trim(),
          phone: phone ? phone.trim() : '',
          createdAt: new Date().toISOString(),
        });
      }

      return { success: true, message: 'Account registered successfully!' };
    } catch (err: any) {
      if (authAttemptIdRef.current !== currentAttemptId) {
        return { success: false, message: 'Authentication attempt cancelled.' };
      }
      return { success: false, message: err?.message || 'Failed to create account' };
    }
  };

  // Send Phone OTP
  const sendPhoneOtp = async (
    phoneNumber: string,
    recaptchaElement?: HTMLElement
  ): Promise<{ success: boolean; message: string }> => {
    const currentAttemptId = ++authAttemptIdRef.current;
    setPhoneConfirmationResult(null);

    // Clean up any existing verifier instance before starting a new request
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {
        // ignore clear error
      }
      window.recaptchaVerifier = null;
    }

    try {
      const digitsOnly = phoneNumber.replace(/\D/g, '');
      let formattedPhone = phoneNumber.trim();

      if (phoneNumber.trim().startsWith('+')) {
        formattedPhone = '+' + digitsOnly;
      } else if (digitsOnly.length === 10) {
        formattedPhone = `+91${digitsOnly}`;
      } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
        formattedPhone = `+${digitsOnly}`;
      } else {
        formattedPhone = `+91${digitsOnly}`;
      }

      const targetEl = recaptchaElement || 'recaptcha-container';

      if (typeof targetEl !== 'string' && targetEl) {
        try {
          targetEl.innerHTML = '';
        } catch {}
      }

      // Initialize RecaptchaVerifier with invisible reCAPTCHA
      const recaptchaVerifier = new RecaptchaVerifier(auth, targetEl, {
        size: 'invisible',
        callback: () => {
          // Invisible reCAPTCHA verification completed automatically
        },
        'expired-callback': () => {
          if (window.recaptchaVerifier) {
            try {
              window.recaptchaVerifier.clear();
            } catch (e) {}
            window.recaptchaVerifier = null;
          }
        },
      });

      window.recaptchaVerifier = recaptchaVerifier;

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);

      if (authAttemptIdRef.current !== currentAttemptId) {
        if (window.recaptchaVerifier) {
          try {
            window.recaptchaVerifier.clear();
          } catch (e) {}
          window.recaptchaVerifier = null;
        }
        return { success: false, message: 'Authentication attempt cancelled.' };
      }

      setPhoneConfirmationResult(confirmation);
      return { success: true, message: 'OTP sent to mobile number' };
    } catch (err: any) {
      // Clear verifier on failure so subsequent attempts do not reuse stale widgets
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {}
        window.recaptchaVerifier = null;
      }

      if (authAttemptIdRef.current !== currentAttemptId) {
        return { success: false, message: 'Authentication attempt cancelled.' };
      }

      const code = err?.code || '';
      let msg = err?.message || 'Failed to send OTP.';

      if (code === 'auth/too-many-requests' || msg.includes('too-many-requests')) {
        msg = 'Too many SMS requests for this number or IP. Please wait 60 seconds before trying again, or use Email / Google Sign-In.';
      } else if (code === 'auth/quota-exceeded' || msg.includes('quota-exceeded')) {
        msg = 'SMS quota reached for this number today. Please try Email or Google Sign-In.';
      } else if (code === 'auth/invalid-phone-number' || msg.includes('invalid-phone-number')) {
        msg = 'Please enter a valid 10-digit mobile number.';
      } else if (code === 'auth/captcha-check-failed' || msg.includes('captcha')) {
        msg = 'Security verification failed. Please check your network connection and try again.';
      } else if (code === 'auth/network-request-failed') {
        msg = 'Network error. Please check your internet connection and try again.';
      }

      return {
        success: false,
        message: msg,
      };
    }
  };

  // Confirm Phone OTP
  const confirmPhoneOtp = async (
    otp: string,
    name?: string
  ): Promise<{ success: boolean; message: string }> => {
    const currentAttemptId = authAttemptIdRef.current;
    try {
      if (!phoneConfirmationResult) {
        return { success: false, message: 'OTP session expired. Please request OTP again.' };
      }

      const res = await phoneConfirmationResult.confirm(otp);

      if (authAttemptIdRef.current !== currentAttemptId) {
        return { success: false, message: 'Authentication attempt cancelled.' };
      }

      const fbUser = res.user;

      if (fbUser) {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const docSnap = await getDoc(userDocRef);

        if (!docSnap.exists()) {
          await setDoc(userDocRef, {
            id: fbUser.uid,
            name: name ? name.trim() : '',
            phone: fbUser.phoneNumber || '',
            email: '',
            avatar: '',
            createdAt: new Date().toISOString(),
          });
        }
      }

      setPhoneConfirmationResult(null);
      return { success: true, message: 'Phone verified successfully' };
    } catch (err: any) {
      const code = err?.code || '';
      let msg = err?.message || 'Invalid OTP code.';

      if (code === 'auth/invalid-verification-code' || msg.includes('invalid-verification-code')) {
        msg = 'Incorrect 6-digit OTP code. Please check the SMS sent to your phone and try again.';
      } else if (code === 'auth/code-expired' || msg.includes('code-expired')) {
        msg = 'The OTP code has expired. Please request a new verification code.';
      } else if (code === 'auth/session-expired') {
        msg = 'Your verification session has expired. Please request a new OTP.';
      }

      return { success: false, message: msg };
    }
  };

  // Logout - Clears all authentication state, pending sessions & modal state
  const logout = async () => {
    authAttemptIdRef.current += 1;
    setPhoneConfirmationResult(null);
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {
        // ignore clear error
      }
      window.recaptchaVerifier = null;
    }
    setIsAuthModalOpen(false);

    try {
      await signOut(auth);
    } catch (err) {
      console.error('SignOut error:', err);
    } finally {
      setUser(null);
      setFirebaseUser(null);
      setPhoneConfirmationResult(null);
      setIsAuthModalOpen(false);
    }
  };

  // Update Profile
  const updateProfile = async (data: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));

    if (firebaseUser) {
      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        await setDoc(userDocRef, data, { merge: true });
      } catch (err) {}
    }
  };

  const toggleAdminMode = () => {
    setIsAdmin((prev) => {
      const next = !prev;
      localStorage.setItem('gravvy_is_admin', next ? 'true' : 'false');
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isAuthenticated: !!user,
        isAdmin,
        isAuthLoading,
        loginWithGoogle,
        loginWithEmail,
        loginAsDemoUser,
        signUpWithEmail,
        sendPhoneOtp,
        confirmPhoneOtp,
        resetPhoneOtpSession,
        logout,
        updateProfile,
        toggleAdminMode,
        isAuthModalOpen,
        setIsAuthModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
