package exe.oldfag.arcade;

import android.app.Activity;
import android.graphics.Color;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.JavascriptInterface;
import android.widget.FrameLayout;
import android.widget.ImageView;

import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

/**
 * Offline Android wrapper around the exact website and games.
 * HTTPS asset URLs preserve localStorage and same-origin access in nested iframes.
 */
public class MainActivity extends Activity {
    private static final String ASSET_HOST = "appassets.androidplatform.net";
    private static final String START_URL =
            "https://" + ASSET_HOST + "/assets/site/index.html?app=android";

    private WebView browser;
    private FrameLayout splashOverlay;
    private ImageView splashLogo;
    private FrameLayout root;
    private View fullScreenView;
    private WebChromeClient.CustomViewCallback fullScreenCallback;
    private WebViewAssetLoader assetLoader;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setBackgroundDrawableResource(android.R.color.black);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams params = getWindow().getAttributes();
            params.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(params);
        }
        immersive();

        root = new FrameLayout(this);
        browser = new WebView(this);
        root.addView(browser, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        showStudioSplash();

        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        WebSettings settings = browser.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        // Exposed only to bundled, offline game documents. Lets Timur request landscape
        // and resets orientation whenever the player returns to the club.
        browser.addJavascriptInterface(new ArcadeOrientationBridge(), "OldfagAndroid");
        browser.setBackgroundColor(0xFF050816);
        browser.setVerticalScrollBarEnabled(false);
        browser.setHorizontalScrollBarEnabled(false);

        browser.setWebViewClient(new WebViewClientCompat() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view,
                    WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if ("https".equals(u.getScheme()) && ASSET_HOST.equals(u.getHost())) {
                    return false;
                }
                // No external network needed. System browser handles outbound links.
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                return true;
            }
        });

        browser.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (fullScreenView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                fullScreenView = view;
                fullScreenCallback = callback;
                browser.setVisibility(View.GONE);
                root.addView(view, new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT));
                immersive();
            }
            @Override
            public void onHideCustomView() {
                hideFullScreenView();
            }
        });

        if (savedInstanceState != null) {
            browser.restoreState(savedInstanceState);
        } else {
            browser.loadUrl(START_URL);
        }
    }


    /**
     * Native full-screen studio card shown once per Activity launch.
     * The bundled WebView can load underneath; navigating between games never replays it.
     * 200ms black, 350ms fade-in, 2000ms hold, 350ms fade-out.
     */
    private void showStudioSplash() {
        splashOverlay = new FrameLayout(this);
        splashOverlay.setBackgroundColor(Color.BLACK);
        splashOverlay.setClickable(true);
        splashLogo = new ImageView(this);
        splashLogo.setImageResource(R.drawable.last_of_games_splash);
        splashLogo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        splashLogo.setAlpha(0f);
        splashOverlay.addView(splashLogo, new FrameLayout.LayoutParams(
                1, 1, Gravity.CENTER));
        root.addView(splashOverlay, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        // A size update also covers device rotation while the card is visible.
        root.addOnLayoutChangeListener((view, left, top, right, bottom,
                oldLeft, oldTop, oldRight, oldBottom) -> {
            if (splashLogo != null) resizeSplashLogo(right - left, bottom - top);
        });

        splashOverlay.postDelayed(() -> {
            if (splashLogo == null) return;
            splashLogo.animate().alpha(1f).setDuration(350).withEndAction(() -> {
                if (splashLogo == null) return;
                splashLogo.postDelayed(() -> {
                    if (splashLogo == null) return;
                    splashLogo.animate().alpha(0f).setDuration(350)
                            .withEndAction(this::removeStudioSplash).start();
                }, 2000);
            }).start();
        }, 200);
    }

    private void resizeSplashLogo(int width, int height) {
        if (splashLogo == null || width <= 0 || height <= 0) return;
        float density = getResources().getDisplayMetrics().density;
        int margin = (int) (20 * density);
        int maxSize = (int) (520 * density);
        int size = Math.max(1, Math.min(Math.min(width, height) - 2 * margin, maxSize));
        FrameLayout.LayoutParams layout = (FrameLayout.LayoutParams) splashLogo.getLayoutParams();
        if (layout.width != size || layout.height != size) {
            layout.width = size;
            layout.height = size;
            layout.gravity = Gravity.CENTER;
            splashLogo.setLayoutParams(layout);
        }
    }

    private void removeStudioSplash() {
        if (splashOverlay == null) return;
        root.removeView(splashOverlay);
        splashLogo = null;
        splashOverlay = null;
    }

    private final class ArcadeOrientationBridge {
        @JavascriptInterface
        public void setOrientation(String value) {
            runOnUiThread(() -> {
                if ("landscape".equals(value)) {
                    setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                } else {
                    setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
                }
            });
        }
    }

    private void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN
              | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
              | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
              | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
              | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
              | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    private void hideFullScreenView() {
        if (fullScreenView == null) return;
        root.removeView(fullScreenView);
        fullScreenView = null;
        browser.setVisibility(View.VISIBLE);
        if (fullScreenCallback != null) {
            fullScreenCallback.onCustomViewHidden();
            fullScreenCallback = null;
        }
        immersive();
    }

    @Override
    public void onConfigurationChanged(Configuration configuration) {
        super.onConfigurationChanged(configuration);
        immersive();
    }

    @Override
    protected void onSaveInstanceState(Bundle state) {
        browser.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override
    public void onBackPressed() {
        if (fullScreenView != null) {
            hideFullScreenView();
            return;
        }
        // Back button closes an arcade/dialog first; otherwise exits the app.
        browser.evaluateJavascript("Boolean(window.OLDfagAndroidBack && window.OLDfagAndroidBack())",
                result -> {
                    if (!"true".equals(result)) finish();
                });
    }

    @Override
    protected void onDestroy() {
        if (browser != null) {
            root.removeView(browser);
            browser.destroy();
        }
        super.onDestroy();
    }
}
