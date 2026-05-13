import { reactive, ref, watch } from "vue";
import * as storage from "../../services/storage";

export function createWorkspaceState() {
  const config = reactive(storage.getLocalValues());

  watch(
    () => config.apiBaseUrl,
    (nextApiBaseUrl) => {
      storage.persistApiBaseUrl(nextApiBaseUrl);
      config.apiKey = storage.getApiKeyForBaseUrl(nextApiBaseUrl);
    }
  );

  watch(
    () => config.apiKey,
    (nextApiKey) => {
      storage.persistApiKey(nextApiKey);
      storage.persistApiKeyForBaseUrl(config.apiBaseUrl, nextApiKey);
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
