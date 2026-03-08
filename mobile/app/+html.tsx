import type { PropsWithChildren } from "react";
import { ScrollViewStyleReset } from "expo-router/html";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        {/*
          viewport-fit=cover: app content extends edge-to-edge behind the
          notch and home indicator. React Native's SafeAreaView/useSafeAreaInsets
          handles keeping content clear of those areas — we must NOT add CSS
          padding here or we get double-inset white gaps.
        */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />

        {/* Android Chrome: dark address bar */}
        <meta name="theme-color" content="#09090B" />

        {/* iOS PWA (Add to Home Screen): fullscreen, no Safari chrome */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/*
          black-translucent: status bar overlays the app so the OS-chrome area
          is filled by the app's own dark background — no white gap at the top.
        */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ledger" />
        <meta name="mobile-web-app-capable" content="yes" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: `
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html {
            height: 100%;
            background: #09090B;
          }
          body {
            height: 100%;
            background: #09090B;
            overflow: hidden;
            /* Kill the white rubber-band bounce reveal on iOS */
            overscroll-behavior: none;
          }
          #root {
            height: 100%;
            background: #09090B;
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
