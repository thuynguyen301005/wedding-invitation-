import type { Metadata } from "next";
import RsvpAdmin from "@/components/RsvpAdmin";

export const metadata: Metadata = {
  title: "Danh sách xác nhận tham dự",
  robots: { index: false, follow: false },
};

export default function RsvpAdminPage() {
  return <RsvpAdmin />;
}
