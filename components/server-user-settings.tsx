"use client";

import { createContext, useContext } from "react";
import type { SerializedUserSettings } from "@/lib/user-settings";

const ServerUserSettingsContext = createContext<SerializedUserSettings | null>(null);

export function ServerUserSettingsProvider({
  value,
  children,
}: {
  value: SerializedUserSettings | null;
  children: React.ReactNode;
}) {
  return (
    <ServerUserSettingsContext.Provider value={value}>
      {children}
    </ServerUserSettingsContext.Provider>
  );
}

export function useServerUserSettings() {
  return useContext(ServerUserSettingsContext);
}

// — Context for RSC-loaded user settings (one read per navigation).
