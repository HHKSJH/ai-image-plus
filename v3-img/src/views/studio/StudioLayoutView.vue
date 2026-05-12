<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ComposerPanel from "../../components/ComposerPanel.vue";
import ConfirmModal from "../../components/ConfirmModal.vue";
import EditComposerPanel from "../../components/EditComposerPanel.vue";
import GenerateComposerPanel from "../../components/GenerateComposerPanel.vue";
import PreviewModal from "../../components/PreviewModal.vue";
import SidebarPanel from "../../components/SidebarPanel.vue";
import WorkspacePanel from "../../components/WorkspacePanel.vue";
import { useWorkspaceStore } from "../../stores/workspace";

const route = useRoute();
const router = useRouter();
const workspace = useWorkspaceStore();

const activeMode = computed(() => route.meta.mode === "edit" ? "edit" : "generate");

async function changeMode(mode) {
  const targetName = mode === "edit" ? "edit" : "generate";
  if (route.name === targetName) {
    await workspace.switchMode(mode);
    return;
  }

  await router.push({ name: targetName });
}

onMounted(async () => {
  await workspace.init(activeMode.value);
});

watch(
  activeMode,
  async (mode) => {
    if (!workspace.isInitialized) {
      return;
    }
    await workspace.switchMode(mode);
  }
);

onBeforeUnmount(() => {
  workspace.cleanup();
});
</script>

<template>
  <main class="app-shell">
    <SidebarPanel
      :config="workspace.config"
      :api-base-url-options="workspace.API_BASE_URL_OPTIONS"
      :sessions="workspace.sessionsIndex"
      :active-session-id="workspace.currentSession.id"
      :session-meta="workspace.sessionMeta"
      :storage-usage-text="workspace.storageUsage.text"
      :storage-usage-width="workspace.storageUsage.width"
      :storage-is-warning="workspace.storageUsage.isWarning"
      :disabled="workspace.isLoading"
      @new-session="workspace.createAndOpenSession"
      @open-session="workspace.openSession"
      @delete-session="workspace.removeSession"
      @clear-sessions="workspace.clearConfirmOpen = true"
    />

    <section class="main-pane">
      <WorkspacePanel
        :title="workspace.currentSession.title"
        :subtitle="workspace.currentSubtitle"
        :tag="workspace.currentTag"
        :messages="workspace.currentSession.messages"
        :is-loading="workspace.isLoading"
        @preview="workspace.openPreview"
        @retry="workspace.retryLastRequest"
      />

      <ComposerPanel
        :active-mode="workspace.activeMode"
        :context-mode="workspace.contextMode"
        :context-summary="workspace.contextSummaryText"
        :has-context="workspace.hasContext"
        :memory-description="workspace.memoryDescription"
        :disabled="workspace.isLoading"
        @switch-mode="changeMode"
        @toggle-context-mode="workspace.toggleContextMode"
        @reset-context="workspace.resetContext"
      >
        <GenerateComposerPanel
          v-if="workspace.activeMode === 'generate'"
          :form="workspace.currentForm"
          :size-options="workspace.SIZE_OPTIONS"
          :style-options="workspace.STYLE_OPTIONS"
          :disabled="workspace.isLoading"
          :submit-label="workspace.submitLabel"
          :error-text="workspace.errorText"
          @submit="workspace.submit"
          @clear-view="workspace.clearCurrentView"
        />

        <EditComposerPanel
          v-else
          :form="workspace.currentForm"
          :size-options="workspace.SIZE_OPTIONS"
          :preview-url="workspace.editPreviewUrl"
          :disabled="workspace.isLoading"
          :submit-label="workspace.submitLabel"
          :error-text="workspace.errorText"
          @upload-image="workspace.setUploadedEditFile"
          @submit="workspace.submit"
          @clear-view="workspace.clearCurrentView"
        />
      </ComposerPanel>
    </section>

    <PreviewModal :image-url="workspace.previewModalUrl" @close="workspace.closePreview" />
    <ConfirmModal :open="workspace.clearConfirmOpen" @cancel="workspace.clearConfirmOpen = false" @confirm="workspace.clearSessionsByCurrentMode" />
  </main>
</template>
