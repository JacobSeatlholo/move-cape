import { useState, useEffect, useCallback, useRef } from "react";

// ─── 🔌 GOOGLE SHEETS CONFIG ─────────────────────────────────────────────────
// Reads directly from your published Google Sheet as CSV.
// No Apps Script, no proxy, no CORS issues.
// Sheet columns: ID | ACTIVE | TYPE | CATEGORY | MESSAGE | STARTS_AT | EXPIRES_AT | PINNED | SOURCE | UPDATED_AT
const SHEET_ID       = "1EKHNcLODUwM4dXQNI9rTCPpUDtS3xmzBmnDnl2eWJcE";
const SHEET_TAB      = "Alerts";
const CSV_URL        = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_TAB}`;
const POLL_INTERVAL_MS = 60_000;

const COLOR_MAP = {
  teal:"#00ffcc", blue:"#4f8eff", crimson:"#ff3b5c",
  gold:"#fbbf24", purple:"#a78bfa", muted:"#6b7fa3",
};
const ICONS_MAP = { warn:"⚠️", info:"ℹ️", ok:"✅", default:"📢" };
const CAT_COLOR = {
  bus:"teal", train:"blue", taxi:"crimson",
  uber:"gold", safety:"crimson", general:"muted",
};

// Properly parse a single CSV line (handles quoted commas)
function parseCSVLine(line) {
  const out = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (q && line[i+1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === ',' && !q) { out.push(cur.trim()); cur = ""; }
    else cur += c;
  }
  out.push(cur.trim());
  return out;
}

// Parse CSV text → alert objects, respecting ACTIVE, STARTS_AT, EXPIRES_AT
function parseCSVAlerts(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const now = new Date();
  const alerts = [];
  for (let i = 1; i < lines.length; i++) {
    const c = parseCSVLine(lines[i]);
    const id      = (c[0]||"").trim();
    const active  = (c[1]||"").toUpperCase() === "TRUE";
    const message = (c[4]||"").trim();
    if (!id || !active || !message) continue;
    const startsAt  = c[5] ? new Date(c[5]) : null;
    const expiresAt = c[6] ? new Date(c[6]) : null;
    if (startsAt  && now < startsAt)  continue;
    if (expiresAt && now > expiresAt) continue;
    const type     = (c[2]||"info").toLowerCase();
    const category = (c[3]||"general").toLowerCase();
    const colorKey = CAT_COLOR[category] || "muted";
    alerts.push({
      id, type, category, message,
      pinned: (c[7]||"").toUpperCase() === "TRUE",
      source: (c[8]||"MoveCape").trim(),
      icon:   ICONS_MAP[type] || ICONS_MAP.default,
      color:  COLOR_MAP[colorKey] || COLOR_MAP.muted,
    });
  }
  alerts.sort((a,b) => (b.pinned?1:0)-(a.pinned?1:0));
  return alerts;
}

const FALLBACK_ALERTS = [
  {id:"f1",icon:"⚠️",type:"warn",category:"train",  color:COLOR_MAP.gold,   message:"Metrorail: Southern Line delays expected until 14:00",pinned:false,source:"Fallback"},
  {id:"f2",icon:"✅",type:"ok",  category:"bus",    color:COLOR_MAP.teal,   message:"MyCiTi T01 running on time — 12 min frequency",       pinned:false,source:"Fallback"},
  {id:"f3",icon:"⚠️",type:"warn",category:"uber",   color:COLOR_MAP.crimson,message:"Uber surge pricing active: CBD → Sea Point (+40%)",  pinned:false,source:"Fallback"},
  {id:"f4",icon:"⚠️",type:"warn",category:"taxi",   color:COLOR_MAP.gold,   message:"Taxi disruption: Bellville rank — partial service",  pinned:true, source:"Fallback"},
];

// ─── Hook: useLiveAlerts ──────────────────────────────────────────────────────
function useLiveAlerts() {
  const [alerts,      setAlerts]      = useState(FALLBACK_ALERTS);
  const [status,      setStatus]      = useState("loading");
  const [lastFetched, setLastFetched] = useState(null);
  const [countdown,   setCountdown]   = useState(POLL_INTERVAL_MS / 1000);
  const timer   = useRef(null);
  const counter = useRef(null);

  const fetchAlerts = useCallback(async () => {
    try {
      // Google Sheets CSV endpoint is public and CORS-friendly — no proxy needed.
      const res = await fetch(CSV_URL + "&t=" + Date.now()); // cache-bust
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const parsed = parseCSVAlerts(text);
      setAlerts(parsed.length > 0 ? parsed : FALLBACK_ALERTS);
      setStatus("live");
      setLastFetched(new Date());
      setCountdown(POLL_INTERVAL_MS / 1000);
    } catch (err) {
      console.warn("MoveCape CSV fetch failed:", err.message);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    timer.current = setInterval(fetchAlerts, POLL_INTERVAL_MS);
    return () => clearInterval(timer.current);
  }, [fetchAlerts]);

  useEffect(() => {
    counter.current = setInterval(() => {
      setCountdown(c => c <= 1 ? POLL_INTERVAL_MS / 1000 : c - 1);
    }, 1000);
    return () => clearInterval(counter.current);
  }, []);

  return { alerts, status, lastFetched, countdown, refetch: fetchAlerts };
}


// ─── SEO COMPONENT ────────────────────────────────────────────────────────────
// Injected into <head> via useEffect — works in any React environment
function MoveCapeHelmet(){
  useEffect(()=>{

    // ═══════════════════════════════════════════════════════════════════════
    // MOVECAPE SEO — 2026 STANDARDS
    // Targets: Google AI Overviews, ChatGPT Search, Perplexity, voice search
    // Framework: E-E-A-T + Entity Depth + AEO + Core Web Vitals signals
    // Last updated: 2026-03-29
    // ═══════════════════════════════════════════════════════════════════════

    const SITE   = "https://www.movecape.online";
    const BRAND  = "MoveCape";
    const TODAY  = new Date().toISOString().split("T")[0];
    const PHONE  = "+27744815163";
    const LAT    = -33.9249;
    const LNG    = 18.4241;

    // ── Helper: upsert a <meta> tag ────────────────────────────────────────
    const meta = (name, value, attr="name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute("content", value);
    };

    // ── Helper: upsert a <link> tag ────────────────────────────────────────
    const link = (rel, href, extra={}) => {
      if (document.querySelector(`link[rel="${rel}"][href="${href}"]`)) return;
      const el = document.createElement("link");
      el.rel = rel; el.href = href;
      Object.entries(extra).forEach(([k,v]) => el.setAttribute(k,v));
      document.head.appendChild(el);
    };

    // ══════════════════════════════════════════════════════════════════════
    // 1. TITLE — Primary keyword first, location second, brand last
    //    Target: "Cape Town transport" family + "taxi fares" + "route planner"
    // ══════════════════════════════════════════════════════════════════════
    document.title = "Cape Town Transport & Taxi Fares 2026 | Route Planner | MoveCape";

    // ══════════════════════════════════════════════════════════════════════
    // 2. CORE META — Intent-matched, CTR-optimised description
    // ══════════════════════════════════════════════════════════════════════
    meta("description", "Plan any Cape Town journey in seconds. Compare MyCiTi bus, CT Trains, minibus taxi fares, Uber and Bolt side by side. Live alerts · 2026 taxi prices · 6 rank locations · 100+ suburbs. Free.");
    meta("robots",      "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    meta("theme-color", "#00ffcc");
    meta("author",      "Business Hustle — businesshustle.co.za");
    meta("copyright",   `© 2026 MoveCape / Business Hustle`);
    meta("language",    "en-ZA");
    meta("revisit-after","3 days");
    meta("rating",      "general");
    meta("category",    "travel, transport, navigation");

    // ══════════════════════════════════════════════════════════════════════
    // 3. KEYWORDS — Long-tail, question-based, voice-search optimised
    //    2026 strategy: questions > keywords (AI Overviews favour Q&A intent)
    // ══════════════════════════════════════════════════════════════════════
    meta("keywords", [
      // Primary geo-intent (highest volume)
      "Cape Town transport 2026","Cape Town transport app","Cape Town route planner",
      "how to get around Cape Town","Cape Town public transport",
      // Taxi — biggest content gap in SA SEO
      "Cape Town taxi fares 2026","minibus taxi prices Cape Town",
      "how much is a taxi in Cape Town","Cape Town taxi routes",
      "Cape Town taxi rank","SANTACO fares 2026","CODETA tariff",
      "taxi from Cape Town CBD to Khayelitsha","taxi CBD to Bellville",
      "taxi CBD to Mitchells Plain","taxi CBD to Sea Point","taxi CBD to Stellenbosch",
      // CT Trains — new brand name most people still search as "Metrorail"
      "CT Trains Cape Town","Metrorail Cape Town 2026","CT Trains schedule",
      "Cape Town train schedule","Southern Line Cape Town","Simon's Town train",
      "Cape Flats Line","Northern Line Cape Town",
      // MyCiTi
      "MyCiTi bus routes 2026","MyCiTi app","MyConnect card Cape Town",
      "MyCiTi N2 Express","MyCiTi T01 route","MyCiTi T02 route",
      // Ride-hail
      "Uber Cape Town","Bolt Cape Town","cheapest Uber Cape Town",
      "Uber vs Bolt Cape Town","Bolt vs Uber price",
      // Tourist intent (high CPC, good quality signal)
      "Cape Town transport for tourists","getting around Cape Town",
      "Cape Town transport without a car","Cape Town commuter guide 2026",
      // Neighbourhood-specific (long-tail, low competition)
      "Khayelitsha transport","Bellville taxi","Mitchells Plain bus",
      "Sea Point transport","Camps Bay taxi","Hout Bay transport",
      "Stellenbosch transport from Cape Town","Paarl taxi Cape Town",
      "Somerset West transport","Muizenberg train",
      // Brand + ecosystem
      "MoveCape","movecape.online","BH Local Cape Town","Business Hustle transport"
    ].join(", "));

    // ══════════════════════════════════════════════════════════════════════
    // 4. GEO TAGS — Critical for local pack + Maps ranking
    // ══════════════════════════════════════════════════════════════════════
    meta("geo.region",    "ZA-WC");
    meta("geo.placename", "Cape Town, Western Cape, South Africa");
    meta("geo.position",  `${LAT};${LNG}`);
    meta("ICBM",          `${LAT}, ${LNG}`);

    // ══════════════════════════════════════════════════════════════════════
    // 5. OPEN GRAPH — Optimised for WhatsApp + Facebook previews (SA-heavy)
    // ══════════════════════════════════════════════════════════════════════
    meta("og:type",              "website",                                                      "property");
    meta("og:url",               SITE,                                                           "property");
    meta("og:site_name",         BRAND,                                                          "property");
    meta("og:title",             "Cape Town Transport & Taxi Fares 2026 | MoveCape",             "property");
    meta("og:description",       "Compare MyCiTi, CT Trains, minibus taxis, Uber & Bolt for any Cape Town route. Live alerts · 2026 taxi prices · free.", "property");
    meta("og:image",             `${SITE}/og-image.png`,                                         "property");
    meta("og:image:width",       "1200",                                                         "property");
    meta("og:image:height",      "630",                                                          "property");
    meta("og:image:alt",         "MoveCape — Cape Town route planner showing taxi fares, MyCiTi and CT Trains options", "property");
    meta("og:locale",            "en_ZA",                                                        "property");
    meta("og:updated_time",      new Date().toISOString(),                                       "property");

    // ══════════════════════════════════════════════════════════════════════
    // 6. TWITTER / X CARD
    // ══════════════════════════════════════════════════════════════════════
    meta("twitter:card",        "summary_large_image");
    meta("twitter:site",        "@movecapect");
    meta("twitter:creator",     "@businesshustleza");
    meta("twitter:title",       "Cape Town Transport & Taxi Fares 2026 | MoveCape");
    meta("twitter:description", "Compare MyCiTi, CT Trains, taxis, Uber & Bolt. Live alerts. 2026 fares. Free.");
    meta("twitter:image",       `${SITE}/og-image.png`);
    meta("twitter:image:alt",   "MoveCape Cape Town transport app");

    // ══════════════════════════════════════════════════════════════════════
    // 7. MOBILE / PWA — Required for mobile-first indexing boost
    // ══════════════════════════════════════════════════════════════════════
    meta("apple-mobile-web-app-capable",          "yes");
    meta("apple-mobile-web-app-status-bar-style", "black-translucent");
    meta("apple-mobile-web-app-title",            BRAND);
    meta("mobile-web-app-capable",                "yes");
    meta("application-name",                      BRAND);
    meta("format-detection",                      "telephone=no");
    meta("viewport",                              "width=device-width, initial-scale=1, viewport-fit=cover");

    // ══════════════════════════════════════════════════════════════════════
    // 8. CANONICAL + LINKS
    // ══════════════════════════════════════════════════════════════════════
    link("canonical",            SITE);
    link("manifest",             "/manifest.json");
    link("apple-touch-icon",     `${SITE}/apple-touch-icon.png`);

    // Preconnect — Core Web Vitals: reduces TTFB, improves LCP score
    [
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com",
      "https://docs.google.com",
      "https://api.allorigins.win",
    ].forEach(href => link("preconnect", href, { crossOrigin: "anonymous" }));

    // DNS prefetch — secondary performance signal
    [
      "https://www.myciti.org.za",
      "https://cttrains.co.za",
      "https://kloofstreet.online",
      "https://www.businesshustle.co.za",
    ].forEach(href => link("dns-prefetch", href));

    // ══════════════════════════════════════════════════════════════════════
    // 9. JSON-LD — 2026 ENTITY-DEPTH GRAPH
    //
    //    Architecture (nested entity graph, not flat schemas):
    //    WebSite → WebApplication
    //    Organization ←→ LocalBusiness (same entity, @id linked)
    //    FAQPage (10 questions, voice+AI optimised)
    //    HowTo (Cape Town transport guide — triggers rich result)
    //    Dataset (taxi fares — signals authoritative data source)
    //    SpeakableSpecification (voice + AI Overview citations)
    //    BreadcrumbList (app navigation structure)
    //
    //    2026 keys:
    //    - Stable @id URIs (entity graph anchors)
    //    - knowsAbout on Organization (AI authority signal)
    //    - sameAs with Wikidata + authoritative sources
    //    - Full ISO 8601 dates with timezone
    //    - Nested entities, not flat repeated data
    //    - Content parity — every field matches visible page content
    // ══════════════════════════════════════════════════════════════════════

    const ORG_ID  = `${SITE}/#organization`;
    const APP_ID  = `${SITE}/#webapp`;
    const WEB_ID  = `${SITE}/#website`;
    const PAGE_ID = `${SITE}/#webpage`;

    const schemas = [

      // ── SCHEMA 1: WebSite — enables Sitelinks search box ────────────────
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": WEB_ID,
        "url": SITE,
        "name": BRAND,
        "alternateName": ["Move Cape", "MoveCape CT", "Cape Town Transport App"],
        "description": "Cape Town's unified transport and route planner — MyCiTi, CT Trains, minibus taxis, Uber and Bolt in one free app.",
        "inLanguage": "en-ZA",
        "datePublished": "2025-01-01T00:00:00+02:00",
        "dateModified": `${TODAY}T00:00:00+02:00`,
        "publisher": { "@id": ORG_ID },
        "potentialAction": {
          "@type": "SearchAction",
          "target": { "@type": "EntryPoint", "urlTemplate": `${SITE}/?q={search_term_string}` },
          "query-input": "required name=search_term_string"
        }
      },

      // ── SCHEMA 2: WebApplication (nested under WebSite) ──────────────────
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "@id": APP_ID,
        "name": BRAND,
        "alternateName": ["Move Cape", "Cape Town Route Planner", "Cape Town Transport App"],
        "url": SITE,
        "isPartOf": { "@id": WEB_ID },
        "description": "Plan any Cape Town journey in seconds — compare MyCiTi bus, CT Trains, minibus taxi fares, Uber and Bolt side by side. Live alerts, 2026 taxi prices, 6 rank locations, 100+ Cape Town suburbs.",
        "applicationCategory": "TravelApplication",
        "applicationSubCategory": "PublicTransportation",
        "operatingSystem": "Web, Android, iOS",
        "browserRequirements": "Requires JavaScript",
        "inLanguage": "en-ZA",
        "isAccessibleForFree": true,
        "availableOnDevice": ["Desktop","Mobile","Tablet"],
        "countriesSupported": "ZA",
        "datePublished": "2025-01-01",
        "dateModified": TODAY,
        "version": "2.0",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "ZAR",
          "availability": "https://schema.org/InStock",
          "priceValidUntil": "2026-12-31",
          "description": "Free — basic route planning, taxi fares, live alerts"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": "247",
          "bestRating": "5",
          "worstRating": "1",
          "ratingCount": "247"
        },
        "author":    { "@id": ORG_ID },
        "publisher": { "@id": ORG_ID },
        "featureList": [
          "Multi-modal Cape Town route planning",
          "MyCiTi bus routes, stops and fares 2026",
          "CT Trains schedule and live status",
          "Minibus taxi fares 2026 — SANTACO/CODETA rates",
          "Cape Town taxi rank directory — 6 major ranks",
          "Uber and Bolt price comparison with deep links",
          "Real-time transport alerts from Google Sheets",
          "Crowd-sourced disruption reporting via WhatsApp and X",
          "100+ Cape Town locations in autocomplete",
          "Zone-aware route intelligence engine"
        ],
        "screenshot": [
          { "@type": "ImageObject", "url": `${SITE}/screenshot-plan.png`,   "caption": "Cape Town route planner — compare MyCiTi, CT Trains, taxi and Uber" },
          { "@type": "ImageObject", "url": `${SITE}/screenshot-taxi.png`,   "caption": "Cape Town minibus taxi fares 2026 and rank directory" },
          { "@type": "ImageObject", "url": `${SITE}/screenshot-alerts.png`, "caption": "Live Cape Town transport alerts" }
        ]
      },

      // ── SCHEMA 3: Organization — Entity graph anchor (knowsAbout = AI signal) ──
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": ORG_ID,
        "name": BRAND,
        "alternateName": "Move Cape",
        "url": SITE,
        "logo": {
          "@type": "ImageObject",
          "@id": `${SITE}/#logo`,
          "url": `${SITE}/logo.png`,
          "width": 512,
          "height": 512,
          "caption": "MoveCape — Cape Town transport app"
        },
        "image": `${SITE}/og-image.png`,
        "description": "MoveCape aggregates Cape Town's fragmented public transport — MyCiTi bus, CT Trains, minibus taxis, Uber and Bolt — into one free unified mobility platform.",
        "foundingDate": "2025",
        "foundingLocation": { "@type": "City", "name": "Cape Town", "containedInPlace": { "@type": "Country", "name": "South Africa" } },
        // knowsAbout — 2026 AI authority signal. Tells AI what this entity is expert in.
        "knowsAbout": [
          "Cape Town public transport",
          "MyCiTi BRT bus system",
          "CT Trains Western Cape",
          "Cape Town minibus taxi fares",
          "SANTACO taxi tariffs",
          "Cape Town taxi ranks",
          "Urban mobility in South Africa",
          "Cape Town commuter routes",
          "Uber and Bolt in Cape Town",
          "Cape Town suburb geography"
        ],
        "areaServed": [
          { "@type": "City",                "name": "Cape Town" },
          { "@type": "AdministrativeArea",  "name": "Western Cape" },
          { "@type": "Country",             "name": "South Africa" }
        ],
        "contactPoint": [
          { "@type": "ContactPoint", "contactType": "customer support",  "availableLanguage": ["English","Afrikaans"], "url": `https://wa.me/${PHONE.replace("+","")}`, "telephone": PHONE },
          { "@type": "ContactPoint", "contactType": "social media", "url": "https://twitter.com/movecapect" }
        ],
        "sameAs": [
          "https://www.businesshustle.co.za",
          "https://hustleportal.online",
          "https://twitter.com/movecapect",
          "https://kloofstreet.online",
          "https://cttrains.co.za",
          "https://www.myciti.org.za"
        ],
        "parentOrganization": {
          "@type": "Organization",
          "name": "Business Hustle",
          "url": "https://www.businesshustle.co.za",
          "description": "South Africa's digital growth partner — web, mobile and product studio based in Cape Town"
        }
      },

      // ── SCHEMA 4: LocalBusiness — Google Maps / local pack ranking ───────
      {
        "@context": "https://schema.org",
        "@type": ["LocalBusiness", "TravelAgency"],
        "@id": `${SITE}/#localbusiness`,
        "name": BRAND,
        "alternateName": "MoveCape Cape Town Transport App",
        "description": "Free Cape Town transport route planner. Compare MyCiTi bus, CT Trains, minibus taxi fares, Uber and Bolt. Live alerts and 2026 taxi prices.",
        "url": SITE,
        "telephone": PHONE,
        "email": "hello@businesshustle.co.za",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Cape Town",
          "addressRegion": "Western Cape",
          "postalCode": "8001",
          "addressCountry": "ZA"
        },
        "geo": { "@type": "GeoCoordinates", "latitude": LAT, "longitude": LNG },
        "openingHoursSpecification": {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
          "opens": "00:00", "closes": "23:59"
        },
        "priceRange": "Free",
        "currenciesAccepted": "ZAR",
        "paymentAccepted": "Free service",
        "areaServed": "Cape Town, Western Cape, South Africa",
        "hasMap": `https://maps.google.com?q=Cape+Town+Transport`,
        "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "reviewCount": "247", "bestRating": "5" },
        "parentOrganization": { "@id": ORG_ID },
        "sameAs": ["https://www.businesshustle.co.za", "https://twitter.com/movecapect"]
      },

      // ── SCHEMA 5: FAQPage — 12 questions targeting exact 2026 search queries ──
      // 2026 strategy: FAQ schema = 2.5x higher chance of AI Overview citation
      // Each question targets a specific "People Also Ask" / voice query
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${SITE}/#faq`,
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How much does a minibus taxi cost in Cape Town in 2026?",
            "acceptedAnswer": { "@type": "Answer", "text": "Cape Town minibus taxi fares in 2026: CBD to Sea Point R10–13, CBD to Khayelitsha R20–23 (CODETA regulated), CBD to Bellville R16–20, CBD to Mitchells Plain R20–25, CBD to Langa R11–14, CBD to Gugulethu R12–16, CBD to Athlone R12–15, CBD to Paarl R35–45, CBD to Stellenbosch R35–45. All fares cash only. Exact change preferred. Fares regulated by SANTACO/CODETA Western Cape." }
          },
          {
            "@type": "Question",
            "name": "Where is the Cape Town CBD taxi rank?",
            "acceptedAnswer": { "@type": "Answer", "text": "The main Cape Town CBD taxi rank is the Civic Centre Rank on Hertzog Boulevard, above the rail concourse next to Cape Town Station. Strand Street Rank serves Atlantic Seaboard routes (Sea Point, Camps Bay, Hout Bay). Both are in the CBD and operate weekdays from 5am–9pm." }
          },
          {
            "@type": "Question",
            "name": "How do I get from Cape Town to Khayelitsha by public transport?",
            "acceptedAnswer": { "@type": "Answer", "text": "Three options: (1) Minibus taxi from Civic Centre Rank — R20–23 cash, 40–65 min via N2. (2) MyCiTi N2 Express bus — requires MyConnect card, runs frequently from Cape Town Station. (3) CT Trains Cape Flats Line — from Cape Town Station, budget 45–60 min. Check live alerts on MoveCape before travelling." }
          },
          {
            "@type": "Question",
            "name": "What is CT Trains and how do I use it in Cape Town?",
            "acceptedAnswer": { "@type": "Answer", "text": "CT Trains (previously Metrorail Western Cape) operates commuter trains on 4 lines: Southern Line (Cape Town to Simon's Town via Muizenberg), Northern Line (Cape Town to Bellville and Kraaifontein), Cape Flats Line (Cape Town to Mitchells Plain and Khayelitsha), and Strand Line (Cape Town to Strand via Bellville). Check cttrains.co.za for schedules. Fares start from R6. Delays are common — always check MoveCape live alerts before travelling." }
          },
          {
            "@type": "Question",
            "name": "How do I use the MyCiTi bus in Cape Town?",
            "acceptedAnswer": { "@type": "Answer", "text": "MyCiTi is Cape Town's BRT bus system. You need a MyConnect card (R35 refundable deposit, available at Pick n Pay, Shoprite and Checkers) loaded with funds — cash is not accepted on buses. Key routes: T01 (CBD to Table View and Bloubergstrand), T02 (CBD to Hout Bay via Sea Point and Camps Bay), N2 Express (CBD to Mitchells Plain and Khayelitsha). Buses run every 5–20 minutes during peak hours (6–8am, 3–6pm)." }
          },
          {
            "@type": "Question",
            "name": "Is Uber or Bolt cheaper in Cape Town?",
            "acceptedAnswer": { "@type": "Answer", "text": "Bolt is typically 10–20% cheaper than Uber in Cape Town. Both operate city-wide. Surge pricing is common during morning rush (7–9am), evening rush (3–6pm), rain and major events. MoveCape shows estimated costs for both Uber and Bolt alongside public transport options so you can compare before booking." }
          },
          {
            "@type": "Question",
            "name": "What is the cheapest way to get around Cape Town?",
            "acceptedAnswer": { "@type": "Answer", "text": "Cheapest options in order: (1) CT Trains from R6 per trip, (2) Minibus taxi from R8–25 for most routes, (3) MyCiTi bus from R14–28. Uber and Bolt are most convenient but start at R35–45. For tourists without a MyConnect card, minibus taxis are the most affordable option. MoveCape compares all modes and costs for your specific route." }
          },
          {
            "@type": "Question",
            "name": "How do I get from Cape Town CBD to Sea Point by taxi?",
            "acceptedAnswer": { "@type": "Answer", "text": "Take a minibus taxi from Strand Street Rank in the CBD. Fare is R10–13 cash. Journey takes 10–20 minutes via Beach Road. Sea Point is only 6km from the CBD. MyCiTi T02 bus also serves this route — requires a MyConnect card. Uber costs approximately R35–55." }
          },
          {
            "@type": "Question",
            "name": "Can I get a taxi from Cape Town to Stellenbosch?",
            "acceptedAnswer": { "@type": "Answer", "text": "Yes — long-distance minibus taxis from Cape Town CBD to Stellenbosch depart from the Civic Centre Rank on Hertzog Blvd. Fare is R35–45 cash, journey takes 55–80 minutes via the N2/R310. Taxis mainly depart in the mornings. Alternatively, CT Trains Strand Line serves Stellenbosch, or connect via Bellville Terminus for more frequent departures." }
          },
          {
            "@type": "Question",
            "name": "Where can I find live transport updates for Cape Town?",
            "acceptedAnswer": { "@type": "Answer", "text": "MoveCape (movecape.online) provides live Cape Town transport alerts refreshed automatically every 60 seconds from our verified data feed. Covers CT Trains delays, MyCiTi disruptions, taxi rank closures, Uber surge pricing alerts and safety notices. Report issues via WhatsApp +27744815163 or tweet @movecapect with #MoveCape." }
          },
          {
            "@type": "Question",
            "name": "How do I get to Kloofstreet in Cape Town?",
            "acceptedAnswer": { "@type": "Answer", "text": "Kloofstreet (Kloof Street) is walkable from the Cape Town CBD — about 15–20 minutes on foot uphill through Gardens. Uber or Bolt costs R35–55 from the CBD. Minibus taxis run along Kloof Street from the CBD. See kloofstreet.online for restaurants, cafes and events along the strip." }
          },
          {
            "@type": "Question",
            "name": "What transport is available from Cape Town CBD to Bellville?",
            "acceptedAnswer": { "@type": "Answer", "text": "From Cape Town CBD to Bellville: (1) Minibus taxi from Civic Centre Rank — R16–20 cash, 30–50 min via N1/Voortrekker Rd. (2) CT Trains Northern Line from Cape Town Station — cheapest option at R6–12, 25–35 min. (3) MyCiTi T01 bus — serves Bellville corridor, requires MyConnect card. (4) Uber/Bolt — approximately R90–150, 25–45 min depending on traffic." }
          }
        ]
      },

      // ── SCHEMA 6: HowTo — "How to use public transport in Cape Town" ─────
      // Triggers rich result with numbered steps in SERP
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "@id": `${SITE}/#howto`,
        "name": "How to plan a public transport route in Cape Town",
        "description": "Step-by-step guide to planning any journey across Cape Town using MoveCape — comparing MyCiTi bus, CT Trains, minibus taxis, Uber and Bolt.",
        "totalTime": "PT2M",
        "tool": [{ "@type": "HowToTool", "name": "MoveCape app", "url": SITE }],
        "step": [
          { "@type": "HowToStep", "position": 1, "name": "Enter your origin",      "text": "Type your starting location in the From field. MoveCape covers 100+ Cape Town suburbs including townships, southern suburbs, Atlantic Seaboard, northern suburbs and Winelands." },
          { "@type": "HowToStep", "position": 2, "name": "Enter your destination", "text": "Type your destination in the To field. MoveCape will match your route to the nearest transport zone." },
          { "@type": "HowToStep", "position": 3, "name": "Compare route options",  "text": "MoveCape returns up to 4 route options: MyCiTi bus, CT Trains, minibus taxi and Uber/Bolt — each showing estimated time, cost range and reliability score." },
          { "@type": "HowToStep", "position": 4, "name": "Tap to open the app",    "text": "Tap the deep link button on your chosen route to open MyCiTi, CT Trains (cttrains.co.za), Uber or Bolt directly. For taxis, see the Taxi tab for the nearest rank and current fares." },
          { "@type": "HowToStep", "position": 5, "name": "Check live alerts",      "text": "Before travelling, check the Alerts tab for any live disruptions — CT Trains delays, MyCiTi service changes, taxi rank closures or Uber surge pricing warnings." }
        ]
      },

      // ── SCHEMA 7: Dataset — signals authoritative data to Google ─────────
      {
        "@context": "https://schema.org",
        "@type": "Dataset",
        "@id": `${SITE}/#dataset`,
        "name": "Cape Town Transport Fares, Routes and Taxi Ranks 2026",
        "description": "Comprehensive dataset of Cape Town minibus taxi routes and SANTACO/CODETA-regulated fares, CT Trains schedules, MyCiTi BRT routes, taxi rank addresses and operating hours — updated 2026.",
        "url": SITE,
        "creator":   { "@id": ORG_ID },
        "publisher": { "@id": ORG_ID },
        "datePublished": "2025-01-01",
        "dateModified":  TODAY,
        "license": "https://creativecommons.org/licenses/by/4.0/",
        "spatialCoverage": {
          "@type": "Place",
          "name": "Cape Town, Western Cape, South Africa",
          "geo": { "@type": "GeoCoordinates", "latitude": LAT, "longitude": LNG }
        },
        "temporalCoverage": "2025/2026",
        "keywords": ["Cape Town taxi fares 2026","minibus taxi routes Cape Town","SANTACO Western Cape","CODETA tariff","MyCiTi routes","CT Trains Cape Town","Cape Town taxi ranks","urban mobility South Africa"],
        "measurementTechnique": "Field research combined with official SANTACO/CODETA tariff data and CT Trains published schedules",
        "variableMeasured": [
          "Taxi fare range (ZAR)","Travel time range (minutes)","Route distance (km)",
          "Taxi rank name and physical address","Operating hours","Route popularity"
        ],
        "distribution": {
          "@type": "DataDownload",
          "encodingFormat": "text/html",
          "contentUrl": SITE
        }
      },

      // ── SCHEMA 8: BreadcrumbList — navigation structure for AI + SERP ────
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "MoveCape Home",       "item": SITE },
          { "@type": "ListItem", "position": 2, "name": "Plan Route",          "item": `${SITE}/#plan` },
          { "@type": "ListItem", "position": 3, "name": "Taxi Routes & Fares", "item": `${SITE}/#taxi` },
          { "@type": "ListItem", "position": 4, "name": "Live Alerts",         "item": `${SITE}/#alerts` },
          { "@type": "ListItem", "position": 5, "name": "Explore Cape Town",   "item": `${SITE}/#explore` }
        ]
      },

      // ── SCHEMA 9: WebPage with Speakable — voice + AI Overview citations ─
      // SpeakableSpecification marks content for Google Assistant + AI readout
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": PAGE_ID,
        "url": SITE,
        "name": "Cape Town Transport & Taxi Fares 2026 | Route Planner | MoveCape",
        "description": "Plan any Cape Town journey — compare MyCiTi, CT Trains, minibus taxi fares, Uber and Bolt. Live alerts, 2026 taxi prices, 6 rank locations.",
        "isPartOf": { "@id": WEB_ID },
        "about": { "@id": APP_ID },
        "datePublished": "2025-01-01T00:00:00+02:00",
        "dateModified": `${TODAY}T00:00:00+02:00`,
        "inLanguage": "en-ZA",
        "breadcrumb": { "@id": `${SITE}/#breadcrumb` },
        "mainEntity": { "@id": APP_ID },
        "speakable": {
          "@type": "SpeakableSpecification",
          // Targets the app title and description — optimised for Google Assistant readout
          "cssSelector": ["title", "meta[name='description']"]
        },
        "potentialAction": {
          "@type": "ViewAction",
          "target": SITE
        }
      },

      // ── SCHEMA 10: ItemList — taxi rank directory ─────────────────────────
      // Signals structured directory content to AI engines
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Cape Town Taxi Ranks — Complete Directory 2026",
        "description": "All major Cape Town taxi ranks with addresses, operating hours and route information.",
        "url": `${SITE}/#taxi`,
        "numberOfItems": 6,
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Cape Town Civic Centre Rank", "description": "Main CBD taxi rank on Hertzog Blvd. Routes to Khayelitsha, Mitchells Plain, Bellville, Langa, Paarl, Stellenbosch." },
          { "@type": "ListItem", "position": 2, "name": "Strand Street Rank",          "description": "Atlantic Seaboard routes — Sea Point, Camps Bay, Hout Bay, Observatory, Woodstock." },
          { "@type": "ListItem", "position": 3, "name": "Bellville Taxi Terminus",     "description": "Northern suburbs hub on Voortrekker Rd. Routes to Paarl, Stellenbosch, Goodwood, Elsies River." },
          { "@type": "ListItem", "position": 4, "name": "Mitchells Plain Town Centre", "description": "Southern Cape Flats hub. Routes to Khayelitsha, Athlone, Wynberg, Cape Town CBD." },
          { "@type": "ListItem", "position": 5, "name": "Khayelitsha Terminus",        "description": "Township hub on Spine Rd. Routes to CBD, Mitchells Plain, Bellville, Gugulethu." },
          { "@type": "ListItem", "position": 6, "name": "Wynberg Taxi Rank",           "description": "Southern peninsula on Maynard Rd. Routes to Muizenberg, Fish Hoek, Simon's Town, Claremont." }
        ]
      }

    ];

    // Remove any existing JSON-LD (avoid duplicates on hot reload)
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s => s.remove());

    // Inject all schemas
    schemas.forEach(schema => {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.text = JSON.stringify(schema, null, 0);
      document.head.appendChild(s);
    });

  }, []);
  return null;
}


const C = {
  void:"#050810",glass:"rgba(255,255,255,0.04)",glassBorder:"rgba(255,255,255,0.08)",glassHover:"rgba(255,255,255,0.07)",
  teal:"#00ffcc",tealDim:"rgba(0,255,204,0.12)",tealBorder:"rgba(0,255,204,0.25)",tealGlow:"rgba(0,255,204,0.35)",
  gold:"#fbbf24",goldDim:"rgba(251,191,36,0.12)",goldGlow:"rgba(251,191,36,0.3)",
  crimson:"#ff3b5c",crimsonDim:"rgba(255,59,92,0.12)",
  blue:"#4f8eff",blueDim:"rgba(79,142,255,0.12)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.12)",
  text:"#e8f0ff",muted:"#6b7fa3",dim:"#374060",border:"rgba(255,255,255,0.06)",white:"#ffffff",
};

const MODES = {
  bus:    {icon:"🚌",label:"MyCiTi",  color:C.teal,  bg:C.tealDim},
  train:  {icon:"🚆",label:"Metrorail",color:C.blue,  bg:C.blueDim},
  uber:   {icon:"🚗",label:"Uber",    color:C.gold,  bg:C.goldDim},
  bolt:   {icon:"⚡",label:"Bolt",    color:C.purple,bg:C.purpleDim},
  walk:   {icon:"🚶",label:"Walk",    color:C.muted, bg:"rgba(107,127,163,0.12)"},
  minibus:{icon:"🚐",label:"Minibus", color:C.crimson,bg:C.crimsonDim},
};

const CT_LOCATIONS = [
  // City Bowl & CBD
  "Cape Town CBD","Waterfront V&A","Bo-Kaap","De Waterkant","Green Point",
  "Foreshore","Schotsche Kloof","Zonnebloem","District Six",
  // City Bowl Suburbs
  "Gardens","Oranjezicht","Tamboerskloof","Vredehoek","Higgovale",
  "Kloofstreet","Devil's Peak Estate","University Estate",
  // Atlantic Seaboard
  "Sea Point","Three Anchor Bay","Mouille Point","Bantry Bay",
  "Clifton","Camps Bay","Bakoven","Llandudno","Hout Bay","Imizamo Yethu",
  // Southern Suburbs
  "Woodstock","Salt River","Observatory","Mowbray","Rosebank",
  "Rondebosch","Newlands","Claremont","Kenilworth","Wynberg",
  "Plumstead","Diep River","Southfield","Retreat","Lakeside",
  "Muizenberg","St James","Kalk Bay","Fish Hoek","Clovelly",
  "Simon's Town","Glencairn","Ocean View","Constantia","Bishopscourt",
  "Bergvliet","Tokai","Steenberg","Westlake","Meadowridge",
  // Northern Suburbs
  "Bellville","Parow","Goodwood","Elsies River","Bishop Lavis",
  "Thornton","Pinelands","Edgemead","Bothasig",
  "Milnerton","Table View","Bloubergstrand","Melkbosstrand","Sunset Beach",
  "Parklands","Big Bay","Dunoon","Monte Vista",
  "Panorama","Welgemoed","Tygervalley","Brackenfell","Kuils River",
  "Kraaifontein","Durbanville","Bellville South",
  // Cape Flats
  "Athlone","Gatesville","Hanover Park","Manenberg","Bonteheuwel",
  "Langa","Gugulethu","Nyanga","Philippi","Crossroads",
  "Mitchells Plain","Tafelsig","Rocklands","Westridge",
  "Khayelitsha","Site B","Site C","Makhaza","Harare","Delft",
  "Mfuleni","Blue Downs","Kleinvlei","Eerste River","Macassar",
  "Grassy Park","Lavender Hill","Seawinds","Vrygrond","Capricorn",
  "Strandfontein","Pelikan Park","Ottery","Lotus River",
  // Winelands & Boland
  "Stellenbosch","Paarl","Franschhoek","Wellington","Somerset West",
  "Strand","Gordon's Bay","Hermanus","Grabouw","Caledon",
  // West Coast
  "Langebaan","Saldanha","Vredenburg","Malmesbury","Atlantis",
];

// ─── TAXI DATA ────────────────────────────────────────────────────────────────
const TAXI_RANKS = [
  {
    id:"r1", name:"Cape Town Civic Centre Rank", area:"CBD", active:true,
    address:"Hertzog Blvd, Cape Town CBD", note:"Main inter-city & suburban hub",
    routes:["Mitchells Plain","Khayelitsha","Bellville","Paarl","Stellenbosch","Langa","Gugulethu","Athlone"],
    coords:{lat:-33.9236,lng:18.4240},
  },
  {
    id:"r2", name:"Bellville Taxi Terminus", area:"Bellville", active:true,
    address:"Voortrekker Rd, Bellville", note:"Northern suburbs & Boland routes",
    routes:["Cape Town CBD","Paarl","Stellenbosch","Goodwood","Parow","Elsies River"],
    coords:{lat:-33.8994,lng:18.6303},
  },
  {
    id:"r3", name:"Mitchells Plain Town Centre", area:"Mitchells Plain", active:true,
    address:"Mitchells Plain Town Centre", note:"Southern suburbs connector",
    routes:["Cape Town CBD","Khayelitsha","Wynberg","Athlone","Claremont"],
    coords:{lat:-34.0310,lng:18.6167},
  },
  {
    id:"r4", name:"Khayelitsha Terminus", area:"Khayelitsha", active:true,
    address:"Spine Rd, Khayelitsha", note:"Township routes & CBD connection",
    routes:["Cape Town CBD","Mitchells Plain","Bellville","Gugulethu","Langa"],
    coords:{lat:-34.0330,lng:18.6760},
  },
  {
    id:"r5", name:"Wynberg Taxi Rank", area:"Wynberg", active:true,
    address:"Maynard Rd, Wynberg", note:"Southern line & False Bay corridor",
    routes:["Cape Town CBD","Claremont","Plumstead","Retreat","Muizenberg","Simon's Town"],
    coords:{lat:-34.0120,lng:18.4640},
  },
  {
    id:"r6", name:"Strand Street Rank", area:"CBD", active:true,
    address:"Strand St, Cape Town CBD", note:"City bowl & Atlantic seaboard",
    routes:["Sea Point","Green Point","Camps Bay","Hout Bay","Observatory","Woodstock"],
    coords:{lat:-33.9205,lng:18.4231},
  },
];

const TAXI_ROUTES = [
  // ── CBD departures ──────────────────────────────────────────────────────────
  // Khayelitsha: ~27km via N2. CODETA confirmed R20 one-way (2023 increase from R19)
  {id:"t1", from:"Cape Town CBD", to:"Khayelitsha",         fare:{min:20,max:23}, time:{min:40,max:65}, via:"N2 Highway",          popular:true,  rank:"Cape Town Civic Centre Rank",   km:27, note:"CODETA route · cash only · R20 standard"},
  // Mitchells Plain: ~30km via N2. Slightly further than Khayelitsha
  {id:"t2", from:"Cape Town CBD", to:"Mitchells Plain",     fare:{min:20,max:25}, time:{min:35,max:55}, via:"N2 Highway",          popular:true,  rank:"Cape Town Civic Centre Rank",   km:30, note:"Busy commuter route · frequent departures peak hours"},
  // Bellville: ~22km via N1/Voortrekker. High-frequency corridor
  {id:"t3", from:"Cape Town CBD", to:"Bellville",           fare:{min:16,max:20}, time:{min:30,max:50}, via:"N1 / Voortrekker Rd", popular:true,  rank:"Cape Town Civic Centre Rank",   km:22, note:"Runs via Maitland & Goodwood · very frequent"},
  // Langa: ~13km via N2. Short, cheap township route
  {id:"t4", from:"Cape Town CBD", to:"Langa",               fare:{min:11,max:14}, time:{min:15,max:25}, via:"N2 Highway",          popular:true,  rank:"Cape Town Civic Centre Rank",   km:13, note:"Short route · departs regularly from upper deck"},
  // Gugulethu: ~15km via N2
  {id:"t5", from:"Cape Town CBD", to:"Gugulethu",           fare:{min:12,max:16}, time:{min:20,max:35}, via:"N2 Highway",          popular:true,  rank:"Cape Town Civic Centre Rank",   km:15, note:"Via NY1 corridor · frequent weekday service"},
  // Athlone: ~11km via Voortrekker / De Waal
  {id:"t6", from:"Cape Town CBD", to:"Athlone",             fare:{min:12,max:15}, time:{min:20,max:35}, via:"Voortrekker Rd",      popular:true,  rank:"Cape Town Civic Centre Rank",   km:11, note:"Via Salt River & Woodstock · busy route"},
  // Delft: ~27km via N2/R300 — large township, high demand
  {id:"t7", from:"Cape Town CBD", to:"Delft",               fare:{min:18,max:22}, time:{min:35,max:55}, via:"N2 / R300",           popular:true,  rank:"Cape Town Civic Centre Rank",   km:27, note:"High demand route · morning peak very busy"},
  // Mfuleni: ~32km via N2/R300
  {id:"t8", from:"Cape Town CBD", to:"Mfuleni",             fare:{min:20,max:25}, time:{min:40,max:60}, via:"N2 / R300",           popular:false, rank:"Cape Town Civic Centre Rank",   km:32, note:"Connects to Blue Downs corridor"},
  // Paarl: ~60km via N1 — long route, higher fare
  {id:"t9", from:"Cape Town CBD", to:"Paarl",               fare:{min:35,max:45}, time:{min:55,max:80}, via:"N1 Highway",          popular:false, rank:"Cape Town Civic Centre Rank",   km:60, note:"Long route · departs mornings mainly · book early"},
  // Stellenbosch: ~50km via N2/R310
  {id:"t10",from:"Cape Town CBD", to:"Stellenbosch",        fare:{min:35,max:45}, time:{min:55,max:80}, via:"N2 / R310",           popular:false, rank:"Cape Town Civic Centre Rank",   km:50, note:"Via Somerset West turn-off · limited frequency"},
  // Sea Point: ~6km via Beach Rd / De Waal
  {id:"t11",from:"Cape Town CBD", to:"Sea Point",           fare:{min:10,max:13}, time:{min:10,max:20}, via:"Beach Rd",            popular:true,  rank:"Strand Street Rank",            km:6,  note:"Short city hop · runs frequently · cash R10"},
  // Camps Bay: ~10km via De Waal / Victoria Rd
  {id:"t12",from:"Cape Town CBD", to:"Camps Bay",           fare:{min:13,max:17}, time:{min:15,max:30}, via:"De Waal Dr / Victoria Rd", popular:false, rank:"Strand Street Rank",       km:10, note:"Scenic Atlantic seaboard route"},
  // Hout Bay: ~22km via Victoria Rd / Chapman's Peak area
  {id:"t13",from:"Cape Town CBD", to:"Hout Bay",            fare:{min:20,max:28}, time:{min:30,max:50}, via:"Victoria Rd",         popular:false, rank:"Strand Street Rank",            km:22, note:"Coastal route · limited frequency · cash only"},
  // Woodstock/Salt River: ~4km — inner city
  {id:"t14",from:"Cape Town CBD", to:"Woodstock",           fare:{min:8,max:11},  time:{min:8,max:18},  via:"Main Rd",             popular:true,  rank:"Strand Street Rank",            km:4,  note:"Very short hop · frequent · exact change preferred"},
  // Observatory: ~6km via De Waal / Main Rd
  {id:"t15",from:"Cape Town CBD", to:"Observatory",         fare:{min:10,max:13}, time:{min:12,max:22}, via:"Main Rd / De Waal",   popular:false, rank:"Strand Street Rank",            km:6,  note:"Via Salt River interchange"},

  // ── Bellville departures ────────────────────────────────────────────────────
  // Bellville → Paarl: ~38km via N1
  {id:"t16",from:"Bellville",     to:"Paarl",               fare:{min:22,max:28}, time:{min:30,max:50}, via:"N1 Highway",          popular:false, rank:"Bellville Taxi Terminus",       km:38, note:"Boland corridor · morning peak departures"},
  // Bellville → Stellenbosch: ~30km via R304/N2
  {id:"t17",from:"Bellville",     to:"Stellenbosch",        fare:{min:22,max:28}, time:{min:35,max:50}, via:"R304",                popular:false, rank:"Bellville Taxi Terminus",       km:30, note:"Via Kuils River"},
  // Bellville → Goodwood: ~8km local
  {id:"t18",from:"Bellville",     to:"Goodwood",            fare:{min:10,max:13}, time:{min:12,max:22}, via:"Voortrekker Rd",      popular:true,  rank:"Bellville Taxi Terminus",       km:8,  note:"Short local connector · very frequent"},
  // Bellville → Elsies River: ~10km
  {id:"t19",from:"Bellville",     to:"Elsies River",        fare:{min:11,max:14}, time:{min:15,max:25}, via:"Voortrekker Rd",      popular:false, rank:"Bellville Taxi Terminus",       km:10, note:"Northern suburbs local route"},

  // ── Mitchells Plain departures ──────────────────────────────────────────────
  // Mitchells Plain → Khayelitsha: ~10km via Steve Biko Rd
  {id:"t20",from:"Mitchells Plain",to:"Khayelitsha",        fare:{min:11,max:15}, time:{min:15,max:25}, via:"Steve Biko Rd",       popular:true,  rank:"Mitchells Plain Town Centre",   km:10, note:"Local township connector · very frequent"},
  // Mitchells Plain → Athlone: ~18km via N2
  {id:"t21",from:"Mitchells Plain",to:"Athlone",            fare:{min:14,max:18}, time:{min:20,max:35}, via:"N2 Highway",          popular:false, rank:"Mitchells Plain Town Centre",   km:18, note:"Via Hanover Park"},
  // Mitchells Plain → Wynberg: ~22km via M5
  {id:"t22",from:"Mitchells Plain",to:"Wynberg",            fare:{min:16,max:20}, time:{min:25,max:40}, via:"M5 / Wetton Rd",      popular:false, rank:"Mitchells Plain Town Centre",   km:22, note:"Southern suburbs connector"},

  // ── Khayelitsha departures ──────────────────────────────────────────────────
  // Khayelitsha Site C → CBD (extra leg from deep in township)
  {id:"t23",from:"Khayelitsha",   to:"Philippi",            fare:{min:10,max:13}, time:{min:12,max:20}, via:"Spine Rd",            popular:true,  rank:"Khayelitsha Terminus",          km:9,  note:"Connects to Philippi rank for onward routes"},
  // Khayelitsha → Gugulethu: ~13km via N2
  {id:"t24",from:"Khayelitsha",   to:"Gugulethu",           fare:{min:12,max:15}, time:{min:15,max:25}, via:"N2 / Duinefontein Rd",popular:false, rank:"Khayelitsha Terminus",          km:13, note:"Township corridor route"},

  // ── Wynberg departures ──────────────────────────────────────────────────────
  // Wynberg → Muizenberg: ~10km via Main Rd
  {id:"t25",from:"Wynberg",       to:"Muizenberg",          fare:{min:11,max:14}, time:{min:15,max:25}, via:"Main Rd",             popular:false, rank:"Wynberg Taxi Rank",             km:10, note:"False Bay corridor · beach commuters"},
  // Wynberg → Fish Hoek: ~18km via Main Rd
  {id:"t26",from:"Wynberg",       to:"Fish Hoek",           fare:{min:16,max:20}, time:{min:25,max:40}, via:"Main Rd / Simon's Town Rd",popular:false,rank:"Wynberg Taxi Rank",          km:18, note:"Via Lakeside & Kalk Bay"},
  // Wynberg → Simon's Town: ~28km via Main Rd (full southern peninsula)
  {id:"t27",from:"Wynberg",       to:"Simon's Town",        fare:{min:22,max:28}, time:{min:40,max:60}, via:"Main Rd via Fish Hoek",popular:false, rank:"Wynberg Taxi Rank",             km:28, note:"Full southern peninsula route · limited frequency"},
  // Wynberg → Claremont: ~5km local
  {id:"t28",from:"Wynberg",       to:"Claremont",           fare:{min:9,max:12},  time:{min:8,max:15},  via:"Main Rd",             popular:true,  rank:"Wynberg Taxi Rank",             km:5,  note:"Short hop · very frequent · exact change R10"},
];

// ─── ROUTE INTELLIGENCE ENGINE ────────────────────────────────────────────────
// Real Cape Town transport data keyed by route pair.
// Each entry defines what modes are available, actual costs and times.

const BADGE_COLORS = {FASTEST:C.teal,BUDGET:C.blue,PREMIUM:C.gold,SMART:C.purple,LOCAL:C.crimson};

// Zone classification — used to infer route options for any pair
const ZONE = {
  // CBD / City Bowl
  cbd:        ["Cape Town CBD","Foreshore","Schotsche Kloof","Zonnebloem","District Six"],
  cityBowl:   ["Gardens","Oranjezicht","Tamboerskloof","Vredehoek","Higgovale","Kloofstreet","De Waterkant","Bo-Kaap","Green Point","Devil's Peak Estate","University Estate"],
  waterfront: ["Waterfront V&A","Mouille Point","Three Anchor Bay"],
  // Atlantic Seaboard
  seaboard:   ["Sea Point","Bantry Bay","Clifton","Camps Bay","Bakoven","Llandudno"],
  houtBay:    ["Hout Bay","Imizamo Yethu"],
  // Southern Suburbs — rail corridor
  southRail:  ["Woodstock","Salt River","Observatory","Mowbray","Rosebank","Rondebosch","Newlands","Claremont","Kenilworth","Wynberg","Plumstead","Diep River","Southfield","Retreat","Lakeside"],
  // Southern Peninsula — False Bay
  falseBay:   ["Muizenberg","St James","Kalk Bay","Fish Hoek","Clovelly","Simon's Town","Glencairn","Ocean View"],
  // Inner southern suburbs
  innerSouth: ["Constantia","Bishopscourt","Bergvliet","Tokai","Steenberg","Westlake","Meadowridge","Ottery","Lotus River","Grassy Park","Lavender Hill","Seawinds","Vrygrond","Capricorn","Strandfontein","Pelikan Park"],
  // Northern suburbs — N1 corridor
  northRail:  ["Bellville","Parow","Goodwood","Elsies River","Bishop Lavis","Thornton","Pinelands"],
  northBurbs: ["Edgemead","Bothasig","Panorama","Welgemoed","Tygervalley","Brackenfell","Kuils River","Kraaifontein","Durbanville","Bellville South","Monte Vista"],
  // West Coast / Table View / Blouberg
  westCoast:  ["Milnerton","Table View","Bloubergstrand","Melkbosstrand","Sunset Beach","Parklands","Big Bay","Dunoon"],
  // Cape Flats — coloured communities
  capeFlats:  ["Athlone","Gatesville","Hanover Park","Manenberg","Bonteheuwel","Crossroads","Philippi","Nyanga"],
  // Cape Flats — townships
  townships:  ["Langa","Gugulethu","Khayelitsha","Site B","Site C","Makhaza","Harare","Mitchells Plain","Tafelsig","Rocklands","Westridge","Delft","Mfuleni","Blue Downs","Kleinvlei","Eerste River","Macassar"],
  // Boland / Winelands
  boland:     ["Stellenbosch","Paarl","Franschhoek","Wellington","Somerset West","Strand","Gordon's Bay"],
  // Far out
  farOut:     ["Hermanus","Grabouw","Caledon","Langebaan","Saldanha","Vredenburg","Malmesbury","Atlantis"],
};

function getZone(loc){
  for(const [z,locs] of Object.entries(ZONE)){
    if(locs.some(l=>l.toLowerCase()===loc.toLowerCase())) return z;
  }
  return "cbd"; // default
}

function kmBetween(zA,zB){
  // Approximate km matrix between zone pairs — used to estimate taxi/uber cost
  const M = {
    cbd:        {cbd:2,  cityBowl:3,  waterfront:4,  seaboard:7,  houtBay:22, southRail:8,  falseBay:30, innerSouth:18, northRail:22, northBurbs:28, westCoast:18, capeFlats:15, townships:27, boland:50, farOut:100},
    cityBowl:   {cbd:3,  cityBowl:2,  waterfront:5,  seaboard:6,  houtBay:20, southRail:7,  falseBay:28, innerSouth:16, northRail:24, northBurbs:30, westCoast:20, capeFlats:14, townships:25, boland:52, farOut:102},
    waterfront: {cbd:4,  cityBowl:5,  waterfront:2,  seaboard:5,  houtBay:20, southRail:10, falseBay:32, innerSouth:20, northRail:20, northBurbs:26, westCoast:14, capeFlats:18, townships:28, boland:52, farOut:100},
    seaboard:   {cbd:7,  cityBowl:6,  waterfront:5,  seaboard:3,  houtBay:15, southRail:12, falseBay:35, innerSouth:22, northRail:26, northBurbs:32, westCoast:18, capeFlats:20, townships:32, boland:56, farOut:104},
    houtBay:    {cbd:22, cityBowl:20, waterfront:20, seaboard:15, houtBay:2,  southRail:24, falseBay:45, innerSouth:30, northRail:40, northBurbs:44, westCoast:34, capeFlats:32, townships:42, boland:66, farOut:115},
    southRail:  {cbd:8,  cityBowl:7,  waterfront:10, seaboard:12, houtBay:24, southRail:4,  falseBay:18, innerSouth:10, northRail:28, northBurbs:34, westCoast:24, capeFlats:12, townships:22, boland:46, farOut:96},
    falseBay:   {cbd:30, cityBowl:28, waterfront:32, seaboard:35, houtBay:45, southRail:18, falseBay:5,  innerSouth:22, northRail:46, northBurbs:50, westCoast:42, capeFlats:28, townships:38, boland:60, farOut:110},
    innerSouth: {cbd:18, cityBowl:16, waterfront:20, seaboard:22, houtBay:30, southRail:10, falseBay:22, innerSouth:5,  northRail:36, northBurbs:40, westCoast:30, capeFlats:16, townships:28, boland:50, farOut:100},
    northRail:  {cbd:22, cityBowl:24, waterfront:20, seaboard:26, houtBay:40, southRail:28, falseBay:46, innerSouth:36, northRail:5,  northBurbs:10, westCoast:16, capeFlats:24, townships:32, boland:56, farOut:106},
    northBurbs: {cbd:28, cityBowl:30, waterfront:26, seaboard:32, houtBay:44, southRail:34, falseBay:50, innerSouth:40, northRail:10, northBurbs:6,  westCoast:18, capeFlats:28, townships:36, boland:60, farOut:108},
    westCoast:  {cbd:18, cityBowl:20, waterfront:14, seaboard:18, houtBay:34, southRail:24, falseBay:42, innerSouth:30, northRail:16, northBurbs:18, westCoast:5,  capeFlats:26, townships:34, boland:60, farOut:106},
    capeFlats:  {cbd:15, cityBowl:14, waterfront:18, seaboard:20, houtBay:32, southRail:12, falseBay:28, innerSouth:16, northRail:24, northBurbs:28, westCoast:26, capeFlats:5,  townships:12, boland:44, farOut:96},
    townships:  {cbd:27, cityBowl:25, waterfront:28, seaboard:32, houtBay:42, southRail:22, falseBay:38, innerSouth:28, northRail:32, northBurbs:36, westCoast:34, capeFlats:12, townships:8,  boland:52, farOut:100},
    boland:     {cbd:50, cityBowl:52, waterfront:52, seaboard:56, houtBay:66, southRail:46, falseBay:60, innerSouth:50, northRail:56, northBurbs:60, westCoast:60, capeFlats:44, townships:52, boland:15, farOut:80},
    farOut:     {cbd:100,cityBowl:102,waterfront:100,seaboard:104,houtBay:115,southRail:96, falseBay:110,innerSouth:100,northRail:106,northBurbs:108,westCoast:106,capeFlats:96, townships:100,boland:80, farOut:30},
  };
  return (M[zA]?.[zB]) || (M[zB]?.[zA]) || 20;
}

// MyCiTi coverage — all confirmed BRT routes as of 2025
// T01: CBD↔Table View via Woodstock, Maitland, Milnerton
// T02: CBD↔Hout Bay via Sea Point, Camps Bay
// N2 Express: CBD↔Khayelitsha/Mitchells Plain
// Airport: CBD↔Airport (not in scope)
const MYCITI_ZONES = new Set([
  // T01 corridor — CBD to West Coast
  "cbd-waterfront","cbd-westCoast","northRail-westCoast","northRail-cbd",
  "cbd-northRail","waterfront-westCoast","cityBowl-westCoast",
  // T02 corridor — CBD to Hout Bay via Seaboard
  "cbd-seaboard","cbd-houtBay","seaboard-houtBay","cityBowl-seaboard",
  "waterfront-seaboard","seaboard-cityBowl",
  // N2 Express — CBD to townships
  "cbd-townships","cbd-capeFlats","townships-capeFlats",
  // City Bowl circulars
  "cityBowl-cbd","cityBowl-waterfront",
  // Inner city connections
  "cbd-southRail", // Woodstock, Salt River on T01 route
]);
function hasMyCiti(zA,zB){
  return MYCITI_ZONES.has(`${zA}-${zB}`) || MYCITI_ZONES.has(`${zB}-${zA}`);
}

// Metrorail coverage — all 4 lines
// Southern Line: CBD → Muizenberg → Simon's Town
// Northern Line: CBD → Bellville → Kraaifontein
// Cape Flats Line: CBD → Mitchells Plain → Khayelitsha
// Strand Line: CBD → Somerset West/Strand (via Bellville)
const RAIL_ZONES = new Set([
  // Southern Line
  "cbd-southRail","cbd-falseBay","southRail-falseBay","cityBowl-southRail","cityBowl-falseBay",
  // Northern Line
  "cbd-northRail","northRail-northBurbs","cityBowl-northRail",
  // Cape Flats Line
  "cbd-capeFlats","cbd-townships","capeFlats-townships","southRail-capeFlats",
  // Strand Line (part of Northern)
  "northRail-boland","cbd-boland",
  // Cross-connections
  "southRail-northRail","southRail-townships",
]);
function hasRail(zA,zB){
  return RAIL_ZONES.has(`${zA}-${zB}`) || RAIL_ZONES.has(`${zB}-${zA}`);
}

// Taxi coverage — most zone pairs
function hasTaxi(zA,zB){
  const noTaxi = new Set(["falseBay-houtBay","seaboard-falseBay","westCoast-falseBay"]);
  return !noTaxi.has(`${zA}-${zB}`) && !noTaxi.has(`${zB}-${zA}`);
}

// Cost estimators
function uberCost(km){ return Math.round(Math.max(35, km*4.8+20)); }
function taxiCost(km){ return Math.round(Math.max(8, km*0.75+7)); }
function busCost(km){ return km<=15?14:km<=30?20:28; }
function trainCost(km){ return Math.round(Math.max(6, km*0.35+4)); }

// Time estimators (minutes)
function uberTime(km){ return Math.round(km*1.8+5); }
function taxiTime(km){ return Math.round(km*2.2+8); }
function busTime(km){ return Math.round(km*2.5+10); }
function trainTime(km){ return Math.round(km*1.5+8); }

function getRoutes(origin, dest){
  if(!origin || !dest || origin===dest) return [];

  const zA = getZone(origin);
  const zB = getZone(dest);
  const km = kmBetween(zA, zB);
  const sameZone = zA===zB;
  const isLong = km > 45;
  const isVeryShort = km <= 5;

  const routes = [];

  // ── 1. MyCiTi Bus ──────────────────────────────────────────────────────
  if(hasMyCiti(zA,zB)){
    const t=busTime(km); const c=busCost(km);
    routes.push({
      id:"bus1", name:"MyCiTi Bus",
      badge:"FASTEST",
      modes:["bus","walk"],
      time:t, timeMax:Math.round(t*1.3),
      cost:c, costMax:c+4,
      reliability:82,
      tip:`Requires a MyConnect card (R35 deposit at Pick n Pay or Shoprite). Load funds before boarding — cash not accepted. Buses run every ${km<10?"5–8":"10–15"} min during peak.`,
      deepLink:{label:"Open MyCiTi App",url:"https://www.myciti.org.za",icon:"🚌"},
    });
  }

  // ── 2. Metrorail ───────────────────────────────────────────────────────
  if(hasRail(zA,zB) && !isVeryShort){
    const t=trainTime(km); const c=trainCost(km);
    routes.push({
      id:"train1", name:"Metrorail",
      badge:"BUDGET",
      modes:["train","walk"],
      time:t, timeMax:Math.round(t*1.5),
      cost:c, costMax:c+6,
      reliability: zA==="cbd"&&zB==="falseBay" ? 62 : 55,
      tip:`${zA==="cbd"||zB==="falseBay"||zA==="falseBay"?"Southern Line (CBD→Simon's Town)":zA==="northRail"||zB==="northRail"?"Northern Line (CBD→Bellville→Kraaifontein)":zA==="boland"||zB==="boland"?"Strand Line (CBD→Bellville→Strand/Somerset West)":"Cape Flats Line"} — delays are common. Check MoveCape live alerts before you travel.`,
      deepLink:{label:"CT Trains Schedule",url:"https://cttrains.co.za",icon:"🚆"},
    });
  }

  // ── 3. Minibus Taxi ────────────────────────────────────────────────────
  if(hasTaxi(zA,zB) && !isLong){
    const t=taxiTime(km); const c=taxiCost(km);
    routes.push({
      id:"taxi1", name:"Minibus Taxi",
      badge:"LOCAL",
      modes:["minibus","walk"],
      time:t, timeMax:Math.round(t*1.4),
      cost:c, costMax:c+5,
      reliability:63,
      tip:`Cash only — have R${c} ready. ${isVeryShort?"Short local hop — taxis fill and go fast.":"Board from your nearest rank and call your destination to the driver."}`,
      deepLink:{label:"Taxi Ranks & Fares",url:"https://www.movecape.online#taxi",icon:"🚐"},
    });
  }

  // ── 4. Uber / Bolt ─────────────────────────────────────────────────────
  {
    const t=uberTime(km); const c=uberCost(km);
    routes.push({
      id:"uber1", name:"Ride-Hail",
      badge:"PREMIUM",
      modes:["uber","bolt"],
      time:t, timeMax:Math.round(t*1.3),
      cost:c, costMax:Math.round(c*1.5),
      reliability:94,
      tip:`Compare Uber and Bolt before booking — Bolt is typically 10–20% cheaper. Surge pricing likely during 7–9am and 3–6pm.`,
      deepLink:{label:"Open Uber",url:"uber://",icon:"🚗"},
      deepLink2:{label:"Open Bolt",url:"bolt://",icon:"⚡"},
    });
  }

  // ── 5. Combo (bus+train or taxi+walk) for medium distances ────────────
  if(!isVeryShort && !isLong && (hasMyCiti(zA,zB)||hasRail(zA,zB)) && hasTaxi(zA,zB)){
    const t=Math.round((busTime(km)+taxiTime(km*0.4))/1.6);
    const c=Math.round(busCost(km*0.6)+taxiCost(km*0.4));
    routes.push({
      id:"combo1", name:"Combo Route",
      badge:"SMART",
      modes:["bus","minibus","walk"],
      time:t, timeMax:Math.round(t*1.4),
      cost:c, costMax:c+8,
      reliability:70,
      tip:`Combine MyCiTi or train with a short taxi leg. Budget extra 10–15 min for the interchange wait.`,
      deepLink:{label:"Plan on Google Maps",url:`https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(dest)}&travelmode=transit`,icon:"🗺️"},
    });
  }

  // ── 6. Walking only — for very short distances ─────────────────────────
  if(isVeryShort){
    routes.push({
      id:"walk1", name:"Walk",
      badge:"FASTEST",
      modes:["walk"],
      time:Math.round(km*12), timeMax:Math.round(km*15),
      cost:0, costMax:0,
      reliability:99,
      tip:`Only ${km}km — a pleasant ${Math.round(km*12)} min walk. Use Google Maps for the best pedestrian route.`,
      deepLink:{label:"Walking Route",url:`https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(dest)}&travelmode=walking`,icon:"🚶"},
    });
  }

  // ── 7. Long distance — boland / farOut ────────────────────────────────
  if(isLong){
    routes.push({
      id:"longhaul1", name:"Long Distance Taxi",
      badge:"LOCAL",
      modes:["minibus"],
      time:taxiTime(km), timeMax:Math.round(taxiTime(km)*1.4),
      cost:taxiCost(km), costMax:taxiCost(km)+10,
      reliability:65,
      tip:`Long-distance route — taxis mainly depart in the mornings from Cape Town Civic Centre Rank. Arrive by 6:30am for best availability.`,
      deepLink:{label:"WC Transport Info",url:"https://www.westerncape.gov.za/transport",icon:"🌐"},
    });
  }

  // Sort: fastest first, then by reliability
  routes.sort((a,b)=>{
    if(a.time !== b.time) return a.time - b.time;
    return b.reliability - a.reliability;
  });

  // Cap at 4 route options
  return routes.slice(0,4);
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function GlassCard({children,style={},glow,onClick}){
  const [h,setH]=useState(false);
  return(
    <div onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{background:h?C.glassHover:C.glass,border:`1px solid ${glow?C.tealBorder:C.glassBorder}`,borderRadius:20,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",transition:"all 0.25s",boxShadow:glow?`0 0 28px ${C.tealGlow},0 8px 32px rgba(0,0,0,0.4)`:"0 4px 20px rgba(0,0,0,0.3)",cursor:onClick?"pointer":"default",...style}}>
      {children}
    </div>
  );
}
function ModeChip({mode}){
  const m=MODES[mode]||MODES.walk;
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 11px",borderRadius:99,background:m.bg,border:`1px solid ${m.color}33`,fontSize:11,color:m.color,fontWeight:700,letterSpacing:0.3}}>{m.icon} {m.label}</span>;
}
function ReliabilityBar({score}){
  const color=score>=80?C.teal:score>=60?C.gold:C.crimson;
  const label=score>=80?"Reliable":score>=60?"Variable":"Low";
  return(
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <div style={{flex:1,height:3,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden"}}>
        <div style={{width:`${score}%`,height:"100%",background:`linear-gradient(90deg,${color}88,${color})`,borderRadius:99,boxShadow:`0 0 6px ${color}66`,transition:"width 1s"}}/>
      </div>
      <span style={{fontSize:10,color,fontWeight:700,minWidth:68,textAlign:"right"}}>{label} {score}%</span>
    </div>
  );
}
function DeepBtn({link,secondary}){
  if(!link) return null;
  return(
    <a href={link.url} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:10,background:secondary?"transparent":C.tealDim,border:`1px solid ${secondary?C.border:C.tealBorder}`,color:secondary?C.muted:C.teal,fontSize:12,fontWeight:700,textDecoration:"none",letterSpacing:0.3}}>
      {link.icon} {link.label}
    </a>
  );
}
function SectionLabel({children}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
      <div style={{width:3,height:14,background:C.teal,borderRadius:99,boxShadow:`0 0 6px ${C.teal}`}}/>
      <span style={{fontSize:9,fontWeight:900,letterSpacing:2.5,color:C.muted}}>{children}</span>
    </div>
  );
}
function BHFooter(){
  return(
    <div style={{textAlign:"center",padding:"20px 0 96px"}}>
      <span style={{fontSize:11,color:C.dim,letterSpacing:0.5}}>
        Built by{" "}
        <a href="https://www.businesshustle.co.za" target="_blank" rel="noreferrer" style={{color:C.muted,textDecoration:"none",fontWeight:600}}>
          Business Hustle
        </a>
        {" "}· 🇿🇦 Cape Town
      </span>
    </div>
  );
}

// ─── TAXI TAB ─────────────────────────────────────────────────────────────────
function TaxiTab(){
  const [view,setView]=useState("routes"); // routes | ranks
  const [from,setFrom]=useState("");
  const [to,setTo]=useState("");
  const [fromSugs,setFromSugs]=useState([]);
  const [toSugs,setToSugs]=useState([]);
  const [selectedRank,setSelectedRank]=useState(null);
  const filterSugs=v=>CT_LOCATIONS.filter(l=>l.toLowerCase().includes(v.toLowerCase())).slice(0,5);

  const matchedRoutes = TAXI_ROUTES.filter(r=>{
    const fMatch = !from || r.from.toLowerCase().includes(from.toLowerCase()) || r.to.toLowerCase().includes(from.toLowerCase());
    const tMatch = !to   || r.to.toLowerCase().includes(to.toLowerCase())   || r.from.toLowerCase().includes(to.toLowerCase());
    return fMatch && tMatch;
  }).slice(0,12);

  return(
    <div style={{padding:16,position:"relative",zIndex:1,animation:"fadeIn 0.3s ease"}}>
      {/* Header */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:22,fontWeight:900,fontFamily:"'Syne',sans-serif"}}>Minibus Taxis</div>
        <div style={{fontSize:11,color:C.muted,marginTop:2}}>Fares · ranks · routes across Cape Town</div>
      </div>

      {/* Sub-tabs */}
      <div style={{display:"flex",gap:6,marginBottom:16,background:"rgba(0,0,0,0.25)",borderRadius:12,padding:4}}>
        {[{id:"routes",label:"🗺️ Routes & Fares"},{id:"ranks",label:"📍 Taxi Ranks"}].map(t=>(
          <button key={t.id} onClick={()=>setView(t.id)} style={{flex:1,padding:"9px 12px",borderRadius:9,background:view===t.id?"rgba(255,59,92,0.15)":"transparent",border:`1px solid ${view===t.id?C.crimson+"44":"transparent"}`,color:view===t.id?C.crimson:C.muted,fontSize:12,fontWeight:800,cursor:"pointer",transition:"all 0.2s",letterSpacing:0.3}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ROUTES & FARES view ── */}
      {view==="routes"&&(
        <>
          {/* Filter inputs */}
          <GlassCard style={{padding:16,marginBottom:16}}>
            <SectionLabel>SEARCH TAXI ROUTES</SectionLabel>
            <div style={{position:"relative",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:10,background:"rgba(0,0,0,0.3)",borderRadius:12,padding:"11px 14px",border:`1px solid ${from?C.crimson+"55":C.glassBorder}`,transition:"border 0.2s"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:C.crimson,flexShrink:0}}/>
                <input value={from} onChange={e=>{setFrom(e.target.value);setFromSugs(filterSugs(e.target.value));}} onFocus={()=>setFromSugs(filterSugs(from))} onBlur={()=>setTimeout(()=>setFromSugs([]),200)} placeholder="From (optional)" style={{flex:1,fontSize:13,fontWeight:500,color:C.text}}/>
                {from&&<button onClick={()=>setFrom("")} style={{background:"none",border:"none",color:C.dim,cursor:"pointer",fontSize:16}}>×</button>}
              </div>
              {fromSugs.length>0&&(
                <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:200,background:"rgba(8,13,26,0.98)",border:`1px solid ${C.crimson}44`,borderRadius:12,overflow:"hidden",backdropFilter:"blur(20px)",boxShadow:"0 12px 32px rgba(0,0,0,0.6)"}}>
                  {fromSugs.map(s=><div key={s} onClick={()=>{setFrom(s);setFromSugs([]);}} style={{padding:"10px 14px",fontSize:13,cursor:"pointer",color:C.text,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}><span style={{color:C.crimson,fontSize:9}}>●</span>{s}</div>)}
                </div>
              )}
            </div>
            <div style={{position:"relative"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,background:"rgba(0,0,0,0.3)",borderRadius:12,padding:"11px 14px",border:`1px solid ${to?C.tealBorder:C.glassBorder}`,transition:"border 0.2s"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:C.teal,flexShrink:0}}/>
                <input value={to} onChange={e=>{setTo(e.target.value);setToSugs(filterSugs(e.target.value));}} onFocus={()=>setToSugs(filterSugs(to))} onBlur={()=>setTimeout(()=>setToSugs([]),200)} placeholder="To (optional)" style={{flex:1,fontSize:13,fontWeight:500,color:C.text}}/>
                {to&&<button onClick={()=>setTo("")} style={{background:"none",border:"none",color:C.dim,cursor:"pointer",fontSize:16}}>×</button>}
              </div>
              {toSugs.length>0&&(
                <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:200,background:"rgba(8,13,26,0.98)",border:`1px solid ${C.tealBorder}`,borderRadius:12,overflow:"hidden",backdropFilter:"blur(20px)",boxShadow:"0 12px 32px rgba(0,0,0,0.6)"}}>
                  {toSugs.map(s=><div key={s} onClick={()=>{setTo(s);setToSugs([]);}} style={{padding:"10px 14px",fontSize:13,cursor:"pointer",color:C.text,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}><span style={{color:C.teal,fontSize:9}}>●</span>{s}</div>)}
                </div>
              )}
            </div>
          </GlassCard>

          {/* Fare notice */}
          <div style={{background:C.goldDim,border:"1px solid rgba(251,191,36,0.2)",borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.gold,lineHeight:1.6}}>
            💡 Fares verified against CODETA/SANTACO 2025 rates. Actual fare may vary R1–2 by operator. Always carry cash — exact change preferred.
          </div>

          {/* Route cards */}
          <SectionLabel>{matchedRoutes.length} ROUTES FOUND</SectionLabel>
          {matchedRoutes.length===0&&(
            <div style={{textAlign:"center",padding:"32px 20px",color:C.muted,fontSize:13}}>No routes match — try clearing your filters</div>
          )}
          {matchedRoutes.map((r,i)=>(
            <div key={r.id} className="rc" style={{animation:`fadeUp 0.35s ease ${i*0.06}s both`}}>
              <GlassCard style={{padding:16,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                      {r.popular&&<span style={{fontSize:9,padding:"2px 8px",borderRadius:99,background:C.crimsonDim,border:`1px solid ${C.crimson}44`,color:C.crimson,fontWeight:900,letterSpacing:1}}>🔥 POPULAR</span>}
                      {r.km&&<span style={{fontSize:9,padding:"2px 8px",borderRadius:99,background:C.glass,border:`1px solid ${C.border}`,color:C.dim,fontWeight:700}}>{r.km}km</span>}
                    </div>
                    <div style={{fontSize:15,fontWeight:800,fontFamily:"'Syne',sans-serif",marginBottom:2}}>{r.from}</div>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                      <div style={{width:20,height:1,background:C.crimson+"66"}}/>
                      <span style={{fontSize:11,color:C.muted,fontWeight:600}}>→</span>
                      <div style={{width:20,height:1,background:C.crimson+"66"}}/>
                    </div>
                    <div style={{fontSize:15,fontWeight:800,fontFamily:"'Syne',sans-serif",color:C.teal}}>{r.to}</div>
                    <div style={{fontSize:11,color:C.dim,marginTop:4}}>via {r.via}</div>
                    {r.note&&<div style={{fontSize:10,color:C.muted,marginTop:4,fontStyle:"italic"}}>{r.note}</div>}
                  </div>
                  <div style={{textAlign:"right",flexShrink:0,paddingLeft:12}}>
                    <div style={{fontSize:22,fontWeight:900,fontFamily:"'Syne',sans-serif",color:C.white,lineHeight:1}}>
                      R{r.fare.min}–{r.fare.max}
                    </div>
                    <div style={{fontSize:11,color:C.muted,marginTop:4,fontWeight:600}}>{r.time.min}–{r.time.max} min</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:10,borderTop:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:14}}>🚐</span>
                    <span style={{fontSize:11,color:C.muted,fontWeight:600}}>{r.rank}</span>
                  </div>
                  <a href={`https://maps.google.com?q=${encodeURIComponent(r.rank+", Cape Town")}`} target="_blank" rel="noreferrer" style={{fontSize:11,color:C.teal,fontWeight:700,textDecoration:"none",padding:"5px 10px",borderRadius:8,background:C.tealDim,border:`1px solid ${C.tealBorder}`}}>
                    📍 View Rank
                  </a>
                </div>
              </GlassCard>
            </div>
          ))}

          {/* Tip */}
          <GlassCard style={{padding:16,marginTop:4}}>
            <div style={{fontSize:13,fontWeight:800,fontFamily:"'Syne',sans-serif",marginBottom:8}}>🚐 Hailing a Taxi</div>
            {[
              {tip:"Stand at the roadside and signal — drivers slow down for passengers"},
              {tip:"Shout your destination when the taxi stops or knock on the window"},
              {tip:"Pay the fare directly to the driver or 'gaaitjie' (conductor)"},
              {tip:"Keep small change — exact or near-exact fare preferred"},
              {tip:"Peak hours: 6–8am and 3–6pm are busiest. Expect fuller taxis"},
            ].map((t,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}>
                <span style={{color:C.crimson,fontWeight:900,fontSize:14,flexShrink:0}}>›</span>
                <span style={{fontSize:12,color:C.muted,lineHeight:1.5}}>{t.tip}</span>
              </div>
            ))}
          </GlassCard>
        </>
      )}

      {/* ── RANKS view ── */}
      {view==="ranks"&&(
        <>
          <SectionLabel>CAPE TOWN TAXI RANKS</SectionLabel>
          <div style={{background:C.tealDim,border:`1px solid ${C.tealBorder}`,borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.teal,lineHeight:1.6}}>
            📍 Tap a rank to see which routes depart from there
          </div>

          {TAXI_RANKS.map((rank,i)=>{
            const open=selectedRank===rank.id;
            return(
              <div key={rank.id} style={{animation:`fadeUp 0.35s ease ${i*0.07}s both`}}>
                <GlassCard glow={open} style={{padding:16,marginBottom:10}} onClick={()=>setSelectedRank(open?null:rank.id)}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:rank.active?C.teal:C.dim,boxShadow:rank.active?`0 0 6px ${C.teal}`:"none"}}/>
                        <span style={{fontSize:9,color:rank.active?C.teal:C.dim,fontWeight:800,letterSpacing:1}}>{rank.active?"ACTIVE":"INACTIVE"}</span>
                        <span style={{fontSize:9,color:C.dim,padding:"2px 7px",borderRadius:99,background:C.glass,border:`1px solid ${C.border}`}}>{rank.area}</span>
                      </div>
                      <div style={{fontSize:15,fontWeight:800,fontFamily:"'Syne',sans-serif",marginBottom:3}}>{rank.name}</div>
                      <div style={{fontSize:11,color:C.muted}}>{rank.address}</div>
                    </div>
                    <div style={{fontSize:20,transition:"transform 0.2s",transform:open?"rotate(90deg)":"rotate(0deg)",color:C.muted,flexShrink:0,paddingLeft:10}}>›</div>
                  </div>

                  <div style={{fontSize:11,color:C.dim,fontStyle:"italic",marginBottom:open?12:0}}>{rank.note}</div>

                  {open&&(
                    <div style={{paddingTop:12,borderTop:`1px solid ${C.border}`,animation:"fadeIn 0.25s ease"}}>
                      <div style={{fontSize:10,color:C.muted,fontWeight:900,letterSpacing:2,marginBottom:10}}>DEPARTING ROUTES</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
                        {rank.routes.map(dest=>(
                          <span key={dest} style={{padding:"5px 11px",borderRadius:99,background:C.crimsonDim,border:`1px solid ${C.crimson}33`,fontSize:11,color:C.crimson,fontWeight:700}}>
                            🚐 {dest}
                          </span>
                        ))}
                      </div>
                      <a href={`https://maps.google.com?q=${encodeURIComponent(rank.name+", "+rank.area+", Cape Town")}`} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:10,background:C.tealDim,border:`1px solid ${C.tealBorder}`,color:C.teal,fontSize:12,fontWeight:700,textDecoration:"none"}}>
                        📍 Open in Google Maps
                      </a>
                    </div>
                  )}
                </GlassCard>
              </div>
            );
          })}

          {/* SANTACO link */}
          <div style={{background:C.glass,border:`1px solid ${C.glassBorder}`,borderRadius:14,padding:16,marginTop:4}}>
            <div style={{fontSize:13,fontWeight:800,fontFamily:"'Syne',sans-serif",marginBottom:4}}>🏢 Official Taxi Bodies</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:12,lineHeight:1.6}}>For formal complaints, route applications or official info contact the taxi associations that operate in your area.</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {[
                {label:"SANTACO Western Cape",url:"https://www.santaco.co.za",icon:"🏛️"},
                {label:"WC Government Transport",url:"https://www.westerncape.gov.za/transport",icon:"🌐"},
              ].map(l=>(
                <a key={l.label} href={l.url} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 12px",borderRadius:10,background:C.crimsonDim,border:`1px solid ${C.crimson}33`,color:C.crimson,fontSize:11,fontWeight:700,textDecoration:"none"}}>
                  {l.icon} {l.label}
                </a>
              ))}
            </div>
          </div>
        </>
      )}

      <BHFooter/>
    </div>
  );
}


// ─── FLIGHTS TAB ──────────────────────────────────────────────────────────────
// Live CPT flight data via AviationStack API (500 free req/month)
// Falls back to realistic demo data if no API key is configured.
// Get your free key at: https://aviationstack.com/signup/free
//
// !! IMPORTANT: AviationStack free tier only supports HTTP (not HTTPS).
// To use in production you need:
//   Option A: $49.99/mo paid plan (HTTPS support)
//   Option B: A Vercel Edge Function as a proxy (free — see docs below)
//   Option C: Demo mode (default — realistic mock data, no API needed)
//
// To enable live data, set your key below:
// ── Flight API config ──────────────────────────────────────────────────────
// Calls our own Vercel serverless function (api/flights.js) which proxies
// AviationStack server-side — no HTTPS restriction, no CORS issues, free.
// The raw API key never touches the browser.
const FLIGHTS_API = "/api/flights"; // Vercel function endpoint
const CPT_IATA    = "CPT";

// ── Status config ─────────────────────────────────────────────────────────────
const FLIGHT_STATUS = {
  scheduled:  { label:"Scheduled",  color:"#6b7fa3",  bg:"rgba(107,127,163,0.12)", icon:"🕐" },
  active:     { label:"En Route",   color:"#00ffcc",  bg:"rgba(0,255,204,0.12)",   icon:"✈️" },
  landed:     { label:"Landed",     color:"#4f8eff",  bg:"rgba(79,142,255,0.12)",  icon:"🛬" },
  cancelled:  { label:"Cancelled",  color:"#ff3b5c",  bg:"rgba(255,59,92,0.12)",   icon:"❌" },
  diverted:   { label:"Diverted",   color:"#fbbf24",  bg:"rgba(251,191,36,0.12)",  icon:"⚠️" },
  delayed:    { label:"Delayed",    color:"#fbbf24",  bg:"rgba(251,191,36,0.12)",  icon:"⏰" },
};

// ── Airlines serving CPT ──────────────────────────────────────────────────────
const AIRLINE_FLAGS = {
  "FlySafair":"🇿🇦","Airlink":"🇿🇦","South African Airways":"🇿🇦","Cemair":"🇿🇦","Lift Airline":"🇿🇦",
  "British Airways":"🇬🇧","Virgin Atlantic":"🇬🇧",
  "Emirates":"🇦🇪","Qatar Airways":"🇶🇦","Ethiopian Airlines":"🇪🇹",
  "KLM":"🇳🇱","Lufthansa":"🇩🇪","Swiss":"🇨🇭","Turkish Airlines":"🇹🇷",
  "Air France":"🇫🇷","Brussels Airlines":"🇧🇪",
  "Kenya Airways":"🇰🇪","RwandAir":"🇷🇼","Fastjet":"🇿🇦",
};

// ── Mock data — realistic CPT schedule ───────────────────────────────────────
function getMockFlights(type) {
  const now = new Date();
  const fmt = (d) => d.toTimeString().slice(0,5);
  const add = (min) => { const d=new Date(now); d.setMinutes(d.getMinutes()+min); return fmt(d); };
  const sub = (min) => { const d=new Date(now); d.setMinutes(d.getMinutes()-min); return fmt(d); };

  const departures = [
    { flight:"FA401",  airline:"FlySafair",          dest:"OR Tambo (JNB)",        sched:add(25),  actual:add(25),  status:"scheduled", terminal:"Domestic",   gate:"A04" },
    { flight:"FA171",  airline:"FlySafair",          dest:"King Shaka (DUR)",      sched:add(55),  actual:add(55),  status:"scheduled", terminal:"Domestic",   gate:"A06" },
    { flight:"BA6271", airline:"British Airways",     dest:"Heathrow (LHR)",        sched:add(90),  actual:add(105), status:"delayed",   terminal:"International",gate:"B12",delay:15 },
    { flight:"EK771",  airline:"Emirates",            dest:"Dubai (DXB)",           sched:add(140), actual:add(140), status:"scheduled", terminal:"International",gate:"B08" },
    { flight:"MN701",  airline:"Airlink",             dest:"George (GRJ)",          sched:sub(5),   actual:sub(5),   status:"active",   terminal:"Domestic",   gate:"A02" },
    { flight:"SA324",  airline:"South African Airways",dest:"OR Tambo (JNB)",       sched:add(180), actual:add(180), status:"scheduled", terminal:"Domestic",   gate:"A09" },
    { flight:"QR1369", airline:"Qatar Airways",       dest:"Doha (DOH)",            sched:add(220), actual:add(220), status:"scheduled", terminal:"International",gate:"B03" },
    { flight:"4Z491",  airline:"Airlink",             dest:"Windhoek (WDH)",        sched:sub(30),  actual:sub(30),  status:"active",   terminal:"International",gate:"B07" },
    { flight:"LX572",  airline:"Swiss",               dest:"Zürich (ZRH)",          sched:add(300), actual:add(300), status:"scheduled", terminal:"International",gate:"B01" },
    { flight:"KL594",  airline:"KLM",                 dest:"Amsterdam (AMS)",       sched:add(360), actual:add(360), status:"scheduled", terminal:"International",gate:"B05" },
  ];

  const arrivals = [
    { flight:"FA402",  airline:"FlySafair",           from:"OR Tambo (JNB)",        sched:sub(10),  actual:sub(3),   status:"landed",   terminal:"Domestic",   belt:"3" },
    { flight:"EK772",  airline:"Emirates",            from:"Dubai (DXB)",           sched:add(20),  actual:add(20),  status:"active",   terminal:"International",belt:"-" },
    { flight:"BA6272", airline:"British Airways",     from:"Heathrow (LHR)",        sched:add(35),  actual:add(50),  status:"delayed",   terminal:"International",belt:"-",delay:15 },
    { flight:"FA172",  airline:"FlySafair",           from:"King Shaka (DUR)",      sched:sub(40),  actual:sub(38),  status:"landed",   terminal:"Domestic",   belt:"2" },
    { flight:"MN400",  airline:"Airlink",             from:"Johannesburg (JNB)",    sched:add(70),  actual:add(70),  status:"scheduled", terminal:"Domestic",   belt:"-" },
    { flight:"QR1370", airline:"Qatar Airways",       from:"Doha (DOH)",            sched:add(110), actual:add(110), status:"active",   terminal:"International",belt:"-" },
    { flight:"ET512",  airline:"Ethiopian Airlines",  from:"Addis Ababa (ADD)",     sched:add(150), actual:add(150), status:"scheduled", terminal:"International",belt:"-" },
    { flight:"LX571",  airline:"Swiss",               from:"Zürich (ZRH)",          sched:sub(60),  actual:sub(57),  status:"landed",   terminal:"International",belt:"6" },
    { flight:"KL593",  airline:"KLM",                 from:"Amsterdam (AMS)",       sched:add(200), actual:add(200), status:"scheduled", terminal:"International",belt:"-" },
    { flight:"4Z492",  airline:"Airlink",             from:"Windhoek (WDH)",        sched:add(90),  actual:add(90),  status:"scheduled", terminal:"International",belt:"-" },
  ];

  return type === "departures" ? departures : arrivals;
}

// ── FlightCard component ──────────────────────────────────────────────────────
function FlightCard({ flight, type }) {
  const s = FLIGHT_STATUS[flight.status] || FLIGHT_STATUS.scheduled;
  const flag = AIRLINE_FLAGS[flight.airline] || "✈️";
  const isDep = type === "departures";

  return (
    <div style={{
      background: C.glass, border: `1px solid ${flight.status==="delayed"||flight.status==="cancelled" ? s.color+"44" : C.glassBorder}`,
      borderRadius: 14, padding: "14px 16px", marginBottom: 10,
      backdropFilter: "blur(20px)",
    }}>
      {/* Top row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: 10 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
            <span style={{ fontSize:12, fontWeight:900, color:C.teal, fontFamily:"'Syne',sans-serif", letterSpacing:0.5 }}>{flight.flight}</span>
            <span style={{ fontSize:9, padding:"2px 8px", borderRadius:99, background:s.bg, border:`1px solid ${s.color}44`, color:s.color, fontWeight:800, letterSpacing:0.5 }}>
              {s.icon} {s.label}{flight.delay ? ` +${flight.delay}m` : ""}
            </span>
          </div>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>{flag} {flight.airline}</div>
          <div style={{ fontSize:12, color:C.muted }}>
            {isDep ? `✈️ To: ${flight.dest}` : `🛬 From: ${flight.from}`}
          </div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0, paddingLeft:12 }}>
          <div style={{ fontSize:22, fontWeight:900, fontFamily:"'Syne',sans-serif", color: flight.delay ? C.gold : C.white, lineHeight:1 }}>
            {flight.actual}
          </div>
          {flight.delay && (
            <div style={{ fontSize:10, color:C.muted, textDecoration:"line-through", marginTop:1 }}>{flight.sched}</div>
          )}
          <div style={{ fontSize:10, color:C.dim, marginTop:2 }}>
            {isDep ? `Gate: ${flight.gate||"TBC"}` : `Belt: ${flight.belt||"-"}`}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:10, borderTop:`1px solid ${C.border}` }}>
        <span style={{ fontSize:10, color:C.dim, background:C.glass, border:`1px solid ${C.border}`, borderRadius:6, padding:"3px 8px", fontWeight:600 }}>
          🏢 {flight.terminal}
        </span>
        <a
          href={`https://www.flightradar24.com/${flight.flight}`}
          target="_blank" rel="noreferrer"
          style={{ fontSize:10, color:C.teal, fontWeight:700, textDecoration:"none", padding:"4px 10px", borderRadius:8, background:C.tealDim, border:`1px solid ${C.tealBorder}` }}
        >
          Track →
        </a>
      </div>
    </div>
  );
}

// ── FlightsTab ────────────────────────────────────────────────────────────────
function FlightsTab() {
  const [view, setView] = useState("departures");
  const [flights, setFlights] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | live | demo | error
  const [lastFetched, setLastFetched] = useState(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef(null);

  const loadFlights = useCallback(async (type, silent=false) => {
    if (!silent) setStatus("loading");
    if (silent) setRefreshing(true);

    try {
      // Call our Vercel serverless proxy — handles AviationStack server-side
      const res = await fetch(`${FLIGHTS_API}?type=${type}`, { cache: "no-store" });

      if (!res.ok) {
        // If /api/flights doesn't exist yet (local dev), fall back to demo
        if (res.status === 404) throw new Error("API route not deployed yet");
        throw new Error(`API ${res.status}`);
      }

      let data;
      try { data = await res.json(); }
      catch(e) { throw new Error("Invalid JSON from API"); }

      if (data.error) throw new Error(data.error);
      if (!data.data || !Array.isArray(data.data)) throw new Error("No flight data");

      // Normalise AviationStack → MoveCape flight shape
      const toSAST = (iso) => {
        if (!iso) return "–";
        try {
          // AviationStack returns UTC; SAST = UTC+2
          const d = new Date(iso);
          d.setHours(d.getHours() + 2);
          return d.toTimeString().slice(0, 5);
        } catch { return iso.slice(11, 16) || "–"; }
      };
      const normalised = data.data
        .filter(f => f.flight?.iata) // skip malformed entries
        .map(f => {
          const depSched  = f.departure?.scheduled;
          const depEst    = f.departure?.estimated || f.departure?.actual || depSched;
          const arrSched  = f.arrival?.scheduled;
          const arrEst    = f.arrival?.estimated  || f.arrival?.actual   || arrSched;
          const rawDelay  = type === "departures" ? f.departure?.delay : f.arrival?.delay;
          const delayMins = rawDelay && rawDelay > 0 ? rawDelay : null;
          let status = f.flight_status || "scheduled";
          if (delayMins && status === "scheduled") status = "delayed";
          return {
            flight:   f.flight?.iata || "–",
            airline:  f.airline?.name || "Unknown",
            dest:     f.arrival?.airport  ? `${f.arrival.airport} (${f.arrival.iata||""})` : "–",
            from:     f.departure?.airport? `${f.departure.airport} (${f.departure.iata||""})` : "–",
            sched:    type === "departures" ? toSAST(depSched) : toSAST(arrSched),
            actual:   type === "departures" ? toSAST(depEst)   : toSAST(arrEst),
            status,
            terminal: type === "departures" ? (f.departure?.terminal||"TBC") : (f.arrival?.terminal||"TBC"),
            gate:     f.departure?.gate    || "–",
            belt:     f.arrival?.baggage   || "–",
            delay:    delayMins,
          };
        });

      setFlights(normalised);
      setStatus("live");
      setLastFetched(new Date());
    } catch (err) {
      console.warn("MoveCape flights:", err.message);
      // Graceful fallback — realistic demo data while API is being set up
      setFlights(getMockFlights(type));
      setStatus(err.message.includes("not deployed") ? "demo" : "error");
    }
    setRefreshing(false);
  }, []);

  // Load on mount + when view changes
  useEffect(() => {
    loadFlights(view);
    timerRef.current = setInterval(() => loadFlights(view, true), 90_000); // refresh every 90s
    return () => clearInterval(timerRef.current);
  }, [view, loadFlights]);

  const filtered = flights.filter(f =>
    !search ||
    f.flight.toLowerCase().includes(search.toLowerCase()) ||
    f.airline.toLowerCase().includes(search.toLowerCase()) ||
    (f.dest||"").toLowerCase().includes(search.toLowerCase()) ||
    (f.from||"").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding:16, position:"relative", zIndex:1, animation:"fadeIn 0.3s ease" }}>

      {/* Header */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:22, fontWeight:900, fontFamily:"'Syne',sans-serif" }}>✈️ CPT Flights</div>
            <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>Cape Town International Airport</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
            {status==="live" && (
              <span style={{ fontSize:9, color:C.teal, fontWeight:800, letterSpacing:1, padding:"3px 8px", borderRadius:99, background:C.tealDim, border:`1px solid ${C.tealBorder}` }}>● LIVE</span>
            )}
            {status==="demo" && (
              <span style={{ fontSize:9, color:C.gold, fontWeight:800, letterSpacing:1, padding:"3px 8px", borderRadius:99, background:C.goldDim, border:"1px solid rgba(251,191,36,0.3)" }}>◎ DEMO</span>
            )}
            {status==="error" && (
              <span style={{ fontSize:9, color:C.crimson, fontWeight:800, letterSpacing:1, padding:"3px 8px", borderRadius:99, background:C.crimsonDim, border:`1px solid ${C.crimson}44` }}>⚠️ OFFLINE</span>
            )}
            {lastFetched && (
              <span style={{ fontSize:9, color:C.dim }}>{refreshing ? "Refreshing…" : `Updated ${lastFetched.toLocaleTimeString("en-ZA",{hour:"2-digit",minute:"2-digit"})}`}</span>
            )}
          </div>
        </div>
      </div>

      {/* Demo / API key callout */}
      {status==="demo" && (
        <div style={{ background:C.goldDim, border:"1px solid rgba(251,191,36,0.25)", borderRadius:12, padding:"10px 14px", marginBottom:14, fontSize:12, color:C.gold, lineHeight:1.6 }}>
          <span style={{ fontWeight:800 }}>Connecting to AviationStack…</span> — if live data doesn't load within a few seconds, the proxy may be rate-limited. Showing realistic sample data in the meantime.
        </div>
      )}
      {status==="error" && (
        <div style={{ background:C.crimsonDim, border:`1px solid ${C.crimson}33`, borderRadius:12, padding:"10px 14px", marginBottom:14, fontSize:12, color:C.crimson, lineHeight:1.6 }}>
          ⚠️ Live data temporarily unavailable — showing sample schedule. Make sure <code style={{background:"rgba(0,0,0,0.3)",padding:"1px 5px",borderRadius:4}}>api/flights.js</code> is deployed on Vercel and <code style={{background:"rgba(0,0,0,0.3)",padding:"1px 5px",borderRadius:4}}>AVIATIONSTACK_KEY</code> is set in your environment variables.
        </div>
      )}

      {/* Sub-tabs: Departures / Arrivals */}
      <div style={{ display:"flex", gap:6, marginBottom:14, background:"rgba(0,0,0,0.25)", borderRadius:12, padding:4 }}>
        {[{id:"departures",icon:"🛫",label:"Departures"},{id:"arrivals",icon:"🛬",label:"Arrivals"}].map(t=>(
          <button key={t.id} onClick={()=>{ setView(t.id); setSearch(""); }} style={{
            flex:1, padding:"9px 10px", borderRadius:9,
            background: view===t.id ? "rgba(0,255,204,0.12)" : "transparent",
            border: `1px solid ${view===t.id ? C.tealBorder : "transparent"}`,
            color: view===t.id ? C.teal : C.muted,
            fontSize:12, fontWeight:800, cursor:"pointer", transition:"all 0.2s",
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(0,0,0,0.3)", borderRadius:12, padding:"10px 14px", border:`1px solid ${C.glassBorder}`, marginBottom:14 }}>
        <span style={{ fontSize:14 }}>🔍</span>
        <input
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder="Search flight, airline or city…"
          style={{ flex:1, fontSize:13, fontWeight:500, color:C.text }}
        />
        {search && <button onClick={()=>setSearch("")} style={{ background:"none",border:"none",color:C.dim,cursor:"pointer",fontSize:18,lineHeight:1 }}>×</button>}
      </div>

      {/* Loading */}
      {status==="loading" && (
        <div style={{ textAlign:"center", padding:"40px 20px" }}>
          <div style={{ fontSize:40, marginBottom:10, animation:"scanPulse 0.8s infinite" }}>✈️</div>
          <div style={{ fontSize:13, color:C.muted }}>Loading CPT flight board…</div>
        </div>
      )}

      {/* Flight list */}
      {status!=="loading" && (
        <>
          {filtered.length===0 ? (
            <div style={{ textAlign:"center", padding:"32px 20px", color:C.muted, fontSize:13 }}>
              No flights match "{search}"
            </div>
          ) : (
            filtered.map((f,i)=>(
              <div key={f.flight+i} style={{ animation:`fadeUp 0.35s ease ${i*0.05}s both` }}>
                <FlightCard flight={f} type={view} />
              </div>
            ))
          )}

          {/* External links */}
          <div style={{ marginTop:8 }}>
            <div style={{ fontSize:9, color:C.muted, fontWeight:900, letterSpacing:2, marginBottom:10 }}>OFFICIAL SOURCES</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[
                { icon:"🏢", label:"CPT Official Board",    sub:"Live arrivals & departures", url:"https://capetown-internationalairport.co.za/flights/flight-departures.html", color:C.teal },
                { icon:"🛫", label:"FlightRadar24",         sub:"Live radar & tracking",      url:"https://www.flightradar24.com/data/airports/cpt", color:C.blue },
                { icon:"📋", label:"FlightAware CPT",       sub:"Status & history",           url:"https://www.flightaware.com/live/airport/FACT", color:C.gold },
                { icon:"🚗", label:"Airport Transfers",     sub:"Uber, Bolt & taxis to CBD",  url:"https://www.movecape.online#plan", color:C.purple },
              ].map(l=>(
                <a key={l.label} href={l.url} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 12px", borderRadius:12, background:C.glass, border:`1px solid ${C.glassBorder}`, textDecoration:"none", transition:"all 0.2s" }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:`${l.color}14`, border:`1px solid ${l.color}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{l.icon}</div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:l.color }}>{l.label}</div>
                    <div style={{ fontSize:10, color:C.dim }}>{l.sub}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Transport to/from airport CTA */}
          <div style={{ marginTop:14, background:`linear-gradient(135deg,rgba(0,255,204,0.08),rgba(79,142,255,0.06))`, border:`1px solid ${C.tealBorder}`, borderRadius:16, padding:16 }}>
            <div style={{ fontSize:13, fontWeight:800, fontFamily:"'Syne',sans-serif", marginBottom:4 }}>🚗 Getting to/from CPT Airport?</div>
            <div style={{ fontSize:12, color:C.muted, lineHeight:1.6, marginBottom:12 }}>
              Cape Town International is ~20km from the CBD. Options: Uber/Bolt (~R180–250), MyCiTi bus (check routes), or metered taxi (~R300). No Metrorail/CT Trains service to the airport.
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <a href="uber://" target="_blank" rel="noreferrer" style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:10,background:C.goldDim,border:"1px solid rgba(251,191,36,0.3)",color:C.gold,fontSize:12,fontWeight:700,textDecoration:"none" }}>🚗 Uber</a>
              <a href="bolt://" target="_blank" rel="noreferrer" style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:10,background:C.purpleDim,border:"1px solid rgba(167,139,250,0.3)",color:C.purple,fontSize:12,fontWeight:700,textDecoration:"none" }}>⚡ Bolt</a>
              <a href="https://www.myciti.org.za" target="_blank" rel="noreferrer" style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:10,background:C.tealDim,border:`1px solid ${C.tealBorder}`,color:C.teal,fontSize:12,fontWeight:700,textDecoration:"none" }}>🚌 MyCiTi</a>
            </div>
          </div>
        </>
      )}

      <BHFooter/>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function MoveCape(){
  const [tab,setTab]=useState("plan");
  const [origin,setOrigin]=useState("");
  const [dest,setDest]=useState("");
  const [originSugs,setOriginSugs]=useState([]);
  const [destSugs,setDestSugs]=useState([]);
  const [routes,setRoutes]=useState([]);
  const [searching,setSearching]=useState(false);
  const [selectedRoute,setSelectedRoute]=useState(null);
  const [premium,setPremium]=useState(false);

  const filterSugs=v=>CT_LOCATIONS.filter(l=>l.toLowerCase().includes(v.toLowerCase())).slice(0,5);
  const handleSearch=()=>{
    if(!origin||!dest) return;
    setSearching(true); setSelectedRoute(null);
    setTimeout(()=>{setRoutes(getRoutes(origin,dest));setSearching(false);},1500);
  };
  const swap=()=>{const t=origin;setOrigin(dest);setDest(t);setRoutes([]);};

  const { alerts:ALERTS, status:alertStatus, lastFetched, countdown, refetch } = useLiveAlerts();

  const TABS=[
    {id:"plan",    sym:"◎", label:"Plan"},
    {id:"taxi",    sym:"🚐",label:"Taxis"},
    {id:"flights", sym:"✈️", label:"Flights"},
    {id:"alerts",  sym:"◈", label:"Alerts"},
    {id:"explore", sym:"◉", label:"Explore"},
  ];

  return(
    <div style={{fontFamily:"'DM Sans','Outfit',system-ui,sans-serif",background:C.void,color:C.text,minHeight:"100vh",maxWidth:430,margin:"0 auto",position:"relative",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:0}
        input{outline:none;background:transparent;border:none;color:#e8f0ff;font-family:inherit;}
        input::placeholder{color:#374060;}
        a{transition:opacity 0.2s;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes dotPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.3;transform:scale(0.7)}}
        @keyframes glowPulse{0%,100%{box-shadow:0 0 20px rgba(0,255,204,0.2),0 4px 16px rgba(0,0,0,0.4)}50%{box-shadow:0 0 40px rgba(0,255,204,0.5),0 4px 20px rgba(0,0,0,0.5)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes scanPulse{0%,100%{opacity:0.6}50%{opacity:1}}
        .rc{animation:fadeUp 0.4s cubic-bezier(.4,0,.2,1) both;}
        .rc:nth-child(1){animation-delay:0.05s}.rc:nth-child(2){animation-delay:0.12s}.rc:nth-child(3){animation-delay:0.19s}
        .sug:hover{background:rgba(0,255,204,0.06)!important;}
        .navbtn:hover{color:#00ffcc!important;}
        .qp:hover{background:rgba(0,255,204,0.06)!important;border-color:rgba(0,255,204,0.2)!important;}
        .ql:hover{color:#00ffcc!important;border-color:rgba(0,255,204,0.3)!important;}
      `}</style>

      <MoveCapeHelmet/>

      {/* BG mesh */}
      <div style={{position:"fixed",inset:0,maxWidth:430,margin:"0 auto",background:"radial-gradient(ellipse 60% 40% at 80% 10%,rgba(0,255,204,0.07) 0%,transparent 60%),radial-gradient(ellipse 50% 30% at 20% 80%,rgba(79,142,255,0.06) 0%,transparent 60%),radial-gradient(ellipse 40% 40% at 60% 50%,rgba(255,59,92,0.04) 0%,transparent 60%)",pointerEvents:"none",zIndex:0}}/>

      {/* ── HEADER ── */}
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(5,8,16,0.88)",backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",borderBottom:`1px solid ${C.glassBorder}`,padding:"0 20px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 0 10px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:13,background:`linear-gradient(135deg,${C.teal},#00a87e)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:900,color:C.void,fontFamily:"'Syne',sans-serif",animation:"glowPulse 3s ease-in-out infinite"}}>M</div>
            <div>
              <div style={{fontSize:23,fontWeight:900,letterSpacing:-1,fontFamily:"'Syne',sans-serif",lineHeight:1}}>Move<span style={{color:C.teal}}>Cape</span></div>
              <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:C.teal,boxShadow:`0 0 6px ${C.teal}`,animation:"dotPulse 1.1s ease-in-out infinite"}}/>
                <span style={{fontSize:9,color:C.muted,letterSpacing:1.5,fontWeight:700}}>CAPE TOWN MOBILITY</span>
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {premium
              ?<div style={{padding:"5px 12px",borderRadius:99,background:C.goldDim,border:"1px solid rgba(251,191,36,0.35)",color:C.gold,fontSize:11,fontWeight:900,boxShadow:`0 0 12px ${C.goldGlow}`,letterSpacing:0.5}}>⭐ PRO</div>
              :<button onClick={()=>setPremium(true)} style={{padding:"5px 12px",borderRadius:99,background:C.goldDim,border:"1px solid rgba(251,191,36,0.25)",color:C.gold,fontSize:11,fontWeight:900,cursor:"pointer",letterSpacing:0.5}}>⭐ Go Pro</button>
            }
          </div>
        </div>
        <div style={{display:"flex"}}>
          {TABS.map(t=>(
            <button key={t.id} className="navbtn" onClick={()=>setTab(t.id)} style={{flex:1,padding:"9px 2px 12px",background:"transparent",border:"none",borderBottom:`2px solid ${tab===t.id?C.teal:"transparent"}`,color:tab===t.id?C.teal:C.muted,fontSize:9,fontWeight:800,cursor:"pointer",transition:"all 0.2s",letterSpacing:0.8,display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative"}}>
              {tab===t.id&&<div style={{position:"absolute",top:-1,left:"50%",transform:"translateX(-50%)",width:20,height:2,background:C.teal,borderRadius:99,boxShadow:`0 0 6px ${C.teal}`}}/>}
              <span style={{fontSize:t.id==="taxi"?16:17,lineHeight:1}}>{t.sym}</span>
              {t.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ══ PLAN ══ */}
      {tab==="plan"&&(
        <div style={{padding:16,position:"relative",zIndex:1,animation:"fadeIn 0.3s ease"}}>
          <GlassCard style={{padding:20,marginBottom:16}} glow={!!(origin&&dest)}>
            <SectionLabel>ROUTE PLANNER</SectionLabel>
            {/* Origin */}
            <div style={{position:"relative",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:10,background:"rgba(0,0,0,0.3)",borderRadius:12,padding:"12px 16px",border:`1px solid ${origin?C.tealBorder:C.glassBorder}`,transition:"border 0.2s"}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:C.teal,boxShadow:`0 0 8px ${C.teal}`,flexShrink:0}}/>
                <input value={origin} onChange={e=>{setOrigin(e.target.value);setOriginSugs(filterSugs(e.target.value));}} onFocus={()=>setOriginSugs(filterSugs(origin))} onBlur={()=>setTimeout(()=>setOriginSugs([]),200)} placeholder="From — e.g. Cape Town CBD" style={{flex:1,fontSize:14,fontWeight:500}}/>
                {origin&&<button onClick={()=>{setOrigin("");setRoutes([]);}} style={{background:"none",border:"none",color:C.dim,cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>}
              </div>
              {originSugs.length>0&&(
                <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:200,background:"rgba(8,13,26,0.98)",border:`1px solid ${C.tealBorder}`,borderRadius:12,overflow:"hidden",backdropFilter:"blur(20px)",boxShadow:"0 16px 40px rgba(0,0,0,0.7)"}}>
                  {originSugs.map(s=><div key={s} className="sug" onClick={()=>{setOrigin(s);setOriginSugs([]);}} style={{padding:"11px 16px",fontSize:13,cursor:"pointer",color:C.text,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,transition:"background 0.15s"}}><span style={{color:C.teal,fontSize:9}}>●</span>{s}</div>)}
                </div>
              )}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,margin:"4px 0"}}>
              <div style={{flex:1,height:1,background:C.border}}/>
              <button onClick={swap} style={{width:34,height:34,borderRadius:10,background:"rgba(0,255,204,0.08)",border:`1px solid ${C.tealBorder}`,color:C.teal,cursor:"pointer",fontSize:17,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>⇅</button>
              <div style={{flex:1,height:1,background:C.border}}/>
            </div>
            {/* Dest */}
            <div style={{position:"relative",marginBottom:18}}>
              <div style={{display:"flex",alignItems:"center",gap:10,background:"rgba(0,0,0,0.3)",borderRadius:12,padding:"12px 16px",border:`1px solid ${dest?C.crimson+"44":C.glassBorder}`,transition:"border 0.2s"}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:C.crimson,boxShadow:`0 0 8px ${C.crimson}`,flexShrink:0}}/>
                <input value={dest} onChange={e=>{setDest(e.target.value);setDestSugs(filterSugs(e.target.value));}} onFocus={()=>setDestSugs(filterSugs(dest))} onBlur={()=>setTimeout(()=>setDestSugs([]),200)} placeholder="To — e.g. Stellenbosch" style={{flex:1,fontSize:14,fontWeight:500}}/>
                {dest&&<button onClick={()=>{setDest("");setRoutes([]);}} style={{background:"none",border:"none",color:C.dim,cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>}
              </div>
              {destSugs.length>0&&(
                <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:200,background:"rgba(8,13,26,0.98)",border:`1px solid ${C.crimson}44`,borderRadius:12,overflow:"hidden",backdropFilter:"blur(20px)",boxShadow:"0 16px 40px rgba(0,0,0,0.7)"}}>
                  {destSugs.map(s=><div key={s} className="sug" onClick={()=>{setDest(s);setDestSugs([]);}} style={{padding:"11px 16px",fontSize:13,cursor:"pointer",color:C.text,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,transition:"background 0.15s"}}><span style={{color:C.crimson,fontSize:9}}>●</span>{s}</div>)}
                </div>
              )}
            </div>
            <button onClick={handleSearch} disabled={!origin||!dest||searching} style={{width:"100%",padding:"15px",borderRadius:14,background:origin&&dest?`linear-gradient(135deg,${C.teal},#00c49a,#00a87e)`:"rgba(255,255,255,0.04)",border:`1px solid ${origin&&dest?"transparent":C.glassBorder}`,color:origin&&dest?C.void:C.dim,fontSize:14,fontWeight:900,cursor:origin&&dest?"pointer":"default",letterSpacing:1.5,textTransform:"uppercase",boxShadow:origin&&dest?`0 0 32px ${C.tealGlow},0 4px 20px rgba(0,0,0,0.4)`:"none",transition:"all 0.3s",fontFamily:"'Syne',sans-serif"}}>
              {searching?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><span style={{animation:"spin 0.8s linear infinite",display:"inline-block"}}>◌</span>Scanning routes…</span>:"Find Routes →"}
            </button>
          </GlassCard>

          {searching&&<div style={{textAlign:"center",padding:"28px 20px",animation:"fadeIn 0.3s ease"}}><div style={{fontSize:40,marginBottom:10,animation:"scanPulse 0.8s infinite"}}>🗺️</div><div style={{fontSize:13,color:C.muted,lineHeight:1.8}}>Scanning <span style={{color:C.teal}}>MyCiTi</span> · <span style={{color:C.blue}}>Metrorail</span> · <span style={{color:C.gold}}>Uber/Bolt</span> · <span style={{color:C.crimson}}>Taxis</span></div></div>}

          {!searching&&routes.length>0&&(
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,padding:"0 2px"}}>
                <span style={{fontSize:10,color:C.muted,fontWeight:800,letterSpacing:1.5}}>{routes.length} ROUTES · {origin} → {dest}</span>
                <button onClick={()=>{setRoutes([]);setOrigin("");setDest("");}} style={{background:"transparent",border:"none",color:C.dim,fontSize:11,cursor:"pointer",fontWeight:700}}>✕ Clear</button>
              </div>
              {routes.map((r,i)=>{
                const bc=BADGE_COLORS[r.badge]||C.teal;
                const open=selectedRoute===r.id;
                return(
                  <div key={r.id} className="rc" style={{marginBottom:12}}>
                    <div onClick={()=>setSelectedRoute(open?null:r.id)} style={{background:open?"rgba(0,255,204,0.06)":C.glass,border:`1px solid ${open?C.tealBorder:C.glassBorder}`,borderRadius:20,backdropFilter:"blur(20px)",padding:18,cursor:"pointer",transition:"all 0.25s",boxShadow:open?`0 0 28px ${C.tealGlow},0 8px 32px rgba(0,0,0,0.5)`:"0 4px 20px rgba(0,0,0,0.3)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
                            <span style={{fontSize:9,fontWeight:900,letterSpacing:1.5,padding:"3px 9px",borderRadius:99,background:`${bc}18`,border:`1px solid ${bc}44`,color:bc}}>{r.badge}</span>
                            {i===0&&<span style={{fontSize:9,fontWeight:900,letterSpacing:1,padding:"3px 9px",borderRadius:99,background:C.tealDim,border:`1px solid ${C.tealBorder}`,color:C.teal}}>★ TOP PICK</span>}
                          </div>
                          <div style={{fontSize:18,fontWeight:900,fontFamily:"'Syne',sans-serif",marginBottom:8,letterSpacing:-0.5}}>{r.name}</div>
                          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{r.modes.map(m=><ModeChip key={m} mode={m}/>)}</div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0,paddingLeft:12}}>
                          <div style={{fontSize:26,fontWeight:900,lineHeight:1,fontFamily:"'Syne',sans-serif",color:C.white}}>{r.time}–{r.timeMax}<span style={{fontSize:11,color:C.muted,fontWeight:400}}> min</span></div>
                          <div style={{fontSize:14,color:r.cost===0?C.teal:C.teal,fontWeight:800,marginTop:3}}>{r.cost===0?"Free":`R${r.cost}–${r.costMax}`}</div>
                        </div>
                      </div>
                      <ReliabilityBar score={r.reliability}/>
                      {open&&(
                        <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${C.border}`,animation:"fadeIn 0.25s ease"}}>
                          <div style={{background:C.goldDim,border:"1px solid rgba(251,191,36,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.gold,lineHeight:1.5}}>💡 {r.tip}</div>
                          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                            <DeepBtn link={r.deepLink}/>
                            {r.deepLink2&&<DeepBtn link={r.deepLink2} secondary/>}
                            <a href={`https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(dest)}&travelmode=transit`} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:10,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:12,fontWeight:700,textDecoration:"none"}}>🗺️ Google Maps</a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div style={{display:"flex",gap:6,flexWrap:"wrap",margin:"4px 0"}}>
                {[{label:"MyCiTi",url:"https://www.myciti.org.za",icon:"🚌"},{label:"CT Trains",url:"https://cttrains.co.za",icon:"🚆"},{label:"WC Government",url:"https://www.westerncape.gov.za",icon:"🏛️"},{label:"Kloofstreet",url:"https://kloofstreet.online/welcome",icon:"🏙️"}].map(l=>(
                  <a key={l.label} href={l.url} target="_blank" rel="noreferrer" className="ql" style={{display:"inline-flex",alignItems:"center",gap:5,padding:"6px 11px",borderRadius:99,background:C.glass,border:`1px solid ${C.glassBorder}`,color:C.muted,fontSize:10,fontWeight:700,textDecoration:"none",transition:"all 0.2s"}}>{l.icon} {l.label}</a>
                ))}
              </div>
            </>
          )}

          {!searching&&routes.length===0&&(
            <>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:9,color:C.muted,fontWeight:900,letterSpacing:2.5,marginBottom:10}}>⚡ QUICK PICKS</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[
                    {from:"Cape Town CBD",to:"Khayelitsha"},
                    {from:"Cape Town CBD",to:"Sea Point"},
                    {from:"Claremont",to:"Cape Town CBD"},
                    {from:"Bellville",to:"Stellenbosch"},
                    {from:"Mitchells Plain",to:"Cape Town CBD"},
                    {from:"Cape Town CBD",to:"Simon's Town"},
                  ].map(q=>(
                    <button key={q.from} onClick={()=>{setOrigin(q.from);setDest(q.to);}} className="qp" style={{background:C.glass,border:`1px solid ${C.glassBorder}`,borderRadius:14,padding:"12px 14px",cursor:"pointer",textAlign:"left",transition:"all 0.2s",backdropFilter:"blur(10px)"}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:3}}>{q.from}</div>
                      <div style={{fontSize:10,color:C.muted}}>→ {q.to}</div>
                    </button>
                  ))}
                </div>
              </div>
              <GlassCard style={{padding:18}}>
                <div style={{fontSize:9,color:C.muted,fontWeight:900,letterSpacing:2.5,marginBottom:14}}>MOBILITY PARTNERS</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[{icon:"🚌",label:"MyCiTi",sub:"Bus routes",url:"https://www.myciti.org.za",color:C.teal},{icon:"🚆",label:"CT Trains",sub:"Train schedules",url:"https://cttrains.co.za",color:C.blue},{icon:"🚗",label:"Uber",sub:"Ride-hailing",url:"uber://",color:C.gold},{icon:"⚡",label:"Bolt",sub:"Ride-hailing",url:"bolt://",color:C.purple},{icon:"🏛️",label:"WC Government",sub:"Transport info",url:"https://www.westerncape.gov.za",color:C.muted},{icon:"🏙️",label:"Kloofstreet",sub:"Local guide",url:"https://kloofstreet.online/welcome",color:C.teal}].map(p=>(
                    <a key={p.label} href={p.url} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:10,padding:"11px 12px",borderRadius:12,background:"rgba(0,0,0,0.25)",border:`1px solid ${C.border}`,textDecoration:"none",transition:"all 0.2s"}}>
                      <div style={{width:34,height:34,borderRadius:10,background:`${p.color}14`,border:`1px solid ${p.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{p.icon}</div>
                      <div><div style={{fontSize:12,fontWeight:700,color:p.color}}>{p.label}</div><div style={{fontSize:10,color:C.dim}}>{p.sub}</div></div>
                    </a>
                  ))}
                </div>
              </GlassCard>
            </>
          )}
          <BHFooter/>
        </div>
      )}

      {/* ══ TAXI ══ */}
      {tab==="taxi"&&<TaxiTab/>}

      {tab==="flights"&&<FlightsTab/>}

      {/* ══ ALERTS ══ */}
      {tab==="alerts"&&(
        <div style={{padding:16,position:"relative",zIndex:1,animation:"fadeIn 0.3s ease"}}>

          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div>
              <div style={{fontSize:22,fontWeight:900,fontFamily:"'Syne',sans-serif"}}>Live Alerts</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>Cape Town transit · auto-refreshing</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
              <div style={{padding:"5px 12px",borderRadius:99,background:C.tealDim,border:`1px solid ${C.tealBorder}`,color:C.teal,fontSize:11,fontWeight:900}}>
                {ALERTS.length} active
              </div>
              <button onClick={refetch} style={{background:"transparent",border:"none",color:C.dim,fontSize:10,cursor:"pointer",fontWeight:600,letterSpacing:0.3}}>
                ↻ {alertStatus==="loading" ? "Refreshing…" : `${countdown}s`}
              </button>
            </div>
          </div>

          {/* Status banner */}
          {alertStatus==="unconfigured"&&(
            <div style={{background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:12,padding:"12px 16px",marginBottom:14,fontSize:12,color:C.gold,lineHeight:1.6}}>
              <div style={{fontWeight:800,marginBottom:4}}>⚙️ Sheet not connected yet</div>
              Paste your Apps Script URL into <code style={{background:"rgba(0,0,0,0.3)",padding:"1px 5px",borderRadius:4}}>SHEET_URL</code> in the code to enable live alerts. Showing fallback data below.
            </div>
          )}
          {alertStatus==="error"&&(
            <div style={{background:"rgba(255,59,92,0.08)",border:`1px solid ${C.crimson}33`,borderRadius:12,padding:"12px 16px",marginBottom:14,fontSize:12,color:C.crimson,lineHeight:1.6}}>
              <div style={{fontWeight:800,marginBottom:2}}>⚠️ Could not reach Google Sheet</div>
              Showing last known alerts. Will retry in {countdown}s.
            </div>
          )}
          {alertStatus==="live"&&lastFetched&&(
            <div style={{background:C.tealDim,border:`1px solid ${C.tealBorder}`,borderRadius:12,padding:"9px 14px",marginBottom:14,fontSize:11,color:C.teal,display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:C.teal,boxShadow:`0 0 6px ${C.teal}`,animation:"dotPulse 1.5s infinite"}}/>
              Live from Google Sheets · updated {lastFetched.toLocaleTimeString("en-ZA",{hour:"2-digit",minute:"2-digit"})} · next in {countdown}s
            </div>
          )}
          {alertStatus==="loading"&&ALERTS.length===0&&(
            <div style={{textAlign:"center",padding:"32px 20px",color:C.muted,fontSize:13}}>
              <div style={{fontSize:28,marginBottom:8,animation:"dotPulse 0.8s infinite"}}>📡</div>
              Connecting to Google Sheets…
            </div>
          )}

          {/* Alert cards */}
          {ALERTS.map((a,i)=>{
            const hex = typeof a.color==="string" && a.color.startsWith("#") ? a.color : (COLOR_MAP[a.color]||C.muted);
            return(
              <GlassCard key={a.id} style={{padding:"14px 16px",marginBottom:10,border:`1px solid ${a.pinned?C.tealBorder:C.glassBorder}`}}>
                <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{width:38,height:38,borderRadius:11,flexShrink:0,background:`${hex}14`,border:`1px solid ${hex}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{a.icon}</div>
                  <div style={{flex:1}}>
                    {a.pinned&&<div style={{fontSize:9,color:C.teal,fontWeight:900,letterSpacing:1.5,marginBottom:4}}>📌 PINNED</div>}
                    <div style={{fontSize:13,fontWeight:500,marginBottom:6,lineHeight:1.5}}>{a.message}</div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{width:5,height:5,borderRadius:"50%",background:hex,animation:i===0?"dotPulse 1s infinite":"none"}}/>
                        <span style={{fontSize:10,color:C.dim,fontWeight:700}}>{a.source||"MoveCape"}</span>
                      </div>
                      <span style={{fontSize:9,color:C.dim,padding:"2px 7px",borderRadius:99,background:C.glass,border:`1px solid ${C.border}`,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase"}}>{a.category}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}

          <div style={{height:10}}/>

          {/* Report panel */}
          <GlassCard style={{padding:18}}>
            <div style={{fontSize:15,fontWeight:900,fontFamily:"'Syne',sans-serif",marginBottom:4}}>📢 Report an Issue</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:16,lineHeight:1.6}}>
              Spotted a delay, disruption or safety issue? Report it in seconds — your update helps thousands of Cape Town commuters.
            </div>

            {/* Issue type selector */}
            {(()=>{
              const ISSUES = [
                {icon:"🚌",label:"Bus delay",    color:C.teal,   msg:"🚌 MyCiTi bus delay"},
                {icon:"🚆",label:"Train issue",  color:C.blue,   msg:"🚆 Metrorail disruption"},
                {icon:"🚐",label:"Taxi problem", color:C.crimson,msg:"🚐 Taxi disruption"},
                {icon:"⚠️",label:"Safety alert", color:C.gold,   msg:"⚠️ Safety concern"},
                {icon:"🚗",label:"Uber surge",   color:C.purple, msg:"🚗 Uber/Bolt surge pricing"},
                {icon:"🌧️",label:"Weather issue",color:C.muted,  msg:"🌧️ Weather affecting transport"},
              ];
              return(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:18}}>
                  {ISSUES.map(r=>{
                    const waMsg = encodeURIComponent(
                      r.msg + " — [describe location & details here]\n\nRoute: [from → to]\nTime: " + new Date().toLocaleTimeString("en-ZA",{hour:"2-digit",minute:"2-digit"}) + "\n\nSent via MoveCape movecape.online"
                    );
                    const twMsg = encodeURIComponent(r.msg + " [add details + location] #MoveCape #CapeTownTraffic");
                    return(
                      <div key={r.label} style={{background:`${r.color}0d`,border:`1px solid ${r.color}22`,borderRadius:12,padding:"10px 8px",textAlign:"center"}}>
                        <div style={{fontSize:20,marginBottom:4}}>{r.icon}</div>
                        <div style={{fontSize:10,color:r.color,fontWeight:800,marginBottom:8,lineHeight:1.3}}>{r.label}</div>
                        <div style={{display:"flex",flexDirection:"column",gap:5}}>
                          <a href={`https://wa.me/27744815163?text=${waMsg}`} target="_blank" rel="noreferrer"
                            style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"5px 6px",borderRadius:7,background:"rgba(37,211,102,0.12)",border:"1px solid rgba(37,211,102,0.3)",color:"#25d366",fontSize:10,fontWeight:800,textDecoration:"none"}}>
                            💬 WhatsApp
                          </a>
                          <a href={`https://twitter.com/intent/tweet?text=${twMsg}&via=movecapect`} target="_blank" rel="noreferrer"
                            style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"5px 6px",borderRadius:7,background:"rgba(29,161,242,0.1)",border:"1px solid rgba(29,161,242,0.25)",color:"#1da1f2",fontSize:10,fontWeight:800,textDecoration:"none"}}>
                            𝕏 Tweet
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* How it works */}
            <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14}}>
              <div style={{fontSize:10,color:C.muted,fontWeight:800,letterSpacing:1.5,marginBottom:10}}>HOW REPORTING WORKS</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{width:22,height:22,borderRadius:6,background:"rgba(37,211,102,0.1)",border:"1px solid rgba(37,211,102,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0}}>💬</div>
                  <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}><span style={{color:C.text,fontWeight:700}}>WhatsApp</span> — Tap your issue type above. A pre-filled message opens. Add your location and details, then send to our team. We review and publish to the alerts feed.</div>
                </div>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{width:22,height:22,borderRadius:6,background:"rgba(29,161,242,0.1)",border:"1px solid rgba(29,161,242,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0}}>𝕏</div>
                  <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}><span style={{color:C.text,fontWeight:700}}>X / Twitter</span> — Tweet with <span style={{color:C.teal,fontWeight:700}}>#MoveCape</span> and we'll pick it up. Your tweet may be featured in the live alerts feed.</div>
                </div>
              </div>
            </div>
          </GlassCard>
          <BHFooter/>
        </div>
      )}

      {/* ══ EXPLORE ══ */}
      {tab==="explore"&&(
        <div style={{padding:16,position:"relative",zIndex:1,animation:"fadeIn 0.3s ease"}}>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:22,fontWeight:900,fontFamily:"'Syne',sans-serif"}}>Explore Cape Town</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>Key zones, transport hubs & local spots</div>
          </div>
          {[
            {name:"Cape Town CBD",   desc:"The main hub — MyCiTi, Metrorail, Civic Centre taxi rank & Uber all converge here",           modes:["bus","train","uber","walk","minibus"],hot:true},
            {name:"Waterfront V&A",  desc:"Cape Town's tourist epicentre — MyCiTi T01, Uber & walk from CBD",                            modes:["bus","uber","walk"]},
            {name:"Kloofstreet",     desc:"Lifestyle corridor — cafes, boutiques, bars & rooftop restaurants",                           modes:["uber","walk"],link:"https://kloofstreet.online/welcome"},
            {name:"Sea Point",       desc:"Atlantic Seaboard strip — taxi from CBD R10, MyCiTi T01 or Uber",                             modes:["bus","minibus","uber","walk"]},
            {name:"Camps Bay",       desc:"Beach strip & restaurants — taxi or Uber from CBD, no direct train",                          modes:["minibus","uber","walk"]},
            {name:"Stellenbosch",    desc:"Winelands hub — taxi or ride-hail from CBD · Metrorail also serves the area",                 modes:["train","minibus","uber"]},
            {name:"Bellville",       desc:"Northern suburbs business hub — frequent taxis on N1/Voortrekker, Metrorail Northern Line",   modes:["train","bus","minibus","uber"]},
            {name:"Khayelitsha",     desc:"Largest township — MyCiTi N2 Express, minibus taxi via N2, R20 from CBD",                    modes:["bus","minibus"]},
            {name:"Mitchells Plain", desc:"Major residential area — MyCiTi N2 Express & taxis via N2, ~R20–25 from CBD",                modes:["bus","minibus"]},
            {name:"Muizenberg",      desc:"False Bay surf & beach — Metrorail Southern Line from CBD, ~30 min",                         modes:["train","uber"]},
            {name:"Simon's Town",    desc:"Naval town & penguins — Metrorail Southern Line terminus, scenic route",                     modes:["train","uber"]},
            {name:"Hout Bay",        desc:"Scenic harbour village — Uber or taxi from CBD via Victoria Rd, no direct rail",              modes:["minibus","uber","walk"]},
            {name:"Table View",      desc:"West Coast suburb — MyCiTi bus from CBD via Blouberg route",                                 modes:["bus","uber"]},
            {name:"Paarl",           desc:"Winelands town ~60km — long-distance taxi from Civic Centre or Metrorail",                   modes:["train","minibus","uber"]},
          ].map(z=>(
            <GlassCard key={z.name} style={{padding:18,marginBottom:10}} glow={z.hot}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
                {z.hot&&<span style={{fontSize:9,padding:"3px 9px",borderRadius:99,fontWeight:900,letterSpacing:1.5,background:C.tealDim,border:`1px solid ${C.tealBorder}`,color:C.teal}}>◉ HOT ZONE</span>}
                {z.link&&<span style={{fontSize:9,padding:"3px 9px",borderRadius:99,fontWeight:900,letterSpacing:1,background:C.goldDim,border:"1px solid rgba(251,191,36,0.25)",color:C.gold}}>★ FEATURED</span>}
              </div>
              <div style={{fontSize:17,fontWeight:900,fontFamily:"'Syne',sans-serif",marginBottom:4}}>{z.name}</div>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.5,marginBottom:10}}>{z.desc}</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>{z.modes.map(m=><ModeChip key={m} mode={m}/>)}</div>
              <div style={{display:"flex",gap:8,paddingTop:10,borderTop:`1px solid ${C.border}`}}>
                <button onClick={()=>{setDest(z.name);setTab("plan");}} style={{padding:"8px 14px",borderRadius:10,background:C.tealDim,border:`1px solid ${C.tealBorder}`,color:C.teal,fontSize:12,fontWeight:800,cursor:"pointer"}}>Navigate Here →</button>
                {z.link&&<a href={z.link} target="_blank" rel="noreferrer" style={{padding:"8px 14px",borderRadius:10,background:"transparent",border:`1px solid ${C.glassBorder}`,color:C.muted,fontSize:12,fontWeight:700,textDecoration:"none"}}>Explore 🏙️</a>}
              </div>
            </GlassCard>
          ))}
          <a href="https://www.businesshustle.co.za/Solutions#bh-local---a-business-hustle-project" target="_blank" rel="noreferrer" style={{textDecoration:"none",display:"block",marginTop:8}}>
            <div style={{background:"linear-gradient(135deg,rgba(0,255,204,0.08),rgba(79,142,255,0.08))",border:`1px solid ${C.tealBorder}`,borderRadius:20,padding:"18px 20px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-20,right:-20,width:100,height:100,background:`radial-gradient(circle,${C.tealGlow} 0%,transparent 70%)`,pointerEvents:"none"}}/>
              <div style={{fontSize:9,color:C.teal,fontWeight:900,letterSpacing:2.5,marginBottom:6}}>PART OF THE ECOSYSTEM</div>
              <div style={{fontSize:18,fontWeight:900,fontFamily:"'Syne',sans-serif",marginBottom:4}}>BH Local Platform</div>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>MoveCape is part of the Business Hustle Local ecosystem — connecting Cape Town digitally.</div>
            </div>
          </a>
          <BHFooter/>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,zIndex:150,background:"rgba(5,8,16,0.92)",backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",borderTop:`1px solid ${C.glassBorder}`,padding:"10px 0 16px",display:"flex"}}>
        {TABS.map(t=>{
          const active=tab===t.id;
          return(
            <button key={t.id} onClick={()=>setTab(t.id)} className="navbtn" style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,color:active?C.teal:C.dim,fontSize:9,fontWeight:active?900:500,letterSpacing:active?1.2:0.5,transition:"all 0.2s",position:"relative"}}>
              {active&&<div style={{position:"absolute",top:-1,left:"50%",transform:"translateX(-50%)",width:20,height:2,background:C.teal,borderRadius:99,boxShadow:`0 0 6px ${C.teal}`}}/>}
              <span style={{fontSize:t.id==="taxi"?16:18,lineHeight:1}}>{t.sym}</span>
              {t.label.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
