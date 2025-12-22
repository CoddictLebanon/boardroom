"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";

interface PermissionContextType {
  permissions: Set<string>;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType>({
  permissions: new Set(),
  hasPermission: () => false,
  hasAnyPermission: () => false,
  isLoading: true,
  refresh: async () => {},
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface PermissionProviderProps {
  companyId: string;
  children: React.ReactNode;
}

export function PermissionProvider({ companyId, children }: PermissionProviderProps) {
  const { getToken, isSignedIn } = useAuth();
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!isSignedIn || !companyId) {
      setPermissions(new Set());
      setIsLoading(false);
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/my-permissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPermissions(new Set(data.permissions));
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, getToken, isSignedIn]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (code: string) => permissions.has(code),
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (codes: string[]) => codes.some((code) => permissions.has(code)),
    [permissions]
  );

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        hasPermission,
        hasAnyPermission,
        isLoading,
        refresh: fetchPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionContext);
}

export function usePermission(code: string): boolean {
  const { hasPermission, isLoading } = usePermissions();
  // Return false while loading to prevent flash of unauthorized content
  if (isLoading) return false;
  return hasPermission(code);
}
