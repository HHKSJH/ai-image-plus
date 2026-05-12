import * as storage from "../../services/storage";
import { formatBytes, formatRelativeTime } from "../../utils/format";
import { blobToImageFile, createObjectUrl } from "../../utils/image";
import { findLatestAssistantImageBlob } from "./helpers";

export function createWorkspaceShared(state, computedState) {
  function rememberObjectUrl(url) {
    state.objectUrls.add(url);
    return url;
  }

  function revokeObjectUrls() {
    state.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    state.objectUrls.clear();
  }

  function normalizeMode(mode) {
    return mode === "edit" ? "edit" : "generate";
  }

  function updateEditPreview(fileOrBlob) {
    if (state.editPreviewUrl.value) {
      URL.revokeObjectURL(state.editPreviewUrl.value);
      state.editPreviewUrl.value = "";
    }

    if (!fileOrBlob) {
      state.forms.edit.sourceImageFile = null;
      return;
    }

    state.forms.edit.sourceImageFile = fileOrBlob instanceof File ? fileOrBlob : null;
    state.editPreviewUrl.value = rememberObjectUrl(createObjectUrl(fileOrBlob));
  }

  function refreshEditContinuationSource() {
    if (state.activeMode.value !== "edit") {
      return;
    }

    const latestBlob = findLatestAssistantImageBlob(computedState.currentSession.value);
    state.editContinuationSourceFile.value = latestBlob
      ? blobToImageFile(latestBlob, "continued-edit-source.png")
      : null;

    if (state.editContinuationSourceFile.value && state.contextMode.value === "continuation") {
      updateEditPreview(state.editContinuationSourceFile.value);
    }
  }

  async function refreshSessions() {
    const sessions = await storage.listSessions(state.activeMode.value);
    state.sessionsIndex.value = sessions.map((session) => ({
      ...session,
      relativeTime: formatRelativeTime(session.updatedAt)
    }));
  }

  async function refreshStorageUsage() {
    const estimate = await storage.estimateStorage();
    state.storageUsage.text = estimate.quota
      ? `已用 ${formatBytes(estimate.usage)} / ${formatBytes(estimate.quota)}`
      : `已用 ${formatBytes(estimate.usage)}`;
    state.storageUsage.width = Math.min(100, Math.round((estimate.usageRatio || 0) * 100));
    state.storageUsage.isWarning = Boolean(estimate.isNearLimit);
  }

  async function persistCurrentSession() {
    await storage.saveSession(computedState.currentSession.value);
    state.currentSessions[state.activeMode.value] = await storage.getSession(computedState.currentSession.value.id);
    await refreshSessions();
    await refreshStorageUsage();
  }

  return {
    normalizeMode,
    persistCurrentSession,
    refreshEditContinuationSource,
    refreshSessions,
    refreshStorageUsage,
    rememberObjectUrl,
    revokeObjectUrls,
    updateEditPreview
  };
}
