import type { Metadata } from "next";
import { connection } from "next/server";
import RsvpAdmin from "@/components/RsvpAdmin";

export const metadata: Metadata = {
  title: "Danh sách xác nhận tham dự",
  robots: { index: false, follow: false },
};

export default async function RsvpAdminPage() {
  await connection();
  return <RsvpAdmin />;
}
