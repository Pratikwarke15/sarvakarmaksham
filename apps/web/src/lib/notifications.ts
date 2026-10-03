/**
 * Universal System / OS Notification Manager for Sarvakarmakshamah PWA
 * Handles browser & mobile OS notification bar alerts for:
 * - Incoming & ongoing voice calls
 * - Verification OTPs (login, register, forgot-password, DigiLocker)
 * - Booking updates & status changes
 * - New job requests for workers
 * - Communication consent alerts
 */

export interface SystemNotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: { url?: string; [key: string]: any };
  vibrate?: number[];
  requireInteraction?: boolean;
  silent?: boolean;
  renotify?: boolean;
}

export const isNotificationSupported = (): boolean => {
  return typeof window !== "undefined" && "Notification" in window;
};

export const getNotificationPermission = (): NotificationPermission => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
};

/**
 * Request OS / system notification permission from the user
 */
export const requestSystemNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      try {
        localStorage.setItem("sarva_notifications_enabled", "true");
      } catch (e) {}

      // Register / ensure Service Worker is ready
      if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.register("/sw.js").catch(() => {});
      }

      // Quick confirmation on system notification bar
      showSystemNotification("सर्वकर्मक्षमः Notifications Active 🟢", {
        body: "Real-time notifications enabled for calls, OTPs, and booking updates.",
        tag: "welcome-notification",
      });

      return true;
    }
    return false;
  } catch (err) {
    console.warn("Failed to request notification permission:", err);
    return false;
  }
};

/**
 * Display a real system/OS notification bar alert
 */
export const showSystemNotification = async (
  title: string,
  options?: SystemNotificationOptions
): Promise<boolean> => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  const iconUrl = options?.icon || "/icons/icon-192.png";
  const badgeUrl = options?.badge || "/icons/icon-192.png";
  const vibratePattern = options?.vibrate || [200, 100, 200];
  const urlToOpen = options?.data?.url || "/";

  // 1. Prefer Service Worker registration (guarantees OS notification bar on mobile & PWA)
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body: options?.body || "",
          icon: iconUrl,
          badge: badgeUrl,
          tag: options?.tag,
          data: { url: urlToOpen, ...options?.data },
          vibrate: vibratePattern,
          requireInteraction: options?.requireInteraction || false,
          renotify: options?.renotify ?? true,
          silent: options?.silent || false,
        } as NotificationOptions);
        return true;
      }
    } catch (swErr) {
      console.warn("ServiceWorker notification failed, falling back to window.Notification:", swErr);
    }
  }

  // 2. Fallback to standard window.Notification (desktop Chrome, Safari, Firefox)
  try {
    const notif = new Notification(title, {
      body: options?.body,
      icon: iconUrl,
      badge: badgeUrl,
      tag: options?.tag,
      requireInteraction: options?.requireInteraction || false,
    });

    notif.onclick = () => {
      window.focus();
      if (urlToOpen && typeof window !== "undefined") {
        window.location.href = urlToOpen;
      }
      notif.close();
    };

    return true;
  } catch (winErr) {
    console.warn("Window notification error:", winErr);
    return false;
  }
};

/**
 * Close/dismiss a system notification by tag
 */
export const closeSystemNotification = async (tag: string): Promise<void> => {
  if (typeof window === "undefined") return;

  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      const notifications = await reg.getNotifications({ tag });
      notifications.forEach((n) => n.close());
    } catch (e) {}
  }
};

/**
 * Specialized: Trigger Incoming Call System Notification
 */
export const notifyIncomingCall = (
  callerName: string,
  callId: string,
  orderId?: string
) => {
  showSystemNotification(`📞 Incoming Call: ${callerName || "Service Partner"}`, {
    body: "Tap to open and answer the voice call.",
    tag: `call-${callId}`,
    requireInteraction: true,
    renotify: true,
    vibrate: [350, 150, 350, 150, 350, 150, 350],
    data: {
      url: orderId ? `/consumer/bookings/${orderId}` : "/",
      type: "call",
      callId,
      orderId,
    },
  });
};

/**
 * Specialized: Trigger Verification OTP Notification
 */
export const notifyOtp = (code: string, context: string = "Verification") => {
  showSystemNotification(`🔐 ${context} OTP: ${code}`, {
    body: `Your verification code is ${code}. Valid for 10 minutes. Tap to view.`,
    tag: `otp-${Date.now()}`,
    renotify: true,
    vibrate: [250, 100, 250],
    data: {
      type: "otp",
      code,
    },
  });
};

/**
 * Specialized: Trigger Booking Status Update
 */
export const notifyBookingUpdate = (
  orderRef: string,
  status: string,
  extraMessage?: string,
  orderId?: string
) => {
  const statusLabels: Record<string, { title: string; defaultMsg: string }> = {
    ASSIGNED: {
      title: `🛠️ Technician Assigned (Order #${orderRef})`,
      defaultMsg: "A skilled technician has accepted your request.",
    },
    TRAVELLING: {
      title: `🚗 Technician on the Way (Order #${orderRef})`,
      defaultMsg: "Your technician has started travelling to your location.",
    },
    ARRIVED: {
      title: `📍 Technician Arrived (Order #${orderRef})`,
      defaultMsg: "Technician is now at your doorstep.",
    },
    IN_PROGRESS: {
      title: `⚙️ Work in Progress (Order #${orderRef})`,
      defaultMsg: "Service execution is currently underway.",
    },
    COMPLETED: {
      title: `✅ Service Completed (Order #${orderRef})`,
      defaultMsg: "Work is done. Please confirm completion OTP & payment.",
    },
    CANCELLED: {
      title: `❌ Booking Cancelled (Order #${orderRef})`,
      defaultMsg: "The booking has been cancelled.",
    },
  };

  const config = statusLabels[status] || {
    title: `📋 Booking Update (Order #${orderRef})`,
    defaultMsg: extraMessage || `Status changed to ${status}.`,
  };

  showSystemNotification(config.title, {
    body: extraMessage || config.defaultMsg,
    tag: `order-${orderId || orderRef}`,
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: orderId ? `/consumer/bookings/${orderId}` : "/consumer/bookings",
      orderId,
    },
  });
};

/**
 * Specialized: Trigger Worker Incoming Job Request Notification
 */
export const notifyBookingRequest = (
  category: string,
  consumerName?: string,
  orderId?: string
) => {
  showSystemNotification("⚡ New Service Job Request!", {
    body: `${consumerName || "A customer"} requested ${category || "General Services"}. Tap to review and accept.`,
    tag: `job-${orderId || Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    data: {
      url: "/worker/jobs",
      orderId,
    },
  });
};

/**
 * Specialized: Trigger Consent Update Notification
 */
export const notifyConsent = (
  title: string,
  message: string,
  orderId?: string
) => {
  showSystemNotification(title, {
    body: message,
    tag: `consent-${orderId || Date.now()}`,
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: orderId ? `/consumer/bookings/${orderId}` : "/",
    },
  });
};
