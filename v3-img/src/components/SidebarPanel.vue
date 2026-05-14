<script setup>
import { computed, ref, watch } from "vue";
import BaseDropdown from "./BaseDropdown.vue";

const props = defineProps({
  config: {
    type: Object,
    required: true,
  },
  apiBaseUrlOptions: {
    type: Array,
    required: true,
  },
  sessions: {
    type: Array,
    required: true,
  },
  activeSessionId: {
    type: String,
    required: true,
  },
  sessionMeta: {
    type: String,
    required: true,
  },
  storageUsageText: {
    type: String,
    required: true,
  },
  storageUsageWidth: {
    type: Number,
    required: true,
  },
  storageIsWarning: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "new-session",
  "open-session",
  "delete-session",
  "clear-sessions",
]);

const newApiKey = ref("");
const apiKeyList = ref([]);
const MANAGED_API_BASE_URL = "https://aicodelink.top/v1";
const plusIconPath = "M12 5v14M5 12h14";
const trashIconPath = "M5 7h14M9 7V5h6v2M8 10v7M12 10v7M16 10v7M7 7l1 13h8l1-13";

function parseApiKeysText(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function syncApiKeysText() {
  props.config.apiKeysText = apiKeyList.value.join("\n");
}

function maskApiKey(value) {
  const trimmedValue = String(value || "").trim();
  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.length <= 10) {
    return `${trimmedValue.slice(0, 2)}${"*".repeat(
      Math.max(trimmedValue.length - 4, 1)
    )}${trimmedValue.slice(-2)}`;
  }

  return `${trimmedValue.slice(0, 4)}${"*".repeat(
    trimmedValue.length - 8
  )}${trimmedValue.slice(-4)}`;
}

function addApiKey() {
  const trimmedValue = newApiKey.value.trim();
  if (!trimmedValue || apiKeyList.value.includes(trimmedValue)) {
    newApiKey.value = "";
    return;
  }

  apiKeyList.value = [...apiKeyList.value, trimmedValue];
  if (!props.config.selectedApiKey) {
    props.config.selectedApiKey = trimmedValue;
  }
  newApiKey.value = "";
  syncApiKeysText();
}

function removeApiKey(index) {
  const removedApiKey = apiKeyList.value[index] || "";
  apiKeyList.value = apiKeyList.value.filter((_, itemIndex) => itemIndex !== index);
  if (props.config.selectedApiKey === removedApiKey) {
    props.config.selectedApiKey = apiKeyList.value[0] || "";
  }
  syncApiKeysText();
}

function selectApiKey(value) {
  props.config.selectedApiKey = value;
}

watch(
  () => props.config.apiKeysText,
  (nextValue) => {
    apiKeyList.value = parseApiKeysText(nextValue);
  },
  { immediate: true }
);

const maskedApiKeyList = computed(() =>
  apiKeyList.value.map((value, index) => ({
    id: `${index}_${value.slice(-6)}`,
    value,
    maskedValue: maskApiKey(value),
    isActive: props.config.selectedApiKey === value,
  }))
);

const canManageApiKeys = computed(() => props.config.apiBaseUrl === MANAGED_API_BASE_URL);

watch(
  [() => props.config.selectedApiKey, () => apiKeyList.value],
  ([selectedApiKey, currentApiKeyList]) => {
    if (!canManageApiKeys.value || !currentApiKeyList.length || selectedApiKey) {
      return;
    }

    props.config.selectedApiKey = currentApiKeyList[0];
  },
  { immediate: true, deep: true }
);
</script>

<template>
  <aside class="sidebar">
    <div class="brand-panel">
      <p class="eyebrow">Image Workspace</p>
      <h1>把一句想法，变成一张图。</h1>
      <p class="brand-copy">
        本地保存会话结构，按需恢复当前会话。图片资源单独存储，不一次性拖慢页面。
      </p>
    </div>

    <section class="sidebar-card">
      <div class="sidebar-card-head">
        <strong>访问配置</strong>
        <span>仅保存在当前浏览器</span>
      </div>
      <div class="field">
        <label for="apiKeyInput">API Keys</label>
        <div v-if="canManageApiKeys" class="api-key-entry">
          <input
            id="apiKeyInput"
            v-model="newApiKey"
            class="input"
            type="password"
            placeholder="输入一个 API Key 后点击添加"
            autocomplete="off"
            :disabled="disabled"
            @keydown.enter.prevent="addApiKey"
          />
          <button
            class="head-action-btn create-action api-key-add-btn"
            type="button"
            :disabled="disabled"
            @click="addApiKey"
          >
            <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path :d="plusIconPath" />
            </svg>
            <span>添加</span>
          </button>
        </div>
        <input
          v-else
          id="apiKeyInput"
          v-model="config.apiKey"
          class="input"
          type="password"
          placeholder="输入第三方接口的 API Key"
          autocomplete="off"
          :disabled="disabled"
        />
        <div v-if="canManageApiKeys" class="api-key-list">
          <article
            v-for="(item, index) in maskedApiKeyList"
            :key="item.id"
            class="api-key-item"
            :class="{ 'is-active': item.isActive }"
          >
            <button
              class="api-key-main"
              type="button"
              :disabled="disabled"
              @click="selectApiKey(item.value)"
            >
              <div class="api-key-copy">
                <strong>Key {{ index + 1 }}</strong>
                <span>{{ item.maskedValue }}</span>
              </div>
            </button>
            <div class="api-key-actions">
              <button
                class="session-delete api-key-remove-btn"
                type="button"
                aria-label="删除 API Key"
                :disabled="disabled"
                @click="removeApiKey(index)"
              >
                <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path :d="trashIconPath" />
                </svg>
              </button>
            </div>
          </article>
          <div v-if="!maskedApiKeyList.length" class="api-key-empty">
            <strong>暂无 API Key</strong>
            <p>点击上方添加后，将按列表顺序自动轮换。</p>
          </div>
        </div>
      </div>
      <div class="field">
        <label for="accessKey">访问码</label>
        <input
          id="accessKey"
          v-model="config.accessKey"
          class="input"
          type="password"
          placeholder="可选，用来区分你的使用入口"
          autocomplete="off"
          :disabled="disabled"
        />
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
      <p class="access-hint">
        密钥仅保存在当前浏览器本地。`https://aicodelink.top/v1` 支持多 Key
        脱敏管理、当前使用高亮和手动切换。
      </p>
    </section>

    <section class="sidebar-card sessions-panel">
      <div class="sidebar-card-head sessions-head">
        <div>
          <strong>历史会话</strong>
          <span>{{ sessionMeta }}</span>
        </div>
        <div class="head-actions">
          <button
            class="head-action-btn create-action"
            type="button"
            aria-label="新建会话"
            :disabled="disabled"
            @click="emit('new-session')"
          >
            <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path :d="plusIconPath" />
            </svg>
            <span style="margin-top: 0">新建会话</span>
          </button>
        </div>
      </div>

      <div class="storage-card">
        <div class="storage-row">
          <span>本地缓存</span>
          <span>{{ storageUsageText }}</span>
        </div>
        <div class="storage-track" aria-hidden="true">
          <div
            class="storage-fill"
            :class="{ 'is-warning': storageIsWarning }"
            :style="{ width: `${storageUsageWidth}%` }"
          ></div>
        </div>
        <p class="storage-hint">
          仅加载当前会话。超过阈值会自动清理最旧会话，避免页面变慢。
        </p>
      </div>

      <div class="session-list" aria-live="polite">
        <template v-if="sessions.length">
          <article
            v-for="session in sessions"
            :key="session.id"
            class="session-item"
            :class="{ 'is-active': session.id === activeSessionId }"
          >
            <button
              class="session-main"
              type="button"
              @click="emit('open-session', session.id)"
            >
              <strong>{{ session.title }}</strong>
              <small>{{ session.imageCount }} 张图 · {{ session.relativeTime }}</small>
            </button>
            <button
              class="session-delete"
              type="button"
              aria-label="删除会话"
              @click="emit('delete-session', session.id)"
            >
              <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path :d="trashIconPath" />
              </svg>
            </button>
          </article>
        </template>
        <div v-else class="session-empty">
          <strong>暂无历史会话</strong>
          <p>生成成功后，这里会自动积累你的本地会话记录。</p>
        </div>
      </div>

      <div class="sessions-danger-zone">
        <button
          class="panel-danger-btn"
          type="button"
          :disabled="disabled"
          @click="emit('clear-sessions')"
        >
          <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="trashIconPath" />
          </svg>
          <span>删除当前分类</span>
        </button>
        <p class="sessions-danger-hint">只会清空当前 tab 下的本地会话和图片缓存。</p>
      </div>
    </section>
  </aside>
</template>
