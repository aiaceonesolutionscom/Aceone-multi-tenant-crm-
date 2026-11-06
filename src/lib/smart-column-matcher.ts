export interface ExtractedLeadFields {
  fullName: string;
  phone: string | null;
  email: string | null;
  interestedService: string | null;
  city: string | null;
  companyName: string | null;
  notesSummary: string | null;
  customFields: Record<string, string>;
  detectedHeaders: string[];
}

const NAME_KEYWORDS = [
  "full_name",
  "fullname",
  "full name",
  "client_name",
  "client name",
  "customer_name",
  "customer name",
  "your_name",
  "your name",
  "candidate_name",
  "candidate name",
  "first_name",
  "firstname",
  "first name",
  "name",
  "naam",
];

const PHONE_KEYWORDS = [
  "phone",
  "phone_number",
  "phonenumber",
  "phone number",
  "mobile",
  "mobile_number",
  "mobile number",
  "whatsapp",
  "whatsapp_number",
  "whatsapp number",
  "whatsapp #",
  "contact",
  "contact_number",
  "contact number",
  "contact_no",
  "contact no",
  "cell",
  "cell_number",
  "tel",
  "rabta",
  "number",
];

const EMAIL_KEYWORDS = [
  "email",
  "email_address",
  "emailaddress",
  "email address",
  "mail",
  "e-mail",
];

const SERVICE_KEYWORDS = [
  "interested_service",
  "service",
  "service_required",
  "requirement",
  "required_service",
  "query",
  "inquiry",
  "product",
  "unit",
  "property",
  "course",
  "preferred_unit",
  "interest",
  "purpose",
  "package",
  "plan",
];

const CITY_KEYWORDS = [
  "city",
  "location",
  "address",
  "area",
  "region",
  "country",
  "shahar",
];

const COMPANY_KEYWORDS = [
  "company",
  "company_name",
  "companyname",
  "company name",
  "business",
  "business_name",
  "organization",
  "firm",
];

const NOTES_KEYWORDS = [
  "notes",
  "message",
  "description",
  "details",
  "comments",
  "remarks",
  "feedback",
  "additional_info",
];

/**
 * Normalizes a key for fuzzy matching (strips spaces, underscores, dashes, lowercases).
 */
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Intelligently matches arbitrary column names from Google Forms / Sheets to standard CRM fields.
 * Any unmapped columns are preserved in `customFields`.
 */
export function extractFieldsFromRow(
  rawRow: Record<string, any>,
  customOverrides?: Record<string, string> | null
): ExtractedLeadFields {
  const result: ExtractedLeadFields = {
    fullName: "Inquiry Customer",
    phone: null,
    email: null,
    interestedService: null,
    city: null,
    companyName: null,
    notesSummary: null,
    customFields: {},
    detectedHeaders: [],
  };

  const matchedKeys = new Set<string>();

  // Collect all header names
  for (const originalKey of Object.keys(rawRow)) {
    if (originalKey.trim()) {
      result.detectedHeaders.push(originalKey.trim());
    }
  }

  // 1. Apply explicit user manual overrides if defined
  if (customOverrides) {
    for (const [colName, targetField] of Object.entries(customOverrides)) {
      if (rawRow[colName] !== undefined && rawRow[colName] !== null) {
        const val = String(rawRow[colName]).trim();
        if (targetField === "fullName") result.fullName = val;
        else if (targetField === "phone") result.phone = val;
        else if (targetField === "email") result.email = val;
        else if (targetField === "interestedService") result.interestedService = val;
        else if (targetField === "city") result.city = val;
        else if (targetField === "companyName") result.companyName = val;
        else if (targetField === "notesSummary") result.notesSummary = val;

        matchedKeys.add(colName);
      }
    }
  }

  // 2. Automated Semantic Matching
  for (const [originalKey, rawVal] of Object.entries(rawRow)) {
    if (matchedKeys.has(originalKey)) continue;
    if (rawVal === undefined || rawVal === null) continue;

    const val = String(rawVal).trim();
    if (!val) continue;

    const normKey = normalizeKey(originalKey);

    // Full Name
    if (result.fullName === "Inquiry Customer" && NAME_KEYWORDS.some((k) => normalizeKey(k) === normKey || normKey.includes(normalizeKey(k)))) {
      result.fullName = val;
      matchedKeys.add(originalKey);
      continue;
    }

    // Phone
    if (!result.phone && PHONE_KEYWORDS.some((k) => normalizeKey(k) === normKey || normKey.includes(normalizeKey(k)))) {
      result.phone = val;
      matchedKeys.add(originalKey);
      continue;
    }

    // Email
    if (!result.email && (EMAIL_KEYWORDS.some((k) => normalizeKey(k) === normKey || normKey.includes(normalizeKey(k))) || val.includes("@"))) {
      result.email = val;
      matchedKeys.add(originalKey);
      continue;
    }

    // Service / Requirement
    if (!result.interestedService && SERVICE_KEYWORDS.some((k) => normalizeKey(k) === normKey || normKey.includes(normalizeKey(k)))) {
      result.interestedService = val;
      matchedKeys.add(originalKey);
      continue;
    }

    // City
    if (!result.city && CITY_KEYWORDS.some((k) => normalizeKey(k) === normKey || normKey.includes(normalizeKey(k)))) {
      result.city = val;
      matchedKeys.add(originalKey);
      continue;
    }

    // Company
    if (!result.companyName && COMPANY_KEYWORDS.some((k) => normalizeKey(k) === normKey || normKey.includes(normalizeKey(k)))) {
      result.companyName = val;
      matchedKeys.add(originalKey);
      continue;
    }

    // Notes
    if (!result.notesSummary && NOTES_KEYWORDS.some((k) => normalizeKey(k) === normKey || normKey.includes(normalizeKey(k)))) {
      result.notesSummary = val;
      matchedKeys.add(originalKey);
      continue;
    }

    // 3. Any other column is stored in dynamic customFields!
    result.customFields[originalKey] = val;
  }

  return result;
}
