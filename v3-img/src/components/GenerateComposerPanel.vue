<script setup>
import BaseDropdown from "./BaseDropdown.vue";

defineProps({
  form: {
    type: Object,
    required: true
  },
  sizeOptions: {
    type: Array,
    required: true
  },
  styleOptions: {
    type: Array,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  submitLabel: {
    type: String,
    required: true
  },
  errorText: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["submit", "clear-view"]);
</script>

<template>
  <div class="composer-mode-panel">
    <div class="option-grid">
      <div class="field option-field">
        <label>尺寸</label>
        <BaseDropdown v-model="form.size" :options="sizeOptions" aria-label="尺寸选择" :disabled="disabled" />
      </div>

      <div class="field option-field">
        <label>风格</label>
        <BaseDropdown v-model="form.stylePreset" :options="styleOptions" aria-label="风格选择" :disabled="disabled" />
      </div>
    </div>

    <textarea v-model="form.prompt" class="prompt" placeholder="描述你想生成的画面..." aria-label="图片描述" :disabled="disabled"></textarea>

    <p v-if="errorText" class="error-text">{{ errorText }}</p>

    <div class="composer-bar">
      <div class="composer-tip">Ctrl + Enter / Cmd + Enter 快速发送</div>
      <div class="actions">
        <button class="secondary" type="button" :disabled="disabled" @click="emit('clear-view')">清空当前显示</button>
        <button class="primary" type="button" :disabled="disabled" @click="emit('submit')">{{ submitLabel }}</button>
      </div>
    </div>
  </div>
</template>
