"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Calendar,
  Phone,
  Mail,
  User as UserIcon,
  RefreshCw,
  Home,
  Briefcase,
  AlertCircle,
  ExternalLink,
  Edit3,
} from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";
import { useToast } from "@/components/providers/ToastProvider";
import { DigiLockerDemoFlow } from "@/components/verification/DigiLockerDemoFlow";
import { detectLiveLocation } from "@/lib/location";
import { useAuthStore } from "@/store/authStore";

interface ConsumerProfileResp {
  id: string;
  userId: string;
  defaultAddress?: string;
  latitude?: number;
  longitude?: number;
  phoneVerified: boolean;
  kycStatus: string;
  aadhaarNumber?: string;
  aadhaarVerified?: boolean;
  aadhaarName?: string;
  aadhaarDob?: string;
  digilockerRef?: string;
  totalBookings?: number;
  activeBookings?: number;
  user?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    avatarUrl?: string;
    createdAt?: string;
  };
}

export default function ConsumerProfilePage() {
  const { toast } = useToast();
  const { user: authUser, validateToken } = useAuthStore();
  const [profile, setProfile] = useState<ConsumerProfileResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // Address edit state
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; data: ConsumerProfileResp; error?: string }>("/consumers/profile");
      if (res.success && res.data) {
        setProfile(res.data);
        if (res.data.defaultAddress) setAddressInput(res.data.defaultAddress);
      } else {
        // Fallback to /auth/me if specialized consumer route is unreachable
        const meRes = await apiGet<{ success: boolean; data: any }>("/auth/me");
        if (meRes.success && meRes.data) {
          const u = meRes.data;
          const cp = u.consumerProfile || {};
          setProfile({
            id: cp.id || u.id,
            userId: u.id,
            defaultAddress: cp.defaultAddress,
            latitude: cp.latitude,
            longitude: cp.longitude,
            phoneVerified: cp.phoneVerified ?? true,
            kycStatus: cp.kycStatus || "PENDING",
            aadhaarNumber: cp.aadhaarNumber,
            aadhaarVerified: cp.aadhaarVerified,
            aadhaarName: cp.aadhaarName || u.name,
            aadhaarDob: cp.aadhaarDob,
            digilockerRef: cp.digilockerRef,
            user: {
              id: u.id,
              name: u.name,
              phone: u.phone,
              email: u.email,
              avatarUrl: u.avatarUrl,
              createdAt: u.createdAt,
            },
          });
          if (cp.defaultAddress) setAddressInput(cp.defaultAddress);
        }
      }
    } catch {
      // Local fallback from auth state
      if (authUser) {
        setProfile({
          id: authUser.id,
          userId: authUser.id,
          phoneVerified: true,
          kycStatus: "VERIFIED",
          user: {
            id: authUser.id,
            name: authUser.name,
            phone: authUser.phone,
            email: authUser.email,
          },
        });
      }
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;
    setSavingAddress(true);
    try {
      const res = await apiPatch<{ success: boolean; data: any }>("/consumers/profile", {
        defaultAddress: addressInput.trim(),
      });
      if (res.success) {
        toast({ title: "Service Address Updated", variant: "success" });
        setEditingAddress(false);
        fetchProfile();
      } else {
        toast({ title: "Failed to update address", variant: "danger" });
      }
    } catch {
      toast({ title: "Error saving address", variant: "danger" });
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDetectGps = async () => {
    try {
      const loc = await detectLiveLocation();
      const newAddress = loc.streetAddress
        ? `${loc.streetAddress}, ${loc.city || ""}`
        : loc.displayName;
      setAddressInput(newAddress);
      toast({ title: "📍 GPS Location Detected", description: newAddress, variant: "success" });
    } catch {
      toast({ title: "GPS unavailable", description: "Please enter your address manually.", variant: "default" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#800020]" />
      </div>
    );
  }

  const initial = (profile?.user?.name || authUser?.name || "C").charAt(0).toUpperCase();
  const userName = profile?.user?.name || authUser?.name || "Consumer Member";
  const userPhone = profile?.user?.phone || authUser?.phone || "—";
  const userEmail = profile?.user?.email || authUser?.email || "No email specified";
  const isAadhaarVerified = Boolean(profile?.aadhaarVerified || profile?.aadhaarNumber);

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">My Consumer Profile</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage your household service details, verified identity & bookings.</p>
        </div>
        {!isAadhaarVerified && (
          <button
            type="button"
            onClick={() => setShowVerifyModal(true)}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-[#800020] text-white px-4 py-2 text-xs font-bold shadow-sm hover:bg-[#68001a] transition self-start sm:self-auto"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Verify with DigiLocker</span>
          </button>
        )}
      </div>

      {/* DigiLocker Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-8">
            <DigiLockerDemoFlow
              userRole="CONSUMER"
              initialData={{
                name: userName,
                address: profile?.defaultAddress,
                aadhaarNumber: profile?.aadhaarNumber,
              }}
              onSuccess={async () => {
                await validateToken();
                fetchProfile();
                setShowVerifyModal(false);
              }}
              onCancel={() => setShowVerifyModal(false)}
            />
          </div>
        </div>
      )}

      {/* Main Profile Identity Card */}
      <Card className="border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="h-2 bg-[#800020]" />
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#800020]/10 text-2xl font-bold text-[#800020] border border-[#800020]/20 shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-xl font-bold text-slate-900">{userName}</CardTitle>
                {isAadhaarVerified ? (
                  <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>Aadhaar Verified</span>
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5">
                    Unverified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <span>Household Consumer</span>
                <span>•</span>
                <span>Member since {profile?.user?.createdAt ? new Date(profile.user.createdAt).getFullYear() : "2026"}</span>
              </p>
            </div>
            <Badge variant="success" className="border-emerald-300 bg-emerald-50 text-emerald-900 font-bold self-start sm:self-center">
              Active Member
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Phone className="h-4 w-4 text-[#800020] shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Registered Mobile</span>
                <span className="font-semibold text-slate-800">{userPhone}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Mail className="h-4 w-4 text-[#800020] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-medium">Email Address</span>
                <span className="font-semibold text-slate-800 truncate block">{userEmail}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verified Aadhaar & DigiLocker Information */}
      <Card className="border border-slate-200/90 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#800020]" />
            <CardTitle className="text-base">Government UIDAI & DigiLocker Verification</CardTitle>
          </div>
          {isAadhaarVerified ? (
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
              className="text-xs text-[#800020] font-bold hover:underline"
            >
              Verify Now →
            </button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {isAadhaarVerified ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>UIDAI Aadhaar Verified Record</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                  Status: VERIFIED
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Aadhaar Legal Name</span>
                  <p className="font-bold text-slate-900">{profile?.aadhaarName || userName}</p>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Masked Aadhaar Number</span>
                  <p className="font-mono font-bold text-slate-900">{profile?.aadhaarNumber || "XXXX XXXX 6666"}</p>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Date of Birth</span>
                  <p className="font-medium text-slate-900">{profile?.aadhaarDob || "1994-08-15"}</p>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">DigiLocker Reference</span>
                  <p className="font-mono text-slate-700 text-[11px] truncate">{profile?.digilockerRef || "DL-UIDAI-VERIFIED"}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-950">Aadhaar Identity Not Yet Verified</p>
                  <p className="text-amber-800 mt-0.5 leading-relaxed">
                    Verify your Aadhaar with DigiLocker to unlock priority booking, instant cooperative escrow protection, and fair dispute handling.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVerifyModal(true)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-[#800020] text-white px-3.5 py-1.5 text-xs font-bold shadow-xs hover:bg-[#68001a] transition"
              >
                <span>Connect DigiLocker Gateway</span>
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Address & Colony Location */}
      <Card className="border border-slate-200/90 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-[#800020]" />
            <CardTitle className="text-base">Primary Service Address</CardTitle>
          </div>
          {!editingAddress && (
            <button
              type="button"
              onClick={() => setEditingAddress(true)}
              className="text-xs text-[#800020] font-semibold hover:underline inline-flex items-center gap-1"
            >
              <Edit3 className="h-3 w-3" />
              <span>Edit Address</span>
            </button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {editingAddress ? (
            <form onSubmit={handleSaveAddress} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Complete Address (House/Flat, Colony/Society, City, PIN)
                </label>
                <textarea
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-[#800020] focus:ring-1 focus:ring-[#800020] outline-none"
                  placeholder="e.g. Flat 304, Sahakar Enclave, Sector 14, Dwarka, New Delhi - 110078"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={savingAddress || !addressInput.trim()}
                  className="rounded-xl bg-[#800020] text-white px-4 py-1.5 text-xs font-bold hover:bg-[#68001a] transition disabled:opacity-50"
                >
                  {savingAddress ? "Saving..." : "Save Address"}
                </button>
                <button
                  type="button"
                  onClick={handleDetectGps}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
                >
                  <MapPin className="h-3.5 w-3.5 text-[#800020]" />
                  <span>Detect GPS Location</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAddress(false)}
                  className="text-xs text-slate-500 hover:underline px-2 py-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 flex items-start gap-3">
              <MapPin className="h-4 w-4 text-[#800020] shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-900">
                  {profile?.defaultAddress || "No address saved yet."}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Workers in your colony and cooperative zone will be matched to this address.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Household Booking Summary Card */}
      <Card className="border border-slate-200/90 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-[#800020]" />
            <CardTitle className="text-base">Household Service Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] font-medium">Total Bookings</span>
              <p className="text-lg font-bold text-slate-900">{profile?.totalBookings ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] font-medium">Active In-Progress</span>
              <p className="text-lg font-bold text-[#800020]">{profile?.activeBookings ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
              <span className="text-slate-400 block text-[10px] font-medium">Cooperative Escrow</span>
              <p className="text-xs font-bold text-emerald-700 mt-1">100% Protected</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/consumer/book"
              className="rounded-xl bg-[#800020] text-white px-4 py-2 text-xs font-bold hover:bg-[#68001a] transition inline-flex items-center gap-1.5"
            >
              <span>Book a Service</span>
            </Link>
            <Link
              href="/consumer/bookings"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition inline-flex items-center gap-1.5"
            >
              <span>View All Bookings</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
