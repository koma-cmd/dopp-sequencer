<script setup>
// 7段階（デフォルト）のリッカート尺度。v-model は数値（未回答は null）。
// ※ 親側で v-model.number を付ける必要はない（emit するのは常に number）。
const model = defineModel({ type: [Number, null], default: null });

defineProps({
  min:        { type: Number, default: 1 },
  max:        { type: Number, default: 7 },
  leftLabel:  { type: String, default: '全くそう思わない' },
  rightLabel: { type: String, default: 'とてもそう思う' },
  // 同じ画面に複数置くので、設問ごとに一意な name を渡す（キーボード操作のグルーピング用）
  name:       { type: String, required: true },
});
</script>

<template>
  <div class="likert-row">
    <span class="likert-edge-label">{{ leftLabel }}</span>
    <label v-for="n in (max - min + 1)" :key="n" class="likert-option">
      <input type="radio" :name="name" :value="min + n - 1" v-model="model" />
      <span>{{ min + n - 1 }}</span>
    </label>
    <span class="likert-edge-label">{{ rightLabel }}</span>
  </div>
</template>

<style scoped>
.likert-row { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; color: white; }
.likert-option { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 0.85rem; }
.likert-edge-label { font-size: 0.85rem; color: rgba(255,255,255,0.8); }
</style>
