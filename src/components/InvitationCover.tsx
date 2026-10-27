import type { wedding as WeddingConfig } from "@/config/wedding";

type Wedding = typeof WeddingConfig;

export default function InvitationCover({ wedding, invitee, onOpen }: { wedding: Wedding; invitee?: string; onOpen?: () => void | Promise<void> }) {
  const invitationDateLabel = new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(wedding.dateTime));

  const invitationUrl = `/invitation${invitee ? `?to=${encodeURIComponent(invitee)}` : ""}`;

  return (
    <section className="opening-screen" aria-label="Thiệp mời đám cưới">
      <div className="falling-leaves falling-leaves-back" aria-hidden="true">
        {Array.from({ length: 11 }, (_, index) => (
          <span className="falling-leaf" key={`b-${index}`} />
        ))}
      </div>
      <div className="falling-leaves falling-leaves-front" aria-hidden="true">
        {Array.from({ length: 11 }, (_, index) => (
          <span className="falling-leaf" key={`f-${index}`} />
        ))}
      </div>
      <article className="opening-card">
        <svg className="card-flower card-flower-left" viewBox="0 0 160 230" fill="none" aria-hidden="true">
          <path d="M6 224C31 176 57 115 81 14M26 180C9 163 8 142 16 125C36 139 39 161 26 180ZM44 142C71 130 83 107 81 86C58 96 45 116 44 142ZM59 99C43 79 45 56 57 40C74 59 74 81 59 99Z" stroke="currentColor" strokeWidth="2" />
          <path d="M79 28C72 20 72 12 77 6C85 12 86 21 79 28ZM12 133C8 125 10 118 16 113C22 121 20 129 12 133ZM81 94C82 85 88 80 96 80C96 89 90 95 81 94Z" fill="#bd9d67" />
          <circle cx="77" cy="8" r="4" fill="#d5b47b" /><circle cx="84" cy="12" r="4" fill="#c8a772" /><circle cx="72" cy="14" r="4" fill="#d8bd8b" />
          <circle cx="14" cy="115" r="4" fill="#d5b47b" /><circle cx="8" cy="122" r="4" fill="#c8a772" /><circle cx="19" cy="124" r="4" fill="#d8bd8b" />
        </svg>
        <svg className="card-flower card-flower-right" viewBox="0 0 160 230" fill="none" aria-hidden="true">
          <path d="M6 224C31 176 57 115 81 14M26 180C9 163 8 142 16 125C36 139 39 161 26 180ZM44 142C71 130 83 107 81 86C58 96 45 116 44 142ZM59 99C43 79 45 56 57 40C74 59 74 81 59 99Z" stroke="currentColor" strokeWidth="2" />
          <path d="M79 28C72 20 72 12 77 6C85 12 86 21 79 28ZM12 133C8 125 10 118 16 113C22 121 20 129 12 133ZM81 94C82 85 88 80 96 80C96 89 90 95 81 94Z" fill="#bd9d67" />
          <circle cx="77" cy="8" r="4" fill="#d5b47b" /><circle cx="84" cy="12" r="4" fill="#c8a772" /><circle cx="72" cy="14" r="4" fill="#d8bd8b" />
          <circle cx="14" cy="115" r="4" fill="#d5b47b" /><circle cx="8" cy="122" r="4" fill="#c8a772" /><circle cx="19" cy="124" r="4" fill="#d8bd8b" />
        </svg>
        <span className="opening-heart" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path d="M24 39.1 9.6 25.5C1.4 17.8 12.4 5.8 21 13.5l3 2.7 3-2.7c8.6-7.7 19.6 4.3 11.4 12L24 39.1Z" fill="currentColor" />
            <path d="M11 11.5 13.2 8M37 11.5 34.8 8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" opacity=".6" />
          </svg>
        </span>
        <p className="opening-title">THE WEDDING OF</p>
        <p className="opening-name">{wedding.groom}</p>
        <span className="opening-ampersand">&</span>
        <p className="opening-name">{wedding.bride}</p>
        <span className="opening-divider" aria-hidden="true"><i />❧<i /></span>
        <p className="opening-date">{invitationDateLabel}</p>
        <p className="opening-greeting">{invitee ? `Kính mời ${invitee}` : "Thân Mời"}</p>
        {onOpen ? (
          <button className="opening-button" type="button" onClick={() => void onOpen()}>
            Mở thiệp
          </button>
        ) : (
          <a className="opening-button" href={invitationUrl}>
            Mở thiệp
          </a>
        )}
      </article>
    </section>
  );
}
