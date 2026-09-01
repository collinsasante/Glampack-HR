"use client";

import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { firebaseAuth } from "./firebase";
import { getMe, type Employee } from "./api/employees";

interface AuthContextValue {
  firebaseUser: User | null;
  employee: Employee | null;
  loading: boolean;
  error: string | null;
  refreshEmployee: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadEmployee() {
    try {
      setEmployee(await getMe());
      setError(null);
    } catch (err) {
      setEmployee(null);
      setError(err instanceof Error ? err.message : "Failed to load your employee record");
    }
  }

  useEffect(() => {
    // Successor to auth.js's sessionStorage.currentUser: Firebase remains the source
    // of truth for the credential, but the Employee record (role, department, ...)
    // always comes fresh from the API rather than a client-cached blob.
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      setFirebaseUser(user);
      if (user && user.emailVerified) {
        await loadEmployee();
      } else {
        setEmployee(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value: AuthContextValue = {
    firebaseUser,
    employee,
    loading,
    error,
    refreshEmployee: loadEmployee,
    signOut: () => firebaseSignOut(firebaseAuth),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
