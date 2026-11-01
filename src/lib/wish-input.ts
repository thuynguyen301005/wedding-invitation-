export type WishSubmission = {
  name: string;
  content: string;
  guestToken: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseWishSubmission(body: Record<string, unknown>):
  | { value: WishSubmission }
  | { fields: Record<string, string> } {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const guestToken = body.guestToken;
  const fields: Record<string, string> = {};

  if (!name || name.length > 100) fields.name = "Vui lòng nhập tên (tối đa 100 ký tự).";
  if (!content || content.length > 500) fields.content = "Lời chúc cần có nội dung (tối đa 500 ký tự).";
  if (typeof guestToken !== "string" || !uuidPattern.test(guestToken)) {
    fields.guestToken = "Không thể xác minh thiết bị. Vui lòng tải lại trang.";
  }
  if (Object.keys(fields).length) return { fields };
  if (typeof guestToken !== "string") {
    return { fields: { guestToken: "Không thể xác minh thiết bị. Vui lòng tải lại trang." } };
  }

  return { value: { name, content, guestToken } };
}
