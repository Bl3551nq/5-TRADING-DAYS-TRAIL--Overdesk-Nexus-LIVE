package com.overdesk.nexus;

import android.app.PictureInPictureParams;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private float windowPosX = -1f;
    private float windowPosY = -1f;
    private float pendingDx = 0f;
    private float pendingDy = 0f;
    private boolean isMoveScheduled = false;

    public static class AndroidOverlayBridge {
        private final MainActivity activity;

        public AndroidOverlayBridge(MainActivity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public void updateBounds(final float left, final float top, final float width, final float height) {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    activity.updateWindowBounds(width, height);
                }
            });
        }

        @JavascriptInterface
        public void moveWindow(final float dx, final float dy) {
            activity.queueMoveWindow(dx, dy);
        }

        @JavascriptInterface
        public void enterOverlayMode() {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    activity.enterOverlayPipMode();
                }
            });
        }

        @JavascriptInterface
        public boolean isAndroid() {
            return true;
        }

        @JavascriptInterface
        public boolean supportsPip() {
            return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O;
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        if (window != null) {
            window.setBackgroundDrawableResource(android.R.color.transparent);
            window.clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
            window.addFlags(
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                | WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH
            );
            window.setStatusBarColor(Color.TRANSPARENT);
            window.setNavigationBarColor(Color.TRANSPARENT);

            WindowManager.LayoutParams params = window.getAttributes();
            if (params != null) {
                float density = getResources().getDisplayMetrics().density;
                int screenWidth = getResources().getDisplayMetrics().widthPixels;
                int initialW = (int) (340 * density);
                int initialH = (int) (440 * density);
                params.gravity = Gravity.TOP | Gravity.START;
                params.width = initialW;
                params.height = initialH;
                params.x = Math.max(0, (screenWidth - initialW) / 2);
                params.y = (int) (48 * density);
                params.flags |= WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL;
                params.flags |= WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH;
                window.setAttributes(params);

                windowPosX = params.x;
                windowPosY = params.y;
            }
        }

        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.setBackgroundColor(Color.TRANSPARENT);
                webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
                webView.addJavascriptInterface(new AndroidOverlayBridge(this), "AndroidOverlay");
            }
        } catch (Exception ignored) {}
    }

    public void updateWindowBounds(final float width, final float height) {
        Window window = getWindow();
        if (window == null) return;
        WindowManager.LayoutParams params = window.getAttributes();
        if (params == null) return;

        float density = getResources().getDisplayMetrics().density;
        int pad = (int) (10 * density);
        int targetW = (int) (width * density) + pad * 2;
        int targetH = (int) (height * density) + pad * 2;

        params.width = Math.max((int) (200 * density), targetW);
        params.height = Math.max((int) (50 * density), targetH);
        params.flags |= WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL;
        params.flags |= WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH;

        window.setAttributes(params);

        windowPosX = params.x;
        windowPosY = params.y;
    }

    public void queueMoveWindow(final float dx, final float dy) {
        synchronized (this) {
            pendingDx += dx;
            pendingDy += dy;
            if (isMoveScheduled) return;
            isMoveScheduled = true;
        }

        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                float curDx, curDy;
                synchronized (MainActivity.this) {
                    curDx = pendingDx;
                    curDy = pendingDy;
                    pendingDx = 0f;
                    pendingDy = 0f;
                    isMoveScheduled = false;
                }
                moveWindow(curDx, curDy);
            }
        });
    }

    public void moveWindow(final float dx, final float dy) {
        Window window = getWindow();
        if (window == null) return;
        WindowManager.LayoutParams params = window.getAttributes();
        if (params == null) return;

        float density = getResources().getDisplayMetrics().density;
        if (windowPosX < 0 || windowPosY < 0) {
            windowPosX = params.x;
            windowPosY = params.y;
        }

        windowPosX += dx * density;
        windowPosY += dy * density;

        params.x = Math.round(windowPosX);
        params.y = Math.round(windowPosY);

        window.setAttributes(params);
    }

    @Override
    public void onResume() {
        super.onResume();
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.setBackgroundColor(Color.TRANSPARENT);
            }
        } catch (Exception ignored) {}
    }

    public void enterOverlayPipMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                PictureInPictureParams.Builder pipBuilder = new PictureInPictureParams.Builder();
                Rational aspectRatio = new Rational(9, 16);
                pipBuilder.setAspectRatio(aspectRatio);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    pipBuilder.setAutoEnterEnabled(true);
                    pipBuilder.setSeamlessResizeEnabled(true);
                }
                enterPictureInPictureMode(pipBuilder.build());
            } catch (Exception e) {
                try {
                    enterPictureInPictureMode();
                } catch (Exception ignored) {}
            }
        }
    }

    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                enterOverlayPipMode();
            } catch (Exception ignored) {}
        }
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('pipmodechange', { detail: { isInPip: " + isInPictureInPictureMode + " } }));",
                    null
                );
            }
        } catch (Exception ignored) {}
    }
}

