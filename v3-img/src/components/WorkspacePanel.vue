<script setup>
import { ref } from "vue";

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    required: true
  },
  tag: {
    type: String,
    required: true
  },
  messages: {
    type: Array,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  isSelectionMode: {
    type: Boolean,
    default: false
  },
  selectedMessageIds: {
    type: Array,
    default: () => []
  },
  selectedMessageCount: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(["preview", "retry", "enter-selection", "toggle-selection", "clear-selection", "delete-selected"]);
const longPressTimer = ref(null);
const LONG_PRESS_MS = 420;
const TOUCH_MOVE_TOLERANCE_PX = 10;
const touchStartPoint = ref(null);
const trashIconPath = "M5 7h14M9 7V5h6v2M8 10v7M12 10v7M16 10v7M7 7l1 13h8l1-13";
const checkIconPath = "M5 12.5l4.2 4.2L19 7.8";

function getMessageImages(message) {
  if (Array.isArray(message.imageUrls) && message.imageUrls.length) {
    return message.imageUrls;
  }

  return message.imageUrl ? [message.imageUrl] : [];
}

function isSelected(messageId) {
  return props.selectedMessageIds.includes(messageId);
}

function startLongPress(messageId) {
  clearLongPress();
  longPressTimer.value = window.setTimeout(() => {
    emit("enter-selection", messageId);
    clearLongPress();
  }, LONG_PRESS_MS);
}

function clearLongPress() {
  if (!longPressTimer.value) {
    return;
  }

  window.clearTimeout(longPressTimer.value);
  longPressTimer.value = null;
  touchStartPoint.value = null;
}

function handleTouchStart(messageId, event) {
  const touch = event.touches[0];
  if (!touch) {
    return;
  }

  touchStartPoint.value = {
    x: touch.clientX,
    y: touch.clientY
  };

  startLongPress(messageId);
}

function handleTouchMove(event) {
  if (!longPressTimer.value || !touchStartPoint.value) {
    return;
  }

  const touch = event.touches[0];
  if (!touch) {
    return;
  }

  const deltaX = Math.abs(touch.clientX - touchStartPoint.value.x);
  const deltaY = Math.abs(touch.clientY - touchStartPoint.value.y);

  if (deltaX > TOUCH_MOVE_TOLERANCE_PX || deltaY > TOUCH_MOVE_TOLERANCE_PX) {
    clearLongPress();
  }
}

function handleMessageClick(message) {
  if (!props.isSelectionMode) {
    return;
  }

  emit("toggle-selection", message.id);
}

function handleImageClick(message, imageUrl) {
  if (props.isSelectionMode) {
    emit("toggle-selection", message.id);
    return;
  }

  emit("preview", imageUrl);
}
</script>

<template>
  <section class="workspace">
    <div class="workspace-head">
      <div>
        <strong>{{ title }}</strong>
        <span>{{ subtitle }}</span>
      </div>
      <div class="tag">{{ tag }}</div>
    </div>

    <div v-if="isSelectionMode" class="message-selection-bar">
      <strong>
        <svg class="action-icon selection-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path :d="checkIconPath" />
        </svg>
        已选 {{ selectedMessageCount }} 条
      </strong>
      <div class="message-selection-actions">
        <button class="ghost selection-action" type="button" @click="emit('clear-selection')">取消</button>
        <button class="danger-solid selection-action" type="button" :disabled="!selectedMessageCount" @click="emit('delete-selected')">
          <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="trashIconPath" />
          </svg>
          删除
        </button>
      </div>
    </div>

    <div class="chat" :class="{ 'is-selection-mode': isSelectionMode }">
      <div v-if="!messages.length" class="empty">
        <div class="empty-card">
          <strong>开始生成你的第一张图片</strong>
          <p>比如：一张高级感很强的青绿色海报，留白克制，光影柔和。</p>
        </div>
      </div>

      <template v-else>
        <article
          v-for="message in messages"
          :key="message.id"
          class="message"
          :class="[message.role, { 'is-selectable': isSelectionMode, 'is-selected': isSelected(message.id) }]"
          @mousedown="startLongPress(message.id)"
          @mouseup="clearLongPress"
          @mouseleave="clearLongPress"
          @touchstart="handleTouchStart(message.id, $event)"
          @touchmove="handleTouchMove"
          @touchend="clearLongPress"
          @touchcancel="clearLongPress"
          @click="handleMessageClick(message)"
        >
          <div v-if="isSelectionMode" class="message-check">
            <span class="message-check-indicator">
              <svg v-if="isSelected(message.id)" class="action-icon check-indicator-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path :d="checkIconPath" />
              </svg>
            </span>
          </div>
          <div class="bubble">
            {{ message.text }}
            <div v-if="getMessageImages(message).length" class="card">
              <div class="image-grid" :class="`count-${Math.min(getMessageImages(message).length, 4)}`">
                <img
                  v-for="(imageUrl, index) in getMessageImages(message)"
                  :key="`${message.id}_${index}`"
                  :src="imageUrl"
                  alt="生成结果"
                  loading="lazy"
                  @click.stop="handleImageClick(message, imageUrl)"
                />
              </div>
            </div>
            <div v-if="message.canRetry && !isSelectionMode" class="message-actions">
              <button class="secondary retry-action" type="button" @click.stop="emit('retry')">重试</button>
            </div>
          </div>
        </article>
      </template>

      <article v-if="isLoading" class="message assistant loading">
        <div class="bubble loading-bubble" aria-live="polite">
          <div class="loading-topline">
            <span class="loading-title">正在处理请求</span>
            <span class="loading-value">...</span>
          </div>
          <div class="loading-track">
            <div class="loading-fill" style="width: 72%;"></div>
            <div class="loading-sheen"></div>
          </div>
          <div class="loading-meta">
            <span>请保持页面开启</span>
            <span>进度为估算值</span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
