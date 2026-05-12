import { STYLE_PROMPTS } from "../../constants/options";

export function buildPrompt(userPrompt, stylePreset) {
  const prompt = userPrompt.trim();
  const stylePrompt = STYLE_PROMPTS[stylePreset] || "";
  return stylePrompt ? `${prompt}\n\n风格要求：${stylePrompt}` : prompt;
}

export function buildFinalPrompt(prompt, stylePreset, contextMode, contextPrompt) {
  const currentPrompt = buildPrompt(prompt, stylePreset);
  if (contextMode !== "continuation" || !contextPrompt) {
    return currentPrompt;
  }

  return [
    "基于当前会话最近一次成功生成的画面继续优化。",
    `上一轮核心描述：${contextPrompt}`,
    `本轮新增要求：${currentPrompt}`,
    "请保留延续性，仅按新增要求调整画面。"
  ].join("\n\n");
}

export function buildSessionTitle(prompt) {
  const normalized = prompt.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "未命名会话";
  }
  return normalized.length > 22 ? `${normalized.slice(0, 22)}...` : normalized;
}

export function findLatestAssistantImageBlob(session) {
  const latestImageMessage = [...session.messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.imageRef?.blob);

  return latestImageMessage?.imageRef?.blob || null;
}
