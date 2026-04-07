import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * High-performance utility for tailwind class merging.
 * Matches standard Shadcn patterns.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
