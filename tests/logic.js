// Fonctions métier extraites de index.html — source de vérité pour les tests.
// Toute modification dans index.html doit être répercutée ici.

export function calc(e) {
  let b = 0;
  if (e.hasDpf) b += (e.dpfRate || 2500) * (e.qty || 1);
  if (e.hasFlex) b += Math.round((e.revenue || 0) * 0.25);
  const d = e.donMontant != null ? e.donMontant : Math.round(b * 0.05);
  return { brut: b, don: d, net: b - d };
}

export function mergeOps(sheetsOps, localOps, lastSync) {
  const sheetsMap = {};
  sheetsOps.forEach(o => (sheetsMap[o.id] = o));
  const localMap = {};
  localOps.forEach(o => (localMap[o.id] = o));

  const merged = sheetsOps.map(so => {
    const lo = localMap[so.id];
    if (!lo) return so;
    return { ...so, versé: so.versé || lo.versé, donVersé: so.donVersé || lo.donVersé };
  });

  localOps
    .filter(o => !sheetsMap[o.id] && o.id > lastSync)
    .forEach(o => merged.push(o));

  return merged.sort((a, b) => b.id - a.id);
}

export function mergeVersements(sheetsV, localV, lastSync) {
  const sheetsMap = {};
  sheetsV.forEach(v => (sheetsMap[v.id] = v));
  const localMap = {};
  localV.forEach(v => (localMap[v.id] = v));

  const merged = sheetsV.map(sv => {
    const lv = localMap[sv.id];
    if (!lv) return sv;
    return { ...sv, confirméAhmed: sv.confirméAhmed || lv.confirméAhmed };
  });

  localV
    .filter(v => !sheetsMap[v.id] && v.id > lastSync)
    .forEach(v => merged.push(v));

  return merged.sort((a, b) => b.id - a.id);
}

export function enAttente(ops, versements) {
  const unversedNet = ops
    .filter(o => !o.versé)
    .reduce((s, o) => s + calc(o).net, 0);
  const confirmedV = versements
    .filter(v => v.confirméAhmed && v.type !== "don")
    .reduce((s, v) => s + v.montant, 0);
  return Math.max(0, unversedNet - confirmedV);
}
