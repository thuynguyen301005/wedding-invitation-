/**
 * Danh sách các từ cấm (tiếng Việt và tiếng Anh).
 * Có thể mở rộng thêm từ mới vào mảng này.
 * Lưu ý: hàm kiểm tra sẽ tự chuẩn hóa (viết thường, bỏ dấu, cho phép ký tự đặc biệt ở giữa)
 * nên chỉ cần khai báo dạng cơ bản.
 */
const PROFANITY_WORDS: string[] = [
  // Tiếng Anh
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "dick",
  "pussy",
  "cunt",
  "whore",
  "slut",
  "motherfucker",
  "fucker",
  "bullshit",
  "dickhead",
  // Tiếng Việt
  "dit",
  "lon",
  "cac",
  "deo",
  "vai",
  "cho",
  "ngu",
  "oc cho",
  "dm",
  "vcl",
  "vl",
  "cc",
  "cl",
  "dcm",
  "dmm",
  "buoi",
  "dai",
  "am vat",
  "di",
  "diem",
  "du",
  "lam tinh",
];

/**
 * Chuẩn hóa văn bản để so sánh: viết thường và bỏ dấu tiếng Việt.
 */
function normalizeText(text: string): string {
  return text
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Tạo RegExp từ một từ cấm, cho phép có ký tự đặc biệt/khoảng trắng ở giữa các ký tự.
 */
function buildPattern(word: string): RegExp {
  const normalized = normalizeText(word);
  // Mỗi ký tự có thể được ngăn cách bởi ký tự không phải chữ/số
  const body = [...normalized]
    .map((char) => {
      if (char === " ") return "\\s*";
      return `${escapeRegExp(char)}[\\W_]*`;
    })
    .join("");
  // Ranh giới từ để tránh bắt nhầm (ví dụ "class" không bị bắt vì "cc")
  return new RegExp(`(?<![a-z0-9])${body}(?![a-z0-9])`, "i");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PROFANITY_PATTERNS: RegExp[] = PROFANITY_WORDS.map(buildPattern);

/**
 * Kiểm tra văn bản có chứa từ cấm hay không.
 * @returns true nếu phát hiện từ cấm.
 */
export function containsProfanity(text: string): boolean {
  if (!text) return false;
  const normalized = normalizeText(text);
  return PROFANITY_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * (Tùy chọn) Che các từ cấm bằng dấu '*'.
 * Giữ nguyên độ dài của từ bị che.
 */
export function censorText(text: string): string {
  if (!text) return text;
  let result = text;
  for (const pattern of PROFANITY_PATTERNS) {
    const globalPattern = new RegExp(pattern.source, `${pattern.flags}g`);
    result = result.replace(globalPattern, (match) => "*".repeat(match.length));
  }
  return result;
}
