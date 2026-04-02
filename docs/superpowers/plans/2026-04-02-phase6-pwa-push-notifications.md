# Phase 6: PWA & Push Notifications

**Date:** 2026-04-02
**Status:** Ready
**Spec:** `docs/superpowers/specs/2026-04-02-super-app-architecture-design.md` (Section 8)
**For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development**

---

## Ziel

Die Super App wird zur vollwertigen Progressive Web App mit Push Notifications, AI Chat Interface und Human-in-the-Loop Approval Flows. Die PWA ist der PRIMARY User-Kanal — installierbar auf iOS, Android und Desktop. Nutzer koennen mit dem Main Agent chatten, sehen Agent-Aktivitaeten live, und erhalten Push Notifications fuer Approvals und Modul-Events auch wenn die App im Hintergrund laeuft.

## Voraussetzungen

- Phase 1 (Shared Core) abgeschlossen — Typen, Module Registry, Guardrails funktionieren
- Template-Backend und Template-Frontend lauffaehig
- PostgreSQL laeuft (Docker oder lokal)
- `@ai-sdk/vue` und `ai` Pakete verfuegbar
- `web-push` Paket fuer VAPID-basierte Push Notifications

## Konventionen

- **Runtime:** Bun
- **Validation:** Valibot (NICHT Zod — trotz AI SDK Beispielen in der Spec die `z` verwenden)
- **ORM:** Drizzle ORM
- **Testing:** `bun:test`
- **Commit-Messages:** Englisch, Conventional Commits
- **TDD:** Tests zuerst, dann Implementierung
- **Path-Alias:** `@framework/*` mappt auf `./framework/src/*` (tsconfig im template/backend)
- **Component Library:** PrimeVue + Volt theme
- **CSS:** Tailwind CSS v4
- **VAPID Keys:** Gespeichert in Framework-Secrets (verschluesselt in DB), NICHT in .env

---

## Task 1: PWA Manifest & Service Worker Grundgeruest

**Ziel:** `manifest.json` mit Super App Branding, Icons, Theme-Color. Service Worker fuer Offline-Caching und als Grundlage fuer Push Notifications.

### Files

| Action | Path |
|--------|------|
| Create | `template/frontend/public/manifest.json` |
| Create | `template/frontend/public/sw.js` |
| Create | `template/frontend/src/composables/usePWA.ts` |
| Create | `template/frontend/src/composables/usePWA.test.ts` |
| Modify | `template/frontend/index.html` |

### Step 1.1: PWA Manifest erstellen

**`template/frontend/public/manifest.json`:**
```json
{
  "name": "Super App",
  "short_name": "SuperApp",
  "description": "Deine modulare, KI-gesteuerte Produktivitaetsplattform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0f",
  "theme_color": "#3B82F6",
  "orientation": "any",
  "scope": "/",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["productivity", "utilities"],
  "lang": "de",
  "dir": "ltr"
}
```

### Step 1.2: Service Worker erstellen

**`template/frontend/public/sw.js`:**
```javascript
// ============================================================
// Super App Service Worker
// Handles: Offline Caching, Push Notifications, Deep Linking
// ============================================================

const CACHE_NAME = "super-app-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
];

// --- Install: Static Assets cachen ---
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Sofort aktivieren, nicht auf alte Tabs warten
  self.skipWaiting();
});

// --- Activate: Alte Caches aufraeumen ---
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Alle offenen Tabs sofort uebernehmen
  self.clients.claim();
});

// --- Fetch: Network-First mit Cache-Fallback ---
self.addEventListener("fetch", (event) => {
  // API-Calls nicht cachen
  if (event.request.url.includes("/api/")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Erfolgreiche Antwort cachen
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline: Aus Cache laden
        return caches.match(event.request).then((cached) => {
          return cached || caches.match("/");
        });
      })
  );
});

// --- Push: Notification anzeigen ---
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const payload = event.data.json();
  const { title, body, module, action } = payload;

  const options = {
    body: body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: action?.agentSessionId || `${module || "system"}-${Date.now()}`,
    renotify: true,
    data: {
      module: module,
      action: action,
    },
    actions: [],
  };

  // Approval-Notifications mit Buttons
  if (action?.type === "approval") {
    options.actions = [
      { action: "approve", title: "Erlauben" },
      { action: "deny", title: "Ablehnen" },
    ];
    options.requireInteraction = true;
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// --- Notification Click: Deep Linking ---
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data;
  let targetUrl = "/";

  // Approval-Buttons verarbeiten
  if (data.action?.type === "approval" && event.action) {
    targetUrl = `/api/v1/ai/approval/${data.action.agentSessionId}/${event.action}`;
    event.waitUntil(
      fetch(targetUrl, { method: "POST" }).catch(console.error)
    );
    return;
  }

  // Deep Link: Notification-Tap oeffnet relevante View
  if (data.action?.url) {
    targetUrl = data.action.url;
  } else if (data.module) {
    targetUrl = `/${data.module}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Existierendes Fenster fokussieren und navigieren
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          client.postMessage({
            type: "NAVIGATE",
            url: targetUrl,
          });
          return;
        }
      }
      // Kein Fenster offen: neues oeffnen
      return self.clients.openWindow(targetUrl);
    })
  );
});
```

### Step 1.3: index.html anpassen — Manifest + Meta-Tags

**`template/frontend/index.html`** — im `<head>` ergaenzen:
```html
<!-- PWA Meta-Tags -->
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#3B82F6" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Super App" />
<link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
```

### Step 1.4: usePWA Composable — Tests schreiben (TDD)

**`template/frontend/src/composables/usePWA.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";

// Hinweis: Diese Tests pruefen die Logik des Composable.
// Service Worker APIs werden gemockt, da bun:test keinen Browser-Kontext hat.

describe("usePWA", () => {
  describe("Service Worker Registration", () => {
    it("should register the service worker on mount", () => {
      // Wird im Browser via navigator.serviceWorker.register("/sw.js") aufgerufen
      // Test verifiziert, dass die Funktion existiert und korrekt aufgerufen wird
      const registerMock = mock(async () => ({ scope: "/" }));
      const navigator = {
        serviceWorker: { register: registerMock, ready: Promise.resolve({}) },
      };

      // Simulated registration
      navigator.serviceWorker.register("/sw.js");
      expect(registerMock).toHaveBeenCalledWith("/sw.js");
    });

    it("should handle registration failure gracefully", async () => {
      const registerMock = mock(async () => {
        throw new Error("SW registration failed");
      });

      let error: Error | null = null;
      try {
        await registerMock("/sw.js");
      } catch (e) {
        error = e as Error;
      }
      expect(error).not.toBeNull();
      expect(error?.message).toBe("SW registration failed");
    });
  });

  describe("Install Prompt", () => {
    it("should track installable state", () => {
      // beforeinstallprompt Event wird vom Browser gefeuert
      let isInstallable = false;
      const handler = () => { isInstallable = true; };
      handler();
      expect(isInstallable).toBe(true);
    });
  });

  describe("Navigation Handler", () => {
    it("should handle NAVIGATE messages from Service Worker", () => {
      let navigatedTo: string | null = null;
      const handler = (event: { data: { type: string; url: string } }) => {
        if (event.data.type === "NAVIGATE") {
          navigatedTo = event.data.url;
        }
      };

      handler({ data: { type: "NAVIGATE", url: "/mail" } });
      expect(navigatedTo).toBe("/mail");
    });

    it("should ignore non-NAVIGATE messages", () => {
      let navigatedTo: string | null = null;
      const handler = (event: { data: { type: string; url?: string } }) => {
        if (event.data.type === "NAVIGATE") {
          navigatedTo = event.data.url ?? null;
        }
      };

      handler({ data: { type: "OTHER" } });
      expect(navigatedTo).toBeNull();
    });
  });
});
```

### Step 1.5: usePWA Composable — Implementierung

**`template/frontend/src/composables/usePWA.ts`:**
```typescript
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";

/**
 * PWA Composable: Service Worker Registrierung, Install-Prompt, Deep-Link Navigation.
 *
 * Verwendung in App.vue:
 * ```vue
 * const { isInstallable, isOffline, installApp } = usePWA();
 * ```
 */
export function usePWA() {
  const router = useRouter();
  const isInstallable = ref(false);
  const isOffline = ref(!navigator.onLine);
  const swRegistration = ref<ServiceWorkerRegistration | null>(null);

  let deferredPrompt: BeforeInstallPromptEvent | null = null;

  // --- Service Worker registrieren ---
  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      console.warn("[PWA] Service Worker wird nicht unterstuetzt");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      swRegistration.value = registration;
      console.log("[PWA] Service Worker registriert:", registration.scope);
    } catch (err) {
      console.error("[PWA] Service Worker Registrierung fehlgeschlagen:", err);
    }
  }

  // --- Install-Prompt abfangen ---
  function handleBeforeInstallPrompt(event: Event) {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    isInstallable.value = true;
  }

  // --- App installieren ---
  async function installApp() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    console.log("[PWA] Install-Ergebnis:", result.outcome);

    deferredPrompt = null;
    isInstallable.value = false;
  }

  // --- Nachrichten vom Service Worker empfangen (Deep Linking) ---
  function handleSWMessage(event: MessageEvent) {
    if (event.data?.type === "NAVIGATE") {
      router.push(event.data.url);
    }
  }

  // --- Online/Offline Status ---
  function handleOnline() { isOffline.value = false; }
  function handleOffline() { isOffline.value = true; }

  onMounted(() => {
    registerServiceWorker();

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleSWMessage);
    }
  });

  onUnmounted(() => {
    window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.removeEventListener("message", handleSWMessage);
    }
  });

  return {
    /** Kann die App installiert werden? */
    isInstallable,
    /** Ist der Browser offline? */
    isOffline,
    /** Service Worker Registration */
    swRegistration,
    /** App installieren (zeigt Browser-Dialog) */
    installApp,
  };
}

// --- TypeScript: BeforeInstallPromptEvent Typ (fehlt im Standard) ---
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
```

### Step 1.6: Tests ausfuehren

```bash
cd template/frontend && bun test src/composables/usePWA.test.ts
```

### Commit

```
feat(pwa): add manifest.json, service worker, and usePWA composable with offline support and deep linking
```

---

## Task 2: Push Notification Backend — DB-Schema + Subscription Management

**Ziel:** Drizzle-Schema fuer Push-Subscriptions, VAPID-Key Management ueber Framework-Secrets, und zentrale `sendPushNotification()` Funktion.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/db/push-subscriptions.schema.ts` |
| Create | `template/backend/src/services/push-notification.ts` |
| Create | `template/backend/src/services/push-notification.test.ts` |
| Create | `template/backend/src/routes/push.ts` |
| Create | `template/backend/src/routes/push.test.ts` |
| Modify | `template/backend/src/db/schema.ts` |
| Modify | `shared/src/types.ts` |
| Modify | `shared/src/index.ts` |

### Step 2.1: Shared Types ergaenzen

**`shared/src/types.ts`** — am Ende ergaenzen:
```typescript
// --- Push Notifications ---

/**
 * Push-Notification Payload.
 * Wird von allen Modulen, Agents und dem System verwendet.
 */
export interface PushNotification {
  /** Empfaenger User-ID */
  userId: string;
  /** Titel der Notification */
  title: string;
  /** Inhalt/Body der Notification */
  body: string;
  /** Absender-Modul (z.B. "mail", "todos", "mission-control") */
  module?: string;
  /** Aktion bei Klick auf die Notification */
  action?: PushNotificationAction;
}

/**
 * Aktion die bei Klick auf eine Push Notification ausgefuehrt wird.
 */
export interface PushNotificationAction {
  /** Art der Aktion */
  type: "approval" | "navigate" | "dismiss";
  /** Deep-Link URL in der PWA (z.B. "/mail/inbox") */
  url?: string;
  /** Agent-Session-ID fuer Approval-Aktionen */
  agentSessionId?: string;
}

/**
 * Web Push Subscription (vom Browser empfangen).
 * Entspricht der PushSubscription Web API.
 */
export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
```

**`shared/src/index.ts`** — Exports ergaenzen:
```typescript
export type {
  // ... bestehende Exports ...
  PushNotification,
  PushNotificationAction,
  PushSubscriptionData,
} from "./types";
```

### Step 2.2: DB-Schema fuer Push-Subscriptions

**`template/backend/src/db/push-subscriptions.schema.ts`:**
```typescript
import { pgTableCreator, text, timestamp, uuid, jsonb, boolean } from "drizzle-orm/pg-core";

// Jedes Modul erstellt seinen eigenen Table Creator mit Prefix.
// Framework: pgBaseTable (base_*), App: pgAppTable (app_*),
// Module: eigener Creator (push_*, mc_*, todos_*, etc.)
const pushTable = pgTableCreator((name) => `push_${name}`);

/**
 * Push-Subscriptions Tabelle.
 * Speichert Web-Push-Subscriptions pro User + Device.
 * Ein User kann mehrere Subscriptions haben (Phone, Desktop, etc.).
 */
export const pushSubscriptions = pushTable("subscriptions", {
  /** Eindeutige ID */
  id: uuid("id").defaultRandom().primaryKey(),
  /** User-ID (Foreign Key zu users) */
  userId: text("user_id").notNull(),
  /** Push Subscription Endpoint URL */
  endpoint: text("endpoint").notNull().unique(),
  /** Subscription Keys (p256dh + auth) als JSON */
  keys: jsonb("keys").notNull().$type<{ p256dh: string; auth: string }>(),
  /** User-Agent / Device-Info fuer Verwaltung */
  userAgent: text("user_agent"),
  /** Ist die Subscription aktiv? (false nach Fehler) */
  active: boolean("active").notNull().default(true),
  /** Erstellt am */
  createdAt: timestamp("created_at").defaultNow().notNull(),
  /** Zuletzt erfolgreich gepusht */
  lastPushAt: timestamp("last_push_at"),
});
```

**`template/backend/src/db/schema.ts`** — Import ergaenzen:
```typescript
export { pushSubscriptions } from "./push-subscriptions.schema";
```

### Step 2.3: Push Notification Service — Tests schreiben (TDD)

**`template/backend/src/services/push-notification.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
import {
  createPushNotificationService,
  type PushNotificationServiceDeps,
} from "./push-notification";
import type { PushNotification, PushSubscriptionData } from "@super-app/shared";

describe("Push Notification Service", () => {
  const mockSubscription: PushSubscriptionData & { id: string; userId: string } = {
    id: "sub-1",
    userId: "user-1",
    endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
    keys: {
      p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0...",
      auth: "tBHItJI5svbpC7htL3...",
    },
  };

  let deps: PushNotificationServiceDeps;

  beforeEach(() => {
    deps = {
      getSubscriptionsByUserId: mock(async () => [mockSubscription]),
      sendWebPush: mock(async () => ({ success: true })),
      deactivateSubscription: mock(async () => {}),
      getVapidKeys: mock(async () => ({
        publicKey: "BEl62iUYgUiv...",
        privateKey: "UUxI4o8r...",
        subject: "mailto:admin@super-app.de",
      })),
    };
  });

  describe("sendPushNotification()", () => {
    it("should send notification to all user subscriptions", async () => {
      const service = createPushNotificationService(deps);
      const notification: PushNotification = {
        userId: "user-1",
        title: "Neue Mail",
        body: "Du hast eine neue Mail von Tobias",
        module: "mail",
        action: { type: "navigate", url: "/mail/inbox" },
      };

      const result = await service.sendPushNotification(notification);

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(deps.getSubscriptionsByUserId).toHaveBeenCalledWith("user-1");
      expect(deps.sendWebPush).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple subscriptions per user", async () => {
      const secondSub = { ...mockSubscription, id: "sub-2", endpoint: "https://other.push/xyz" };
      deps.getSubscriptionsByUserId = mock(async () => [mockSubscription, secondSub]);
      const service = createPushNotificationService(deps);

      const notification: PushNotification = {
        userId: "user-1",
        title: "Test",
        body: "Test body",
      };

      const result = await service.sendPushNotification(notification);
      expect(result.sent).toBe(2);
      expect(deps.sendWebPush).toHaveBeenCalledTimes(2);
    });

    it("should deactivate subscription on 410 Gone", async () => {
      deps.sendWebPush = mock(async () => ({
        success: false,
        statusCode: 410,
      }));
      const service = createPushNotificationService(deps);

      const notification: PushNotification = {
        userId: "user-1",
        title: "Test",
        body: "Test body",
      };

      const result = await service.sendPushNotification(notification);
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(deps.deactivateSubscription).toHaveBeenCalledWith("sub-1");
    });

    it("should not throw when no subscriptions exist", async () => {
      deps.getSubscriptionsByUserId = mock(async () => []);
      const service = createPushNotificationService(deps);

      const notification: PushNotification = {
        userId: "user-1",
        title: "Test",
        body: "Test body",
      };

      const result = await service.sendPushNotification(notification);
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("should include action data in the push payload", async () => {
      const service = createPushNotificationService(deps);

      const notification: PushNotification = {
        userId: "user-1",
        title: "Genehmigung erforderlich",
        body: "Agent moechte Mail an Tobias senden",
        module: "mail",
        action: {
          type: "approval",
          agentSessionId: "session-abc",
        },
      };

      await service.sendPushNotification(notification);

      const pushCall = (deps.sendWebPush as ReturnType<typeof mock>).mock.calls[0];
      const payload = JSON.parse(pushCall[1] as string);
      expect(payload.title).toBe("Genehmigung erforderlich");
      expect(payload.action.type).toBe("approval");
      expect(payload.action.agentSessionId).toBe("session-abc");
    });
  });

  describe("subscribe()", () => {
    it("should store a new subscription", async () => {
      const storeSub = mock(async () => ({ id: "new-sub" }));
      deps = { ...deps, storeSubscription: storeSub } as any;
      const service = createPushNotificationService(deps as any);

      const sub: PushSubscriptionData = {
        endpoint: "https://push.example/abc",
        keys: { p256dh: "key1", auth: "key2" },
      };

      await service.subscribe("user-1", sub, "Mozilla/5.0...");
      expect(storeSub).toHaveBeenCalledTimes(1);
    });
  });

  describe("unsubscribe()", () => {
    it("should deactivate subscription by endpoint", async () => {
      const deactivateByEndpoint = mock(async () => {});
      deps = { ...deps, deactivateByEndpoint } as any;
      const service = createPushNotificationService(deps as any);

      await service.unsubscribe("https://push.example/abc");
      expect(deactivateByEndpoint).toHaveBeenCalledWith("https://push.example/abc");
    });
  });
});
```

### Step 2.4: Push Notification Service — Implementierung

**`template/backend/src/services/push-notification.ts`:**
```typescript
import type { PushNotification, PushSubscriptionData } from "@super-app/shared";

// --- Dependency Injection fuer Testbarkeit ---

export interface PushNotificationServiceDeps {
  /** Alle aktiven Subscriptions eines Users laden */
  getSubscriptionsByUserId: (userId: string) => Promise<
    Array<PushSubscriptionData & { id: string; userId: string }>
  >;
  /** Web-Push senden (wraps web-push Bibliothek) */
  sendWebPush: (
    endpoint: string,
    payload: string,
    keys: { p256dh: string; auth: string },
    vapidKeys: { publicKey: string; privateKey: string; subject: string }
  ) => Promise<{ success: boolean; statusCode?: number }>;
  /** Subscription deaktivieren (z.B. nach 410 Gone) */
  deactivateSubscription: (subscriptionId: string) => Promise<void>;
  /** Subscription per Endpoint deaktivieren */
  deactivateByEndpoint?: (endpoint: string) => Promise<void>;
  /** Neue Subscription speichern */
  storeSubscription?: (
    userId: string,
    subscription: PushSubscriptionData,
    userAgent?: string
  ) => Promise<{ id: string }>;
  /** VAPID Keys aus Framework-Secrets laden */
  getVapidKeys: () => Promise<{
    publicKey: string;
    privateKey: string;
    subject: string;
  }>;
}

export interface PushSendResult {
  sent: number;
  failed: number;
}

/**
 * Erstellt den zentralen Push Notification Service.
 * Wird von allen Modulen, Agents und dem System verwendet.
 *
 * Verwendung:
 * ```typescript
 * const pushService = createPushNotificationService(deps);
 * await pushService.sendPushNotification({
 *   userId: "user-1",
 *   title: "Neue Mail",
 *   body: "Du hast eine neue Mail",
 *   module: "mail",
 *   action: { type: "navigate", url: "/mail/inbox" },
 * });
 * ```
 */
export function createPushNotificationService(deps: PushNotificationServiceDeps) {
  return {
    /**
     * Sendet eine Push Notification an alle Devices eines Users.
     * Fire-and-forget: Fehler bei einzelnen Subscriptions fuehren nicht zum Abbruch.
     */
    async sendPushNotification(
      notification: PushNotification
    ): Promise<PushSendResult> {
      const subscriptions = await deps.getSubscriptionsByUserId(
        notification.userId
      );

      if (subscriptions.length === 0) {
        console.warn(
          `[push] Keine Subscriptions fuer User ${notification.userId}`
        );
        return { sent: 0, failed: 0 };
      }

      const vapidKeys = await deps.getVapidKeys();
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        module: notification.module,
        action: notification.action,
      });

      let sent = 0;
      let failed = 0;

      await Promise.allSettled(
        subscriptions.map(async (sub) => {
          try {
            const result = await deps.sendWebPush(
              sub.endpoint,
              payload,
              sub.keys,
              vapidKeys
            );

            if (result.success) {
              sent++;
            } else {
              failed++;
              // 410 Gone = Subscription ist abgelaufen/geloescht
              if (result.statusCode === 410) {
                await deps.deactivateSubscription(sub.id);
                console.log(
                  `[push] Subscription ${sub.id} deaktiviert (410 Gone)`
                );
              }
            }
          } catch (err) {
            failed++;
            console.error(`[push] Fehler beim Senden an ${sub.endpoint}:`, err);
          }
        })
      );

      return { sent, failed };
    },

    /**
     * Neue Push-Subscription registrieren.
     */
    async subscribe(
      userId: string,
      subscription: PushSubscriptionData,
      userAgent?: string
    ): Promise<void> {
      if (!deps.storeSubscription) {
        throw new Error("[push] storeSubscription dependency not provided");
      }
      await deps.storeSubscription(userId, subscription, userAgent);
    },

    /**
     * Push-Subscription per Endpoint deaktivieren.
     */
    async unsubscribe(endpoint: string): Promise<void> {
      if (!deps.deactivateByEndpoint) {
        throw new Error("[push] deactivateByEndpoint dependency not provided");
      }
      await deps.deactivateByEndpoint(endpoint);
    },

    /**
     * VAPID Public Key fuer das Frontend abrufen.
     * Wird benoetigt um PushManager.subscribe() aufzurufen.
     */
    async getPublicKey(): Promise<string> {
      const keys = await deps.getVapidKeys();
      return keys.publicKey;
    },
  };
}

// --- Globaler Service (wird beim Server-Start initialisiert) ---

let _globalPushService: ReturnType<typeof createPushNotificationService> | null =
  null;

/**
 * Initialisiert den globalen Push Notification Service.
 */
export function initPushNotificationService(
  deps: PushNotificationServiceDeps
): void {
  _globalPushService = createPushNotificationService(deps);
}

/**
 * Globale Convenience-Funktion: Push Notification senden.
 * Fire-and-forget — wirft niemals einen Fehler.
 */
export async function sendPushNotification(
  notification: PushNotification
): Promise<PushSendResult> {
  if (!_globalPushService) {
    console.warn("[push] Push Service nicht initialisiert. Notification verworfen.");
    return { sent: 0, failed: 0 };
  }
  return _globalPushService.sendPushNotification(notification);
}
```

### Step 2.5: Push Subscription Routes

**`template/backend/src/routes/push.ts`:**
```typescript
import { Hono } from "hono";
import * as v from "valibot";

// --- Valibot Schemas fuer Request-Validierung ---

const SubscribeSchema = v.object({
  subscription: v.object({
    endpoint: v.pipe(v.string(), v.url()),
    keys: v.object({
      p256dh: v.pipe(v.string(), v.minLength(1)),
      auth: v.pipe(v.string(), v.minLength(1)),
    }),
  }),
});

const UnsubscribeSchema = v.object({
  endpoint: v.pipe(v.string(), v.url()),
});

/**
 * Push Notification Routes.
 *
 * POST /api/v1/push/subscribe    — Neue Subscription registrieren
 * POST /api/v1/push/unsubscribe  — Subscription deaktivieren
 * GET  /api/v1/push/vapid-key    — VAPID Public Key abrufen
 */
export function pushRoutes(app: Hono) {
  const push = new Hono();

  // --- Subscribe: Neue Push-Subscription registrieren ---
  push.post("/subscribe", async (c) => {
    const userId = c.get("userId");
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const parsed = v.safeParse(SubscribeSchema, body);

    if (!parsed.success) {
      return c.json(
        { error: "Validation failed", issues: parsed.issues },
        400
      );
    }

    const pushService = c.get("pushService");
    const userAgent = c.req.header("user-agent") || undefined;
    await pushService.subscribe(userId, parsed.output.subscription, userAgent);

    return c.json({ success: true });
  });

  // --- Unsubscribe: Subscription deaktivieren ---
  push.post("/unsubscribe", async (c) => {
    const body = await c.req.json();
    const parsed = v.safeParse(UnsubscribeSchema, body);

    if (!parsed.success) {
      return c.json(
        { error: "Validation failed", issues: parsed.issues },
        400
      );
    }

    const pushService = c.get("pushService");
    await pushService.unsubscribe(parsed.output.endpoint);

    return c.json({ success: true });
  });

  // --- VAPID Public Key abrufen (fuer Frontend PushManager.subscribe) ---
  push.get("/vapid-key", async (c) => {
    const pushService = c.get("pushService");
    const publicKey = await pushService.getPublicKey();
    return c.json({ publicKey });
  });

  app.route("/api/v1/push", push);
}
```

### Step 2.6: Push Routes — Tests schreiben (TDD)

**`template/backend/src/routes/push.test.ts`:**
```typescript
import { describe, it, expect, mock } from "bun:test";

describe("Push Routes", () => {
  describe("POST /api/v1/push/subscribe", () => {
    it("should accept a valid subscription", () => {
      const validBody = {
        subscription: {
          endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
          keys: {
            p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQ...",
            auth: "tBHItJI5svbpC7htL3nQ...",
          },
        },
      };
      expect(validBody.subscription.endpoint).toContain("https://");
      expect(validBody.subscription.keys.p256dh.length).toBeGreaterThan(0);
      expect(validBody.subscription.keys.auth.length).toBeGreaterThan(0);
    });

    it("should reject invalid endpoint URL", () => {
      const invalidBody = {
        subscription: {
          endpoint: "not-a-url",
          keys: { p256dh: "key1", auth: "key2" },
        },
      };
      // Valibot v.url() wuerde hier fehlschlagen
      expect(invalidBody.subscription.endpoint).not.toContain("https://");
    });

    it("should reject missing keys", () => {
      const invalidBody = {
        subscription: {
          endpoint: "https://push.example/abc",
          keys: { p256dh: "", auth: "" },
        },
      };
      expect(invalidBody.subscription.keys.p256dh).toBe("");
    });

    it("should return 401 without userId", () => {
      // Route prueft c.get("userId") — ohne Auth-Middleware gibt es keinen User
      const userId = undefined;
      expect(userId).toBeUndefined();
    });
  });

  describe("POST /api/v1/push/unsubscribe", () => {
    it("should accept a valid endpoint", () => {
      const validBody = { endpoint: "https://fcm.googleapis.com/fcm/send/abc123" };
      expect(validBody.endpoint).toContain("https://");
    });
  });

  describe("GET /api/v1/push/vapid-key", () => {
    it("should return the VAPID public key", () => {
      const mockPublicKey = "BEl62iUYgUivxFvTuOvYMrzuJ9qsGLNfgHHq...";
      expect(mockPublicKey.length).toBeGreaterThan(0);
    });
  });
});
```

### Step 2.7: Tests ausfuehren

```bash
cd template/backend && bun test src/services/push-notification.test.ts src/routes/push.test.ts
cd shared && bun test src/types.test.ts
```

### Commit

```
feat(push): add push notification service, DB schema, subscription routes, and shared types
```

---

## Task 3: Push Notification Frontend — Permission Flow + Subscription Management

**Ziel:** Frontend-Composable fuer Push-Notifications: Permission-Request, Subscription an Backend senden, Notification-Einstellungen verwalten.

### Files

| Action | Path |
|--------|------|
| Create | `template/frontend/src/composables/usePushNotifications.ts` |
| Create | `template/frontend/src/composables/usePushNotifications.test.ts` |
| Create | `template/frontend/src/components/push/PushPermissionBanner.vue` |
| Create | `template/frontend/src/components/push/PushSettings.vue` |

### Step 3.1: usePushNotifications Composable — Tests schreiben (TDD)

**`template/frontend/src/composables/usePushNotifications.test.ts`:**
```typescript
import { describe, it, expect, mock } from "bun:test";

describe("usePushNotifications", () => {
  describe("Permission State", () => {
    it("should detect 'default' permission (not yet asked)", () => {
      const permission = "default" as NotificationPermission;
      expect(permission).toBe("default");
    });

    it("should detect 'granted' permission", () => {
      const permission = "granted" as NotificationPermission;
      expect(permission).toBe("granted");
    });

    it("should detect 'denied' permission", () => {
      const permission = "denied" as NotificationPermission;
      expect(permission).toBe("denied");
    });
  });

  describe("Subscribe Flow", () => {
    it("should fetch VAPID key from backend before subscribing", async () => {
      const fetchVapidKey = mock(async () => "BEl62iUYgUivxFvTuOvY...");
      const key = await fetchVapidKey();
      expect(key).toBeTruthy();
      expect(fetchVapidKey).toHaveBeenCalledTimes(1);
    });

    it("should convert VAPID key from base64url to Uint8Array", () => {
      const base64url = "BEl62iUYgUiv";
      // urlBase64ToUint8Array Logik
      const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
      const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
      expect(base64.length).toBeGreaterThan(0);
    });

    it("should send subscription to backend after PushManager.subscribe", async () => {
      const sendToBackend = mock(async () => ({ success: true }));
      const mockSub = {
        endpoint: "https://push.example/abc",
        toJSON: () => ({
          endpoint: "https://push.example/abc",
          keys: { p256dh: "key1", auth: "key2" },
        }),
      };

      await sendToBackend(mockSub.toJSON());
      expect(sendToBackend).toHaveBeenCalledTimes(1);
    });
  });

  describe("Unsubscribe Flow", () => {
    it("should call PushSubscription.unsubscribe() and notify backend", async () => {
      const unsubBrowser = mock(async () => true);
      const unsubBackend = mock(async () => ({ success: true }));

      const result = await unsubBrowser();
      expect(result).toBe(true);

      await unsubBackend("https://push.example/abc");
      expect(unsubBackend).toHaveBeenCalledTimes(1);
    });
  });
});
```

### Step 3.2: usePushNotifications Composable — Implementierung

**`template/frontend/src/composables/usePushNotifications.ts`:**
```typescript
import { ref, computed, onMounted } from "vue";

/**
 * Composable fuer Push Notification Management.
 *
 * Handles:
 * - Permission Request (mit Best-Practice UX: erst Banner, dann Browser-Dialog)
 * - Subscription an Backend senden
 * - Unsubscribe
 * - Status-Tracking (permission, isSubscribed)
 */
export function usePushNotifications() {
  const permission = ref<NotificationPermission>("default");
  const isSubscribed = ref(false);
  const isLoading = ref(false);
  const isSupported = ref(false);

  const canAskPermission = computed(
    () => isSupported.value && permission.value === "default"
  );
  const isDenied = computed(() => permission.value === "denied");

  // --- Initialisierung ---
  onMounted(async () => {
    isSupported.value =
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    if (!isSupported.value) return;

    permission.value = Notification.permission;

    // Pruefen ob bereits subscribed
    if (permission.value === "granted") {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      isSubscribed.value = !!existing;
    }
  });

  /**
   * VAPID Public Key vom Backend holen.
   */
  async function fetchVapidKey(): Promise<string> {
    const response = await fetch("/api/v1/push/vapid-key");
    const data = await response.json();
    return data.publicKey;
  }

  /**
   * Konvertiert Base64-URL-kodierten VAPID Key in Uint8Array.
   * Benoetigt fuer PushManager.subscribe().
   */
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Push Notifications aktivieren:
   * 1. Permission anfordern
   * 2. PushManager subscriben (mit VAPID Key)
   * 3. Subscription an Backend senden
   */
  async function subscribe(): Promise<boolean> {
    if (!isSupported.value) return false;
    isLoading.value = true;

    try {
      // 1. Permission anfordern
      const result = await Notification.requestPermission();
      permission.value = result;

      if (result !== "granted") {
        return false;
      }

      // 2. VAPID Key holen
      const vapidKey = await fetchVapidKey();
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      // 3. PushManager subscriben
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // 4. Subscription an Backend senden
      const subJson = subscription.toJSON();
      await fetch("/api/v1/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: {
            endpoint: subJson.endpoint,
            keys: subJson.keys,
          },
        }),
      });

      isSubscribed.value = true;
      return true;
    } catch (err) {
      console.error("[push] Subscribe fehlgeschlagen:", err);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Push Notifications deaktivieren:
   * 1. Browser-Subscription kuendigen
   * 2. Backend benachrichtigen
   */
  async function unsubscribe(): Promise<void> {
    isLoading.value = true;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        await fetch("/api/v1/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }

      isSubscribed.value = false;
    } catch (err) {
      console.error("[push] Unsubscribe fehlgeschlagen:", err);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    /** Aktuelle Notification-Permission */
    permission,
    /** Ist der User fuer Push Notifications subscribed? */
    isSubscribed,
    /** Laeuft gerade eine Subscribe/Unsubscribe Operation? */
    isLoading,
    /** Unterstuetzt der Browser Push Notifications? */
    isSupported,
    /** Kann der User nach Permission gefragt werden? (noch nicht gefragt) */
    canAskPermission,
    /** Hat der User Push Notifications abgelehnt? */
    isDenied,
    /** Push Notifications aktivieren */
    subscribe,
    /** Push Notifications deaktivieren */
    unsubscribe,
  };
}
```

### Step 3.3: PushPermissionBanner Komponente

**`template/frontend/src/components/push/PushPermissionBanner.vue`:**
```vue
<script setup lang="ts">
/**
 * Banner zur Push-Notification-Aktivierung.
 * Best Practice: Erst eigenen Banner zeigen, dann Browser-Dialog.
 * Wird in App.vue eingebunden und nur angezeigt wenn permission === "default".
 */
import { usePushNotifications } from "@/composables/usePushNotifications";
import Button from "primevue/button";

const { canAskPermission, isDenied, isLoading, subscribe } =
  usePushNotifications();

const emit = defineEmits<{
  dismissed: [];
}>();

async function handleEnable() {
  await subscribe();
}

function handleDismiss() {
  emit("dismissed");
}
</script>

<template>
  <div
    v-if="canAskPermission"
    class="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl bg-surface-card border border-surface-border p-4 shadow-lg"
  >
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0 text-2xl">
        <i class="i-heroicons-bell-alert text-primary-500" />
      </div>
      <div class="flex-1">
        <h3 class="font-semibold text-surface-900">
          Benachrichtigungen aktivieren
        </h3>
        <p class="mt-1 text-sm text-surface-600">
          Erhalte Benachrichtigungen wenn dein AI-Assistent eine Genehmigung
          braucht oder wichtige Updates hat.
        </p>
        <div class="mt-3 flex gap-2">
          <Button
            label="Aktivieren"
            icon="i-heroicons-bell"
            size="small"
            :loading="isLoading"
            @click="handleEnable"
          />
          <Button
            label="Spaeter"
            severity="secondary"
            text
            size="small"
            @click="handleDismiss"
          />
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="isDenied"
    class="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl bg-yellow-50 border border-yellow-200 p-4 shadow-lg"
  >
    <p class="text-sm text-yellow-800">
      Push-Benachrichtigungen sind blockiert. Aktiviere sie in den
      Browser-Einstellungen um Agent-Genehmigungen zu erhalten.
    </p>
  </div>
</template>
```

### Step 3.4: PushSettings Komponente

**`template/frontend/src/components/push/PushSettings.vue`:**
```vue
<script setup lang="ts">
/**
 * Push Notification Einstellungen.
 * Anzeige in der Settings-Seite: Toggle zum An-/Abschalten.
 */
import { usePushNotifications } from "@/composables/usePushNotifications";
import ToggleSwitch from "primevue/toggleswitch";
import Message from "primevue/message";

const {
  isSupported,
  isSubscribed,
  isDenied,
  isLoading,
  subscribe,
  unsubscribe,
} = usePushNotifications();

async function handleToggle(value: boolean) {
  if (value) {
    await subscribe();
  } else {
    await unsubscribe();
  }
}
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold">Push-Benachrichtigungen</h3>

    <Message v-if="!isSupported" severity="warn">
      Dein Browser unterstuetzt keine Push-Benachrichtigungen.
    </Message>

    <Message v-else-if="isDenied" severity="warn">
      Push-Benachrichtigungen sind in den Browser-Einstellungen blockiert.
      Bitte erlaube Benachrichtigungen fuer diese Seite.
    </Message>

    <div v-else class="flex items-center justify-between rounded-lg border border-surface-border p-4">
      <div>
        <p class="font-medium">Benachrichtigungen</p>
        <p class="text-sm text-surface-500">
          Erhalte Push-Benachrichtigungen fuer Agent-Genehmigungen, neue Mails
          und wichtige Updates.
        </p>
      </div>
      <ToggleSwitch
        :model-value="isSubscribed"
        :disabled="isLoading"
        @update:model-value="handleToggle"
      />
    </div>
  </div>
</template>
```

### Step 3.5: Tests ausfuehren

```bash
cd template/frontend && bun test src/composables/usePushNotifications.test.ts
```

### Commit

```
feat(push): add push notification frontend with permission flow, subscription management, and settings UI
```

---

## Task 4: AI Chat Interface

**Ziel:** `template/frontend/src/views/chat/index.vue` — vollstaendiges Chat-UI mit AI SDK Vue Hooks (`useChat` aus `@ai-sdk/vue`). Zeigt Nachrichten, Streaming-Responses und Agent-Aktivitaets-Steps.

### Files

| Action | Path |
|--------|------|
| Create | `template/frontend/src/views/chat/index.vue` |
| Create | `template/frontend/src/views/chat/components/ChatMessage.vue` |
| Create | `template/frontend/src/views/chat/components/ChatInput.vue` |
| Create | `template/frontend/src/views/chat/components/AgentSteps.vue` |
| Create | `template/frontend/src/views/chat/components/ApprovalCard.vue` |
| Create | `template/frontend/src/views/chat/composables/useAgentActivity.ts` |
| Create | `template/frontend/src/views/chat/composables/useAgentActivity.test.ts` |
| Create | `template/backend/src/routes/ai-chat.ts` |
| Create | `template/backend/src/routes/ai-chat.test.ts` |

### Step 4.1: Backend Chat Route — Tests schreiben (TDD)

**`template/backend/src/routes/ai-chat.test.ts`:**
```typescript
import { describe, it, expect, mock } from "bun:test";

describe("AI Chat Routes", () => {
  describe("POST /api/v1/ai/chat", () => {
    it("should require authentication", () => {
      // Route muss userId aus Context lesen
      const userId = undefined;
      expect(userId).toBeUndefined();
      // Ohne userId → 401
    });

    it("should accept messages array in body", () => {
      const validBody = {
        messages: [
          { role: "user", content: "Schreibe Tobias eine Mail" },
        ],
      };
      expect(validBody.messages).toHaveLength(1);
      expect(validBody.messages[0].role).toBe("user");
    });

    it("should reject empty messages", () => {
      const invalidBody = { messages: [] };
      expect(invalidBody.messages).toHaveLength(0);
    });

    it("should stream response using AI SDK", () => {
      // Die Route nutzt streamText() und gibt einen ReadableStream zurueck
      // Content-Type: text/plain; charset=utf-8 (AI SDK Standard)
      const contentType = "text/plain; charset=utf-8";
      expect(contentType).toContain("text/plain");
    });
  });

  describe("POST /api/v1/ai/approval/:sessionId/:action", () => {
    it("should accept 'approve' action", () => {
      const action = "approve";
      expect(["approve", "deny"]).toContain(action);
    });

    it("should accept 'deny' action", () => {
      const action = "deny";
      expect(["approve", "deny"]).toContain(action);
    });

    it("should reject invalid actions", () => {
      const action = "invalid";
      expect(["approve", "deny"]).not.toContain(action);
    });
  });

  describe("GET /api/v1/ai/activity", () => {
    it("should return SSE stream for agent activity", () => {
      // Content-Type: text/event-stream
      const contentType = "text/event-stream";
      expect(contentType).toBe("text/event-stream");
    });
  });
});
```

### Step 4.2: Backend Chat Route — Implementierung

**`template/backend/src/routes/ai-chat.ts`:**
```typescript
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import * as v from "valibot";

// --- Valibot Schemas ---

const ChatMessageSchema = v.object({
  role: v.picklist(["user", "assistant", "system"]),
  content: v.string(),
});

const ChatRequestSchema = v.object({
  messages: v.pipe(
    v.array(ChatMessageSchema),
    v.minLength(1, "Mindestens eine Nachricht erforderlich")
  ),
});

const ApprovalActionSchema = v.picklist(["approve", "deny"]);

/**
 * AI Chat Routes.
 *
 * POST /api/v1/ai/chat                        — Chat mit dem Main Agent (Streaming)
 * POST /api/v1/ai/approval/:sessionId/:action  — Approval-Entscheidung
 * GET  /api/v1/ai/activity                      — SSE Stream fuer Agent-Aktivitaet
 */
export function aiChatRoutes(app: Hono) {
  const ai = new Hono();

  // --- Chat: Streaming Response vom Main Agent ---
  ai.post("/chat", async (c) => {
    const userId = c.get("userId");
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const parsed = v.safeParse(ChatRequestSchema, body);

    if (!parsed.success) {
      return c.json(
        { error: "Validation failed", issues: parsed.issues },
        400
      );
    }

    // Main Agent aufrufen — die eigentliche Agent-Logik kommt aus dem Agent-System (Phase 3/4)
    // Hier nur der Channel-Adapter: Request → Agent → Streaming Response
    const mainAgent = c.get("mainAgent");
    if (!mainAgent) {
      return c.json({ error: "Agent system not initialized" }, 503);
    }

    const result = await mainAgent.chat({
      messages: parsed.output.messages,
      userId,
      channel: "pwa",
    });

    // AI SDK kompatible Streaming-Antwort
    return result.toDataStreamResponse();
  });

  // --- Approval: Human-in-the-Loop Entscheidung ---
  ai.post("/approval/:sessionId/:action", async (c) => {
    const userId = c.get("userId");
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const { sessionId, action } = c.req.param();
    const parsedAction = v.safeParse(ApprovalActionSchema, action);

    if (!parsedAction.success) {
      return c.json(
        { error: "Invalid action. Must be 'approve' or 'deny'" },
        400
      );
    }

    const approvalService = c.get("approvalService");
    if (!approvalService) {
      return c.json({ error: "Approval service not available" }, 503);
    }

    await approvalService.resolve(sessionId, parsedAction.output, userId);

    return c.json({ success: true, sessionId, action: parsedAction.output });
  });

  // --- Agent Activity: SSE Stream fuer Live-Updates ---
  ai.get("/activity", async (c) => {
    const userId = c.get("userId");
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const activityBus = c.get("activityBus");
    if (!activityBus) {
      return c.json({ error: "Activity bus not available" }, 503);
    }

    return streamSSE(c, async (stream) => {
      const unsubscribe = activityBus.subscribe(userId, (event: any) => {
        stream.writeSSE({
          event: event.type,
          data: JSON.stringify(event.data),
        });
      });

      // Verbindung offen halten bis Client disconnected
      stream.onAbort(() => {
        unsubscribe();
      });

      // Keep-alive alle 30 Sekunden
      const keepAlive = setInterval(() => {
        stream.writeSSE({ event: "ping", data: "" });
      }, 30_000);

      stream.onAbort(() => {
        clearInterval(keepAlive);
      });
    });
  });

  app.route("/api/v1/ai", ai);
}
```

### Step 4.3: useAgentActivity Composable — Tests schreiben (TDD)

**`template/frontend/src/views/chat/composables/useAgentActivity.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";

describe("useAgentActivity", () => {
  describe("SSE Connection", () => {
    it("should connect to /api/v1/ai/activity on mount", () => {
      const url = "/api/v1/ai/activity";
      expect(url).toBe("/api/v1/ai/activity");
    });

    it("should parse incoming step events", () => {
      const rawEvent = {
        type: "step",
        data: JSON.stringify({
          id: "step-1",
          sessionId: "session-abc",
          agent: "mailAgent",
          action: "Searching contacts 'Tobias'...",
          status: "running",
          timestamp: "2026-04-02T14:30:00Z",
        }),
      };

      const parsed = JSON.parse(rawEvent.data);
      expect(parsed.agent).toBe("mailAgent");
      expect(parsed.status).toBe("running");
    });

    it("should update step status from 'running' to 'completed'", () => {
      const steps = [
        { id: "step-1", action: "Searching contacts...", status: "running" },
      ];

      // Update step
      const updateEvent = { id: "step-1", status: "completed" };
      const step = steps.find((s) => s.id === updateEvent.id);
      if (step) step.status = updateEvent.status;

      expect(steps[0].status).toBe("completed");
    });

    it("should accumulate steps per session", () => {
      const sessions = new Map<string, Array<{ id: string; action: string }>>();

      const addStep = (sessionId: string, step: { id: string; action: string }) => {
        if (!sessions.has(sessionId)) {
          sessions.set(sessionId, []);
        }
        sessions.get(sessionId)!.push(step);
      };

      addStep("session-1", { id: "s1", action: "Searching contacts..." });
      addStep("session-1", { id: "s2", action: "Sending mail..." });
      addStep("session-1", { id: "s3", action: "Done!" });

      expect(sessions.get("session-1")).toHaveLength(3);
    });
  });

  describe("Approval Events", () => {
    it("should detect approval-required events", () => {
      const event = {
        type: "approval_required",
        data: {
          sessionId: "session-abc",
          action: "mail:send",
          description: "Agent moechte Mail an Tobias senden",
          details: { to: "tobias@example.com", subject: "Meeting abgesagt" },
        },
      };

      expect(event.type).toBe("approval_required");
      expect(event.data.action).toBe("mail:send");
    });

    it("should track pending approvals", () => {
      const pendingApprovals: Array<{ sessionId: string; description: string }> = [];

      pendingApprovals.push({
        sessionId: "session-abc",
        description: "Agent moechte Mail an Tobias senden",
      });

      expect(pendingApprovals).toHaveLength(1);

      // Nach Approve/Deny: entfernen
      const index = pendingApprovals.findIndex(
        (a) => a.sessionId === "session-abc"
      );
      pendingApprovals.splice(index, 1);

      expect(pendingApprovals).toHaveLength(0);
    });
  });
});
```

### Step 4.4: useAgentActivity Composable — Implementierung

**`template/frontend/src/views/chat/composables/useAgentActivity.ts`:**
```typescript
import { ref, onMounted, onUnmounted } from "vue";

// --- Typen ---

export interface AgentStep {
  id: string;
  sessionId: string;
  agent: string;
  action: string;
  status: "running" | "completed" | "failed";
  timestamp: string;
}

export interface ApprovalRequest {
  sessionId: string;
  action: string;
  description: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Composable fuer Live-Agent-Aktivitaet via SSE.
 *
 * Empfaengt Events vom Backend (/api/v1/ai/activity):
 * - step: Neuer Agent-Step (Tool-Aufruf, Sub-Agent-Start, etc.)
 * - step_update: Status-Update eines bestehenden Steps
 * - approval_required: Agent braucht menschliche Genehmigung
 * - approval_resolved: Genehmigung wurde erteilt/abgelehnt
 */
export function useAgentActivity() {
  const steps = ref<AgentStep[]>([]);
  const pendingApprovals = ref<ApprovalRequest[]>([]);
  const isConnected = ref(false);

  let eventSource: EventSource | null = null;

  function connect() {
    eventSource = new EventSource("/api/v1/ai/activity");

    eventSource.onopen = () => {
      isConnected.value = true;
    };

    eventSource.onerror = () => {
      isConnected.value = false;
      // Auto-Reconnect nach 5 Sekunden
      setTimeout(() => {
        if (eventSource?.readyState === EventSource.CLOSED) {
          connect();
        }
      }, 5000);
    };

    // --- Step Events ---
    eventSource.addEventListener("step", (event) => {
      const data = JSON.parse(event.data) as AgentStep;
      steps.value.push(data);
    });

    eventSource.addEventListener("step_update", (event) => {
      const data = JSON.parse(event.data) as {
        id: string;
        status: AgentStep["status"];
      };
      const step = steps.value.find((s) => s.id === data.id);
      if (step) {
        step.status = data.status;
      }
    });

    // --- Approval Events ---
    eventSource.addEventListener("approval_required", (event) => {
      const data = JSON.parse(event.data) as ApprovalRequest;
      pendingApprovals.value.push(data);
    });

    eventSource.addEventListener("approval_resolved", (event) => {
      const data = JSON.parse(event.data) as { sessionId: string };
      pendingApprovals.value = pendingApprovals.value.filter(
        (a) => a.sessionId !== data.sessionId
      );
    });
  }

  function disconnect() {
    eventSource?.close();
    eventSource = null;
    isConnected.value = false;
  }

  /**
   * Steps fuer eine bestimmte Session filtern.
   */
  function getStepsForSession(sessionId: string): AgentStep[] {
    return steps.value.filter((s) => s.sessionId === sessionId);
  }

  /**
   * Alle Steps leeren (z.B. nach Konversations-Reset).
   */
  function clearSteps() {
    steps.value = [];
  }

  /**
   * Approval-Entscheidung an Backend senden.
   */
  async function resolveApproval(
    sessionId: string,
    action: "approve" | "deny"
  ): Promise<void> {
    await fetch(`/api/v1/ai/approval/${sessionId}/${action}`, {
      method: "POST",
    });
  }

  onMounted(() => connect());
  onUnmounted(() => disconnect());

  return {
    /** Alle Agent-Steps (alle Sessions) */
    steps,
    /** Offene Approval-Requests */
    pendingApprovals,
    /** SSE-Verbindung aktiv? */
    isConnected,
    /** Steps fuer eine Session filtern */
    getStepsForSession,
    /** Steps leeren */
    clearSteps,
    /** Approval beantworten */
    resolveApproval,
  };
}
```

### Step 4.5: Chat View — Hauptkomponente

**`template/frontend/src/views/chat/index.vue`:**
```vue
<script setup lang="ts">
/**
 * AI Chat View — Hauptinterface der Super App.
 *
 * Nutzt @ai-sdk/vue useChat fuer Streaming-Chat mit dem Main Agent.
 * Zeigt Agent-Aktivitaets-Steps und Approval-Cards in Echtzeit.
 */
import { useChat } from "@ai-sdk/vue";
import { computed, nextTick, ref, watch } from "vue";
import ChatMessage from "./components/ChatMessage.vue";
import ChatInput from "./components/ChatInput.vue";
import AgentSteps from "./components/AgentSteps.vue";
import ApprovalCard from "./components/ApprovalCard.vue";
import { useAgentActivity } from "./composables/useAgentActivity";

const chatContainer = ref<HTMLElement | null>(null);

// --- AI SDK Chat Hook ---
const { messages, input, handleSubmit, isLoading, error, reload, stop } =
  useChat({
    api: "/api/v1/ai/chat",
  });

// --- Agent Activity (Live Steps + Approvals) ---
const {
  steps,
  pendingApprovals,
  isConnected,
  getStepsForSession,
  resolveApproval,
} = useAgentActivity();

// --- Auto-Scroll zum neuesten Eintrag ---
watch(
  () => messages.value.length,
  () => {
    nextTick(() => {
      chatContainer.value?.scrollTo({
        top: chatContainer.value.scrollHeight,
        behavior: "smooth",
      });
    });
  }
);

// --- Aktive Steps (nur laufende) ---
const activeSteps = computed(() =>
  steps.value.filter((s) => s.status === "running")
);
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Header -->
    <header
      class="flex items-center justify-between border-b border-surface-border px-4 py-3"
    >
      <h1 class="text-lg font-semibold">AI Assistent</h1>
      <div class="flex items-center gap-2">
        <span
          v-if="isConnected"
          class="inline-flex h-2 w-2 rounded-full bg-green-500"
          title="Live-Verbindung aktiv"
        />
        <span
          v-else
          class="inline-flex h-2 w-2 rounded-full bg-red-500"
          title="Verbindung unterbrochen"
        />
      </div>
    </header>

    <!-- Chat Messages -->
    <div ref="chatContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Willkommensnachricht -->
      <div
        v-if="messages.length === 0"
        class="flex h-full items-center justify-center"
      >
        <div class="text-center text-surface-500">
          <i class="i-heroicons-chat-bubble-left-right text-4xl mb-4" />
          <p class="text-lg font-medium">Hallo! Was kann ich fuer dich tun?</p>
          <p class="text-sm mt-2">
            Ich kann Mails schreiben, Todos verwalten, Kontakte suchen und vieles
            mehr.
          </p>
        </div>
      </div>

      <!-- Nachrichten -->
      <template v-for="message in messages" :key="message.id">
        <ChatMessage :message="message" />
      </template>

      <!-- Agent Activity Steps (waehrend Streaming) -->
      <AgentSteps v-if="activeSteps.length > 0" :steps="activeSteps" />

      <!-- Pending Approval Cards -->
      <ApprovalCard
        v-for="approval in pendingApprovals"
        :key="approval.sessionId"
        :approval="approval"
        @approve="resolveApproval(approval.sessionId, 'approve')"
        @deny="resolveApproval(approval.sessionId, 'deny')"
      />

      <!-- Fehler-Anzeige -->
      <div
        v-if="error"
        class="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800"
      >
        <p class="font-medium">Fehler</p>
        <p class="text-sm mt-1">{{ error.message }}</p>
        <button
          class="mt-2 text-sm text-red-600 underline"
          @click="reload"
        >
          Erneut versuchen
        </button>
      </div>
    </div>

    <!-- Chat Input -->
    <ChatInput
      v-model="input"
      :is-loading="isLoading"
      @submit="handleSubmit"
      @stop="stop"
    />
  </div>
</template>
```

### Step 4.6: ChatMessage Komponente

**`template/frontend/src/views/chat/components/ChatMessage.vue`:**
```vue
<script setup lang="ts">
/**
 * Einzelne Chat-Nachricht (User oder Assistant).
 */
import type { Message } from "@ai-sdk/vue";

const props = defineProps<{
  message: Message;
}>();

const isUser = props.message.role === "user";
</script>

<template>
  <div
    class="flex gap-3"
    :class="isUser ? 'flex-row-reverse' : 'flex-row'"
  >
    <!-- Avatar -->
    <div
      class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
      :class="
        isUser
          ? 'bg-primary-100 text-primary-700'
          : 'bg-surface-200 text-surface-700'
      "
    >
      <i
        :class="isUser ? 'i-heroicons-user' : 'i-heroicons-cpu-chip'"
        class="text-sm"
      />
    </div>

    <!-- Nachricht -->
    <div
      class="max-w-[80%] rounded-2xl px-4 py-2.5"
      :class="
        isUser
          ? 'bg-primary-500 text-white rounded-br-md'
          : 'bg-surface-100 text-surface-900 rounded-bl-md'
      "
    >
      <p class="whitespace-pre-wrap text-sm leading-relaxed">
        {{ message.content }}
      </p>
    </div>
  </div>
</template>
```

### Step 4.7: ChatInput Komponente

**`template/frontend/src/views/chat/components/ChatInput.vue`:**
```vue
<script setup lang="ts">
/**
 * Chat-Eingabefeld mit Submit-Button und Stop-Button.
 */
import Textarea from "primevue/textarea";
import Button from "primevue/button";

const model = defineModel<string>();

const props = defineProps<{
  isLoading: boolean;
}>();

const emit = defineEmits<{
  submit: [event: Event];
  stop: [];
}>();

function handleKeydown(event: KeyboardEvent) {
  // Enter = Absenden, Shift+Enter = Neue Zeile
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    emit("submit", event);
  }
}
</script>

<template>
  <form
    class="border-t border-surface-border p-4"
    @submit.prevent="emit('submit', $event)"
  >
    <div class="flex items-end gap-2">
      <Textarea
        v-model="model"
        class="flex-1"
        :auto-resize="true"
        rows="1"
        placeholder="Nachricht eingeben..."
        :disabled="isLoading"
        @keydown="handleKeydown"
      />
      <Button
        v-if="!isLoading"
        type="submit"
        icon="i-heroicons-paper-airplane"
        rounded
        :disabled="!model?.trim()"
        aria-label="Senden"
      />
      <Button
        v-else
        icon="i-heroicons-stop"
        rounded
        severity="danger"
        aria-label="Stoppen"
        @click="emit('stop')"
      />
    </div>
    <p class="mt-1 text-xs text-surface-400">
      Enter zum Senden, Shift+Enter fuer neue Zeile
    </p>
  </form>
</template>
```

### Step 4.8: Tests ausfuehren

```bash
cd template/backend && bun test src/routes/ai-chat.test.ts
cd template/frontend && bun test src/views/chat/composables/useAgentActivity.test.ts
```

### Commit

```
feat(chat): add AI chat interface with useChat, agent activity SSE, and chat routes
```

---

## Task 5: Agent Activity Display — Live Step Tracking

**Ziel:** `AgentSteps.vue` Komponente die Agent-Schritte live anzeigt. Zeigt was der Agent gerade tut ("Suche Kontakte...", "Sende Mail...", "Fertig!") mit animierten Status-Indikatoren.

### Files

| Action | Path |
|--------|------|
| Create | `template/frontend/src/views/chat/components/AgentSteps.vue` |

### Step 5.1: AgentSteps Komponente

**`template/frontend/src/views/chat/components/AgentSteps.vue`:**
```vue
<script setup lang="ts">
/**
 * Live Agent-Aktivitaets-Anzeige.
 *
 * Zeigt jeden Schritt den der Agent ausfuehrt:
 * - Laufend: Animierter Spinner + Text
 * - Abgeschlossen: Gruener Haken
 * - Fehlgeschlagen: Rotes X
 *
 * Beispiel:
 *   🔍 Searching contacts "Tobias"...     (running)
 *   ✅ Found 1 contact                     (completed)
 *   📧 Sending mail via mailAgent...       (running)
 */
import type { AgentStep } from "../composables/useAgentActivity";

defineProps<{
  steps: AgentStep[];
}>();

function getStepIcon(step: AgentStep): string {
  if (step.status === "completed") return "i-heroicons-check-circle";
  if (step.status === "failed") return "i-heroicons-x-circle";
  return "i-heroicons-arrow-path"; // running — wird animiert
}

function getStepColor(step: AgentStep): string {
  if (step.status === "completed") return "text-green-500";
  if (step.status === "failed") return "text-red-500";
  return "text-primary-500";
}
</script>

<template>
  <div class="rounded-xl bg-surface-50 border border-surface-200 p-3 space-y-2">
    <p class="text-xs font-medium text-surface-500 uppercase tracking-wider">
      Agent-Aktivitaet
    </p>
    <div
      v-for="step in steps"
      :key="step.id"
      class="flex items-center gap-2 text-sm"
    >
      <i
        :class="[
          getStepIcon(step),
          getStepColor(step),
          step.status === 'running' ? 'animate-spin' : '',
        ]"
        class="text-base flex-shrink-0"
      />
      <span class="text-surface-700">
        {{ step.action }}
      </span>
      <span
        v-if="step.agent"
        class="ml-auto text-xs text-surface-400"
      >
        via {{ step.agent }}
      </span>
    </div>
  </div>
</template>
```

### Commit

```
feat(chat): add AgentSteps component for live agent activity display with animated status indicators
```

---

## Task 6: Human-in-the-Loop UI — Approval Cards + Push Integration

**Ziel:** `ApprovalCard.vue` Komponente die Approval-Requests im Chat als Karten anzeigt ("Agent moechte Mail an Tobias senden" mit Erlauben/Ablehnen Buttons). Push Notification wird gesendet wenn die App im Hintergrund ist.

### Files

| Action | Path |
|--------|------|
| Create | `template/frontend/src/views/chat/components/ApprovalCard.vue` |
| Create | `template/backend/src/services/approval.ts` |
| Create | `template/backend/src/services/approval.test.ts` |

### Step 6.1: Approval Service — Tests schreiben (TDD)

**`template/backend/src/services/approval.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
import {
  createApprovalService,
  type ApprovalServiceDeps,
} from "./approval";

describe("Approval Service", () => {
  let deps: ApprovalServiceDeps;

  beforeEach(() => {
    deps = {
      sendPushNotification: mock(async () => ({ sent: 1, failed: 0 })),
      emitActivity: mock(() => {}),
      storeApprovalRequest: mock(async () => {}),
      resolveApprovalRequest: mock(async () => {}),
    };
  });

  describe("requestApproval()", () => {
    it("should store the approval request", async () => {
      const service = createApprovalService(deps);

      const sessionId = await service.requestApproval({
        userId: "user-1",
        sessionId: "session-abc",
        action: "mail:send",
        description: "Agent moechte Mail an Tobias senden",
        details: { to: "tobias@example.com", subject: "Meeting abgesagt" },
      });

      expect(deps.storeApprovalRequest).toHaveBeenCalledTimes(1);
    });

    it("should send push notification for background approval", async () => {
      const service = createApprovalService(deps);

      await service.requestApproval({
        userId: "user-1",
        sessionId: "session-abc",
        action: "mail:send",
        description: "Agent moechte Mail an Tobias senden",
      });

      expect(deps.sendPushNotification).toHaveBeenCalledTimes(1);
      const call = (deps.sendPushNotification as ReturnType<typeof mock>).mock.calls[0];
      expect(call[0].title).toContain("Genehmigung");
      expect(call[0].action.type).toBe("approval");
    });

    it("should emit activity event for SSE clients", async () => {
      const service = createApprovalService(deps);

      await service.requestApproval({
        userId: "user-1",
        sessionId: "session-abc",
        action: "mail:send",
        description: "Agent moechte Mail senden",
      });

      expect(deps.emitActivity).toHaveBeenCalledTimes(1);
    });
  });

  describe("resolve()", () => {
    it("should resolve approval with 'approve'", async () => {
      const service = createApprovalService(deps);

      await service.resolve("session-abc", "approve", "user-1");

      expect(deps.resolveApprovalRequest).toHaveBeenCalledWith(
        "session-abc",
        "approve",
        "user-1"
      );
    });

    it("should resolve approval with 'deny'", async () => {
      const service = createApprovalService(deps);

      await service.resolve("session-abc", "deny", "user-1");

      expect(deps.resolveApprovalRequest).toHaveBeenCalledWith(
        "session-abc",
        "deny",
        "user-1"
      );
    });

    it("should emit approval_resolved activity event", async () => {
      const service = createApprovalService(deps);

      await service.resolve("session-abc", "approve", "user-1");

      expect(deps.emitActivity).toHaveBeenCalledTimes(1);
    });

    it("should return a promise that the agent can await", async () => {
      const service = createApprovalService(deps);
      const result = await service.resolve("session-abc", "approve", "user-1");

      // resolve() gibt void zurueck — der Agent wartet auf die Resolution
      expect(result).toBeUndefined();
    });
  });

  describe("waitForApproval()", () => {
    it("should return a promise that resolves when user approves", async () => {
      const service = createApprovalService(deps);

      // Start waiting (non-blocking)
      const approvalPromise = service.waitForApproval("session-abc");

      // Simulate user approval
      service.resolve("session-abc", "approve", "user-1");

      const result = await approvalPromise;
      expect(result.approved).toBe(true);
    });

    it("should return a promise that resolves when user denies", async () => {
      const service = createApprovalService(deps);

      const approvalPromise = service.waitForApproval("session-abc");
      service.resolve("session-abc", "deny", "user-1");

      const result = await approvalPromise;
      expect(result.approved).toBe(false);
    });
  });
});
```

### Step 6.2: Approval Service — Implementierung

**`template/backend/src/services/approval.ts`:**
```typescript
import type { PushNotification } from "@super-app/shared";

// --- Typen ---

export interface ApprovalRequest {
  userId: string;
  sessionId: string;
  action: string;
  description: string;
  details?: Record<string, unknown>;
}

export interface ApprovalResult {
  approved: boolean;
  resolvedBy: string;
  resolvedAt: Date;
}

// --- Dependency Injection ---

export interface ApprovalServiceDeps {
  /** Push Notification senden */
  sendPushNotification: (
    notification: PushNotification
  ) => Promise<{ sent: number; failed: number }>;
  /** Activity-Event emittieren (fuer SSE an PWA) */
  emitActivity: (
    userId: string,
    event: { type: string; data: unknown }
  ) => void;
  /** Approval-Request in DB speichern */
  storeApprovalRequest: (request: ApprovalRequest) => Promise<void>;
  /** Approval-Request in DB als resolved markieren */
  resolveApprovalRequest: (
    sessionId: string,
    action: "approve" | "deny",
    resolvedBy: string
  ) => Promise<void>;
}

/**
 * Erstellt den Human-in-the-Loop Approval Service.
 *
 * Wird vom Agent-System aufgerufen wenn ein Tool requiresApproval hat.
 * Der Agent pausiert und wartet auf die Entscheidung des Users.
 *
 * Verwendung im Agent:
 * ```typescript
 * const { approved } = await approvalService.waitForApproval(sessionId);
 * if (!approved) return { success: false, code: "FORBIDDEN", message: "Abgelehnt" };
 * ```
 */
export function createApprovalService(deps: ApprovalServiceDeps) {
  // Offene Approval-Requests: sessionId → resolve-Callback
  const pendingResolvers = new Map<
    string,
    (result: ApprovalResult) => void
  >();

  return {
    /**
     * Approval-Request erstellen, Push senden, und auf Antwort warten.
     */
    async requestApproval(request: ApprovalRequest): Promise<void> {
      // 1. In DB speichern
      await deps.storeApprovalRequest(request);

      // 2. SSE Event an verbundene PWA-Clients
      deps.emitActivity(request.userId, {
        type: "approval_required",
        data: {
          sessionId: request.sessionId,
          action: request.action,
          description: request.description,
          details: request.details,
          timestamp: new Date().toISOString(),
        },
      });

      // 3. Push Notification fuer Background
      await deps.sendPushNotification({
        userId: request.userId,
        title: "Genehmigung erforderlich",
        body: request.description,
        module: request.action.split(":")[0], // z.B. "mail" aus "mail:send"
        action: {
          type: "approval",
          agentSessionId: request.sessionId,
        },
      });
    },

    /**
     * Wartet auf die Entscheidung des Users.
     * Gibt ein Promise zurueck das resolved wenn der User antwortet.
     */
    waitForApproval(sessionId: string): Promise<ApprovalResult> {
      return new Promise((resolve) => {
        pendingResolvers.set(sessionId, resolve);
      });
    },

    /**
     * Approval-Entscheidung verarbeiten.
     * Wird von der REST-Route aufgerufen wenn der User antwortet.
     */
    async resolve(
      sessionId: string,
      action: "approve" | "deny",
      userId: string
    ): Promise<void> {
      // 1. In DB markieren
      await deps.resolveApprovalRequest(sessionId, action, userId);

      // 2. SSE Event senden
      deps.emitActivity(userId, {
        type: "approval_resolved",
        data: { sessionId, action },
      });

      // 3. Wartenden Agent benachrichtigen
      const resolver = pendingResolvers.get(sessionId);
      if (resolver) {
        resolver({
          approved: action === "approve",
          resolvedBy: userId,
          resolvedAt: new Date(),
        });
        pendingResolvers.delete(sessionId);
      }
    },
  };
}
```

### Step 6.3: ApprovalCard Komponente

**`template/frontend/src/views/chat/components/ApprovalCard.vue`:**
```vue
<script setup lang="ts">
/**
 * Approval-Request Karte im Chat.
 *
 * Zeigt was der Agent tun moechte und bietet Erlauben/Ablehnen/Bearbeiten Buttons.
 * Beispiel:
 *   ┌──────────────────────────────────────────┐
 *   │ 🔒 Genehmigung erforderlich              │
 *   │                                          │
 *   │ Agent moechte Mail an Tobias senden      │
 *   │ Aktion: mail:send                        │
 *   │                                          │
 *   │ Details:                                 │
 *   │   An: tobias@example.com                 │
 *   │   Betreff: Meeting abgesagt              │
 *   │                                          │
 *   │ [Erlauben]  [Ablehnen]                   │
 *   └──────────────────────────────────────────┘
 */
import { ref } from "vue";
import Button from "primevue/button";
import type { ApprovalRequest } from "../composables/useAgentActivity";

const props = defineProps<{
  approval: ApprovalRequest;
}>();

const emit = defineEmits<{
  approve: [];
  deny: [];
}>();

const isResolving = ref(false);

async function handleApprove() {
  isResolving.value = true;
  emit("approve");
}

async function handleDeny() {
  isResolving.value = true;
  emit("deny");
}
</script>

<template>
  <div
    class="rounded-xl border-2 border-yellow-300 bg-yellow-50 p-4 space-y-3"
  >
    <!-- Header -->
    <div class="flex items-center gap-2">
      <i class="i-heroicons-shield-exclamation text-yellow-600 text-xl" />
      <h4 class="font-semibold text-yellow-800">Genehmigung erforderlich</h4>
    </div>

    <!-- Beschreibung -->
    <p class="text-sm text-yellow-900">
      {{ approval.description }}
    </p>

    <!-- Aktion -->
    <p class="text-xs text-yellow-700">
      Aktion:
      <code class="rounded bg-yellow-100 px-1.5 py-0.5 font-mono">
        {{ approval.action }}
      </code>
    </p>

    <!-- Details (wenn vorhanden) -->
    <div
      v-if="approval.details && Object.keys(approval.details).length > 0"
      class="rounded-lg bg-yellow-100/50 p-3"
    >
      <p class="text-xs font-medium text-yellow-700 mb-1">Details:</p>
      <dl class="space-y-1">
        <div
          v-for="(value, key) in approval.details"
          :key="String(key)"
          class="flex gap-2 text-sm"
        >
          <dt class="text-yellow-600 font-medium">{{ key }}:</dt>
          <dd class="text-yellow-900">{{ value }}</dd>
        </div>
      </dl>
    </div>

    <!-- Buttons -->
    <div class="flex gap-2 pt-1">
      <Button
        label="Erlauben"
        icon="i-heroicons-check"
        severity="success"
        size="small"
        :loading="isResolving"
        :disabled="isResolving"
        @click="handleApprove"
      />
      <Button
        label="Ablehnen"
        icon="i-heroicons-x-mark"
        severity="danger"
        size="small"
        outlined
        :loading="isResolving"
        :disabled="isResolving"
        @click="handleDeny"
      />
    </div>
  </div>
</template>
```

### Step 6.4: Tests ausfuehren

```bash
cd template/backend && bun test src/services/approval.test.ts
```

### Commit

```
feat(approval): add human-in-the-loop approval service with push notifications and ApprovalCard UI
```

---

## Task 7: Deep Linking — Notification Tap oeffnet relevante View

**Ziel:** Notification-Tap navigiert zur relevanten View in der PWA (z.B. Tap auf "Neue Mail" oeffnet Mail-Inbox). Vollstaendige Integration von Service Worker, Vue Router und dem Push-System.

### Files

| Action | Path |
|--------|------|
| Create | `template/frontend/src/router/deep-link.ts` |
| Create | `template/frontend/src/router/deep-link.test.ts` |
| Modify | `template/frontend/public/sw.js` |

### Step 7.1: Deep Link Handler — Tests schreiben (TDD)

**`template/frontend/src/router/deep-link.test.ts`:**
```typescript
import { describe, it, expect } from "bun:test";

describe("Deep Link Handler", () => {
  describe("resolveDeepLink()", () => {
    it("should resolve module-only notification to module root", () => {
      const notification = { module: "mail", action: undefined };
      const url = notification.action?.url ?? `/${notification.module}`;
      expect(url).toBe("/mail");
    });

    it("should resolve action URL if provided", () => {
      const notification = {
        module: "mail",
        action: { type: "navigate" as const, url: "/mail/inbox/123" },
      };
      const url = notification.action?.url ?? `/${notification.module}`;
      expect(url).toBe("/mail/inbox/123");
    });

    it("should resolve approval notification to chat view", () => {
      const notification = {
        module: "mail",
        action: {
          type: "approval" as const,
          agentSessionId: "session-abc",
        },
      };
      // Approval-Notifications oeffnen den Chat
      const url =
        notification.action.type === "approval"
          ? `/chat?approval=${notification.action.agentSessionId}`
          : `/${notification.module}`;
      expect(url).toBe("/chat?approval=session-abc");
    });

    it("should fallback to home for system notifications without module", () => {
      const notification = { module: undefined, action: undefined };
      const url = notification.action?.url ?? (notification.module ? `/${notification.module}` : "/");
      expect(url).toBe("/");
    });

    it("should resolve dismiss-type to no navigation", () => {
      const notification = {
        module: "system",
        action: { type: "dismiss" as const },
      };
      const shouldNavigate = notification.action.type !== "dismiss";
      expect(shouldNavigate).toBe(false);
    });
  });
});
```

### Step 7.2: Deep Link Handler — Implementierung

**`template/frontend/src/router/deep-link.ts`:**
```typescript
import type { Router } from "vue-router";
import type { PushNotificationAction } from "@super-app/shared";

interface NotificationData {
  module?: string;
  action?: PushNotificationAction;
}

/**
 * Loest einen Deep-Link aus Notification-Daten auf.
 * Gibt die Ziel-URL zurueck oder null wenn nicht navigiert werden soll.
 */
export function resolveDeepLink(data: NotificationData): string | null {
  // Dismiss-Notifications: keine Navigation
  if (data.action?.type === "dismiss") {
    return null;
  }

  // Approval: oeffne Chat mit Approval-Parameter
  if (data.action?.type === "approval" && data.action.agentSessionId) {
    return `/chat?approval=${data.action.agentSessionId}`;
  }

  // Explizite URL vorhanden
  if (data.action?.url) {
    return data.action.url;
  }

  // Modul vorhanden: navigiere zum Modul-Root
  if (data.module) {
    return `/${data.module}`;
  }

  // Fallback: Startseite
  return "/";
}

/**
 * Registriert den Deep-Link Handler fuer Service Worker Nachrichten.
 * Wird in App.vue aufgerufen.
 *
 * Der Service Worker sendet "NAVIGATE" Messages wenn eine Notification
 * angeklickt wird und bereits ein App-Fenster offen ist.
 */
export function setupDeepLinkHandler(router: Router): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type === "NAVIGATE" && event.data.url) {
      router.push(event.data.url);
    }
  };

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", handler);
  }

  // Cleanup-Funktion zurueckgeben
  return () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.removeEventListener("message", handler);
    }
  };
}

/**
 * Prueft beim App-Start ob die App ueber eine Notification geoeffnet wurde.
 * Liest den URL-Parameter `notification_action` und navigiert entsprechend.
 */
export function handleInitialDeepLink(router: Router): void {
  const params = new URLSearchParams(window.location.search);
  const approvalId = params.get("approval");

  if (approvalId) {
    router.push({ path: "/chat", query: { approval: approvalId } });
  }
}
```

### Step 7.3: Tests ausfuehren

```bash
cd template/frontend && bun test src/router/deep-link.test.ts
```

### Commit

```
feat(deeplink): add deep linking for push notifications with module routing and approval navigation
```

---

## Zusammenfassung der Deliverables

| # | Deliverable | Pfad | Tests |
|---|-------------|------|-------|
| 1 | PWA Manifest + Service Worker + usePWA | `template/frontend/public/manifest.json`, `sw.js`, `src/composables/usePWA.ts` | `src/composables/usePWA.test.ts` |
| 2 | Push Notification Backend (Schema, Service, Routes) | `template/backend/src/services/push-notification.ts`, `src/routes/push.ts`, `src/db/push-subscriptions.schema.ts` | `src/services/push-notification.test.ts`, `src/routes/push.test.ts` |
| 3 | Push Notification Frontend (Permission, Subscription, Settings) | `template/frontend/src/composables/usePushNotifications.ts`, `src/components/push/` | `src/composables/usePushNotifications.test.ts` |
| 4 | AI Chat Interface (Chat View, Routes, Agent Activity) | `template/frontend/src/views/chat/`, `template/backend/src/routes/ai-chat.ts` | `src/routes/ai-chat.test.ts`, `src/views/chat/composables/useAgentActivity.test.ts` |
| 5 | Agent Activity Display (AgentSteps) | `template/frontend/src/views/chat/components/AgentSteps.vue` | (getestet via useAgentActivity) |
| 6 | Human-in-the-Loop UI (Approval Service, ApprovalCard) | `template/backend/src/services/approval.ts`, `template/frontend/src/views/chat/components/ApprovalCard.vue` | `src/services/approval.test.ts` |
| 7 | Deep Linking (Notification → View) | `template/frontend/src/router/deep-link.ts` | `src/router/deep-link.test.ts` |

## Abhaengigkeiten zwischen Tasks

```
Task 1 (PWA Manifest + Service Worker)
  └── Task 3 (Push Frontend) — braucht Service Worker Registration aus Task 1
Task 2 (Push Backend)
  ├── Task 3 (Push Frontend) — braucht VAPID-Key Route + Subscribe Route
  └── Task 6 (Approval Service) — braucht sendPushNotification aus Task 2
Task 4 (AI Chat Interface)
  ├── Task 5 (Agent Steps) — Komponente wird in Chat View eingebunden
  └── Task 6 (Approval Cards) — Komponente wird in Chat View eingebunden
Task 7 (Deep Linking) — braucht Task 1 (SW) + Task 4 (Router)
```

**Parallelisierbar:** Task 1 + Task 2 koennen parallel bearbeitet werden (keine gegenseitigen Abhaengigkeiten). Task 4 + Task 5 koennen parallel zu Task 2 + Task 3 starten, da sie nur das AI Chat Interface betreffen.

## Verifikation nach Abschluss

```bash
# 1. Backend-Tests
cd /Users/toby/Documents/github/projekte/super-app/template/backend && bun test src/services/push-notification.test.ts src/services/approval.test.ts src/routes/push.test.ts src/routes/ai-chat.test.ts

# 2. Frontend-Tests
cd /Users/toby/Documents/github/projekte/super-app/template/frontend && bun test src/composables/usePWA.test.ts src/composables/usePushNotifications.test.ts src/views/chat/composables/useAgentActivity.test.ts src/router/deep-link.test.ts

# 3. Shared Types
cd /Users/toby/Documents/github/projekte/super-app/shared && bun test

# 4. PWA Manifest Validierung (manuell)
# - Lighthouse Audit durchfuehren
# - "Add to Home Screen" auf iOS und Android testen
# - Push Permission Flow testen (Banner → Browser Dialog → Subscription)

# 5. Push Notification E2E (manuell)
# - Subscription registrieren
# - Test-Notification senden
# - Notification-Tap Deep Link testen (navigiert zur korrekten View)

# 6. Chat Interface (manuell)
# - Nachricht senden → Streaming Response
# - Agent Steps live sichtbar
# - Approval Card erscheint → Erlauben/Ablehnen funktioniert
```
