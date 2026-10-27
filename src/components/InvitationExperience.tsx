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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pageRef = useRef<WeddingPageHandle>(null);
  const [opened, setOpened] = useState(false);
  const [musicOn, setMusicOn] = useState(false);

  const handleOpen = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(wedding.musicUrl || "/music/beautiful-in-white.mp3");
      audioRef.current.loop = true;
      audioRef.current.preload = "auto";
    }
    const audio = audioRef.current;
    void audio.play().then(() => setMusicOn(true)).catch((error) => {
      console.log("Phát nhạc thất bại:", error);
      setMusicOn(false);
    });
    setOpened(true);
  };

  return (
    <>
      <WeddingPage ref={pageRef} wedding={wedding} audioRef={audioRef} musicOn={musicOn} onMusicOnChange={setMusicOn} />
      {!opened && <InvitationCover wedding={wedding} invitee={invitee} onOpen={handleOpen} />}
    </>
  );
}