import type { CandidateBlock, CanonicalCandidate, MatchScore, NormalizedListingObservation } from "./types";

const MATCH_THRESHOLD = 0.78;
const GENERIC_TITLE_TOKENS = new Set(["apartament", "casa", "vila", "teren", "camere", "camera", "de", "cu", "si", "in", "la"]);

export function buildCandidateBlock(observation: NormalizedListingObservation): CandidateBlock {
  return {
    city: observation.city ?? "unknown",
    district: observation.district ?? "unknown",
    propertyType: observation.propertyType,
    transactionType: observation.transactionType,
    roomsBand: observation.rooms === undefined ? "unknown" : String(observation.rooms),
    areaBand: observation.areaSqm === undefined ? "unknown" : `${Math.floor(observation.areaSqm / 10) * 10}-${Math.floor(observation.areaSqm / 10) * 10 + 9}`
  };
}

export function scoreCandidateMatch(observation: NormalizedListingObservation, candidate: CanonicalCandidate): MatchScore {
  const reasons: string[] = [];
  let score = 0;

  if (sameLocation(observation, candidate)) {
    score += 0.18;
    reasons.push("same_location");
  }

  if (observation.propertyType === candidate.propertyType) {
    score += 0.12;
    reasons.push("same_property_type");
  }

  if (observation.transactionType === candidate.transactionType) {
    score += 0.08;
    reasons.push("same_transaction_type");
  }

  if (compatibleRooms(observation.rooms, candidate.rooms)) {
    score += 0.1;
    reasons.push("rooms_compatible");
  }

  if (closeRatio(observation.priceEur, candidate.priceEur, 0.05)) {
    score += 0.13;
    reasons.push("price_close");
  }

  if (closeRatio(observation.areaSqm, candidate.areaSqm, 0.15)) {
    score += 0.13;
    reasons.push("area_close");
  }

  if (compatibleFloor(observation.floor, candidate.floor)) {
    score += 0.06;
    reasons.push("floor_compatible");
  }

  const titleScore = Math.max(
    tokenSimilarity(observation.searchText, candidate.searchText),
    tokenSimilarity(compactTokenText(observation.title), compactTokenText(candidate.title))
  );
  if (titleScore >= 0.35) {
    score += Math.min(0.15, titleScore * 0.15);
    reasons.push("title_similar");
  }

  if (observation.phoneHash && candidate.sourceSignals?.phoneHash && observation.phoneHash === candidate.sourceSignals.phoneHash) {
    score += 0.1;
    reasons.push("same_phone_hash");
  }

  return {
    score: Number(score.toFixed(3)),
    threshold: MATCH_THRESHOLD,
    reasons,
    candidateId: candidate.canonicalListingId
  };
}

export function shouldLinkCandidate(score: MatchScore): boolean {
  return score.score >= score.threshold;
}

function sameLocation(observation: NormalizedListingObservation, candidate: CanonicalCandidate): boolean {
  if (observation.city && candidate.city && observation.city !== candidate.city) {
    return false;
  }
  if (observation.district && candidate.district && observation.district !== candidate.district) {
    return false;
  }
  if (observation.neighborhood && candidate.neighborhood && observation.neighborhood !== candidate.neighborhood) {
    return false;
  }
  return Boolean(observation.city && candidate.city);
}

function compatibleRooms(left: number | undefined, right: number | undefined): boolean {
  return left !== undefined && right !== undefined && Math.abs(left - right) <= 1;
}

function compatibleFloor(left: number | undefined, right: number | undefined): boolean {
  return left !== undefined && right !== undefined && Math.abs(left - right) <= 1;
}

function closeRatio(left: number | undefined, right: number | undefined, tolerance: number): boolean {
  if (left === undefined || right === undefined || left <= 0 || right <= 0) {
    return false;
  }
  return Math.abs(left - right) / Math.max(left, right) <= tolerance;
}

function tokenSimilarity(left: string, right: string): number {
  const leftTokens = significantTokens(left);
  const rightTokens = significantTokens(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  }

  return intersection / new Set([...leftTokens, ...rightTokens]).size;
}

function significantTokens(value: string): Set<string> {
  return new Set(
    value
      .split(/\s+/)
      .filter((token) => token.length > 2)
      .filter((token) => !GENERIC_TITLE_TOKENS.has(token))
  );
}

function compactTokenText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
