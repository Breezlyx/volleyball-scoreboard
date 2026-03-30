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
  servingTeam: VolleyballTeam | null;
  
  isTournamentMode: boolean;
  showRotationOnTv: boolean; // NUEVO
  lineupA: string[];
  lineupB: string[];
  subsA: number;
  subsB: number;
  cardsA: { yellow: number; red: number };
  cardsB: { yellow: number; red: number };
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

  let { scoreA, scoreB, setsA, setsB, timeoutsA, timeoutsB, completedSets, servingTeam, isTournamentMode, showRotationOnTv, lineupA, lineupB, subsA, subsB, cardsA, cardsB } = state;
  const target = getTargetPointsForCurrentSet(setsA, setsB, winningSets);

  let newLineupA = [...lineupA];
  let newLineupB = [...lineupB];

  const isSideOutForA = team === "a" && servingTeam !== "a" && servingTeam !== null;
  const isSideOutForB = team === "b" && servingTeam !== "b" && servingTeam !== null;

  if (isTournamentMode) {
    if (isSideOutForA && newLineupA.length === 6) {
      newLineupA = [newLineupA[1], newLineupA[2], newLineupA[3], newLineupA[4], newLineupA[5], newLineupA[0]];
    } else if (isSideOutForB && newLineupB.length === 6) {
      newLineupB = [newLineupB[1], newLineupB[2], newLineupB[3], newLineupB[4], newLineupB[5], newLineupB[0]];
    }
  }

  if (team === "a") scoreA += 1;
  else scoreB += 1;

  const setWonA = scoreA >= target && scoreA - scoreB >= 2;
  const setWonB = scoreB >= target && scoreB - scoreA >= 2;
  const newServingTeam = team; 

  if (setWonA) {
    return { scoreA: 0, scoreB: 0, setsA: setsA + 1, setsB, timeoutsA: 0, timeoutsB: 0, completedSets: [...completedSets, { scoreA, scoreB }], servingTeam: null, isTournamentMode, showRotationOnTv, lineupA: newLineupA, lineupB: newLineupB, subsA: 0, subsB: 0, cardsA, cardsB };
  }
  if (setWonB) {
    return { scoreA: 0, scoreB: 0, setsA, setsB: setsB + 1, timeoutsA: 0, timeoutsB: 0, completedSets: [...completedSets, { scoreA, scoreB }], servingTeam: null, isTournamentMode, showRotationOnTv, lineupA: newLineupA, lineupB: newLineupB, subsA: 0, subsB: 0, cardsA, cardsB };
  }

  return { scoreA, scoreB, setsA, setsB, timeoutsA, timeoutsB, completedSets, servingTeam: newServingTeam, isTournamentMode, showRotationOnTv, lineupA: newLineupA, lineupB: newLineupB, subsA, subsB, cardsA, cardsB };
}

export function applyTimeout(state: VolleyballScoreState, team: VolleyballTeam): VolleyballScoreState {
  if (team === "a" && state.timeoutsA < 2) return { ...state, timeoutsA: state.timeoutsA + 1 };
  if (team === "b" && state.timeoutsB < 2) return { ...state, timeoutsB: state.timeoutsB + 1 };
  return state; 
}

export function applyServe(state: VolleyballScoreState, team: VolleyballTeam): VolleyballScoreState {
  return { ...state, servingTeam: team };
}

export function applyCard(state: VolleyballScoreState, team: VolleyballTeam, type: "yellow" | "red", winningSets: number): VolleyballScoreState {
  let next = { ...state, cardsA: { ...state.cardsA }, cardsB: { ...state.cardsB } };
  if (team === "a") next.cardsA[type]++;
  else next.cardsB[type]++;

  if (type === "red") {
    const opponent = team === "a" ? "b" : "a";
    return applyVolleyballPoint(next, opponent, winningSets);
  }
  return next;
}

export function applyManualRotation(state: VolleyballScoreState, team: VolleyballTeam): VolleyballScoreState {
  let next = { ...state, lineupA: [...state.lineupA], lineupB: [...state.lineupB] };
  if (team === "a" && next.lineupA.length === 6) {
    next.lineupA = [next.lineupA[1], next.lineupA[2], next.lineupA[3], next.lineupA[4], next.lineupA[5], next.lineupA[0]];
  } else if (team === "b" && next.lineupB.length === 6) {
    next.lineupB = [next.lineupB[1], next.lineupB[2], next.lineupB[3], next.lineupB[4], next.lineupB[5], next.lineupB[0]];
  }
  return next;
}

function sameState(a: VolleyballScoreState, b: VolleyballScoreState): boolean {
  return (
    a.scoreA === b.scoreA && a.scoreB === b.scoreB && a.setsA === b.setsA && a.setsB === b.setsB && 
    a.timeoutsA === b.timeoutsA && a.timeoutsB === b.timeoutsB && a.completedSets.length === b.completedSets.length &&
    a.servingTeam === b.servingTeam &&
    a.isTournamentMode === b.isTournamentMode &&
    a.showRotationOnTv === b.showRotationOnTv &&
    JSON.stringify(a.lineupA) === JSON.stringify(b.lineupA) &&
    JSON.stringify(a.lineupB) === JSON.stringify(b.lineupB) &&
    a.subsA === b.subsA && a.subsB === b.subsB &&
    a.cardsA.yellow === b.cardsA.yellow && a.cardsA.red === b.cardsA.red &&
    a.cardsB.yellow === b.cardsB.yellow && a.cardsB.red === b.cardsB.red
  );
}

const INITIAL: VolleyballScoreState = {
  scoreA: 0, scoreB: 0, setsA: 0, setsB: 0, timeoutsA: 0, timeoutsB: 0, completedSets: [], servingTeam: null,
  isTournamentMode: false, showRotationOnTv: true,
  lineupA: ["1", "2", "3", "4", "5", "6"], lineupB: ["1", "2", "3", "4", "5", "6"],
  subsA: 0, subsB: 0, cardsA: { yellow: 0, red: 0 }, cardsB: { yellow: 0, red: 0 }
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

  const pushState = useCallback((nextStateFn: (prev: VolleyballScoreState) => VolleyballScoreState) => {
    setHistory((h) => {
      const prev = h[h.length - 1]!;
      const next = nextStateFn(prev);
      if (sameState(prev, next)) return h;
      return [...h, next];
    });
  }, []);

  const point = useCallback((team: VolleyballTeam) => pushState(prev => applyVolleyballPoint(prev, team, winningSets)), [pushState, winningSets]);
  const timeout = useCallback((team: VolleyballTeam) => pushState(prev => applyTimeout(prev, team)), [pushState]);
  const setServe = useCallback((team: VolleyballTeam) => pushState(prev => applyServe(prev, team)), [pushState]);
  
  const setTournamentMode = useCallback((active: boolean) => pushState(prev => ({ ...prev, isTournamentMode: active })), [pushState]);
  const setShowRotation = useCallback((active: boolean) => pushState(prev => ({ ...prev, showRotationOnTv: active })), [pushState]); // NUEVO
  const setLineup = useCallback((team: VolleyballTeam, lineup: string[]) => pushState(prev => team === "a" ? { ...prev, lineupA: lineup } : { ...prev, lineupB: lineup }), [pushState]);
  const addSubstitution = useCallback((team: VolleyballTeam, newLineup: string[]) => pushState(prev => team === "a" ? { ...prev, subsA: prev.subsA + 1, lineupA: newLineup } : { ...prev, subsB: prev.subsB + 1, lineupB: newLineup }), [pushState]);
  const issueCard = useCallback((team: VolleyballTeam, type: "yellow" | "red") => pushState(prev => applyCard(prev, team, type, winningSets)), [pushState, winningSets]);
  const manualRotate = useCallback((team: VolleyballTeam) => pushState(prev => applyManualRotation(prev, team)), [pushState]);

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
    setTournamentMode, setShowRotation, setLineup, addSubstitution, issueCard, manualRotate
  };
}