import type { MatchRecord, MatchStage } from '../types';

export type MatchScope = MatchStage | 'all';

// Los partidos guardados antes de introducir la fase pertenecen a la
// pretemporada. Así conservamos su historial sin mezclarlo con la liga.
export const getMatchStage = (match: Pick<MatchRecord, 'stage'>): MatchStage => match.stage === 'league' ? 'league' : 'preseason';

export const matchesInScope = (matches: MatchRecord[], scope: MatchScope): MatchRecord[] => (
  scope === 'all' ? matches : matches.filter((match) => getMatchStage(match) === scope)
);

export const matchStageLabel = (stage: MatchStage): string => stage === 'league' ? 'Liga' : 'Pretemporada';

export const matchScopeLabel = (scope: MatchScope): string => scope === 'all' ? 'Todo el historial' : matchStageLabel(scope);
