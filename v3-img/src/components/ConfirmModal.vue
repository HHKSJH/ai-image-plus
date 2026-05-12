<script setup>
defineProps({
  open: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(["cancel", "confirm"]);
</script>

<template>
  <div v-if="open" class="confirm-modal">
    <div class="preview-backdrop" @click="emit('cancel')"></div>
    <div class="confirm-panel" role="dialog" aria-modal="true" aria-labelledby="clearAllConfirmTitle" aria-describedby="clearAllConfirmDesc">
      <div class="confirm-badge">危险操作</div>
      <h2 id="clearAllConfirmTitle">删除当前分类</h2>
      <p id="clearAllConfirmDesc">这会清空当前 tab 下保存的会话记录和对应图片缓存，释放本地存储空间，操作后不能恢复。</p>
      <div class="confirm-actions">
        <button class="secondary" type="button" @click="emit('cancel')">取消</button>
        <button class="danger-solid" type="button" @click="emit('confirm')">确认删除</button>
      </div>
    </div>
  </div>
</template>
