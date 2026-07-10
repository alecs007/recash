"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

export type Locale = "ro" | "en";
export type Currency = "RON" | "EUR";

export const LOCALE_COOKIE = "recash-locale";
export const CURRENCY_COOKIE = "recash-currency";

export const RON_PER_EUR = Number(
  process.env.NEXT_PUBLIC_RON_PER_EUR ?? "5.07",
);

type Localized<T> = { ro: T; en: T };

interface I18nContextValue {
  locale: Locale;
  currency: Currency;
  setLocale: (locale: Locale) => void;
  setCurrency: (currency: Currency) => void;
  /** Picks the value for the active locale: t({ ro: "Salut", en: "Hello" }) */
  t: <T>(m: Localized<T>) => T;
  /** Formats an amount stored in RON in the active currency + locale. */
  fmt: (amountRon: number, opts?: { sign?: boolean }) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function persist(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export function I18nProvider({
  initialLocale,
  initialCurrency,
  children,
}: {
  initialLocale: Locale;
  initialCurrency: Currency;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [currency, setCurrencyState] = useState<Currency>(initialCurrency);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persist(LOCALE_COOKIE, next);
    document.documentElement.lang = next;
  }, []);

  const setCurrency = useCallback((next: Currency) => {
    setCurrencyState(next);
    persist(CURRENCY_COOKIE, next);
  }, []);

  const t = useCallback(
    function t<T>(m: Localized<T>): T {
      return m[locale];
    },
    [locale],
  );

  const fmt = useCallback(
    (amountRon: number, opts?: { sign?: boolean }) => {
      const value = currency === "EUR" ? amountRon / RON_PER_EUR : amountRon;
      const formatted = new Intl.NumberFormat(
        locale === "ro" ? "ro-RO" : "en-GB",
        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
      ).format(value);
      const sign = opts?.sign && amountRon > 0 ? "+" : "";
      if (currency === "EUR")
        return locale === "ro"
          ? `${sign}${formatted} €`
          : `${sign}€${formatted}`;
      return `${sign}${formatted} RON`;
    },
    [currency, locale],
  );

  const value = useMemo(
    () => ({ locale, currency, setLocale, setCurrency, t, fmt }),
    [locale, currency, setLocale, setCurrency, t, fmt],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
