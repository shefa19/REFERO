/**
 * Formats Firebase Authentication error codes into polished, user-friendly messages.
 * Prevents raw technical codes like "Firebase: Error (auth/invalid-credential)" from being exposed.
 */
export function formatAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const raw = typeof error === 'string'
    ? error
    : (error.code || error.message || String(error));

  const lower = raw.toLowerCase();

  if (lower.includes('auth/invalid-credential') || lower.includes('auth/wrong-password')) {
    return 'The email or password is incorrect. Please try again.';
  }

  if (lower.includes('auth/user-not-found')) {
    return 'No account was found with this email. Please check your email or create an account.';
  }

  if (lower.includes('auth/email-already-in-use')) {
    return 'An account with this email already exists. Please sign in instead.';
  }

  if (lower.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }

  if (lower.includes('auth/weak-password')) {
    return 'Please choose a stronger password (at least 6 characters).';
  }

  if (lower.includes('auth/too-many-requests')) {
    return 'Too many attempts. Please wait a while and try again.';
  }

  if (lower.includes('auth/network-request-failed') || lower.includes('offline') || lower.includes('timeout')) {
    return "We couldn't connect right now. Please check your internet connection and try again.";
  }

  if (lower.includes('auth/user-disabled')) {
    return 'This account has been disabled. Please contact customer support.';
  }

  if (lower.includes('auth/operation-not-allowed')) {
    return 'Email and password sign-in is currently unavailable.';
  }

  if (lower.includes('auth/popup-closed-by-user')) {
    return 'Sign in was cancelled before completion.';
  }

  // Strip technical wrappers if any
  const cleaned = raw
    .replace(/^Firebase:\s*Error\s*\([^)]+\):?/i, '')
    .replace(/\(auth\/[^)]+\)/gi, '')
    .trim();

  return cleaned || 'Authentication failed. Please verify your details and try again.';
}
