import type { GameObject, GameState, ThoughtCard } from './types';

function withObject(state: GameState, targetId: string, update: (object: GameObject) => GameObject): GameState {
  return {
    ...state,
    objects: state.objects.map((object) => object.id === targetId ? update(object) : object)
  };
}

function recordUse(state: GameState, card: ThoughtCard): GameState {
  if (state.cardUsesLeft <= 0) return state;

  return {
    ...state,
    cardUsesLeft: state.cardUsesLeft - 1,
    usedCards: [...state.usedCards, card]
  };
}

export function applyThoughtCard(state: GameState, card: ThoughtCard): GameState {
  if (state.cardUsesLeft <= 0 || !state.availableCards.includes(card.type)) {
    return state;
  }

  const usedState = recordUse(state, card);

  if (card.type === 'delay') {
    return {
      ...usedState,
      rules: usedState.rules.filter((rule) => rule.id !== card.ruleId)
    };
  }

  if (card.type === 'exception') {
    return withObject(usedState, card.target, (object) => ({
      ...object,
      traits: object.traits.includes('hidden') ? object.traits : [...object.traits, 'hidden']
    }));
  }

  if (card.type === 'sacrifice') {
    return withObject(usedState, card.target, (object) => ({
      ...object,
      traits: object.traits.filter((trait) => trait !== card.trait)
    }));
  }

  return state;
}
