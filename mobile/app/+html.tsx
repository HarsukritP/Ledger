import type { PropsWithChildren } from "react";
import { ScrollViewStyleReset } from "expo-router/html";

/**
 * Custom HTML root for the Expo web build.
 *
 * PWA meta tags:
 *  - apple-mobile-web-app-capable  →  hides Safari browser chrome when the app
 *    is added to the iOS Home Screen ("Add to Home Screen").
 *  - theme-color  →  tints the Android Chrome address bar to match the app.
 *  - viewport-fit=cover  →  lets content extend under the notch/home indicator.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />

        {/* Android Chrome: color the address bar */}
        <meta name="theme-color" content="#09090B" />
        <meta name="background-color" content="#09090B" />

        {/* iOS: run fullscreen (no Safari chrome) when launched from Home Screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/*
          black-translucent: status bar overlays the app (the app paints behind it
          with safe-area-inset-top) — gives us a seamless dark top edge.
        */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ledger" />

        {/* Android PWA */}
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Prevent layout bleed on iOS scroll bounce */}
        <ScrollViewStyleReset />

        <style>{`
          html, body, #root {
            background-color: #09090B;
            height: 100%;
            /* Prevent white flash on iOS rubber-band scroll */
            overscroll-behavior: none;
          }
          body {
            overflow: hidden;
            /* Extend the dark bg behind status bar & home indicator */
            padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
            box-sizing: border-box;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
