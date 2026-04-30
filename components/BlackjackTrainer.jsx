"use client";

import { useState, useEffect, useCallback } from "react";

// ─── CARD DATA ───────────────────────────────────────────────
const SUITS = ["♠","♥","♦","♣"];
const VALUES = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const isRed = (suit) => suit === "♥" || suit === "♦";
const getCountValue = (value) => {
  if (["2","3","4","5","6"].includes(value)) return +1;
  if (["7","8","9"].includes(value)) return 0;
  return -1;
};
const getCountLabel = (value) => {
  const v = getCountValue(value);
  if (v > 0) return { label:"+1", color:"#4fffb0" };
  if (v < 0) return { label:"-1", color:"#ff5577" };
  return { label:"0", color:"#777" };
};
const randomCard = () => ({
  suit: SUITS[Math.floor(Math.random()*4)],
  value: VALUES[Math.floor(Math.random()*13)],
  id: Math.random(),
});

// ─── BASIC STRATEGY ──────────────────────────────────────────
const DEALER_UPCARDS = ["2","3","4","5","6","7","8","9","10","A"];
const HARD_TOTALS = [
  { hand:"17+", actions:["S","S","S","S","S","S","S","S","S","S"] },
  { hand:"16",  actions:["S","S","S","S","S","H","H","H","H","H"] },
  { hand:"15",  actions:["S","S","S","S","S","H","H","H","H","H"] },
  { hand:"14",  actions:["S","S","S","S","S","H","H","H","H","H"] },
  { hand:"13",  actions:["S","S","S","S","S","H","H","H","H","H"] },
  { hand:"12",  actions:["H","H","S","S","S","H","H","H","H","H"] },
  { hand:"11",  actions:["D","D","D","D","D","D","D","D","D","H"] },
  { hand:"10",  actions:["D","D","D","D","D","D","D","D","H","H"] },
  { hand:"9",   actions:["H","D","D","D","D","H","H","H","H","H"] },
  { hand:"8-",  actions:["H","H","H","H","H","H","H","H","H","H"] },
];
const SOFT_TOTALS = [
  { hand:"A,9", actions:["S","S","S","S","S","S","S","S","S","S"] },
  { hand:"A,8", actions:["S","S","S","S","DS","S","S","S","S","S"] },
  { hand:"A,7", actions:["DS","DS","DS","DS","DS","S","S","H","H","H"] },
  { hand:"A,6", actions:["H","D","D","D","D","H","H","H","H","H"] },
  { hand:"A,5", actions:["H","H","D","D","D","H","H","H","H","H"] },
  { hand:"A,4", actions:["H","H","D","D","D","H","H","H","H","H"] },
  { hand:"A,3", actions:["H","H","H","D","D","H","H","H","H","H"] },
  { hand:"A,2", actions:["H","H","H","D","D","H","H","H","H","H"] },
];
const PAIRS = [
  { hand:"A,A",   actions:["P","P","P","P","P","P","P","P","P","P"] },
  { hand:"10,10", actions:["S","S","S","S","S","S","S","S","S","S"] },
  { hand:"9,9",   actions:["P","P","P","P","P","S","P","P","S","S"] },
  { hand:"8,8",   actions:["P","P","P","P","P","P","P","P","P","P"] },
  { hand:"7,7",   actions:["P","P","P","P","P","P","H","H","H","H"] },
  { hand:"6,6",   actions:["P","P","P","P","P","H","H","H","H","H"] },
  { hand:"5,5",   actions:["D","D","D","D","D","D","D","D","H","H"] },
  { hand:"4,4",   actions:["H","H","H","P","P","H","H","H","H","H"] },
  { hand:"3,3",   actions:["P","P","P","P","P","P","H","H","H","H"] },
  { hand:"2,2",   actions:["P","P","P","P","P","P","H","H","H","H"] },
];

const ACTION_STYLE = {
  H:  { bg:"#0f1e2a", border:"#2a9fd6", color:"#2a9fd6", label:"HIT" },
  S:  { bg:"#0d1f14", border:"#4fffb0", color:"#4fffb0", label:"STAND" },
  D:  { bg:"#1e1a08", border:"#ffd700", color:"#ffd700", label:"DOUBLE" },
  P:  { bg:"#1a0f22", border:"#c77dff", color:"#c77dff", label:"SPLIT" },
  DS: { bg:"#1e1008", border:"#ff9f43", color:"#ff9f43", label:"DBL/STD" },
};

// ─── DEVIATIONS (Illustrious 18 + Fab 4) ────────────────────
// true_count threshold: positive = deviate when TC >= X, negative = deviate when TC <= X
// base_play = basic strategy default, dev_play = what to do instead
const DEVIATIONS = [
  // Illustrious 18
  { hand:"16 vs 10",    base:"H",  dev:"S",    tc:"+0", threshold:0,  dir:"gte", priority:"★★★", note:"Most valuable deviation. Stand at TC 0 or higher." },
  { hand:"15 vs 10",    base:"H",  dev:"S",    tc:"+4", threshold:4,  dir:"gte", priority:"★★★", note:"Stand on 15 vs 10 when TC ≥ +4." },
  { hand:"Insurance",   base:"—",  dev:"TAKE", tc:"+3", threshold:3,  dir:"gte", priority:"★★★", note:"Only time insurance is correct. Take at TC ≥ +3." },
  { hand:"20 vs 6",     base:"S",  dev:"D",    tc:"+4", threshold:4,  dir:"gte", priority:"★★",  note:"Double 20 vs dealer 6 at very high counts." },
  { hand:"10 vs 10",    base:"H",  dev:"D",    tc:"+4", threshold:4,  dir:"gte", priority:"★★",  note:"Double 10 vs dealer 10 at TC ≥ +4." },
  { hand:"12 vs 3",     base:"H",  dev:"S",    tc:"+2", threshold:2,  dir:"gte", priority:"★★",  note:"Stand on 12 vs dealer 3 at TC ≥ +2." },
  { hand:"12 vs 2",     base:"H",  dev:"S",    tc:"+3", threshold:3,  dir:"gte", priority:"★★",  note:"Stand on 12 vs dealer 2 at TC ≥ +3." },
  { hand:"11 vs A",     base:"H",  dev:"D",    tc:"+1", threshold:1,  dir:"gte", priority:"★★",  note:"Double 11 vs Ace at TC ≥ +1." },
  { hand:"9 vs 2",      base:"H",  dev:"D",    tc:"+1", threshold:1,  dir:"gte", priority:"★★",  note:"Double 9 vs dealer 2 at TC ≥ +1." },
  { hand:"10 vs A",     base:"H",  dev:"D",    tc:"+4", threshold:4,  dir:"gte", priority:"★★",  note:"Double 10 vs Ace at TC ≥ +4." },
  { hand:"9 vs 7",      base:"H",  dev:"D",    tc:"+3", threshold:3,  dir:"gte", priority:"★",   note:"Double 9 vs dealer 7 at TC ≥ +3." },
  { hand:"16 vs 9",     base:"H",  dev:"S",    tc:"+5", threshold:5,  dir:"gte", priority:"★",   note:"Stand on 16 vs 9 at TC ≥ +5." },
  { hand:"13 vs 2",     base:"S",  dev:"H",    tc:"-1", threshold:-1, dir:"lte", priority:"★",   note:"Hit 13 vs dealer 2 when TC ≤ -1." },
  { hand:"12 vs 4",     base:"S",  dev:"H",    tc:"0",  threshold:0,  dir:"lte", priority:"★",   note:"Hit 12 vs dealer 4 when TC ≤ 0." },
  { hand:"12 vs 5",     base:"S",  dev:"H",    tc:"-2", threshold:-2, dir:"lte", priority:"★",   note:"Hit 12 vs dealer 5 when TC ≤ -2." },
  { hand:"12 vs 6",     base:"S",  dev:"H",    tc:"-1", threshold:-1, dir:"lte", priority:"★",   note:"Hit 12 vs dealer 6 when TC ≤ -1." },
  { hand:"13 vs 3",     base:"S",  dev:"H",    tc:"-2", threshold:-2, dir:"lte", priority:"★",   note:"Hit 13 vs dealer 3 when TC ≤ -2." },
  { hand:"A8 vs 6",     base:"S",  dev:"D",    tc:"+1", threshold:1,  dir:"gte", priority:"★",   note:"Double soft 19 vs dealer 6 at TC ≥ +1." },
  // Fab 4 surrenders
  { hand:"14 vs 10",    base:"H",  dev:"SUR",  tc:"+3", threshold:3,  dir:"gte", priority:"★★",  note:"Surrender 14 vs 10 at TC ≥ +3 (if surrender allowed)." },
  { hand:"15 vs 9",     base:"H",  dev:"SUR",  tc:"+2", threshold:2,  dir:"gte", priority:"★★",  note:"Surrender 15 vs 9 at TC ≥ +2." },
  { hand:"15 vs A",     base:"H",  dev:"SUR",  tc:"+1", threshold:1,  dir:"gte", priority:"★★",  note:"Surrender 15 vs Ace at TC ≥ +1." },
  { hand:"16 vs 8",     base:"H",  dev:"SUR",  tc:"+4", threshold:4,  dir:"gte", priority:"★",   note:"Surrender 16 vs 8 at TC ≥ +4." },
];

const DEV_ACTION_STYLE = {
  S:   { color:"#4fffb0", label:"STAND" },
  H:   { color:"#2a9fd6", label:"HIT" },
  D:   { color:"#ffd700", label:"DOUBLE" },
  TAKE:{ color:"#c77dff", label:"TAKE INS" },
  SUR: { color:"#ff5577", label:"SURRENDER" },
};

// ─── QUIZ SCENARIOS ──────────────────────────────────────────
const ALL_STRAT_SCENARIOS = [
  ...HARD_TOTALS.map(r=>r.actions.map((a,i)=>({ type:"hard", hand:r.hand, dealer:DEALER_UPCARDS[i], correct:a }))).flat(),
  ...SOFT_TOTALS.map(r=>r.actions.map((a,i)=>({ type:"soft", hand:r.hand, dealer:DEALER_UPCARDS[i], correct:a }))).flat(),
  ...PAIRS.map(r=>r.actions.map((a,i)=>({ type:"pair", hand:r.hand, dealer:DEALER_UPCARDS[i], correct:a }))).flat(),
];

const MODES = ["Count","Strategy","Speed"];

// ─── COMPONENT ───────────────────────────────────────────────
export default function BlackjackTrainer() {
  const [mode, setMode] = useState("Count");
  const [stratTab, setStratTab] = useState("hard");    // hard|soft|pairs|deviations
  const [quizView, setQuizView] = useState("quiz");    // quiz|chart

  // ── shared stats
  const [streak, setStreak]         = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // ── Count mode
  const [cards, setCards]           = useState([]);
  const [runningCount, setRunningCount] = useState(0);
  const [userGuess, setUserGuess]   = useState("");
  const [feedback, setFeedback]     = useState(null);
  const [showHint, setShowHint]     = useState(false);
  const [countScore, setCountScore] = useState({ correct:0, total:0 });

  // ── Strategy quiz
  const [quizScenario, setQuizScenario] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [quizScore, setQuizScore]       = useState({ correct:0, total:0 });
  const [quizStreak, setQuizStreak]     = useState(0);

  // ── Deviation quiz
  const [devMode, setDevMode]       = useState(false);  // toggle inside deviations tab
  const [devScenario, setDevScenario] = useState(null);
  const [devInput, setDevInput]     = useState(null);
  const [devTCInput, setDevTCInput] = useState("");
  const [devFeedback, setDevFeedback] = useState(null);
  const [devScore, setDevScore]     = useState({ correct:0, total:0 });

  // ── Speed mode
  const [speedCards, setSpeedCards]   = useState([]);
  const [speedIndex, setSpeedIndex]   = useState(0);
  const [speedCount, setSpeedCount]   = useState(0);
  const [speedResult, setSpeedResult] = useState(null);
  const [speedInput, setSpeedInput]   = useState("");

  // ── COUNT LOGIC ──
  const dealCards = useCallback(() => {
    const count = Math.floor(Math.random()*4)+2;
    const newCards = Array.from({ length:count }, randomCard);
    const total = newCards.reduce((s,c)=>s+getCountValue(c.value),0);
    setCards(newCards); setRunningCount(total);
    setUserGuess(""); setFeedback(null); setShowHint(false);
  }, []);

  useEffect(() => { if (mode==="Count") dealCards(); }, [mode]);

  const submitCount = () => {
    if (userGuess==="") return;
    const correct = parseInt(userGuess)===runningCount;
    setFeedback({ correct, message: correct?"Correct! 🎯":`Wrong — count was ${runningCount>0?"+":""}${runningCount}` });
    setCountScore(s=>({ correct:s.correct+(correct?1:0), total:s.total+1 }));
    if (correct){ const ns=streak+1; setStreak(ns); if(ns>bestStreak) setBestStreak(ns); } else setStreak(0);
  };

  // ── SPEED LOGIC ──
  useEffect(() => {
    if (mode!=="Speed"||speedResult!==null||speedIndex>=speedCards.length) return;
    const t = setTimeout(()=>setSpeedIndex(i=>i+1), 750);
    return ()=>clearTimeout(t);
  }, [mode, speedIndex, speedCards, speedResult]);

  const startSpeed = () => {
    const nc = Array.from({ length:10 }, randomCard);
    const total = nc.reduce((s,c)=>s+getCountValue(c.value),0);
    setSpeedCards(nc); setSpeedCount(total);
    setSpeedIndex(0); setSpeedResult(null); setSpeedInput("");
  };

  const submitSpeed = () => {
    const correct = parseInt(speedInput)===speedCount;
    setSpeedResult({ correct, answer:speedCount });
    setCountScore(s=>({ correct:s.correct+(correct?1:0), total:s.total+1 }));
    if (correct){ const ns=streak+1; setStreak(ns); if(ns>bestStreak) setBestStreak(ns); } else setStreak(0);
  };

  useEffect(() => { if (mode==="Speed") startSpeed(); }, [mode]);

  // ── STRATEGY QUIZ LOGIC ──
  const newQuiz = useCallback(() => {
    const s = ALL_STRAT_SCENARIOS[Math.floor(Math.random()*ALL_STRAT_SCENARIOS.length)];
    setQuizScenario(s); setQuizFeedback(null);
  }, []);

  useEffect(() => { if (mode==="Strategy"){ newQuiz(); setQuizView("quiz"); } }, [mode]);

  const submitStrategy = (action) => {
    if (!quizScenario||quizFeedback) return;
    const correct = action===quizScenario.correct;
    setQuizFeedback({ correct, correct_action:quizScenario.correct });
    setQuizScore(s=>({ correct:s.correct+(correct?1:0), total:s.total+1 }));
    if (correct) setQuizStreak(s=>s+1); else setQuizStreak(0);
  };

  // ── DEVIATION QUIZ LOGIC ──
  const newDevQuiz = useCallback(() => {
    const d = DEVIATIONS[Math.floor(Math.random()*DEVIATIONS.length)];
    setDevScenario(d); setDevInput(null); setDevTCInput(""); setDevFeedback(null);
  }, []);

  useEffect(() => { if (devMode) newDevQuiz(); }, [devMode]);

  const submitDevQuiz = () => {
    if (!devScenario||devInput===null||devTCInput==="") return;
    const tcVal = parseInt(devTCInput);
    const correctTC = devScenario.dir==="gte" ? tcVal>=devScenario.threshold : tcVal<=devScenario.threshold;
    const correctAction = devInput===devScenario.dev;
    const correct = correctTC && correctAction;
    setDevFeedback({ correct, correctAction, correctTC,
      msg: correct ? "Perfect! 🎯" : `Action: ${correctAction?"✓":"✗"}  TC threshold: ${correctAction?"✓":"✗"}` });
    setDevScore(s=>({ correct:s.correct+(correct?1:0), total:s.total+1 }));
  };

  // ── CHART RENDERER ──
  const renderChart = (rows) => (
    <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch", width:"100%", maxWidth:700 }}>
      <table style={{ borderCollapse:"collapse", fontSize:13, minWidth:310, width:"100%" }}>
        <thead>
          <tr>
            <th style={{ padding:"5px 8px", color:"#778a80", textAlign:"left", fontWeight:700, fontSize:12, letterSpacing:"0.1em" }}>HAND</th>
            {DEALER_UPCARDS.map(d=>(
              <th key={d} style={{ padding:"5px 8px", color:"#aaa", fontWeight:900, fontSize:13, textAlign:"center" }}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row,ri)=>(
            <tr key={ri}>
              <td style={{ padding:"5px 8px", color:"#bbb", fontWeight:700, fontSize:12, whiteSpace:"nowrap", borderRight:"1px solid #151f17" }}>{row.hand}</td>
              {row.actions.map((a,ai)=>{
                const st = ACTION_STYLE[a]||ACTION_STYLE.H;
                return (
                  <td key={ai} style={{ padding:"5px 8px", textAlign:"center" }}>
                    <div style={{
                      background:st.bg, border:`1px solid ${st.border}44`, borderRadius:3,
                      padding:"2px 0", color:st.color, fontWeight:900, fontSize:13,
                      letterSpacing:"0.03em", minWidth:26,
                    }}>{st.label.slice(0,3)}</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const cAcc  = countScore.total>0 ? Math.round((countScore.correct/countScore.total)*100) : null;
  const qAcc  = quizScore.total>0  ? Math.round((quizScore.correct/quizScore.total)*100)  : null;
  const dAcc  = devScore.total>0   ? Math.round((devScore.correct/devScore.total)*100)    : null;

  return (
    <div style={{
      minHeight:"100vh", background:"#070c0a",
      fontFamily:"'Courier New', monospace", color:"#dde8e0",
      display:"flex", flexDirection:"column", alignItems:"center",
      padding:"8px 10px 48px",
      backgroundImage:"radial-gradient(ellipse at 10% 50%, #0b1c10 0%, transparent 55%), radial-gradient(ellipse at 90% 10%, #0c1a0e 0%, transparent 50%)",
    }}>

      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:8 }}>
        <div style={{ fontSize:"clamp(9px,1.2vw,14px)", letterSpacing:"0.5em", color:"#4fffb0", marginBottom:4 }}>HI-LO · BASIC STRATEGY · DEVIATIONS</div>
        <h1 style={{ fontSize:"clamp(22px,3.8vw,52px)", fontWeight:900, margin:0, letterSpacing:"-0.02em" }}>
          BLACKJACK <span style={{ color:"#4fffb0" }}>TRAINER</span>
        </h1>
      </div>

      {/* Mode tabs */}
      <div style={{ display:"flex", gap:5, marginBottom:12, background:"#0d1810", borderRadius:8, padding:3 }}>
        {MODES.map(m=>(
          <button key={m} onClick={()=>setMode(m)} style={{
            padding:"clamp(7px,1.2vh,12px) clamp(14px,2.5vw,26px)", borderRadius:6, border:"none", cursor:"pointer",
            background:mode===m?"#4fffb0":"transparent",
            color:mode===m?"#070c0a":"#778a80",
            fontFamily:"'Courier New', monospace", fontWeight:900, fontSize:"clamp(10px,1.4vw,15px)", letterSpacing:"0.1em",
            transition:"all 0.2s",
          }}>{m.toUpperCase()}</button>
        ))}
      </div>

      {/* ═══════════════ COUNT MODE ═══════════════ */}
      {mode==="Count" && (
        <div style={{ width:"100%", maxWidth:"min(720px,95vw)", minHeight:"calc(100vh - 200px)", display:"flex", flexDirection:"column", justifyContent:"center" }}>
          <div style={{ display:"flex", gap:14, marginBottom:16, marginTop:8, fontSize:"clamp(10px,1.4vw,16px)", justifyContent:"center" }}>
            <span style={{ color:"#778a80" }}>CORRECT: <span style={{ color:"#4fffb0" }}>{countScore.correct}/{countScore.total}</span></span>
            {cAcc!==null && <span style={{ color:"#778a80" }}>ACC: <span style={{ color:cAcc>=80?"#4fffb0":cAcc>=60?"#ffd700":"#ff5577" }}>{cAcc}%</span></span>}
            <span style={{ color:"#778a80" }}>STREAK: <span style={{ color:"#ffd700" }}>{streak}</span></span>
          </div>
          <div style={{ display:"flex", gap:5, marginBottom:18, justifyContent:"center" }}>
            {[{cards:"2–6",val:"+1",color:"#4fffb0"},{cards:"7–9",val:"0",color:"#777"},{cards:"10–A",val:"−1",color:"#ff5577"}].map(r=>(
              <div key={r.cards} style={{ background:"#0d1810", border:`1px solid ${r.color}22`, borderRadius:6, padding:"clamp(4px,1vh,10px) clamp(11px,2vw,22px)", textAlign:"center" }}>
                <div style={{ fontSize:"clamp(9px,1.1vw,13px)", color:"#778a80", marginBottom:1 }}>{r.cards}</div>
                <div style={{ fontSize:"clamp(14px,2vw,22px)", fontWeight:900, color:r.color }}>{r.val}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:9, justifyContent:"center", marginBottom:20 }}>
            {cards.map((card,i)=>(
              <div key={card.id} style={{
                background:"#101c13", border:"1px solid #1a2e1e", borderRadius:10,
                width:"clamp(60px,8vw,100px)", height:"clamp(82px,11vw,138px)", display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center", position:"relative",
                animation:`slideIn 0.22s ease ${i*0.07}s both`,
              }}>
                <div style={{ fontSize:"clamp(18px,2.5vw,32px)", fontWeight:900, color:isRed(card.suit)?"#ff7070":"#dde8e0" }}>{card.value}</div>
                <div style={{ fontSize:"clamp(16px,2.2vw,28px)", color:isRed(card.suit)?"#ff7070":"#dde8e0" }}>{card.suit}</div>
                {showHint && <div style={{ position:"absolute", bottom:3, right:4, fontSize:11, fontWeight:900, color:getCountLabel(card.value).color }}>{getCountLabel(card.value).label}</div>}
              </div>
            ))}
          </div>
          {!feedback ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
              <div style={{ fontSize:"clamp(11px,1.4vw,16px)", color:"#778a80" }}>What is the running count?</div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap", justifyContent:"center" }}>
                {[-4,-3,-2,-1,0,1,2,3,4,5].map(n=>(
                  <button key={n} onClick={()=>setUserGuess(String(n))} style={{
                    width:"clamp(34px,4.5vw,56px)", height:"clamp(34px,4.5vw,56px)", borderRadius:5, border:"none", cursor:"pointer",
                    background:userGuess===String(n)?"#4fffb0":"#0d1810",
                    color:userGuess===String(n)?"#070c0a":"#555",
                    fontWeight:900, fontSize:"clamp(12px,1.6vw,18px)", fontFamily:"'Courier New', monospace", transition:"all 0.15s",
                  }}>{n>0?`+${n}`:n}</button>
                ))}
              </div>
              <div style={{ display:"flex", gap:7 }}>
                <button onClick={submitCount} disabled={userGuess===""} style={{
                  padding:"clamp(8px,1.2vh,14px) clamp(22px,3vw,38px)", background:userGuess!==""?"#4fffb0":"#0d1810",
                  color:userGuess!==""?"#070c0a":"#2a3a2e", border:"none", borderRadius:7,
                  cursor:userGuess!==""?"pointer":"default",
                  fontFamily:"'Courier New', monospace", fontWeight:900, fontSize:"clamp(11px,1.4vw,16px)", transition:"all 0.2s",
                }}>SUBMIT</button>
                <button onClick={()=>setShowHint(!showHint)} style={{
                  padding:"clamp(8px,1.2vh,14px) clamp(13px,2vw,22px)", background:"#0d1810",
                  color:showHint?"#ffd700":"#333",
                  border:`1px solid ${showHint?"#ffd70033":"#1a2a1e"}`,
                  borderRadius:7, cursor:"pointer", fontFamily:"'Courier New', monospace", fontSize:"clamp(10px,1.3vw,14px)",
                }}>HINT</button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign:"center" }}>
              <div style={{
                padding:"11px 22px", borderRadius:9, marginBottom:12,
                background:feedback.correct?"#4fffb018":"#ff557718",
                border:`1px solid ${feedback.correct?"#4fffb044":"#ff557744"}`,
                color:feedback.correct?"#4fffb0":"#ff5577", fontWeight:700, fontSize:16,
              }}>{feedback.message}</div>
              {!feedback.correct && (
                <div style={{ fontSize:13, color:"#778a80", marginBottom:9 }}>
                  {cards.map((c,i)=>(
                    <span key={i} style={{ marginRight:7 }}>
                      {c.value}{c.suit}<span style={{ color:getCountLabel(c.value).color }}>({getCountLabel(c.value).label})</span>
                    </span>
                  ))}
                </div>
              )}
              <button onClick={dealCards} style={{
                padding:"10px 28px", background:"#4fffb0", color:"#070c0a",
                border:"none", borderRadius:7, cursor:"pointer",
                fontFamily:"'Courier New', monospace", fontWeight:900, fontSize:14,
              }}>NEXT →</button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ STRATEGY MODE ═══════════════ */}
      {mode==="Strategy" && (
        <div style={{ width:"100%", maxWidth:"min(960px,95vw)", minHeight:"calc(100vh - 200px)", display:"flex", flexDirection:"column", justifyContent:"center" }}>
          {/* Quiz / Chart toggle */}
          <div style={{ display:"flex", gap:5, marginBottom:12, marginTop:8, justifyContent:"center" }}>
            {["quiz","chart"].map(v=>(
              <button key={v} onClick={()=>setQuizView(v)} style={{
                padding:"8px 20px", borderRadius:6, border:"none", cursor:"pointer",
                background:quizView===v?"#ffd700":"#0d1810",
                color:quizView===v?"#070c0a":"#778a80",
                fontFamily:"'Courier New', monospace", fontWeight:900, fontSize:13, letterSpacing:"0.1em",
                transition:"all 0.2s",
              }}>{v==="quiz"?"QUIZ":"CHART"}</button>
            ))}
          </div>

          {/* ── Strategy Quiz ── */}
          {quizView==="quiz" && quizScenario && (
            <div style={{ textAlign:"center", paddingBottom:40 }}>
              <div style={{ display:"flex", gap:14, marginBottom:14, fontSize:14, justifyContent:"center" }}>
                <span style={{ color:"#778a80" }}>CORRECT: <span style={{ color:"#4fffb0" }}>{quizScore.correct}/{quizScore.total}</span></span>
                {qAcc!==null && <span style={{ color:"#778a80" }}>ACC: <span style={{ color:qAcc>=80?"#4fffb0":qAcc>=60?"#ffd700":"#ff5577" }}>{qAcc}%</span></span>}
                <span style={{ color:"#778a80" }}>STREAK: <span style={{ color:"#ffd700" }}>{quizStreak}</span></span>
              </div>
              <div style={{ background:"#0d1810", border:"1px solid #1a2a1e", borderRadius:12, padding:"18px 20px", marginBottom:18 }}>
                <div style={{ fontSize:"clamp(9px,1.1vw,13px)", color:"#778a80", letterSpacing:"0.2em", marginBottom:7 }}>
                  {quizScenario.type==="hard"?"HARD TOTAL":quizScenario.type==="soft"?"SOFT HAND":"PAIR"}
                </div>
                <div style={{ fontSize:"clamp(26px,3.8vw,46px)", fontWeight:900, marginBottom:10 }}>{quizScenario.hand}</div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <span style={{ fontSize:"clamp(11px,1.4vw,17px)", color:"#778a80" }}>vs dealer</span>
                  <div style={{ background:"#121f16", border:"1px solid #2a3a2e", borderRadius:7, padding:"clamp(5px,1vh,10px) clamp(13px,2vw,24px)", fontSize:"clamp(18px,2.5vw,30px)", fontWeight:900, color:"#ffd700" }}>{quizScenario.dealer}</div>
                </div>
              </div>
              {!quizFeedback ? (
                <div>
                  <div style={{ fontSize:14, color:"#778a80", marginBottom:10 }}>What's the correct play?</div>
                  <div style={{ display:"flex", gap:7, justifyContent:"center", flexWrap:"wrap" }}>
                    {["H","S","D","P"].map(action=>{
                      const st=ACTION_STYLE[action];
                      return (
                        <button key={action} onClick={()=>submitStrategy(action)} style={{
                          padding:"clamp(11px,1.5vh,18px) clamp(18px,2.5vw,32px)", borderRadius:7,
                          background:st.bg, border:`1px solid ${st.border}88`,
                          color:st.color, cursor:"pointer",
                          fontFamily:"'Courier New', monospace", fontWeight:900, fontSize:"clamp(12px,1.6vw,19px)",
                          letterSpacing:"0.1em", minWidth:"clamp(76px,9vw,120px)", transition:"all 0.15s",
                        }}>{st.label}</button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{
                    padding:"11px 22px", borderRadius:9, marginBottom:12,
                    background:quizFeedback.correct?"#4fffb018":"#ff557718",
                    border:`1px solid ${quizFeedback.correct?"#4fffb044":"#ff557744"}`,
                    color:quizFeedback.correct?"#4fffb0":"#ff5577", fontWeight:700, fontSize:16,
                  }}>
                    {quizFeedback.correct?"Correct! 🎯":`Wrong — correct play: ${ACTION_STYLE[quizFeedback.correct_action]?.label}`}
                  </div>
                  <button onClick={newQuiz} style={{
                    padding:"10px 28px", background:"#4fffb0", color:"#070c0a",
                    border:"none", borderRadius:7, cursor:"pointer",
                    fontFamily:"'Courier New', monospace", fontWeight:900, fontSize:14,
                  }}>NEXT HAND →</button>
                </div>
              )}
            </div>
          )}

          {/* ── Chart View ── */}
          {quizView==="chart" && (
            <div>
              {/* Legend */}
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"center", marginBottom:14 }}>
                {Object.entries(ACTION_STYLE).map(([k,v])=>(
                  <div key={k} style={{ display:"flex", alignItems:"center", gap:6, background:v.bg, border:`1px solid ${v.border}44`, borderRadius:4, padding:"5px 12px" }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:v.border }} />
                    <span style={{ fontSize:12, color:v.color, fontWeight:700 }}>{v.label}</span>
                  </div>
                ))}
              </div>

              {/* Chart sub-tabs */}
              <div style={{ display:"flex", gap:4, marginBottom:12, justifyContent:"center", flexWrap:"wrap" }}>
                {[{key:"hard",label:"HARD"},{key:"soft",label:"SOFT"},{key:"pairs",label:"PAIRS"},{key:"deviations",label:"DEVIATIONS ★"}].map(t=>(
                  <button key={t.key} onClick={()=>setStratTab(t.key)} style={{
                    padding:"7px 16px", borderRadius:5, border:"none", cursor:"pointer",
                    background:stratTab===t.key ? (t.key==="deviations"?"#ff5577":"#4fffb0") : "#0d1810",
                    color:stratTab===t.key?"#070c0a":"#778a80",
                    fontFamily:"'Courier New', monospace", fontWeight:900, fontSize:12, letterSpacing:"0.05em",
                    transition:"all 0.2s",
                  }}>{t.label}</button>
                ))}
              </div>

              {/* Regular charts */}
              {stratTab!=="deviations" && (
                <div style={{ background:"#090e0b", border:"1px solid #141e16", borderRadius:10, padding:12 }}>
                  <div style={{ fontSize:12, color:"#778a80", marginBottom:8, textAlign:"center", letterSpacing:"0.2em" }}>DEALER UPCARD →</div>
                  {stratTab==="hard"  && renderChart(HARD_TOTALS)}
                  {stratTab==="soft"  && renderChart(SOFT_TOTALS)}
                  {stratTab==="pairs" && renderChart(PAIRS)}
                  <div style={{ fontSize:12, color:"#778a80", textAlign:"center", marginTop:8 }}>6-deck · Dealer stands soft 17 · DAS allowed</div>
                </div>
              )}

              {/* ── DEVIATIONS CHART ── */}
              {stratTab==="deviations" && (
                <div>
                  {/* Deviation quiz toggle */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, gap:10 }}>
                    <div style={{ fontSize:10, color:"#778a80" }}>
                      Illustrious 18 + Fab 4 surrender deviations
                    </div>
                    <button onClick={()=>{ setDevMode(d=>!d); if(!devMode) newDevQuiz(); }} style={{
                      padding:"8px 20px", borderRadius:5, border:`1px solid ${devMode?"#ff5577":"#4fffb044"}`, cursor:"pointer",
                      background:"#ff5577",
                      color:"#fff",
                      fontFamily:"'Courier New', monospace", fontWeight:900, fontSize:11,
                    }}>{devMode?"EXIT QUIZ":"QUIZ MODE"}</button>
                  </div>

                  {/* Deviation Quiz */}
                  {devMode && devScenario && (
                    <div style={{ background:"#0d1810", border:"1px solid #ff557733", borderRadius:12, padding:"16px", marginBottom:16, textAlign:"center" }}>
                      <div style={{ fontSize:9, color:"#ff557788", letterSpacing:"0.2em", marginBottom:6 }}>DEVIATION QUIZ</div>
                      <div style={{ display:"flex", gap:12, marginBottom:12, fontSize:10, justifyContent:"center" }}>
                        <span style={{ color:"#778a80" }}>CORRECT: <span style={{ color:"#4fffb0" }}>{devScore.correct}/{devScore.total}</span></span>
                        {dAcc!==null && <span style={{ color:"#778a80" }}>ACC: <span style={{ color:dAcc>=80?"#4fffb0":dAcc>=60?"#ffd700":"#ff5577" }}>{dAcc}%</span></span>}
                      </div>

                      {!devFeedback ? (
                        <>
                          <div style={{ fontSize:20, fontWeight:900, marginBottom:4 }}>{devScenario.hand}</div>
                          <div style={{ fontSize:10, color:"#555", marginBottom:14 }}>Basic strategy: <span style={{ color:"#888" }}>{DEV_ACTION_STYLE[devScenario.base]?.label || devScenario.base}</span></div>

                          <div style={{ fontSize:10, color:"#555", marginBottom:8 }}>At what true count do you deviate?</div>
                          <div style={{ display:"flex", gap:5, flexWrap:"wrap", justifyContent:"center", marginBottom:14 }}>
                            {[-2,-1,0,1,2,3,4,5].map(n=>(
                              <button key={n} onClick={()=>setDevTCInput(String(n))} style={{
                                width:34, height:34, borderRadius:5, border:"none", cursor:"pointer",
                                background:devTCInput===String(n)?"#ff5577":"#0a130c",
                                color:devTCInput===String(n)?"#070c0a":"#555",
                                fontWeight:900, fontSize:11, fontFamily:"'Courier New', monospace",
                              }}>{n>0?`+${n}`:n}</button>
                            ))}
                          </div>

                          <div style={{ fontSize:10, color:"#555", marginBottom:8 }}>What do you do instead?</div>
                          <div style={{ display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap", marginBottom:14 }}>
                            {["H","S","D","SUR","TAKE"].map(a=>{
                              const st=DEV_ACTION_STYLE[a];
                              return (
                                <button key={a} onClick={()=>setDevInput(a)} style={{
                                  padding:"8px 12px", borderRadius:6, border:"none", cursor:"pointer",
                                  background:devInput===a?`${st.color}33`:"#0a130c",
                                  color:devInput===a?st.color:"#778a80",
                                  border:`1px solid ${devInput===a?st.color+"66":"#141e16"}`,
                                  fontFamily:"'Courier New', monospace", fontWeight:900, fontSize:10,
                                }}>{st.label}</button>
                              );
                            })}
                          </div>

                          <button onClick={submitDevQuiz} disabled={devInput===null||devTCInput===""} style={{
                            padding:"8px 22px", background:devInput!==null&&devTCInput!==""?"#ff5577":"#0d1810",
                            color:devInput!==null&&devTCInput!==""?"#070c0a":"#2a3a2e",
                            border:"none", borderRadius:7, cursor:devInput!==null&&devTCInput!==""?"pointer":"default",
                            fontFamily:"'Courier New', monospace", fontWeight:900, fontSize:11,
                          }}>CHECK</button>
                        </>
                      ) : (
                        <div>
                          <div style={{
                            padding:"10px", borderRadius:8, marginBottom:10,
                            background:devFeedback.correct?"#4fffb018":"#ff557718",
                            border:`1px solid ${devFeedback.correct?"#4fffb044":"#ff557744"}`,
                            color:devFeedback.correct?"#4fffb0":"#ff5577", fontWeight:700, fontSize:13,
                          }}>{devFeedback.correct?"Correct! 🎯":"Not quite"}</div>
                          {!devFeedback.correct && (
                            <div style={{ fontSize:10, color:"#888", marginBottom:10, lineHeight:1.7 }}>
                              <div>Action: <span style={{ color: devFeedback.correctAction?"#4fffb0":"#ff5577" }}>{DEV_ACTION_STYLE[devScenario.dev]?.label}</span></div>
                              <div>TC threshold: <span style={{ color:"#ffd700" }}>{devScenario.dir==="gte"?"≥":""}{devScenario.dir==="lte"?"≤":""}{devScenario.threshold}</span></div>
                            </div>
                          )}
                          <button onClick={newDevQuiz} style={{
                            padding:"7px 20px", background:"#ff5577", color:"#070c0a",
                            border:"none", borderRadius:7, cursor:"pointer",
                            fontFamily:"'Courier New', monospace", fontWeight:900, fontSize:10,
                          }}>NEXT →</button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Deviation table */}
                  <div style={{ background:"#090e0b", border:"1px solid #141e16", borderRadius:10, overflow:"hidden" }}>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ borderCollapse:"collapse", width:"100%", fontSize:13 }}>
                        <thead>
                          <tr style={{ background:"#0d1810" }}>
                            <th style={{ padding:"5px 8px", color:"#778a80", textAlign:"left", fontSize:12, letterSpacing:"0.1em", fontWeight:900 }}>HAND</th>
                            <th style={{ padding:"5px 8px", color:"#778a80", textAlign:"center", fontSize:12, letterSpacing:"0.05em", fontWeight:900 }}>BASE</th>
                            <th style={{ padding:"5px 8px", color:"#778a80", textAlign:"center", fontSize:12, letterSpacing:"0.05em", fontWeight:900 }}>TC</th>
                            <th style={{ padding:"5px 8px", color:"#778a80", textAlign:"center", fontSize:12, letterSpacing:"0.05em", fontWeight:900 }}>DEVIATE</th>
                            <th style={{ padding:"5px 8px", color:"#778a80", textAlign:"center", fontSize:12, letterSpacing:"0.05em", fontWeight:900 }}>★</th>
                          </tr>
                        </thead>
                        <tbody>
                          {DEVIATIONS.map((d,i)=>{
                            const devSt = DEV_ACTION_STYLE[d.dev]||DEV_ACTION_STYLE.H;
                            const dirSymbol = d.dir==="gte"?"≥":"≤";
                            return (
                              <tr key={i} style={{ borderTop:"1px solid #0f1810", background:i%2===0?"#090e0b":"#0b1209" }}>
                                <td style={{ padding:"5px 8px", fontWeight:900, fontSize:12, color:"#cce0d0", whiteSpace:"nowrap" }}>{d.hand}</td>
                                <td style={{ padding:"5px 8px", textAlign:"center", fontSize:13, color:"#555" }}>
                                  {d.base!=="—" ? (ACTION_STYLE[d.base]?.label||d.base) : "—"}
                                </td>
                                <td style={{ padding:"5px 8px", textAlign:"center", fontWeight:900, fontSize:13 }}>
                                  <span style={{ color: d.dir==="gte"?"#4fffb0":"#ff5577" }}>
                                    {dirSymbol}{d.tc}
                                  </span>
                                </td>
                                <td style={{ padding:"5px 8px", textAlign:"center" }}>
                                  <span style={{ color:devSt.color, fontWeight:900, fontSize:13 }}>{devSt.label}</span>
                                </td>
                                <td style={{ padding:"5px 8px", textAlign:"center", fontSize:13, color:"#ffd700" }}>{d.priority}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ padding:"8px 10px", fontSize:8.5, color:"#778a80", borderTop:"1px solid #0f1810" }}>
                      ★★★ = highest value · ★★ = high value · ★ = moderate value · SUR = surrender if allowed
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ SPEED MODE ═══════════════ */}
      {mode==="Speed" && (
        <div style={{ width:"100%", maxWidth:"min(640px,95vw)", textAlign:"center", minHeight:"calc(100vh - 200px)", display:"flex", flexDirection:"column", justifyContent:"flex-start", paddingTop:24 }}>
          <div style={{ display:"flex", gap:14, marginBottom:14, fontSize:14, justifyContent:"center" }}>
            <span style={{ color:"#778a80" }}>CORRECT: <span style={{ color:"#4fffb0" }}>{countScore.correct}/{countScore.total}</span></span>
            <span style={{ color:"#778a80" }}>STREAK: <span style={{ color:"#ffd700" }}>{streak}</span></span>
            <span style={{ color:"#778a80" }}>BEST: <span style={{ color:"#ffd700" }}>{bestStreak}</span></span>
          </div>
          <div style={{ fontSize:13, color:"#778a80", marginBottom:14 }}>10 cards auto-flip. Track the count. Submit at the end.</div>
          <div style={{ height:220, display:"flex", alignItems:"center", justifyContent:"center", marginTop:8, marginBottom:14, position:"relative" }}>
            {speedCards.length>0 && speedIndex<speedCards.length && speedResult===null ? (
              <div key={speedIndex} style={{
                background:"#101c13", border:"1px solid #1a2e1e", borderRadius:11,
                width:130, height:180, display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center",
                animation:"flipIn 0.22s ease",
              }}>
                <div style={{ fontSize:52, fontWeight:900, color:isRed(speedCards[speedIndex].suit)?"#ff7070":"#dde8e0" }}>{speedCards[speedIndex].value}</div>
                <div style={{ fontSize:44, color:isRed(speedCards[speedIndex].suit)?"#ff7070":"#dde8e0" }}>{speedCards[speedIndex].suit}</div>
              </div>
            ) : speedIndex>=speedCards.length && speedResult===null ? (
              <div style={{ color:"#4fffb0", fontWeight:900, fontSize:18 }}>ENTER YOUR COUNT ↓</div>
            ) : null}
            <div style={{ position:"absolute", bottom:0, right:0, fontSize:9, color:"#1a2a1e" }}>
              {speedIndex<speedCards.length?`${speedIndex+1}/10`:"10/10"}
            </div>
          </div>
          <div style={{ display:"flex", gap:4, justifyContent:"center", marginBottom:18 }}>
            {speedCards.map((_,i)=>(
              <div key={i} style={{
                width:6, height:6, borderRadius:"50%",
                background:i<speedIndex?"#4fffb0":i===speedIndex?"#ffd700":"#141e16",
                transition:"background 0.3s",
              }} />
            ))}
          </div>
          {speedIndex>=speedCards.length && speedResult===null && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
              <div style={{ display:"flex", gap:4, flexWrap:"wrap", justifyContent:"center" }}>
                {[-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7].map(n=>(
                  <button key={n} onClick={()=>setSpeedInput(String(n))} style={{
                    width:38, height:38, borderRadius:5, border:"none", cursor:"pointer",
                    background:speedInput===String(n)?"#4fffb0":"#0d1810",
                    color:speedInput===String(n)?"#070c0a":"#555",
                    fontWeight:900, fontSize:"clamp(10px,1.3vw,15px)", fontFamily:"'Courier New', monospace",
                  }}>{n>0?`+${n}`:n}</button>
                ))}
              </div>
              <button onClick={submitSpeed} disabled={speedInput===""} style={{
                padding:"8px 22px", background:speedInput!==""?"#4fffb0":"#0d1810",
                color:speedInput!==""?"#070c0a":"#2a3a2e",
                border:"none", borderRadius:7, cursor:speedInput!==""?"pointer":"default",
                fontFamily:"'Courier New', monospace", fontWeight:900, fontSize:11,
              }}>SUBMIT</button>
            </div>
          )}
          {speedResult && (
            <div>
              <div style={{
                padding:"11px", borderRadius:9, marginBottom:12,
                background:speedResult.correct?"#4fffb018":"#ff557718",
                border:`1px solid ${speedResult.correct?"#4fffb044":"#ff557744"}`,
                color:speedResult.correct?"#4fffb0":"#ff5577", fontWeight:700,
              }}>
                {speedResult.correct?"Perfect! 🎯":`Count was ${speedResult.answer>0?"+":""}${speedResult.answer}`}
              </div>
              {!speedResult.correct && (
                <div style={{ fontSize:9, color:"#778a80", marginBottom:9, lineHeight:1.9 }}>
                  {speedCards.map((c,i)=>(
                    <span key={i} style={{ marginRight:5 }}>
                      {c.value}{c.suit}<span style={{ color:getCountLabel(c.value).color }}>({getCountLabel(c.value).label})</span>
                    </span>
                  ))}
                </div>
              )}
              <button onClick={startSpeed} style={{
                padding:"10px 28px", background:"#4fffb0", color:"#070c0a",
                border:"none", borderRadius:7, cursor:"pointer",
                fontFamily:"'Courier New', monospace", fontWeight:900, fontSize:14,
              }}>TRY AGAIN →</button>
            </div>
          )}
          {speedCards.length===0 && (
            <button onClick={startSpeed} style={{
              padding:"10px 28px", background:"#4fffb0", color:"#070c0a",
              border:"none", borderRadius:7, cursor:"pointer",
              fontFamily:"'Courier New', monospace", fontWeight:900, fontSize:12,
            }}>START →</button>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateY(-7px); } to { opacity:1; transform:translateY(0); } }
        @keyframes flipIn  { from { opacity:0; transform:scaleX(0.15); }  to { opacity:1; transform:scaleX(1); } }
      `}</style>
    </div>
  );
}
