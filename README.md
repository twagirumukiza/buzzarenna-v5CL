# BuzzArena — jeu de quiz multijoueur en ligne

## Fonctionnalités
- Création d’un salon et partage d’un lien `?room=CODE`.
- Salon multijoueur synchronisé avec Firebase Realtime Database.
- Trois thèmes : culture générale, culture contemporaine et histoire.
- Manche 1 de 10 questions : 6 normales, 3 doubles et 1 triple, placées au hasard.
- Classement après chaque question selon la justesse et la rapidité.
- Finale entre les deux meilleurs sur 6 questions.
- Question décisive en cas d’égalité.
- Sons activables ou désactivables indépendamment sur chaque appareil.
- Interface responsive mobile, tablette et ordinateur.

## Mise en ligne rapide avec GitHub Pages
1. Créez un projet sur Firebase et activez **Realtime Database**.
2. Ajoutez une application Web dans Firebase.
3. Copiez la configuration dans `firebase-config.js`.
4. Utilisez temporairement ces règles de test dans Realtime Database :

```json
{
  "rules": {
    "rooms": {
      "$room": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

Ces règles sont adaptées à un prototype, pas à une version publique définitive. Pour une production, ajoutez Firebase Authentication et des règles limitant les écritures aux joueurs du salon.

5. Déposez tous les fichiers sur GitHub puis activez **Settings > Pages > Deploy from a branch**.

## Génération de questions par IA
Cette version fonctionne immédiatement avec une banque locale intégrée, ce qui évite d’exposer une clé API dans le navigateur. Pour une génération réellement dynamique par IA, ajoutez un service serveur ou une fonction cloud qui appelle votre fournisseur d’IA avec une clé stockée côté serveur, puis remplacez `buildQuestionSet()` par un appel à cet endpoint.

## Test sans Firebase
Sans configuration Firebase, le jeu démarre en mode démonstration local avec un joueur simulé. La création et le partage de vrais salons nécessitent Firebase.


V2 roadmap: ajout du thème 7e Art, aucune répétition entre les manches, finale avec nouvelles questions.


## V2.1
- Ajout du concept "Présentateur TV IA".
- Annonces d'ouverture, questions DOUBLE/TRIPLE, suspense et champion.
- Intégration prévue des sons et confettis.
- Nouveau thème : 7e Art (Films & Séries cultes).
- Objectif : ambiance d'émission télévisée.

## V3 — by twagirumukiza

Le mode **Présentateur TV IA** est maintenant pleinement implémenté (module `presenter.js`) :

**Présentation & animation**
- Présentation des joueurs à l'ouverture de la partie, puis annonce du thème choisi.
- Annonce de chaque question (normale, DOUBLE ×2, TRIPLE ×3) avec formulations variées.
- Commentaires pendant le chronomètre (mi-temps, dernières secondes).
- Analyse automatique après chaque question : prise de tête, remontée spectaculaire, temps de réponse remarquable, question piège, message de motivation quand l'écart est serré ou qu'il ne reste que 1-2 questions.
- Annonce des deux finalistes, présentation de la finale, puis annonce du champion avec suspense.

**Ambiance télévisée**
- Voix off en français via la Web Speech API (voix du navigateur), avec sous-titres affichés dans un bandeau animé — fonctionne même si la synthèse vocale n'est pas disponible.
- Roulement de tambour et son de suspense **synthétisés en direct** (Web Audio API), sans fichier audio supplémentaire à héberger.
- Confettis animés (canvas) et ralenti (slow-motion CSS) lors de la révélation du champion.
- Musique d'ambiance, buzz, décompte et fanfare reprennent les sons déjà intégrés au jeu (V1/V2).

**Réglages par joueur**
- Bouton 🎙️ dans l'en-tête : active/désactive le présentateur (voix, bandeau, tambour, suspense, confettis) indépendamment sur chaque appareil.
- Bouton 🔊 existant : coupe uniquement l'audio (voix et sons), les sous-titres restent visibles.
- Les deux préférences sont mémorisées localement (`localStorage`) et persistent d'une session à l'autre.

**Compatibilité**
- 100% statique : GitHub Pages, Firebase Realtime Database pour le multijoueur, aucune dépendance serveur supplémentaire.
- Responsive mobile / tablette / ordinateur, y compris le bandeau du présentateur et les confettis.

## V4 — by twagirumukiza

**📊 Analyse finale & fin de partie**
- Séquence complète de sacre : extinction des lumières, silence, roulement de tambour, suspense, puis projecteur + confettis + feux d'artifice + musique de victoire à l'annonce du nom.
- Conclusion parlée par l'IA : nombre de bonnes réponses et temps de réflexion moyen du champion, puis un mot de remerciement (« Merci d'avoir joué à BuzzArena… »).
- Nouvel écran de fin de partie avec classement complet, badges (🔥 série de 5 bonnes réponses, ⚡ réponse en moins d'une seconde, 🎯 sans faute, 👑 champion), et deux boutons : **🔁 Nouvelle partie** (l'hôte relance immédiatement avec les mêmes joueurs, scores et thèmes remis à zéro) ou **🚪 Quitter**.

**⚙️ Réglages du présentateur**
- Le bouton 🎬 ouvre un panneau de réglages propre à chaque appareil : mode **🎬 TV** (voix, tambour, suspense, confettis), mode **🎧 Sobre** (sous-titres uniquement, sans son ni effets), ou **🔇 Désactivé** (aucun commentaire).
- Choix de la voix : **🎤 Féminine** ou **🎤 Masculine** (sélection d'une voix française correspondante si le navigateur en propose une, sinon ajustement du timbre).

**🎯 Thèmes multiples**
- Le créateur du salon peut cocher plusieurs thèmes (Culture générale, Culture contemporaine, Histoire, 7ᵉ Art, Sport, Animaux, Capitales des pays, Drapeaux des pays). Le quiz mélange alors les thèmes cochés à parts égales.
- Chaque partie devient unique et le salon peut être adapté à tous les profils de joueurs.

**⏱️ Règles de jeu affinées**
- Le temps par question est réglable de 10 à 120 secondes par le créateur.
- Dès que tous les joueurs éligibles ont répondu, le minuteur s'arrête immédiatement et la partie enchaîne — plus besoin d'attendre la fin du chrono.
- **Score remis à zéro à chaque manche** : la Manche 1 détermine les deux finalistes, puis la Finale (et une éventuelle question décisive en cas d'égalité) repart de zéro pour désigner le champion.
- **Aucune question n'est répétée** d'une manche à l'autre sur toute la durée de la partie.
- **Reconnexion automatique** : si un joueur rafraîchit la page par erreur ou perd sa connexion, il retrouve sa partie en cours exactement là où il l'a laissée (même salon, même score, même question) dès qu'il rouvre le lien.

**🔐 Sécurité (authentification anonyme)**
- L'app se connecte désormais automatiquement à Firebase Authentication en mode anonyme (aucune saisie d'email/mot de passe pour les joueurs — c'est invisible).
- L'identifiant du joueur (`playerId`) correspond à son `uid` Firebase, ce qui permet des règles de sécurité précises : chacun ne peut écrire que dans sa propre fiche joueur (`players/{uid}`) et sa propre réponse (`answers/{uid}`), tandis que l'hôte du salon est seul autorisé à faire progresser la partie (phase, questions, scores).
- Voir `firebase-config.js` et les instructions ci-dessous pour activer la connexion anonyme et publier les règles adaptées.

**🎮 Contrôles de l'hôte pendant la partie**
- Deux boutons apparaissent en haut à gauche, visibles uniquement par l'organisateur pendant que la partie est en cours (question, résultats, annonce des finalistes) :
  - **🛑 Terminer la partie** : arrête immédiatement la partie. Les scores sont conservés, le salon reste ouvert, et tous les joueurs voient « La partie a été interrompue par l'organisateur. » avec le classement figé. Le bouton **Nouvelle partie** apparaît alors pour relancer.
  - **🔄 Retour au lobby** : arrête la partie et réinitialise immédiatement les scores, les questions, la manche, le chronomètre et les réponses pour tout le monde. Chacun revient dans le lobby, où l'hôte peut modifier les thèmes, le temps par question ou les réglages du présentateur avant de relancer.
- Les deux actions demandent une confirmation avant d'être appliquées, car elles affectent tous les joueurs connectés.

**📚 Banque de questions enrichie (595 questions)**
- **Capitales des pays** : 188 pays (quasi tous les pays du monde), avec des questions posées à l'envers (« Quel pays a pour capitale... ? ») pour rester intéressantes même en connaissant déjà la liste par cœur. Inclut les cas particuliers réels (capitale constitutionnelle de la Bolivie, capitale administrative de l'Afrique du Sud, etc.), présentés comme des questions pièges plutôt qu'ignorés.
- **Drapeaux des pays** : 87 drapeaux réellement distinctifs, décrits en détail pour éviter toute ambiguïté entre deux drapeaux qui se ressemblent.
- **Culture générale** : 60 questions. **Culture contemporaine** : 56. **Histoire** : 58. **7ᵉ Art** : 48. **Sport** : 49. **Animaux** : 49.
- Toutes les questions ont été vérifiées automatiquement (texte non vide, 4 choix distincts, index de réponse valide, aucun doublon dans un même thème) avant livraison.
- Combiné au système d'exclusion déjà en place, les répétitions deviennent très rares même après plusieurs parties d'affilée.

## V5 — by twagirumukiza

**🎭 Quatre nouveaux thèmes**
- **Littérature** (38 questions), **Danse** (38), **Théâtre** (38), **Judo & Jiu-jitsu** (35) — vérifiées une par une comme les thèmes précédents.
- La banque de questions totale passe à **744 questions** réparties sur 12 thèmes cochables.

**📊 Statistiques de fin de partie**
- Un nouveau bouton **« 📊 Statistiques de la partie »** apparaît sur l'écran de fin, juste après l'annonce du champion (ou l'écran d'interruption).
- Il ouvre un tableau détaillé pour chaque joueur : score, bonnes réponses / total répondu, précision (%), temps de réponse moyen, et meilleure série de bonnes réponses consécutives — en plus du classement déjà affiché avec les badges (👑 🔥 ⚡ 🎯).

**🔢 Nombre de questions réglable**
- Un nouveau curseur dans le lobby, juste sous le temps par question, permet à l'hôte de choisir le nombre de questions de la Manche 1 (de 5 à 20). La Finale reste fixée à 6 questions.
- Si les thèmes cochés ne contiennent pas assez de questions distinctes pour atteindre le nombre demandé (par exemple un seul thème avec un petit stock), la partie utilise simplement toutes les questions disponibles plutôt que d'en répéter — l'affichage du numéro de question (« Question x / y ») s'ajuste automatiquement à la quantité réellement utilisée.
