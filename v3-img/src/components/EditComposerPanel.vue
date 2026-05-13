<script setup>
import BaseDropdown from "./BaseDropdown.vue";

defineProps({
  form: {
    type: Object,
    required: true,
  },
  sizeOptions: {
    type: Array,
    required: true,
  },
  previewUrl: {
    type: String,
    default: "",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  submitLabel: {
    type: String,
    required: true,
  },
  errorText: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["upload-image", "submit", "clear-view"]);

function handleFileChange(event) {
  const nextFile = event.target.files?.[0];
  if (!nextFile) {
    return;
  }

  emit("upload-image", nextFile);
  event.target.value = "";
}
</script>

<template>
  <div class="composer-mode-panel">
    <div class="edit-source-panel">
      <div class="edit-source-copy">
        <span class="memory-title">编辑原图</span>
        <p class="memory-description">
          上传原图，或沿用上一轮编辑结果，再输入新的修改要求。
        </p>
      </div>
      <label class="edit-upload" :class="{ 'has-image': Boolean(previewUrl) }">
        <input
          type="file"
          accept="image/*"
          :disabled="disabled"
          @change="handleFileChange"
        />
        <span v-if="!previewUrl" class="edit-upload-empty">
          <strong>选择原图</strong>
          <small>支持本地图片上传</small>
        </span>
        <img v-else class="edit-upload-preview" :src="previewUrl" alt="编辑原图预览" />
      </label>
    </div>

    <div class="option-grid option-grid-single">
      <div class="field option-field">
        <label>尺寸</label>
        <BaseDropdown
          v-model="form.size"
          :options="sizeOptions"
          aria-label="尺寸选择"
          :disabled="disabled"
        />
      </div>
    </div>

    <textarea
      v-model="form.prompt"
      class="prompt"
      placeholder="描述你想如何修改这张图片..."
      aria-label="图片编辑描述"
      :disabled="disabled"
    ></textarea>

    <p v-if="errorText" class="error-text">{{ errorText }}</p>

    <div class="composer-bar">
      <!-- <div class="composer-tip">Ctrl + Enter / Cmd + Enter 快速发送</div> -->
      <div class="actions">
        <button
          class="secondary"
          type="button"
          :disabled="disabled"
          @click="emit('clear-view')"
        >
          清空输入
        </button>
        <button
          class="primary"
          type="button"
          :disabled="disabled"
          @click="emit('submit')"
        >
          {{ submitLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
