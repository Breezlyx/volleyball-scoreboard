"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Timer } from "lucide-react";

const COLOR_MAP: Record<string, { bg: string, border: string, hex: string }> = {
  cyan: { bg: "bg-cyan-500", border: "border-cyan-500", hex: "#06b6d4" },
  rose: { bg: "bg-rose-500", border: "border-rose-500", hex: "#f43f5e" },
  blue: { bg: "bg-blue-500", border: "border-blue-500", hex: "#3b82f6" },
  emerald: { bg: "bg-emerald-500", border: "border-emerald-500", hex: "#10b981" },
  amber: { bg: "bg-amber-500", border: "border-amber-500", hex: "#f59e0b" },
  violet: { bg: "bg-violet-500", border: "border-violet-500", hex: "#8b5cf6" },
  lime: { bg: "bg-lime-500", border: "border-lime-500", hex: "#84cc16" },
  teal: { bg: "bg-teal-500", border: "border-teal-500", hex: "#14b8a6" },
  sky: { bg: "bg-sky-500", border: "border-sky-500", hex: "#0ea5e9" },
  fuchsia: { bg: "bg-fuchsia-500", border: "border-fuchsia-500", hex: "#d946ef" },
  orange: { bg: "bg-orange-500", border: "border-orange-500", hex: "#f97316" },
  crimson: { bg: "bg-red-600", border: "border-red-600", hex: "#dc2626" }
};

interface TeamProps { 
  code: string; score: number; setsWon: number; totalSets: number; 
  timeoutsUsed: number; colorTheme: string; side: "left" | "right";
  hasServe: boolean; pointAlert: string | null;
}

function TeamPanel({ code, score, setsWon, totalSets, timeoutsUsed, colorTheme, side, hasServe, pointAlert }: TeamProps) {
  const isLeft = side === "left";
  const theme = COLOR_MAP[colorTheme] || COLOR_MAP["cyan"];
  return (
    <div className={cn("flex flex-col items-center", isLeft ? "items-start" : "items-end")}>
      
      {/* ALERTA DE SET/MATCH POINT (Arriba) */}
      <div className="h-10 mb-2 flex items-end">
        <AnimatePresence>
          {pointAlert && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="px-6 py-1 bg-rose-600 text-white font-black tracking-[0.3em] uppercase text-sm shadow-[0_0_20px_rgba(225,29,72,0.8)] animate-pulse"
              style={{ clipPath: isLeft ? "polygon(10% 0, 100% 0, 90% 100%, 0% 100%)" : "polygon(0 0, 90% 0, 100% 100%, 10% 100%)" }}
            >
              🔥 {pointAlert}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative mb-4">
        <div className={cn("absolute inset-0 z-10", theme.bg)} style={{ clipPath: isLeft ? "polygon(0 0, 100% 0, 95% 100%, 0% 100%)" : "polygon(5% 0, 100% 0, 100% 100%, 0% 100%)" }} />
        <div className="px-12 py-4 text-6xl font-black tracking-wider text-slate-950 relative z-20 font-sans uppercase" style={{ fontStretch: "condensed" }}>{code}</div>
      </div>

      <div className="relative h-[220px] overflow-hidden"> 
        <AnimatePresence mode="wait">
          <motion.div key={score} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} transition={{ duration: 0.4, ease: "backOut" }} className="text-[220px] font-black leading-none text-slate-900 drop-shadow-sm" style={{ fontStretch: "ultra-condensed", fontFamily: "system-ui" }}>
            {score.toString().padStart(2, "0")}
          </motion.div>
        </AnimatePresence>
      </div>
      
      <div className={cn("mt-6 flex flex-col gap-3", isLeft ? "items-start" : "items-end")}>
        {/* Sets */}
        <div className={cn("flex gap-3", isLeft ? "flex-row" : "flex-row-reverse")}>
          {Array.from({ length: totalSets }).map((_, i) => (
            <motion.div key={i} initial={false} animate={{ backgroundColor: i < setsWon ? theme.hex : "transparent", scale: i < setsWon ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.5 }} className={cn("h-6 w-12 border-2", theme.border)} style={{ clipPath: isLeft ? "polygon(0 0, 100% 0, 90% 100%, 0% 100%)" : "polygon(10% 0, 100% 0, 100% 100%, 0% 100%)" }} />
          ))}
        </div>
        
        {/* Tiempos Muertos */}
        <div className={cn("flex gap-2", isLeft ? "flex-row" : "flex-row-reverse")}>
          <div className={cn("h-2 w-10 transition-colors duration-500", timeoutsUsed > 0 ? "bg-slate-300" : theme.bg)} style={{ clipPath: isLeft ? "polygon(0 0, 100% 0, 90% 100%, 0% 100%)" : "polygon(10% 0, 100% 0, 100% 100%, 0% 100%)" }} />
          <div className={cn("h-2 w-10 transition-colors duration-500", timeoutsUsed > 1 ? "bg-slate-300" : theme.bg)} style={{ clipPath: isLeft ? "polygon(0 0, 100% 0, 90% 100%, 0% 100%)" : "polygon(10% 0, 100% 0, 100% 100%, 0% 100%)" }} />
        </div>

        {/* INDICADOR DE SAQUE RESTAURADO (Debajo de los tiempos muertos) */}
        <div className="h-12 mt-2">
          <AnimatePresence>
            {hasServe && (
              <motion.div
                initial={{ opacity: 0, x: isLeft ? -30 : 30, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: isLeft ? -30 : 30, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={cn(
                  "flex items-center gap-3 px-6 py-2 shadow-lg",
                  theme.bg,
                  isLeft ? "flex-row" : "flex-row-reverse"
                )}
                style={{
                  clipPath: isLeft ? "polygon(0 0, 100% 0, 92% 100%, 0% 100%)" : "polygon(8% 0, 100% 0, 100% 100%, 0% 100%)"
                }}
              >
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }} 
                  transition={{ repeat: Infinity, duration: 1.5 }} 
                  className="w-3 h-3 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,1)]" 
                />
                <span className="text-white font-black tracking-widest uppercase text-sm">Saque</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function DisplayPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const [match, setMatch] = useState<any>(null);
  const [controllerUrl, setControllerUrl] = useState("");
  const [timeLeft, setTimeLeft] = useState(0); 

  useEffect(() => {
    const safeMatchId = matchId.toUpperCase();
    if (typeof window !== "undefined") setControllerUrl(`${window.location.origin}/controller/${safeMatchId}`);
    
    let isMounted = true;
    let retryCount = 0;

    const fetchMatch = async () => {
      const { data } = await supabase.from("matches").select("*").eq("join_code", safeMatchId).single();
      if (data && isMounted) setMatch(data);
      else if (isMounted && retryCount < 10) { retryCount++; setTimeout(fetchMatch, 500); }
    };

    fetchMatch();
    const channel = supabase.channel(`match_${safeMatchId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches", filter: `join_code=eq.${safeMatchId}` }, 
      (payload) => { if (isMounted) setMatch(payload.new); })
      .subscribe();
      
    return () => { isMounted = false; supabase.removeChannel(channel); };
  }, [matchId]);

  useEffect(() => {
    if (match?.timeout_ends_at) {
      const interval = setInterval(() => {
        const rem = Math.max(0, Math.ceil((match.timeout_ends_at - Date.now()) / 1000));
        setTimeLeft(rem);
      }, 100);
      return () => clearInterval(interval);
    } else { setTimeLeft(0); }
  }, [match?.timeout_ends_at]);

  useEffect(() => {
    if (!match || !match.controller_id || !match.last_heartbeat) return;
    const safeMatchId = matchId.toUpperCase();
    const watchdogInterval = setInterval(async () => {
      const now = Date.now();
      if (now - match.last_heartbeat > 30000) {
        await supabase.from("matches").update({ controller_id: null, last_heartbeat: null }).eq("join_code", safeMatchId);
      }
    }, 5000);
    return () => clearInterval(watchdogInterval);
  }, [match, matchId]);

  if (!match) return <div className="min-h-screen bg-white flex items-center justify-center text-4xl font-bold tracking-tighter text-slate-900 font-sans">INICIALIZANDO MARCADOR VNL...</div>;

  const currentSet = match.sets_a + match.sets_b + 1;
  const totalSets = 3; 
  const themeA = COLOR_MAP[match.team_a_color] || COLOR_MAP["cyan"];
  const themeB = COLOR_MAP[match.team_b_color] || COLOR_MAP["rose"];
  const isMatchComplete = match.sets_a >= totalSets || match.sets_b >= totalSets;
  const isConnected = Boolean(match.controller_id);

  // LÓGICA DE ALERTA DE PUNTOS
  const targetPoints = (currentSet === 5) ? 15 : 25;
  const hasSetPointA = match.score_a >= targetPoints - 1 && match.score_a - match.score_b >= 1;
  const hasSetPointB = match.score_b >= targetPoints - 1 && match.score_b - match.score_a >= 1;
  const alertA = hasSetPointA && match.sets_a === totalSets - 1 ? "Match Point" : hasSetPointA ? "Set Point" : null;
  const alertB = hasSetPointB && match.sets_b === totalSets - 1 ? "Match Point" : hasSetPointB ? "Set Point" : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="flex h-screen w-full flex-col bg-gradient-to-b from-white to-slate-50 font-sans select-none overflow-hidden relative">
      
      {/* OVERLAYS (RESUMEN Y TIEMPO MUERTO) */}
      <AnimatePresence>
        {isMatchComplete && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl p-8">
            <h2 className="text-4xl font-black text-slate-400 mb-8 uppercase tracking-[0.4em]">Resultado Final</h2>
            <div className="flex items-center gap-12 mb-16">
              <span className="text-8xl font-black uppercase" style={{ color: themeA.hex, fontStretch: "condensed" }}>{match.team_a_name || "LOC"}</span>
              <span className="text-[10rem] font-black text-white leading-none tracking-tighter" style={{ fontStretch: "ultra-condensed" }}>{match.sets_a} - {match.sets_b}</span>
              <span className="text-8xl font-black uppercase" style={{ color: themeB.hex, fontStretch: "condensed" }}>{match.team_b_name || "VIS"}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-12 w-full max-w-4xl" style={{ clipPath: "polygon(5% 0, 100% 0, 95% 100%, 0% 100%)" }}>
              <h3 className="text-center text-slate-500 font-bold tracking-[0.3em] uppercase mb-8">Historial de Puntos</h3>
              <div className="flex flex-col gap-6">
                {match.set_history && match.set_history.length > 0 ? (
                  match.set_history.map((set: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-4xl font-black border-b border-slate-800/50 pb-4">
                      <span className="text-slate-600 w-32 tracking-wider">S{idx + 1}</span>
                      <span style={{ color: set.scoreA > set.scoreB ? themeA.hex : 'white' }}>{set.scoreA}</span>
                      <span className="text-slate-700">-</span>
                      <span style={{ color: set.scoreB > set.scoreA ? themeB.hex : 'white' }}>{set.scoreB}</span>
                      <span className="w-32"></span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-500 italic">No hay historial disponible</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {match.timeout_active_team && timeLeft > 0 && !isMatchComplete && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md">
            <div className="flex flex-col items-center text-center">
              <Timer className="w-32 h-32 text-slate-400 mb-8 animate-pulse" />
              <h2 className="text-6xl font-black text-white uppercase tracking-[0.2em] mb-6">Tiempo Muerto</h2>
              <div className={cn("px-16 py-4 mb-12", match.timeout_active_team === 'a' ? themeA.bg : themeB.bg)} style={{ clipPath: "polygon(5% 0, 100% 0, 95% 100%, 0% 100%)" }}>
                <span className="text-5xl font-black text-white uppercase tracking-widest">{match.timeout_active_team === 'a' ? (match.team_a_name || "LOC") : (match.team_b_name || "VIS")}</span>
              </div>
              <div className="text-[20rem] font-black text-white leading-none tracking-tighter" style={{ fontStretch: 'condensed' }}>{timeLeft.toString().padStart(2, '0')}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MARCADOR PRINCIPAL */}
      <div className="relative flex flex-1 items-center justify-center px-16 z-20">
        <div className="absolute left-1/2 top-12 -translate-x-1/2 z-30">
          <div className="relative">
            <div className="absolute inset-0 -z-10 bg-slate-900" style={{ clipPath: "polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0% 50%)" }} />
            <div className="px-16 py-5 text-center">
              <span className="text-lg font-bold uppercase tracking-[0.3em] text-slate-400">Set</span>
              <span className="ml-4 text-5xl font-black text-white">{currentSet}</span>
            </div>
          </div>
        </div>
        
        <div className="absolute left-0 top-0 h-full w-1/3 opacity-15 z-0" style={{ backgroundColor: themeA.hex, clipPath: "polygon(0 0, 100% 0, 70% 100%, 0% 100%)" }} />
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-15 z-0" style={{ backgroundColor: themeB.hex, clipPath: "polygon(30% 0, 100% 0, 100% 100%, 0% 100%)" }} />
        
        <div className="grid grid-cols-3 w-full max-w-7xl items-center z-10">
          <div className="flex justify-start">
            <TeamPanel code={match.team_a_name || "LOC"} score={match.score_a} setsWon={match.sets_a} totalSets={totalSets} timeoutsUsed={match.timeouts_a || 0} colorTheme={match.team_a_color || "cyan"} side="left" hasServe={match.serving_team === 'a'} pointAlert={alertA} />
          </div>
          <div className="flex flex-col items-center justify-center gap-6 h-full">
            <div className="h-64 w-1 bg-gradient-to-b from-transparent via-slate-300 to-transparent" />
            <div className="text-4xl font-bold text-slate-300 font-sans">VS</div>
            <div className="h-64 w-1 bg-gradient-to-b from-transparent via-slate-300 to-transparent" />
          </div>
          <div className="flex justify-end">
            <TeamPanel code={match.team_b_name || "VIS"} score={match.score_b} setsWon={match.sets_b} totalSets={totalSets} timeoutsUsed={match.timeouts_b || 0} colorTheme={match.team_b_color || "rose"} side="right" hasServe={match.serving_team === 'b'} pointAlert={alertB} />
          </div>
        </div>
      </div>

      {/* BARRA INFERIOR CON ANIMACIÓN DE ENTRADA Y SALIDA */}
      <AnimatePresence>
        {!isConnected && (
          <motion.div initial={{ height: 0, opacity: 0, translateY: 50 }} animate={{ height: 112, opacity: 1, translateY: 0 }} exit={{ height: 0, opacity: 0, translateY: 50 }} transition={{ duration: 0.8, ease: "easeInOut" }} className="relative z-30 w-full overflow-hidden">
            <div className="flex h-28 items-center justify-between bg-slate-900 px-16" style={{ clipPath: "polygon(0 30%, 3% 0, 97% 0, 100% 30%, 100% 100%, 0% 100%)" }}>
              <div className="flex items-center gap-6">
                <div className="flex h-16 w-16 items-center justify-center border-2 border-slate-600 bg-white p-1">
                  {controllerUrl && <QRCodeSVG value={controllerUrl} size={52} level="M" bgColor="#ffffff" fgColor="#0f172a" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium uppercase tracking-wider text-slate-400">Escanea para controlar</span>
                  <span className="text-xs text-slate-500">Panel Remoto Seguro</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  <div className="h-8 w-3" style={{ backgroundColor: themeA.hex, clipPath: "polygon(0 0, 100% 20%, 100% 80%, 0 100%)" }} />
                  <div className="h-8 w-3" style={{ backgroundColor: themeB.hex, clipPath: "polygon(0 20%, 100% 0, 100% 100%, 0 80%)" }} />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium uppercase tracking-wider text-slate-400 font-sans">SALA</span>
                <div className="bg-slate-800 px-6 py-2" style={{ clipPath: "polygon(8% 0, 100% 0, 92% 100%, 0% 100%)" }}>
                  <span className="text-2xl font-black tracking-[0.2em] text-white font-sans">{matchId}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}