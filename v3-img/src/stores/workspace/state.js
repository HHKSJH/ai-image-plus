import { reactive, ref, watch } from "vue";
import * as storage from "../../services/storage";

export function createWorkspaceState() {
  const config = reactive(storage.getLocalValues());
  config.selectedApiKey = storage.getSelectedApiKeyForBaseUrl(config.apiBaseUrl);
  if (config.apiBaseUrl === "https://aicodelink.top/v1" && !config.selectedApiKey && config.apiKey) {
    config.selectedApiKey = config.apiKey;
  }

  watch(
    () => config.apiBaseUrl,
    (nextApiBaseUrl) => {
      storage.persistApiBaseUrl(nextApiBaseUrl);
      config.apiKey = storage.getApiKeyForBaseUrl(nextApiBaseUrl);
      config.apiKeysText = storage.getApiKeysTextForBaseUrl(nextApiBaseUrl);
      config.selectedApiKey = storage.getSelectedApiKeyForBaseUrl(nextApiBaseUrl);
      if (nextApiBaseUrl === "https://aicodelink.top/v1" && !config.selectedApiKey && config.apiKey) {
        config.selectedApiKey = config.apiKey;
      }
    }
  );

  watch(
    () => config.apiKeysText,
    (nextApiKeysText) => {
      storage.persistApiKeysForBaseUrl(config.apiBaseUrl, nextApiKeysText);
      config.apiKey = storage.getApiKeyForBaseUrl(config.apiBaseUrl);
      config.selectedApiKey = storage.getSelectedApiKeyForBaseUrl(config.apiBaseUrl);
      if (config.apiBaseUrl === "https://aicodelink.top/v1" && !config.selectedApiKey && config.apiKey) {
        config.selectedApiKey = config.apiKey;
      }
      storage.persistApiKey(config.apiKey);
    }
  );

  watch(
    () => config.apiKey,
    (nextApiKey) => {
      storage.persistApiKey(nextApiKey);
      if (config.apiBaseUrl !== "https://aicodelink.top/v1") {
        storage.persistApiKeyForBaseUrl(config.apiBaseUrl, nextApiKey);
      }
    }
  );

  watch(
    () => config.selectedApiKey,
    (nextSelectedApiKey) => {
      storage.persistSelectedApiKeyForBaseUrl(config.apiBaseUrl, nextSelectedApiKey);
      config.apiKey = storage.getApiKeyForBaseUrl(config.apiBaseUrl);
    }
  );

  return {
    config,
    activeMode: ref("generate"),
    contextMode: ref("continuation"),
    isInitialized: ref(false),
    isLoading: ref(false),
    errorText: ref(""),
    previewModalUrl: ref(""),
    editPreviewUrl: ref(""),
    clearConfirmOpen: ref(false),
    sessionsIndex: ref([]),
    storageUsage: reactive({
      text: "--",
      width: 0,
      isWarning: false
    }),
    forms: reactive({
      generate: {
        prompt: "",
        size: "1024x1024",
        stylePreset: "auto"
      },
      edit: {
        prompt: "",
        size: "1024x1024",
        sourceImageFile: null
      }
    }),
    currentSessions: reactive({
      generate: storage.createSession("generate"),
      edit: storage.createSession("edit")
    }),
    lastRequestPayloads: reactive({
      generate: null,
      edit: null
    }),
    editContinuationSourceFile: ref(null),
    objectUrls: new Set()
  };
}
