import { useEffect, useRef, useState } from "react";

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function TurnstileChallenge({
  siteKey,
  onTokenChange,
  resetSignal,
}: {
  siteKey: string;
  onTokenChange: (token: string) => void;
  resetSignal: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const changeRef = useRef(onTokenChange);
  const [error, setError] = useState("");

  useEffect(() => {
    changeRef.current = onTokenChange;
  }, [onTokenChange]);

  useEffect(() => {
    let cancelled = false;
    let script = document.querySelector<HTMLScriptElement>(
      'script[data-lazy-turnstile="true"]',
    );

    const mount = () => {
      if (cancelled || !containerRef.current || !window.turnstile ||
          widgetIdRef.current !== null) return;
      setError("");
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action: "spelling_submit",
        callback: (token) => changeRef.current(token),
        "expired-callback": () => changeRef.current(""),
        "error-callback": () => {
          changeRef.current("");
          setError("Verification could not complete. Refresh the page to retry.");
        },
      });
    };

    const failed = () => {
      if (!cancelled) setError("Verification could not load. Please try again later.");
    };

    if (window.turnstile) {
      mount();
    } else {
      if (!script) {
        script = document.createElement("script");
        script.src = SCRIPT_URL;
        script.async = true;
        script.dataset.lazyTurnstile = "true";
        document.head.appendChild(script);
      }
      script.addEventListener("load", mount);
      script.addEventListener("error", failed);
    }

    return () => {
      cancelled = true;
      script?.removeEventListener("load", mount);
      script?.removeEventListener("error", failed);
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      changeRef.current("");
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current !== null && window.turnstile) {
      changeRef.current("");
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetSignal]);

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Verification is required to submit a spelling.
      </p>
      <div ref={containerRef} aria-label="Spam protection verification" />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
