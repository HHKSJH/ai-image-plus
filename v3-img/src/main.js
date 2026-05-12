import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { router } from "./router";
import "./styles/main.scss";

normalizeLegacyUrl();

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");

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
