"use client";

import { signOut } from "next-auth/react";
import { Icon } from "@/components/dc/icons";
import { cn } from "@/lib/cn";

/** Signs out and lands on /signed-out (P02), or wherever `to` says. */
export function SignOutButton({ className, to = "/signed-out", label = "Sign out" }: { className?: string; to?: string; label?: string }) {
  return <button type="button" onClick={() => signOut({ callbackUrl: to })} className={cn("dc-btn dc-btn-ghost", className)}><Icon name="logout" size={18} />{label}</button>;
}
