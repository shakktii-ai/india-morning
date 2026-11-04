"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const LANG_MAP: Record<string, string> = {
  "ALL": "en",
  "EN": "en",
  "HI": "hi",
  "MR": "mr",
  "PB": "pa",
  "PA": "pa",
  "BN": "bn",
  "GU": "gu",
  "TA": "ta",
  "TE": "te",
};

export default function TranslationManager() {
  const searchParams = useSearchParams();
  const langQuery = searchParams.get("lang") || "ALL";

  useEffect(() => {
    const lang = langQuery.toUpperCase();
    const isAll = lang === "ALL";
    const targetLang = LANG_MAP[lang] || "en";
    const targetValue = `/en/${targetLang}`;

    // Helper: Parse googtrans cookies
    const getGoogtransCookies = () => {
      if (typeof document === "undefined") return [];
      return document.cookie.split('; ')
        .filter(row => row.startsWith('googtrans='))
        .map(row => row.split('=')[1]);
    };

    const currentCookies = getGoogtransCookies();
    const hasCorrectValue = currentCookies.some(val => val === targetValue);
    const hasIncorrectValue = currentCookies.some(val => val !== targetValue);

    // Safety Loop Prevention: limit reloads within a short window
    const checkSafetyLoop = () => {
      try {
        const now = Date.now();
        const info = JSON.parse(sessionStorage.getItem('lang_reload_safe') || '{"count": 0, "last": 0}');
        
        // Reset count if last reload was > 30 seconds ago
        if (now - info.last > 30000) {
          info.count = 1;
        } else {
          info.count += 1;
        }
        info.last = now;
        sessionStorage.setItem('lang_reload_safe', JSON.stringify(info));

        if (info.count > 3) {
          console.warn("TranslationManager: Infinite reload loop detected. Aborting reload.");
          return false;
        }
      } catch (e) {
        return true; 
      }
      return true;
    };

    const clearAllGoogtrans = () => {
      const domains = [
        window.location.hostname,
        `.${window.location.hostname}`,
        "" 
      ];
      
      // Add apex domain for production
      const parts = window.location.hostname.split('.');
      if (parts.length >= 2) {
        const apex = parts.slice(-2).join('.');
        domains.push(apex, `.${apex}`);
      }

      domains.forEach(domain => {
        const base = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
        document.cookie = domain ? `${base}; domain=${domain}` : base;
      });
    };

    // Case 1: "ALL" selected - Clear all translations to show original mix
    if (isAll) {
      if (currentCookies.length > 0) {
        clearAllGoogtrans();
        if (checkSafetyLoop()) window.location.reload();
      }
      return;
    }

    // Case 2: Language needs to be updated or cleared of duplicates
    // This includes "EN" which will set googtrans to /en/en if it's missing
    if (!hasCorrectValue || hasIncorrectValue) {
      clearAllGoogtrans();
      // Set correct cookie exactly once
      document.cookie = `googtrans=${targetValue}; path=/`;
      
      console.log(`TranslationManager: Setting lang to ${targetValue}`);
      if (checkSafetyLoop()) {
        setTimeout(() => window.location.reload(), 100);
      }
    }
  }, [langQuery]);

  return null;
}
