const API_KEY_STORAGE_KEY = "img_plus_api_key";
const API_KEYS_BY_BASE_URL_STORAGE_KEY = "img_plus_api_keys_by_base_url";
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
    messages: []
  };
}

export function getLocalValues() {
  const apiBaseUrl = readValue(API_BASE_URL_STORAGE_KEY) || "https://api.zectai.com/v1";
  const apiKeyMap = readJsonValue(API_KEYS_BY_BASE_URL_STORAGE_KEY);

  return {
    apiKey: apiKeyMap[apiBaseUrl] || readValue(API_KEY_STORAGE_KEY),
    accessKey: readValue(ACCESS_KEY_STORAGE_KEY),
    apiBaseUrl
  };
}

export function persistApiKey(value) {
  persistValue(API_KEY_STORAGE_KEY, value);
}

export function getApiKeyForBaseUrl(apiBaseUrl) {
  const normalizedBaseUrl = (apiBaseUrl || "").trim();
  if (!normalizedBaseUrl) {
    return "";
  }

  const apiKeyMap = readJsonValue(API_KEYS_BY_BASE_URL_STORAGE_KEY);
  return apiKeyMap[normalizedBaseUrl] || "";
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
        imageCount: session.messages.filter((message) => message.imageRef).length
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
      if (!message.imageRef) {
        messages.push({ ...message });
        continue;
      }

      if (message.imageRef.kind === "remote") {
        messages.push({ ...message, imageUrl: message.imageRef.value });
        continue;
      }

      const asset = await requestToPromise(assetStore.get(message.imageRef.assetId));
      let imageUrl = "";
      if (asset?.blob) {
        imageUrl = URL.createObjectURL(asset.blob);
      }

      messages.push({
        ...message,
        imageRef: asset?.blob ? { ...message.imageRef, blob: asset.blob } : message.imageRef,
        imageUrl
      });
    }

    return { ...session, messages };
  });
}

export async function saveSession(session) {
  const assetWrites = [];
  const messages = session.messages.map((message) => {
    if (!message.imageRef) {
      return {
        id: message.id,
        role: message.role,
        text: message.text,
        createdAt: message.createdAt,
        canRetry: Boolean(message.canRetry)
      };
    }

    if (message.imageRef.kind === "remote") {
      return {
        id: message.id,
        role: message.role,
        text: message.text,
        createdAt: message.createdAt,
        canRetry: Boolean(message.canRetry),
        imageRef: message.imageRef
      };
    }

    if (message.imageRef.blob) {
      assetWrites.push({
        id: message.imageRef.assetId,
        blob: message.imageRef.blob,
        createdAt: message.createdAt,
        sessionId: session.id
      });
    }

    return {
      id: message.id,
      role: message.role,
      text: message.text,
      createdAt: message.createdAt,
      canRetry: Boolean(message.canRetry),
      imageRef: {
        kind: "asset",
        assetId: message.imageRef.assetId
      }
    };
  });

  const sessionToStore = {
    ...session,
    mode: normalizeMode(session.mode),
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

  const assetIds = existing.messages
    .filter((message) => message.imageRef?.kind === "asset")
    .map((message) => message.imageRef.assetId);

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
  const assetIds = targetSessions.flatMap((session) => session.messages
    .filter((message) => message.imageRef?.kind === "asset")
    .map((message) => message.imageRef.assetId));

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
