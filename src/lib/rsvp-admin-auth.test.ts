import { afterEach, describe, expect, it } from "vitest";
import {
  createRsvpAdminSession,
  isRsvpAdminConfigured,
  verifyRsvpAdminPassword,
  verifyRsvpAdminSession,
} from "./rsvp-admin-auth";

const originalPassword = process.env.RSVP_ADMIN_PASSWORD;
const originalSecret = process.env.RSVP_ADMIN_SESSION_SECRET;

afterEach(() => {
  if (originalPassword === undefined) delete process.env.RSVP_ADMIN_PASSWORD;
  else process.env.RSVP_ADMIN_PASSWORD = originalPassword;
  if (originalSecret === undefined) delete process.env.RSVP_ADMIN_SESSION_SECRET;
  else process.env.RSVP_ADMIN_SESSION_SECRET = originalSecret;
});

describe("RSVP admin authentication", () => {
  it("fails closed when password or signing secret is not configured", () => {
    delete process.env.RSVP_ADMIN_PASSWORD;
    delete process.env.RSVP_ADMIN_SESSION_SECRET;

    expect(isRsvpAdminConfigured()).toBe(false);
    expect(createRsvpAdminSession()).toBeNull();
    expect(verifyRsvpAdminSession("anything")).toBe(false);
  });

  it("accepts only the configured password with adequate configuration", () => {
    process.env.RSVP_ADMIN_PASSWORD = "a-secure-test-password-123";
    process.env.RSVP_ADMIN_SESSION_SECRET = "a-secure-session-signing-secret-123456";

    expect(isRsvpAdminConfigured()).toBe(true);
    expect(verifyRsvpAdminPassword("a-secure-test-password-123")).toBe(true);
    expect(verifyRsvpAdminPassword("wrong-password")).toBe(false);
  });

  it("accepts a valid session and rejects altered or expired sessions", () => {
    process.env.RSVP_ADMIN_SESSION_SECRET = "a-secure-session-signing-secret-123456";
    const now = 1_800_000_000_000;
    const session = createRsvpAdminSession(now);

    expect(session).not.toBeNull();
    expect(verifyRsvpAdminSession(session || undefined, now)).toBe(true);
    expect(verifyRsvpAdminSession(`${session}x`, now)).toBe(false);
    expect(verifyRsvpAdminSession(session || undefined, now + 13 * 60 * 60 * 1000)).toBe(false);
  });
});
