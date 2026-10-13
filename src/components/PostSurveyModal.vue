<script setup>
import SurveyModalShell from './SurveyModalShell.vue';
import LikertScale from './LikertScale.vue';

// 回答オブジェクト全体を v-model で受け取る（App.vue の postSurvey ref をそのまま渡す）
const answers = defineModel({ type: Object, required: true });

defineProps({
  // 表示する設問のリスト（buildPostSurveyItems(vasEnabled) の戻り値）
  items:   { type: Array,   required: true },
  error:   { type: String,  default: '' },
  loading: { type: Boolean, default: false },
});
const emit = defineEmits(['submit']);
</script>

<template>
  <SurveyModalShell
    title="事後アンケート"
    submit-label="回答を送信する"
    loading-label="送信中..."
    :error="error"
    :loading="loading"
    @submit="emit('submit')"
  >
    <div class="survey-section">
      <p class="survey-section-label">以下の項目について、あてはまる程度を選んでください。</p>

      <div v-for="item in items" :key="item.key" class="survey-likert-block">
        <p class="survey-question">{{ item.label }}</p>

        <!-- 自由記述 -->
        <textarea
          v-if="item.type === 'freeform'"
          v-model="answers[item.key]"
          class="survey-text-input"
          rows="4"
          placeholder="ご自由にお書きください"
        ></textarea>

        <!-- はい / いいえ -->
        <div v-else-if="item.type === 'yesno'" class="survey-yesno">
          <label class="survey-option">
            <input type="radio" :name="item.key" value="yes" v-model="answers[item.key]" />
            はい
          </label>
          <label class="survey-option">
            <input type="radio" :name="item.key" value="no" v-model="answers[item.key]" />
            いいえ
          </label>
        </div>

        <!-- 複数選択 -->
        <div v-else-if="item.type === 'multiple'" class="survey-multiple">
          <label v-for="opt in item.options" :key="opt.value" class="survey-option">
            <input type="checkbox" :value="opt.value" v-model="answers[item.key]" />
            {{ opt.label }}
          </label>

          <!-- 「その他」を選んだときだけ自由記述欄を出す（任意） -->
          <input
            v-if="item.hasOther && answers[item.key].includes('other')"
            v-model="answers[`${item.key}Other`]"
            type="text"
            class="survey-text-input"
            placeholder="具体的にご記入ください"
          />
        </div>
        
        <!-- 7段階 Likert -->
        <LikertScale v-else :name="item.key" v-model="answers[item.key]" />

       
      </div>
    </div>
  </SurveyModalShell>
</template>

<style scoped>
.survey-section-label {
  font-size: 0.85rem;
  color: rgba(255,255,255,0.6);
  margin: 0 0 12px 0;
}
.survey-likert-block {
  padding: 14px 0;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.survey-likert-block:last-child { border-bottom: none; }
.survey-likert-block .survey-question { margin: 0 0 10px 0; font-size: 0.9rem; }
.survey-yesno { display: flex; align-items: center; justify-content: center; gap: 24px; }
/* .survey-multiple { display: flex; flex-wrap: wrap; gap: 8px; } */
.survey-multiple {
  display: grid;
  grid-template-columns: repeat(2, 1fr);   /* 2列。3列なら repeat(3, 1fr) */
  gap: 8px 20px;
}
.survey-multiple .survey-text-input { grid-column: 1 / -1; }  /* 記述欄は全幅 */
</style>
