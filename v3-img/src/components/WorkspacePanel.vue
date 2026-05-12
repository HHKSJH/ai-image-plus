<script setup>
defineProps({
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
  }
});

const emit = defineEmits(["preview", "retry"]);
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

    <div class="chat">
      <div v-if="!messages.length" class="empty">
        <div class="empty-card">
          <strong>开始生成你的第一张图片</strong>
          <p>比如：一张高级感很强的青绿色海报，留白克制，光影柔和。</p>
        </div>
      </div>

      <template v-else>
        <article v-for="message in messages" :key="message.id" class="message" :class="message.role">
          <div class="bubble">
            {{ message.text }}
            <div v-if="message.imageUrl" class="card">
              <img :src="message.imageUrl" alt="生成结果" loading="lazy" @click="emit('preview', message.imageUrl)" />
            </div>
            <div v-if="message.canRetry" class="message-actions">
              <button class="secondary retry-action" type="button" @click="emit('retry')">重试</button>
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
