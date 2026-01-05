import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isFiniteNumber(n: any): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

export function formatPercent(value: any, digits: number = 0): string {
  if (!isFiniteNumber(value)) return `0%`
  const v = Math.max(0, Math.min(100, value))
  return `${v.toFixed(digits)}%`
}
