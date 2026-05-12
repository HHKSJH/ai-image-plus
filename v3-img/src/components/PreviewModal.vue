<script setup>
defineProps({
  imageUrl: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["close"]);
</script>

<template>
  <div v-if="imageUrl" class="preview-modal">
    <div class="preview-backdrop" @click="emit('close')"></div>
    <div class="preview-panel" role="dialog" aria-modal="true" aria-label="图片预览">
      <button class="preview-close" type="button" aria-label="关闭预览" @click="emit('close')">×</button>
      <div class="preview-image-wrap">
        <img class="preview-image" :src="imageUrl" alt="预览图" />
      </div>
      <div class="preview-actions">
        <span class="preview-hint"></span>
        <a class="preview-link" :href="imageUrl" target="_blank" rel="noopener">打开原图</a>
      </div>
    </div>
  </div>
</template>
