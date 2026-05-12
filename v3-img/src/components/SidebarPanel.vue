<script setup>
import BaseDropdown from "./BaseDropdown.vue";

defineProps({
  config: {
    type: Object,
    required: true
  },
  apiBaseUrlOptions: {
    type: Array,
    required: true
  },
  sessions: {
    type: Array,
    required: true
  },
  activeSessionId: {
    type: String,
    required: true
  },
  sessionMeta: {
    type: String,
    required: true
  },
  storageUsageText: {
    type: String,
    required: true
  },
  storageUsageWidth: {
    type: Number,
    required: true
  },
  storageIsWarning: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  "new-session",
  "open-session",
  "delete-session",
  "clear-sessions"
]);
</script>

<template>
  <aside class="sidebar">
    <div class="brand-panel">
      <p class="eyebrow">Image Workspace</p>
      <h1>把一句想法，变成一张图。</h1>
      <p class="brand-copy">本地保存会话结构，按需恢复当前会话。图片资源单独存储，不一次性拖慢页面。</p>
    </div>

    <section class="sidebar-card">
      <div class="sidebar-card-head">
        <strong>访问配置</strong>
        <span>仅保存在当前浏览器</span>
      </div>
      <div class="field">
        <label for="apiKey">API Key</label>
        <input id="apiKey" v-model="config.apiKey" class="input" type="password" placeholder="输入第三方接口的 API Key" autocomplete="off" :disabled="disabled" />
      </div>
      <div class="field">
        <label for="accessKey">访问码</label>
        <input id="accessKey" v-model="config.accessKey" class="input" type="password" placeholder="可选，用来区分你的使用入口" autocomplete="off" :disabled="disabled" />
      </div>
      <div class="field">
        <label for="apiBaseUrlTrigger">接口地址</label>
        <BaseDropdown
          v-model="config.apiBaseUrl"
          :options="apiBaseUrlOptions"
          aria-label="接口地址选择"
          :disabled="disabled"
        />
      </div>
      <p class="access-hint">不要在公共设备保存密钥。历史会话和图片缓存都只在本地可见。</p>
    </section>

    <section class="sidebar-card sessions-panel">
      <div class="sidebar-card-head sessions-head">
        <div>
          <strong>历史会话</strong>
          <span>{{ sessionMeta }}</span>
        </div>
        <div class="head-actions">
          <button class="head-action-btn create-action" type="button" aria-label="新建会话" :disabled="disabled" @click="emit('new-session')">
            <span>新建会话</span>
          </button>
        </div>
      </div>

      <div class="storage-card">
        <div class="storage-row">
          <span>本地缓存</span>
          <span>{{ storageUsageText }}</span>
        </div>
        <div class="storage-track" aria-hidden="true">
          <div class="storage-fill" :class="{ 'is-warning': storageIsWarning }" :style="{ width: `${storageUsageWidth}%` }"></div>
        </div>
        <p class="storage-hint">仅加载当前会话。超过阈值会自动清理最旧会话，避免页面变慢。</p>
      </div>

      <div class="session-list" aria-live="polite">
        <template v-if="sessions.length">
          <article
            v-for="session in sessions"
            :key="session.id"
            class="session-item"
            :class="{ 'is-active': session.id === activeSessionId }"
          >
            <button class="session-main" type="button" @click="emit('open-session', session.id)">
              <strong>{{ session.title }}</strong>
              <small>{{ session.imageCount }} 张图 · {{ session.relativeTime }}</small>
            </button>
            <button class="session-delete" type="button" aria-label="删除会话" @click="emit('delete-session', session.id)">×</button>
          </article>
        </template>
        <div v-else class="session-empty">
          <strong>暂无历史会话</strong>
          <p>生成成功后，这里会自动积累你的本地会话记录。</p>
        </div>
      </div>

      <div class="sessions-danger-zone">
        <button class="panel-danger-btn" type="button" :disabled="disabled" @click="emit('clear-sessions')">
          <span>删除当前分类</span>
        </button>
        <p class="sessions-danger-hint">只会清空当前 tab 下的本地会话和图片缓存。</p>
      </div>
    </section>
  </aside>
</template>
