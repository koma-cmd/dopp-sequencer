<script setup>
import { watch } from 'vue';
import SurveyModalShell from './SurveyModalShell.vue';
import {
  musicExperienceOptions,
  musicExperienceCategory,
  musicExperienceTimes,
  TERMS_URL,
} from '../constants/surveyItems';

// 回答オブジェクト全体を v-model で受け取る（App.vue の preSurvey ref をそのまま渡す）。
// オブジェクトの中身を直接書き換える形なので、親の ref はそのまま更新される。
const survey = defineModel({ type: Object, required: true });

defineProps({
  error:   { type: String,  default: '' },
  loading: { type: Boolean, default: false },
});
const emit = defineEmits(['submit']);

// 「経験あり」以外に変えたら、Q1-a の回答を捨てる
watch(() => survey.value.musicExperience, (v) => {
  if (v !== 'yes') {
    survey.value.musicExperienceTypes = [];
    survey.value.musicExperienceOther = '';
  }
});

// チェックされたジャンルごとに、追加設問（場・頻度）の回答枠を用意する
watch(() => survey.value.musicExperienceTypes, (types) => {
  const details = survey.value.musicExperienceDetails;
  for (const g of types) {
    if (!details[g]) details[g] = { category: '', times: '' };
  }
}, { deep: true });
</script>

<template>
  <SurveyModalShell
    title="研究利用への同意"
    submit-label="実験を開始する"
    loading-label="準備中..."
    :error="error"
    :loading="loading"
    @submit="emit('submit')"
  >
    <!--
      Q1（楽曲制作経験の有無）は現在コメントアウト運用のため、このセクションは
      musicExperience === 'yes' にならない限り表示されない。
      Q1 を復活させるときは、下のブロックのコメントを外す。
    -->
    <!--
    <div class="survey-section">
      <p class="survey-question">Q1. これまでに、音楽を創作・制作した経験はありますか？(授業や講座、ワークショップなどの指導を含む)</p>
      <label class="survey-option">
        <input type="radio" value="yes" v-model="survey.musicExperience" />
        ある
      </label>
      <label class="survey-option">
        <input type="radio" value="no" v-model="survey.musicExperience" />
        ない
      </label>
    </div>
    -->

    <div v-if="survey.musicExperience === 'yes'" class="survey-section">
      <p class="survey-question">Q1-a. どのような音楽創作・制作を経験しましたか？</p>

      <div v-for="opt in musicExperienceOptions" :key="opt.value" class="survey-genre-block">
        <label class="survey-option">
          <input type="checkbox" :value="opt.value" v-model="survey.musicExperienceTypes" />
          {{ opt.label }}
        </label>

        <!-- チェックされたジャンルだけ追加の2問を表示 -->
        <div v-if="survey.musicExperienceTypes.includes(opt.value) && survey.musicExperienceDetails[opt.value]"
             class="survey-genre-detail">
          <input
            v-if="opt.value === 'other'"
            v-model="survey.musicExperienceOther"
            type="text"
            class="survey-text-input"
            placeholder="具体的にご記入ください"
          />

          <p class="survey-sub-label">どのような場での経験ですか？(1つ選択)</p>
          <label v-for="c in musicExperienceCategory" :key="c.value" class="survey-option">
            <input
              type="radio"
              :name="`category-${opt.value}`"
              :value="c.value"
              v-model="survey.musicExperienceDetails[opt.value].category"
            />
            {{ c.label }}
          </label>

          <p class="survey-sub-label">経験の程度(1つ選択)</p>
          <div class="survey-inline-options">
            <label v-for="f in musicExperienceTimes" :key="f.value" class="survey-option">
              <input
                type="radio"
                :name="`times-${opt.value}`"
                :value="f.value"
                v-model="survey.musicExperienceDetails[opt.value].times"
              />
              {{ f.label }}
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="survey-section">
      <p class="survey-question">
        制作過程や制作された楽曲は実験に使用します。当サイトをご利用いただくには<a :href="TERMS_URL" target="_blank" rel="noopener noreferrer" class="survey-link">利用規約</a>に同意していただく必要があります。
      </p>
      <label class="survey-option">
        <input type="radio" name="agreeTerms" value="yes" v-model="survey.agreeTerms" />
        同意する
      </label>
      <label class="survey-option">
        <input type="radio" name="agreeTerms" value="no" v-model="survey.agreeTerms" />
        同意しない
      </label>
    </div>
  </SurveyModalShell>
</template>

<style scoped>
.survey-sub-label { font-size: 0.9rem; color: rgba(255,255,255,0.8); margin: 0; }
.survey-genre-detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 6px 0 12px 24px;
  padding-left: 12px;
  border-left: 2px solid #666;
}
.survey-inline-options { display: flex; gap: 16px; flex-wrap: wrap; }
</style>
