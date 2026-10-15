/**
 * Deployable Firebase Cloud Functions for REFERO Backend Authority
 * Location: functions/src/index.ts
 */

import * as admin from 'firebase-admin';

// Initialize admin if in Cloud Functions environment
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Triggered when an Order status changes to 'delivered'
 * Authoritatively credits purchase points and checks first-order referral bonus
 */
export async function onOrderDelivered(orderId: string) {
  return db.runTransaction(async (transaction) => {
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await transaction.get(orderRef);

    if (!orderDoc.exists) {
      throw new Error(`Order ${orderId} does not exist.`);
    }

    const order = orderDoc.data()!;
    if (order.pointsCredited) {
      return { success: true, message: 'Points already credited for this order.' };
    }

    const userRef = db.collection('users').doc(order.customerId);
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) {
      throw new Error(`User ${order.customerId} does not exist.`);
    }

    const userData = userDoc.data()!;
    const pointsToCredit = order.pointsEarned || 0;

    // 1. Credit points to customer
    if (pointsToCredit > 0) {
      transaction.update(userRef, {
        pointsBalance: (userData.pointsBalance || 0) + pointsToCredit,
      });

      // 2. Append immutable ledger entry
      const ledgerRef = db.collection('pointTransactions').doc();
      transaction.set(ledgerRef, {
        id: ledgerRef.id,
        userId: order.customerId,
        type: 'order_earned',
        points: pointsToCredit,
        relatedId: orderId,
        description: `REFERO Points earned on order #${order.orderNumber}`,
        ruleSnapshot: `Delivered order subtotal calculation`,
        status: 'completed',
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Check if this is the customer's first qualifying delivered order for a referral bonus
    if (!order.referralRewardCredited && userData.referredBy) {
      const referralQuery = await db
        .collection('referrals')
        .where('referredUserId', '==', order.customerId)
        .where('status', '==', 'registered')
        .limit(1)
        .get();

      if (!referralQuery.empty) {
        const referralDoc = referralQuery.docs[0];
        const referralData = referralDoc.data();
        const referrerRef = db.collection('users').doc(referralData.referrerUserId);
        const referrerDoc = await transaction.get(referrerRef);

        if (referrerDoc.exists) {
          const referrerData = referrerDoc.data()!;
          const bonus = referralData.rewardPoints || 150;

          // Credit referrer
          transaction.update(referrerRef, {
            pointsBalance: (referrerData.pointsBalance || 0) + bonus,
          });

          // Ledger for referrer
          const referrerLedgerRef = db.collection('pointTransactions').doc();
          transaction.set(referrerLedgerRef, {
            id: referrerLedgerRef.id,
            userId: referralData.referrerUserId,
            type: 'referral_bonus',
            points: bonus,
            relatedId: orderId,
            description: `Referral bonus: First delivered order by ${order.customerName}`,
            ruleSnapshot: `Referral bonus rule (${bonus} pts)`,
            status: 'completed',
            createdAt: new Date().toISOString(),
          });

          // Update referral record
          transaction.update(referralDoc.ref, {
            status: 'reward_issued',
            qualifyingOrderId: orderId,
            rewardedAt: new Date().toISOString(),
          });
        }
      }
    }

    // Mark order as credited
    transaction.update(orderRef, {
      pointsCredited: true,
      referralRewardCredited: true,
      deliveredAt: new Date().toISOString(),
    });

    return { success: true, pointsAwarded: pointsToCredit };
  });
}

/**
 * Atomically executes a Point Transfer request between Customer A and Customer B
 */
export async function executePointTransfer(requestId: string, approvingUserId: string) {
  return db.runTransaction(async (transaction) => {
    const requestRef = db.collection('pointTransferRequests').doc(requestId);
    const requestDoc = await transaction.get(requestRef);

    if (!requestDoc.exists) {
      throw new Error('Transfer request not found.');
    }

    const reqData = requestDoc.data()!;
    if (reqData.status !== 'pending') {
      throw new Error(`Request cannot be processed; current status is ${reqData.status}.`);
    }

    if (reqData.recipientId !== approvingUserId) {
      throw new Error('Only the recipient is authorized to approve this transfer request.');
    }

    const senderRef = db.collection('users').doc(reqData.senderId);
    const recipientRef = db.collection('users').doc(reqData.recipientId);

    const [senderDoc, recipientDoc] = await Promise.all([
      transaction.get(senderRef),
      transaction.get(recipientRef),
    ]);

    if (!senderDoc.exists || !recipientDoc.exists) {
      throw new Error('Sender or Recipient user profile does not exist.');
    }

    const senderData = senderDoc.data()!;
    const recipientData = recipientDoc.data()!;

    if (senderData.pointsBalance < reqData.points) {
      throw new Error('Sender has insufficient REFERO Points balance.');
    }

    // Debit sender
    transaction.update(senderRef, {
      pointsBalance: senderData.pointsBalance - reqData.points,
    });

    // Credit recipient
    transaction.update(recipientRef, {
      pointsBalance: recipientData.pointsBalance + reqData.points,
    });

    // Sender ledger entry (debit)
    const senderLedger = db.collection('pointTransactions').doc();
    transaction.set(senderLedger, {
      id: senderLedger.id,
      userId: reqData.senderId,
      type: 'transfer_sent',
      points: -reqData.points,
      relatedId: requestId,
      description: `Transferred points to ${recipientData.fullName} (${recipientData.email})`,
      ruleSnapshot: 'P2P Point Transfer',
      status: 'completed',
      createdAt: new Date().toISOString(),
    });

    // Recipient ledger entry (credit)
    const recipientLedger = db.collection('pointTransactions').doc();
    transaction.set(recipientLedger, {
      id: recipientLedger.id,
      userId: reqData.recipientId,
      type: 'transfer_received',
      points: reqData.points,
      relatedId: requestId,
      description: `Received points transfer from ${senderData.fullName} (${senderData.email})`,
      ruleSnapshot: 'P2P Point Transfer',
      status: 'completed',
      createdAt: new Date().toISOString(),
    });

    // Mark transfer request as approved
    transaction.update(requestRef, {
      status: 'approved',
      processedAt: new Date().toISOString(),
    });

    return { success: true };
  });
}

/**
 * Reverses earned points when an order is cancelled or refunded
 */
export async function reverseRefundPoints(orderId: string, adminId: string, adminEmail: string) {
  return db.runTransaction(async (transaction) => {
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await transaction.get(orderRef);

    if (!orderDoc.exists) {
      throw new Error('Order does not exist.');
    }

    const order = orderDoc.data()!;
    const pointsToReverse = order.pointsEarned || 0;

    if (order.pointsCredited && pointsToReverse > 0) {
      const userRef = db.collection('users').doc(order.customerId);
      const userDoc = await transaction.get(userRef);

      if (userDoc.exists) {
        const userData = userDoc.data()!;
        transaction.update(userRef, {
          pointsBalance: Math.max(0, (userData.pointsBalance || 0) - pointsToReverse),
        });

        // Add reversal ledger
        const ledgerRef = db.collection('pointTransactions').doc();
        transaction.set(ledgerRef, {
          id: ledgerRef.id,
          userId: order.customerId,
          type: 'refund_reversal',
          points: -pointsToReverse,
          relatedId: orderId,
          description: `Point reversal for refunded/cancelled order #${order.orderNumber}`,
          ruleSnapshot: `Order refund reversal rule`,
          status: 'completed',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Restore points if customer used points to pay for this order
    if (order.pointsUsed && order.pointsUsed > 0) {
      const userRef = db.collection('users').doc(order.customerId);
      const userDoc = await transaction.get(userRef);
      if (userDoc.exists) {
        const userData = userDoc.data()!;
        transaction.update(userRef, {
          pointsBalance: (userData.pointsBalance || 0) + order.pointsUsed,
        });

        const restoreLedger = db.collection('pointTransactions').doc();
        transaction.set(restoreLedger, {
          id: restoreLedger.id,
          userId: order.customerId,
          type: 'admin_adjustment',
          points: order.pointsUsed,
          relatedId: orderId,
          description: `Restored points used on cancelled order #${order.orderNumber}`,
          ruleSnapshot: `Order cancellation refund`,
          status: 'completed',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Update order status
    transaction.update(orderRef, {
      orderStatus: 'refunded',
      paymentStatus: 'refunded',
    });

    // Record audit log
    const auditRef = db.collection('auditLogs').doc();
    transaction.set(auditRef, {
      id: auditRef.id,
      adminId,
      adminEmail,
      action: 'ORDER_REFUND_POINTS_REVERSED',
      details: `Reversed ${pointsToReverse} points for order #${order.orderNumber}`,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  });
}
