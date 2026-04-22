import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-AR").format(n);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const safeDateStr = dateStr.includes("T") ? dateStr : dateStr + "T00:00:00";
  const date = new Date(safeDateStr);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function daysBetween(dateStr: string, now = new Date()): number {
  if (!dateStr) return 0;
  const safeDateStr = dateStr.includes("T") ? dateStr : dateStr + "T00:00:00";
  const date = new Date(safeDateStr);
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export function normalizeId(id: string | number | null | undefined): string {
  return String(id ?? "").trim().toLowerCase();
}

export function normalizeNumeric(v?: string | number | null): string {
  return String(v || "").replace(/[^0-9]/g, "");
}
