import type { ExtractionResult } from './deterministic-extractor';
import { extractLifestyle, extractMoveInTiming, generateBio } from './deterministic-extractor';

export type RoommateAIRequest = { field: 'move_in_timing' | 'lifestyle' | 'bio'; text: string; current?: Record<string, unknown>; tone?: 'default' | 'warmer' | 'shorter' };
export interface RoommateAIProvider { extractStructuredAnswer(request: RoommateAIRequest): Promise<ExtractionResult>; }

export const deterministicRoommateProvider: RoommateAIProvider = {
  async extractStructuredAnswer(request) {
    if (request.field === 'move_in_timing') return extractMoveInTiming(request.text);
    if (request.field === 'lifestyle') return extractLifestyle(request.text);
    return generateBio(request.text, request.tone);
  },
};

export function getRoommateAIProvider(): RoommateAIProvider {
  // No paid provider is configured. This interface is intentionally replaceable.
  return deterministicRoommateProvider;
}

