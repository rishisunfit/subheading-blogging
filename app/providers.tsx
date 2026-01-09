"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { DialogProvider } from "@/contexts/DialogContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DialogProvider>{children}</DialogProvider>
    </AuthProvider>
  );
}
