const DEFAULT_API_BASE_URL = "https://api.zectai.com/v1";
const IMAGE_MODEL = "gpt-image-2";
const ALLOWED_SIZES = new Set(["1024x1024", "1536x1024", "1024x1536"]);

function normalizeApiBaseUrl(apiBaseUrl) {
  const normalizedValue = (apiBaseUrl || DEFAULT_API_BASE_URL).trim();
  return normalizedValue.replace(/\/+$/, "") || DEFAULT_API_BASE_URL;
}

function buildEndpoint(apiBaseUrl, path) {
  return `${normalizeApiBaseUrl(apiBaseUrl)}${path}`;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.startsWith("image/")) {
    const blob = await response.blob();
    return { kind: "blob", blob };
  }

  const rawText = await response.text();
  if (!rawText) {
    return {};
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(rawText);
    } catch {
      throw new Error("接口返回了无法解析的 JSON。");
    }
  }

  return { message: rawText };
}

function buildRequestError(result, response) {
  return result?.error?.message || result?.message || `请求失败（HTTP ${response.status}）。`;
}

function readImageData(result) {
  if (result?.kind === "blob" && result.blob) {
    return { type: "blob", value: result.blob };
  }

  const firstItem = result?.data?.[0] || result?.images?.[0] || result?.output?.[0];
  const base64Data = firstItem?.b64_json || firstItem?.b64 || result?.b64_json || result?.b64;
  const remoteUrl = firstItem?.url || firstItem?.image_url || result?.url || result?.image_url;

  if (base64Data) {
    return { type: "base64", value: base64Data };
  }

  if (remoteUrl) {
    return { type: "url", value: remoteUrl };
  }

  throw new Error("接口未返回图片数据。");
}

export async function generateImage({ apiKey, apiBaseUrl, prompt, size = "1024x1024" }) {
  const requestSize = ALLOWED_SIZES.has(size) ? size : "1024x1024";
  const response = await fetch(buildEndpoint(apiBaseUrl, "/images/generations"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      size: requestSize
    })
  });

  const result = await parseResponse(response);
  if (!response.ok) {
    throw new Error(buildRequestError(result, response));
  }

  return readImageData(result);
}

export async function editImage({ apiKey, apiBaseUrl, prompt, imageFile, size = "1024x1024" }) {
  const requestSize = ALLOWED_SIZES.has(size) ? size : "1024x1024";
  const formData = new FormData();
  formData.append("model", IMAGE_MODEL);
  formData.append("prompt", prompt);
  formData.append("size", requestSize);
  formData.append("image", imageFile);

  const response = await fetch(buildEndpoint(apiBaseUrl, "/images/edits"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  });

  const result = await parseResponse(response);
  if (!response.ok) {
    throw new Error(buildRequestError(result, response));
  }

  return readImageData(result);
}
