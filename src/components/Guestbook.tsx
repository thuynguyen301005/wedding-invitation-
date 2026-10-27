"use client";

import { useEffect, useState } from "react";

type Wish = { id: string; name: string; message: string; createdAt: string };

export default function Guestbook() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/wishes");
        const data = await res.json();
        if (res.ok) setWishes(data.wishes || []);
        else setError(data.error || "Không thể tải lời chúc.");
      } catch {
        setError("Không thể tải lời chúc.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!name.trim() || !message.trim()) {
      setError("Vui lòng nhập tên và lời chúc.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), message: message.trim(), website: "" }),
      });
      const data = await res.json();
      if (!res.ok || !data.wish) {
        setError(data.error || "Gửi lời chúc thất bại.");
        return;
      }
      // Thêm lời chúc mới vào đầu danh sách ngay lập tức
      setWishes((prev) => [data.wish, ...prev]);
      setName("");
      setMessage("");
    } catch {
      setError("Gửi lời chúc thất bại.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="guestbook-section section" id="guestbook" aria-labelledby="guestbook-title">
      <article className="guestbook-card">
        <p className="eyebrow rose">SỔ LƯU BÚT</p>
        <h2 id="guestbook-title">Lời chúc từ khách mời</h2>
        <form className="guestbook-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="guest-name">Tên của bạn *</label>
            <input
              id="guest-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="Nhập tên..."
            />
          </div>
          <div className="field">
            <label htmlFor="guest-message">Lời chúc *</label>
            <textarea
              id="guest-message"
              rows={3}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nhập lời chúc..."
            />
          </div>
          <button className="button button-dark submit-button" type="submit" disabled={sending}>
            {sending ? "Đang gửi…" : "Gửi lời chúc"}
          </button>
          {error && <p className="notice notice-error">{error}</p>}
        </form>

        <div className="guestbook-wishes" aria-live="polite">
          {loading && <p className="guestbook-empty">Đang tải những lời chúc…</p>}
          {!loading && wishes.length === 0 && <p className="guestbook-empty">Chưa có lời chúc nào. Hãy là người đầu tiên!</p>}
          {wishes.map((wish) => (
            <article className="guestbook-wish fade-in-up" key={wish.id}>
              <div className="guestbook-wish-heading">
                <strong>{wish.name}</strong>
                <time dateTime={wish.createdAt}>
                  {new Date(wish.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                </time>
              </div>
              <p>{wish.message}</p>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}