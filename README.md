# FlowPlan2 V2 — Rewrite Initialization

Branche `rewrite/portfolio-versioned`. R0.1 fournit un shell indépendant avec
Portfolio vide en mémoire. Aucun modèle métier, moteur, import, migration ou
stockage n'est actif. R1 et R2 ne sont pas commencés.

Avec Node.js >=24 :

```sh
npm ci
npm run dev
```

Ouvrir **http://127.0.0.1:4274/**. Le port est fixe ; une collision ou un PORT
différent provoque un échec. Le shell refuse les autres origines, sauf l'origine
portable V2 **http://127.0.0.1:4275/**. Aucun fallback vers l'ancienne application.

```sh
npm run typecheck
npm run build
npm test
npm run smoke:v2
```

Le build produit `dist-v2/`, les tests `.test-dist-v2/`. `smoke:v2` exige un
Chromium réel (Edge/Chrome ou `FLOWPLAN_BROWSER` vers son exécutable) et utilise
uniquement des profils jetables. Il prouve les gates disponibles sur la plateforme
et indique séparément la preuve Windows SEA non exécutée ; aucun PASS SEA implicite.
`test:storage` désigne les tests d'isolation browser, sans persistence métier.

Sur Windows x64 **Node.js 26**, après `npm.cmd ci` :

```powershell
npm.cmd run build:sea
$env:FLOWPLAN_BROWSER = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
npm.cmd run test:sea
```

L'exécutable V2 est `dist-v2\FlowPlan2-V2.exe`, origine fixe 4275. Le smoke doit
lancer ce véritable exécutable, vérifier le shell/sentinelles dans Chromium, puis
confirmer l'arrêt et la libération du port. Le lancement utilisateur ouvre le
navigateur ; `--no-browser` le désactive pour les preuves.

L'application historique reste dans un checkout distinct de
`codex/lot11a-portfolio-snapshots` au SHA audité
`1c2b08c727af9fb8002b7678bd7403fcc0d39c27`, avec ses origines 4174/4175.
Son ancien `src/` est conservé comme référence mais exclu des graphes V2 ; aucun
bridge ni stockage partagé. [Ancienne procédure Windows](docs/windows-portable.md)
applicable à ce checkout historique seulement.

[Point d'entrée documentaire](docs/current_plan.md),
[plan R0.1 audité](docs/steps/PORTFOLIO_VERSIONED/rewrite_r01_plan.md).
