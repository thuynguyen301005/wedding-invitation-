import { wedding } from "@/config/wedding";
import InvitationExperience from "@/components/InvitationExperience";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ to?: string | string[] }>;
}) {
  const invitee = (await searchParams).to;
  return (
    <InvitationExperience
      wedding={wedding}
      invitee={Array.isArray(invitee) ? invitee[0] : invitee}
    />
  );
}
