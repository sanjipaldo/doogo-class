package com.doogoclass.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.URLUtil;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.net.URISyntaxException;

/**
 * 두고클래스 앱 — 운영 사이트(www.doogoclass.com)를 그대로 보여 주는 화면.
 *
 * 결제창(토스페이먼츠)에서 카드사 · 은행 · 간편결제 앱으로 넘어가는 주소(intent://, ispmobile:// 같은 앱 주소)는
 * 웹뷰가 직접 열 수 없어서, 여기서 그 앱을 열어 줘요. 앱이 없으면 Play 스토어의 그 앱 화면으로 보내요.
 * (토스페이먼츠 문서 ‘웹뷰(WebView) 연동하기’의 안드로이드 방법 그대로 · 2026-11-24)
 * 보통 웹 주소(http · https)는 Capacitor 기본 처리 그대로예요 — 우리 도메인 · 결제창은 앱 안에서, 그 밖은 바깥 브라우저로.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (isAppLink(url)) return openApp(url);
                return super.shouldOverrideUrlLoading(view, request);
            }
        });
    }

    /** 웹 주소가 아닌 앱 주소인지 (http · https · javascript · data · blob · about 는 아니에요) */
    private static boolean isAppLink(String url) {
        if (url == null || url.isEmpty()) return false;
        if (URLUtil.isNetworkUrl(url) || URLUtil.isJavaScriptUrl(url)) return false;
        String u = url.toLowerCase();
        return !(u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("about:"));
    }

    private boolean openApp(String url) {
        if (url.toLowerCase().startsWith("intent:")) {
            Intent intent;
            try {
                intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
            } catch (URISyntaxException e) {
                return true; // 잘못된 주소는 웹뷰가 오류 화면을 띄우지 않게 그냥 막아요
            }
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            intent.setComponent(null);
            intent.setSelector(null);
            try {
                startActivity(intent);
            } catch (ActivityNotFoundException e) {
                String pkg = intent.getPackage();
                if (pkg != null && !pkg.isEmpty()) openStore(pkg);
            }
            return true;
        }
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (ActivityNotFoundException e) {
            // 설치되지 않은 앱 주소 — 결제창이 다음 안내(앱 설치 · 다른 수단)를 보여 줘요
        }
        return true;
    }

    private void openStore(String pkg) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + pkg)));
        } catch (ActivityNotFoundException e) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=" + pkg)));
            } catch (ActivityNotFoundException ignored) {
                // 스토어도 없으면 그대로
            }
        }
    }
}
