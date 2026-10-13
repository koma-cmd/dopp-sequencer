// =====================================================
// useLogger.js
// DOPP Sequencer 研究用ログモジュール
//
// 【依存】
//   npm install firebase
//
// 【Firebase初期設定】
//   src/firebase.js を別途作成し、initializeApp した
//   db (Firestore) をエクスポートしてください。
//   例:
//     import { initializeApp } from 'firebase/app';
//     import { getFirestore } from 'firebase/firestore';
//     const app = initializeApp({ /* your config */ });
//     export const db = getFirestore(app);
// =====================================================

import { ref, computed } from 'vue';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase'; // 上記のfirebase.jsを参照

// =====================================================
// ■ セッション・ユーザ情報
// =====================================================

/**
 * ユニークなセッションIDを生成する。
 * ページリロードごとに新しいIDが振られる。
 */
const generateSessionId = () =>
  `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * ユーザIDは実験設計に合わせて変更してください。
 * 例: URLパラメータから取得する場合
 *   const userId = new URLSearchParams(location.search).get('uid') ?? 'unknown';
 */
const getUserId = () =>
  new URLSearchParams(location.search).get('uid') ?? 'unknown';

// =====================================================
// ■ useLogger composable
// =====================================================
export function useLogger({ vasEnabled, noteBlocks, players }) {
  const sessionId   = generateSessionId();
  const userId      = getUserId();

  // フェーズ開始時刻（制作フェーズ開始時にセット）
  const phaseStartedAt = ref(null);

  // チュートリアル終了時刻（初回ブロック配置・初回再生計測用）
  const tutorialEndedAt = ref(null);

  // 最後の操作時刻（探索時間=無操作継続時間の計測用）
  const lastActionAt = ref(null);

  // 直前の再生時点でのブロック状態（編集の有無を判定するため）
  let lastPlayedSequence = null;

  // =====================================================
  // ■ 内部ユーティリティ
  // =====================================================

  /** 現在のシーケンス情報を計算する */
  const buildSequenceInfo = () => {
    const blocks = noteBlocks.value;
    const soundSequence = blocks.map(b => b.sound);

    // 各ブロックの出現時間（秒）を累積で計算
    let offset = 0;
    const timeSequence = blocks.map(b => {
      const t = parseFloat(offset.toFixed(3));
      if (players.has(b.sound)) {
        const p = players.player(b.sound);
        offset += p.loaded ? p.buffer.duration : 0;
      }
      return t;
    });

    const totalDuration = parseFloat(offset.toFixed(3));

    // 使用音の種類（ユニーク数）
    const uniqueSounds = [...new Set(soundSequence)];

    // 使用音のばらつき（シャノン entropy）
    const entropy = (() => {
      const freq = {};
      soundSequence.forEach(s => { freq[s] = (freq[s] ?? 0) + 1; });
      const n = soundSequence.length;
      if (n === 0) return 0;
      return -Object.values(freq).reduce((acc, c) => {
        const p = c / n;
        return acc + p * Math.log2(p);
      }, 0);
    })();

    // 繰り返し密度（隣接する同一サウンドの割合）
    const repeatCount = soundSequence.reduce((acc, s, i) =>
      i > 0 && s === soundSequence[i - 1] ? acc + 1 : acc, 0);
    const repeatDensity = soundSequence.length > 1
      ? parseFloat((repeatCount / (soundSequence.length - 1)).toFixed(4))
      : 0;

    return {
      sound_sequence:  soundSequence,
      time_sequence:   timeSequence,
      total_duration:  totalDuration,
      unique_sounds:   uniqueSounds,
      unique_count:    uniqueSounds.length,
      sound_entropy:   parseFloat(entropy.toFixed(4)),
      total_blocks:    blocks.length,
      repeat_density:  repeatDensity,
    };
  };

  /** フェーズ開始からの経過ミリ秒 */
  const elapsedMs = () =>
    phaseStartedAt.value ? Date.now() - phaseStartedAt.value : null;

  /** 最後の操作からの経過ミリ秒（探索時間） */
  const idleMs = () =>
    lastActionAt.value ? Date.now() - lastActionAt.value : null;

  /** 操作があるたびに呼ぶ（探索時間のリセット） */
  const touchAction = () => { lastActionAt.value = Date.now(); };

  // =====================================================
  // ■ 1. ユーザ情報ログ（セッション開始時に1回）
  // =====================================================
  /**
   * 制作フェーズ開始時に呼ぶ。
   * @param {Object} vasDataSnapshot - 試聴フェーズで取得したVAS値 { A: {...}, B: {...}, ... }
   */
  const logSessionStart = async (vasDataSnapshot) => {
    console.log('logSessionStart 呼ばれた', sessionId); // ← 追加
    phaseStartedAt.value = Date.now();
    lastActionAt.value   = Date.now();

    const userAgent = navigator.userAgent;
    const isMobile  = /Mobi|Android/i.test(userAgent);

    const data = {
      user_id:        userId,
      session_id:     sessionId,
      vas_enabled:    vasEnabled,
      vas_data:       vasEnabled ? vasDataSnapshot : null,
      device_type:    isMobile ? 'mobile' : 'desktop',
      browser:        userAgent,
      phase_start_at: new Date(phaseStartedAt.value).toISOString(),
      created_at:     serverTimestamp(),
    };

    await setDoc(doc(db, 'sessions', sessionId), data);
  };

  // =====================================================
  // ■ 2. 操作イベントログ
  // =====================================================

  /**
   * 操作イベントを1件Firestoreに書き込む汎用関数。
   * 各操作関数から呼び出す。
   */
  const pushEvent = async (type, detail = {}) => {
    touchAction();

    const entry = {
      user_id:    userId,
      session_id: sessionId,
      type,
      elapsed_ms: elapsedMs(),
      timestamp:  serverTimestamp(),
      ...detail,
    };

    await addDoc(
      collection(db, 'sessions', sessionId, 'events'),
      entry
    );
  };

  // --- 個別イベント関数 ---

  /** ブロック追加（パレットからドラッグ） */
  const logBlockAdd = (blockId, soundId) =>
    pushEvent('block_add', { block_ids: [blockId], sound_ids: [soundId] });

  /**
   * ブロック移動（単体 or グループ）
   * @param {number[]} blockIds - 移動したブロックIDの配列
   * @param {number}   toIndex  - 移動後の先頭ブロックのインデックス
   */
  const logBlockMove = (blockIds, toIndex) =>
    pushEvent('block_move', {
      block_ids: blockIds,
      to_index:  toIndex,
      is_group:  blockIds.length > 1,
    });

  /**
   * ブロック削除（単体 or 範囲選択削除）
   * @param {number[]} blockIds - 削除したブロックIDの配列
   */
  const logBlockDelete = (blockIds) =>
    pushEvent('block_delete', {
      block_ids: blockIds,
      is_group:  blockIds.length > 1,
    });

  /** 音変更（セレクトボックス） */
  const logSoundChange = (blockId, fromSound, toSound) =>
    pushEvent('sound_change', {
      block_ids:  [blockId],
      sound_ids:  [toSound],
      from_sound: fromSound,
    });

  /** 選択複製 */
  const logBlockDuplicate = (originalIds, newIds) =>
    pushEvent('block_duplicate', {
      block_ids:    originalIds,
      new_block_ids: newIds,
    });

  /**
   * サウンドプレビュー（パレット or ブロッククリック）
   * @param {string} soundId - 再生した音
   * @param {'palette'|'block'} source - 操作元
   */
  const logSoundPreview = (soundId, source) =>
    pushEvent('sound_preview', { sound_ids: [soundId], source });

  /**
   * 再生（全体 or 選択範囲）
   * @param {'all'|'selection'} scope
   * @param {string[]} soundSequence - 再生したシーケンス
   */
  const logPlay = (scope, soundSequence) =>
    pushEvent('play', { scope, sound_sequence: soundSequence });

  /** 停止 */
  const logStop = () => pushEvent('stop');

  /**
   * Undo / Redo
   * @param {'undo'|'redo'} type
   */
  const logUndoRedo = (type) => pushEvent(type);

  /** 使い方（ヘルプ）を開いた */
  const logHelpOpen = () => pushEvent('help_open');

  // =====================================================
  // ■ 3. チュートリアル終了時刻の記録
  // =====================================================
  const logTutorialEnd = () => {
    tutorialEndedAt.value = Date.now();
  };

  // =====================================================
  // ■ 4. 編集履歴ログ / 最終作品ログ（統合）
  //
  //   再生ボタン押下時に呼ぶ（編集なしの連続再生はスキップ）。
  //   セッション終了時（openSurvey）に is_final: true で呼ぶ。
  // =====================================================

  /** 操作カウンタ（セッション通算） */
  const totalOperations = ref(0);
  const incrementOps = () => { totalOperations.value++; };

  /**
   * シーケンススナップショットを保存する。
   * @param {boolean} isFinal - true のとき最終作品ログとして扱う
   * @param {number}  playFrequency - 試聴頻度（最終ログ時のみ使用）
   */
  const logSequenceSnapshot = async (isFinal = false, playFrequency = null) => {
    const seq = buildSequenceInfo();

    // 編集なしの連続再生はスキップ（最終ログは常に保存）
    if (!isFinal) {
      const key = JSON.stringify(seq.sound_sequence);
      if (key === lastPlayedSequence) return;
      lastPlayedSequence = key;
    }

    // チュートリアル終了からの経過時間（初回ブロック配置・初回再生の計測に使用）
    const sinceTutorial = tutorialEndedAt.value
      ? Date.now() - tutorialEndedAt.value
      : null;

    const data = {
      user_id:          userId,
      session_id:       sessionId,
      is_final:         isFinal,
      elapsed_ms:       elapsedMs(),
      since_tutorial_ms: sinceTutorial,
      idle_ms:          idleMs(),         // 探索時間（直前操作からの経過）
      total_operations: totalOperations.value,
      play_frequency:   isFinal ? playFrequency : null,
      timestamp:        serverTimestamp(),
      ...seq,
    };

    await addDoc(
      collection(db, 'sessions', sessionId, 'snapshots'),
      data
    );
  };

  // =====================================================
  // ■ 公開API
  // =====================================================
  return {
    sessionId,
    userId,
    totalOperations,
    incrementOps,
    touchAction,
    // セッション
    logSessionStart,
    logTutorialEnd,
    // 操作イベント
    logBlockAdd,
    logBlockMove,
    logBlockDelete,
    logSoundChange,
    logBlockDuplicate,
    logSoundPreview,
    logPlay,
    logStop,
    logUndoRedo,
    logHelpOpen,
    // スナップショット
    logSequenceSnapshot,
  };
}
