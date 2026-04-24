// Active character — stocké dans localStorage pour persister cross-studios (Generate / Cinema / Video).
// Pattern inspiré Higgsfield Soul ID : un perso actif global que tous les studios peuvent consommer.
//
// Shape : { id, name, description, outfit, refUrls: [...], klingElementId?: string }
// Null = pas de perso actif (fallback bible pour Generate, ou pas de ref pour Cinema/Video).

const STORAGE_KEY = 'ivamind:active-character';

export function getActiveCharacter() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveCharacter(character) {
  if (typeof window === 'undefined') return;
  try {
    if (!character) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(character));
    }
    // Broadcast pour que les autres tabs/composants puissent react
    window.dispatchEvent(new CustomEvent('ivamind:active-character-change', { detail: character }));
  } catch {}
}

export function clearActiveCharacter() {
  setActiveCharacter(null);
}

// React hook — subscribe aux changements, re-render quand l'active character change.
// Import dans un composant client : const active = useActiveCharacter();
export function useActiveCharacter() {
  // Note : lazy import React uniquement si appelé côté client.
  const { useState, useEffect } = require('react');
  const [active, setActive] = useState(getActiveCharacter());

  useEffect(() => {
    const handler = (e) => setActive(e.detail);
    const storageHandler = (e) => {
      if (e.key === STORAGE_KEY) setActive(getActiveCharacter());
    };
    window.addEventListener('ivamind:active-character-change', handler);
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener('ivamind:active-character-change', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }, []);

  return active;
}
