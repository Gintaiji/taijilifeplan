# Vérification des défis de progression

Sans dépendance supplémentaire :

```powershell
node --test tests/challenges.test.mjs
npm run lint
npm run build
```

Les tests utilisent les vrais modules de stockage, sauvegarde, gestion des défis et protection cloud. Seul le transport Supabase est simulé : aucun compte ni aucune donnée distante réelle n’est modifié. Ils couvrent les sauvegardes anciennes, les données invalides, les conflits avec une copie distante plus récente et les erreurs réseau.

Le parcours navigateur utilise le protocole Chrome DevTools et WebSocket natif de Node (Node 22 ou plus récent). Démarrer l’application sur le port 3100 et Chrome sans fenêtre avec le port de débogage 9322 et un **profil jetable dédié** nommé `.browser-challenges-test`, puis lancer :

```powershell
node tests/challenges.browser.mjs
```

Ce script efface uniquement le stockage de l’origine de test `http://localhost:3100` dans ce profil et ferme ce navigateur à la fin. Ne jamais le connecter à un profil personnel. Il vérifie le choix d’un défi, les compteurs, la cible, la fin, la réflexion, le rechargement, la création personnalisée, le remplacement, l’historique et l’ergonomie à 390 pixels.

Le stockage des défis est indépendant des objectifs et des réflexions existantes. Les sauvegardes restent en version 1 avec un champ `challenges` facultatif et validé. L’absence de ce champ à l’import ne provoque aucune écriture sur la clé des défis. La restauration d’une sauvegarde récente contenant ce champ remplace les défis selon le comportement de restauration existant. Aucun changement de schéma Supabase n’est nécessaire : les défis voyagent dans le contenu JSON existant.
