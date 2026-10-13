<script setup>
// 事前・事後アンケートで共通の「全画面オーバーレイ＋フォーム枠＋エラー＋送信ボタン」。
// 中身（設問）は default スロットで渡す。
defineProps({
  title:           { type: String,  required: true },
  error:           { type: String,  default: '' },
  loading:         { type: Boolean, default: false },
  submitLabel:     { type: String,  required: true },
  loadingLabel:    { type: String,  default: '送信中...' },
});
const emit = defineEmits(['submit']);
</script>

<template>
  <div class="survey-overlay">
    <form class="survey-modal" @submit.prevent="emit('submit')">
      <h2 class="survey-title">{{ title }}</h2>

      <slot />

      <p v-if="error" class="survey-error">{{ error }}</p>

      <button type="submit" class="btn-survey-done" :disabled="loading">
        {{ loading ? loadingLabel : submitLabel }}
      </button>
    </form>
  </div>
</template>

<!--
  設問側（PreSurveyModal / PostSurveyModal）のスロット内容にも同じクラスを使うため、
  共通クラスはここだけ非 scoped にしている（クラス名は survey- / likert- で名前空間を分けてある）。
-->
<style>
.survey-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1250; display: flex; align-items: center; justify-content: center; }
.survey-modal { background: #333; padding: 40px; border-radius: 12px; display: flex; flex-direction: column; align-items: stretch; gap: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); width: min(620px, 90vw); box-sizing: border-box; max-height: 90vh; overflow-y: auto; color: white; font-family: sans-serif; }
.survey-title { margin: 0 0 8px; font-size: 1.3rem; text-align: center; color: white; }
.survey-section { display: flex; flex-direction: column; gap: 10px; }
.survey-question { margin: 0; font-size: 1rem; font-weight: bold; color: white; }
.survey-option { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; color: white; }
.survey-text-input { width: 100%; box-sizing: border-box; padding: 10px; border-radius: 6px; border: 1px solid #666; background: #222; color: white; }
.survey-error { margin: 0; color: #ff7675; font-size: 0.85rem; font-weight: bold; text-align: center; }
.survey-link { color: #7eb8f7; text-decoration: underline; }
.survey-link:hover { color: #aed4fb; }

.btn-survey-done { background: #4caf50; color: white; padding: 10px 30px; border-radius: 4px; align-self: center; border: none; font-weight: bold; cursor: pointer; white-space: nowrap; }
.btn-survey-done:hover { filter: brightness(1.2); }
.btn-survey-done:disabled { background: #555; color: #888; cursor: wait; filter: none; }
</style>
