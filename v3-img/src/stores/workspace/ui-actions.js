export function createWorkspaceUiActions(state, computedState, shared) {
  function clearMessageSelection() {
    state.selectedMessageIds.value = [];
    state.isMessageSelectionMode.value = false;
  }

  function enterMessageSelection(messageId) {
    if (!messageId) {
      return;
    }

    state.isMessageSelectionMode.value = true;
    state.selectedMessageIds.value = [messageId];
  }

  function toggleMessageSelection(messageId) {
    if (!messageId) {
      return;
    }

    if (!state.isMessageSelectionMode.value) {
      state.isMessageSelectionMode.value = true;
      state.selectedMessageIds.value = [messageId];
      return;
    }

    const currentSet = new Set(state.selectedMessageIds.value);
    if (currentSet.has(messageId)) {
      currentSet.delete(messageId);
    } else {
      currentSet.add(messageId);
    }

    state.selectedMessageIds.value = [...currentSet];
    if (!state.selectedMessageIds.value.length) {
      state.isMessageSelectionMode.value = false;
    }
  }

  async function deleteSelectedMessages() {
    if (!state.selectedMessageIds.value.length) {
      return;
    }

    const selectedSet = new Set(state.selectedMessageIds.value);
    computedState.currentSession.value.messages = computedState.currentSession.value.messages.filter((message) => !selectedSet.has(message.id));
    clearMessageSelection();
    await shared.persistCurrentSession();
  }

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
    clearMessageSelection();
  }

  function cleanup() {
    clearMessageSelection();
    shared.revokeObjectUrls();
    if (state.editPreviewUrl.value) {
      URL.revokeObjectURL(state.editPreviewUrl.value);
    }
  }

  return {
    cleanup,
    clearMessageSelection,
    clearCurrentView,
    closePreview,
    deleteSelectedMessages,
    enterMessageSelection,
    openPreview,
    resetContext,
    setUploadedEditFile,
    toggleMessageSelection,
    toggleContextMode
  };
}
