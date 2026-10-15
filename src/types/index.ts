export type UserRole = 'customer' | 'shopkeeper' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  referralCode: string;
  referredBy?: string;
  pointsBalance: number;
  pendingPoints: number;
  avatarUrl?: string;
  status: 'active' | 'suspended';
  shopId?: string;
  createdAt: string;
}

export interface Shop {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  logo: string;
  banner: string;
  description: string;
  phone: string;
  address: string;
  rating: number;
  reviewCount: number;
  status: 'approved' | 'pending' | 'rejected' | 'suspended';
  rejectionReason?: string;
  suspensionReason?: string;
  additionalInfoRequested?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  deliveryPolicy: string;
  returnPolicy: string;
  cancellationPolicy?: string;
  category: string;
  contactPerson?: string;
  businessEmail?: string;
  tradeLicenseNumber?: string;
  taxIdNumber?: string;
  customerSupportPhone?: string;
  customerSupportEmail?: string;
  customerSupportHours?: string;
  emailNotificationEnabled?: boolean;
  orderSmsNotificationEnabled?: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  shopId: string;
  shopName: string;
  title: string;
  description: string;
  category: string;
  brand: string;
  price: number; // in BDT (৳)
  originalPrice?: number;
  discountPercent?: number;
  stock: number;
  images: string[];
  unit: string; // e.g. "500g", "1L", "1 pc"
  pointsEarned: number; // Product-specific point rule or 0 if using platform fallback
  canRedeemWithPoints: boolean;
  pointPrice?: number; // Cost in points for 100% point redemption
  isFeatured?: boolean;
  isTrending?: boolean;
  isBestSeller?: boolean;
  isLovoniyoOffer?: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
  shopId: string;
  shopName: string;
  unit: string;
  pointsEarnedPerUnit: number;
}

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refund_requested'
  | 'refunded';

export type PaymentMethod = 'cod' | 'bkash' | 'nagad' | 'rocket' | 'bank';

export type PaymentStatus = 'pending' | 'verified' | 'failed' | 'refunded';

export interface OrderAddress {
  fullName: string;
  phone: string;
  district: string;
  address: string;
  postalCode?: string;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: OrderAddress;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discountFromPoints: number;
  pointsUsed: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  orderStatus: OrderStatus;
  pointsEarned: number;
  pointsCredited: boolean;
  referralRewardCredited: boolean;
  createdAt: string;
  deliveredAt?: string;
  cancelReason?: string;
  refundReason?: string;
}

export type PointTransactionType =
  | 'order_earned'
  | 'referral_bonus'
  | 'checkout_discount'
  | 'product_redemption'
  | 'transfer_sent'
  | 'transfer_received'
  | 'refund_reversal'
  | 'admin_adjustment';

export interface PointTransaction {
  id: string;
  userId: string;
  type: PointTransactionType;
  points: number; // positive for credits, negative for debits
  relatedId?: string; // Order ID, Transfer Request ID, or Admin Action ID
  description: string;
  ruleSnapshot: string;
  status: 'completed' | 'reversed';
  createdAt: string;
}

export interface PointTransferRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  points: number;
  note?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
  processedAt?: string;
}

export interface ReferralRecord {
  id: string;
  referrerUserId: string;
  referrerCode: string;
  referredUserId: string;
  referredUserName: string;
  referredUserEmail: string;
  status: 'registered' | 'qualifying_order_completed' | 'reward_issued';
  qualifyingOrderId?: string;
  rewardPoints: number;
  createdAt: string;
  rewardedAt?: string;
}

export interface PointsConfig {
  pointsToBdtRate: number; // e.g. 0.50 means 1 point = ৳0.50
  defaultEarnPercent: number; // e.g. 5 means 5% of order subtotal converted to points
  referralBonusPoints: number; // points given to referrer on first delivered order
  allowCheckoutDiscount: boolean;
  maxCheckoutDiscountPercent: number; // e.g. 30% of order subtotal
  minPointsToRedeem: number;
  lastUpdated: string;
  updatedBy: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'points' | 'transfer' | 'system';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
