import type { ConversationStage } from './schemas';

export type ConversationState = { stage: ConversationStage; question: number; answers: Record<string, unknown>; history: Array<{ stage: ConversationStage; question: number }>; pendingExtraction: Record<string, unknown> | null };
export type ConversationAction =
  | { type: 'answer'; values: Record<string, unknown> }
  | { type: 'next'; maxQuestions: number }
  | { type: 'back' }
  | { type: 'edit-stage'; stage: ConversationStage }
  | { type: 'set-extraction'; value: Record<string, unknown> }
  | { type: 'confirm-extraction' }
  | { type: 'clear-extraction' };

const stages: ConversationStage[] = ['home', 'lifestyle', 'readiness', 'profile', 'preview'];
export const initialConversationState: ConversationState = { stage: 'home', question: 0, answers: {}, history: [], pendingExtraction: null };

export function conversationReducer(state: ConversationState, action: ConversationAction): ConversationState {
  if (action.type === 'answer') return { ...state, answers: { ...state.answers, ...action.values } };
  if (action.type === 'set-extraction') return { ...state, pendingExtraction: action.value };
  if (action.type === 'confirm-extraction') return state.pendingExtraction ? { ...state, answers: { ...state.answers, ...state.pendingExtraction }, pendingExtraction: null } : state;
  if (action.type === 'clear-extraction') return { ...state, pendingExtraction: null };
  if (action.type === 'edit-stage') return { ...state, stage: action.stage, question: 0, pendingExtraction: null };
  if (action.type === 'back') { const previous = state.history.at(-1); return previous ? { ...state, ...previous, history: state.history.slice(0, -1), pendingExtraction: null } : state; }
  if (action.type === 'next') {
    const history = [...state.history, { stage: state.stage, question: state.question }];
    if (state.question + 1 < action.maxQuestions) return { ...state, question: state.question + 1, history, pendingExtraction: null };
    const nextStage = stages[Math.min(stages.indexOf(state.stage) + 1, stages.length - 1)];
    return { ...state, stage: nextStage, question: 0, history, pendingExtraction: null };
  }
  return state;
}

