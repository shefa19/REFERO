/**
 * Deployable Firebase Cloud Functions for REFERO Backend Authority
 * Location: functions/src/index.ts
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Callable Function: acceptPointTransfer
 * Atomically executes and validates a Point Transfer request between Customer A and Customer B
 * Verifies Auth token, recipient identity, pending status, sender balance, ledger generation, and notifications.
 */
export const acceptPointTransfer = functions.https.onCall(
  async (data, context) => {
    // 1. Verify Authentication
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in to accept a point transfer.",
      );
    }

    const callerUid = context.auth.uid;
    const callerEmail = (context.auth.token.email || "").toLowerCase();
    const requestId = data?.requestId;

    if (!requestId || typeof requestId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Valid requestId is required.",
      );
    }

    return db.runTransaction(async (transaction) => {
      const requestRef = db.collection("pointTransferRequests").doc(requestId);
      const requestDoc = await transaction.get(requestRef);

      if (!requestDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Transfer request not found on server.",
        );
      }

      const reqData = requestDoc.data()!;

      // 2. Idempotency & Status check
      if (reqData.status !== "pending") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Transfer request cannot be processed; current status is ${reqData.status}.`,
        );
      }

      // 3. Recipient ownership check
      const isRecipient =
        reqData.recipientId === callerUid ||
        (reqData.recipientEmail &&
          reqData.recipientEmail.toLowerCase() === callerEmail);

      if (!isRecipient) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Unauthorized: Only the designated recipient can accept this transfer request.",
        );
      }

      // 4. Prevent self-acceptance
      if (reqData.senderId === callerUid) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "You cannot accept your own point transfer request.",
        );
      }

      const senderRef = db.collection("users").doc(reqData.senderId);
      const recipientRef = db.collection("users").doc(callerUid);

      const [senderDoc, recipientDoc] = await Promise.all([
        transaction.get(senderRef),
        transaction.get(recipientRef),
      ]);

      if (!senderDoc.exists || !recipientDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Sender or recipient user profile does not exist.",
        );
      }

      const senderData = senderDoc.data()!;
      const recipientData = recipientDoc.data()!;
      const senderBalance =
        typeof senderData.pointsBalance === "number"
          ? senderData.pointsBalance
          : typeof senderData.points === "number"
            ? senderData.points
            : 0;

      const transferPoints = Number(reqData.points);

      // 5. Authoritative balance validation
      if (senderBalance < transferPoints) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Sender has insufficient REFERO Points balance (${senderBalance} available, ${transferPoints} requested).`,
        );
      }

      const recipientBalance =
        typeof recipientData.pointsBalance === "number"
          ? recipientData.pointsBalance
          : typeof recipientData.points === "number"
            ? recipientData.points
            : 0;

      const timestamp = new Date().toISOString();

      // 6. Debit sender
      transaction.update(senderRef, {
        pointsBalance: senderBalance - transferPoints,
        points: senderBalance - transferPoints,
        updatedAt: timestamp,
      });

      // 7. Credit recipient
      transaction.update(recipientRef, {
        pointsBalance: recipientBalance + transferPoints,
        points: recipientBalance + transferPoints,
        updatedAt: timestamp,
      });

      // 8. Immutable Ledger - Sender (Debit)
      const senderLedger = db.collection("pointTransactions").doc();
      transaction.set(senderLedger, {
        id: senderLedger.id,
        userId: reqData.senderId,
        type: "transfer_sent",
        points: -transferPoints,
        relatedId: requestId,
        description: `Transferred points to ${recipientData.fullName || callerEmail}`,
        ruleSnapshot: "P2P Point Transfer",
        status: "completed",
        createdAt: timestamp,
      });

      // 9. Immutable Ledger - Recipient (Credit)
      const recipientLedger = db.collection("pointTransactions").doc();
      transaction.set(recipientLedger, {
        id: recipientLedger.id,
        userId: callerUid,
        type: "transfer_received",
        points: transferPoints,
        relatedId: requestId,
        description: `Received points transfer from ${senderData.fullName || reqData.senderEmail}`,
        ruleSnapshot: "P2P Point Transfer",
        status: "completed",
        createdAt: timestamp,
      });

      // 10. Update Transfer Request status to 'accepted'
      transaction.update(requestRef, {
        status: "accepted",
        recipientId: callerUid, // Link verified recipient UID
        processedAt: timestamp,
      });

      // 11. Event B: Notify Sender
      const senderNotifRef = db
        .collection("notifications")
        .doc(`notif_transfer_acc_${requestId}`);
      transaction.set(senderNotifRef, {
        id: `notif_transfer_acc_${requestId}`,
        userId: reqData.senderId,
        title: "Point Transfer Accepted",
        message: `${recipientData.fullName || callerEmail} accepted your transfer of ${transferPoints} REFERO Points.`,
        type: "transfer",
        link: "transfers",
        read: false,
        createdAt: timestamp,
      });

      return {
        success: true,
        pointsTransferred: transferPoints,
        processedAt: timestamp,
      };
    });
  },
);

/**
 * Callable Function: declinePointTransfer
 * Atomically marks a transfer request as rejected and notifies the sender.
 */
export const declinePointTransfer = functions.https.onCall(
  async (data, context) => {
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in to decline a point transfer.",
      );
    }

    const callerUid = context.auth.uid;
    const callerEmail = (context.auth.token.email || "").toLowerCase();
    const requestId = data?.requestId;

    if (!requestId || typeof requestId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Valid requestId is required.",
      );
    }

    const requestRef = db.collection("pointTransferRequests").doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Transfer request not found on server.",
      );
    }

    const reqData = requestDoc.data()!;

    if (reqData.status !== "pending") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Transfer request cannot be declined; current status is ${reqData.status}.`,
      );
    }

    const isRecipient =
      reqData.recipientId === callerUid ||
      (reqData.recipientEmail &&
        reqData.recipientEmail.toLowerCase() === callerEmail);

    if (!isRecipient) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Unauthorized: Only the designated recipient can decline this transfer request.",
      );
    }

    const timestamp = new Date().toISOString();

    await requestRef.update({
      status: "rejected",
      recipientId: callerUid,
      processedAt: timestamp,
    });

    // Notify Sender
    const notifRef = db
      .collection("notifications")
      .doc(`notif_transfer_dec_${requestId}`);
    await notifRef.set({
      id: `notif_transfer_dec_${requestId}`,
      userId: reqData.senderId,
      title: "Point Transfer Declined",
      message: `${reqData.recipientName || "Recipient"} declined your transfer request of ${reqData.points} REFERO Points.`,
      type: "transfer",
      link: "transfers",
      read: false,
      createdAt: timestamp,
    });

    return { success: true, processedAt: timestamp };
  },
);

/**
 * Triggered/Callable when an Order status changes to 'delivered'
 * Authoritatively credits purchase points and first-order referral bonus
 */
export const onOrderDelivered = functions.https.onCall(
  async (data, context) => {
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required.",
      );
    }

    const orderId = data?.orderId;
    if (!orderId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "orderId is required.",
      );
    }

    return db.runTransaction(async (transaction) => {
      const orderRef = db.collection("orders").doc(orderId);
      const orderDoc = await transaction.get(orderRef);

      if (!orderDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          `Order ${orderId} does not exist.`,
        );
      }

      const order = orderDoc.data()!;
      if (order.pointsCredited) {
        return {
          success: true,
          message: "Points already credited for this order.",
        };
      }

      const userRef = db.collection("users").doc(order.customerId);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          `Customer user ${order.customerId} does not exist.`,
        );
      }

      const userData = userDoc.data()!;
      const pointsToCredit = order.pointsEarned || 0;
      const timestamp = new Date().toISOString();

      // 1. Credit customer points
      if (pointsToCredit > 0) {
        transaction.update(userRef, {
          pointsBalance: (userData.pointsBalance || 0) + pointsToCredit,
          points: (userData.points || 0) + pointsToCredit,
          updatedAt: timestamp,
        });

        // Ledger entry
        const ledgerRef = db.collection("pointTransactions").doc();
        transaction.set(ledgerRef, {
          id: ledgerRef.id,
          userId: order.customerId,
          type: "order_earned",
          points: pointsToCredit,
          relatedId: orderId,
          description: `REFERO Points earned on order #${order.orderNumber}`,
          ruleSnapshot: "Delivered order loyalty points",
          status: "completed",
          createdAt: timestamp,
        });

        // Notification
        const notifRef = db.collection("notifications").doc();
        transaction.set(notifRef, {
          id: notifRef.id,
          userId: order.customerId,
          title: "Points Credited!",
          message: `You earned ${pointsToCredit} REFERO Points on delivered order #${order.orderNumber}!`,
          type: "points",
          link: "points",
          read: false,
          createdAt: timestamp,
        });
      }

      // 2. Referral bonus on first qualifying delivered order (Event D)
      if (!order.referralRewardCredited && userData.referredBy) {
        const referralQuery = await db
          .collection("referrals")
          .where("referredUserId", "==", order.customerId)
          .where("status", "==", "registered")
          .limit(1)
          .get();

        if (!referralQuery.empty) {
          const referralDoc = referralQuery.docs[0];
          const referralData = referralDoc.data();
          const referrerRef = db
            .collection("users")
            .doc(referralData.referrerUserId);
          const referrerDoc = await transaction.get(referrerRef);

          if (referrerDoc.exists) {
            const referrerData = referrerDoc.data()!;
            const bonus = referralData.rewardPoints || 150;

            // Credit referrer
            transaction.update(referrerRef, {
              pointsBalance: (referrerData.pointsBalance || 0) + bonus,
              points: (referrerData.points || 0) + bonus,
              updatedAt: timestamp,
            });

            // Ledger for referrer
            const referrerLedgerRef = db.collection("pointTransactions").doc();
            transaction.set(referrerLedgerRef, {
              id: referrerLedgerRef.id,
              userId: referralData.referrerUserId,
              type: "referral_bonus",
              points: bonus,
              relatedId: orderId,
              description: `Referral bonus: First delivered order by ${order.customerName}`,
              ruleSnapshot: `Referral bonus rule (${bonus} pts)`,
              status: "completed",
              createdAt: timestamp,
            });

            // Event D Notification for Referrer
            const refNotifRef = db.collection("notifications").doc();
            transaction.set(refNotifRef, {
              id: refNotifRef.id,
              userId: referralData.referrerUserId,
              title: "Referral Reward Credited! 🎉",
              message: `Congratulations! ${order.customerName} completed their first order. ${bonus} bonus REFERO Points have been added to your balance!`,
              type: "points",
              link: "referrals",
              read: false,
              createdAt: timestamp,
            });

            // Mark referral record as reward_issued
            transaction.update(referralDoc.ref, {
              status: "reward_issued",
              qualifyingOrderId: orderId,
              rewardedAt: timestamp,
            });
          }
        }
      }

      // Mark order as credited
      transaction.update(orderRef, {
        pointsCredited: true,
        referralRewardCredited: true,
        deliveredAt: timestamp,
      });

      return { success: true, pointsAwarded: pointsToCredit };
    });
  },
);

/**
 * Callable Function: reverseRefundPoints
 * Admin-only: Reverses points when an order is cancelled or refunded
 */
export const reverseRefundPoints = functions.https.onCall(
  async (data, context) => {
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Admin authentication required.",
      );
    }

    const callerUid = context.auth.uid;
    const adminEmail = context.auth.token?.email || "admin@refero.com.bd";

    // Verify Admin role
    const adminSnap = await db.collection("users").doc(callerUid).get();
    if (!adminSnap.exists || adminSnap.data()?.role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Super Administrator privileges required.",
      );
    }

    const orderId = data?.orderId;

    if (!orderId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "orderId is required.",
      );
    }

    return db.runTransaction(async (transaction) => {
      const orderRef = db.collection("orders").doc(orderId);
      const orderDoc = await transaction.get(orderRef);

      if (!orderDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Order not found.");
      }

      const order = orderDoc.data()!;
      const pointsToReverse = order.pointsEarned || 0;
      const timestamp = new Date().toISOString();

      if (order.pointsCredited && pointsToReverse > 0) {
        const userRef = db.collection("users").doc(order.customerId);
        const userDoc = await transaction.get(userRef);

        if (userDoc.exists) {
          const userData = userDoc.data()!;
          transaction.update(userRef, {
            pointsBalance: Math.max(
              0,
              (userData.pointsBalance || 0) - pointsToReverse,
            ),
            points: Math.max(0, (userData.points || 0) - pointsToReverse),
            updatedAt: timestamp,
          });

          // Add reversal ledger
          const ledgerRef = db.collection("pointTransactions").doc();
          transaction.set(ledgerRef, {
            id: ledgerRef.id,
            userId: order.customerId,
            type: "refund_reversal",
            points: -pointsToReverse,
            relatedId: orderId,
            description: `Point reversal for refunded/cancelled order #${order.orderNumber}`,
            ruleSnapshot: "Order refund reversal",
            status: "completed",
            createdAt: timestamp,
          });
        }
      }

      // Restore points if customer used points
      if (order.pointsUsed && order.pointsUsed > 0) {
        const userRef = db.collection("users").doc(order.customerId);
        const userDoc = await transaction.get(userRef);
        if (userDoc.exists) {
          const userData = userDoc.data()!;
          transaction.update(userRef, {
            pointsBalance: (userData.pointsBalance || 0) + order.pointsUsed,
            points: (userData.points || 0) + order.pointsUsed,
            updatedAt: timestamp,
          });

          const restoreLedger = db.collection("pointTransactions").doc();
          transaction.set(restoreLedger, {
            id: restoreLedger.id,
            userId: order.customerId,
            type: "admin_adjustment",
            points: order.pointsUsed,
            relatedId: orderId,
            description: `Restored points used on cancelled order #${order.orderNumber}`,
            ruleSnapshot: "Order cancellation refund",
            status: "completed",
            createdAt: timestamp,
          });
        }
      }

      transaction.update(orderRef, {
        orderStatus: "refunded",
        paymentStatus: "refunded",
      });

      const auditRef = db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        id: auditRef.id,
        adminId: callerUid,
        adminEmail,
        action: "ORDER_REFUND_POINTS_REVERSED",
        details: `Reversed ${pointsToReverse} points for order #${order.orderNumber}`,
        timestamp,
      });

      return { success: true };
    });
  },
);
