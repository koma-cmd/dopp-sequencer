// config.js
// 実験パラメータをまとめた設定ファイル。
//
// これまでコード本体（App.vue）の中にバラバラに直書きされていた
// 「制作フェーズの時間」「試聴フェーズの時間」などの数値を、
// ここ1箇所にまとめている。
//
// 【使い方】
// ・デフォルト値をそのまま使う場合は、このファイルは触らなくてよい。
// ・値を変えたい場合（本番用に戻す／A/Bテスト用に条件を分ける等）は、
//   下記のデフォルト値を直接書き換えるか、.env 系ファイルに
//   環境変数として指定すればコード本体を一切変更せずに上書きできる。
//
//   例）.env.local
//     VITE_PHASE_TIME_MINUTES=10
//     VITE_LISTENING_TIME_SECONDS=120
//
// ・A/Bテストで条件を分けたい場合は、.env.group-a / .env.group-b のように
//   グループごとに環境変数ファイルを分けてビルドすれば、
//   同じコードのまま複数バージョンを用意できる。

/** 環境変数の値を数値化する。未設定・不正な値のときは fallback を使う。 */
const toNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const EXPERIMENT_CONFIG = {
  // 制作フェーズの長さ（分）
  phaseTimeMinutes: toNumber(import.meta.env.VITE_PHASE_TIME_MINUTES, 15),

  // 試聴フェーズの長さ（秒）
  listeningTimeSeconds: toNumber(import.meta.env.VITE_LISTENING_TIME_SECONDS, 300),

  // 試聴フェーズ終了の何秒前に警告表示を出すか
  listeningWarningAtSeconds: toNumber(import.meta.env.VITE_LISTENING_WARNING_AT_SECONDS, 60),

  // Undo/Redo で遡れる操作の最大件数
  maxUndoHistory: toNumber(import.meta.env.VITE_MAX_UNDO_HISTORY, 50),
};
