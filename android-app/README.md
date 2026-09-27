# SMART.ECO — App Android (Capacitor)

## Ce que c'est
Une vraie app Android qui charge SMART.ECO en direct depuis :
https://smarteco26-ctrl.github.io/smarteco-app/

Avantage : toute mise à jour poussée sur GitHub apparaît automatiquement dans
l'app, sans jamais recompiler.

## Comment obtenir le .apk (une seule fois)

1. Installe **Android Studio** (gratuit) : https://developer.android.com/studio
2. Ouvre Android Studio → **Open** → sélectionne le dossier `android/` (pas
   le dossier racine, bien le sous-dossier `android`).
3. Laisse Gradle synchroniser (barre de progression en bas, 2-5 minutes,
   nécessite internet la première fois).
4. Menu **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
5. Une notification apparaît en bas à droite : clique **locate** pour
   trouver le fichier `app-debug.apk`.
6. Envoie ce fichier sur un téléphone Android (WhatsApp, câble USB, Google
   Drive...) et installe-le (autoriser "sources inconnues" si demandé).

## Pour publier sur le Play Store plus tard
Il faudra un compte développeur Google (25 USD, unique) et signer l'app en
version "release" au lieu de "debug" — étape différente, à faire quand tu
seras prêt.

## Changer le nom / l'icône de l'app
- Nom : `android/app/src/main/res/values/strings.xml`
- Icône : remplace les fichiers dans `android/app/src/main/res/mipmap-*/`
  (utilise https://icon.kitchen pour générer toutes les tailles à partir
  d'une image)
