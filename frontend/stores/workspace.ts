"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string;
  credits: number;
  role?: string;
}

interface WorkspaceState {
  currentOrg: Org | null;
  setCurrentOrg: (org: Org | null) => void;
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentOrg: null,
      setCurrentOrg: (org) => set({ currentOrg: org }),
    }),
    { name: "lai-workspace" }
  )
);
