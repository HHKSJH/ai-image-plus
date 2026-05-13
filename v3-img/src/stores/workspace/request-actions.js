import * as storage from "../../services/storage";
import { editImage, generateImage } from "../../services/api";
import { fileToRenderData, imageDataToRenderData } from "../../utils/image";
import { buildFinalPrompt, buildPrompt, buildSessionTitle } from "./helpers";

export function createWorkspaceRequestActions(state, computedState, shared) {
  function validatePayload(payload) {
    if (!payload.apiKey) {
      state.errorText.value = "请先输入 API Key。";
      return false;
    }

    if (!payload.prompt) {
      state.errorText.value = payload.mode === "edit"
        ? "请先描述你想如何编辑这张图片。"
        : "请先描述你想生成的画面。";
      return false;
    }

    if (payload.mode === "edit" && !payload.sourceImageFile) {
      state.errorText.value = "请先上传一张需要编辑的原图。";
      return false;
    }

    state.errorText.value = "";
    return true;
  }

  function persistLocalConfig(payload) {
    storage.persistApiKey(payload.apiKey);
    storage.persistApiKeyForBaseUrl(payload.apiBaseUrl, payload.apiKey);
    storage.persistAccessKey(payload.accessKey);
    storage.persistApiBaseUrl(payload.apiBaseUrl);
  }

  async function runGeneration({ appendUserMessage = true } = {}) {
    const payload = {
      mode: "generate",
      prompt: state.forms.generate.prompt.trim(),
      apiKey: state.config.apiKey.trim(),
      accessKey: state.config.accessKey.trim(),
      apiBaseUrl: state.config.apiBaseUrl.trim(),
      size: state.forms.generate.size,
      stylePreset: state.forms.generate.stylePreset
    };

    if (!validatePayload(payload)) {
      return;
    }

    persistLocalConfig(payload);
    state.lastRequestPayloads.generate = { ...payload };
    const finalPrompt = buildFinalPrompt(
      payload.prompt,
      payload.stylePreset,
      state.contextMode.value,
      computedState.currentSession.value.contextPrompt || ""
    );

    if (appendUserMessage) {
      computedState.currentSession.value.messages.push({
        id: storage.createId("msg"),
        role: "user",
        text: state.contextMode.value === "continuation" && computedState.currentSession.value.contextPrompt
          ? `继续创作：${payload.prompt}`
          : payload.prompt,
        createdAt: Date.now()
      });
      computedState.currentSession.value.title = computedState.currentSession.value.messages.length <= 1
        ? buildSessionTitle(payload.prompt)
        : computedState.currentSession.value.title;
      computedState.currentSession.value.lastPrompt = payload.prompt;
      state.forms.generate.prompt = "";
      await shared.persistCurrentSession();
    }

    state.isLoading.value = true;
    try {
      const imageData = await generateImage({
        apiKey: payload.apiKey,
        apiBaseUrl: payload.apiBaseUrl,
        prompt: finalPrompt,
        size: payload.size
      });

      const renderData = imageDataToRenderData(imageData);
      renderData.imageUrl = shared.rememberObjectUrl(renderData.imageUrl);
      computedState.currentSession.value.contextPrompt = buildPrompt(payload.prompt, payload.stylePreset);
      computedState.currentSession.value.lastPrompt = payload.prompt;
      computedState.currentSession.value.messages.push({
        id: storage.createId("msg"),
        role: "assistant",
        text: "图片已生成。",
        createdAt: Date.now(),
        imageRef: renderData.imageRef,
        imageUrl: renderData.imageUrl
      });
      await shared.persistCurrentSession();
    } catch (error) {
      const errorMessage = `请求失败：${error.message || "未知错误"}`;
      computedState.currentSession.value.messages.push({
        id: storage.createId("msg"),
        role: "assistant",
        text: errorMessage,
        createdAt: Date.now(),
        canRetry: true
      });
      state.errorText.value = errorMessage;
      await shared.persistCurrentSession();
    } finally {
      state.isLoading.value = false;
    }
  }

  async function runEdit({ appendUserMessage = true } = {}) {
    const fallbackSourceFile = state.contextMode.value === "continuation" ? state.editContinuationSourceFile.value : null;
    const sourceImageFile = state.forms.edit.sourceImageFile || fallbackSourceFile;
    const payload = {
      mode: "edit",
      prompt: state.forms.edit.prompt.trim(),
      apiKey: state.config.apiKey.trim(),
      accessKey: state.config.accessKey.trim(),
      apiBaseUrl: state.config.apiBaseUrl.trim(),
      size: state.forms.edit.size,
      sourceImageFile
    };

    if (!validatePayload(payload)) {
      return;
    }

    persistLocalConfig(payload);
    state.lastRequestPayloads.edit = { ...payload };

    if (appendUserMessage) {
      const sourceRenderData = fileToRenderData(payload.sourceImageFile);
      sourceRenderData.imageUrl = shared.rememberObjectUrl(sourceRenderData.imageUrl);
      computedState.currentSession.value.messages.push({
        id: storage.createId("msg"),
        role: "user",
        text: `编辑图片：${payload.prompt}`,
        createdAt: Date.now(),
        imageRef: sourceRenderData.imageRef,
        imageUrl: sourceRenderData.imageUrl
      });
      computedState.currentSession.value.title = computedState.currentSession.value.messages.length <= 1
        ? buildSessionTitle(payload.prompt)
        : computedState.currentSession.value.title;
      computedState.currentSession.value.lastPrompt = payload.prompt;
      state.forms.edit.prompt = "";
      await shared.persistCurrentSession();
    }

    state.isLoading.value = true;
    try {
      const imageData = await editImage({
        apiKey: payload.apiKey,
        apiBaseUrl: payload.apiBaseUrl,
        prompt: payload.prompt,
        imageFile: payload.sourceImageFile,
        size: payload.size
      });

      const renderData = imageDataToRenderData(imageData);
      renderData.imageUrl = shared.rememberObjectUrl(renderData.imageUrl);
      computedState.currentSession.value.contextPrompt = payload.prompt;
      computedState.currentSession.value.lastPrompt = payload.prompt;
      computedState.currentSession.value.messages.push({
        id: storage.createId("msg"),
        role: "assistant",
        text: "图片已编辑。",
        createdAt: Date.now(),
        imageRef: renderData.imageRef,
        imageUrl: renderData.imageUrl
      });

      state.editContinuationSourceFile.value = renderData.imageRef?.blob
        ? new File([renderData.imageRef.blob], "continued-edit-source.png", { type: renderData.imageRef.blob.type || "image/png" })
        : null;

      if (state.editContinuationSourceFile.value && state.contextMode.value === "continuation") {
        shared.updateEditPreview(state.editContinuationSourceFile.value);
      } else if (!state.editContinuationSourceFile.value) {
        shared.updateEditPreview(null);
      }

      await shared.persistCurrentSession();
    } catch (error) {
      const errorMessage = `编辑失败：${error.message || "未知错误"}`;
      computedState.currentSession.value.messages.push({
        id: storage.createId("msg"),
        role: "assistant",
        text: errorMessage,
        createdAt: Date.now(),
        canRetry: true
      });
      state.errorText.value = errorMessage;
      await shared.persistCurrentSession();
    } finally {
      state.isLoading.value = false;
    }
  }

  async function submit() {
    if (state.activeMode.value === "edit") {
      await runEdit({ appendUserMessage: true });
      return;
    }

    await runGeneration({ appendUserMessage: true });
  }

  async function retryLastRequest() {
    if (!state.lastRequestPayloads[state.activeMode.value]) {
      state.errorText.value = "没有可重试的请求。";
      return;
    }

    state.errorText.value = "";

    if (state.activeMode.value === "edit") {
      state.forms.edit.prompt = state.lastRequestPayloads.edit.prompt;
      state.forms.edit.size = state.lastRequestPayloads.edit.size;
      state.forms.edit.sourceImageFile = state.lastRequestPayloads.edit.sourceImageFile;
      shared.updateEditPreview(state.lastRequestPayloads.edit.sourceImageFile);
      await runEdit({ appendUserMessage: false });
      return;
    }

    state.forms.generate.prompt = state.lastRequestPayloads.generate.prompt;
    state.forms.generate.size = state.lastRequestPayloads.generate.size;
    state.forms.generate.stylePreset = state.lastRequestPayloads.generate.stylePreset;
    await runGeneration({ appendUserMessage: false });
  }

  return {
    retryLastRequest,
    submit
  };
}
