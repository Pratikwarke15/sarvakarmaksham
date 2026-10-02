"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, CheckCircle2, Award, RefreshCw, X, Camera, Activity, Briefcase } from "lucide-react";
import { Rating } from "@/components/ui/rating";
import { formatCurrency } from "@/lib/utils";
import { apiGet, apiPatch } from "@/lib/api";
import { useToast } from "@/components/providers/ToastProvider";
import type { WorkerStatus } from "@/lib/types";
import { DigiLockerDemoFlow } from "@/components/verification/DigiLockerDemoFlow";
import { ProfilePhotoCapture } from "@/components/profile/ProfilePhotoCapture";
import { useAuthStore } from "@/store/authStore";

interface ProfileResp {
  id: string;
  status: WorkerStatus;
  dutyState?: "OFF_DUTY" | "AVAILABLE" | "BUSY" | "TRAVELLING" | "ON_JOB";
  isOnDuty?: boolean;
  isAvailable?: boolean;
  currentJob?: {
    id: string;
    bookingRef: string;
    status: string;
    scheduledAt?: string;
    service?: { name: string; categoryName: string };
  } | null;
  skillTags: string[];
  bio?: string;
  experienceYears: number;
  avgRating: number;
  totalJobs: number;
  totalEarnings: number;
  walletBalance: number;
  aadhaarVerified?: boolean;
  aadhaarName?: string;
  aadhaarDob?: string;
  aadhaarNumber?: string;
  digilockerRef?: string;
  kycDocumentUrl?: string;
  workAddress?: string;
  coop?: { name: string };
  user?: { name: string; phone: string; avatarUrl?: string };
  reviewsReceived?: { id: string; rating: number; comment?: string; author: { name: string } }[];
}

function dutyBadge(dutyState?: string) {
  switch (dutyState) {
    case "AVAILABLE":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 shadow-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Available Now</span>
        </span>
      );
    case "BUSY":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2.5 py-0.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span>Busy</span>
        </span>
      );
    case "TRAVELLING":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold px-2.5 py-0.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span>Travelling to Client</span>
        </span>
      );
    case "ON_JOB":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-bold px-2.5 py-0.5 shadow-xs">
          <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
          <span>On Job • Active Service</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2.5 py-0.5">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          <span>Off Duty</span>
        </span>
      );
  }
}

function statusBadge(status: WorkerStatus) {
  if (status === "VERIFIED") return <Badge variant="success">Verified Member</Badge>;
  if (status === "PENDING_ADMIN_APPROVAL") return <Badge variant="warning">Pending Approval</Badge>;
  return <Badge variant="danger">{status.replace(/_/g, " ")}</Badge>;
}

export default function WorkerProfilePage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [togglingDuty, setTogglingDuty] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; data: ProfileResp; error?: string }>("/workers/profile");
      if (res.success && res.data) {
        setProfile(res.data);
      } else {
        // Fallback to /auth/me
        const meRes = await apiGet<{ success: boolean; data: any }>("/auth/me");
        if (meRes.success && meRes.data) {
          const u = meRes.data;
          const wp = u.workerProfile || {};
          const duty: "OFF_DUTY" | "AVAILABLE" = wp.isOnDuty && wp.isAvailable ? "AVAILABLE" : "OFF_DUTY";
          setProfile({
            id: wp.id || u.id,
            status: wp.status || "VERIFIED",
            dutyState: wp.dutyState || duty,
            isOnDuty: wp.isOnDuty,
            isAvailable: wp.isAvailable,
            skillTags: wp.skillTags || ["General Services"],
            bio: wp.bio,
            experienceYears: wp.experienceYears || 1,
            avgRating: Number(wp.avgRating || 5),
            totalJobs: wp.totalJobs || 0,
            totalEarnings: Number(wp.totalEarnings || 0),
            walletBalance: Number(wp.walletBalance || 0),
            aadhaarVerified: wp.aadhaarVerified,
            aadhaarName: wp.aadhaarName || u.name,
            aadhaarDob: wp.aadhaarDob,
            aadhaarNumber: wp.aadhaarNumber,
            digilockerRef: wp.digilockerRef,
            kycDocumentUrl: wp.kycDocumentUrl,
            workAddress: wp.workAddress,
            coop: wp.coop,
            user: { name: u.name, phone: u.phone, avatarUrl: u.avatarUrl },
            reviewsReceived: wp.reviewsReceived || [],
          });
        }
      }
    } catch {
      // Local fallback from active auth session
      const authUser = useAuthStore.getState().user;
      if (authUser) {
        setProfile({
          id: authUser.id,
          status: "VERIFIED",
          dutyState: "OFF_DUTY",
          skillTags: ["Skilled Member"],
          experienceYears: 1,
          avgRating: 5,
          totalJobs: 0,
          totalEarnings: 0,
          walletBalance: 0,
          aadhaarVerified: false,
          user: { name: authUser.name, phone: authUser.phone, avatarUrl: authUser.avatarUrl },
          reviewsReceived: [],
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleToggleDuty = async () => {
    if (!profile) return;
    const isCurrentlyActive = profile.dutyState === "AVAILABLE" || profile.dutyState === "BUSY" || profile.dutyState === "TRAVELLING" || profile.dutyState === "ON_JOB";
    const nextOnDuty = !isCurrentlyActive;
    setTogglingDuty(true);
    try {
      const res = await apiPatch<{ success: boolean; data: any }>("/workers/availability", {
        isOnDuty: nextOnDuty,
        isAvailable: nextOnDuty,
      });
      if (res.success) {
        toast({
          title: nextOnDuty ? "You are now Available for Jobs" : "You are now Off Duty",
          variant: "success",
        });
        fetchProfile();
      } else {
        toast({ title: "Could not update duty state", variant: "danger" });
      }
    } catch (err: any) {
      toast({ title: err?.message || "Duty state change failed", variant: "danger" });
    } finally {
      setTogglingDuty(false);
    }
  };

  const handlePhotoCaptured = (url: string) => {
    if (profile?.user) {
      setProfile({
        ...profile,
        user: {
          ...profile.user,
          avatarUrl: url,
        },
      });
    }
    const store = useAuthStore.getState();
    if (store.user) {
      store.setUser({
        ...store.user,
        avatarUrl: url,
      });
    }
    setShowPhotoModal(false);
    toast({
      title: "Profile Photo Verified & Saved!",
      description: "Human face detected. Your profile photograph is now active.",
      variant: "success",
    });
    fetchProfile();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#800020]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-24 text-center text-gray-500">
        Profile not found. Please complete onboarding.
      </div>
    );
  }

  const initial = (profile.user?.name || "W").charAt(0).toUpperCase();
  const reviews = profile.reviewsReceived || [];

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 font-heading">My Profile</h1>
        {!profile.aadhaarVerified && (
          <button
            type="button"
            onClick={() => setShowVerifyModal(true)}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-[#800020] text-white px-4 py-2 text-xs font-bold shadow-sm hover:bg-[#68001a] transition"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Verify with DigiLocker</span>
          </button>
        )}
      </div>

      {/* DigiLocker Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-8">
            <DigiLockerDemoFlow
              userRole="WORKER"
              onSuccess={() => {
                fetchProfile();
                setShowVerifyModal(false);
              }}
              onCancel={() => setShowVerifyModal(false)}
            />
          </div>
        </div>
      )}

      {/* Profile Photo Capture Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Update Profile Photo
                </h3>
                <p className="text-xs text-slate-500">
                  Take a clear photo of yourself. Facial detection validates authenticity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ProfilePhotoCapture
              onPhotoCaptured={handlePhotoCaptured}
              initialPhotoUrl={profile.user?.avatarUrl}
              isPublicRegistration={false}
            />
          </div>
        </div>
      )}

      {/* Main Profile Header */}
      <Card className="overflow-hidden border border-slate-200/90 shadow-xs">
        <div className="h-2 bg-[#800020]" />
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Real Profile Photo with Camera Trigger */}
            <div className="relative group shrink-0">
              {profile.user?.avatarUrl ? (
                <img
                  src={profile.user.avatarUrl}
                  alt={profile.user?.name || "Worker"}
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-[#800020]/30 shadow-md shadow-[#800020]/10"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#800020]/10 text-2xl font-bold text-[#800020] border border-[#800020]/20">
                  {initial}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowPhotoModal(true)}
                className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#800020] text-white hover:bg-[#68001a] shadow-md border-2 border-white transition"
                title="Update Profile Photo"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-xl font-bold text-slate-900">{profile.user?.name}</CardTitle>
                {dutyBadge(profile.dutyState)}
                {profile.aadhaarVerified && (
                  <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>Aadhaar Verified</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">{profile.user?.phone}</p>
              {profile.coop?.name && <p className="text-xs text-slate-400 mt-0.5">{profile.coop.name}</p>}

              {/* Skills Tags */}
              {profile.skillTags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {profile.skillTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Dynamic Duty Toggle Button */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={togglingDuty || profile.status !== "VERIFIED"}
                  onClick={handleToggleDuty}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-xs ${
                    profile.dutyState === "AVAILABLE"
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                  } disabled:opacity-50`}
                >
                  {togglingDuty ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : profile.dutyState === "AVAILABLE" ? (
                    <span>Go Off Duty</span>
                  ) : (
                    <span>Go Available Now</span>
                  )}
                </button>
              </div>
            </div>
            <div className="self-start sm:self-center">
              {statusBadge(profile.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active Job Notice if working right now */}
          {profile.currentJob && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                  <span>Active Job In Progress</span>
                </span>
                <p className="text-[11px] text-blue-700">
                  {profile.currentJob.service?.name || "Gig Service"} • Ref: #{profile.currentJob.bookingRef}
                </p>
              </div>
              <span className="rounded-md bg-blue-100 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-800">
                {profile.currentJob.status}
              </span>
            </div>
          )}

          {profile.bio && <p className="text-sm text-gray-600">{profile.bio}</p>}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Experience</span>
              <p className="font-medium">{profile.experienceYears} years</p>
            </div>
            <div>
              <span className="text-gray-500">Total Jobs</span>
              <p className="font-medium">{profile.totalJobs}</p>
            </div>
            <div>
              <span className="text-gray-500">Total Earnings</span>
              <p className="font-medium">{formatCurrency(profile.totalEarnings)}</p>
            </div>
            <div>
              <span className="text-gray-500">Wallet Balance</span>
              <p className="font-medium">{formatCurrency(profile.walletBalance)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Data Distinction: User-Provided vs Verified Information */}
      <Card className="border border-[#800020]/20">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#800020]" />
            <CardTitle className="text-base">Identity & Verification Details</CardTitle>
          </div>
          {profile.aadhaarVerified ? (
            <button
              type="button"
              onClick={() => setShowVerifyModal(true)}
              className="text-xs text-[#800020] font-semibold hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Re-verify</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowVerifyModal(true)}
              className="text-xs font-bold text-[#800020] hover:underline"
            >
              Complete DigiLocker KYC →
            </button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 divide-y divide-slate-100 text-xs">
            {/* Name */}
            <div className="py-2 flex items-center justify-between">
              <div>
                <span className="text-slate-500">Full Name</span>
                <p className="text-[11px] text-slate-400">User Registered: {profile.user?.name}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900">
                  {profile.aadhaarName || profile.user?.name}
                </span>
                {profile.aadhaarVerified ? (
                  <span className="rounded-sm bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 text-[10px]">
                    ✓ Verified
                  </span>
                ) : (
                  <span className="rounded-sm bg-slate-200 text-slate-600 font-medium px-1.5 py-0.2 text-[10px]">
                    Self-reported
                  </span>
                )}
              </div>
            </div>

            {/* Date of Birth / Age */}
            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-500">Date of Birth / Age</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900">
                  {profile.aadhaarDob || "Not verified"}
                </span>
                {profile.aadhaarVerified && (
                  <span className="rounded-sm bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 text-[10px]">
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="py-2 flex items-start justify-between">
              <span className="text-slate-500 flex-shrink-0">Work / Registered Address</span>
              <div className="text-right pl-4">
                <p className="font-bold text-slate-900">
                  {profile.workAddress || "Address on record"}
                </p>
                {profile.aadhaarVerified && (
                  <span className="rounded-sm bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 text-[10px] inline-block mt-0.5">
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>

            {/* Aadhaar Reference */}
            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-500">Aadhaar Reference</span>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="font-bold text-slate-900">
                  {profile.aadhaarNumber || "Not linked"}
                </span>
                {profile.aadhaarVerified && (
                  <span className="rounded-sm bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 text-[10px]">
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>

            {/* Skill Certificate (Optional for Worker) */}
            <div className="py-2 flex items-center justify-between">
              <div>
                <span className="text-slate-500">Skill Certificate</span>
                <span className="text-[10px] text-slate-400 block font-normal">(Optional credential)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900">
                  {profile.kycDocumentUrl || "None provided"}
                </span>
                {profile.kycDocumentUrl && (
                  <span className="rounded-sm bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 text-[10px]">
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skill Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skill Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(profile.skillTags || []).map((s) => (
              <Badge key={s} variant="info">
                {s}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rating & Reviews */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rating & Reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">
                {profile.avgRating ? profile.avgRating.toFixed(1) : "—"}
              </p>
              <Rating value={profile.avgRating || 0} readonly size="sm" />
              <p className="mt-1 text-xs text-gray-400">{profile.totalJobs} jobs</p>
            </div>
          </div>
          {reviews.length > 0 ? (
            <div className="space-y-3 border-t pt-4">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.author?.name}</span>
                    <Rating value={r.rating} readonly size="sm" />
                  </div>
                  {r.comment && <p className="mt-1 text-sm text-gray-600">{r.comment}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="border-t pt-4 text-sm text-gray-400">No reviews yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
