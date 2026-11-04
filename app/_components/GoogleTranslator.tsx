'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    googleTranslateElementInit: () => void;
    google: any;
  }
}

export default function GoogleTranslator() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Define the initialization function on the window
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
          multilanguagePage: true, // Handle English + Hindi source content
        },
        'google_translate_element'
      );
    };

    // Check if script is already loaded
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    } else if (window.google && window.google.translate) {
      // If already loaded but needs re-init (e.g. after navigation in some cases)
      window.googleTranslateElementInit();
    }

    // MutationObserver to keep body top at 0px (Google Translate likes to change it)
    const observer = new MutationObserver(() => {
      if (document.body.style.top !== '0px') {
        document.body.style.top = '0px';
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });

    return () => observer.disconnect();
  }, []);

  if (!mounted) return null;

  return (
    <div 
      id="google_translate_element" 
      style={{ 
        display: 'none', 
        position: 'absolute', 
        top: '-9999px' 
      }} 
      aria-hidden="true"
    />
  );
}
