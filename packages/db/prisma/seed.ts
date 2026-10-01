import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function uuid(): string {
  return crypto.randomUUID();
}

async function clearAll() {
  console.log('Clearing existing data...');
  await prisma.$executeRaw`TRUNCATE TABLE "Dispute" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Review" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "WalletTransaction" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "SocialSecurityVault" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Dividend" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Booking" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Service" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "CoOpServiceArea" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "CoopAdminProfile" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "WorkerProfile" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "ConsumerProfile" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "CoOp" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "User" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "OtpVerification" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "ServiceCategory" CASCADE`;
  console.log('All tables cleared.');
}

async function seedServiceCategories() {
  console.log('Seeding service categories...');
  const categories = [
    { name: 'Plumbing', slug: 'plumbing', icon: 'wrench', description: 'Pipe repair, bathroom fitting, and water system services', sortOrder: 1 },
    { name: 'Electrical', slug: 'electrical', icon: 'zap', description: 'Wiring, fan installation, switch repair, and electrical maintenance', sortOrder: 2 },
    { name: 'Cleaning', slug: 'cleaning', icon: 'sparkle', description: 'Home deep cleaning, office cleaning, and sanitation services', sortOrder: 3 },
    { name: 'Carpentry', slug: 'carpentry', icon: 'hammer', description: 'Furniture repair, woodwork, and home fixtures', sortOrder: 4 },
    { name: 'Painting', slug: 'painting', icon: 'brush', description: 'Interior and exterior wall painting, texture work', sortOrder: 5 },
    { name: 'AC Repair', slug: 'ac-repair', icon: 'snowflake', description: 'AC installation, servicing, gas refilling, and repair', sortOrder: 6 },
    { name: 'Pest Control', slug: 'pest-control', icon: 'bug', description: 'Termite treatment, cockroach control, and general pest management', sortOrder: 7 },
    { name: 'Gardening', slug: 'gardening', icon: 'leaf', description: 'Lawn maintenance, pruning, landscaping, and plant care', sortOrder: 8 },
    { name: 'Tailoring', slug: 'tailoring', icon: 'scissors', description: 'Alterations, custom stitching, and clothing repairs', sortOrder: 9 },
    { name: 'Cooking', slug: 'cooking', icon: 'chef-hat', description: 'Home cooking, tiffin service, and catering assistance', sortOrder: 10 },
  ];

  for (const cat of categories) {
    await prisma.serviceCategory.create({ data: cat });
  }
  console.log(`  Created ${categories.length} service categories.`);
}

interface CoopSeed {
  id: string;
  name: string;
  registrationNo: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  commissionRate: number;
}

async function seedCoops(): Promise<CoopSeed[]> {
  console.log('Seeding cooperatives...');
  const coops: CoopSeed[] = [
    {
      id: uuid(), name: 'Sahayata Seva Cooperative', registrationNo: 'COOP-DEL-2025-001',
      description: 'New Delhi cooperative serving the national capital region with trusted home services.',
      address: '42, Lajpat Nagar II, South Delhi', city: 'New Delhi', state: 'Delhi', pincode: '110024',
      latitude: 28.6139, longitude: 77.2090, radiusKm: 15, commissionRate: 4.5,
    },
    {
      id: uuid(), name: 'Jeevan Vikas Cooperative', registrationNo: 'COOP-MUM-2025-002',
      description: 'Mumbai cooperative empowering workers across the city of dreams.',
      address: '15, Andheri West, Off Link Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400053',
      latitude: 19.0760, longitude: 72.8777, radiusKm: 12, commissionRate: 4.0,
    },
    {
      id: uuid(), name: 'Sakhi Sahayog Cooperative', registrationNo: 'COOP-BLR-2025-003',
      description: 'Bangalore cooperative providing quality home services in the Silicon Valley of India.',
      address: '88, Indiranagar 100 Feet Road', city: 'Bangalore', state: 'Karnataka', pincode: '560038',
      latitude: 12.9716, longitude: 75.946, radiusKm: 10, commissionRate: 3.5,
    },
    {
      id: uuid(), name: 'Gramin Seva Sahakari', registrationNo: 'COOP-JAI-2025-004',
      description: 'Jaipur cooperative serving the Pink City and surrounding rural areas.',
      address: '23, Vaishali Nagar, Ajmer Road', city: 'Jaipur', state: 'Rajasthan', pincode: '302021',
      latitude: 26.9124, longitude: 75.7873, radiusKm: 18, commissionRate: 3.0,
    },
  ];

  for (const coop of coops) {
    await prisma.coOp.create({
      data: {
        id: coop.id, name: coop.name, registrationNo: coop.registrationNo,
        description: coop.description, address: coop.address, city: coop.city,
        state: coop.state, pincode: coop.pincode, latitude: coop.latitude,
        longitude: coop.longitude, radiusKm: coop.radiusKm,
        commissionRate: coop.commissionRate, maxCommissionRate: coop.commissionRate,
        isActive: true,
      },
    });
  }
  console.log(`  Created ${coops.length} cooperatives.`);
  return coops;
}

async function seedServices(coops: CoopSeed[]): Promise<Record<string, string[]>> {
  console.log('Seeding services...');
  const defs = [
    { categoryName: 'Plumbing', categorySlug: 'plumbing', name: 'Pipe Leak Repair', description: 'Fix leaking pipes in kitchen, bathroom, or anywhere in the house', basePrice: 500, unit: 'fixed', estimatedDuration: 60 },
    { categoryName: 'Electrical', categorySlug: 'electrical', name: 'House Wiring Repair', description: 'Diagnose and fix wiring issues, replace damaged wires', basePrice: 800, unit: 'fixed', estimatedDuration: 90 },
    { categoryName: 'Cleaning', categorySlug: 'cleaning', name: 'Home Deep Cleaning', description: 'Complete home deep cleaning including kitchen, bathrooms, and rooms', basePrice: 1200, unit: 'fixed', estimatedDuration: 240 },
    { categoryName: 'Carpentry', categorySlug: 'carpentry', name: 'Furniture Repair', description: 'Fix broken furniture, loose joints, and damaged woodwork', basePrice: 600, unit: 'fixed', estimatedDuration: 90 },
    { categoryName: 'Painting', categorySlug: 'painting', name: 'Room Painting (per room)', description: 'Interior wall painting for one standard room', basePrice: 1500, unit: 'fixed', estimatedDuration: 300 },
    { categoryName: 'AC Repair', categorySlug: 'ac-repair', name: 'AC Servicing', description: 'General AC servicing including gas check and filter cleaning', basePrice: 700, unit: 'fixed', estimatedDuration: 60 },
  ];

  const serviceMap: Record<string, string[]> = {};
  for (const coop of coops) {
    serviceMap[coop.id] = [];
    for (const svc of defs) {
      const id = uuid();
      await prisma.service.create({
        data: { id, coopId: coop.id, ...svc, isActive: true },
      });
      serviceMap[coop.id].push(id);
    }
  }
  console.log(`  Created ${Object.values(serviceMap).flat().length} services.`);
  return serviceMap;
}

interface WorkerSeed {
  userId: string;
  profileId: string;
  coopId: string;
  name: string;
  phone: string;
  skillTags: string[];
  lat: number;
  lng: number;
  avgRating: number;
  totalJobs: number;
  walletBalance: number;
  isOptedInSocialSecurity: boolean;
}

async function seedWorkers(coops: CoopSeed[]): Promise<WorkerSeed[]> {
  console.log('Seeding workers...');
  const passwordHash = await bcrypt.hash('password123', 10);
  const names = [
    { name: 'Ramesh Gupta', phone: '9876543201', skills: ['plumbing', 'electrical'] },
    { name: 'Suresh Yadav', phone: '9876543202', skills: ['cleaning', 'carpentry'] },
    { name: 'Deepak Verma', phone: '9876543203', skills: ['painting', 'ac-repair'] },
    { name: 'Anil Patil', phone: '9876543204', skills: ['plumbing', 'cleaning'] },
    { name: 'Vikram Singh', phone: '9876543205', skills: ['electrical', 'ac-repair'] },
    { name: 'Prakash Jadhav', phone: '9876543206', skills: ['carpentry', 'painting'] },
    { name: 'Kiran Reddy', phone: '9876543207', skills: ['plumbing', 'ac-repair'] },
    { name: 'Manoj Nair', phone: '9876543208', skills: ['electrical', 'cleaning'] },
    { name: 'Sathish Kumar', phone: '9876543209', skills: ['painting', 'carpentry'] },
    { name: 'Mohan Sharma', phone: '9876543210', skills: ['plumbing', 'electrical'] },
    { name: 'Bhanu Pratap', phone: '9876543211', skills: ['cleaning', 'painting'] },
    { name: 'Arun Meena', phone: '9876543212', skills: ['carpentry', 'ac-repair'] },
  ];
  const offsets = [
    [0.005, 0.003], [-0.004, 0.006], [0.002, -0.005],
    [-0.003, -0.004], [0.006, 0.002], [-0.002, 0.007],
    [0.004, -0.003], [-0.005, 0.005], [0.003, 0.004],
    [-0.006, 0.003], [0.001, -0.006], [0.007, -0.002],
  ];
  const ratings = [4.2, 4.5, 4.8, 4.1, 4.6, 3.9, 4.7, 4.3, 4.4, 4.0, 4.9, 3.7];
  const jobs = [145, 89, 200, 67, 134, 52, 178, 95, 112, 43, 167, 78];
  const wallets = [12000, 8500, 15000, 3200, 9800, 5600, 11400, 7200, 6900, 2100, 13500, 4800];

  const workers: WorkerSeed[] = [];
  for (let i = 0; i < 12; i++) {
    const coop = coops[Math.floor(i / 3)];
    const data = names[i];
    const [offLat, offLng] = offsets[i];
    const userId = uuid();
    const profileId = uuid();
    const lat = coop.latitude + offLat;
    const lng = coop.longitude + offLng;

    await prisma.user.create({
      data: { id: userId, phone: data.phone, name: data.name, role: 'WORKER', passwordHash, isActive: true },
    });
    await prisma.workerProfile.create({
      data: {
        id: profileId, userId, coopId: coop.id, status: 'VERIFIED', skillTags: data.skills,
        bio: `${data.name} is an experienced service professional with a track record of quality work.`,
        experienceYears: Math.floor(Math.random() * 10) + 2,
        latitude: lat, longitude: lng, isAvailable: true, isOnDuty: true,
        avgRating: ratings[i], totalJobs: jobs[i],
        totalEarnings: jobs[i] * 800, walletBalance: wallets[i],
        kycStatus: 'VERIFIED', aadhaarVerified: true,
      },
    });
    workers.push({
      userId, profileId, coopId: coop.id, name: data.name, phone: data.phone,
      skillTags: data.skills, lat, lng, avgRating: ratings[i], totalJobs: jobs[i],
      walletBalance: wallets[i], isOptedInSocialSecurity: i % 6 < 2,
    });
  }
  console.log(`  Created ${workers.length} workers.`);
  return workers;
}

interface ConsumerSeed {
  userId: string;
  profileId: string;
  name: string;
  phone: string;
  lat: number;
  lng: number;
  address: string;
}

async function seedConsumers(): Promise<ConsumerSeed[]> {
  console.log('Seeding consumers...');
  const passwordHash = await bcrypt.hash('password123', 10);
  const data: Omit<ConsumerSeed, 'userId' | 'profileId'>[] = [
    { name: 'Priya Malhotra', phone: '9812345601', lat: 28.6280, lng: 77.2195, address: '15, Sector 14, Dwarka, New Delhi - 110078' },
    { name: 'Amit Deshmukh', phone: '9812345602', lat: 19.0820, lng: 72.8890, address: 'Flat 402, Hill Road, Bandra West, Mumbai - 400050' },
    { name: 'Lakshmi Iyer', phone: '9812345603', lat: 12.9780, lng: 77.5980, address: '22, 5th Block, Koramangala, Bangalore - 560095' },
    { name: 'Neha Choudhary', phone: '9812345604', lat: 26.9200, lng: 75.7900, address: '7, Malviya Nagar, Jaipur - 302017' },
  ];
  const consumers: ConsumerSeed[] = [];
  for (const c of data) {
    const userId = uuid();
    const profileId = uuid();
    await prisma.user.create({
      data: { id: userId, phone: c.phone, name: c.name, role: 'CONSUMER', passwordHash, isActive: true },
    });
    await prisma.consumerProfile.create({
      data: { id: profileId, userId, defaultAddress: c.address, latitude: c.lat, longitude: c.lng },
    });
    consumers.push({ userId, profileId, ...c });
  }
  console.log(`  Created ${consumers.length} consumers.`);
  return consumers;
}

interface BookingSeed {
  id: string;
  bookingRef: string;
  consumerIdx: number;
  workerIdx: number;
  serviceId: string;
  coopIdx: number;
  status: string;
  quotedPrice: number;
  finalPrice: number | null;
  commissionRate: number;
  hasReview: boolean;
  hasDispute: boolean;
  scheduledDaysAgo: number;
}

async function seedBookings(
  coops: CoopSeed[], consumers: ConsumerSeed[], workers: WorkerSeed[], serviceMap: Record<string, string[]>,
): Promise<BookingSeed[]> {
  console.log('Seeding bookings...');
  const now = new Date();
  const templates: Omit<BookingSeed, 'serviceId'>[] = [
    { id: uuid(), bookingRef: 'BG-20260826-10001', consumerIdx: 0, workerIdx: 0, coopIdx: 0, status: 'COMPLETED', quotedPrice: 500, finalPrice: 500, commissionRate: 4.5, hasReview: true, hasDispute: false, scheduledDaysAgo: 10 },
    { id: uuid(), bookingRef: 'BG-20260826-10002', consumerIdx: 0, workerIdx: 1, coopIdx: 0, status: 'COMPLETED', quotedPrice: 1200, finalPrice: 1200, commissionRate: 4.5, hasReview: true, hasDispute: true, scheduledDaysAgo: 8 },
    { id: uuid(), bookingRef: 'BG-20260826-10003', consumerIdx: 0, workerIdx: 2, coopIdx: 0, status: 'IN_PROGRESS', quotedPrice: 1500, finalPrice: null, commissionRate: 4.5, hasReview: false, hasDispute: false, scheduledDaysAgo: 1 },
    { id: uuid(), bookingRef: 'BG-20260826-10004', consumerIdx: 0, workerIdx: 0, coopIdx: 0, status: 'PENDING', quotedPrice: 800, finalPrice: null, commissionRate: 4.5, hasReview: false, hasDispute: false, scheduledDaysAgo: 0 },
    { id: uuid(), bookingRef: 'BG-20260826-10005', consumerIdx: 0, workerIdx: 1, coopIdx: 0, status: 'ACCEPTED', quotedPrice: 2500, finalPrice: null, commissionRate: 4.5, hasReview: false, hasDispute: false, scheduledDaysAgo: 0 },
    { id: uuid(), bookingRef: 'BG-20260826-20001', consumerIdx: 1, workerIdx: 3, coopIdx: 1, status: 'COMPLETED', quotedPrice: 700, finalPrice: 700, commissionRate: 4.0, hasReview: true, hasDispute: false, scheduledDaysAgo: 12 },
    { id: uuid(), bookingRef: 'BG-20260826-20002', consumerIdx: 1, workerIdx: 4, coopIdx: 1, status: 'COMPLETED', quotedPrice: 1800, finalPrice: 1800, commissionRate: 4.0, hasReview: true, hasDispute: false, scheduledDaysAgo: 6 },
    { id: uuid(), bookingRef: 'BG-20260826-20003', consumerIdx: 1, workerIdx: 5, coopIdx: 1, status: 'IN_PROGRESS', quotedPrice: 600, finalPrice: null, commissionRate: 4.0, hasReview: false, hasDispute: false, scheduledDaysAgo: 1 },
    { id: uuid(), bookingRef: 'BG-20260826-20004', consumerIdx: 1, workerIdx: 3, coopIdx: 1, status: 'PENDING', quotedPrice: 3000, finalPrice: null, commissionRate: 4.0, hasReview: false, hasDispute: false, scheduledDaysAgo: 0 },
    { id: uuid(), bookingRef: 'BG-20260826-20005', consumerIdx: 1, workerIdx: 4, coopIdx: 1, status: 'EN_ROUTE', quotedPrice: 400, finalPrice: null, commissionRate: 4.0, hasReview: false, hasDispute: false, scheduledDaysAgo: 0 },
    { id: uuid(), bookingRef: 'BG-20260826-30001', consumerIdx: 2, workerIdx: 6, coopIdx: 2, status: 'COMPLETED', quotedPrice: 900, finalPrice: 900, commissionRate: 3.5, hasReview: true, hasDispute: false, scheduledDaysAgo: 15 },
    { id: uuid(), bookingRef: 'BG-20260826-30002', consumerIdx: 2, workerIdx: 7, coopIdx: 2, status: 'COMPLETED', quotedPrice: 400, finalPrice: 400, commissionRate: 3.5, hasReview: false, hasDispute: true, scheduledDaysAgo: 5 },
    { id: uuid(), bookingRef: 'BG-20260826-30003', consumerIdx: 2, workerIdx: 8, coopIdx: 2, status: 'COMPLETED', quotedPrice: 350, finalPrice: 350, commissionRate: 3.5, hasReview: true, hasDispute: false, scheduledDaysAgo: 3 },
    { id: uuid(), bookingRef: 'BG-20260826-30004', consumerIdx: 2, workerIdx: 6, coopIdx: 2, status: 'IN_PROGRESS', quotedPrice: 5000, finalPrice: null, commissionRate: 3.5, hasReview: false, hasDispute: false, scheduledDaysAgo: 1 },
    { id: uuid(), bookingRef: 'BG-20260826-30005', consumerIdx: 2, workerIdx: 7, coopIdx: 2, status: 'CANCELLED', quotedPrice: 250, finalPrice: null, commissionRate: 3.5, hasReview: false, hasDispute: false, scheduledDaysAgo: 2 },
    { id: uuid(), bookingRef: 'BG-20260826-40001', consumerIdx: 3, workerIdx: 9, coopIdx: 3, status: 'COMPLETED', quotedPrice: 400, finalPrice: 400, commissionRate: 3.0, hasReview: true, hasDispute: false, scheduledDaysAgo: 9 },
    { id: uuid(), bookingRef: 'BG-20260826-40002', consumerIdx: 3, workerIdx: 10, coopIdx: 3, status: 'COMPLETED', quotedPrice: 1500, finalPrice: 1500, commissionRate: 3.0, hasReview: false, hasDispute: false, scheduledDaysAgo: 4 },
    { id: uuid(), bookingRef: 'BG-20260826-40003', consumerIdx: 3, workerIdx: 11, coopIdx: 3, status: 'PENDING', quotedPrice: 800, finalPrice: null, commissionRate: 3.0, hasReview: false, hasDispute: false, scheduledDaysAgo: 0 },
    { id: uuid(), bookingRef: 'BG-20260826-40004', consumerIdx: 3, workerIdx: 9, coopIdx: 3, status: 'ACCEPTED', quotedPrice: 2500, finalPrice: null, commissionRate: 3.0, hasReview: false, hasDispute: false, scheduledDaysAgo: 0 },
    { id: uuid(), bookingRef: 'BG-20260826-40005', consumerIdx: 3, workerIdx: 10, coopIdx: 3, status: 'DISPUTED', quotedPrice: 600, finalPrice: null, commissionRate: 3.0, hasReview: false, hasDispute: true, scheduledDaysAgo: 7 },
  ];

  const result: BookingSeed[] = [];
  for (const t of templates) {
    const coopServices = serviceMap[coops[t.coopIdx].id] || [];
    const serviceId = coopServices[t.workerIdx % coopServices.length] || coopServices[0];
    const worker = workers[t.workerIdx];
    const consumer = consumers[t.consumerIdx];
    const scheduledAt = new Date(now);
    scheduledAt.setDate(scheduledAt.getDate() - t.scheduledDaysAgo);
    let startedAt: Date | null = null;
    let completedAt: Date | null = null;
    if (t.status !== 'PENDING' && t.status !== 'ACCEPTED') {
      startedAt = new Date(scheduledAt.getTime() + 3600000);
    }
    if (t.status === 'COMPLETED') {
      completedAt = new Date(scheduledAt.getTime() + 10800000);
    }
    const commissionAmount = t.finalPrice ? t.finalPrice * (t.commissionRate / 100) : null;
    const workerPayout = t.finalPrice && commissionAmount ? t.finalPrice - commissionAmount : null;
    const paymentStatus = t.status === 'COMPLETED' ? 'COMPLETED' : t.status === 'PENDING' ? 'PENDING' : 'PENDING';

    await prisma.booking.create({
      data: {
        id: t.id, bookingRef: t.bookingRef, consumerId: consumer.userId,
        workerId: worker.profileId, serviceId, status: t.status as any,
        scheduledAt, startedAt, completedAt,
        consumerLatitude: consumer.lat, consumerLongitude: consumer.lng,
        workerLatitude: worker.lat, workerLongitude: worker.lng,
        address: consumer.address, description: `Service request: ${t.status.toLowerCase()} booking`,
        quotedPrice: t.quotedPrice, finalPrice: t.finalPrice,
        commissionRate: t.commissionRate, commissionAmount, workerPayout,
        paymentStatus: paymentStatus as any,
        rating: t.hasReview ? 5 : null,
      },
    });
    result.push({ ...t, serviceId });
  }
  console.log(`  Created ${result.length} bookings.`);
  return result;
}

async function seedWalletTransactions(workers: WorkerSeed[], bookings: BookingSeed[]) {
  console.log('Seeding wallet transactions...');
  let count = 0;
  for (const b of bookings.filter(b => b.status === 'COMPLETED')) {
    const w = workers[b.workerIdx];
    const comm = b.finalPrice! * (b.commissionRate / 100);
    const payout = b.finalPrice! - comm;
    await prisma.walletTransaction.create({
      data: { id: uuid(), workerId: w.profileId, bookingId: b.id, type: 'PAYMENT', amount: payout, balanceAfter: w.walletBalance, description: `Payment for ${b.bookingRef}`, reference: `PAY-${b.bookingRef}` },
    });
    await prisma.walletTransaction.create({
      data: { id: uuid(), workerId: w.profileId, bookingId: b.id, type: 'COMMISSION', amount: -comm, balanceAfter: w.walletBalance - comm, description: `Commission for ${b.bookingRef}`, reference: `COMM-${b.bookingRef}` },
    });
    count += 2;
  }
  for (const i of [0, 2, 4, 7, 9]) {
    const w = workers[i];
    await prisma.walletTransaction.create({
      data: { id: uuid(), workerId: w.profileId, type: 'WALLET_TOPUP', amount: [2000, 5000, 3000, 1000, 4000][[0, 2, 4, 7, 9].indexOf(i)], balanceAfter: w.walletBalance, description: 'Wallet top-up via UPI', reference: `TOPUP-UPI-${Date.now()}-${i}` },
    });
    count++;
  }
  console.log(`  Created ${count} wallet transactions.`);
}

async function seedReviews(consumers: ConsumerSeed[], workers: WorkerSeed[], bookings: BookingSeed[]) {
  console.log('Seeding reviews...');
  const completed = bookings.filter(b => b.hasReview && b.status === 'COMPLETED');
  const comments = [
    'Excellent work, very professional. Will definitely hire again!',
    'Great service, finished on time and within budget. Highly recommended.',
    'Good quality work. Minor delay but overall satisfied with the result.',
    'Very skilled and polite worker. The repair was done perfectly.',
    'Satisfactory work. Could be better but acceptable for the price.',
  ];
  for (let i = 0; i < Math.min(completed.length, 5); i++) {
    const b = completed[i];
    await prisma.review.create({
      data: {
        id: uuid(), bookingId: b.id, authorId: consumers[b.consumerIdx].userId,
        workerId: workers[b.workerIdx].profileId, rating: i < 2 ? 5 : i < 4 ? 4 : 3,
        comment: comments[i], isPublic: true,
      },
    });
  }
  console.log('  Created 5 reviews.');
}

async function seedDisputes(bookings: BookingSeed[], consumers: ConsumerSeed[]) {
  console.log('Seeding disputes...');
  const disputed = bookings.filter(b => b.hasDispute);
  if (disputed.length > 0) {
    const b = disputed[0];
    await prisma.dispute.create({
      data: {
        id: uuid(), bookingId: b.id, raisedBy: consumers[b.consumerIdx].userId,
        status: 'OPEN', priority: 'HIGH', category: 'Quality Issue',
        description: 'The worker did not complete the cleaning as per the agreed scope.',
      },
    });
  }
  if (disputed.length > 1) {
    const b = disputed[1];
    await prisma.dispute.create({
      data: {
        id: uuid(), bookingId: b.id, raisedBy: consumers[b.consumerIdx].userId,
        status: 'RESOLVED', priority: 'MEDIUM', category: 'Delayed Service',
        description: 'The service was delayed by 3 hours without prior communication.',
        resolution: 'Apology issued and 10% discount voucher provided.',
        resolvedBy: 'system', resolvedAt: new Date(),
      },
    });
  }
  console.log('  Created 2 disputes.');
}

async function seedSocialSecurity(workers: WorkerSeed[]) {
  console.log('Seeding social security vaults...');
  const opted = workers.filter(w => w.isOptedInSocialSecurity);
  for (const w of opted) {
    for (const fundType of ['EMERGENCY_HEALTH', 'INSURANCE', 'WELFARE'] as const) {
      const contributed = Math.floor(Math.random() * 5000) + 500;
      const match = Math.floor(contributed * 0.3);
      await prisma.socialSecurityVault.create({
        data: { id: uuid(), workerId: w.profileId, fundType, totalContributed: contributed, employerMatch: match, balance: contributed + match, isOptedIn: true },
      });
    }
  }
  console.log(`  Created vaults for ${opted.length} workers.`);
}

async function main() {
  console.log('=== Starting database seed ===\n');
  await clearAll();
  await seedServiceCategories();
  const coops = await seedCoops();
  const serviceMap = await seedServices(coops);
  const workers = await seedWorkers(coops);
  const consumers = await seedConsumers();
  const bookings = await seedBookings(coops, consumers, workers, serviceMap);
  await seedWalletTransactions(workers, bookings);
  await seedReviews(consumers, workers, bookings);
  await seedDisputes(bookings, consumers);
  await seedSocialSecurity(workers);
  console.log('\n=== Seed completed! ===');
  console.log('Workers: 98765432XX / password123');
  console.log('Consumers: 98123456XX / password123');
}

main().catch(e => { console.error('Seed failed:', e); process.exit(1); }).finally(() => prisma.$disconnect());
