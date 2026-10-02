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
  hindiName?: string | null;
  icon?: string | null;
  description?: string | null;
  active?: boolean;
  isActive?: boolean;
  sortOrder: number;
  subcategories?: ServiceSubCategory[];
  problems?: ServiceProblem[];
  _count?: {
    subcategories: number;
    problems: number;
  };
}

export interface ServiceSubCategory {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  hindiName?: string | null;
  icon?: string | null;
  description?: string | null;
  active: boolean;
  sortOrder: number;
  problems?: ServiceProblem[];
  _count?: {
    problems: number;
  };
}

export interface ServiceProblem {
  id: string;
  categoryId: string;
  subcategoryId: string;
  name: string;
  hindiName?: string | null;
  description?: string | null;
  estimatedDuration: number; // in minutes
  basePrice: number | string;
  minimumPrice: number | string;
  maximumPrice: number | string;
  workerPriceCeiling: number | string;
  pricingUnit?: string;
  labourCostMin?: number | string;
  labourCostMax?: number | string;
  inspectionFee?: number | string;
  platformFeeRate?: number | string;
  materialCostMin?: number | string;
  materialCostMax?: number | string;
  materialNote?: string | null;
  benchmarkSource?: string | null;
  active: boolean;
  sortOrder: number;
  category?: ServiceCategory;
  subcategory?: ServiceSubCategory;
}

export interface WorkerQuote {
  id: string;
  problemRequestId: string;
  workerId: string;
  quotedAmount: number | string;
  labourAmount: number | string;
  materialAmount: number | string;
  notes?: string | null;
  hasAdditionalWork: boolean;
  additionalWorkReason?: string | null;
  status: string;
  createdAt: string;
  worker?: {
    user: {
      name: string;
      avatarUrl?: string | null;
      phone?: string | null;
    };
    coop?: {
      name: string;
    };
  };
}

export interface MatchingWorker {
  workerId: string;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  coopName: string;
  city: string;
  experienceYears: number;
  rating: number;
  totalJobs: number;
  trade: string;
  skills?: string[];
  baseQuote: number;
  priceCeiling: number;
  isAvailable: boolean;
  isOnDuty: boolean;
  dutyState: "OFF_DUTY" | "AVAILABLE" | "BUSY" | "TRAVELLING" | "ON_JOB";
  isAvailableNow: boolean;
  approxDistanceKm?: number;
  distanceDisplay?: string;
}

export type ProblemRequestStatus = "DRAFT" | "SUBMITTED" | "CANCELLED";

export interface ProblemRequest {
  id: string;
  requestRef: string;
  consumerId: string;
  categoryId: string;
  category: ServiceCategory;
  subcategoryId: string;
  subcategory: ServiceSubCategory;
  problemId: string;
  problem: ServiceProblem;
  textDescription?: string | null;
  audioUrl?: string | null;
  audioDuration?: number | null;
  photos: string[];
  videoUrl?: string | null;
  additionalNotes?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  estimatedPriceMin: number | string;
  estimatedPriceMax: number | string;
  estimatedDuration: number;
  status: ProblemRequestStatus;
  createdAt: string;
  updatedAt: string;
  consumer?: {
    id: string;
    name: string;
    phone: string;
    avatarUrl?: string | null;
  };
}

export type OrderStatus =
  | "DRAFT"
  | "REQUESTED"
  | "ACCEPTED"
  | "REJECTED"
  | "NEGOTIATION"
  | "CONFIRMED"
  | "TRAVELLING"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "PAYMENT_PENDING"
  | "PAID";

export type BookingMode = "IMMEDIATE" | "SCHEDULED";

export interface Order {
  id: string;
  orderRef: string;
  consumerId: string;
  consumer?: {
    id: string;
    name: string;
    phone?: string;
    avatarUrl?: string | null;
    locale?: string;
  };
  workerId?: string | null;
  worker?: MatchingWorker | any;
  problemRequestId?: string | null;
  problemRequest?: ProblemRequest;
  categoryId: string;
  category?: ServiceCategory;
  subcategoryId: string;
  subcategory?: ServiceSubCategory;
  problemId: string;
  problem?: ServiceProblem;
  status: OrderStatus;
  bookingMode: BookingMode;
  scheduledAt?: string | null;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  approxDistanceKm?: number | null;
  approxArea?: string | null;
  isAddressMasked?: boolean;
  liveLocationActive?: boolean;
  problemTitle: string;
  textDescription?: string | null;
  audioUrl?: string | null;
  audioDuration?: number | null;
  photos: string[];
  videoUrl?: string | null;
  additionalNotes?: string | null;
  basePrice: number | string;
  estimatedPriceMin: number | string;
  estimatedPriceMax: number | string;
  workerPriceCeiling: number | string;
  quotedPrice?: number | string | null;
  finalPrice?: number | string | null;
  isPriceLocked?: boolean;
  priceConfirmedAt?: string | null;
  priceConfirmedById?: string | null;
  priceProposals?: OrderPriceProposal[];
  paymentStatus?: OrderPaymentStatus;
  grossAmount?: number | string | null;
  platformFee?: number | string;
  workerEarnings?: number | string | null;
  taxAmount?: number | string;
  otherDeductions?: number | string;
  workCompletedAt?: string | null;
  paymentCompletedAt?: string | null;
  paymentMethod?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  rejectionReason?: string | null;
  rejectionCustomNote?: string | null;
  rejectionNote?: string | null;
  rejectedAt?: string | null;
  acceptedAt?: string | null;
  cancelledAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory?: Array<{
    id: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    reason?: string | null;
    createdAt: string;
  }>;
}

export type OrderPaymentStatus =
  | "NOT_DUE"
  | "PAYMENT_PENDING"
  | "PAYMENT_PROCESSING"
  | "PAID"
  | "PAYMENT_FAILED"
  | "REFUNDED";

export interface OrderPaymentReceipt {
  orderId: string;
  orderRef: string;
  serviceTitle: string;
  workerName: string;
  workerAvatarUrl?: string | null;
  workerTrade?: string | null;
  consumerName: string;
  finalAmount: number;
  grossAmount: number;
  workerEarnings: number;
  platformFee: number;
  paymentStatus: OrderPaymentStatus;
  paymentMethod: string;
  paymentRef: string;
  razorpayPaymentId?: string | null;
  paidAt: string;
  completedAt: string;
}

export type ProposalParty = "WORKER" | "CONSUMER";
export type ProposalStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "COUNTERED";

export interface OrderPriceProposal {
  id: string;
  orderId: string;
  proposer: ProposalParty;
  proposerRole?: ProposalParty;
  proposerId?: string;
  amount: number;
  reason?: string | null;
  status: ProposalStatus;
  timestamp?: string;
  createdAt?: string;
}

export interface PriceHistoryResponse {
  orderId: string;
  orderRef: string;
  basePrice: number;
  estimatedPriceMin: number;
  estimatedPriceMax: number;
  workerPriceCeiling: number;
  quotedPrice?: number | null;
  finalPrice?: number | null;
  isPriceLocked: boolean;
  priceConfirmedAt?: string | null;
  proposals: Array<{
    id: string;
    proposer: ProposalParty;
    amount: number;
    reason?: string | null;
    status: ProposalStatus;
    timestamp: string;
  }>;
}

export type ActiveOperationalState =
  | "AVAILABLE"
  | "REQUEST_RECEIVED"
  | "ACCEPTED"
  | "TRAVELLING"
  | "ARRIVED"
  | "WORKING"
  | "COMPLETED"
  | "OFF_DUTY";

export interface LiveTrackingDestination {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isMasked: boolean;
  approxArea?: string | null;
  approxDistanceKm?: number | null;
}

export interface LiveTrackingWorker {
  id: string;
  name: string;
  avatarUrl?: string | null;
  phone?: string;
  rating?: number;
  dutyState?: string;
  vehicleType?: "SCOOTER" | "BIKE" | "CAR" | "WALK";
}

export interface LiveTrackingCurrentLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  updatedAt: string;
  isStale?: boolean;
}

export interface LiveTrackingRoute {
  coordinates: [number, number][];
  distanceKm: number;
  etaMinutes: number;
  etaTimestamp?: string;
  source: "OSRM" | "LOCAL_HAVERSINE";
}

export interface LiveTrackingData {
  orderId: string;
  orderRef: string;
  status: OrderStatus;
  bookingMode: BookingMode;
  scheduledAt: string | null;
  trackingActive: boolean;
  trackingReason?: string;
  destination: LiveTrackingDestination;
  worker?: LiveTrackingWorker | null;
  currentLocation?: LiveTrackingCurrentLocation | null;
  route?: LiveTrackingRoute | null;
}



