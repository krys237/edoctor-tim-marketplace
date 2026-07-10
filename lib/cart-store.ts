"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const MAX_QUANTITY = 99;

/**
 * Une ligne de panier ne contient QUE l'identifiant et la quantite.
 *
 * Le prix n'est jamais persiste : un montant fige dans le localStorage
 * deviendrait faux au premier changement de tarif, et l'utilisateur verrait un
 * prix perime. Le prix est toujours re-resolu depuis le catalogue a l'affichage,
 * puis re-resolu une seconde fois cote serveur au moment de la commande.
 */
export type CartItem = { productId: string; quantity: number };

type CartState = {
  items: CartItem[];
  /** Faux tant que le localStorage n'a pas ete relu : evite un ecart d'hydratation. */
  hydrated: boolean;
  setHydrated: () => void;
  add: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

function clampQuantity(value: number): number {
  const n = Math.trunc(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_QUANTITY);
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hydrated: false,

      /*
        Passe par le `set` du createur plutot que par `useCart.setState` :
        le rappel de rehydratation s'execute pendant la construction du store,
        alors que la constante `useCart` n'est pas encore affectee.
      */
      setHydrated: () => set({ hydrated: true }),

      add: (productId, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === productId);
          if (!existing) {
            return { items: [...state.items, { productId, quantity: clampQuantity(quantity) }] };
          }
          return {
            items: state.items.map((i) =>
              i.productId === productId
                ? { ...i, quantity: clampQuantity(i.quantity + quantity) }
                : i,
            ),
          };
        }),

      setQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity: clampQuantity(quantity) } : i,
          ),
        })),

      remove: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

      clear: () => set({ items: [] }),
    }),
    {
      name: "edoctor-panier",
      version: 1,
      /*
        Pas de `storage` personnalise : le defaut de zustand est deja
        localStorage, et il gere l'absence de `window` pendant le rendu serveur.
        Un getter renvoyant `undefined` faisait sortir `persist` sans jamais
        appeler le rappel ci-dessous — le panier restait bloque sur son
        squelette de chargement.
      */
      // `hydrated` est un etat d'execution, il n'a rien a faire sur le disque.
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
