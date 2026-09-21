"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CalendarCheck, Briefcase, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent } from "@/components/ui/card";
import { BookingCard } from "@/components/booking/BookingCard";
import { apiGet } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nProvider";
import type { Booking } from "@/lib/types";

const ACTIVE_STATUSES = ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS"];

export default function ConsumerDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; data: Booking[] }>("/bookings");
      if (res.success) setBookings(res.data || []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const recentBookings = bookings.slice(0, 3);
  const active = bookings.find((b) => ACTIVE_STATUSES.includes(b.status));

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">
          {t("consumer.welcome", { name: user?.name || "Guest" })}
        </h1>
        <p className="text-gray-500 mt-1">{t("consumer.whatToDo")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/consumer/book">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group border-gray-200">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{t("consumer.bookService")}</h3>
                <p className="text-sm text-gray-500">{t("consumer.bookServiceDesc")}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/consumer/bookings">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group border-gray-200">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                <Briefcase className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{t("consumer.viewBookings")}</h3>
                <p className="text-sm text-gray-500">{t("consumer.viewBookingsDesc")}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {active && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">{t("consumer.activeBooking")}</h2>
          <Card className="border-indigo-200 bg-indigo-50/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-indigo-600 animate-pulse" />
                <span className="font-medium text-indigo-900">
                  {active.service?.name || "Service"} — {active.status.replace("_", " ")}
                </span>
              </div>
              <p className="mt-2 text-sm text-indigo-700">
                {active.bookingRef} · {formatCurrency(active.quotedPrice)}
              </p>
              <Link
                href={`/consumer/bookings/${active.id}`}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline"
              >
                {t("consumer.trackBooking")} <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t("consumer.recentBookings")}</h2>
          <Link href="/consumer/bookings" className="text-sm text-indigo-600 hover:text-indigo-500">
            {t("consumer.viewAll")}
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
        ) : recentBookings.length > 0 ? (
          <div className="space-y-3">
            {recentBookings.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-white py-10 text-center text-gray-400">
            {t("consumer.noBookings")}
          </div>
        )}
      </div>
    </div>
  );
}
