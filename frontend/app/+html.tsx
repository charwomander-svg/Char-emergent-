// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <title>Ghost Maze</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        {/*
          Disable body scrolling on web to make ScrollView components work correctly.
          If you want to enable scrolling, remove `ScrollViewStyleReset` and
          set `overflow: auto` on the body style below.
        */}
        <ScrollViewStyleReset />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var detectEmbeddedRuntime = function () {
                    try {
                      return window.self !== window.top;
                    } catch (error) {
                      return true;
                    }
                  };
                  var hostname = window.location.hostname || "";
                  var search = window.location.search || "";
                  var protocol = window.location.protocol || "";
                  var referrer = document.referrer || "";
                  window.__GHOST_MAZE_ITCH_MODE__ =
                    /(?:\\?|&)(?:itchObject|itchio)=/i.test(search) ||
                    /(^|\\.)itch\\.zone$/i.test(hostname) ||
                    /(^|\\.)itch\\.io$/i.test(hostname) ||
                    /https?:\\/\\/(?:[^/]+\\.)?itch\\.io/i.test(referrer) ||
                    /https?:\\/\\/(?:[^/]+\\.)?itch\\.zone/i.test(referrer) ||
                    (protocol && protocol !== "http:" && protocol !== "https:") ||
                    detectEmbeddedRuntime();
                  var overlay = null;
                  var ensureOverlay = function () {
                    try {
                      if (overlay && overlay.parentNode) return overlay;
                      overlay = document.getElementById("ghost-maze-error-overlay");
                      if (!overlay) {
                        overlay = document.createElement("div");
                        overlay.id = "ghost-maze-error-overlay";
                        overlay.style.cssText = [
                          "display:none",
                          "position:fixed",
                          "inset:0",
                          "z-index:2147483647",
                          "background:#120b16",
                          "color:#fff1fb",
                          "padding:20px",
                          "font:12px/1.5 monospace",
                          "white-space:pre-wrap",
                          "overflow:auto"
                        ].join(";");
                      }
                      if (!overlay.parentNode && document.body) {
                        document.body.appendChild(overlay);
                      }
                      return overlay;
                    } catch (e) {
                      return null;
                    }
                  };
                  var showOverlay = function (label, message) {
                    try {
                      var host = ensureOverlay();
                      if (!host) return;
                      overlay.style.display = "block";
                      overlay.textContent = label + "\\n\\n" + String(message || "Unknown error");
                    } catch (e) {}
                  };
                  window.addEventListener("error", function (event) {
                    showOverlay("WINDOW ERROR", event.error && event.error.stack ? event.error.stack : (event.message || event.error));
                  });
                  window.addEventListener("unhandledrejection", function (event) {
                    var reason = event.reason;
                    var name = reason && reason.name ? String(reason.name) : "";
                    var message = reason && reason.message ? String(reason.message) : String(reason || "");
                    if ((name === "NotAllowedError" || name === "AbortError") && /play\\(\\)|audio|autoplay/i.test(message)) {
                      return;
                    }
                    showOverlay("UNHANDLED PROMISE REJECTION", reason && reason.stack ? reason.stack : reason);
                  });
                } catch (e) {}
              })();
            `,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body > div:first-child { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; }
              [role="tablist"] [role="tab"] * { overflow: visible !important; }
              [role="heading"], [role="heading"] * { overflow: visible !important; }
            `,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </body>
    </html>
  );
}
