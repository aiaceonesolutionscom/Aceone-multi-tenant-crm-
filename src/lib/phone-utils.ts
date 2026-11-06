/**
 * Phone Number Normalization & Communication Link Utility
 * Generates direct tel:, WhatsApp Call, and WhatsApp Chat links
 */

export function cleanPhoneDigits(phone: string | null | undefined): string {
  if (!phone) return "";
  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, "");
  // If number starts with 0 (e.g. 03142762446 in Pakistan), replace leading 0 with 92
  if (digits.startsWith("0") && digits.length === 11) {
    return "92" + digits.slice(1);
  }
  return digits;
}

export function getTelLink(phone: string | null | undefined): string | null {
  const digits = cleanPhoneDigits(phone);
  if (!digits || digits.length < 7) return null;
  return `tel:+${digits}`;
}

export function getWhatsAppChatLink(phone: string | null | undefined, prefillText?: string): string | null {
  const digits = cleanPhoneDigits(phone);
  if (!digits || digits.length < 7) return null;
  const textQuery = prefillText ? `?text=${encodeURIComponent(prefillText)}` : "";
  return `https://wa.me/${digits}${textQuery}`;
}

export function getWhatsAppCallLink(phone: string | null | undefined): string | null {
  const digits = cleanPhoneDigits(phone);
  if (!digits || digits.length < 7) return null;
  // WhatsApp web / app intent link for instant customer voice calling
  return `https://wa.me/${digits}`;
}
