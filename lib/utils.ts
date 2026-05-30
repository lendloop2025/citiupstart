import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEur(cents: number): string {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function formatBps(bps: number): string {
  return (bps / 100).toFixed(2) + "%";
}

export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-IE", { year: "numeric", month: "short", day: "numeric" });
}

export function getClientIp(headers: Headers): string {
  return headers.get("x-forwarded-for") ?? headers.get("x-real-ip") ?? "unknown";
}
