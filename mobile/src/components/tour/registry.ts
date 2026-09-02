import { useEffect, useRef, type RefObject } from 'react';
import { View } from 'react-native';

const targets = new Map<string, RefObject<View | null>>();

/**
 * Regista um elemento da UI como alvo do tour de boas-vindas.
 * A cada ecrã que quer ser destacado chama este hook e aplica o ref no View alvo.
 */
export function useTourTarget(id: string): RefObject<View | null> {
  const ref = useRef<View>(null);

  useEffect(() => {
    targets.set(id, ref);
    return () => {
      if (targets.get(id) === ref) targets.delete(id);
    };
  }, [id]);

  return ref;
}

export function getTourTarget(id: string): RefObject<View | null> | undefined {
  return targets.get(id);
}
