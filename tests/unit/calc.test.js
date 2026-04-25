import { describe, it, expect } from "vitest";
import { calc } from "../logic.js";

describe("calc() — DPF Cleaner", () => {
  it("gain par défaut 2500 DA, 1 opération", () => {
    const r = calc({ hasDpf: true, hasFlex: false, qty: 1 });
    expect(r.brut).toBe(2500);
    expect(r.don).toBe(125);   // 5%
    expect(r.net).toBe(2375);
  });

  it("gain par défaut 2500 DA, plusieurs opérations", () => {
    const r = calc({ hasDpf: true, hasFlex: false, qty: 3 });
    expect(r.brut).toBe(7500);
    expect(r.net).toBe(7125);
  });

  it("dpfRate personnalisé respecté", () => {
    const r = calc({ hasDpf: true, hasFlex: false, qty: 2, dpfRate: 3000 });
    expect(r.brut).toBe(6000);
    expect(r.don).toBe(300);
    expect(r.net).toBe(5700);
  });

  it("qty absent → défaut 1", () => {
    const r = calc({ hasDpf: true, hasFlex: false });
    expect(r.brut).toBe(2500);
  });
});

describe("calc() — Flex Logiciel", () => {
  it("25% du revenu atelier", () => {
    const r = calc({ hasDpf: false, hasFlex: true, revenue: 10000 });
    expect(r.brut).toBe(2500);
    expect(r.don).toBe(125);
    expect(r.net).toBe(2375);
  });

  it("revenu 0 → tout à 0", () => {
    const r = calc({ hasDpf: false, hasFlex: true, revenue: 0 });
    expect(r.brut).toBe(0);
    expect(r.don).toBe(0);
    expect(r.net).toBe(0);
  });

  it("revenu absent → défaut 0", () => {
    const r = calc({ hasDpf: false, hasFlex: true });
    expect(r.brut).toBe(0);
  });

  it("arrondi Math.round correct", () => {
    // 25% de 10001 = 2500.25 → arrondi 2500
    const r = calc({ hasDpf: false, hasFlex: true, revenue: 10001 });
    expect(r.brut).toBe(2500);
  });
});

describe("calc() — Combo DPF + Flex", () => {
  it("somme des deux services", () => {
    const r = calc({ hasDpf: true, hasFlex: true, qty: 1, dpfRate: 2500, revenue: 10000 });
    expect(r.brut).toBe(5000);  // 2500 + 2500
    expect(r.don).toBe(250);
    expect(r.net).toBe(4750);
  });

  it("combo avec dpfRate personnalisé", () => {
    const r = calc({ hasDpf: true, hasFlex: true, qty: 2, dpfRate: 3000, revenue: 8000 });
    expect(r.brut).toBe(8000);  // 6000 + 2000
    expect(r.net).toBe(7600);
  });
});

describe("calc() — Don personnalisé", () => {
  it("donMontant fixe override le 5%", () => {
    const r = calc({ hasDpf: true, hasFlex: false, qty: 1, donMontant: 200 });
    expect(r.don).toBe(200);
    expect(r.net).toBe(2300);
  });

  it("donMontant = 0 est valide (don nul)", () => {
    const r = calc({ hasDpf: true, hasFlex: false, qty: 1, donMontant: 0 });
    expect(r.don).toBe(0);
    expect(r.net).toBe(2500);
  });

  it("donMontant = null → retour au calcul 5%", () => {
    const r = calc({ hasDpf: true, hasFlex: false, qty: 1, donMontant: null });
    expect(r.don).toBe(125);
  });

  it("don personnalisé supérieur au brut → net négatif possible", () => {
    const r = calc({ hasDpf: true, hasFlex: false, qty: 1, donMontant: 3000 });
    expect(r.don).toBe(3000);
    expect(r.net).toBe(-500);
  });
});

describe("calc() — aucun service", () => {
  it("ni DPF ni Flex → tout à 0", () => {
    const r = calc({ hasDpf: false, hasFlex: false });
    expect(r.brut).toBe(0);
    expect(r.don).toBe(0);
    expect(r.net).toBe(0);
  });
});
