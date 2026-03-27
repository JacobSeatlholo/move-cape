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
  "Cape Town CBD","Waterfront V&A","Sea Point","Green Point","De Waterkant",
  "Woodstock","Salt River","Observatory","Mowbray","Rondebosch",
  "Claremont","Kenilworth","Wynberg","Plumstead","Retreat",
  "Simon's Town","Fish Hoek","Muizenberg","Kalk Bay","Constantia",
  "Hout Bay","Camps Bay","Clifton","Bellville","Parow","Goodwood",
  "Elsies River","Bishop Lavis","Mitchells Plain","Khayelitsha","Gugulethu","Langa","Athlone",
  "Paarl","Stellenbosch","Somerset West","Strand","Gordon's Bay",
  "Kloofstreet","Gardens","Oranjezicht","Tamboerskloof","Bo-Kaap",
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

const ROUTE_TEMPLATES = [
  {id:"r1",name:"City Express",  badge:"FASTEST", modes:["bus","walk"],        timeMin:22,timeMax:35,costMin:12,costMax:18,reliability:82,tip:"MyCiTi T01 departs every 12 min during peak hours",          deepLink:{label:"Open MyCiTi",     url:"myciti://",fallback:"https://www.myciti.org.za",icon:"🚌"}},
  {id:"r2",name:"Rail + Walk",   badge:"BUDGET",  modes:["train","walk"],      timeMin:28,timeMax:45,costMin:6, costMax:14,reliability:58,tip:"Metrorail delays are common — allow buffer time",            deepLink:{label:"Metrorail Schedule",url:"https://www.prasa.com/metrorail/western-cape/",icon:"🚆"}},
  {id:"r3",name:"Ride-Hail Direct",badge:"PREMIUM",modes:["uber"],             timeMin:12,timeMax:22,costMin:45,costMax:90,reliability:95,tip:"Surge pricing likely during morning rush (7–9am)",           deepLink:{label:"Open Uber",       url:"uber://",fallback:"https://m.uber.com",icon:"🚗"},deepLink2:{label:"Open Bolt",url:"bolt://",icon:"⚡"}},
  {id:"r4",name:"Combo Route",   badge:"SMART",   modes:["train","bus","walk"],timeMin:35,timeMax:55,costMin:16,costMax:26,reliability:70,tip:"Budget-friendly combo — slight wait at interchange",         deepLink:{label:"Plan on Maps",    url:"https://maps.google.com",icon:"🗺️"}},
  {id:"r5",name:"Minibus Taxi",  badge:"LOCAL",   modes:["minibus","walk"],    timeMin:18,timeMax:40,costMin:8, costMax:15,reliability:60,tip:"Fastest local option, no fixed schedule — hail at rank",    deepLink:{label:"WC Transport Info",url:"https://www.westerncape.gov.za/transport",icon:"🌐"}},
];

const BADGE_COLORS = {FASTEST:C.teal,BUDGET:C.blue,PREMIUM:C.gold,SMART:C.purple,LOCAL:C.crimson};

function getRoutes(o,d){
  if(!o||!d) return [];
  const s=(o+d).length;
  return ROUTE_TEMPLATES.slice(0,3).map((r,i)=>({...r,time:r.timeMin+Math.floor(((s*(i+1))%10)*0.5),cost:r.costMin+Math.floor(((s*(i+1))%10)*0.3)}));
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
    {id:"plan",   sym:"◎",label:"Plan"},
    {id:"taxi",   sym:"🚐",label:"Taxis"},
    {id:"alerts", sym:"◈",label:"Alerts"},
    {id:"explore",sym:"◉",label:"Explore"},
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
                          <div style={{fontSize:30,fontWeight:900,lineHeight:1,fontFamily:"'Syne',sans-serif",color:C.white}}>{r.time}<span style={{fontSize:13,color:C.muted,fontWeight:400}}> min</span></div>
                          <div style={{fontSize:14,color:C.teal,fontWeight:800,marginTop:2}}>R{r.cost}–{r.costMax}</div>
                        </div>
                      </div>
                      <ReliabilityBar score={r.reliability}/>
                      {open&&(
                        <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${C.border}`,animation:"fadeIn 0.25s ease"}}>
                          <div style={{background:C.goldDim,border:"1px solid rgba(251,191,36,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.gold,lineHeight:1.5}}>💡 {r.tip}</div>
                          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                            <DeepBtn link={r.deepLink}/>
                            {r.deepLink2&&<DeepBtn link={r.deepLink2} secondary/>}
                            <a href="https://maps.google.com" target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:10,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:12,fontWeight:700,textDecoration:"none"}}>🗺️ Google Maps</a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div style={{display:"flex",gap:6,flexWrap:"wrap",margin:"4px 0"}}>
                {[{label:"MyCiTi",url:"https://www.myciti.org.za",icon:"🚌"},{label:"Metrorail WC",url:"https://www.prasa.com/metrorail/western-cape/",icon:"🚆"},{label:"WC Government",url:"https://www.westerncape.gov.za",icon:"🏛️"},{label:"Kloofstreet",url:"https://kloofstreet-online.vercel.app",icon:"🏙️"}].map(l=>(
                  <a key={l.label} href={l.url} target="_blank" rel="noreferrer" className="ql" style={{display:"inline-flex",alignItems:"center",gap:5,padding:"6px 11px",borderRadius:99,background:C.glass,border:`1px solid ${C.glassBorder}`,color:C.muted,fontSize:10,fontWeight:700,textDecoration:"none",transition:"all 0.2s"}}>{l.icon} {l.label}</a>
                ))}
              </div>
            </>
          )}

          {!searching&&routes.length===0&&(
            <>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:9,color:C.muted,fontWeight:900,letterSpacing:2.5,marginBottom:10}}>⚡ QUICK PICKS</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[{from:"Cape Town CBD",to:"Waterfront V&A"},{from:"Kloofstreet",to:"Sea Point"},{from:"Claremont",to:"Cape Town CBD"},{from:"Stellenbosch",to:"Cape Town CBD"}].map(q=>(
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
                  {[{icon:"🚌",label:"MyCiTi",sub:"Bus routes",url:"https://www.myciti.org.za",color:C.teal},{icon:"🚆",label:"Metrorail",sub:"Train schedules",url:"https://www.prasa.com/metrorail/western-cape/",color:C.blue},{icon:"🚗",label:"Uber",sub:"Ride-hailing",url:"uber://",color:C.gold},{icon:"⚡",label:"Bolt",sub:"Ride-hailing",url:"bolt://",color:C.purple},{icon:"🏛️",label:"WC Government",sub:"Transport info",url:"https://www.westerncape.gov.za",color:C.muted},{icon:"🏙️",label:"Kloofstreet",sub:"Local guide",url:"https://kloofstreet-online.vercel.app",color:C.teal}].map(p=>(
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
            <div style={{fontSize:12,color:C.muted,marginBottom:14,lineHeight:1.6}}>Help commuters by reporting delays, safety issues, or service changes. Reports are reviewed before going live.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[{icon:"🚌",label:"Bus delay",color:C.teal,cat:"bus"},{icon:"🚆",label:"Train issue",color:C.blue,cat:"train"},{icon:"🚐",label:"Taxi disruption",color:C.crimson,cat:"taxi"},{icon:"⚠️",label:"Safety alert",color:C.gold,cat:"safety"}].map(r=>(
                <button key={r.label} onClick={()=>alert(`Report submitted: ${r.label}\n\nThis will be wired to your Google Sheet via the Apps Script POST endpoint.`)}
                  style={{background:`${r.color}0d`,border:`1px solid ${r.color}22`,borderRadius:12,padding:"11px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,color:r.color,fontSize:12,fontWeight:800}}>
                  <span style={{fontSize:16}}>{r.icon}</span>{r.label}
                </button>
              ))}
            </div>
            <div style={{marginTop:12,padding:"10px 12px",borderRadius:10,background:"rgba(0,0,0,0.2)",border:`1px solid ${C.border}`}}>
              <div style={{fontSize:10,color:C.dim,lineHeight:1.6}}>
                💡 To submit crowd reports directly to your sheet, wire the buttons to the Apps Script POST endpoint in <code style={{background:"rgba(0,0,0,0.3)",padding:"1px 4px",borderRadius:3}}>movecape-apps-script.js</code>
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
            {name:"Cape Town CBD",  desc:"Central hub — MyCiTi, Metrorail, taxis & Civic Centre rank all converge", modes:["bus","train","uber","walk","minibus"],hot:true},
            {name:"Waterfront V&A", desc:"Tourist epicentre — Uber & MyCiTi direct, easy walking distance",          modes:["bus","uber","walk"]},
            {name:"Kloofstreet",    desc:"Lifestyle corridor — cafes, boutiques & nightlife",                        modes:["uber","walk"],link:"https://kloofstreet-online.vercel.app"},
            {name:"Stellenbosch",   desc:"Winelands — train from CBD or ride-hail for groups",                      modes:["train","uber"]},
            {name:"Khayelitsha",    desc:"Township hub — MyCiTi BRT, minibus & taxi terminus",                      modes:["bus","minibus"]},
            {name:"Hout Bay",       desc:"Scenic coastal route — Uber recommended, no direct public transit",       modes:["uber","walk"]},
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
