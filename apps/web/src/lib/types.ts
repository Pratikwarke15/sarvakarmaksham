export type UserRole = "CONSUMER" | "WORKER" | "COOP_ADMIN" | "MINISTRY_SUPER_ADMIN";

export type WorkerStatus =
  | "PENDING_ADMIN_APPROVAL"
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "SUSPENDED"
  | "DEACTIVATED";

export type BookingStatus =
  | "PENDING"
  | "ACCEPTED"
  | "EN_ROUTE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export type PaymentStatus = "PENDING" | "HELD_IN_ESCROW" | "COMPLETED" | "REFUNDED" | "FAILED";

export type TransactionType =
  | "PAYMENT"
  | "COMMISSION"
  | "PAYOUT"
  | "DIVIDEND"
  | "WALLET_TOPUP"
  | "WALLET_WITHDRAWAL"
  | "SOCIAL_SECURITY_DEDUCTION";

export type DisputeStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "ESCALATED" | "CLOSED";

export type DisputePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type SocialSecurityFundType =
  | "EMERGENCY_HEALTH"
  | "INSURANCE"
  | "WELFARE"
  | "EDUCATION"
  | "RETIREMENT";

export interface User {
  id: string;
  phone: string;
  email?: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  locale: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConsumerProfile {
  id: string;
  userId: string;
  defaultAddress?: string;
  latitude?: number;
  longitude?: number;
  savedAddresses?: Record<string, unknown>;
}

export interface WorkerProfile {
  id: string;
  userId: string;
  user: User;
  coopId?: string;
  coop?: CoOp;
  status: WorkerStatus;
  skillTags: string[];
  bio?: string;
  experienceYears: number;
  latitude?: number;
  longitude?: number;
  isAvailable: boolean;
  isOnDuty: boolean;
  avgRating: number;
  totalJobs: number;
  totalEarnings: number;
  walletBalance: number;
  kycStatus: string;
  aadhaarVerified: boolean;
}

export interface CoOp {
  id: string;
  name: string;
  registrationNo: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  commissionRate: number;
  maxCommissionRate: number;
  isActive: boolean;
}

export interface Service {
  id: string;
  coopId: string;
  coop?: CoOp;
  categoryName: string;
  categorySlug: string;
  name: string;
  description?: string;
  basePrice: number;
  unit: string;
  pricePerUnit?: number;
  minPrice?: number;
  maxPrice?: number;
  estimatedDuration?: number;
  isActive: boolean;
}

export interface Booking {
  id: string;
  bookingRef: string;
  consumerId: string;
  consumer?: User;
  workerId?: string;
  worker?: WorkerProfile;
  serviceId: string;
  service?: Service;
  status: BookingStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  consumerLatitude?: number;
  consumerLongitude?: number;
  latitude?: number;
  longitude?: number;
  workerLatitude?: number;
  workerLongitude?: number;
  address: string;
  description?: string;
  quotedPrice: number;
  finalPrice?: number;
  commissionRate: number;
  commissionAmount?: number;
  workerPayout?: number;
  paymentStatus: PaymentStatus;
  paymentRef?: string;
  rating?: number;
  review?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  workerId: string;
  bookingId?: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  description?: string;
  reference?: string;
  createdAt: string;
}

export interface Dividend {
  id: string;
  workerId: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  jobsCompleted: number;
  totalEarnings: number;
  patronagePoints: number;
  dividendAmount: number;
  status: string;
  paidAt?: string;
}

export interface SocialSecurityVault {
  id: string;
  workerId: string;
  fundType: SocialSecurityFundType;
  totalContributed: number;
  employerMatch: number;
  balance: number;
  isOptedIn: boolean;
}

export interface Review {
  id: string;
  bookingId: string;
  authorId: string;
  author?: User;
  workerId: string;
  rating: number;
  comment?: string;
  isPublic: boolean;
  createdAt: string;
}

export interface Dispute {
  id: string;
  bookingId: string;
  booking?: Booking;
  raisedBy: string;
  status: DisputeStatus;
  priority: DisputePriority;
  category: string;
  description: string;
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}
