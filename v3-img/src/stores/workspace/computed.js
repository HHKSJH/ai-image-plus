import { computed } from "vue";
import { summarizePrompt } from "../../utils/format";

function getMessageImageCount(message) {
  if (Array.isArray(message.imageRefs) && message.imageRefs.length) {
    return message.imageRefs.length;
  }

  return message.imageRef ? 1 : 0;
}

export function createWorkspaceComputed(state) {
  const currentSession = computed(() => state.currentSessions[state.activeMode.value]);
  const currentForm = computed(() => state.forms[state.activeMode.value]);
  const selectedMessageCount = computed(() => state.selectedMessageIds.value.length);

  const currentTag = computed(() => (
    currentSession.value.messages.length
      ? `${currentSession.value.messages.length} 条记录`
      : state.activeMode.value === "edit" ? "新编辑" : "新会话"
  ));

  const currentSubtitle = computed(() => {
    const imageCount = currentSession.value.messages.reduce((count, message) => count + getMessageImageCount(message), 0);
    if (imageCount) {
      return `当前${state.activeMode.value === "edit" ? "编辑" : "生成"}会话已有 ${imageCount} 张图片。`;
    }

    return state.activeMode.value === "edit"
      ? "上传原图并输入编辑要求后，结果会显示在这里。"
      : "输入需求后，生成结果会显示在这里。";
  });

  const sessionMeta = computed(() => `${state.activeMode.value === "edit" ? "图片编辑" : "文字生图"} · ${state.sessionsIndex.value.length} 个本地会话`);
  const hasContext = computed(() => Boolean(currentSession.value.contextPrompt));

  const contextSummaryText = computed(() => {
    if (!currentSession.value.contextPrompt) {
      return state.activeMode.value === "edit"
        ? "当前没有可复用的编辑结果。先完成一次编辑后，这里会显示可继续修改的记录。"
        : "当前没有可继承的成功记录。先生成一张图后，这里会显示上下文摘要。";
    }

    return summarizePrompt(currentSession.value.contextPrompt);
  });

  const memoryDescription = computed(() => {
    if (state.activeMode.value === "edit") {
      return state.contextMode.value === "continuation"
        ? "默认沿用当前会话最近一次编辑结果作为原图，继续按新要求修改。"
        : "每次编辑都只使用当前上传的原图，不自动沿用上一轮结果。";
    }

    return state.contextMode.value === "continuation"
      ? "默认继承当前会话最近一次成功生成的描述，用于继续优化同一张图。"
      : "每次请求都按当前输入独立生成，不自动引用上一轮描述。";
  });

  const submitLabel = computed(() => (
    state.isLoading.value
      ? state.activeMode.value === "edit" ? "编辑中..." : "生成中..."
      : state.activeMode.value === "edit" ? "开始编辑" : "开始生成"
  ));

  return {
    currentForm,
    currentSession,
    selectedMessageCount,
    currentSubtitle,
    currentTag,
    contextSummaryText,
    hasContext,
    memoryDescription,
    sessionMeta,
    submitLabel
  };
}
