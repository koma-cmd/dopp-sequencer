<script setup>
// 制作フェーズのVASバー表示（ブロック内）
//
// ルート要素 .vas-bars は position:absolute でブロック全体を覆う。
// 親の .music-block が position:relative であることを前提にしている。
const props = defineProps({
  /** [{ key, left, right }, ...] */
  labels: { type: Array, required: true },
  /** この音の評価値 { hard_soft: 50, ... } */
  ratings: { type: Object, required: true },
});

// VAS値（0〜100）をラベルのフォントサイズ・透明度に変換する。
// left側: 値が小さいほど強調 / right側: 値が大きいほど強調
const MIN_SIZE = 9;   // 最小フォントサイズ (px)
const MAX_SIZE = 14;  // 最大フォントサイズ (px)

const labelStyle = (key, side) => {
  const value = props.ratings?.[key] ?? 50;
  const ratio = side === 'left' ? (100 - value) / 100 : value / 100;
  const size = MIN_SIZE + ratio * (MAX_SIZE - MIN_SIZE);
  const opacity = 0.4 + ratio * 0.6;
  return {
    fontSize: `${size.toFixed(1)}px`,
    opacity: opacity.toFixed(2),
    transition: 'font-size 0.2s, opacity 0.2s',
  };
};
</script>

<template>
  <div class="vas-bars">
    <div v-for="item in labels" :key="item.key" class="vas-bar-row">
      <span class="vas-bar-label-left" :style="labelStyle(item.key, 'left')">{{ item.left }}</span>
      <div class="vas-bar-track-wrap">
        <div class="vas-bar-track">
          <div class="vas-bar-fill" :style="{ width: ratings[item.key] + '%' }">
            <div class="vas-bar-thumb"></div>
          </div>
        </div>
      </div>
      <span class="vas-bar-label-right" :style="labelStyle(item.key, 'right')">{{ item.right }}</span>
    </div>
  </div>
</template>

<style scoped>
/* ブロック全体を覆う絶対配置コンテナ。上部＝音名ラベル分、下部＝削除ボタン分を避ける。 */
.vas-bars {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 32px 10px 28px;
  box-sizing: border-box;
}

.vas-bar-row {
  position: relative;      /* ラベルのabsolute基準 */
  width: 50%;
  height: 11px;
  flex-shrink: 0;
}

.vas-bar-label-left,
.vas-bar-label-right {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: rgba(255,255,255,0.65);
  white-space: nowrap;
  line-height: 1;
  pointer-events: none;
}
.vas-bar-label-left  { right: calc(100% + 4px); }  /* トラック左端の外側 */
.vas-bar-label-right { left:  calc(100% + 4px); }  /* トラック右端の外側 */

.vas-bar-track-wrap {
  width: 100%;
  height: 11px;
  display: flex;
  align-items: center;
}

.vas-bar-track {
  width: 100%;
  height: 3px;
  background: rgba(255,255,255,0.25);
  border-radius: 3px;
  overflow: visible;
  position: relative;
}

.vas-bar-fill {
  height: 100%;
  background: rgba(255,255,255,0.75);
  border-radius: 3px;
  position: relative;
}

/* つまみ：バー右端に追従、読み取り専用 */
.vas-bar-thumb {
  position: absolute;
  top: 50%;
  right: 0;
  width: 9px;
  height: 9px;
  background: white;
  border-radius: 50%;
  transform: translate(50%, -50%);
  box-shadow: 0 1px 3px rgba(0,0,0,0.5);
  pointer-events: none;
}
</style>
