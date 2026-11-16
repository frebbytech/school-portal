import { checkAmount } from "./paymentRules";

// The list of fee items for a class: [{ fee: "Tuition", amount: 500 }, ...].
// Pure functions, so the rules can be tested without the dialog.

const sameName = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

/** Adds an item, or updates the amount when that name is already in the list. */
export const addItem = (list = [], name, rawAmount) => {
  const fee = String(name ?? "").trim();
  if (!fee) return { ok: false, message: "Enter the fee type, for example Tuition", list };
  if (fee.length > 100) return { ok: false, message: "The fee type is too long", list };
  const checked = checkAmount(rawAmount, { allowZero: true });
  if (!checked.ok) return { ok: false, message: checked.message, list };
  const exists = list.some((item) => sameName(item.fee, fee));
  const next = exists
    ? list.map((item) => (sameName(item.fee, fee) ? { ...item, fee: item.fee, amount: checked.amount } : item))
    : [...list, { fee, amount: checked.amount }];
  return { ok: true, list: next, updated: exists };
};

export const removeItem = (list = [], name) => list.filter((item) => !sameName(item.fee, name));

/** Total in whole pesewas so the shown total never has rounding noise. */
export const totalOf = (list = []) =>
  list.reduce((sum, item) => sum + Math.round(Number(item.amount) * 100), 0) / 100;

/** Items as loaded from the server (older ones may use `name`) in the shape the editor uses. */
export const normalizeItems = (items) =>
  (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    fee: item.fee ?? item.name ?? "",
    amount: Number(item.amount) || 0,
  }));
