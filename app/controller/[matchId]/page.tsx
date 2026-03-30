"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { useVolleyballScore } from "@/hooks/useVolleyballScore";
import { Undo2, Lock, Loader2, RotateCcw, Settings, X, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = [
  { id: "cyan", hex: "#06b6d4", name: "Cyan" }, { id: "rose", hex: "#f43f5e", name: "Rosa" },
  { id: "blue", hex: "#3b82f6", name: "Azul" }, { id: "emerald", hex: "#10b981", name: "Verde" },
  { id: "amber", hex: "#f59e0b", name: "Ámbar" }, { id: "violet", hex: "#8b5cf6", name: "Violeta" },
  { id: "lime", hex: "#84cc16", name: "Lima" }, { id: "teal", hex: "#14b8a6", name: "Teal" },
  { id: "sky", hex: "#0ea5e9", name: "Cielo" }, { id: "fuchsia", hex: "#d946ef", name: "Fucsia" },
  { id: "orange", hex: "#f97316", name: "Naranja" }, { id: "crimson", hex: "#dc2626", name: "Carmesí" }
];

export default function ControllerPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [isEditingTeams, setIsEditingTeams] = useState(false);
  const [teamConfig, setTeamConfig] = useState({ nameA: "LOC", colorA: "cyan", nameB: "VIS", colorB: "rose" });
  
  const [activeTimeoutTeam, setActiveTimeoutTeam] = useState<"a" | "b" | null>(null);
  const [timeoutEndsAt, setTimeoutEndsAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const { 
    scoreA, scoreB, setsA, setsB, timeoutsA, timeoutsB, completedSets, servingTeam,
    pointA, pointB, timeoutA, timeoutB, setServe, undo, reset, currentSetNumber, isMatchComplete, syncState 
  } = useVolleyballScore();

  useEffect(() => {
    const claimDeviceAndSync = async () => {
      let deviceId = localStorage.getItem("voley_device_id");
      if (!deviceId) {
        deviceId = `device_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("voley_device_id", deviceId);
      }

      const { data: match, error } = await supabase.from("matches").select("*").eq("join_code", matchId).single();
      if (error || !match) { setIsCheckingAccess(false); return; }

      syncState({
        scoreA: match.score_a, scoreB: match.score_b,
        setsA: match.sets_a, setsB: match.sets_b,
        timeoutsA: match.timeouts_a || 0, timeoutsB: match.timeouts_b || 0,
        completedSets: match.set_history || [],
        servingTeam: match.serving_team || null
      });
      
      setTeamConfig({
        nameA: match.team_a_name || "LOC", colorA: match.team_a_color || "cyan",
        nameB: match.team_b_name || "VIS", colorB: match.team_b_color || "rose"
      });

      setActiveTimeoutTeam(match.timeout_active_team || null);
      setTimeoutEndsAt(match.timeout_ends_at || null);
      setIsSynced(true);

      if (match.controller_id === null) {
        const { error: updateError } = await supabase.from("matches").update({ controller_id: deviceId, last_heartbeat: Date.now() }).eq("join_code", matchId);
        if (!updateError) setHasAccess(true);
      } else if (match.controller_id === deviceId) {
        await supabase.from("matches").update({ last_heartbeat: Date.now() }).eq("join_code", matchId);
        setHasAccess(true);
      } else { setHasAccess(false); }
      setIsCheckingAccess(false);
    };
    claimDeviceAndSync();
  }, [matchId, syncState]);

  useEffect(() => {
    if (!hasAccess) return;
    const handleBeforeUnload = () => { supabase.from("matches").update({ controller_id: null, last_heartbeat: null }).eq("join_code", matchId).then(); };
    window.addEventListener("beforeunload", handleBeforeUnload);
    const heartbeatInterval = setInterval(() => { supabase.from("matches").update({ last_heartbeat: Date.now() }).eq("join_code", matchId).then(); }, 10000);
    return () => { window.removeEventListener("beforeunload", handleBeforeUnload); clearInterval(heartbeatInterval); };
  }, [hasAccess, matchId]);

  useEffect(() => {
    if (!hasAccess || isCheckingAccess || !isSynced) return;
    const updateScoreboard = async () => {
      await supabase.from("matches").update({ 
        score_a: scoreA, score_b: scoreB, sets_a: setsA, sets_b: setsB,
        timeouts_a: timeoutsA, timeouts_b: timeoutsB,
        timeout_active_team: activeTimeoutTeam, timeout_ends_at: timeoutEndsAt,
        set_history: completedSets, serving_team: servingTeam
      }).eq("join_code", matchId);
    };
    updateScoreboard();
  }, [scoreA, scoreB, setsA, setsB, timeoutsA, timeoutsB, completedSets, activeTimeoutTeam, timeoutEndsAt, servingTeam, matchId, hasAccess, isCheckingAccess, isSynced]);

  useEffect(() => {
    if (timeoutEndsAt) {
      const interval = setInterval(() => {
        const rem = Math.max(0, Math.ceil((timeoutEndsAt - Date.now()) / 1000));
        setTimeLeft(rem);
        if (rem <= 0) { setActiveTimeoutTeam(null); setTimeoutEndsAt(null); }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [timeoutEndsAt]);

  const saveTeamConfig = async () => {
    setIsEditingTeams(false);
    await supabase.from("matches").update({ team_a_name: teamConfig.nameA, team_a_color: teamConfig.colorA, team_b_name: teamConfig.nameB, team_b_color: teamConfig.colorB }).eq("join_code", matchId);
  };

  const handleStartTimeout = (team: "a" | "b") => {
    if (team === "a") timeoutA(); else timeoutB();
    setActiveTimeoutTeam(team);
    setTimeoutEndsAt(Date.now() + 30000);
  };
  const handleCancelTimeout = () => { setActiveTimeoutTeam(null); setTimeoutEndsAt(null); };

  if (isCheckingAccess) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white"><Loader2 className="animate-spin text-cyan-500" /></div>;
  if (!hasAccess) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-6"><Lock className="w-24 h-24 text-rose-500 mb-4" /><h1 className="text-4xl font-black text-white">Acceso Denegado</h1></div>;

  // LÓGICA DE ALERTA DE PUNTOS (Local para el controlador)
  const targetPoints = (currentSetNumber === 5) ? 15 : 25;
  const hasSetPointA = scoreA >= targetPoints - 1 && scoreA - scoreB >= 1;
  const hasSetPointB = scoreB >= targetPoints - 1 && scoreB - scoreA >= 1;
  const alertA = hasSetPointA && setsA === 2 ? "Match Point" : hasSetPointA ? "Set Point" : null;
  const alertB = hasSetPointB && setsB === 2 ? "Match Point" : hasSetPointB ? "Set Point" : null;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-950 font-sans select-none touch-none relative">
      
      {activeTimeoutTeam && (
        <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-6">
          <Timer className="w-16 h-16 sm:w-20 sm:h-20 text-white mb-6 animate-pulse" />
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-widest text-center mb-2">Tiempo Muerto</h2>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-400 uppercase tracking-widest text-center mb-8">{activeTimeoutTeam === 'a' ? teamConfig.nameA : teamConfig.nameB}</h3>
          <div className="text-[5rem] sm:text-[8rem] font-black text-white leading-none mb-12" style={{ fontStretch: 'condensed' }}>00:{timeLeft.toString().padStart(2, '0')}</div>
          <button onClick={handleCancelTimeout} className="bg-white text-slate-950 px-8 py-4 font-black uppercase tracking-widest text-lg sm:text-xl active:scale-95 transition-all w-full max-w-sm" style={{ clipPath: "polygon(5% 0, 100% 0, 95% 100%, 0% 100%)" }}>Reanudar Juego</button>
        </div>
      )}

      {isEditingTeams && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-slate-900 w-full max-w-md p-6 border border-slate-700 max-h-[90vh] overflow-y-auto" style={{ clipPath: "polygon(0 0, 100% 0, 95% 100%, 0% 100%)" }}>
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl sm:text-2xl font-black text-white uppercase">Ajustes</h2><button onClick={() => setIsEditingTeams(false)}><X className="text-slate-400" /></button></div>
            <div className="mb-6 p-4 bg-slate-950 border-l-4" style={{ borderColor: COLORS.find(c => c.id === teamConfig.colorA)?.hex }}>
              <input type="text" maxLength={4} value={teamConfig.nameA} onChange={(e) => setTeamConfig({...teamConfig, nameA: e.target.value.toUpperCase()})} className="w-full bg-slate-800 text-white font-black text-xl p-3 uppercase mb-3 outline-none" />
              <div className="flex flex-wrap gap-2">{COLORS.map(c => (<button key={`A-${c.id}`} onClick={() => setTeamConfig({...teamConfig, colorA: c.id})} className={cn("h-8 w-8 rounded-full border-2", teamConfig.colorA === c.id ? "border-white" : "border-transparent")} style={{ backgroundColor: c.hex }} />))}</div>
            </div>
            <div className="mb-6 p-4 bg-slate-950 border-r-4" style={{ borderColor: COLORS.find(c => c.id === teamConfig.colorB)?.hex }}>
              <input type="text" maxLength={4} value={teamConfig.nameB} onChange={(e) => setTeamConfig({...teamConfig, nameB: e.target.value.toUpperCase()})} className="w-full bg-slate-800 text-white font-black text-xl p-3 uppercase mb-3 text-right outline-none" />
              <div className="flex flex-wrap gap-2 justify-end">{COLORS.map(c => (<button key={`B-${c.id}`} onClick={() => setTeamConfig({...teamConfig, colorB: c.id})} className={cn("h-8 w-8 rounded-full border-2", teamConfig.colorB === c.id ? "border-white" : "border-transparent")} style={{ backgroundColor: c.hex }} />))}</div>
            </div>
            <button onClick={saveTeamConfig} className="w-full py-4 bg-white text-slate-950 font-black uppercase text-lg sm:text-xl" style={{ clipPath: "polygon(5% 0, 100% 0, 95% 100%, 0% 100%)" }}>Guardar Cambios</button>
          </div>
        </div>
      )}

      <div className="z-20 flex h-16 sm:h-20 items-center justify-between bg-slate-950 px-4 sm:px-6 border-b border-slate-800">
        <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sala</span><span className="text-lg sm:text-xl font-black text-white">{matchId}</span></div>
        <div className="relative"><div className="absolute inset-0 bg-slate-800" style={{ clipPath: "polygon(15% 0, 85% 0, 100% 50%, 85% 100%, 15% 100%, 0% 50%)" }} /><div className="px-6 py-1.5 sm:px-8 sm:py-2 text-center"><span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400">Set</span><span className="ml-2 text-lg sm:text-xl font-black text-white">{currentSetNumber}</span></div></div>
        <div className="flex gap-2">
          <button onClick={() => setIsEditingTeams(true)} className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center bg-slate-800 text-white active:scale-90" style={{ clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0 100%)" }}><Settings className="h-4 w-4 sm:h-5 sm:w-5" /></button>
          <button onClick={undo} className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center bg-slate-800 text-white active:scale-90" style={{ clipPath: "polygon(0 0, 100% 0, 80% 100%, 0 100%)" }}><Undo2 className="h-4 w-4 sm:h-5 sm:w-5" /></button>
        </div>
      </div>

      {isMatchComplete ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white"><h2 className="text-4xl sm:text-6xl font-black text-slate-900 mb-8 uppercase">¡Final!</h2><button onClick={reset} className="flex items-center gap-4 bg-slate-900 text-white px-8 py-4 sm:px-10 sm:py-5"><RotateCcw className="h-6 w-6 sm:h-8 sm:w-8" /> REINICIAR</button></div>
      ) : (
        <div className="flex flex-1 flex-col md:flex-row">
          
          {/* Team A - Local */}
          <div role="button" onClick={pointA} className="relative flex flex-1 flex-col items-center justify-center bg-white transition-colors cursor-pointer active:bg-slate-100 pb-16 sm:pb-20">
            <div className="absolute left-0 right-0 top-0 h-4" style={{ backgroundColor: COLORS.find(c => c.id === teamConfig.colorA)?.hex }} />
            
            {/* NUEVO: ALERTA DE PUNTOS EN CELULAR */}
            <div className="absolute top-6 left-0 right-0 flex justify-center h-8">
              {alertA && (<div className="bg-rose-600 text-white px-4 py-1 text-xs font-black tracking-widest uppercase animate-pulse shadow-lg" style={{ clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0% 100%)" }}>🔥 {alertA}</div>)}
            </div>

            <button onClick={(e) => { e.stopPropagation(); setServe('a'); }} className={cn("mt-6 mb-2 sm:mb-4 px-4 py-1 text-[10px] sm:text-xs font-black tracking-widest uppercase transition-all shadow-sm", servingTeam === 'a' ? "bg-cyan-500 text-white scale-105" : "bg-slate-200 text-slate-400 hover:bg-slate-300")} style={{ clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0% 100%)" }}>
              {servingTeam === 'a' ? '🏐 Tiene el Saque' : 'Asignar Saque'}
            </button>

            <span className="mb-1 sm:mb-2 text-xl sm:text-3xl font-bold uppercase tracking-widest text-slate-500">{teamConfig.nameA}</span>
            <span className="text-[6rem] sm:text-[9rem] md:text-[12rem] font-black leading-none tracking-tighter text-slate-900" style={{ fontStretch: "condensed" }}>{scoreA}</span>
            <div className="mt-2 sm:mt-4 px-4 sm:px-6 py-1" style={{ backgroundColor: COLORS.find(c => c.id === teamConfig.colorA)?.hex, clipPath: "polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0% 50%)" }}><span className="text-xs sm:text-sm font-bold uppercase text-white">SETS: {setsA}</span></div>
            <div className="absolute bottom-4 sm:bottom-6 flex w-full justify-center px-4">
              <button onClick={(e) => { e.stopPropagation(); handleStartTimeout('a'); }} disabled={timeoutsA >= 2} className={cn("flex w-full max-w-[180px] sm:max-w-[200px] items-center justify-center gap-2 sm:gap-3 px-4 py-3 sm:px-6 sm:py-4 shadow-lg transition-all active:scale-95", timeoutsA >= 2 ? "bg-slate-200 text-slate-400" : "bg-slate-900 text-white active:bg-slate-800")} style={{ clipPath: "polygon(8% 0, 100% 0, 92% 100%, 0% 100%)" }}>
                <Timer className="w-5 h-5 sm:w-6 sm:h-6" /> <div className="flex flex-col text-left"><span className="font-black text-xs sm:text-sm leading-none tracking-widest uppercase">Tiempo</span><span className="text-[9px] sm:text-[10px] font-bold text-slate-400 leading-none mt-1">{2 - timeoutsA} RESTANTES</span></div>
              </button>
            </div>
          </div>

          {/* Team B - Visita */}
          <div role="button" onClick={pointB} className="relative flex flex-1 flex-col items-center justify-center bg-slate-50 border-t-2 md:border-t-0 md:border-l-2 border-slate-200 transition-colors cursor-pointer active:bg-rose-50 pb-16 sm:pb-20">
            <div className="absolute left-0 right-0 top-0 h-4" style={{ backgroundColor: COLORS.find(c => c.id === teamConfig.colorB)?.hex }} />
            
            {/* NUEVO: ALERTA DE PUNTOS EN CELULAR */}
            <div className="absolute top-6 left-0 right-0 flex justify-center h-8">
              {alertB && (<div className="bg-rose-600 text-white px-4 py-1 text-xs font-black tracking-widest uppercase animate-pulse shadow-lg" style={{ clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0% 100%)" }}>🔥 {alertB}</div>)}
            </div>

            <button onClick={(e) => { e.stopPropagation(); setServe('b'); }} className={cn("mt-6 mb-2 sm:mb-4 px-4 py-1 text-[10px] sm:text-xs font-black tracking-widest uppercase transition-all shadow-sm", servingTeam === 'b' ? "bg-rose-500 text-white scale-105" : "bg-slate-200 text-slate-400 hover:bg-slate-300")} style={{ clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0% 100%)" }}>
              {servingTeam === 'b' ? '🏐 Tiene el Saque' : 'Asignar Saque'}
            </button>

            <span className="mb-1 sm:mb-2 text-xl sm:text-3xl font-bold uppercase tracking-widest text-slate-500">{teamConfig.nameB}</span>
            <span className="text-[6rem] sm:text-[9rem] md:text-[12rem] font-black leading-none tracking-tighter text-slate-900" style={{ fontStretch: "condensed" }}>{scoreB}</span>
            <div className="mt-2 sm:mt-4 px-4 sm:px-6 py-1" style={{ backgroundColor: COLORS.find(c => c.id === teamConfig.colorB)?.hex, clipPath: "polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0% 50%)" }}><span className="text-xs sm:text-sm font-bold uppercase text-white">SETS: {setsB}</span></div>
            <div className="absolute bottom-4 sm:bottom-6 flex w-full justify-center px-4">
              <button onClick={(e) => { e.stopPropagation(); handleStartTimeout('b'); }} disabled={timeoutsB >= 2} className={cn("flex w-full max-w-[180px] sm:max-w-[200px] items-center justify-center gap-2 sm:gap-3 px-4 py-3 sm:px-6 sm:py-4 shadow-lg transition-all active:scale-95", timeoutsB >= 2 ? "bg-slate-200 text-slate-400" : "bg-slate-900 text-white active:bg-slate-800")} style={{ clipPath: "polygon(8% 0, 100% 0, 92% 100%, 0% 100%)" }}>
                <Timer className="w-5 h-5 sm:w-6 sm:h-6" /> <div className="flex flex-col text-left"><span className="font-black text-xs sm:text-sm leading-none tracking-widest uppercase">Tiempo</span><span className="text-[9px] sm:text-[10px] font-bold text-slate-400 leading-none mt-1">{2 - timeoutsB} RESTANTES</span></div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}