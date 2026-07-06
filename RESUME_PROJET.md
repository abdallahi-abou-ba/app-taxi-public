# Résumé du projet — Taxi MVP

Application de VTC/taxi (type Uber/Bolt) avec deux rôles, **client** et **chauffeur**, composée d'un backend API et d'une application mobile partagée entre les deux rôles.

## 1. Fonctionnalités implémentées

**Compte & authentification**
- Inscription / connexion par e-mail + mot de passe
- Sessions par JWT (jeton d'accès 15 min) + refresh token (30 jours, révocable, stocké haché en base)
- Modification du profil, suppression de compte (anonymisation des données personnelles, l'historique des courses reste cohérent pour l'autre participant)
- Choix de la langue (français / arabe), avec bascule automatique de la mise en page en RTL pour l'arabe
- Inscription chauffeur : matricule du véhicule (obligatoire) + modèle (optionnel). Compte chauffeur créé en statut "en attente" tant qu'un administrateur ne l'a pas validé ; impossible de passer en ligne ou d'accepter une course avant validation. Les comptes client n'ont pas cette contrainte.
- Panneau d'administration (page web servie par le backend sur `/admin`, compte ADMIN créé via un script, pas d'auto-inscription) : statistiques globales (clients, chauffeurs, courses par statut, revenus), liste/validation/rejet des chauffeurs, vue d'ensemble des clients

**Courses**
- Demande de course immédiate : sélection du point de départ et de la destination sur une carte
- Réservation à l'avance (date/heure), activée automatiquement le moment venu par une tâche planifiée côté serveur
- Mise en relation chauffeur ↔ client en temps réel (Socket.IO) : le chauffeur disponible le plus proche reçoit la demande, avec une sonnerie en boucle tant qu'il n'a pas répondu (accepté/refusé)
- Suivi en direct : position du chauffeur transmise en temps réel sur la carte du client
- Cycle de vie complet de la course : demandée → acceptée → chauffeur arrivé → en cours → terminée (ou annulée)
- Calcul de distance/durée/tarif estimé (affiché dès le choix du départ/destination, avant confirmation), trajet réel affiché sur la carte (OSRM)
- Choix du mode de paiement (espèces / carte) ; le chauffeur marque la course comme payée après collecte
- Notation mutuelle (note + commentaire) à la fin d'une course
- Historique des courses (suppression "personnelle" uniquement — n'affecte pas l'autre participant)
- Tableau de bord avec statistiques (nombre de courses, montant gagné/dépensé, courses du mois)

**Autres**
- Appel téléphonique direct entre client et chauffeur pendant une course (numéro de l'autre partie affiché, ouverture du composeur natif du téléphone)
- Programme de parrainage : code personnel, crédit offert automatiquement appliqué sur la prochaine course payée en espèces
- Notifications push (rappel si aucun chauffeur trouvé, rappel de notation, diffusion de messages promotionnels)

## 2. Architecture technique

### Backend (`backend/`)
- **Node.js + Express** pour l'API REST, **Socket.IO** pour le temps réel
- **PostgreSQL** avec **Prisma** comme ORM (schéma versionné par migrations)
- Sécurité : Helmet, CORS configurable, limitation de débit sur les routes sensibles (20 requêtes / 15 min sur l'authentification)
- Validation des requêtes avec **Zod**
- Tâches planifiées en tâche de fond : activation des courses réservées, rappels automatiques
- Tests automatisés : **Jest + Supertest**, 10 fichiers de tests couvrant l'auth, les courses, les paiements, les notations, le parrainage, les rappels, l'historique, les réservations et la suppression de compte — exécutés sur une base de données dédiée aux tests

Modèle de données principal : `User` (rôle CLIENT/DRIVER/ADMIN, disponibilité et position en direct pour les chauffeurs, véhicule et statut de validation pour les chauffeurs, note moyenne, parrainage, crédit), `Ride` (cycle de vie complet, tarif, trajet), `RefreshToken` (sessions révocables).

### Mobile (`mobile/`)
- **Expo / React Native** (SDK 54), une seule base de code pour les deux rôles — la navigation s'adapte selon le rôle de l'utilisateur connecté
- Carte via **WebView + Leaflet + tuiles OpenStreetMap** (aucune clé API payante nécessaire)
- **socket.io-client** pour le temps réel (position du chauffeur, nouvelles demandes, statut de course)
- **i18next** pour les traductions FR/AR
- Jetons stockés de façon sécurisée (`expo-secure-store`), notifications push (`expo-notifications`)
- Sonnerie d'alerte pour les nouvelles demandes de course (`expo-audio`), audible même en mode silencieux
- Système de design centralisé (`src/theme/theme.js`) réutilisé par tous les écrans

## 3. Design (dernière itération)

Refonte visuelle complète autour d'une identité **"jaune taxi + charbon"** (`#FFC629` / `#1C1C1E`), inspirée des applications de VTC modernes tout en gardant un code couleur "taxi" reconnaissable :
- Système de design unique (couleurs, typographie, espacements, rayons, ombres)
- Composants repensés : boutons en pilule, badges de statut avec icônes, cartes de résumé de course, grille d'actions rapides avec icônes (au lieu de rangées de boutons)
- Icônes (Ionicons) sur l'ensemble de l'application
- Carte avec marqueurs colorés selon leur rôle (départ, destination, position du chauffeur)
- Écrans de connexion/inscription et de démarrage avec une identité de marque affirmée

## 4. Déploiement (Railway)

Le backend est en ligne en production sur **Railway** :

| Élément | Valeur |
|---|---|
| Projet | `app-taxi` |
| Services | `backend` (API) + `Postgres` (base de données managée) |
| Source | dépôt GitHub `abdallahi-abou-ba/app-taxi-public`, dossier `/backend` |
| Build | automatique via Railpack (détecte Node.js, `npm install`, puis `prisma generate`) |
| Démarrage | `prisma migrate deploy && node src/server.js` — les migrations de base de données s'appliquent automatiquement à chaque déploiement |
| Variables d'environnement | `DATABASE_URL` / `DIRECT_URL` (réseau privé Railway vers Postgres), `JWT_SECRET`, `CORS_ORIGIN`, `NODE_ENV=production` |
| URL publique | `https://backend-production-1b1b.up.railway.app` |
| Déploiement continu | un push sur le dépôt déclenche normalement un redéploiement automatique (webhook GitHub → Railway) |

Les builds mobiles de test (EAS, profil `preview`) pointent directement vers cette URL Railway — pas besoin d'un backend local pour tester l'app sur un appareil externe.

## 5. Comment lancer/tester le projet

- **En local** : PostgreSQL via Docker + `npm run dev` dans `backend/`, puis `npx expo start` dans `mobile/` et scanner le QR code avec Expo Go (téléphone et PC sur le même Wi-Fi). Étapes détaillées dans `README.md` à la racine.
- **Contre la prod** : l'app mobile peut pointer directement vers l'URL Railway ci-dessus (déjà le cas dans les builds EAS `preview`), sans rien lancer en local.

## 6. Roadmap — vers une application professionnelle

### Priorité haute
- **Vérification d'identité chauffeur** : upload du permis de conduire, de la carte grise (et éventuellement casier judiciaire) à l'inscription, avec validation manuelle ou semi-automatique avant activation du compte
- **Paiement en ligne réel** : intégration d'une passerelle de paiement (Stripe, ou solution locale type Bankily/Masrivi), au lieu du simple choix "espèces/carte" actuel où le chauffeur encaisse toujours en personne
- **Bouton SOS / partage du trajet en direct** avec un contact de confiance — fonctionnalité de sécurité à forte valeur perçue, standard sur les applications de VTC (Uber, Bolt)

### Confiance & sécurité
- Vérification du numéro de téléphone par SMS/OTP à l'inscription
- Détection de comptes frauduleux (abus du programme de parrainage)

### Expérience utilisateur
- Autocomplétion d'adresse (recherche textuelle) en plus de la sélection sur la carte
- Adresses favorites (domicile, travail)
- Choix du type de véhicule (économique, confort, van...)
- Estimation d'heure d'arrivée (ETA) plus précise

### Exploitation / back-office
- Dashboard admin web (gestion des utilisateurs, des courses, des litiges, statistiques globales)
- Monitoring et alerting en production (au-delà des endpoints `/health` et `/health/db` déjà en place)
- Support client intégré (chat avec l'équipe support, FAQ)

### Robustesse technique
- CI/CD (tests automatiques + déploiement déclenché sur push, plutôt qu'un redeploy Railway manuel)
- Tests end-to-end mobile (Detox/Maestro)
- Gestion réseau plus robuste côté mobile (file d'attente hors-ligne, retry automatique)
