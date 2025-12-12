import { useEffect } from 'react';

/**
 * SEOHead Component
 * Manages document head for SEO - title, meta tags, Open Graph, and structured data
 */
export default function SEOHead({
  title = 'Planora - תכנון אירועים חכם',
  description = 'פלטפורמה חכמה לתכנון אירועים משותפים. נהל משימות, צ\'אטים, הצבעות וגלריות עם כל המשתתפים במקום אחד.',
  image = 'https://register.plan-ora.net/project/f78de3ce-0cab-4ccb-8442-0c574979fe8/assets/PlanoraLogo_512.png',
  url = typeof window !== 'undefined' ? window.location.href : 'https://register.plan-ora.net',
  type = 'website',
  structuredData = null,
  noIndex = false
}) {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper to set/update meta tags
    const setMetaTag = (property, content, isOg = false) => {
      const attr = isOg ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, property);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Basic meta tags
    setMetaTag('description', description);
    setMetaTag('robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    
    // Open Graph tags
    setMetaTag('og:title', title, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:image', image, true);
    setMetaTag('og:url', url, true);
    setMetaTag('og:type', type, true);
    setMetaTag('og:site_name', 'Planora', true);
    setMetaTag('og:locale', 'he_IL', true);

    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', title);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', image);

    // Structured data (JSON-LD)
    if (structuredData) {
      let script = document.querySelector('script[data-seo-structured]');
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-seo-structured', 'true');
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }

    // Cleanup function
    return () => {
      // Don't remove - let next page update them
    };
  }, [title, description, image, url, type, structuredData, noIndex]);

  return null;
}

// Pre-built structured data generators
export const generateWebsiteStructuredData = () => ({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Planora",
  "applicationCategory": "LifestyleApplication",
  "operatingSystem": "Web, Android, iOS",
  "description": "פלטפורמה חכמה לתכנון אירועים משותפים",
  "url": "https://register.plan-ora.net",
  "image": "https://register.plan-ora.net/project/f78de3ce-0cab-4ccb-8442-0c574979fe8/assets/PlanoraLogo_512.png",
  "author": {
    "@type": "Organization",
    "name": "Planora"
  },
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "ILS"
  },
  "featureList": [
    "ניהול משימות משותפות",
    "צ'אט לכל אירוע",
    "הצבעות על תאריכים ומקומות",
    "גלריות תמונות",
    "יצירת אירועים עם AI"
  ]
});

export const generateEventStructuredData = (event) => {
  if (!event) return null;
  
  const data = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": event.title || event.name,
    "description": event.description || '',
    "url": `https://register.plan-ora.net/EventDetail?id=${event.id}`
  };

  if (event.eventDate || event.event_date) {
    data.startDate = event.eventDate || event.event_date;
  }

  if (event.endDate || event.end_date) {
    data.endDate = event.endDate || event.end_date;
  }

  if (event.location) {
    data.location = {
      "@type": "Place",
      "name": event.location,
      "address": event.location
    };
  }

  if (event.cover_image_url || event.coverImageUrl) {
    data.image = event.cover_image_url || event.coverImageUrl;
  }

  return data;
};

export const generateOrganizationStructuredData = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Planora",
  "url": "https://register.plan-ora.net",
  "logo": "https://register.plan-ora.net/project/f78de3ce-0cab-4ccb-8442-0c574979fe8/assets/PlanoraLogo_512.png",
  "sameAs": [],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "availableLanguage": ["Hebrew", "English"]
  }
});