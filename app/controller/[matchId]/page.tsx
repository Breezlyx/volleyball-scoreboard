"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { useVolleyballScore } from "@/hooks/useVolleyballScore";
import { Undo2, Lock, Loader2, RotateCcw, Settings, X, Timer, SearchX, AlertTriangle, RotateCw, Repeat, Square } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = [
  { id: "cyan", hex: "#06b6d4", name: "Cyan" }, { id: "rose", hex: "#f43f5e", name: "Rosa" },
  { id: "blue", hex: "#3b82f6", name: "Azul" }, { id: "emerald", hex: "#10b981", name: "Verde" },
  { id: "amber", hex: "#f59e0b", name: "Ámbar" }, { id: "violet", hex: "#8b5cf6", name: "Violeta" },
  { id: "lime", hex: "#84cc16", name: "Lima" }, { id: "teal", hex: "#14b8a6", name: "Teal" },
  { id: "sky", hex: "#0ea5e9", name: "Cielo" }, { id: "fuchsia", hex: "#d946ef", name: "Fucsia" },
  { id: "orange", hex: "#f97316", name: "Naranja" }, { id: "crimson", hex: "#dc2626", name: "Carmesí" }
];

type AccessStatus = "checking" | "granted" | "not_found" | "occupied" | "error";

export default function ControllerPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const [accessStatus, setAccessStatus] = useState<AccessStatus>("checking");
  const [isSynced, setIsSynced] = useState(false);
  const [isEditingTeams, setIsEditingTeams] = useState(false);
  const [teamConfig, setTeamConfig] = useState({ nameA: "LOC", colorA: "cyan", nameB: "VIS", colorB: "rose" });
  
  const [activeTimeoutTeam, setActiveTimeoutTeam] = useState<"a" | "b" | null>(null);
  const [timeoutEndsAt, setTimeoutEndsAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const [tempTourneyMode, setTempTourneyMode] = useState(false);
  const [tempShowRotation, setTempShowRotation] = useState(true);
  const [tempLineupA, setTempLineupA] = useState(["1","2","3","4","5","6"]);
  const [tempLineupB, setTempLineupB] = useState(["1","2","3","4","5","6"]);

  const [subModalTeam, setSubModalTeam] = useState<"a" | "b" | null>(null);
  const [subOutIndex, setSubOutIndex] = useState<number>(0);
  const [subInPlayer, setSubInPlayer] = useState<string>("");

  const { 
    scoreA, scoreB, setsA, setsB, timeoutsA, timeoutsB, completedSets, servingTeam,
    isTournamentMode, showRotationOnTv, lineupA, lineupB, subsA, subsB, cardsA, cardsB,
    pointA, pointB, timeoutA, timeoutB, setServe, undo, reset, currentSetNumber, isMatchComplete, syncState,
    setTournamentMode, setShowRotation, setLineup, addSubstitution, issueCard, manualRotate
  } = useVolleyballScore();

  useEffect(() => {
    const claimDeviceAndSync = async () => {
      try {
        let deviceId = localStorage.getItem("voley_device_id");
        if (!deviceId) {
          deviceId = `device_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem("voley_device_id", deviceId);
        }

        const { data: match, error } = await supabase.from("matches").select("*").eq("join_code", matchId).single();
        if (error || !match) { setAccessStatus("not_found"); return; }

        syncState({
          scoreA: match.score_a, scoreB: match.score_b,
          setsA: match.sets_a, setsB: match.sets_b,
          timeoutsA: match.timeouts_a || 0, timeoutsB: match.timeouts_b || 0,
          completedSets: match.set_history || [],
          servingTeam: match.serving_team || null,
          isTournamentMode: match.is_tournament_mode || false,
          showRotationOnTv: match.show_rotation_on_tv ?? true,
          lineupA: match.lineup_a?.length === 6 ? match.lineup_a : ["1","2","3","4","5","6"],
          lineupB: match.lineup_b?.length === 6 ? match.lineup_b : ["1","2","3","4","5","6"],
          subsA: match.subs_a || 0, subsB: match.subs_b || 0,
          cardsA: match.cards_a || { yellow: 0, red: 0 },
          cardsB: match.cards_b || { yellow: 0, red: 0 }
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
          if (!updateError) setAccessStatus("granted"); else setAccessStatus("error");
        } else if (match.controller_id === deviceId) {
          await supabase.from("matches").update({ last_heartbeat: Date.now() }).eq("join_code", matchId);
          setAccessStatus("granted");
        } else { setAccessStatus("occupied"); }
      } catch (err) { setAccessStatus("error"); }
    };
    claimDeviceAndSync();
  }, [matchId, syncState]);

  useEffect(() => {
    if (accessStatus !== "granted") return;
    let wakeLock: any = null;
    const requestWakeLock = async () => { try { if ('wakeLock' in navigator) { wakeLock = await (navigator as any).wakeLock.request('screen'); } } catch (err) {} };
    requestWakeLock();
    const handleVisibilityChange = () => { if (document.visibilityState === 'visible') { requestWakeLock(); supabase.from("matches").update({ last_heartbeat: Date.now() }).eq("join_code", matchId).then(); } };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const handleBeforeUnload = () => { supabase.from("matches").update({ controller_id: null, last_heartbeat: null }).eq("join_code", matchId).then(); };
    window.addEventListener("beforeunload", handleBeforeUnload);
    const heartbeatInterval = setInterval(() => { supabase.from("matches").update({ last_heartbeat: Date.now() }).eq("join_code", matchId).then(); }, 10000);
    return () => { window.removeEventListener("beforeunload", handleBeforeUnload); document.removeEventListener("visibilitychange", handleVisibilityChange); clearInterval(heartbeatInterval); if (wakeLock) wakeLock.release(); };
  }, [accessStatus, matchId]);

  useEffect(() => {
    if (accessStatus !== "granted" || !isSynced) return;
    const updateScoreboard = async () => {
      await supabase.from("matches").update({ 
        score_a: scoreA, score_b: scoreB, sets_a: setsA, sets_b: setsB,
        timeouts_a: timeoutsA, timeouts_b: timeoutsB,
        timeout_active_team: activeTimeoutTeam, timeout_ends_at: timeoutEndsAt,
        set_history: completedSets, serving_team: servingTeam,
        is_tournament_mode: isTournamentMode, show_rotation_on_tv: showRotationOnTv, lineup_a: lineupA, lineup_b: lineupB,
        subs_a: subsA, subs_b: subsB, cards_a: cardsA, cards_b: cardsB
      }).eq("join_code", matchId);
    };
    updateScoreboard();
  }, [scoreA, scoreB, setsA, setsB, timeoutsA, timeoutsB, completedSets, activeTimeoutTeam, timeoutEndsAt, servingTeam, isTournamentMode, showRotationOnTv, lineupA, lineupB, subsA, subsB, cardsA, cardsB, matchId, accessStatus, isSynced]);

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

  const openSettingsModal = () => {
    setTempTourneyMode(isTournamentMode);
    setTempShowRotation(showRotationOnTv);
    setTempLineupA(lineupA);
    setTempLineupB(lineupB);
    setIsEditingTeams(true);
  };

  const saveTeamConfig = async () => {
    if (tempTourneyMode) {
      const cleanA = tempLineupA.map(v => v.trim());
      const cleanB = tempLineupB.map(v => v.trim());
      
      if (cleanA.includes("") || cleanB.includes("")) {
        alert("Error: Todos los jugadores deben tener un número de dorsal asignado (no pueden haber casillas vacías).");
        return;
      }
      
      if (new Set(cleanA).size !== cleanA.length) {
        alert(`Error: ¡El equipo ${teamConfig.nameA} tiene dorsales repetidos en su alineación!`);
        return;
      }
      if (new Set(cleanB).size !== cleanB.length) {
        alert(`Error: ¡El equipo ${teamConfig.nameB} tiene dorsales repetidos en su alineación!`);
        return;
      }
    }

    setIsEditingTeams(false);
    setTournamentMode(tempTourneyMode);
    setShowRotation(tempShowRotation);
    setLineup("a", tempLineupA.map(v => v.trim()));
    setLineup("b", tempLineupB.map(v => v.trim()));
    await supabase.from("matches").update({ 
      team_a_name: teamConfig.nameA, 
      team_a_color: teamConfig.colorA, 
      team_b_name: teamConfig.nameB, 
      team_b_color: teamConfig.colorB,
      show_rotation_on_tv: tempShowRotation
    }).eq("join_code", matchId);
  };

  const handleStartTimeout = (team: "a" | "b") => {
    if (team === "a") timeoutA(); else timeoutB();
    setActiveTimeoutTeam(team);
    setTimeoutEndsAt(Date.now() + 30000);
  };
  const handleCancelTimeout = () => { setActiveTimeoutTeam(null); setTimeoutEndsAt(null); };

  if (accessStatus === "checking") return <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center text-white"><Loader2 className="animate-spin text-cyan-500 w-12 h-12" /></div>;
  if (accessStatus === "not_found") return <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center text-center p-6"><SearchX className="w-24 h-24 text-slate-500 mb-6" /><h1 className="text-3xl font-black text-white uppercase tracking-widest mb-2">Sala No Encontrada</h1></div>;
  if (accessStatus === "occupied") return <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center text-center p-6"><Lock className="w-24 h-24 text-rose-500 mb-6" /><h1 className="text-3xl font-black text-white uppercase tracking-widest mb-2">Sala Ocupada</h1></div>;
  if (accessStatus === "error") return <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center text-center p-6"><AlertTriangle className="w-24 h-24 text-amber-500 mb-6" /><h1 className="text-3xl font-black text-white uppercase tracking-widest mb-2">Error de Conexión</h1></div>;

  const targetPoints = (currentSetNumber === 5) ? 15 : 25;
  const hasSetPointA = scoreA >= targetPoints - 1 && scoreA - scoreB >= 1;
  const hasSetPointB = scoreB >= targetPoints - 1 && scoreB - scoreA >= 1;
  const alertA = hasSetPointA && setsA === 2 ? "Match Point" : hasSetPointA ? "Set Point" : null;
  const alertB = hasSetPointB && setsB === 2 ? "Match Point" : hasSetPointB ? "Set Point" : null;

  const currentLineupForSub = subModalTeam === 'a' ? lineupA : lineupB;
  const isDuplicateSub = subInPlayer.trim() !== "" && currentLineupForSub.includes(subInPlayer.trim());
  const isSubValid = subInPlayer.trim() !== "" && !isDuplicateSub;

  return (
    // CAMBIO 1: min-h-[100dvh] permite scroll natural. pb-20 agrega espacio extra al final.
    <div className="flex min-h-[100dvh] w-full flex-col bg-slate-950 font-sans select-none touch-manipulation relative pb-20">
      
      {/* OVERLAY TIEMPO MUERTO (AHORA FIXED PARA CUBRIR TODA LA PANTALLA AUN CON SCROLL) */}
      {activeTimeoutTeam && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-6">
          <Timer className="w-16 h-16 sm:w-20 sm:h-20 text-white mb-6 animate-pulse" />
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-widest text-center mb-2">Tiempo Muerto</h2>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-400 uppercase tracking-widest text-center mb-8">{activeTimeoutTeam === 'a' ? teamConfig.nameA : teamConfig.nameB}</h3>
          <div className="text-[5rem] sm:text-[8rem] font-black text-white leading-none mb-12" style={{ fontStretch: 'condensed' }}>00:{timeLeft.toString().padStart(2, '0')}</div>
          <button onClick={handleCancelTimeout} className="bg-white text-slate-950 px-8 py-4 font-black uppercase tracking-widest text-lg sm:text-xl active:scale-95 transition-all w-full max-w-sm" style={{ clipPath: "polygon(5% 0, 100% 0, 95% 100%, 0% 100%)" }}>Reanudar Juego</button>
        </div>
      )}

      {/* MODAL DE SUSTITUCIONES (FIXED) */}
      {subModalTeam && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-slate-900 w-full max-w-sm p-6 border border-slate-700" style={{ clipPath: "polygon(0 0, 100% 0, 95% 100%, 0% 100%)" }}>
            <h2 className="text-white font-black uppercase text-xl mb-4 text-center">Sustitución</h2>
            <div className="bg-slate-950 p-4 mb-4 border-l-4" style={{ borderColor: COLORS.find(c => c.id === (subModalTeam === 'a' ? teamConfig.colorA : teamConfig.colorB))?.hex }}>
              <label className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 block">Jugador que Sale:</label>
              <select className="w-full bg-slate-800 text-white p-3 mb-4 outline-none font-bold text-center" value={subOutIndex} onChange={e => setSubOutIndex(Number(e.target.value))}>
                {(subModalTeam === 'a' ? lineupA : lineupB).map((p, i) => (<option key={i} value={i}>Posición {i+1} (Dorsal: {p})</option>))}
              </select>
              <label className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 block">Jugador que Entra (Dorsal):</label>
              <input 
                type="text" 
                inputMode="numeric"
                maxLength={3} 
                className="w-full bg-slate-800 text-white p-3 mb-1 outline-none font-black text-center text-xl transition-all" 
                value={subInPlayer} 
                onChange={e => setSubInPlayer(e.target.value.replace(/[^0-9]/g, ''))} 
                placeholder="Ej: 10" 
              />
              {isDuplicateSub && <span className="text-rose-500 text-[10px] font-bold uppercase tracking-widest text-center block w-full mt-1">⚠️ El dorsal ya está en la cancha</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setSubModalTeam(null); setSubInPlayer(""); }} className="flex-1 bg-slate-800 text-white py-3 font-bold uppercase tracking-widest text-sm" style={{ clipPath: "polygon(0 0, 100% 0, 85% 100%, 0% 100%)" }}>Cancelar</button>
              <button 
                disabled={!isSubValid}
                onClick={() => {
                  const currentLineup = subModalTeam === 'a' ? [...lineupA] : [...lineupB];
                  currentLineup[subOutIndex] = subInPlayer.trim();
                  addSubstitution(subModalTeam, currentLineup);
                  setSubModalTeam(null); setSubInPlayer("");
                }} 
                className={cn("flex-1 py-3 font-black uppercase tracking-widest text-sm transition-all", isSubValid ? "bg-white text-slate-950" : "bg-slate-600 text-slate-400 opacity-50")} 
                style={{ clipPath: "polygon(15% 0, 100% 0, 100% 100%, 0% 100%)" }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJUSTES (FIXED) */}
      {isEditingTeams && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-slate-900 w-full max-w-md p-6 border border-slate-700 max-h-[90vh] overflow-y-auto" style={{ clipPath: "polygon(0 0, 100% 0, 95% 100%, 0% 100%)" }}>
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl sm:text-2xl font-black text-white uppercase">Ajustes</h2><button onClick={() => setIsEditingTeams(false)}><X className="text-slate-400" /></button></div>
            
            <div className="flex justify-between items-center mb-2 p-4 bg-slate-950">
              <span className="text-slate-300 font-bold uppercase tracking-widest text-sm">Modo Torneo</span>
              <button onClick={() => setTempTourneyMode(!tempTourneyMode)} className={cn("w-14 h-7 rounded-full transition-colors relative", tempTourneyMode ? "bg-emerald-500" : "bg-slate-700")}>
                <div className={cn("w-5 h-5 rounded-full bg-white absolute top-1 transition-all", tempTourneyMode ? "left-8" : "left-1")} />
              </button>
            </div>

            {tempTourneyMode && (
              <div className="flex justify-between items-center mb-6 p-4 bg-slate-900 border border-slate-800">
                <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Mostrar Rotación en TV</span>
                <button onClick={() => setTempShowRotation(!tempShowRotation)} className={cn("w-12 h-6 rounded-full transition-colors relative", tempShowRotation ? "bg-emerald-500" : "bg-slate-700")}>
                  <div className={cn("w-4 h-4 rounded-full bg-white absolute top-1 transition-all", tempShowRotation ? "left-7" : "left-1")} />
                </button>
              </div>
            )}

            <div className="mb-6 p-4 bg-slate-950 border-l-4" style={{ borderColor: COLORS.find(c => c.id === teamConfig.colorA)?.hex }}>
              <input type="text" maxLength={4} value={teamConfig.nameA} onChange={(e) => setTeamConfig({...teamConfig, nameA: e.target.value.toUpperCase()})} className="w-full bg-slate-800 text-white font-black text-xl p-3 uppercase mb-3 outline-none" />
              <div className="flex flex-wrap gap-2 mb-4">{COLORS.map(c => (<button key={`A-${c.id}`} onClick={() => setTeamConfig({...teamConfig, colorA: c.id})} className={cn("h-8 w-8 rounded-full border-2", teamConfig.colorA === c.id ? "border-white" : "border-transparent")} style={{ backgroundColor: c.hex }} />))}</div>
              {tempTourneyMode && (
                <div>
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-2">Alineación Inicial (Pos 1 a 6)</span>
                  <div className="grid grid-cols-6 gap-1">
                    {tempLineupA.map((p, i) => (
                      <input 
                        key={`la-${i}`} 
                        value={p} 
                        maxLength={3} 
                        inputMode="numeric"
                        onChange={(e) => { 
                          const val = e.target.value.replace(/[^0-9]/g, ''); 
                          const newL = [...tempLineupA]; 
                          newL[i] = val; 
                          setTempLineupA(newL); 
                        }} 
                        className="w-full bg-slate-800 text-white text-center font-bold p-1 text-sm outline-none border border-slate-700 focus:border-white" 
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6 p-4 bg-slate-950 border-r-4" style={{ borderColor: COLORS.find(c => c.id === teamConfig.colorB)?.hex }}>
              <input type="text" maxLength={4} value={teamConfig.nameB} onChange={(e) => setTeamConfig({...teamConfig, nameB: e.target.value.toUpperCase()})} className="w-full bg-slate-800 text-white font-black text-xl p-3 uppercase mb-3 text-right outline-none" />
              <div className="flex flex-wrap gap-2 justify-end mb-4">{COLORS.map(c => (<button key={`B-${c.id}`} onClick={() => setTeamConfig({...teamConfig, colorB: c.id})} className={cn("h-8 w-8 rounded-full border-2", teamConfig.colorB === c.id ? "border-white" : "border-transparent")} style={{ backgroundColor: c.hex }} />))}</div>
              {tempTourneyMode && (
                <div>
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block text-right mb-2">Alineación Inicial (Pos 1 a 6)</span>
                  <div className="grid grid-cols-6 gap-1">
                    {tempLineupB.map((p, i) => (
                      <input 
                        key={`lb-${i}`} 
                        value={p} 
                        maxLength={3} 
                        inputMode="numeric"
                        onChange={(e) => { 
                          const val = e.target.value.replace(/[^0-9]/g, ''); 
                          const newL = [...tempLineupB]; 
                          newL[i] = val; 
                          setTempLineupB(newL); 
                        }} 
                        className="w-full bg-slate-800 text-white text-center font-bold p-1 text-sm outline-none border border-slate-700 focus:border-white" 
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={saveTeamConfig} className="w-full py-4 bg-white text-slate-950 font-black uppercase text-lg sm:text-xl" style={{ clipPath: "polygon(5% 0, 100% 0, 95% 100%, 0% 100%)" }}>Guardar Cambios</button>
          </div>
        </div>
      )}

      {/* TOP BAR (AHORA STICKY) */}
      <div className="sticky top-0 z-40 flex h-16 sm:h-20 shrink-0 items-center justify-between bg-slate-950 px-4 sm:px-6 border-b border-slate-800 shadow-md">
        <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sala</span><span className="text-lg sm:text-xl font-black text-white">{matchId}</span></div>
        <div className="relative"><div className="absolute inset-0 bg-slate-800" style={{ clipPath: "polygon(15% 0, 85% 0, 100% 50%, 85% 100%, 15% 100%, 0% 50%)" }} /><div className="px-6 py-1.5 sm:px-8 sm:py-2 text-center"><span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400">Set</span><span className="ml-2 text-lg sm:text-xl font-black text-white">{currentSetNumber}</span></div></div>
        <div className="flex gap-2">
          <button onClick={openSettingsModal} className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center bg-slate-800 text-white active:scale-90" style={{ clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0 100%)" }}><Settings className="h-4 w-4 sm:h-5 sm:w-5" /></button>
          <button onClick={undo} className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center bg-slate-800 text-white active:scale-90" style={{ clipPath: "polygon(0 0, 100% 0, 80% 100%, 0 100%)" }}><Undo2 className="h-4 w-4 sm:h-5 sm:w-5" /></button>
        </div>
      </div>

      {isMatchComplete ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white"><h2 className="text-4xl sm:text-6xl font-black text-slate-900 mb-8 uppercase">¡Final!</h2><button onClick={reset} className="flex items-center gap-4 bg-slate-900 text-white px-8 py-4 sm:px-10 sm:py-5"><RotateCcw className="h-6 w-6 sm:h-8 sm:w-8" /> REINICIAR</button></div>
      ) : (
        <div className="flex flex-1 flex-col md:flex-row">
          
          {/* CONTROLADOR EQUIPO A */}
          <div role="button" onClick={pointA} className="relative flex flex-1 flex-col items-center justify-center bg-white transition-colors cursor-pointer active:bg-slate-100 py-10 sm:py-16">
            <div className="absolute left-0 right-0 top-0 h-4" style={{ backgroundColor: COLORS.find(c => c.id === teamConfig.colorA)?.hex }} />
            
            <div className="absolute top-6 left-0 right-0 flex justify-center h-8">
              {alertA && (<div className="bg-rose-600 text-white px-4 py-1 text-xs font-black tracking-widest uppercase animate-pulse shadow-lg" style={{ clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0% 100%)" }}>🔥 {alertA}</div>)}
            </div>

            <button onClick={(e) => { e.stopPropagation(); setServe('a'); }} className={cn("mt-4 mb-2 sm:mt-6 sm:mb-4 px-4 py-1 text-[10px] sm:text-xs font-black tracking-widest uppercase transition-all shadow-sm", servingTeam === 'a' ? "bg-cyan-500 text-white scale-105" : "bg-slate-200 text-slate-400 hover:bg-slate-300")} style={{ clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0% 100%)" }}>
              {servingTeam === 'a' ? '🏐 Tiene el Saque' : 'Asignar Saque'}
            </button>

            <span className="mb-1 sm:mb-2 text-lg sm:text-3xl font-bold uppercase tracking-widest text-slate-500">{teamConfig.nameA}</span>
            <span className="text-[5.5rem] sm:text-[8rem] md:text-[12rem] font-black leading-[0.85] tracking-tighter text-slate-900" style={{ fontStretch: "condensed" }}>{scoreA}</span>
            <div className="mt-2 sm:mt-4 px-4 sm:px-6 py-1 mb-2" style={{ backgroundColor: COLORS.find(c => c.id === teamConfig.colorA)?.hex, clipPath: "polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0% 50%)" }}><span className="text-xs sm:text-sm font-bold uppercase text-white">SETS: {setsA}</span></div>
            
            {isTournamentMode && (
              <div className="w-full mt-2 flex flex-col items-center gap-2 px-4 z-10" onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-1 bg-slate-900 px-3 py-1 text-slate-300 font-mono text-[10px] w-full max-w-[280px] justify-center tracking-widest">
                  [ {lineupA.join(" - ")} ]
                </div>
                <div className="flex w-full justify-between gap-1 max-w-[280px]">
                  <button onClick={() => manualRotate('a')} className="flex-1 bg-slate-800 text-slate-300 py-2 text-[9px] font-bold uppercase tracking-widest flex flex-col items-center gap-1 active:scale-95"><RotateCw className="w-3 h-3"/> Rotar</button>
                  <button onClick={() => setSubModalTeam('a')} className={cn("flex-1 py-2 text-[9px] font-bold uppercase tracking-widest flex flex-col items-center gap-1 active:scale-95", subsA >= 6 ? "bg-slate-200 text-slate-400" : "bg-slate-800 text-slate-300")} disabled={subsA >= 6}><Repeat className="w-3 h-3"/> Cambios: {subsA}/6</button>
                  <button onClick={() => issueCard('a', 'red')} className="flex-1 bg-rose-50 text-rose-600 border border-rose-200 py-2 text-[9px] font-bold uppercase tracking-widest flex flex-col items-center gap-1 active:scale-95"><Square className="w-3 h-3 fill-rose-600"/> T. Roja</button>
                </div>
              </div>
            )}

            {/* CAMBIO 3: Botones fuera de "absolute bottom". Ahora fluyen de forma natural */}
            <div className="mt-6 flex w-full justify-center px-4 z-10" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => handleStartTimeout('a')} disabled={timeoutsA >= 2} className={cn("flex w-full max-w-[180px] sm:max-w-[200px] items-center justify-center gap-2 sm:gap-3 px-4 py-3 shadow-lg transition-all active:scale-95", timeoutsA >= 2 ? "bg-slate-200 text-slate-400" : "bg-slate-900 text-white active:bg-slate-800")} style={{ clipPath: "polygon(8% 0, 100% 0, 92% 100%, 0% 100%)" }}>
                <Timer className="w-5 h-5 sm:w-6 sm:h-6" /> <div className="flex flex-col text-left"><span className="font-black text-xs sm:text-sm leading-none tracking-widest uppercase">Tiempo</span><span className="text-[9px] sm:text-[10px] font-bold text-slate-400 leading-none mt-1">{2 - timeoutsA} RESTANTES</span></div>
              </button>
            </div>
          </div>

          {/* CONTROLADOR EQUIPO B */}
          <div role="button" onClick={pointB} className="relative flex flex-1 flex-col items-center justify-center bg-slate-50 border-t-2 md:border-t-0 md:border-l-2 border-slate-200 transition-colors cursor-pointer active:bg-rose-50 py-10 sm:py-16">
            <div className="absolute left-0 right-0 top-0 h-4" style={{ backgroundColor: COLORS.find(c => c.id === teamConfig.colorB)?.hex }} />
            
            <div className="absolute top-6 left-0 right-0 flex justify-center h-8">
              {alertB && (<div className="bg-rose-600 text-white px-4 py-1 text-xs font-black tracking-widest uppercase animate-pulse shadow-lg" style={{ clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0% 100%)" }}>🔥 {alertB}</div>)}
            </div>

            <button onClick={(e) => { e.stopPropagation(); setServe('b'); }} className={cn("mt-4 mb-2 sm:mt-6 sm:mb-4 px-4 py-1 text-[10px] sm:text-xs font-black tracking-widest uppercase transition-all shadow-sm", servingTeam === 'b' ? "bg-rose-500 text-white scale-105" : "bg-slate-200 text-slate-400 hover:bg-slate-300")} style={{ clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0% 100%)" }}>
              {servingTeam === 'b' ? '🏐 Tiene el Saque' : 'Asignar Saque'}
            </button>

            <span className="mb-1 sm:mb-2 text-lg sm:text-3xl font-bold uppercase tracking-widest text-slate-500">{teamConfig.nameB}</span>
            <span className="text-[5.5rem] sm:text-[8rem] md:text-[12rem] font-black leading-[0.85] tracking-tighter text-slate-900" style={{ fontStretch: "condensed" }}>{scoreB}</span>
            <div className="mt-2 sm:mt-4 px-4 sm:px-6 py-1 mb-2" style={{ backgroundColor: COLORS.find(c => c.id === teamConfig.colorB)?.hex, clipPath: "polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0% 50%)" }}><span className="text-xs sm:text-sm font-bold uppercase text-white">SETS: {setsB}</span></div>
            
            {isTournamentMode && (
              <div className="w-full mt-2 flex flex-col items-center gap-2 px-4 z-10" onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-1 bg-slate-900 px-3 py-1 text-slate-300 font-mono text-[10px] w-full max-w-[280px] justify-center tracking-widest">
                  [ {lineupB.join(" - ")} ]
                </div>
                <div className="flex w-full justify-between gap-1 max-w-[280px]">
                  <button onClick={() => manualRotate('b')} className="flex-1 bg-slate-800 text-slate-300 py-2 text-[9px] font-bold uppercase tracking-widest flex flex-col items-center gap-1 active:scale-95"><RotateCw className="w-3 h-3"/> Rotar</button>
                  <button onClick={() => setSubModalTeam('b')} className={cn("flex-1 py-2 text-[9px] font-bold uppercase tracking-widest flex flex-col items-center gap-1 active:scale-95", subsB >= 6 ? "bg-slate-200 text-slate-400" : "bg-slate-800 text-slate-300")} disabled={subsB >= 6}><Repeat className="w-3 h-3"/> Cambios: {subsB}/6</button>
                  <button onClick={() => issueCard('b', 'red')} className="flex-1 bg-rose-50 text-rose-600 border border-rose-200 py-2 text-[9px] font-bold uppercase tracking-widest flex flex-col items-center gap-1 active:scale-95"><Square className="w-3 h-3 fill-rose-600"/> T. Roja</button>
                </div>
              </div>
            )}

            <div className="mt-6 flex w-full justify-center px-4 z-10" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => handleStartTimeout('b')} disabled={timeoutsB >= 2} className={cn("flex w-full max-w-[180px] sm:max-w-[200px] items-center justify-center gap-2 sm:gap-3 px-4 py-3 shadow-lg transition-all active:scale-95", timeoutsB >= 2 ? "bg-slate-200 text-slate-400" : "bg-slate-900 text-white active:bg-slate-800")} style={{ clipPath: "polygon(8% 0, 100% 0, 92% 100%, 0% 100%)" }}>
                <Timer className="w-5 h-5 sm:w-6 sm:h-6" /> <div className="flex flex-col text-left"><span className="font-black text-xs sm:text-sm leading-none tracking-widest uppercase">Tiempo</span><span className="text-[9px] sm:text-[10px] font-bold text-slate-400 leading-none mt-1">{2 - timeoutsB} RESTANTES</span></div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}