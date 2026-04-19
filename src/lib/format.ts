export const APP_LOCALE = "ru-RU";
export const APP_CURRENCY = "PLN";

type FormatPreferences = {
  currency?: string;
  locale?: string;
};

function resolveLocale(preferences?: FormatPreferences) {
  return preferences?.locale ?? APP_LOCALE;
}

function resolveCurrency(preferences?: FormatPreferences) {
  return preferences?.currency ?? APP_CURRENCY;
}

export function formatCurrency(amount: number, preferences?: FormatPreferences) {
  return new Intl.NumberFormat(resolveLocale(preferences), {
    currency: resolveCurrency(preferences),
    currencyDisplay: "narrowSymbol",
    style: "currency",
  }).format(amount);
}

export function formatShortDate(value: string | Date, preferences?: FormatPreferences) {
  return new Intl.DateTimeFormat(resolveLocale(preferences), {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

export function toDateInputValue(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10);
}
