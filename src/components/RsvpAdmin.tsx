"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Rsvp = {
  id: string;
  name: string;
  attendance_status: "yes" | "no";
  guest_count: number;
  message: string | null;
  confirmed_at: string;
  created_at: string;
  notification_status: "sent" | "pending" | "failed" | "not_required";
};

export default function RsvpAdmin() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [sheetUrl, setSheetUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const fetchRsvpData = useCallback(async () => {
    const response = await fetch("/api/admin/rsvps", { cache: "no-store" });
    const result = (await response.json()) as { rsvps?: Rsvp[]; error?: string };
    if (response.status === 401) {
      return { authenticated: false, rsvps: [], sheetUrl: "" };
    }
    if (!response.ok) throw new Error(result.error || "Không thể tải danh sách.");
    const sheetResponse = await fetch("/api/admin/sheet-link", { cache: "no-store" });
    const sheetResult = (await sheetResponse.json()) as { sheetUrl?: string };
    return {
      authenticated: true,
      rsvps: result.rsvps || [],
      sheetUrl: sheetResponse.ok ? sheetResult.sheetUrl || "" : "",
    };
  }, []);

  const loadRsvps = useCallback(async () => {
    setLoading(true);
    setError("");
    setStatusMessage("");
    try {
      const data = await fetchRsvpData();
      setAuthenticated(data.authenticated);
      setRsvps(data.rsvps);
      setSheetUrl(data.sheetUrl);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách.");
    } finally {
      setLoading(false);
    }
  }, [fetchRsvpData]);

  useEffect(() => {
    let cancelled = false;
    fetchRsvpData()
      .then((data) => {
        if (cancelled) return;
        setAuthenticated(data.authenticated);
        setRsvps(data.rsvps);
        setSheetUrl(data.sheetUrl);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchRsvpData]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatusMessage("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Đăng nhập không thành công.");
      setPassword("");
      setAuthenticated(true);
      await loadRsvps();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Đăng nhập không thành công.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Không thể đăng xuất. Vui lòng thử lại.");
      setAuthenticated(false);
      setRsvps([]);
      setSheetUrl("");
      setError("");
      setStatusMessage("");
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Không thể đăng xuất.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSyncAll() {
    setSyncing(true);
    setError("");
    setStatusMessage("");
    try {
      const response = await fetch("/api/admin/sync-sheet", { method: "POST" });
      const result = (await response.json()) as { error?: string; count?: number };
      if (!response.ok) throw new Error(result.error || "Không thể đồng bộ Google Sheet.");
      await loadRsvps();
      setStatusMessage(`Đã đồng bộ ${result.count || 0} phản hồi vào Google Sheet.`);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Không thể đồng bộ Google Sheet.");
    } finally {
      setSyncing(false);
    }
  }

  const yesCount = rsvps.filter((rsvp) => rsvp.attendance_status === "yes").length;
  const guestCount = rsvps.reduce(
    (total, rsvp) => total + (rsvp.attendance_status === "yes" ? rsvp.guest_count : 0),
    0,
  );

  return (
    <main style={{ maxWidth: 1050, margin: "0 auto", padding: "40px 20px 72px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
        <div>
          <p className="eyebrow rose">PRIVATE RSVP LIST</p>
          <h1 style={{ margin: 0, fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 400 }}>
            Xác nhận tham dự
          </h1>
        </div>
        {authenticated && (
          <button className="button button-outline" disabled={busy} onClick={handleLogout} type="button">
            Đăng xuất
          </button>
        )}
      </header>

      {error && (
        <p role="alert" style={{ marginTop: 24, color: "#9b332e" }}>
          {error}
        </p>
      )}
      {statusMessage && (
        <p role="status" style={{ marginTop: 24, color: "var(--muted)" }}>
          {statusMessage}
        </p>
      )}

      {!authenticated ? (
        <form onSubmit={handleLogin} style={{ maxWidth: 440, marginTop: 38 }}>
          <label htmlFor="admin-password">Mật khẩu quản lý</label>
          <input
            autoComplete="current-password"
            id="admin-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            style={{ display: "block", width: "100%", margin: "8px 0 16px", padding: 12 }}
            type="password"
            value={password}
          />
          <button className="button button-dark" disabled={busy || loading} type="submit">
            {busy ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      ) : (
        <>
          <p style={{ color: "var(--muted)", marginTop: 10 }}>
            {loading ? "Đang tải..." : `${rsvps.length} phản hồi · ${yesCount} khách xác nhận · ${guestCount} người tham dự`}
          </p>
          {sheetUrl && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
              <a
                className="button button-outline"
                href={sheetUrl}
                rel="noreferrer"
                target="_blank"
              >
                Mở Google Sheet
              </a>
              <button
                className="button button-outline"
                disabled={syncing}
                onClick={() => void handleSyncAll()}
                type="button"
              >
                {syncing ? "Đang đồng bộ..." : "Đồng bộ toàn bộ RSVP"}
              </button>
            </div>
          )}
          {!loading && !sheetUrl && (
            <p style={{ color: "var(--muted)" }}>
              Chưa cấu hình liên kết Google Sheet.
            </p>
          )}
          <div style={{ overflowX: "auto", marginTop: 24 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr>
                  {["Khách mời", "Trạng thái", "Số người", "Lời nhắn", "Thời gian"].map((heading) => (
                    <th key={heading} style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rsvps.map((rsvp) => (
                  <tr key={rsvp.id}>
                    <td style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>{rsvp.name}</td>
                    <td style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>
                      {rsvp.attendance_status === "yes" ? "Tham dự" : "Không tham dự"}
                      {rsvp.notification_status === "failed" && (
                        <small style={{ display: "block", color: "#9b332e" }}>Sheet chưa cập nhật được</small>
                      )}
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>{rsvp.guest_count}</td>
                    <td style={{ padding: 12, borderBottom: "1px solid var(--line)", whiteSpace: "pre-wrap" }}>
                      {rsvp.message || "—"}
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid var(--line)", whiteSpace: "nowrap" }}>
                      {new Intl.DateTimeFormat("vi-VN", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "Asia/Ho_Chi_Minh",
                      }).format(new Date(rsvp.confirmed_at))}
                    </td>
                  </tr>
                ))}
                {!loading && rsvps.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>
                      Chưa có xác nhận tham dự.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <button
            className="button button-outline"
            disabled={loading}
            onClick={() => void loadRsvps()}
            style={{ marginTop: 20 }}
            type="button"
          >
            Làm mới danh sách
          </button>
        </>
      )}
    </main>
  );
}
