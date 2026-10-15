import { OrderItem, PointsConfig } from '../types';

/**
 * Format currency in Bangladeshi Taka (৳)
 */
export function formatBDT(amount: number): string {
  if (isNaN(amount)) return '৳0';
  return `৳${Math.round(amount).toLocaleString('en-BD')}`;
}

/**
 * Format points with a clean comma separator
 */
export function formatPoints(points: number): string {
  if (isNaN(points)) return '0';
  return Math.round(points).toLocaleString('en-US');
}

/**
 * Calculate the BDT discount value for a given number of REFERO Points
 */
export function pointsToBdt(points: number, rate: number): number {
  if (!points || points <= 0 || !rate || rate <= 0) return 0;
  return Number((points * rate).toFixed(2));
}

/**
 * Calculate how many points are needed for a specific BDT discount amount
 */
export function bdtToPoints(bdt: number, rate: number): number {
  if (!bdt || bdt <= 0 || !rate || rate <= 0) return 0;
  return Math.ceil(bdt / rate);
}

/**
 * Calculate purchase earned points according to prompt business rules:
 * Rule 1: Product-specific point rule takes highest priority.
 * Rule 2: Amount-based fallback rule if no product-specific rule exists.
 * Exclusions: Delivery charges and points-paid portion are excluded from earning!
 */
export function calculateEarnedPoints(
  items: OrderItem[],
  config: PointsConfig,
  discountFromPoints: number = 0
): number {
  let totalPoints = 0;
  let fallbackEligibleSubtotal = 0;

  for (const item of items) {
    if (item.pointsEarnedPerUnit > 0) {
      // Priority 1: Product-specific rule
      totalPoints += item.pointsEarnedPerUnit * item.quantity;
    } else {
      // Accumulate for fallback rule
      fallbackEligibleSubtotal += item.price * item.quantity;
    }
  }

  // Deduct the point discount portion from fallback-eligible subtotal proportionally
  const effectiveCashSubtotal = Math.max(0, fallbackEligibleSubtotal - discountFromPoints);

  // Priority 2: Amount-based fallback rate
  const fallbackPoints = Math.round((effectiveCashSubtotal * config.defaultEarnPercent) / 100);

  return totalPoints + fallbackPoints;
}

/**
 * Generate a friendly readable date string
 */
export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format timestamp with time
 */
export function formatDateTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return `${d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })} · ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return dateString;
  }
}
