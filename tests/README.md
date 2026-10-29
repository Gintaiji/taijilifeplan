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

## Suggestions de progression (91B)

Les tests unitaires couvrent aussi les quatre issues (progresser, maintenir, alléger, historique insuffisant), les quatre résultats réels les plus récents, la séparation quotidien/hebdomadaire, les unités et critères incompatibles, les limites de cible et de niveau, ainsi que l’absence de mutation des paramètres personnalisés et de l’historique. Le test navigateur vérifie que consulter ou annuler une suggestion n’écrit aucune donnée.

Une seule suggestion est affichée pour le modèle du défi le plus récemment enregistré par date (ordre d’ajout pour départager une même date). Les réussites sont calculées avec la cible propre à chaque tentative. Les échecs expirés comptent comme clôturés, les tentatives encore en cours et non réussies sont exclues. Les rapprochements entre modèles sont limités aux nouvelles rencontres et aux sessions de concentration de 25 minutes ; les autres modèles, y compris personnalisés, sont comparés par identifiant, unité et critère de réussite. Les sessions de 45 minutes ne sont pas mélangées à celles de 25 minutes.

Après 3–4 réussites, le prochain niveau propose une cible augmentée de 20 % arrondis au supérieur (au moins une unité). Avec deux réussites, la cible et le niveau restent identiques. Avec 0–1 réussite, la réduction reste limitée à environ 20 % (au moins une unité), en tenant compte de la moyenne réalisée, sans descendre sous 1. Au niveau Dépassement, la suggestion invite à consolider. Ces règles sont des repères simples, pas une estimation de la difficulté intrinsèque d’une tâche. Un objectif indivisible ne peut pas être réduit sous une unité.

Les suggestions sont calculées en mémoire : aucun changement du format de sauvegarde ou de la synchronisation, aucune modification des défis en cours. L’aperçu peut être ajusté ou annulé ; seul « Commencer ce défi » enregistre une nouvelle tentative selon le parcours existant. Les modèles personnalisés d’origine restent inchangés.

## Résultats concrets facultatifs

Chaque tentative peut contenir un objet `results` avec trois entiers de 0 à 1 000 000 : `conversations`, `appointmentsProposed`, `appointmentsObtained`. Ce champ n’est créé qu’à la première modification d’un compteur ; les données anciennes sans résultats restent valides et ne sont pas réécrites au chargement. Les versions de sauvegarde restent identiques. Le contenu JSON existant transporte naturellement ces informations vers Supabase, avec les mêmes validations et protections contre les conflits. Une restauration complète suit le comportement existant : elle remplace les défis par ceux du fichier sélectionné.

L’affichage est réservé aux modèles de prises de contact (`meet-3/5/10`), relances (`follow-up-5`), propositions (`discovery-2`) et aux modèles personnalisés de la catégorie « Prospection et nouvelles rencontres ». Participer à une rencontre et les autres catégories ne déclenchent pas ces indicateurs. La section « Résultats obtenus » est fermée par défaut, y compris dans l’historique ; un résumé discret accompagne les résultats déjà renseignés. Ils peuvent être complétés après l’archivage pour noter un retour tardif. Aucun lien numérique n’est imposé entre contacts, conversations et rendez-vous, ni avec la réussite du défi. Le compteur principal et la réflexion restent inchangés.

Les tests unitaires couvrent les bornes des compteurs, l’historique, l’indépendance de la réussite et des suggestions 91B, les données anciennes, les valeurs invalides, l’aller-retour JSON, la restauration cloud simulée et les conflits cloud. Le parcours Chrome vérifie aussi les trois compteurs, leur persistance, les résultats tardifs dans l’historique, la pertinence de l’affichage et les largeurs mobiles 320/390 px. Aucun test cloud n’écrit sur un compte réel.
