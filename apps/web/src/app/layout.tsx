import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { I18nProvider } from "@/i18n/I18nProvider";
import { SessionBootstrap } from "@/components/auth/SessionBootstrap";
import { VoiceCallProvider } from "@/components/calling/VoiceCallProvider";
import { NotificationPermissionBanner } from "@/components/notifications/NotificationPermissionBanner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "सर्वकर्मक्षमः - Cooperative Gig Services",
  description:
    "सर्वकर्मक्षमः (Sarvakarmakshamah) - Empowering local skilled workers through cooperative gig services with fair commissions, social security, and transparent governance.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "सर्वकर्मक्षमः" },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#800020",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${plusJakarta.variable} font-sans`}>
        <I18nProvider>
          <QueryProvider>
            <ToastProvider>
              <SessionBootstrap />
              <VoiceCallProvider>
                <NotificationPermissionBanner />
                {children}
              </VoiceCallProvider>
            </ToastProvider>
          </QueryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
