"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Company {
  id: string;
  name: string;
  logo: string | null;
}

interface CurrentCompanyStore {
  currentCompany: Company | null;
  setCurrentCompany: (company: Company | null) => void;
}

export const useCurrentCompany = create<CurrentCompanyStore>()(
  persist(
    (set) => ({
      currentCompany: null,
      setCurrentCompany: (company) => set({ currentCompany: company }),
    }),
    {
      name: "current-company",
    }
  )
);
