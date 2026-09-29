# Exécutable portable Windows

## Créer `FlowPlan2.exe` sur le PC Windows de construction

1. Installez [Node.js 26 pour Windows x64](https://nodejs.org/en/download/archive/v26.8.1) sur ce PC. Node.js et npm servent uniquement à la construction.
2. Téléchargez le dépôt avec `git clone https://github.com/kartaguez/FlowPlan2.git`, ou utilisez **Code → Download ZIP** sur GitHub puis décompressez le ZIP.
3. Ouvrez PowerShell dans le dossier du dépôt (celui qui contient `package.json`) et lancez :

```powershell
node --version
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:portable
npm.cmd run build:sea
npm.cmd run test:sea
```

`node --version` doit afficher `v26...`. `npm.cmd run build:sea` crée `dist\FlowPlan2.exe`. Le contrôle `test:sea` démarre l'exécutable sans navigateur, vérifie les fichiers intégrés et le refus d'une seconde instance, puis arrête le serveur. Il peut être omis si seul le build est souhaité.

## Utiliser l'exécutable

Copiez uniquement `dist\FlowPlan2.exe` sur le PC Windows x64 de destination et double-cliquez dessus. Aucun Node.js ni autre fichier du dépôt n'est nécessaire sur ce PC ; un navigateur doit toutefois être installé. L'exécutable ouvre `http://127.0.0.1:4175/` dans le navigateur par défaut. Gardez la console ouverte pendant l'utilisation et fermez-la pour arrêter FlowPlan2.

Si le port 4175 est occupé, l'exécutable affiche une erreur et s'arrête. Les données restent dans le `localStorage` du navigateur pour cette adresse et ce profil. Utilisez l'export et l'import JSON de l'application pour les transférer vers un autre navigateur ou un autre PC.
