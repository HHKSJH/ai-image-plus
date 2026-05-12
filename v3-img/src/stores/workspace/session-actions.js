import * as storage from "../../services/storage";

export function createWorkspaceSessionActions(state, computedState, shared) {
  async function openSession(sessionId) {
    const session = await storage.getSession(sessionId);
    if (!session) {
      return;
    }

    state.currentSessions[state.activeMode.value] = session;
    shared.refreshEditContinuationSource();
  }

  async function createAndOpenSession() {
    state.currentSessions[state.activeMode.value] = storage.createSession(state.activeMode.value);
    if (state.activeMode.value === "edit") {
      state.editContinuationSourceFile.value = null;
      shared.updateEditPreview(null);
    }
    await shared.refreshSessions();
  }

  async function removeSession(sessionId) {
    await storage.deleteSession(sessionId);
    if (sessionId === computedState.currentSession.value.id) {
      await createAndOpenSession();
      return;
    }

    await shared.refreshSessions();
    await shared.refreshStorageUsage();
  }

  async function clearSessionsByCurrentMode() {
    await storage.clearSessionsByMode(state.activeMode.value);
    state.clearConfirmOpen.value = false;
    await createAndOpenSession();
    await shared.refreshStorageUsage();
  }

  async function switchMode(mode) {
    const nextMode = shared.normalizeMode(mode);
    if (nextMode === state.activeMode.value && state.isInitialized.value) {
      return;
    }

    state.activeMode.value = nextMode;
    state.errorText.value = "";
    await shared.refreshSessions();

    if (state.sessionsIndex.value.length && !computedState.currentSession.value.messages.length) {
      await openSession(state.sessionsIndex.value[0].id);
    }

    shared.refreshEditContinuationSource();
  }

  async function init(mode = "generate") {
    await switchMode(mode);
    await shared.refreshStorageUsage();
    state.isInitialized.value = true;
  }

  return {
    clearSessionsByCurrentMode,
    createAndOpenSession,
    init,
    openSession,
    removeSession,
    switchMode
  };
}
