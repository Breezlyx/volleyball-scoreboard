"use client";

import { useCallback, useMemo, useState } from "react";

export type VolleyballTeam = "a" | "b";

export type VolleyballScoreState = {
  scoreA: number;
  scoreB: number;
  setsA: number;
  setsB: number;
  timeoutsA: number;
  timeoutsB: number;
  completedSets: { scoreA: number; scoreB: number }[];
  servingTeam: VolleyballTeam | null; // NUEVO: Rastreador de Saque
};

export type UseVolleyballScoreOptions = { winningSets?: number; };

function getMaxSets(winningSets: number): number { return 2 * winningSets - 1; }

function getTargetPointsForCurrentSet(setsA: number, setsB: number, winningSets: number): number {
  const maxSets = getMaxSets(winningSets);
  const setNumber = setsA + setsB + 1;
  if (setNumber === maxSets && maxSets >= 5) return 15;
  return 25;
}

function isMatchWon(setsA: number, setsB: number, winningSets: number): boolean {
  return setsA >= winningSets || setsB >= winningSets;
}

export function applyVolleyballPoint(state: VolleyballScoreState, team: VolleyballTeam, winningSets: number): VolleyballScoreState {
  if (isMatchWon(state.setsA, state.setsB, winningSets)) return state;

  let { scoreA, scoreB, setsA, setsB, timeoutsA, timeoutsB, completedSets } = state;
  const target = getTargetPointsForCurrentSet(setsA, setsB, winningSets);

  if (team === "a") scoreA += 1;
  else scoreB += 1;

  const setWonA = scoreA >= target && scoreA - scoreB >= 2;
  const setWonB = scoreB >= target && scoreB - scoreA >= 2;
  
  // NUEVO: El equipo que anota, gana el saque
  const servingTeam = team; 

  if (setWonA) {
    return { scoreA: 0, scoreB: 0, setsA: setsA + 1, setsB, timeoutsA: 0, timeoutsB: 0, completedSets: [...completedSets, { scoreA, scoreB }], servingTeam: null };
  }
  if (setWonB) {
    return { scoreA: 0, scoreB: 0, setsA, setsB: setsB + 1, timeoutsA: 0, timeoutsB: 0, completedSets: [...completedSets, { scoreA, scoreB }], servingTeam: null };
  }

  return { scoreA, scoreB, setsA, setsB, timeoutsA, timeoutsB, completedSets, servingTeam };
}

export function applyTimeout(state: VolleyballScoreState, team: VolleyballTeam): VolleyballScoreState {
  if (team === "a" && state.timeoutsA < 2) return { ...state, timeoutsA: state.timeoutsA + 1 };
  if (team === "b" && state.timeoutsB < 2) return { ...state, timeoutsB: state.timeoutsB + 1 };
  return state; 
}

// NUEVO: Función para asignar saque manualmente (ej: al inicio del set)
export function applyServe(state: VolleyballScoreState, team: VolleyballTeam): VolleyballScoreState {
  return { ...state, servingTeam: team };
}

function sameState(a: VolleyballScoreState, b: VolleyballScoreState): boolean {
  return (
    a.scoreA === b.scoreA && a.scoreB === b.scoreB && a.setsA === b.setsA && a.setsB === b.setsB && 
    a.timeoutsA === b.timeoutsA && a.timeoutsB === b.timeoutsB && a.completedSets.length === b.completedSets.length &&
    a.servingTeam === b.servingTeam // Chequeo de saque
  );
}

const INITIAL: VolleyballScoreState = {
  scoreA: 0, scoreB: 0, setsA: 0, setsB: 0, timeoutsA: 0, timeoutsB: 0, completedSets: [], servingTeam: null
};

export function useVolleyballScore(options?: UseVolleyballScoreOptions) {
  const winningSets = options?.winningSets ?? 3;
  const [history, setHistory] = useState<VolleyballScoreState[]>(() => [{ ...INITIAL }]);

  const state = history[history.length - 1]!;
  const canUndo = history.length > 1;

  const winner = useMemo((): VolleyballTeam | null => {
    if (state.setsA >= winningSets) return "a";
    if (state.setsB >= winningSets) return "b";
    return null;
  }, [state.setsA, state.setsB, winningSets]);

  const isMatchComplete = winner !== null;
  const setsPlayed = state.setsA + state.setsB;
  const currentSetNumber = isMatchComplete ? setsPlayed : setsPlayed + 1;
  const targetPointsThisSet = isMatchComplete ? null : getTargetPointsForCurrentSet(state.setsA, state.setsB, winningSets);

  const point = useCallback((team: VolleyballTeam) => {
    setHistory((h) => {
      const prev = h[h.length - 1]!;
      const next = applyVolleyballPoint(prev, team, winningSets);
      if (sameState(prev, next)) return h;
      return [...h, next];
    });
  }, [winningSets]);

  const timeout = useCallback((team: VolleyballTeam) => {
    setHistory((h) => {
      const prev = h[h.length - 1]!;
      const next = applyTimeout(prev, team);
      if (sameState(prev, next)) return h;
      return [...h, next];
    });
  }, []);

  // NUEVO: Hook para el botón de Asignar Saque
  const setServe = useCallback((team: VolleyballTeam) => {
    setHistory((h) => {
      const prev = h[h.length - 1]!;
      const next = applyServe(prev, team);
      if (sameState(prev, next)) return h;
      return [...h, next];
    });
  }, []);

  const syncState = useCallback((newState: VolleyballScoreState) => { setHistory([newState]); }, []);
  const pointA = useCallback(() => point("a"), [point]);
  const pointB = useCallback(() => point("b"), [point]);
  const timeoutA = useCallback(() => timeout("a"), [timeout]);
  const timeoutB = useCallback(() => timeout("b"), [timeout]);
  const undo = useCallback(() => { setHistory((h) => (h.length <= 1 ? h : h.slice(0, -1))); }, []);
  const reset = useCallback(() => { setHistory([{ ...INITIAL }]); }, []);

  return {
    ...state, currentSetNumber, targetPointsThisSet, isMatchComplete, winner, winningSets,
    canUndo, point, pointA, pointB, timeoutA, timeoutB, setServe, undo, reset, syncState,
  };
}