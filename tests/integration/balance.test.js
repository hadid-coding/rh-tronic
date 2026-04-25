import { describe, it, expect } from "vitest";
import { calc, enAttente } from "../logic.js";

// Helpers
const dpf = (id, qty = 1, dpfRate = 2500, versé = false) => ({
  id, hasDpf: true, hasFlex: false, qty, dpfRate, versé,
});
const flex = (id, revenue, versé = false) => ({
  id, hasDpf: false, hasFlex: true, revenue, versé,
});
const versement = (id, montant, confirméAhmed = true) => ({
  id, montant, confirméAhmed,
});

describe("enAttente() — solde de base", () => {
  it("aucune opération → 0", () => {
    expect(enAttente([], [])).toBe(0);
  });

  it("une opération DPF non versée → net complet en attente", () => {
    expect(enAttente([dpf(1)], [])).toBe(2375); // 2500 - 125
  });

  it("opération marquée versée → exclue du solde", () => {
    const ops = [dpf(1, 1, 2500, true), dpf(2, 1, 2500, false)];
    expect(enAttente(ops, [])).toBe(2375); // seulement op2
  });

  it("plusieurs opérations non versées → somme des nets", () => {
    const ops = [dpf(1), dpf(2), dpf(3)];
    expect(enAttente(ops, [])).toBe(7125); // 3 × 2375
  });
});

describe("enAttente() — versements partiels", () => {
  it("versement confirmé déduit du solde", () => {
    const ops = [dpf(1, 2)]; // brut 5000, net 4750
    const vers = [versement(10, 1000)];
    expect(enAttente(ops, vers)).toBe(3750);
  });

  it("versement non confirmé ne déduit pas", () => {
    const ops = [dpf(1)]; // net 2375
    const vers = [versement(10, 1000, false)];
    expect(enAttente(ops, vers)).toBe(2375);
  });

  it("plusieurs versements confirmés cumulés", () => {
    const ops = [dpf(1, 4)]; // net 9500
    const vers = [
      versement(10, 3000),
      versement(11, 2000),
      versement(12, 1000, false), // non confirmé
    ];
    expect(enAttente(ops, vers)).toBe(4500); // 9500 - 5000
  });

  it("versements couvrant exactement le solde → 0", () => {
    const ops = [dpf(1)]; // net 2375
    const vers = [versement(10, 2375)];
    expect(enAttente(ops, vers)).toBe(0);
  });

  it("versements supérieurs au solde → jamais négatif (plancher à 0)", () => {
    const ops = [dpf(1)]; // net 2375
    const vers = [versement(10, 99999)];
    expect(enAttente(ops, vers)).toBe(0);
  });
});

describe("enAttente() — combinaisons DPF + Flex + versements", () => {
  it("combo DPF + Flex avec versement partiel", () => {
    const ops = [
      { id: 1, hasDpf: true, hasFlex: true, qty: 1, dpfRate: 2500, revenue: 10000, versé: false },
    ]; // brut 5000, net 4750
    const vers = [versement(10, 2000)];
    expect(enAttente(ops, vers)).toBe(2750);
  });

  it("mix d'opérations versées et non versées avec versements partiels", () => {
    const ops = [
      dpf(1, 1, 2500, true),  // versé individuellement → exclu
      dpf(2, 1, 2500, false), // net 2375
      flex(3, 8000, false),   // net 25%×8000 - 5% = 1900
    ];
    const vers = [versement(10, 500)];
    // en attente = (2375 + 1900) - 500 = 3775
    expect(enAttente(ops, vers)).toBe(3775);
  });
});

describe("enAttente() — versements de type don exclus du solde", () => {
  it("versement de type don confirmé ne déduit pas du solde gain", () => {
    const ops = [dpf(1)]; // net 2375
    const vers = [{ id: 10, montant: 1000, confirméAhmed: true, type: "don" }];
    expect(enAttente(ops, vers)).toBe(2375); // don ignoré
  });

  it("versement de type gain confirmé déduit normalement", () => {
    const ops = [dpf(1)]; // net 2375
    const vers = [{ id: 10, montant: 1000, confirméAhmed: true, type: "gain" }];
    expect(enAttente(ops, vers)).toBe(1375);
  });

  it("mix don et gain — seul le gain déduit", () => {
    const ops = [dpf(1, 2)]; // net 4750
    const vers = [
      { id: 10, montant: 2000, confirméAhmed: true, type: "gain" },
      { id: 11, montant: 500, confirméAhmed: true, type: "don" },
    ];
    expect(enAttente(ops, vers)).toBe(2750); // 4750 - 2000
  });
});

describe("calc() — cohérence brut/don/net", () => {
  it("brut = don + net pour tout dpfRate", () => {
    [1000, 2500, 3000, 5000].forEach(rate => {
      const r = calc({ hasDpf: true, hasFlex: false, qty: 1, dpfRate: rate });
      expect(r.brut).toBe(r.don + r.net);
    });
  });

  it("brut = don + net avec don personnalisé", () => {
    const r = calc({ hasDpf: true, hasFlex: false, qty: 1, donMontant: 300 });
    expect(r.brut).toBe(r.don + r.net);
  });

  it("brut = don + net pour Flex", () => {
    const r = calc({ hasDpf: false, hasFlex: true, revenue: 20000 });
    expect(r.brut).toBe(r.don + r.net);
  });
});
