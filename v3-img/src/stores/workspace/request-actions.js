import * as storage from "../../services/storage";
import { editImage, generateImage } from "../../services/api";
import { fileToRenderData, imageDataToRenderData } from "../../utils/image";
import { buildFinalPrompt, buildPrompt, buildSessionTitle } from "./helpers";

export function createWorkspaceRequestActions(state, computedState, shared) {
  function setCurrentSessionLastRequestPayload(payload) {
    const normalizedPayload = payload ? { ...payload } : null;
    computedState.currentSession.value.lastRequestPayload = normalizedPayload;
    state.lastRequestPayloads[state.activeMode.value] = normalizedPayload;
  }

  function listAvailableApiKeys(apiBaseUrl) {
    return storage.getApiKeyPoolForBaseUrl(apiBaseUrl)
      .filter((item) => !item.disabled && !item.exhausted)
      .map((item) => item.value);
  }

  function syncDisplayedApiKey(apiBaseUrl) {
    const nextApiKey = storage.getApiKeyForBaseUrl(apiBaseUrl);
    state.config.apiKey = nextApiKey;
    state.config.apiKeysText = storage.getApiKeysTextForBaseUrl(apiBaseUrl);
    storage.persistApiKey(nextApiKey);
  }

  function isInsufficientBalanceError(error) {
    const errorMessage = String(error?.message || "").toLowerCase();
    return [
      "insufficient balance",
      "insufficient quota",
      "quota exceeded",
      "余额不足",
      "额度不足",
      "credit balance",
      "recharge"
    ].some((keyword) => errorMessage.includes(keyword));
  }

  async function executeWithFallbackKeys(apiBaseUrl, requestHandler) {
    const availableApiKeys = listAvailableApiKeys(apiBaseUrl);
    if (!availableApiKeys.length) {
      throw new Error("当前域名下没有可用的 API Key。");
    }

    let lastError = null;

    for (const apiKey of availableApiKeys) {
      try {
        const result = await requestHandler(apiKey);
        storage.resetApiKeyStatus(apiBaseUrl, apiKey);
        syncDisplayedApiKey(apiBaseUrl);
        return result;
      } catch (error) {
        lastError = error;
        if (!isInsufficientBalanceError(error)) {
          throw error;
        }

        storage.markApiKeyExhausted(apiBaseUrl, apiKey);
        syncDisplayedApiKey(apiBaseUrl);
      }
    }

    throw lastError || new Error("当前没有可用的 API Key。");
  }

  function appendAssistantImages(imageList, text) {
    const renderedImages = imageList.map((imageData) => {
      const renderData = imageDataToRenderData(imageData);
      return {
        imageRef: renderData.imageRef,
        imageUrl: shared.rememberObjectUrl(renderData.imageUrl)
      };
    });

    computedState.currentSession.value.messages.push({
      id: storage.createId("msg"),
      role: "assistant",
      text,
      createdAt: Date.now(),
      imageRef: renderedImages[0]?.imageRef,
      imageUrl: renderedImages[0]?.imageUrl || "",
      imageRefs: renderedImages.map((item) => item.imageRef),
      imageUrls: renderedImages.map((item) => item.imageUrl)
    });

    return renderedImages.at(-1) || null;
  }

  function validatePayload(payload) {
    if (!listAvailableApiKeys(payload.apiBaseUrl).length) {
      state.errorText.value = "请先为当前接口地址填写至少一个可用的 API Key。";
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
    syncDisplayedApiKey(payload.apiBaseUrl);
    storage.persistAccessKey(payload.accessKey);
    storage.persistApiBaseUrl(payload.apiBaseUrl);
  }

  async function runGeneration({ appendUserMessage = true } = {}) {
    const payload = {
      mode: "generate",
      prompt: state.forms.generate.prompt.trim(),
      accessKey: state.config.accessKey.trim(),
      apiBaseUrl: state.config.apiBaseUrl.trim(),
      size: state.forms.generate.size,
      stylePreset: state.forms.generate.stylePreset
    };

    if (!validatePayload(payload)) {
      return;
    }

    persistLocalConfig(payload);
    setCurrentSessionLastRequestPayload(payload);
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
      const imageList = await executeWithFallbackKeys(
        payload.apiBaseUrl,
        (apiKey) => generateImage({
          apiKey,
          apiBaseUrl: payload.apiBaseUrl,
          prompt: finalPrompt,
          size: payload.size
        })
      );

      computedState.currentSession.value.contextPrompt = buildPrompt(payload.prompt, payload.stylePreset);
      computedState.currentSession.value.lastPrompt = payload.prompt;
      appendAssistantImages(imageList, "图片已生成。");
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
      accessKey: state.config.accessKey.trim(),
      apiBaseUrl: state.config.apiBaseUrl.trim(),
      size: state.forms.edit.size,
      sourceImageFile
    };

    if (!validatePayload(payload)) {
      return;
    }

    persistLocalConfig(payload);
    setCurrentSessionLastRequestPayload(payload);

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
      const imageList = await executeWithFallbackKeys(
        payload.apiBaseUrl,
        (apiKey) => editImage({
          apiKey,
          apiBaseUrl: payload.apiBaseUrl,
          prompt: payload.prompt,
          imageFile: payload.sourceImageFile,
          size: payload.size
        })
      );

      computedState.currentSession.value.contextPrompt = payload.prompt;
      computedState.currentSession.value.lastPrompt = payload.prompt;
      const latestRenderData = appendAssistantImages(imageList, "图片已编辑。");

      state.editContinuationSourceFile.value = latestRenderData?.imageRef?.blob
        ? new File([latestRenderData.imageRef.blob], "continued-edit-source.png", { type: latestRenderData.imageRef.blob.type || "image/png" })
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
    const lastRequestPayload = computedState.currentSession.value.lastRequestPayload || state.lastRequestPayloads[state.activeMode.value];
    if (!lastRequestPayload) {
      state.errorText.value = "没有可重试的请求。";
      return;
    }

    state.errorText.value = "";
    state.config.accessKey = lastRequestPayload.accessKey || state.config.accessKey;
    state.config.apiBaseUrl = lastRequestPayload.apiBaseUrl || state.config.apiBaseUrl;

    if (lastRequestPayload.mode === "edit") {
      if (!lastRequestPayload.sourceImageFile) {
        state.errorText.value = "当前编辑请求缺少可恢复的源图，刷新后无法直接重试。";
        return;
      }

      state.forms.edit.prompt = lastRequestPayload.prompt;
      state.forms.edit.size = lastRequestPayload.size;
      state.forms.edit.sourceImageFile = lastRequestPayload.sourceImageFile;
      shared.updateEditPreview(lastRequestPayload.sourceImageFile);
      await runEdit({ appendUserMessage: false });
      return;
    }

    state.forms.generate.prompt = lastRequestPayload.prompt;
    state.forms.generate.size = lastRequestPayload.size;
    state.forms.generate.stylePreset = lastRequestPayload.stylePreset;
    await runGeneration({ appendUserMessage: false });
  }

  return {
    retryLastRequest,
    submit
  };
}
