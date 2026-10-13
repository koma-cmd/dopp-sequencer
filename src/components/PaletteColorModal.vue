<script setup>
// パレット色変更モーダル（制作フェーズ）
//
// 表示/非表示は親側の v-if で制御する（target が null のときは描画しない）。
// 色の反映（パレット・ブロック）は親の責務。このコンポーネントは
// 「色が選ばれた」「閉じたい」という通知だけを行う。
defineProps({
  /** { sound: 'A', color: '#555555' } */
  target: { type: Object, required: true },
});

const emit = defineEmits([
  'change', // (color: string) 色ピッカーが操作された
  'close',  // 背景クリック or 確定ボタン
]);
</script>

<template>
  <div class="palette-color-overlay" @click.self="emit('close')">
    <div class="palette-color-modal">
      <p class="palette-color-title">Sound {{ target.sound }} の色を変更</p>
      <div class="palette-color-preview" :style="{ backgroundColor: target.color }">
        <span class="palette-color-preview-label">{{ target.sound }}</span>
      </div>
      <input
        type="color"
        :value="target.color"
        @input="emit('change', $event.target.value)"
        class="palette-color-picker"
      />
      <p class="palette-color-hint">同じ音のブロック全てに適用されます</p>
      <button class="palette-color-confirm" @click="emit('close')">確定</button>
    </div>
  </div>
</template>

<style scoped>
.palette-color-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.75);
  z-index: 1200;
  display: flex; align-items: center; justify-content: center;
}
.palette-color-modal {
  background: #1a1a2e;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 14px;
  padding: 28px 32px;
  min-width: 240px;
  display: flex; flex-direction: column;
  align-items: center; gap: 18px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.6);
}
.palette-color-title {
  font-size: 1.05rem; font-weight: bold;
  color: #7eb8f7; margin: 0; text-align: center;
}
.palette-color-preview {
  width: 80px; height: 80px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid rgba(255,255,255,0.2);
  transition: background-color 0.15s;
}
.palette-color-preview-label {
  font-size: 2rem; font-weight: 900;
  color: white; text-shadow: 1px 1px 0 rgba(0,0,0,0.5);
}
.palette-color-picker {
  width: 72px; height: 72px;
  border: none; border-radius: 10px;
  cursor: pointer; background: none; padding: 0;
}
.palette-color-hint {
  font-size: 0.78rem; color: rgba(255,255,255,0.5);
  margin: 0; text-align: center;
}
.palette-color-confirm {
  background: #3498db; color: white;
  padding: 10px 28px; border-radius: 8px; font-size: 0.95rem;
  cursor: pointer; border: none; font-weight: bold; white-space: nowrap;
}
.palette-color-confirm:hover { filter: brightness(1.2); }
.palette-color-confirm:active { filter: brightness(0.8); transform: translateY(2px); }
</style>
