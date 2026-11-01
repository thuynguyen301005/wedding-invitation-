import { wedding } from "@/config/wedding";
import WeddingPage from "@/components/WeddingPage";
import { connection } from "next/server";

export default async function Invitation() {
  await connection();
  return <WeddingPage wedding={wedding} />;
}
