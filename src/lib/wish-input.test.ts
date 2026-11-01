// Runtime validation coverage for RSVP email routing and guestbook submissions.
import { describe, expect, it } from "vitest";
import { rsvpNotificationMessage } from "./email-content";
import { rsvpNotificationRecipient } from "./email-recipient";
import { isRequestOriginAllowed } from "./origin";
import { parseWishSubmission } from "./wish-input";

describe("same-origin API protection", () => {
  it("accepts the active Netlify host when the configured URL is stale localhost", () => {
    expect(
      isRequestOriginAllowed(
        "https://wedding-example.netlify.app",
        ["http://localhost:3000"],
        ["wedding-example.netlify.app", "localhost:8888"],
        "https:",
      ),
    ).toBe(true);
  });

  it("rejects a different site origin", () => {
    expect(
      isRequestOriginAllowed(
        "https://attacker.example",
        ["http://localhost:3000"],
        ["wedding-example.netlify.app"],
        "https:",
      ),
    ).toBe(false);
  });
});

describe("guestbook submissions", () => {
  it("accepts the content and guest token sent by the invitation form", () => {
    expect(
      parseWishSubmission({
        name: "  Linh  ",
        content: "  Chúc hai bạn hạnh phúc!  ",
        guestToken: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toEqual({
      value: {
        name: "Linh",
        content: "Chúc hai bạn hạnh phúc!",
        guestToken: "550e8400-e29b-41d4-a716-446655440000",
      },
    });
  });

  it("rejects the obsolete message-only payload", () => {
    const result = parseWishSubmission({
      name: "Linh",
      message: "Chúc hai bạn hạnh phúc!",
      guestToken: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect("fields" in result && result.fields.content).toBeTruthy();
  });

  it("rejects invalid guest tokens", () => {
    const result = parseWishSubmission({ name: "Linh", content: "Chúc mừng!", guestToken: "invalid" });
    expect("fields" in result && result.fields.guestToken).toBeTruthy();
  });
});

it("routes RSVP notifications to the requested email address", () => {
  expect(rsvpNotificationRecipient).toBe("minhanh01205@gmail.com");
});

it("uses the requested confirmation message in the RSVP email", () => {
  expect(rsvpNotificationMessage).toBe("Đã xác nhận thành công.");
});
