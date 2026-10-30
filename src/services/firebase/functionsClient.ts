import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { app, isFirebaseConfigured } from './config';

let functionsInstance: ReturnType<typeof getFunctions> | null = null;

if (isFirebaseConfigured() && app) {
  try {
    functionsInstance = getFunctions(app);
  } catch (err) {
    console.warn('Firebase Functions initialization note:', err);
  }
}

export interface AcceptTransferResult {
  success: boolean;
  pointsTransferred?: number;
  processedAt?: string;
  message?: string;
}

export interface DeclineTransferResult {
  success: boolean;
  processedAt?: string;
  message?: string;
}

/**
 * Call the trusted Cloud Function to accept a point transfer request.
 * Returns null if Cloud Functions is not configured or throws.
 */
export async function callAcceptPointTransfer(requestId: string): Promise<AcceptTransferResult | null> {
  if (!functionsInstance) return null;
  try {
    const fn = httpsCallable<{ requestId: string }, AcceptTransferResult>(
      functionsInstance,
      'acceptPointTransfer'
    );
    const result: HttpsCallableResult<AcceptTransferResult> = await fn({ requestId });
    return result.data;
  } catch (error: any) {
    console.warn('Cloud Function acceptPointTransfer call notice:', error?.code, error?.message);
    throw error;
  }
}

/**
 * Call the trusted Cloud Function to decline a point transfer request.
 * Returns null if Cloud Functions is not configured or throws.
 */
export async function callDeclinePointTransfer(requestId: string): Promise<DeclineTransferResult | null> {
  if (!functionsInstance) return null;
  try {
    const fn = httpsCallable<{ requestId: string }, DeclineTransferResult>(
      functionsInstance,
      'declinePointTransfer'
    );
    const result: HttpsCallableResult<DeclineTransferResult> = await fn({ requestId });
    return result.data;
  } catch (error: any) {
    console.warn('Cloud Function declinePointTransfer call notice:', error?.code, error?.message);
    throw error;
  }
}
