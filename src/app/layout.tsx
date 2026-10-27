import type { Metadata, Viewport } from "next";
import { Lora } from "next/font/google";
import { siteUrl, wedding } from "@/config/wedding";
import "./globals.css";

const lora = Lora({
  subsets: ["latin", "vietnamese"],
  variable: "--font-lora",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `${wedding.bride} & ${wedding.groom} | Thiệp mời`,
  description: wedding.invitation,
  openGraph: {
    title: `${wedding.bride} & ${wedding.groom} | Thiệp mời`,
    description: wedding.invitation,
    type: "website",
    locale: "vi_VN",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Thiệp cưới" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${wedding.bride} & ${wedding.groom} | Thiệp mời`,
    description: wedding.invitation,
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf8f4",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={lora.variable}>
      <body>{children}</body>
    </html>
  );
}
