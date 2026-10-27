"use client";

import { useRef, useState } from "react";
import type { wedding as WeddingConfig } from "@/config/wedding";
import InvitationCover from "@/components/InvitationCover";
import WeddingPage, { type WeddingPageHandle } from "@/components/WeddingPage";

type Wedding = typeof WeddingConfig;

export default function InvitationExperience({
  wedding,
  invitee,
}: {
  wedding: Wedding;
  invitee?: string;
}) {
  const pageRef = useRef<WeddingPageHandle>(null);
  const [opened, setOpened] = useState(false);

  const handleOpen = async () => {
    await pageRef.current?.playMusic();
    setOpened(true);
  };

  return (
    <>
      <WeddingPage ref={pageRef} wedding={wedding} />
      {!opened && <InvitationCover wedding={wedding} invitee={invitee} onOpen={handleOpen} />}
    </>
  );
}