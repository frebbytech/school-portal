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
