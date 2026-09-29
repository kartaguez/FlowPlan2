# FlowPlan2

## Créer l'exécutable Windows en local

Sur un PC Windows x64 avec Node.js 26 installé, téléchargez ce dépôt, ouvrez un terminal dans son dossier et exécutez :

```powershell
npm.cmd ci
npm.cmd run build:sea
```

Le fichier autonome est `dist\FlowPlan2.exe`. Il peut être copié sur un autre PC Windows x64 sans y installer Node.js. Un navigateur doit être disponible. Consultez [la procédure complète](docs/windows-portable.md) pour le téléchargement du dépôt, le contrôle du build et l'utilisation de l'exécutable.
