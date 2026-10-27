"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, useImperativeHandle } from "react";
import Image from "next/image";
import Guestbook from "@/components/Guestbook";
import type { wedding as WeddingConfig } from "@/config/wedding";

type Wedding = typeof WeddingConfig;
type Wish = { id: string; senderName: string; content: string; createdAt: string };
type FormState = "idle" | "sending" | "success" | "error";

function getDeviceToken(): string {
  try {
    const existing = localStorage.getItem("wedding-guest-token");
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const token = crypto.randomUUID();
    localStorage.setItem("wedding-guest-token", token);
    return token;
  } catch {
    return crypto.randomUUID();
  }
}

function useDraft<T>(key: string, initial: T) {
  const [value, setValue] = useState(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(key);
        if (saved) setValue(JSON.parse(saved) as T);
      } catch {
        // Draft storage is optional; the form remains usable when it is unavailable.
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Draft storage is optional; the form remains usable when it is unavailable.
    }
  }, [key, ready, value]);
  const clear = () => {
    setValue(initial);
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore unavailable local storage.
    }
  };
  return [value, setValue, clear] as const;
}

function Countdown({ dateTime }: { dateTime: string }) {
  const target = useMemo(() => new Date(dateTime).getTime(), [dateTime]);
  const [remaining, setRemaining] = useState(0);
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    const update = () => {
      const next = target - Date.now();
      setRemaining(Math.max(0, next));
      setArrived(next <= 0);
    };
    update();
    const timer = window.setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [target]);
  if (arrived) return <p className="countdown-arrived">Cảm ơn bạn đã đến chung vui</p>;
  const seconds = Math.floor(remaining / 1000);
  const units = [
    [Math.floor(seconds / 86400), "ngày"],
    [Math.floor((seconds % 86400) / 3600), "giờ"],
    [Math.floor((seconds % 3600) / 60), "phút"],
    [seconds % 60, "giây"],
  ] as const;
  return (
    <div className="countdown" aria-label="Thời gian còn lại đến ngày cưới">
      {units.map(([value, label]) => (
        <div className="countdown-unit" key={label}>
          <span>{String(value).padStart(2, "0")}</span>
          <small>{label}</small>
        </div>
      ))}
    </div>
  );
}

function WeddingCalendar({ dateTime }: { dateTime: string }) {
  const date = new Date(dateTime);
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const monthLabel = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(date);
  return (
    <div className="wedding-calendar" aria-label={`Lịch ${monthLabel}`}>
      <p className="calendar-month">{monthLabel}</p>
      <div className="calendar-grid calendar-weekdays" aria-hidden="true">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="calendar-grid">
        {Array.from({ length: firstDay }, (_, index) => <span className="calendar-empty" key={`blank-${index}`} />)}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          return (
            <span className={day === date.getDate() ? "calendar-day is-wedding-day" : "calendar-day"} key={day}>
              {day === date.getDate() ? <span aria-label="Ngày cưới">{day}</span> : day}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function BotanicalSprig({ className = "" }: { className?: string }) {
  return (
    <svg className={`botanical-sprig ${className}`} viewBox="0 0 160 300" fill="none" aria-hidden="true">
      <path d="M20 286C55 223 91 135 133 12M40 244C14 227 7 199 16 175C46 193 53 221 40 244ZM61 202C99 185 115 152 111 122C78 137 61 166 61 202ZM82 144C47 121 38 84 51 55C84 78 96 111 82 144ZM105 87C130 63 132 32 119 9C96 31 90 61 105 87Z" stroke="currentColor" strokeWidth="2" />
      <path d="M126 21C120 14 121 7 126 2C133 8 134 16 126 21ZM18 184C12 177 13 169 18 164C26 171 25 179 18 184ZM111 129C111 120 117 114 125 114C125 123 120 129 111 129Z" fill="#b49568" />
      <circle cx="126" cy="5" r="4" fill="#d0b37f" /><circle cx="133" cy="10" r="4" fill="#bfa171" /><circle cx="120" cy="12" r="4" fill="#d9c18f" />
      <circle cx="17" cy="166" r="4" fill="#d0b37f" /><circle cx="11" cy="173" r="4" fill="#bfa171" /><circle cx="23" cy="176" r="4" fill="#d9c18f" />
      <circle cx="125" cy="116" r="4" fill="#d0b37f" /><circle cx="130" cy="123" r="4" fill="#bfa171" /><circle cx="119" cy="123" r="4" fill="#d9c18f" />
    </svg>
  );
}

function Notice({ state, children }: { state: FormState; children: React.ReactNode }) {
  return (
    <p className={`notice notice-${state}`} role={state === "error" ? "alert" : "status"} aria-live="polite">
      {children}
    </p>
  );
}

export type WeddingPageHandle = { playMusic: () => Promise<void> };

const WeddingPage = forwardRef<WeddingPageHandle, { wedding: Wedding; invitee?: string; audioRef?: React.RefObject<HTMLAudioElement | null>; musicOn?: boolean; onMusicOnChange?: (value: boolean) => void }>(
  function WeddingPage({ wedding, audioRef: externalAudioRef, musicOn: musicOnProp, onMusicOnChange }, ref) {
  const [guestToken, setGuestToken] = useState("");
  const [hasPreviousRsvp, setHasPreviousRsvp] = useState(false);
  const [toast, setToast] = useState("");
  const [activeAlbumIndex, setActiveAlbumIndex] = useState(() => Math.max(0, Math.min(1, wedding.photos.length - 1)));
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [musicOnState, setMusicOnState] = useState(false);
  const musicOn = musicOnProp ?? musicOnState;
  const setMusicOn = onMusicOnChange ?? setMusicOnState;
  const [musicError, setMusicError] = useState("");
  const internalAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = externalAudioRef ?? internalAudioRef;
  const [rsvpDraft, setRsvpDraft, clearRsvpDraft] = useDraft("wedding-rsvp-draft", {
    name: "",
    attendanceStatus: "yes",
    guestCount: "2",
    message: "",
  });
  const [wishDraft, setWishDraft, clearWishDraft] = useDraft("wedding-wish-draft", { name: "", content: "" });
  const [rsvpState, setRsvpState] = useState<FormState>("idle");

  useEffect(() => {
    if (wedding.photos.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveAlbumIndex((index) => (index + 1) % wedding.photos.length);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [wedding.photos.length]);

  const [wishState, setWishState] = useState<FormState>("idle");
  const [rsvpMessage, setRsvpMessage] = useState("");
  const [rsvpErrors, setRsvpErrors] = useState<Record<string, string>>({});
  const [wishMessage, setWishMessage] = useState("");
  const [wishErrors, setWishErrors] = useState<Record<string, string>>({});
  const [wishes, setWishes] = useState<Wish[]>([]);
  const latestWishRef = useRef<HTMLElement | null>(null);
  const scrollToLatestWish = useRef(false);
  const [wishCursor, setWishCursor] = useState<string | null>(null);
  const [hasMoreWishes, setHasMoreWishes] = useState(false);
  const [loadingWishes, setLoadingWishes] = useState(true);
  const [wishesError, setWishesError] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [wishesHoneypot, setWishesHoneypot] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setGuestToken(getDeviceToken());
      try {
        setHasPreviousRsvp(localStorage.getItem("wedding-rsvp-saved") === "true");
      } catch {
        setHasPreviousRsvp(false);
      }
      const invitedName = new URLSearchParams(window.location.search).get("to")?.trim().slice(0, 60);
      if (invitedName) {
        setRsvpDraft((draft) => ({ ...draft, name: draft.name || invitedName }));
        setWishDraft((draft) => ({ ...draft, name: draft.name || invitedName }));
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [setRsvpDraft, setWishDraft]);

  useEffect(() => {
    void loadWishes();
  }, []);

  useEffect(() => {
    if (!scrollToLatestWish.current) return;
    scrollToLatestWish.current = false;
    latestWishRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [wishes]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function loadWishes(cursor?: string | null) {
    setLoadingWishes(true);
    setWishesError("");
    try {
      const url = cursor ? `/api/wishes?cursor=${encodeURIComponent(cursor)}` : "/api/wishes";
      const response = await fetch(url);
      const payload = (await response.json()) as { wishes?: Wish[]; nextCursor?: string | null; error?: string };
      if (!response.ok) throw new Error(payload.error || "Chưa thể tải lời chúc.");
      setWishes((current) => (cursor ? [...current, ...(payload.wishes || [])] : payload.wishes || []));
      setWishCursor(payload.nextCursor || null);
      setHasMoreWishes(Boolean(payload.nextCursor));
    } catch {
      setWishesError("Chưa thể tải lời chúc. Bạn vẫn có thể gửi lời chúc của mình.");
    } finally {
      setLoadingWishes(false);
    }
  }

  async function submitRsvp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRsvpErrors({});
    const name = rsvpDraft.name.trim();
    const message = rsvpDraft.message.trim();
    const currentGuestToken = guestToken || getDeviceToken();
    const errors: Record<string, string> = {};
    if (!name || name.length > 100) errors.name = "Vui lòng nhập họ tên (tối đa 100 ký tự).";
    if (rsvpDraft.attendanceStatus === "yes" && (!/^\d+$/.test(rsvpDraft.guestCount) || +rsvpDraft.guestCount < 1 || +rsvpDraft.guestCount > 10)) {
      errors.guestCount = "Số người tham dự từ 1 đến 10.";
    }
    if (message.length > 500) errors.message = "Lời nhắn tối đa 500 ký tự.";
    if (Object.keys(errors).length) {
      setRsvpErrors(errors);
      setRsvpState("error");
      return;
    }
    setRsvpState("sending");
    setRsvpMessage("Đang gửi xác nhận…");
    const keyStorage = "wedding-rsvp-idempotency-key";
    const fingerprint = JSON.stringify([
      name,
      rsvpDraft.attendanceStatus,
      rsvpDraft.attendanceStatus === "yes" ? Number(rsvpDraft.guestCount) : 0,
      message,
      currentGuestToken,
    ]);
    let idempotencyKey: string;
    try {
      const previous = JSON.parse(localStorage.getItem(keyStorage) || "null") as
        | { fingerprint: string; key: string }
        | null;
      idempotencyKey = previous?.fingerprint === fingerprint ? previous.key : crypto.randomUUID();
      localStorage.setItem(keyStorage, JSON.stringify({ fingerprint, key: idempotencyKey }));
    } catch {
      idempotencyKey = crypto.randomUUID();
    }
    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          attendanceStatus: rsvpDraft.attendanceStatus,
          guestCount: Number(rsvpDraft.guestCount),
          message,
          guestToken: currentGuestToken,
          idempotencyKey,
          website: honeypot,
        }),
      });
      const payload = (await response.json()) as {
        message?: string;
        error?: string;
        fields?: Record<string, string>;
        notificationStatus?: "sent" | "pending" | "failed" | "not_required";
      };
      if (!response.ok) {
        setRsvpErrors(payload.fields || {});
        throw new Error(payload.error || "Chưa thể gửi xác nhận. Vui lòng thử lại.");
      }
      setRsvpState("success");
      setRsvpMessage(
        payload.notificationStatus === "sent"
          ? "Đã ghi nhận xác nhận và gửi email đến cô dâu chú rể."
          : payload.notificationStatus === "failed"
            ? "Đã ghi nhận xác nhận nhưng email chưa gửi được. Vui lòng liên hệ trực tiếp với cô dâu chú rể."
            : payload.message || "Đã ghi nhận xác nhận của bạn.",
      );
      setHasPreviousRsvp(true);
      try {
        localStorage.setItem("wedding-rsvp-saved", "true");
      } catch {
        // Device storage is optional.
      }
      clearRsvpDraft();
      try {
        localStorage.removeItem(keyStorage);
      } catch {
        // Idempotency remains protected by the server-side token even without storage.
      }
    } catch (error) {
      setRsvpState("error");
      setRsvpMessage(error instanceof Error ? error.message : "Chưa thể gửi xác nhận. Vui lòng thử lại.");
    }
  }

  async function submitWish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWishErrors({});
    const name = wishDraft.name.trim();
    const content = wishDraft.content.trim();
    const currentGuestToken = guestToken || getDeviceToken();
    const errors: Record<string, string> = {};
    if (!name || name.length > 100) errors.name = "Vui lòng nhập tên (tối đa 100 ký tự).";
    if (!content || content.length > 500) errors.content = "Lời chúc cần có nội dung (tối đa 500 ký tự).";
    if (Object.keys(errors).length) {
      setWishErrors(errors);
      setWishState("error");
      return;
    }
    setWishState("sending");
    setWishMessage("Đang gửi lời chúc…");
    try {
      const response = await fetch("/api/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          content,
          guestToken: currentGuestToken,
          website: wishesHoneypot,
        }),
      });
      const payload = (await response.json()) as { wish?: Wish; error?: string; fields?: Record<string, string> };
      if (!response.ok || !payload.wish) {
        setWishErrors(payload.fields || {});
        throw new Error(payload.error || "Chưa thể gửi lời chúc. Vui lòng thử lại.");
      }
      scrollToLatestWish.current = true;
      setWishes((current) => [payload.wish!, ...current]);
      setWishState("success");
      setWishMessage("Lời chúc của bạn đã được gửi. Cảm ơn bạn!");
      clearWishDraft();
    } catch (error) {
      setWishState("error");
      setWishMessage(error instanceof Error ? error.message : "Chưa thể gửi lời chúc. Vui lòng thử lại.");
    }
  }

  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      setToast(successMessage);
    } catch {
      const selection = document.createElement("textarea");
      selection.value = value;
      selection.setAttribute("readonly", "");
      selection.className = "copy-fallback";
      document.body.appendChild(selection);
      selection.focus();
      selection.select();
      setToast("Không thể sao chép tự động. Văn bản đã được chọn để bạn sao chép.");
      selection.addEventListener("blur", () => selection.remove(), { once: true });
    }
  }

  const startMusic = useCallback(async () => {
    if (!wedding.musicUrl) {
      setMusicError("Nhạc nền chưa được cấu hình.");
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(wedding.musicUrl);
      audioRef.current.loop = true;
    }
    const audio = audioRef.current;
    try {
      await audio.play();
      setMusicOn(true);
      setMusicError("");
      try {
        localStorage.setItem("wedding-music-enabled", "true");
      } catch {
        // Preference storage is optional.
      }
    } catch {
      setMusicOn(false);
      setMusicError("Trình duyệt chưa cho phép phát nhạc. Bạn có thể tiếp tục sử dụng thiệp bình thường.");
    }
  }, [wedding.musicUrl]);

  async function toggleMusic() {
    if (!audioRef.current) {
      await startMusic();
      return;
    }
    const audio = audioRef.current;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    await startMusic();
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handlePlay = () => setMusicOn(true);
    const handlePause = () => setMusicOn(false);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [audioRef]);

  const directionsUrl = wedding.venue.googleMapsUrl;
  const calendarDate = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const calendarStart = new Date(wedding.dateTime);
  const calendarEnd = new Date(calendarStart.getTime() + 3 * 60 * 60 * 1000);
  const calendarUrl = `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action: "TEMPLATE",
    text: `Lễ cưới ${wedding.bride} & ${wedding.groom}`,
    dates: `${calendarDate(calendarStart)}/${calendarDate(calendarEnd)}`,
    details: wedding.invitation,
    location: wedding.venue.address,
    ctz: "Asia/Ho_Chi_Minh",
  }).toString()}`;
  return (
    <main className="wedding-shell">
      <div className="ambient-particles" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <span
            className={`ambient-particle ${index % 4 === 0 ? "ambient-flower" : "ambient-leaf"}`}
            key={index}
          />
        ))}
      </div>
      <header className="hero" id="home">
        <div className="hero-floating-leaves" aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => (
            <span className="hero-floating-leaf" key={index} />
          ))}
        </div>
        <svg className="botanical botanical-left" viewBox="0 0 180 470" fill="none" aria-hidden="true">
          <path d="M30 445C72 344 74 219 143 28M56 365C25 342 19 304 29 274C61 290 75 321 56 365ZM76 291C117 274 133 242 131 211C97 222 76 249 76 291ZM97 199C59 179 49 146 57 117C89 138 106 165 97 199ZM119 116C147 93 151 61 139 37C117 59 107 88 119 116Z" stroke="currentColor" strokeWidth="2" />
        </svg>
        <svg className="hero-landscape" viewBox="0 0 900 220" preserveAspectRatio="xMidYMax slice" fill="none" aria-hidden="true">
          <path d="M0 193h900M95 193v-55l63-42 66 42v55M117 193v-38h81v38M151 139v-30h17v30M267 193v-75l63-47 65 47v75M285 193v-49h90v49M307 144v49M353 144v49M430 193v-57l54-41 55 41v57M447 193v-38h72v38M571 193v-77l72-53 72 53v77M592 193v-50h102v50M618 143v50M668 143v50M765 193v-58l54-40 55 40v58M781 193v-38h76v38" stroke="currentColor" strokeWidth="3" />
          <path d="M0 211c122-18 216-13 330 0 111 13 237 9 340-1 90-9 154-7 230 1v9H0v-9Z" fill="currentColor" />
        </svg>
        <div className="hero-content">
          <span className="eyebrow">THE WEDDING OF</span>
          <h1><span className="hero-name">{wedding.groom}</span><span className="hero-ampersand">&</span><span className="hero-name">{wedding.bride}</span></h1>
          <div className="cover-photo">
            <div className="cover-photo-image">
              <Image
                src="/wedding-couple-portrait.png"
                alt={`Ảnh cưới của ${wedding.groom} và ${wedding.bride}`}
                fill
                priority
                sizes="(max-width: 520px) 72vw, 410px"
                style={{ objectFit: "cover", objectPosition: "center" }}
              />
            </div>
            <span className="cover-seal" aria-hidden="true">
              <Image
                src="/wax-heart-transparent.png"
                alt=""
                width={96}
                height={96}
                sizes="(max-width: 520px) 58px, 72px"
              />
            </span>
          </div>
        </div>
      </header>

      <section className="intro-section section" id="countdown">
        <article className="ceremony-card" id="details">
          <div className="ceremony-falling-leaves" aria-hidden="true">
            {Array.from({ length: 22 }, (_, index) => (
              <span className="ceremony-falling-leaf" key={index} />
            ))}
          </div>
          <svg className="ceremony-leaves" viewBox="0 0 180 470" fill="none" aria-hidden="true">
            <path d="M22 456C57 348 91 220 144 24M42 389C11 369 3 333 13 306C47 325 58 355 42 389ZM62 326C106 303 123 267 119 233C80 248 59 282 62 326ZM82 254C43 229 31 190 44 157C81 181 94 216 82 254ZM103 181C145 155 158 119 148 86C112 105 97 141 103 181ZM124 108C94 82 89 47 106 20C135 48 142 79 124 108Z" stroke="currentColor" strokeWidth="2" />
            <path d="m22 456 2-22m18-45 11-19m9-44 11-19m9-53 12-19m9-52 11-18m10-53 10-18m10-54 9-16" stroke="currentColor" strokeWidth="1.5" opacity=".7" />
          </svg>
          <BotanicalSprig className="ceremony-sprig" />
          <BotanicalSprig className="ceremony-sprig ceremony-sprig-right" />
          <p className="eyebrow rose">THÔNG TIN LỄ CƯỚI</p>
          <div className="family-grid" aria-label="Thông tin gia đình hai bên">
            {[
              { label: "Gia đình nhà trai", side: wedding.ceremonyCard.groomFamily },
              { label: "Gia đình nhà gái", side: wedding.ceremonyCard.brideFamily },
            ].map(({ label, side }) => (
              <div className="family-side" key={label} aria-label={label}>
                <span>Ông Bà</span>
                <div className="family-names">
                  {side.names.map((name) => <strong key={name}>{name}</strong>)}
                </div>
                <small>{side.address}</small>
              </div>
            ))}
          </div>
          <p className="ceremony-announcement">TRÂN TRỌNG BÁO TIN<br />{wedding.ceremonyLabel.toUpperCase()} CỦA CÁC CON CHÚNG TÔI</p>
          <div className="ceremony-couple-names">
            <div className="ceremony-person">
              <p>{wedding.ceremonyCard.groomName}</p>
            </div>
            <div className="ceremony-ampersand">&amp;</div>
            <div className="ceremony-person">
              <p>{wedding.ceremonyCard.brideName}</p>
            </div>
          </div>
          <div className="ceremony-event-details">
            <p>Lễ thành hôn được cử hành tại</p>
            <p>{wedding.ceremonyCard.location}</p>
          </div>
          <p className="ceremony-time-label">VÀO LÚC</p>
          <p className="ceremony-time">{wedding.ceremonyCard.time}</p>
          <div className="ceremony-date">
            <span>{new Intl.DateTimeFormat("vi-VN", { weekday: "long", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(wedding.dateTime)).toUpperCase()}</span>
            <i />
            <strong>{new Intl.DateTimeFormat("vi-VN", { day: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(wedding.dateTime))}</strong>
            <i />
            <span>{new Intl.DateTimeFormat("vi-VN", { month: "long", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(wedding.dateTime)).toUpperCase()}</span>
          </div>
          <p className="ceremony-year">{new Intl.DateTimeFormat("vi-VN", { year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(wedding.dateTime))}</p>
          <p className="lunar-date">(TỨC {wedding.ceremonyCard.lunarDate})</p>
        </article>
      </section>

      <section className="album-section section" id="story">
        <p className="eyebrow rose">OUR STORY</p>
        <h2>Album ảnh</h2>
        <div className="gallery-wrap">
          <div className="album-stage" role="region" aria-label="Album ảnh cưới">
            <button
              className="album-arrow album-arrow-prev"
              type="button"
              aria-label="Xem ảnh trước"
              onClick={() => setActiveAlbumIndex((index) => (index - 1 + wedding.photos.length) % wedding.photos.length)}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 19-7-7 7-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
            </button>
            {wedding.photos.map((photo, index) => {
              const relativeIndex = (index - activeAlbumIndex + wedding.photos.length) % wedding.photos.length;
              const position = relativeIndex === 0 ? "active" : relativeIndex === 1 ? "right" : relativeIndex === wedding.photos.length - 1 ? "left" : "hidden";
              return (
                <button
                  className={`album-card album-card-${position}`}
                  key={photo.src}
                  type="button"
                  aria-label={`Hiển thị ảnh ${index + 1}: ${photo.alt}`}
                  aria-pressed={index === activeAlbumIndex}
                  onClick={() => setActiveAlbumIndex(index)}
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    loading={index === activeAlbumIndex ? "eager" : "lazy"}
                    sizes="(max-width: 520px) 70vw, 350px"
                    fill
                    style={{ objectFit: "cover" }}
                  />
                </button>
              );
            })}
            <button
              className="album-arrow album-arrow-next"
              type="button"
              aria-label="Xem ảnh tiếp theo"
              onClick={() => setActiveAlbumIndex((index) => (index + 1) % wedding.photos.length)}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 7 7-7 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
            </button>
          </div>
          <div className="album-dots" role="group" aria-label="Chọn ảnh trong album">
            {wedding.photos.map((photo, index) => (
              <button
                className={`album-dot${index === activeAlbumIndex ? " is-active" : ""}`}
                key={photo.src}
                type="button"
                aria-label={`Đi tới ảnh ${index + 1}`}
                aria-pressed={index === activeAlbumIndex}
                onClick={() => setActiveAlbumIndex(index)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="details-section section" aria-labelledby="reception-title">
        <article className="reception-card">
          <BotanicalSprig className="reception-sprig reception-sprig-right" />
          <BotanicalSprig className="reception-sprig reception-sprig-left" />
          <p className="eyebrow rose">THÔNG TIN TIỆC CƯỚI</p>
          <h2 id="reception-title">Tiệc cưới sẽ diễn ra vào lúc:</h2>
          <p className="reception-time">{wedding.timeLabel}</p>
          <div className="reception-date">
            <span>{new Intl.DateTimeFormat("vi-VN", { weekday: "long", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(wedding.dateTime)).toUpperCase()}</span>
            <strong>{new Intl.DateTimeFormat("vi-VN", { day: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(wedding.dateTime))}</strong>
            <span>{new Intl.DateTimeFormat("vi-VN", { month: "long", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(wedding.dateTime)).toUpperCase()}</span>
          </div>
          <p className="ceremony-year">{new Intl.DateTimeFormat("vi-VN", { year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(wedding.dateTime))}</p>
          <p className="reception-lunar-date">(TỨC {wedding.ceremonyCard.lunarDate})</p>
          <div className="reception-countdown">
            <p>Cùng đếm ngược</p>
            <Countdown dateTime={wedding.dateTime} />
          </div>
          <WeddingCalendar dateTime={wedding.dateTime} />
          <div className="reception-actions">
            <a className="button button-outline calendar-button" href={calendarUrl} target="_blank" rel="noreferrer">Thêm vào lịch</a>
            <button className="button button-dark ceremony-rsvp" type="button" onClick={() => setRsvpOpen(true)}>Xác nhận tham dự</button>
          </div>
        </article>
      </section>

      <section className="venue-section section" id="venue">
        <div className="wedding-location">
          <h2>Tiệc cưới sẽ tổ chức tại</h2>
          <p className="wedding-location-name">{wedding.venue.name}</p>
          <div className="map-card">
            <div className="map-frame">
              <iframe
                title={`Bản đồ địa điểm cưới - ${wedding.venue.name}`}
                src={wedding.venue.mapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
          <a className="wedding-directions" href={directionsUrl} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m12 19 9 2-9-18-9 18 9-2Zm0 0v-8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            </svg>
            <span>Chỉ đường</span>
          </a>
        </div>
      </section>

      {/* RSVP moved to modal triggered by "Xác nhận tham dự" button */}

      <Guestbook />

      <footer className="site-footer"><span>{wedding.bride} & {wedding.groom}</span><span>{wedding.dateLabel}</span><a href="#home">Trở về đầu trang ↑</a></footer>

      <div className="floating-controls">
        <button className="floating-button" type="button" onClick={() => void toggleMusic()} aria-label={musicOn ? "Tắt nhạc nền" : "Bật nhạc nền"} aria-pressed={musicOn}>{musicOn ? "♫" : "♪"}</button>
        <a className="floating-button" href="#details" aria-label="Cuộn đến thông tin lễ cưới">⌖</a>
      </div>
      {musicError && <p className="music-status" role="status">{musicError}</p>}
      {rsvpOpen && (
        <div className="rsvp-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setRsvpOpen(false)}>
          <div className="rsvp-modal" onClick={(event) => event.stopPropagation()}>
            <button className="rsvp-modal-close" type="button" onClick={() => setRsvpOpen(false)} aria-label="Đóng">×</button>
            <p className="eyebrow">THƯ MỜI</p>
            <h2>Xác nhận tham dự</h2>
            <p className="rsvp-modal-subtitle">Vui lòng xác nhận để chúng mình chuẩn bị chu đáo hơn nhé.</p>
            <form className="rsvp-form" onSubmit={submitRsvp} noValidate>
              <div className="field">
                <label htmlFor="rsvp-name">Họ và tên <span>*</span></label>
                <input
                  id="rsvp-name"
                  autoComplete="name"
                  maxLength={100}
                  value={rsvpDraft.name}
                  onChange={(event) => setRsvpDraft({ ...rsvpDraft, name: event.target.value })}
                  aria-invalid={Boolean(rsvpErrors.name)}
                />
                {rsvpErrors.name && <small className="field-error">{rsvpErrors.name}</small>}
              </div>
              <fieldset className="field">
                <legend>Bạn sẽ đến chứ? <span>*</span></legend>
                <div className="radio-options">
                  <label><input type="radio" name="attendance" value="yes" checked={rsvpDraft.attendanceStatus === "yes"} onChange={() => setRsvpDraft({ ...rsvpDraft, attendanceStatus: "yes" })} /><span>Chắc chắn tham dự</span></label>
                  <label><input type="radio" name="attendance" value="no" checked={rsvpDraft.attendanceStatus === "no"} onChange={() => setRsvpDraft({ ...rsvpDraft, attendanceStatus: "no" })} /><span>Rất tiếc, không thể</span></label>
                </div>
              </fieldset>
              {rsvpDraft.attendanceStatus === "yes" && (
                <div className="field">
                  <label htmlFor="guest-count">Số người <span>*</span></label>
                  <select
                    id="guest-count"
                    value={rsvpDraft.guestCount}
                    onChange={(event) => setRsvpDraft({ ...rsvpDraft, guestCount: event.target.value })}
                  >
                    {Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} người</option>)}
                  </select>
                </div>
              )}
              <div className="field">
                <label htmlFor="rsvp-message">Lời nhắn <span className="optional">(không bắt buộc)</span></label>
                <textarea
                  id="rsvp-message"
                  rows={2}
                  maxLength={500}
                  value={rsvpDraft.message}
                  onChange={(event) => setRsvpDraft({ ...rsvpDraft, message: event.target.value })}
                />
              </div>
              <label className="honeypot" aria-hidden="true">Để trống<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} /></label>
              <button className="button button-dark submit-button" type="submit" disabled={rsvpState === "sending"}>
                {rsvpState === "sending" ? "Đang gửi…" : "Gửi xác nhận"}
              </button>
              {rsvpMessage && <Notice state={rsvpState}>{rsvpMessage}</Notice>}
            </form>
          </div>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}

    </main>
  );
});

export default WeddingPage;
