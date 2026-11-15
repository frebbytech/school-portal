export const currencyFormatter = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 2,
  }).format(amount);
};

// For figures that may not have loaded yet: a dash, never "GHS NaN" or a misleading zero.
export const currencyOrDash = (amount) =>
  amount === undefined || amount === null || amount === "" || Number.isNaN(Number(amount))
    ? "—"
    : currencyFormatter(amount);
