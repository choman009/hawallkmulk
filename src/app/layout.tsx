import type { Metadata, Viewport } from "next";
import "@fontsource/noto-kufi-arabic/400.css";
import "@fontsource/noto-kufi-arabic/500.css";
import "@fontsource/noto-kufi-arabic/600.css";
import "@fontsource/noto-kufi-arabic/700.css";
import "@fontsource/noto-sans-arabic/400.css";
import "@fontsource/noto-sans-arabic/500.css";
import "@fontsource/noto-sans-arabic/600.css";
import "@fontsource/noto-sans-arabic/700.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "Hawall mulk",
  applicationName: "Hawall mulk",
  appleWebApp: {
    capable: true,
    title: "Hawall mulk",
    statusBarStyle: "default",
  },
  description: "بەڕێوەبردنی موڵک، داواکاری و کاری ڕۆژانەی نووسینگەی هاوەڵ موڵک",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#ffffff" };
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ckb" dir="rtl" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
