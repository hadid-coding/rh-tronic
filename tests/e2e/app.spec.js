import { test, expect } from "@playwright/test";

// Mock GS API pour tous les tests (pas de vrai appel réseau)
test.beforeEach(async ({ page }) => {
  await page.route("https://script.google.com/**", async route => {
    if (route.request().method() === "POST") {
      await route.fulfill({ body: JSON.stringify({ status: "ok" }), contentType: "application/json" });
    } else {
      await route.fulfill({ body: JSON.stringify({ ops: [], versements: [] }), contentType: "application/json" });
    }
  });
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
});

// ---------------------------------------------------------------------------
// Page d'accueil
// ---------------------------------------------------------------------------
test("affiche la page de sélection de mode", async ({ page }) => {
  await expect(page.getByText("RH Tronic")).toBeVisible();
  await expect(page.getByText("Ramzi")).toBeVisible();
  await expect(page.getByText("Ahmed")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Navigation et onglets
// ---------------------------------------------------------------------------
test("mode Ramzi — 4 onglets visibles dont Versements", async ({ page }) => {
  await page.getByText("Ramzi").click();
  await expect(page.getByRole("button", { name: /Ops/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Stats/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Résumé/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Vers/ })).toBeVisible();
});

test("mode Ahmed — bouton Vers. visible", async ({ page }) => {
  await page.getByText("Ahmed").click();
  await expect(page.getByRole("button", { name: /Vers/ })).toBeVisible();
});

test("bouton Changer revient à la sélection de mode", async ({ page }) => {
  await page.getByText("Ramzi").click();
  await page.getByRole("button", { name: "Changer" }).click();
  await expect(page.getByText("Ramzi")).toBeVisible();
  await expect(page.getByText("Ahmed")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Création d'opérations
// ---------------------------------------------------------------------------
test("créer une opération DPF avec valeurs par défaut", async ({ page }) => {
  await page.getByText("Ramzi").click();
  await page.getByText("Ajouter une opération").click();
  await page.getByText("✓ Enregistrer").click();
  await expect(page.getByText("DPF Cleaner")).toBeVisible();
});

test("formulaire DPF affiche 2500 DA comme gain par défaut", async ({ page }) => {
  await page.getByText("Ramzi").click();
  await page.getByText("Ajouter une opération").click();
  await expect(page.getByText(/2 500 DA/)).toBeVisible();
});

test("créer une opération Flex", async ({ page }) => {
  await page.getByText("Ramzi").click();
  await page.getByText("Ajouter une opération").click();
  await page.getByRole("button", { name: /DPF/ }).click(); // désélectionner DPF
  await page.getByRole("button", { name: /Flex/ }).click(); // sélectionner Flex
  await page.locator("input[type=number]").filter({ hasText: "" }).first().fill("10000");
  await page.getByText("✓ Enregistrer").click();
  await expect(page.getByText("Flex Logiciel")).toBeVisible();
});

test("supprimer une opération", async ({ page }) => {
  await page.getByText("Ramzi").click();
  await page.getByText("Ajouter une opération").click();
  await page.getByText("✓ Enregistrer").click();
  await expect(page.getByText("DPF Cleaner")).toBeVisible();
  await page.getByRole("button", { name: "🗑️" }).click();
  await page.getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByText("Aucune opération enregistrée")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Opération : marquer versé et don versé
// ---------------------------------------------------------------------------
test("carte opération — pas de bouton Marquer versé (supprimé)", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("rh-tronic-ops-v2", JSON.stringify([
      { id: 1000, hasDpf: true, qty: 1, dpfRate: 2500, versé: false, donVersé: false, date: "01/01/2025", note: "" },
    ]));
  });
  await page.goto("/");
  await page.getByText("Ramzi").click();
  await expect(page.getByRole("button", { name: /Marquer versé/ })).not.toBeVisible();
});

test("Ramzi enregistre un versement de don", async ({ page }) => {
  await page.getByText("Ramzi").click();
  await page.getByRole("button", { name: /Vers/ }).click();
  await page.getByText("Verser le don").click();
  await expect(page.getByText(/Versement don/i)).toBeVisible();
  await page.locator("input[type=number]").first().fill("300");
  await page.getByText("✓ Enregistrer").click();
  await expect(page.getByText("300 DA")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Versements partiels
// ---------------------------------------------------------------------------
test("onglet Versements — solde affiché", async ({ page }) => {
  await page.getByText("Ramzi").click();
  await page.getByRole("button", { name: /Vers/ }).click();
  await expect(page.getByText("Restant à verser à Ahmed")).toBeVisible();
});

test("Ramzi enregistre un versement", async ({ page }) => {
  await page.getByText("Ramzi").click();
  await page.getByRole("button", { name: /Vers/ }).click();
  await page.getByText("Enregistrer un versement").click();
  await expect(page.getByText("Nouveau versement à Ahmed")).toBeVisible();
  await page.locator("input[type=number]").first().fill("5000");
  await page.getByText("✓ Enregistrer").click();
  await expect(page.getByText("5 000 DA")).toBeVisible();
  await expect(page.getByText("En attente confirmation Ahmed")).toBeVisible();
});

test("Ahmed confirme la réception d'un versement", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("rht-versements-v1", JSON.stringify([
      { id: 1000, montant: 5000, date: "01/01/2025", note: "", confirméAhmed: false },
    ]));
  });
  await page.goto("/");
  await page.getByText("Ahmed").click();
  await page.getByRole("button", { name: /Vers/ }).click();
  await expect(page.getByText("5 000 DA")).toBeVisible();
  await page.getByRole("button", { name: /Confirmer réception/ }).click();
  await expect(page.getByText("Reçu par Ahmed")).toBeVisible();
});

test("Ramzi ne peut pas confirmer un versement (bouton absent)", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("rht-versements-v1", JSON.stringify([
      { id: 1000, montant: 5000, date: "01/01/2025", note: "", confirméAhmed: false },
    ]));
  });
  await page.goto("/");
  await page.getByText("Ramzi").click();
  await page.getByRole("button", { name: /Vers/ }).click();
  await expect(page.getByRole("button", { name: /Confirmer réception/ })).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// Stats et Résumé
// ---------------------------------------------------------------------------
test("onglet Stats affiche les 4 tuiles de résumé", async ({ page }) => {
  await page.getByText("Ramzi").click();
  await page.getByRole("button", { name: /Stats/ }).click();
  await expect(page.getByText("Revenu net total")).toBeVisible();
  await expect(page.getByText("En attente")).toBeVisible();
  await expect(page.getByText("Total brut")).toBeVisible();
  await expect(page.getByText("Dons versés")).toBeVisible();
});

test("onglet Résumé affiche les totaux", async ({ page }) => {
  await page.getByText("Ahmed").click();
  await page.getByRole("button", { name: /Résumé/ }).click();
  await expect(page.getByText("Total brut")).toBeVisible();
  await expect(page.getByText("Net total")).toBeVisible();
  await expect(page.getByText("En attente versement")).toBeVisible();
});
