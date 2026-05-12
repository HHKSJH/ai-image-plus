<script setup>
defineProps({
  activeMode: {
    type: String,
    required: true,
  },
  contextMode: {
    type: String,
    required: true,
  },
  contextSummary: {
    type: String,
    required: true,
  },
  hasContext: {
    type: Boolean,
    default: false,
  },
  memoryDescription: {
    type: String,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["switch-mode", "toggle-context-mode", "reset-context"]);
</script>

<template>
  <section class="composer">
    <div class="mode-tabs" role="tablist" aria-label="创作模式">
      <button
        class="mode-tab"
        :class="{ 'is-active': activeMode === 'generate' }"
        type="button"
        role="tab"
        :aria-selected="String(activeMode === 'generate')"
        :disabled="disabled"
        @click="emit('switch-mode', 'generate')"
      >
        文字生图
      </button>
      <button
        class="mode-tab"
        :class="{ 'is-active': activeMode === 'edit' }"
        type="button"
        role="tab"
        :aria-selected="String(activeMode === 'edit')"
        :disabled="disabled"
        @click="emit('switch-mode', 'edit')"
      >
        原图编辑
      </button>
    </div>

    <div class="memory-panel">
      <div class="memory-copy">
        <span class="memory-title">{{
          activeMode === "edit" ? "连续编辑" : "连续创作"
        }}</span>
        <p class="memory-description">{{ memoryDescription }}</p>
      </div>
      <div class="memory-actions">
        <label class="memory-toggle" for="contextMode">
          <input
            id="contextMode"
            :checked="contextMode === 'continuation'"
            type="checkbox"
            :disabled="disabled"
            @change="emit('toggle-context-mode', $event.target.checked)"
          />
          <span class="memory-switch" aria-hidden="true"></span>
          <span class="memory-mode-text">继承上一轮</span>
        </label>
        <button
          class="ghost"
          type="button"
          :disabled="disabled || !hasContext"
          @click="emit('reset-context')"
        >
          清除上下文
        </button>
      </div>
    </div>

    <div class="context-summary" :class="{ 'is-empty': !hasContext }" aria-live="polite">
      <span class="context-chip">{{
        contextMode === "continuation" ? "继承上一轮" : "独立创作"
      }}</span>
      <p class="context-text">{{ contextSummary }}</p>
    </div>

    <slot />
  </section>
</template>
