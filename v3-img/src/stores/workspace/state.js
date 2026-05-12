import { reactive, ref } from "vue";
import * as storage from "../../services/storage";

export function createWorkspaceState() {
  return {
    config: reactive(storage.getLocalValues()),
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
