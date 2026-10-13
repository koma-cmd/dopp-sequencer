<script setup>
// 試聴フェーズのVAS入力モーダル
//
// 表示/非表示は親側の v-if で制御する。
// 値は props を直接書き換えず、変更を emit で親に通知する。
defineProps({
  /** 評価対象の音（'A'〜'H'） */
  sound: { type: String, required: true },
  /** [{ key, left, right }, ...] */
  labels: { type: Array, required: true },
  /** この音の評価値 { hard_soft: 50, ... } */
  ratings: { type: Object, required: true },
});

const emit = defineEmits([
  'update', // (key: string, value: number)
  'close',  // 背景クリック or「保存して閉じる」
]);
</script>

<template>
  <div class="vas-overlay" @click.self="emit('close')">
    <div class="vas-modal">
      <p class="vas-modal-title">Sound {{ sound }} の印象</p>

      <div class="vas-rows">
        <div v-for="item in labels" :key="item.key" class="vas-row">
          <span class="vas-label-left">{{ item.left }}</span>
          <input
            type="range" min="0" max="100" class="vas-slider"
            :value="ratings[item.key]"
            @input="emit('update', item.key, Number($event.target.value))"
          />
          <span class="vas-label-right">{{ item.right }}</span>
        </div>
      </div>

      <button class="vas-close-btn" @click="emit('close')">保存して閉じる</button>
    </div>
  </div>
</template>

<style scoped>
.vas-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.75);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vas-modal {
  background: #1a1a2e;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 14px;
  padding: 28px 32px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.6);
}

.vas-modal-title { font-size: 1.1rem; font-weight: bold; color: #7eb8f7; margin: 0; text-align: center; }
.vas-rows        { display: flex; flex-direction: column; gap: 14px; }
.vas-row         { display: flex; flex-direction: row; gap: 10px; }

.vas-label-left,
.vas-label-right {
  font-size: 0.8rem;
  color: rgba(255,255,255,0.7);
  min-width: 44px;
  text-align: center;
}

.vas-slider    { width: 200px; accent-color: #7eb8f7; cursor: pointer; }
.vas-close-btn {
  background: #3498db; color: white; padding: 10px 24px; border-radius: 8px; font-size: 0.95rem;
  align-self: center; cursor: pointer; border: none; font-weight: bold; white-space: nowrap;
}
.vas-close-btn:hover  { filter: brightness(1.2); }
.vas-close-btn:active { filter: brightness(0.8); transform: translateY(2px); }
</style>
