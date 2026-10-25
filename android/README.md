# OLDfag.exe — Android beta

This is a standalone **offline** Android WebView application using the existing website and all three games. Source website at repository root stays available on GitHub Pages.

- The app opens at `https://appassets.androidplatform.net/assets/site/index.html?app=android` through `WebViewAssetLoader`. It does **not** point at the live Pages website.
- HTML, CSS, JS, game artwork and MP3 files are packaged into the APK by GitHub Actions.
- All progress and quiz / victory statistics use Android WebView `localStorage`: the face-control pass skips the gate on next app opening. The website's own browser storage is separate.
- Uninstalling the app or clearing its storage removes progress. No cloud sync or login.
- The first APK is **debug/test only**; publication on Google Play requires signed AAB, developer identity, privacy disclosures, art and device tests.

## Build with GitHub Actions
Go to repository **Actions → Android debug APK → Run workflow** (or view the run created on commit). In the successful run, download the `OLDfag-Android-debug-APK` artifact ZIP, unzip and install `app-debug.apk` on an Android device. Verify all games, music, orientation changes, quiz saves and app restart.

## Local build
Use JDK 17, Android SDK platform 36, Gradle 8.13 and `gradle -p android assembleDebug`, after copying website assets into `android/app/src/main/assets/site/` according to the workflow. The asset folder is intentionally generated, not committed.
