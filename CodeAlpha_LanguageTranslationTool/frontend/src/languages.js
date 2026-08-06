// Languages offered in the UI (ISO 639-1 codes, matching what both Google
// Cloud Translate and Azure Translator expect for `source`/`target`).
// The `speech` field is a separate BCP-47 tag for the browser's
// SpeechSynthesis voices — kept distinct from `code` since the two APIs
// want different formats (e.g. plain "bn" vs. "bn-BD").
export const LANGUAGES = [
  { code: "ar", name: "Arabic", speech: "ar-SA" },
  { code: "bn", name: "Bengali", speech: "bn-BD" },
  { code: "zh-CN", name: "Chinese (Simplified)", speech: "zh-CN" },
  { code: "nl", name: "Dutch", speech: "nl-NL" },
  { code: "en", name: "English", speech: "en-US" },
  { code: "fr", name: "French", speech: "fr-FR" },
  { code: "de", name: "German", speech: "de-DE" },
  { code: "el", name: "Greek", speech: "el-GR" },
  { code: "hi", name: "Hindi", speech: "hi-IN" },
  { code: "id", name: "Indonesian", speech: "id-ID" },
  { code: "it", name: "Italian", speech: "it-IT" },
  { code: "ja", name: "Japanese", speech: "ja-JP" },
  { code: "ko", name: "Korean", speech: "ko-KR" },
  { code: "ms", name: "Malay", speech: "ms-MY" },
  { code: "pl", name: "Polish", speech: "pl-PL" },
  { code: "pt", name: "Portuguese", speech: "pt-PT" },
  { code: "ru", name: "Russian", speech: "ru-RU" },
  { code: "es", name: "Spanish", speech: "es-ES" },
  { code: "sv", name: "Swedish", speech: "sv-SE" },
  { code: "th", name: "Thai", speech: "th-TH" },
  { code: "tr", name: "Turkish", speech: "tr-TR" },
  { code: "uk", name: "Ukrainian", speech: "uk-UA" },
  { code: "ur", name: "Urdu", speech: "ur-PK" },
  { code: "vi", name: "Vietnamese", speech: "vi-VN" },
];

export const speechTagFor = (code) =>
  LANGUAGES.find((l) => l.code === code)?.speech ?? code;
