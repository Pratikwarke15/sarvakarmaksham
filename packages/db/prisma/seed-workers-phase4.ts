import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== SEEDING PHASE 4 REAL COOPERATIVE WORKERS WITH DYNAMIC AVAILABILITY ===");

  const delhiCoop = await prisma.coOp.findFirst({
    where: { city: "New Delhi" },
  });

  if (!delhiCoop) {
    throw new Error("Delhi Cooperative not found. Ensure cooperatives are seeded.");
  }

  const passwordHash = await bcrypt.hash("password123", 10);

  const workerDefs = [
    {
      phone: "9876543201",
      name: "Ramesh Gupta",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
      skills: ["plumbing", "electrical", "pipe-leak-repair", "tap-repair"],
      experienceYears: 6,
      rating: 4.9,
      totalJobs: 142,
      lat: 28.6200,
      lng: 77.2100,
      dutyState: "AVAILABLE" as const,
      isOnDuty: true,
      isAvailable: true,
      bio: "Certified master plumber and electrician with Delhi Jal Board accreditation. Specialist in leak detection and bathroom fitting repairs.",
    },
    {
      phone: "9876543202",
      name: "Suresh Verma",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
      skills: ["plumbing", "drainage", "carpentry"],
      experienceYears: 8,
      rating: 4.8,
      totalJobs: 198,
      lat: 28.6380,
      lng: 77.2280,
      dutyState: "OFF_DUTY" as const,
      isOnDuty: false,
      isAvailable: false,
      bio: "Experienced cooperative sanitary installer. Available on scheduled request basis outside primary shift.",
    },
    {
      phone: "9876543203",
      name: "Anil Sharma",
      avatarUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80",
      skills: ["electrical", "ac-repair", "appliances", "plumbing"],
      experienceYears: 5,
      rating: 4.7,
      totalJobs: 89,
      lat: 28.6140,
      lng: 77.2100,
      dutyState: "BUSY" as const,
      isOnDuty: true,
      isAvailable: false,
      bio: "Govt ITI certified technician. Currently engaged in local cooperative inspection.",
    },
    {
      phone: "9876543204",
      name: "Prakash Meena",
      avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80",
      skills: ["plumbing", "cleaning", "sanitation"],
      experienceYears: 7,
      rating: 4.9,
      totalJobs: 167,
      lat: 28.6410,
      lng: 77.2050,
      dutyState: "TRAVELLING" as const,
      isOnDuty: true,
      isAvailable: false,
      bio: "High-speed emergency plumber equipped with cooperative toolkits and genuine brass replacement parts.",
    },
    {
      phone: "9876543205",
      name: "Sunita Devi",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
      skills: ["cleaning", "sanitation", "plumbing", "maintenance"],
      experienceYears: 5,
      rating: 4.95,
      totalJobs: 215,
      lat: 28.6220,
      lng: 77.2350,
      dutyState: "ON_JOB" as const,
      isOnDuty: true,
      isAvailable: false,
      bio: "Lead technician at Mahila Shramik Sahakari. Specialist in residential plumbing, sanitation, and deep clean restoration.",
    },
    {
      phone: "9876543206",
      name: "Vikram Yadav",
      avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80",
      skills: ["plumbing", "electrical", "carpentry", "maintenance"],
      experienceYears: 9,
      rating: 4.85,
      totalJobs: 254,
      lat: 28.6310,
      lng: 77.2150,
      dutyState: "AVAILABLE" as const,
      isOnDuty: true,
      isAvailable: true,
      bio: "Senior cooperative guild elder. 9+ years providing fair-trade certified home plumbing and electrical solutions across Delhi-NCR.",
    },
  ];

  for (const def of workerDefs) {
    const existingUser = await prisma.user.findUnique({
      where: { phone: def.phone },
      include: { workerProfile: true },
    });

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: def.name,
          avatarUrl: def.avatarUrl,
          role: "WORKER",
        },
      });

      if (existingUser.workerProfile) {
        await prisma.workerProfile.update({
          where: { id: existingUser.workerProfile.id },
          data: {
            coopId: delhiCoop.id,
            status: "VERIFIED",
            skillTags: def.skills,
            bio: def.bio,
            experienceYears: def.experienceYears,
            latitude: def.lat,
            longitude: def.lng,
            dutyState: def.dutyState,
            isOnDuty: def.isOnDuty,
            isAvailable: def.isAvailable,
            avgRating: def.rating,
            totalJobs: def.totalJobs,
          },
        });
        console.log(`  Updated worker: ${def.name} (${def.phone}) -> state: ${def.dutyState}`);
      }
    } else {
      const newUser = await prisma.user.create({
        data: {
          phone: def.phone,
          name: def.name,
          role: "WORKER",
          passwordHash,
          avatarUrl: def.avatarUrl,
          isActive: true,
        },
      });

      await prisma.workerProfile.create({
        data: {
          userId: newUser.id,
          coopId: delhiCoop.id,
          status: "VERIFIED",
          skillTags: def.skills,
          bio: def.bio,
          experienceYears: def.experienceYears,
          latitude: def.lat,
          longitude: def.lng,
          dutyState: def.dutyState,
          isOnDuty: def.isOnDuty,
          isAvailable: def.isAvailable,
          avgRating: def.rating,
          totalJobs: def.totalJobs,
          phoneVerified: true,
          kycStatus: "VERIFIED",
          aadhaarVerified: true,
          aadhaarName: def.name,
        },
      });
      console.log(`  Created worker: ${def.name} (${def.phone}) -> state: ${def.dutyState}`);
    }
  }

  console.log("=== PHASE 4 WORKER SEEDING COMPLETED SUCCESSFULLY ===");
}

main()
  .catch((err) => {
    console.error("Worker seeding failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
