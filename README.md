# RH Tronic 🔧

Application web mobile (PWA) de suivi des revenus du partenariat entre **Ramzi** et **Ahmed** pour les services DPF Cleaner et Flex Logiciel.

---

## Contexte

Ramzi effectue des opérations en atelier (nettoyage DPF et reprogrammation Flex). Ahmed est son partenaire. Chaque opération génère un revenu dont 5 % est reversé en don caritatif. L'application permet de tout enregistrer, de suivre les versements, et de synchroniser les données entre les deux utilisateurs via Google Sheets.

---

## Accès & modes utilisateur

Au démarrage, l'application demande qui se connecte :

| Mode | Accès |
|---|---|
| **👷 Ramzi** | Créer, modifier, supprimer des opérations · Enregistrer des versements · Marquer le don comme versé |
| **🤝 Ahmed** | Consulter toutes les opérations · Confirmer la réception d'un versement · Modifier les opérations |

---

## Types d'opérations

### 🔵 DPF Cleaner
Nettoyage du filtre à particules.

- **Gain par opération** : 2 500 DA par défaut (personnalisable à chaque saisie)
- **Nombre d'opérations** : saisir le nombre effectué en une entrée
- **Calcul** : `qty × gain/op`

### 🟢 Flex Logiciel
Reprogrammation moteur.

- **Calcul** : 25 % du revenu total atelier saisi
- Saisir le revenu total généré par l'atelier pour cette intervention

### ✦ Combo DPF + Flex
Les deux services peuvent être combinés dans une seule entrée. Le total est la somme des deux.

---

## Calcul financier

Pour chaque opération :

```
Brut  = (qty × gain DPF)  +  (revenu Flex × 25%)
Don   = Brut × 5%  (modifiable manuellement)
Net   = Brut − Don
```

Le **Net** est la part qui revient à Ahmed. Le **Don** est versé à une association caritative par Ramzi.

---

## Fonctionnalités détaillées

### Saisie d'une opération
- Choisir un ou plusieurs services (DPF, Flex, ou les deux)
- Pour DPF : saisir le nombre d'opérations et le gain par opération (défaut 2 500 DA)
- Pour Flex : saisir le revenu total de l'atelier
- Date et note véhicule optionnelle (ex : "Golf 6 TDI")
- **Don personnalisé** : laisser vide pour le calcul automatique à 5 %, ou saisir un montant fixe. Bouton **↺ 5%** pour revenir au défaut.

### Gestion des opérations
- **Modifier** une opération existante (✏️)
- **Supprimer** une opération avec confirmation (🗑️)
- **Marquer versé** : indique que le net de cette opération a été versé à Ahmed
- **🤲 Marquer don versé** (Ramzi uniquement) : confirme que le don a été reversé à l'association

---

## Versements partiels (onglet 💸 Vers.)

Ramzi peut verser une partie des gains à Ahmed sans attendre une opération complète.

### Flux
1. **Ramzi** (onglet "💸 Vers.") → "💸 Enregistrer un versement" → saisit le montant, la date et une note optionnelle
2. **Ahmed** voit le versement en attente → clique "✓ Confirmer réception" pour valider

### Solde affiché
```
Restant à verser = Σ(nets des opérations non versées) − Σ(versements confirmés par Ahmed)
```

L'historique complet des versements est visible pour les deux utilisateurs.

---

## Statistiques (onglet 📊 Stats)

- **Revenu net total** : somme de tous les nets
- **En attente** : gains non encore versés (déduit les versements partiels confirmés)
- **Total brut** : avant déduction du don
- **Dons versés** : total des dons calculés sur toutes les opérations
- **Répartition par service** : DPF / Flex / Combos avec barres de progression
- **Graphique** : revenus nets par semaine ou par mois (8 dernières périodes)
- **Meilleure période** et **moyenne** par période

---

## Résumé (onglet 💰 Résumé)

Vue synthétique :
- Total brut, net, dons, en attente
- Détail par type de service (DPF Cleaner / Flex Logiciel / Combos)
- Nombre total d'entrées

---

## Synchronisation Google Sheets

Les données sont synchronisées en temps réel avec un Google Sheet partagé, ce qui permet aux deux utilisateurs de travailler depuis leurs appareils respectifs.

### Stratégie de fusion (anti-bug de résurrection)
- **Google Sheets est la source de vérité** pour la liste des opérations
- Une suppression faite sur un appareil n'est jamais restaurée par l'autre
- Les confirmations (versé, don versé, confirmation Ahmed) sont préservées même si faites hors ligne
- Les entrées créées hors ligne (après le dernier sync réussi) sont conservées jusqu'à la prochaine synchronisation

### Statuts de synchronisation
| Icône | Signification |
|---|---|
| ✓ Sauvegardé | Données à jour dans Google Sheets |
| ⟳ Synchronisation... | Envoi en cours |
| ⚠ Hors ligne | Données sauvegardées localement, sync échouée |

Le bouton **Sync** force une synchronisation manuelle. Un rafraîchissement automatique a lieu toutes les 2 minutes.

### Feuilles Google Sheets
| Feuille | Colonnes |
|---|---|
| `Données` | ID, Date, Note, Type, Qty DPF, Gain DPF (DA), Revenu Flex, Don, Don Versé, Versé, Net |
| `Versements` | ID, Date, Note, Montant, Confirmé Ahmed |

---

## Installation (PWA)

L'application peut être installée sur téléphone comme une app native :
- **Android** : "Ajouter à l'écran d'accueil" depuis Chrome
- **iOS** : Partager → "Sur l'écran d'accueil" depuis Safari

Elle fonctionne hors ligne avec les données du dernier cache local.

---

## Structure du projet

```
rh-tronic/
├── index.html          Application complète (React, logique, UI)
├── manifest.json       Manifeste PWA (icônes, thème, nom)
├── sw.js               Service Worker (cache hors ligne)
├── icon-192.png        Icône PWA 192×192
├── icon-512.png        Icône PWA 512×512
└── appscript/
    └── Code.gs         Script Google Apps (API REST → Google Sheets)
```

### `appscript/Code.gs`
Script déployé comme **Web App** sur Google Apps Script. Expose deux endpoints :
- `doPost` : reçoit `{ops, versements}` en JSON et écrit dans les deux feuilles
- `doGet` : retourne `{ops, versements}` depuis les deux feuilles

Pour mettre à jour le script : ouvrir [script.google.com](https://script.google.com), coller le contenu de `Code.gs`, puis **Déployer → Gérer les déploiements → Nouvelle version**.

---

## Stack technique

- **React 18** (CDN, sans bundler)
- **Babel Standalone** (JSX dans le navigateur)
- **Google Apps Script** (backend serverless)
- **localStorage** (persistence locale + fallback hors ligne)
- **PWA** : Service Worker + Web App Manifest
