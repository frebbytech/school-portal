import * as yup from "yup";

// Same pattern the rest of the app uses for phone numbers
const PHONE = /^(\+\d{1,3})?\(?\d{3}\)?\d{3}\d{4}$/;

export const MESSAGE_MAX = 1000;

export const TYPE_LABEL = { sms: "SMS", email: "email", both: "SMS and email" };

const ENTITIES = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

// The editor produces HTML. This is the text a reader sees, and how "nothing written" is
// told apart (the editor's empty value is "<p><br></p>"). Same rules as the server's.
export const plainText = (html) => {
  if (typeof html !== "string") return "";
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m])
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const wantsSms = (type) => type === "sms" || type === "both";
const wantsEmail = (type) => type === "email" || type === "both";

// `individual`: one recipient typed in (quick message); otherwise a whole group (bulk).
export const messageSchema = (type, { individual = false } = {}) => {
  const shape = {
    title: yup.string().trim().required("Enter a title").max(200, "The title is too long"),
    message: yup
      .string()
      .test("written", "Write a message", (value) => plainText(value).length > 0)
      .max(MESSAGE_MAX, "This message is too long (formatting counts). Shorten it."),
  };
  if (individual && wantsSms(type)) {
    shape.phonenumber = yup.string().trim().required("Enter the phone number").matches(PHONE, "Enter a valid phone number");
  }
  if (individual && wantsEmail(type)) {
    shape.email = yup.string().trim().required("Enter the email address").email("Enter a valid email address");
  }
  return yup.object(shape);
};

// What the group-send confirmation says it will do
export const bulkWarning = (type, group) =>
  `This sends the ${TYPE_LABEL[type] || "message"} to every ${group === "parents" ? "parent" : group === "teachers" ? "teacher" : "student"} who has ${
    type === "email" ? "an email address" : type === "both" ? "a phone number or an email address" : "a phone number"
  } on record, and it cannot be undone.`;

// ---- SMS length --------------------------------------------------------------------------
// One SMS holds 160 characters in the basic phone alphabet, or 70 as soon as any other
// character (an emoji, a curly quote) is used. Longer texts are split into parts of 153 / 67
// and each part is billed. The counter shows it before sending.
const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXTENDED = "^{}\\[~]|€"; // each takes two places

export function smsLength(title, message) {
  const text = [typeof title === "string" ? title.trim() : "", plainText(message)].filter(Boolean).join("\n");
  let units = 0;
  let unicode = false;
  for (const ch of text) {
    if (GSM_BASIC.includes(ch)) units += 1;
    else if (GSM_EXTENDED.includes(ch)) units += 2;
    else unicode = true;
  }
  if (unicode) units = text.length; // counted in UTF-16 units (an emoji is two)

  const single = unicode ? 70 : 160;
  const perPart = unicode ? 67 : 153;
  const parts = units === 0 ? 0 : units <= single ? 1 : Math.ceil(units / perPart);
  return { units, parts, unicode, single };
}

export const smsLengthText = ({ units, parts, unicode, single }) =>
  units === 0
    ? ""
    : `SMS: ${units} character${units === 1 ? "" : "s"}, ${parts} message${parts === 1 ? "" : "s"}` +
      (unicode ? ` (a special character or emoji limits each message to ${single} characters)` : "") +
      (parts > 1 ? ". Each part is billed as a separate SMS." : "");
