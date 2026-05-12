import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { router } from "./router";
import "./styles/main.scss";

normalizeLegacyUrl();
boot();

async function boot() {
  await setupDebugConsole();

  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount("#app");
}

function normalizeLegacyUrl() {
  const { pathname, hash, search } = window.location;
  const legacyPathMatch = pathname.match(/^(.*)\/studio\/(generate|edit)\/?$/);
  const legacyHashMatch = hash.match(/^#\/studio\/(generate|edit)$/);

  if (!legacyPathMatch && !legacyHashMatch) {
    return;
  }

  const mode = legacyHashMatch?.[1] || legacyPathMatch?.[2] || "generate";
  const basePath = legacyPathMatch ? `${legacyPathMatch[1] || ""}/` : pathname;
  const normalizedPath = basePath.replace(/\/{2,}/g, "/");
  const nextUrl = `${normalizedPath}${search}#/${mode}`;

  window.history.replaceState(null, "", nextUrl);
}

async function setupDebugConsole() {
  if (!isDebugEnabled()) {
    return;
  }

  const { default: VConsole } = await import("vconsole");
  const vConsole = new VConsole();
  window.__V_CONSOLE__ = vConsole;
}

function isDebugEnabled() {
  const candidates = [
    window.location.search,
    extractHashQuery(window.location.hash)
  ].filter(Boolean);

  return candidates.some((queryString) => {
    const searchParams = new URLSearchParams(queryString);
    const debugValue = (searchParams.get("debug") || "").trim().toLowerCase();
    return debugValue === "true" || debugValue === "1";
  });
}

function extractHashQuery(hash) {
  if (!hash) {
    return "";
  }

  const queryIndex = hash.indexOf("?");
  return queryIndex >= 0 ? hash.slice(queryIndex) : "";
}
