/**
 * Utilities for managing guest bots
 */

const GUEST_ID_KEY = 'amana_guest_id';

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers/environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get or create a guest ID
 * Stores the guest ID in localStorage for persistence across sessions
 */
export function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') {
    // Server-side: generate a new guest ID
    return generateUUID();
  }

  // Client-side: check localStorage first
  let guestId = localStorage.getItem(GUEST_ID_KEY);
  
  if (!guestId) {
    // Generate new guest ID
    guestId = generateUUID();
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }
  
  return guestId;
}

/**
 * Get the current guest ID (returns null if not set)
 */
export function getGuestId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  return localStorage.getItem(GUEST_ID_KEY);
}

/**
 * Clear the guest ID (typically called after signup)
 */
export function clearGuestId(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.removeItem(GUEST_ID_KEY);
}

/**
 * Check if a bot is a guest bot
 */
export function isGuestBot(bot: { isGuest?: boolean; guestId?: string | null }): boolean {
  return bot.isGuest === true || !!bot.guestId;
}

