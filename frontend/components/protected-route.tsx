"use client";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const result = useAuthStore.persist.rehydrate();
    if (result && typeof result.then === "function") {
      result.then(() => setHydrated(true));
    } else {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace("/login");
    }
  }, [hydrated, token, router]);

  if (!hydrated) return null; // to avoid flicker

  return <>{children}</>;
}
