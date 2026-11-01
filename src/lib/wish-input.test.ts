// Runtime validation coverage for RSVP email routing and guestbook submissions.
import { describe, expect, it } from "vitest";
import { rsvpNotificationRecipient } from "./email-recipient";
import { parseWishSubmission } from "./wish-input";

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
