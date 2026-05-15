const API_KEY_STORAGE_KEY = "img_plus_api_key";
const API_KEYS_BY_BASE_URL_STORAGE_KEY = "img_plus_api_keys_by_base_url";
const API_KEY_POOL_BY_BASE_URL_STORAGE_KEY = "img_plus_api_key_pool_by_base_url";
const API_SELECTED_KEY_BY_BASE_URL_STORAGE_KEY = "img_plus_api_selected_key_by_base_url";
const ACCESS_KEY_STORAGE_KEY = "img_plus_access_key";
const API_BASE_URL_STORAGE_KEY = "img_plus_api_base_url";
const DB_NAME = "img_plus_history_db_v3";
const DB_VERSION = 1;
const SESSION_STORE = "sessions";
const ASSET_STORE = "assets";
const STORAGE_WARNING_RATIO = 0.72;

let dbPromise = null;

function readValue(key) {
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function persistValue(key, value) {
  try {
    const trimmedValue = value.trim();
    if (trimmedValue) {
      window.localStorage.setItem(key, trimmedValue);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // noop
  }
}

function readJsonValue(key) {
  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : {};
  } catch {
    return {};
  }
}

function persistJsonValue(key, value) {
  try {
    const entries = Object.entries(value).filter(([, item]) => typeof item === "string" && item.trim());
    if (entries.length) {
      window.localStorage.setItem(key, JSON.stringify(Object.fromEntries(entries)));
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // noop
  }
}

function normalizeApiBaseUrl(apiBaseUrl) {
  return (apiBaseUrl || "").trim();
}

function createApiKeyRecord(value, extra = {}) {
  const trimmedValue = typeof value === "string" ? value.trim() : "";
  if (!trimmedValue) {
    return null;
  }

  return {
    value: trimmedValue,
    exhausted: Boolean(extra.exhausted),
    disabled: Boolean(extra.disabled),
    lastErrorAt: Number(extra.lastErrorAt) || 0
  };
}

function normalizeApiKeyPoolEntry(entry) {
  if (!entry) {
    return [];
  }

  if (typeof entry === "string") {
    const record = createApiKeyRecord(entry);
    return record ? [record] : [];
  }

  if (!Array.isArray(entry)) {
    return [];
  }

  const normalizedList = [];
  const seen = new Set();

  entry.forEach((item) => {
    const record = typeof item === "string"
      ? createApiKeyRecord(item)
      : createApiKeyRecord(item?.value, item);

    if (!record || seen.has(record.value)) {
      return;
    }

    seen.add(record.value);
    normalizedList.push(record);
  });

  return normalizedList;
}

function readApiKeyPoolMap() {
  const rawValue = readJsonValue(API_KEY_POOL_BY_BASE_URL_STORAGE_KEY);
  return Object.fromEntries(
    Object.entries(rawValue).map(([baseUrl, entry]) => [baseUrl, normalizeApiKeyPoolEntry(entry)])
  );
}

function readSelectedApiKeyMap() {
  const rawValue = readJsonValue(API_SELECTED_KEY_BY_BASE_URL_STORAGE_KEY);
  return Object.fromEntries(
    Object.entries(rawValue)
      .map(([baseUrl, value]) => [normalizeApiBaseUrl(baseUrl), typeof value === "string" ? value.trim() : ""])
      .filter(([baseUrl, value]) => baseUrl && value)
  );
}

function persistApiKeyPoolMap(value) {
  try {
    const entries = Object.entries(value)
      .map(([baseUrl, entry]) => [normalizeApiBaseUrl(baseUrl), normalizeApiKeyPoolEntry(entry)])
      .filter(([baseUrl, entry]) => baseUrl && entry.length);

    if (entries.length) {
      window.localStorage.setItem(API_KEY_POOL_BY_BASE_URL_STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } else {
      window.localStorage.removeItem(API_KEY_POOL_BY_BASE_URL_STORAGE_KEY);
    }
  } catch {
    // noop
  }
}

function getLegacyApiKey(apiBaseUrl) {
  const normalizedBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  const apiKeyMap = readJsonValue(API_KEYS_BY_BASE_URL_STORAGE_KEY);
  const legacyValue = typeof apiKeyMap[normalizedBaseUrl] === "string"
    ? apiKeyMap[normalizedBaseUrl]
    : "";

  const record = createApiKeyRecord(legacyValue);
  return record ? [record] : [];
}

function getStoredApiKeyPool(apiBaseUrl) {
  const normalizedBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  if (!normalizedBaseUrl) {
    return [];
  }

  const apiKeyPoolMap = readApiKeyPoolMap();
  const currentPool = normalizeApiKeyPoolEntry(apiKeyPoolMap[normalizedBaseUrl]);
  if (currentPool.length) {
    return currentPool;
  }

  return getLegacyApiKey(normalizedBaseUrl);
}

function serializeApiKeysText(apiKeyPool) {
  return apiKeyPool.map((item) => item.value).join("\n");
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("数据库请求失败。"));
  });
}

function openDb() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        db.createObjectStore(SESSION_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(ASSET_STORE)) {
        db.createObjectStore(ASSET_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("无法打开 IndexedDB。"));
  });

  return dbPromise;
}

async function withStores(storeNames, mode, handler) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    const stores = storeNames.reduce((acc, name) => {
      acc[name] = tx.objectStore(name);
      return acc;
    }, {});

    let result;
    try {
      result = handler(stores, tx);
    } catch (error) {
      reject(error);
      return;
    }

    tx.oncomplete = async () => {
      try {
        resolve(await result);
      } catch (error) {
        reject(error);
      }
    };
    tx.onerror = () => reject(tx.error || new Error("数据库事务失败。"));
    tx.onabort = () => reject(tx.error || new Error("数据库事务中断。"));
  });
}

function normalizeMode(mode) {
  return mode === "edit" ? "edit" : "generate";
}

function getStoredImageRefs(message) {
  if (Array.isArray(message.imageRefs) && message.imageRefs.length) {
    return message.imageRefs;
  }

  return message.imageRef ? [message.imageRef] : [];
}

function countMessageImages(message) {
  return getStoredImageRefs(message).length;
}

async function inflateImageRef(imageRef, assetStore) {
  if (!imageRef) {
    return { imageRef: null, imageUrl: "" };
  }

  if (imageRef.kind === "remote") {
    return { imageRef, imageUrl: imageRef.value };
  }

  const asset = await requestToPromise(assetStore.get(imageRef.assetId));
  const blob = asset?.blob || null;
  return {
    imageRef: blob ? { ...imageRef, blob } : imageRef,
    imageUrl: blob ? URL.createObjectURL(blob) : ""
  };
}

function serializeImageRef(imageRef, assetWrites, createdAt, sessionId) {
  if (!imageRef) {
    return null;
  }

  if (imageRef.kind === "remote") {
    return imageRef;
  }

  if (imageRef.blob) {
    assetWrites.push({
      id: imageRef.assetId,
      blob: imageRef.blob,
      createdAt,
      sessionId
    });
  }

  return {
    kind: "asset",
    assetId: imageRef.assetId
  };
}

function normalizeRetryPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (payload.mode === "edit") {
    return {
      mode: "edit",
      prompt: typeof payload.prompt === "string" ? payload.prompt : "",
      accessKey: typeof payload.accessKey === "string" ? payload.accessKey : "",
      apiBaseUrl: typeof payload.apiBaseUrl === "string" ? payload.apiBaseUrl : "",
      size: typeof payload.size === "string" ? payload.size : "1024x1024",
      sourceImageRef: payload.sourceImageRef || null,
      sourceImageFile: payload.sourceImageFile instanceof Blob ? payload.sourceImageFile : null,
      sourceImageName: typeof payload.sourceImageName === "string" ? payload.sourceImageName : "retry-edit-source.png"
    };
  }

  return {
    mode: "generate",
    prompt: typeof payload.prompt === "string" ? payload.prompt : "",
    accessKey: typeof payload.accessKey === "string" ? payload.accessKey : "",
    apiBaseUrl: typeof payload.apiBaseUrl === "string" ? payload.apiBaseUrl : "",
    size: typeof payload.size === "string" ? payload.size : "1024x1024",
    stylePreset: typeof payload.stylePreset === "string" ? payload.stylePreset : "auto"
  };
}

function serializeRetryPayload(payload, assetWrites, session) {
  const normalizedPayload = normalizeRetryPayload(payload);
  if (!normalizedPayload) {
    return null;
  }

  if (normalizedPayload.mode !== "edit" || !normalizedPayload.sourceImageFile) {
    return normalizedPayload;
  }

  const sourceImageRef = serializeImageRef(
    {
      kind: "asset",
      assetId: normalizedPayload.sourceImageRef?.assetId || createId("asset"),
      blob: normalizedPayload.sourceImageFile
    },
    assetWrites,
    session.updatedAt || session.createdAt || Date.now(),
    session.id
  );

  return {
    ...normalizedPayload,
    sourceImageRef,
    sourceImageName: normalizedPayload.sourceImageFile.name || normalizedPayload.sourceImageName,
    sourceImageType: normalizedPayload.sourceImageFile.type || "image/png",
    sourceImageFile: undefined
  };
}

async function inflateRetryPayload(payload, assetStore) {
  const normalizedPayload = normalizeRetryPayload(payload);
  if (!normalizedPayload) {
    return null;
  }

  if (normalizedPayload.mode !== "edit" || !payload?.sourceImageRef) {
    return normalizedPayload;
  }

  const inflatedSource = await inflateImageRef(payload.sourceImageRef, assetStore);
  const blob = inflatedSource.imageRef?.blob || null;

  return {
    ...normalizedPayload,
    sourceImageRef: inflatedSource.imageRef || payload.sourceImageRef || null,
    sourceImageFile: blob
      ? new File([blob], payload.sourceImageName || normalizedPayload.sourceImageName, { type: payload.sourceImageType || blob.type || "image/png" })
      : null,
    sourceImageName: payload.sourceImageName || normalizedPayload.sourceImageName
  };
}

export function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createSession(mode = "generate") {
  const now = Date.now();
  return {
    id: createId("session"),
    mode: normalizeMode(mode),
    title: "新会话",
    createdAt: now,
    updatedAt: now,
    lastPrompt: "",
    contextPrompt: "",
    lastRequestPayload: null,
    messages: []
  };
}

export function getLocalValues() {
  persistApiKey("");
  const apiBaseUrl = readValue(API_BASE_URL_STORAGE_KEY) || "https://aicodelink.top/v1";
  const apiKeyPool = getStoredApiKeyPool(apiBaseUrl);
  const firstAvailableApiKey = apiKeyPool.find((item) => !item.disabled && !item.exhausted)?.value || apiKeyPool[0]?.value || "";

  return {
    apiKey: firstAvailableApiKey,
    apiKeysText: serializeApiKeysText(apiKeyPool),
    accessKey: readValue(ACCESS_KEY_STORAGE_KEY),
    apiBaseUrl
  };
}

export function persistApiKey(value) {
  try {
    window.localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch {
    // noop
  }
}

export function getApiKeyForBaseUrl(apiBaseUrl) {
  const apiKeyPool = getStoredApiKeyPool(apiBaseUrl);
  const selectedApiKey = getSelectedApiKeyForBaseUrl(apiBaseUrl);
  const availableApiKey = apiKeyPool.find((item) => item.value === selectedApiKey && !item.disabled && !item.exhausted);

  if (availableApiKey) {
    return availableApiKey.value;
  }

  return apiKeyPool.find((item) => !item.disabled && !item.exhausted)?.value || apiKeyPool[0]?.value || "";
}

export function persistApiKeyForBaseUrl(apiBaseUrl, value) {
  const normalizedBaseUrl = (apiBaseUrl || "").trim();
  if (!normalizedBaseUrl) {
    return;
  }

  const apiKeyMap = readJsonValue(API_KEYS_BY_BASE_URL_STORAGE_KEY);
  const trimmedValue = value.trim();

  if (trimmedValue) {
    apiKeyMap[normalizedBaseUrl] = trimmedValue;
  } else {
    delete apiKeyMap[normalizedBaseUrl];
  }

  persistJsonValue(API_KEYS_BY_BASE_URL_STORAGE_KEY, apiKeyMap);
}

export function getApiKeyPoolForBaseUrl(apiBaseUrl) {
  return getStoredApiKeyPool(apiBaseUrl);
}

export function getSelectedApiKeyForBaseUrl(apiBaseUrl) {
  const normalizedBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  if (!normalizedBaseUrl) {
    return "";
  }

  const selectedApiKeyMap = readSelectedApiKeyMap();
  return selectedApiKeyMap[normalizedBaseUrl] || "";
}

export function getApiKeysTextForBaseUrl(apiBaseUrl) {
  return serializeApiKeysText(getStoredApiKeyPool(apiBaseUrl));
}

export function persistApiKeysForBaseUrl(apiBaseUrl, apiKeysText) {
  const normalizedBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  if (!normalizedBaseUrl) {
    return;
  }

  const nextPool = normalizeApiKeyPoolEntry(
    String(apiKeysText || "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
  );

  const apiKeyPoolMap = readApiKeyPoolMap();
  if (nextPool.length) {
    const currentPool = getStoredApiKeyPool(normalizedBaseUrl);
    const currentByValue = new Map(currentPool.map((item) => [item.value, item]));
    apiKeyPoolMap[normalizedBaseUrl] = nextPool.map((item) => ({
      ...item,
      exhausted: Boolean(currentByValue.get(item.value)?.exhausted),
      disabled: Boolean(currentByValue.get(item.value)?.disabled),
      lastErrorAt: Number(currentByValue.get(item.value)?.lastErrorAt) || 0
    }));
  } else {
    delete apiKeyPoolMap[normalizedBaseUrl];
  }

  persistApiKeyPoolMap(apiKeyPoolMap);

  const selectedApiKey = getSelectedApiKeyForBaseUrl(normalizedBaseUrl);
  if (selectedApiKey && !apiKeyPoolMap[normalizedBaseUrl]?.some((item) => item.value === selectedApiKey)) {
    persistSelectedApiKeyForBaseUrl(normalizedBaseUrl, apiKeyPoolMap[normalizedBaseUrl]?.[0]?.value || "");
  }
}

export function persistSelectedApiKeyForBaseUrl(apiBaseUrl, value) {
  const normalizedBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  if (!normalizedBaseUrl) {
    return;
  }

  const selectedApiKeyMap = readSelectedApiKeyMap();
  const trimmedValue = (value || "").trim();

  if (trimmedValue) {
    selectedApiKeyMap[normalizedBaseUrl] = trimmedValue;
  } else {
    delete selectedApiKeyMap[normalizedBaseUrl];
  }

  persistJsonValue(API_SELECTED_KEY_BY_BASE_URL_STORAGE_KEY, selectedApiKeyMap);
}

export function markApiKeyExhausted(apiBaseUrl, apiKey) {
  const normalizedBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  const targetKey = (apiKey || "").trim();
  if (!normalizedBaseUrl || !targetKey) {
    return;
  }

  const apiKeyPoolMap = readApiKeyPoolMap();
  const currentPool = getStoredApiKeyPool(normalizedBaseUrl);
  apiKeyPoolMap[normalizedBaseUrl] = currentPool.map((item) => item.value === targetKey
    ? { ...item, exhausted: true, lastErrorAt: Date.now() }
    : item);
  persistApiKeyPoolMap(apiKeyPoolMap);
  persistSelectedApiKeyForBaseUrl(normalizedBaseUrl, getApiKeyForBaseUrl(normalizedBaseUrl));
}

export function resetApiKeyStatus(apiBaseUrl, apiKey) {
  const normalizedBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  const targetKey = (apiKey || "").trim();
  if (!normalizedBaseUrl || !targetKey) {
    return;
  }

  const apiKeyPoolMap = readApiKeyPoolMap();
  const currentPool = getStoredApiKeyPool(normalizedBaseUrl);
  apiKeyPoolMap[normalizedBaseUrl] = currentPool.map((item) => item.value === targetKey
    ? { ...item, exhausted: false, lastErrorAt: 0 }
    : item);
  persistApiKeyPoolMap(apiKeyPoolMap);
}

export function persistAccessKey(value) {
  persistValue(ACCESS_KEY_STORAGE_KEY, value);
}

export function persistApiBaseUrl(value) {
  persistValue(API_BASE_URL_STORAGE_KEY, value);
}

export async function listSessions(mode = "generate") {
  const targetMode = normalizeMode(mode);
  return withStores([SESSION_STORE], "readonly", async ({ [SESSION_STORE]: sessionStore }) => {
    const sessions = await requestToPromise(sessionStore.getAll());
    return sessions
      .filter((session) => normalizeMode(session.mode) === targetMode)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((session) => ({
        id: session.id,
        title: session.title,
        updatedAt: session.updatedAt,
        createdAt: session.createdAt,
        messageCount: session.messages.length,
        imageCount: session.messages.reduce((count, message) => count + countMessageImages(message), 0)
      }));
  });
}

export async function getSession(sessionId) {
  return withStores([SESSION_STORE, ASSET_STORE], "readonly", async ({ [SESSION_STORE]: sessionStore, [ASSET_STORE]: assetStore }) => {
    const session = await requestToPromise(sessionStore.get(sessionId));
    if (!session) {
      return null;
    }

    const messages = [];
    for (const message of session.messages) {
      const storedImageRefs = getStoredImageRefs(message);
      if (!storedImageRefs.length) {
        messages.push({ ...message });
        continue;
      }

      const renderedImages = [];
      for (const imageRef of storedImageRefs) {
        renderedImages.push(await inflateImageRef(imageRef, assetStore));
      }

      messages.push({
        ...message,
        imageRef: renderedImages[0]?.imageRef || null,
        imageUrl: renderedImages[0]?.imageUrl || "",
        imageRefs: renderedImages.map((item) => item.imageRef).filter(Boolean),
        imageUrls: renderedImages.map((item) => item.imageUrl).filter(Boolean)
      });
    }

    return {
      ...session,
      lastRequestPayload: await inflateRetryPayload(session.lastRequestPayload, assetStore),
      messages
    };
  });
}

export async function saveSession(session) {
  const assetWrites = [];
  const messages = session.messages.map((message) => {
    const storedImageRefs = getStoredImageRefs(message);
    if (!storedImageRefs.length) {
      return {
        id: message.id,
        role: message.role,
        text: message.text,
        createdAt: message.createdAt,
        canRetry: Boolean(message.canRetry)
      };
    }

    const serializedImageRefs = storedImageRefs
      .map((imageRef) => serializeImageRef(imageRef, assetWrites, message.createdAt, session.id))
      .filter(Boolean);

    return {
      id: message.id,
      role: message.role,
      text: message.text,
      createdAt: message.createdAt,
      canRetry: Boolean(message.canRetry),
      imageRef: serializedImageRefs[0] || null,
      imageRefs: serializedImageRefs
    };
  });

  const sessionToStore = {
    ...session,
    mode: normalizeMode(session.mode),
    lastRequestPayload: serializeRetryPayload(session.lastRequestPayload, assetWrites, session),
    messages,
    updatedAt: Date.now()
  };

  await withStores([SESSION_STORE, ASSET_STORE], "readwrite", ({ [SESSION_STORE]: sessionStore, [ASSET_STORE]: assetStore }) => {
    assetWrites.forEach((asset) => assetStore.put(asset));
    sessionStore.put(sessionToStore);
  });

  return sessionToStore;
}

export async function deleteSession(sessionId) {
  const existing = await withStores([SESSION_STORE], "readonly", ({ [SESSION_STORE]: sessionStore }) => requestToPromise(sessionStore.get(sessionId)));
  if (!existing) {
    return;
  }

  const assetIds = existing.messages.flatMap((message) => getStoredImageRefs(message)
    .filter((imageRef) => imageRef?.kind === "asset")
    .map((imageRef) => imageRef.assetId));
  if (existing.lastRequestPayload?.sourceImageRef?.kind === "asset") {
    assetIds.push(existing.lastRequestPayload.sourceImageRef.assetId);
  }

  await withStores([SESSION_STORE, ASSET_STORE], "readwrite", ({ [SESSION_STORE]: sessionStore, [ASSET_STORE]: assetStore }) => {
    sessionStore.delete(sessionId);
    assetIds.forEach((assetId) => assetStore.delete(assetId));
  });
}

export async function clearSessionsByMode(mode = "generate") {
  const targetMode = normalizeMode(mode);
  const sessions = await withStores([SESSION_STORE], "readonly", ({ [SESSION_STORE]: sessionStore }) => requestToPromise(sessionStore.getAll()));
  const targetSessions = sessions.filter((session) => normalizeMode(session.mode) === targetMode);
  const targetIds = new Set(targetSessions.map((session) => session.id));
  const assetIds = targetSessions.flatMap((session) => {
    const messageAssetIds = session.messages.flatMap((message) => getStoredImageRefs(message)
      .filter((imageRef) => imageRef?.kind === "asset")
      .map((imageRef) => imageRef.assetId));

    if (session.lastRequestPayload?.sourceImageRef?.kind === "asset") {
      messageAssetIds.push(session.lastRequestPayload.sourceImageRef.assetId);
    }

    return messageAssetIds;
  });

  if (!targetIds.size) {
    return;
  }

  await withStores([SESSION_STORE, ASSET_STORE], "readwrite", ({ [SESSION_STORE]: sessionStore, [ASSET_STORE]: assetStore }) => {
    targetIds.forEach((sessionId) => sessionStore.delete(sessionId));
    assetIds.forEach((assetId) => assetStore.delete(assetId));
  });
}

export async function estimateStorage() {
  if (!navigator.storage?.estimate) {
    return {
      usage: 0,
      quota: 0,
      usageRatio: 0,
      isNearLimit: false
    };
  }

  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage || 0;
  const quota = estimate.quota || 0;
  const usageRatio = quota ? usage / quota : 0;

  return {
    usage,
    quota,
    usageRatio,
    isNearLimit: usageRatio >= STORAGE_WARNING_RATIO
  };
}
