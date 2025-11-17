/**
 * Authentication Context using AWS Cognito
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signIn, signOut, signUp, confirmSignUp, getCurrentUser, fetchAuthSession, fetchUserAttributes, SignInOutput } from 'aws-amplify/auth';

interface User {
  userId: string;
  email: string;
  name?: string;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SignInOutput>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const attributes = await fetchUserAttributes();
      
      setUser({
        userId: currentUser.userId,
        email: attributes.email || currentUser.signInDetails?.loginId || '',
        name: attributes.name,
        emailVerified: attributes.email_verified === 'true',
      });
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    const result = await signIn({ username: email, password });
    await checkUser();
    return result;
  };

  const handleSignUp = async (email: string, password: string, name: string) => {
    // Generate a unique org_id for this user
    const orgId = `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          name,
          'custom:org_id': orgId,  // Set org_id on signup
        },
      },
    });
  };

  const handleConfirmSignUp = async (email: string, code: string) => {
    await confirmSignUp({ username: email, confirmationCode: code });
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  const getToken = async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || null;
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn: handleSignIn,
        signUp: handleSignUp,
        confirmSignUp: handleConfirmSignUp,
        signOut: handleSignOut,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

