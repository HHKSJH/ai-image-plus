export const STYLE_PROMPTS = {
  auto: "",
  poster: "高级感海报风格，版式克制，构图干净，视觉张力强。",
  photo: "真实摄影风格，光影自然，细节清晰，质感真实。",
  illustration: "精致插画风格，色彩统一，画面完整，细节丰富。",
  cinematic: "电影感风格，戏剧化光影，层次分明，氛围强烈。",
  minimalist: "极简风格，留白克制，元素精简，色调统一。"
};

export const API_BASE_URL_OPTIONS = [
  {
    label: "ZectAI 默认",
    value: "https://api.zectai.com/v1",
    meta: "https://api.zectai.com/v1"
  },
  {
    label: "KR777 备用",
    value: "https://api.kr777.top/v1",
    meta: "https://api.kr777.top/v1"
  }
];

export const SIZE_OPTIONS = [
  { label: "正方形", value: "1024x1024", meta: "1024 × 1024" },
  { label: "横版", value: "1536x1024", meta: "1536 × 1024" },
  { label: "竖版", value: "1024x1536", meta: "1024 × 1536" }
];

export const STYLE_OPTIONS = [
  { label: "不限风格", value: "auto", meta: "按描述自由生成" },
  { label: "高级海报", value: "poster", meta: "克制排版，视觉张力强" },
  { label: "真实摄影", value: "photo", meta: "自然光影，质感清晰" },
  { label: "精致插画", value: "illustration", meta: "色彩统一，细节完整" },
  { label: "电影感", value: "cinematic", meta: "戏剧光影，氛围更强" },
  { label: "极简留白", value: "minimalist", meta: "元素精简，气质干净" }
];
