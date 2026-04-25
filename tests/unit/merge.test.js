import { describe, it, expect } from "vitest";
import { mergeOps, mergeVersements } from "../logic.js";

// Helpers : timestamps réalistes pour tester l'ordre chronologique
const T = offset => 1_700_000_000_000 + offset;

describe("mergeOps() — RÉGRESSION suppression totale (bug rapporté)", () => {
  it("GS retourne [] après suppression totale — le cache local ne ressuscite PAS les ops", () => {
    // Scénario exact du bug :
    //   PC supprime tout → GS vide
    //   Téléphone a 3 ops en cache depuis avant la suppression
    //   lastSync est AVANT la suppression mais APRÈS la création des ops
    const lastSync = T(500); // dernier sync réussi
    const oldOps = [
      { id: T(100), hasDpf: true, qty: 1 }, // créée bien avant lastSync
      { id: T(200), hasDpf: true, qty: 2 },
      { id: T(300), hasFlex: true, revenue: 5000 },
    ];
    // GS returns [] — suppression totale intentionnelle
    const merged = mergeOps([], oldOps, lastSync);
    expect(merged).toHaveLength(0); // doit rester vide, pas de résurrection
  });

  it("GS retourne [] sans lastSync (première utilisation) — le cache local est conservé", () => {
    // Scénario : première utilisation, GS jamais rempli, local a des données
    const lastSync = 0; // jamais syncé
    const localOps = [{ id: T(100), hasDpf: true, qty: 1 }];
    const merged = mergeOps([], localOps, lastSync);
    // Avec lastSync=0, l'op a id > 0 donc elle est considérée "nouvelle" → conservée
    expect(merged).toHaveLength(1);
  });
});

describe("mergeOps() — bug de résurrection (suppression partielle)", () => {
  it("op supprimée dans Sheets ne ressuscite pas depuis le cache local", () => {
    const op = { id: T(100), hasDpf: true, qty: 1, versé: false };
    // GS n'a plus l'op (supprimée), local l'a encore
    const merged = mergeOps([], [op], T(200)); // lastSync > id → op ancienne
    expect(merged).toHaveLength(0);
  });

  it("op supprimée dans Sheets (parmi d'autres) ne ressuscite pas", () => {
    const opA = { id: T(100), hasDpf: true, qty: 1 };
    const opB = { id: T(200), hasDpf: true, qty: 2 };
    // GS a seulement opB, opA supprimée
    const merged = mergeOps([opB], [opA, opB], T(300));
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe(T(200));
  });

  it("op créée hors ligne (id > lastSync) est préservée malgré son absence dans Sheets", () => {
    const lastSync = T(100);
    const newOp = { id: T(200), hasDpf: true, qty: 1 }; // créée après lastSync
    const merged = mergeOps([], [newOp], lastSync);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe(T(200));
  });

  it("op créée avant lastSync et absente de Sheets est ignorée (ancienne suppression)", () => {
    const lastSync = T(300);
    const oldOp = { id: T(100), hasDpf: true, qty: 1 }; // créée avant lastSync
    const merged = mergeOps([], [oldOp], lastSync);
    expect(merged).toHaveLength(0);
  });
});

describe("mergeOps() — préservation des booléens forward-state", () => {
  it("versé=true local préservé quand Sheets a false (confirmation hors ligne)", () => {
    const id = T(100);
    const lastSync = T(0);
    const sheetOp = { id, hasDpf: true, qty: 1, versé: false };
    const localOp = { id, hasDpf: true, qty: 1, versé: true };
    const merged = mergeOps([sheetOp], [localOp], lastSync);
    expect(merged[0].versé).toBe(true);
  });

  it("versé=true dans Sheets préservé même si local a false", () => {
    const id = T(100);
    const sheetOp = { id, versé: true };
    const localOp = { id, versé: false };
    const merged = mergeOps([sheetOp], [localOp], T(0));
    expect(merged[0].versé).toBe(true);
  });

  it("donVersé=true local préservé", () => {
    const id = T(100);
    const merged = mergeOps(
      [{ id, donVersé: false }],
      [{ id, donVersé: true }],
      T(0)
    );
    expect(merged[0].donVersé).toBe(true);
  });

  it("Sheets gagne pour les champs de contenu (dpfRate modifié ailleurs)", () => {
    const id = T(100);
    const merged = mergeOps(
      [{ id, dpfRate: 3000, versé: false }],
      [{ id, dpfRate: 2500, versé: false }],
      T(0)
    );
    expect(merged[0].dpfRate).toBe(3000);
  });

  it("op uniquement dans Sheets, absente en local → retournée telle quelle", () => {
    const op = { id: T(100), hasDpf: true, qty: 1, versé: false };
    const merged = mergeOps([op], [], T(0));
    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual(op);
  });
});

describe("mergeOps() — tri et ordre", () => {
  it("résultat trié par id décroissant (plus récent en premier)", () => {
    const ops = [{ id: T(1) }, { id: T(3) }, { id: T(2) }];
    const merged = mergeOps(ops, [], T(0));
    expect(merged[0].id).toBe(T(3));
    expect(merged[1].id).toBe(T(2));
    expect(merged[2].id).toBe(T(1));
  });

  it("ajouts hors ligne intégrés dans le bon ordre", () => {
    const lastSync = T(100);
    const sheetsOp = { id: T(50) };
    const newLocalOp = { id: T(200) }; // après lastSync
    const merged = mergeOps([sheetsOp], [newLocalOp], lastSync);
    expect(merged[0].id).toBe(T(200));
    expect(merged[1].id).toBe(T(50));
  });
});

describe("mergeVersements() — bug de résurrection", () => {
  it("versement supprimé dans Sheets ne ressuscite pas", () => {
    const v = { id: T(100), montant: 5000, confirméAhmed: false };
    const merged = mergeVersements([], [v], T(200));
    expect(merged).toHaveLength(0);
  });

  it("nouveau versement hors ligne (id > lastSync) préservé", () => {
    const v = { id: T(300), montant: 3000, confirméAhmed: false };
    const merged = mergeVersements([], [v], T(200));
    expect(merged).toHaveLength(1);
  });
});

describe("mergeVersements() — booléens forward-state", () => {
  it("confirméAhmed=true local préservé quand Sheets a false", () => {
    const id = T(100);
    const merged = mergeVersements(
      [{ id, montant: 5000, confirméAhmed: false }],
      [{ id, montant: 5000, confirméAhmed: true }],
      T(0)
    );
    expect(merged[0].confirméAhmed).toBe(true);
  });

  it("confirméAhmed=true Sheets préservé même si local a false", () => {
    const id = T(100);
    const merged = mergeVersements(
      [{ id, montant: 5000, confirméAhmed: true }],
      [{ id, montant: 5000, confirméAhmed: false }],
      T(0)
    );
    expect(merged[0].confirméAhmed).toBe(true);
  });

  it("montant vient de Sheets (source de vérité)", () => {
    const id = T(100);
    const merged = mergeVersements(
      [{ id, montant: 6000, confirméAhmed: false }],
      [{ id, montant: 5000, confirméAhmed: false }],
      T(0)
    );
    expect(merged[0].montant).toBe(6000);
  });
});
