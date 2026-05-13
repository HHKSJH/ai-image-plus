export function createWorkspaceUiActions(state, computedState, shared) {
  function setUploadedEditFile(file) {
    if (!file) {
      shared.updateEditPreview(null);
      return;
    }

    state.forms.edit.sourceImageFile = file;
    shared.updateEditPreview(file);
  }

  function toggleContextMode(enabled) {
    state.contextMode.value = enabled ? "continuation" : "independent";
    if (state.activeMode.value !== "edit") {
      return;
    }

    if (enabled) {
      shared.refreshEditContinuationSource();
      return;
    }

    shared.updateEditPreview(null);
  }

  function resetContext() {
    computedState.currentSession.value.contextPrompt = "";
    if (state.activeMode.value === "edit") {
      state.editContinuationSourceFile.value = null;
      shared.updateEditPreview(null);
    }
  }

  function openPreview(imageUrl) {
    state.previewModalUrl.value = imageUrl;
  }

  function closePreview() {
    state.previewModalUrl.value = "";
  }

  function clearCurrentView() {
    state.errorText.value = "";
    state.forms[state.activeMode.value].prompt = "";
  }

  function cleanup() {
    shared.revokeObjectUrls();
    if (state.editPreviewUrl.value) {
      URL.revokeObjectURL(state.editPreviewUrl.value);
    }
  }

  return {
    cleanup,
    clearCurrentView,
    closePreview,
    openPreview,
    resetContext,
    setUploadedEditFile,
    toggleContextMode
  };
}
