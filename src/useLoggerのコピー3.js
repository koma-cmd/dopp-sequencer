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
// =====================================================

import { ref } from 'vue';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  serverTimestamp,
  runTransaction,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';

// =====================================================
// ■ セッション・ユーザ情報
// =====================================================

/** ユニークなセッションIDを生成する。 */
const generateSessionId = () =>
  `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/** URLパラメータ uid があれば参加者IDとして使う。 */
const getUserId = () =>
  new URLSearchParams(location.search).get('uid') ?? 'unknown';

/**
 * ページリロードで条件が変わらないように、sessionIdをlocalStorageへ保存する。
 * 同じ端末で別参加者を実施する場合は、URLに ?reset=1 を付けるか、uidを変えてください。
 */
const getOrCreateSessionId = (userId) => {
  const params = new URLSearchParams(location.search);
  const storageKey = userId && userId !== 'unknown'
    ? `dopp_session_id_${userId}`
    : 'dopp_session_id_unknown';

  try {
    if (params.get('reset') === '1') {
      localStorage.removeItem(storageKey);
    }

    const stored = localStorage.getItem(storageKey);
    if (stored) return stored;

    const created = generateSessionId();
    localStorage.setItem(storageKey, created);
    return created;
  } catch (error) {
    console.warn('localStorageを利用できないため、一時的なsessionIdを発行します。', error);
    return generateSessionId();
  }
};

const resolveValue = (value) => {
  if (value && typeof value === 'object' && 'value' in value) return value.value;
  return value;
};

const shuffle = (array) => {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** ブロックサイズ4：VASあり2名、VASなし2名 */
const createRandomizationBlock = () => shuffle(['vas', 'vas', 'no_vas', 'no_vas']);

// =====================================================
// ■ useLogger composable
// =====================================================
export function useLogger({ vasEnabled, noteBlocks, players }) {
  const userId = getUserId();
  const sessionId = getOrCreateSessionId(userId);

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
  // ■ 0. 事前アンケート・層化ブロックランダム割付
  // =====================================================

  /**
   * 事前アンケートで得た層(stratum)の中で、ブロックランダムに条件を割り付ける。
   * Firestore transactionで、同時アクセス時の割付キュー破損を防ぐ。
   */
  const assignConditionByStratum = async (stratum, preSurvey = {}) => {
    if (!stratum) throw new Error('stratum is required for random assignment.');

    const stateRef = doc(db, 'randomization', stratum);
    const sessionRef = doc(db, 'sessions', sessionId);

    return await runTransaction(db, async (transaction) => {
      const sessionSnap = await transaction.get(sessionRef);

      // すでに割付済みなら、リロード時も同じ条件を再利用する
      if (sessionSnap.exists()) {
        const sessionData = sessionSnap.data();
        if (sessionData.condition) {
          return {
            condition: sessionData.condition,
            stratum: sessionData.stratum ?? stratum,
          };
        }
      }

      const stateSnap = await transaction.get(stateRef);
      const state = stateSnap.exists() ? stateSnap.data() : {};
      let queue = Array.isArray(state.queue) ? [...state.queue] : [];

      if (queue.length === 0) {
        queue = createRandomizationBlock();
      }

      const condition = queue.shift();
      const conditionIsVas = condition === 'vas';

      transaction.set(
        stateRef,
        {
          queue,
          block_size: 4,
          conditions: ['vas', 'no_vas'],
          counts: {
            [condition]: increment(1),
          },
          updated_at: serverTimestamp(),
        },
        { merge: true }
      );

      transaction.set(
        sessionRef,
        {
          user_id: userId,
          session_id: sessionId,
          stratum,
          condition,
          vas_enabled: conditionIsVas,
          pre_survey: preSurvey,
          assigned_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        },
        { merge: true }
      );

      return { condition, stratum };
    });
  };

  const logPreSurvey = async (data) => {
    
    await setDoc(
      doc(db, 'sessions', sessionId),
      {
        user_id:                 userId,
        session_id:              sessionId,
        pre_survey:              data,
        pre_survey_submitted_at: serverTimestamp(),
        updated_at:              serverTimestamp(),
      },
      { merge: true }
    );

    
    const snap = await getDoc(doc(db, 'sessions', sessionId));
    const openedAt    = snap.data().pre_survey_opened_at?.toDate() ?? null;
    const submittedAt = snap.data().pre_survey_submitted_at?.toDate() ?? null;
    const responseTimeMs = openedAt && submittedAt
      ? submittedAt.getTime() - openedAt.getTime()
      : null;

    
    await setDoc(
      doc(db, 'sessions', sessionId),
      {
        pre_survey_response_time_ms: responseTimeMs,
        updated_at:                  serverTimestamp(),
      },
      { merge: true }
    );
  };

  // const logPreSurvey = async (data) => {
  //   const snap = await getDoc(doc(db, 'sessions', sessionId));
  //   const openedAt = snap.exists() ? snap.data().pre_survey_opened_at : null;
  //   const submittedAt = new Date();
  //   const responseTimeMs = openedAt
  //     ? submittedAt.getTime() - openedAt.toDate().getTime()
  //     : null;

  //   await setDoc(
  //     doc(db, 'sessions', sessionId),
  //     {
  //       user_id: userId,
  //       session_id: sessionId,
  //       pre_survey: data,
  //       pre_survey_opened_at:    openedAt,
  //       pre_survey_submitted_at: serverTimestamp(),
  //       pre_survey_response_time_ms: responseTimeMs, 
  //       updated_at: serverTimestamp(),
  //     },
  //     { merge: true }
  //   );
  // };

  const logPostSurvey = async (data) => {
    
    await setDoc(
      doc(db, 'sessions', sessionId),
      {
        user_id:                  userId,
        session_id:               sessionId,
        post_survey:              data,
        post_survey_submitted_at: serverTimestamp(),
        updated_at:               serverTimestamp(),
      },
      { merge: true }
    );

    
    const snap = await getDoc(doc(db, 'sessions', sessionId));
    const openedAt    = snap.data().post_survey_opened_at?.toDate() ?? null;
    const submittedAt = snap.data().post_survey_submitted_at?.toDate() ?? null;
    const responseTimeMs = openedAt && submittedAt
      ? submittedAt.getTime() - openedAt.getTime()
      : null;

    
    await setDoc(
      doc(db, 'sessions', sessionId),
      {
        post_survey_response_time_ms: responseTimeMs,
        updated_at:                   serverTimestamp(),
      },
      { merge: true }
    );
  };

  // const logPostSurvey = async (data) => {
  //   const snap = await getDoc(doc(db, 'sessions', sessionId));
  //   const openedAt = snap.exists() ? snap.data().post_survey_opened_at : null;
  //   const submittedAt = new Date();
  //   const responseTimeMs = openedAt
  //     ? submittedAt.getTime() - openedAt.toDate().getTime()
  //     : null;

  //   await setDoc(
  //     doc(db, 'sessions', sessionId),
  //     {
  //       user_id: userId,
  //       session_id: sessionId,
  //       post_survey: data,
  //       post_survey_opened_at:    openedAt,
  //       post_survey_submitted_at: serverTimestamp(),
  //       post_survey_response_time_ms: responseTimeMs,
  //       updated_at: serverTimestamp(),
  //     },
  //     { merge: true }
  //   );
  // };

  // logPreSurveyOpen / logPostSurveyOpen は呼び出し元でawait/catchされていない
  // （onMounted内やタイマーコールバック内から素で呼ばれる）ため、
  // ここで失敗を吸収する。多少の記録漏れがあっても後続の処理は問題なく進む。
  const logPreSurveyOpen = async () => {
    try {
      await setDoc(
        doc(db, 'sessions', sessionId),
        {
          pre_survey_opened_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('[useLogger] pre_survey_opened_at の記録に失敗しました:', error);
    }
  };

  const logPostSurveyOpen = async () => {
    try {
      await setDoc(
        doc(db, 'sessions', sessionId),
        {
          post_survey_opened_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('[useLogger] post_survey_opened_at の記録に失敗しました:', error);
    }
  };

  // =====================================================
  // ■ 1. ユーザ情報ログ（制作フェーズ開始時に1回）
  // =====================================================
  /**
   * 制作フェーズ開始時に呼ぶ。
   * @param {Object} vasDataSnapshot - 試聴フェーズで取得したVAS値 { A: {...}, B: {...}, ... }
   */
  const logSessionStart = async (vasDataSnapshot) => {
    console.log('logSessionStart 呼ばれた', sessionId);
    phaseStartedAt.value = Date.now();
    lastActionAt.value   = Date.now();

    const userAgent = navigator.userAgent;
    const isMobile  = /Mobi|Android/i.test(userAgent);
    const enabled = Boolean(resolveValue(vasEnabled));

    const data = {
      user_id:        userId,
      session_id:     sessionId,
      vas_enabled:    enabled,
      vas_data:       enabled ? vasDataSnapshot : null,
      device_type:    isMobile ? 'mobile' : 'desktop',
      browser:        userAgent,
      phase_start_at: new Date(phaseStartedAt.value).toISOString(),
      created_at:     serverTimestamp(),
      updated_at:     serverTimestamp(),
    };

    // 呼び出し元でawaitされていないため、失敗してもローカルの時刻(phaseStartedAt等)は
    // 既に上で設定済み。ここでの失敗はFirestore側の記録漏れに留まる。
    try {
      await setDoc(doc(db, 'sessions', sessionId), data, { merge: true });
    } catch (error) {
      console.error('[useLogger] セッション開始情報の記録に失敗しました:', error);
    }
  };

  // =====================================================
  // ■ 2. 操作イベントログ
  // =====================================================

  /**
   * 操作イベントを1件Firestoreに書き込む汎用関数。
   * この関数の呼び出し元は基本的にawait/catchをしない前提（UIをブロックしないため）なので、
   * 失敗はここで握りつぶし、コンソールにログを残すだけに留める。
   */
  const pushEvent = async (type, detail = {}) => {
    touchAction();

    const entry = {
      user_id:      userId,
      session_id:   sessionId,
      type,
      vas_enabled:  Boolean(resolveValue(vasEnabled)),
      elapsed_ms:   elapsedMs(),
      timestamp:    serverTimestamp(),
      ...detail,
    };

    try {
      await addDoc(
        collection(db, 'sessions', sessionId, 'events'),
        entry
      );
    } catch (error) {
      console.error(`[useLogger] イベントログの送信に失敗しました (type: ${type}):`, error);
    }
  };

  // --- 個別イベント関数 ---

  /** ブロック追加（パレットからドラッグ） */
  const logBlockAdd = (blockId, soundId) =>
    pushEvent('block_add', { block_ids: [blockId], sound_ids: [soundId] });

  /** ブロック移動（単体 or グループ） */
  const logBlockMove = (blockIds, toIndex) =>
    pushEvent('block_move', {
      block_ids: blockIds,
      to_index:  toIndex,
      is_group:  blockIds.length > 1,
    });

  /** ブロック削除（単体 or 範囲選択削除） */
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
      block_ids:     originalIds,
      new_block_ids: newIds,
    });

  /** サウンドプレビュー（パレット or ブロッククリック） */
  const logSoundPreview = (soundId, source) =>
    pushEvent('sound_preview', { sound_ids: [soundId], source });

  /** 再生（全体 or 選択範囲） */
  const logPlay = (scope, soundSequence) =>
    pushEvent('play', { scope, sound_sequence: soundSequence });

  /** 停止 */
  const logStop = () => pushEvent('stop');

  /** Undo / Redo */
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
  // =====================================================

  /** 操作カウンタ（セッション通算） */
  const totalOperations = ref(0);
  const incrementOps = () => { totalOperations.value++; };

  // =====================================================
  // ■ リロード復元用
  // =====================================================
  /**
   * リロード後に制作フェーズを再開する際、内部で管理している時刻情報を
   * 「元のセッションで実際に発生した時刻」に合わせ直す。
   * これを呼ばずにlogSessionStart等を再度呼んでしまうと、
   * phase_start_atやelapsed_msの起点がリロード時点にずれてしまうため、
   * 復元時はこちらを使い、Firestoreへは書き込まない（既に記録済みのため）。
   * @param {Object} timers
   * @param {number} [timers.phaseStartedAt] - 元セッションの制作フェーズ開始時刻(ms)
   * @param {number} [timers.tutorialEndedAt] - 元セッションのチュートリアル終了時刻(ms)
   */
  const restoreTimers = ({ phaseStartedAt: restoredPhaseStart, tutorialEndedAt: restoredTutorialEnd } = {}) => {
    if (restoredPhaseStart != null) phaseStartedAt.value = restoredPhaseStart;
    if (restoredTutorialEnd != null) tutorialEndedAt.value = restoredTutorialEnd;
    lastActionAt.value = Date.now();
  };

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
      user_id:            userId,
      session_id:         sessionId,
      is_final:           isFinal,
      vas_enabled:        Boolean(resolveValue(vasEnabled)),
      elapsed_ms:         elapsedMs(),
      since_tutorial_ms:  sinceTutorial,
      idle_ms:            idleMs(),
      total_operations:   totalOperations.value,
      play_frequency:     isFinal ? playFrequency : null,
      timestamp:          serverTimestamp(),
      ...seq,
    };

    // openSurvey内から呼ばれる際もawaitはされているが外側にtry/catchが無いため、
    // ここで失敗を吸収し、アンケート画面への遷移自体は止めない。
    try {
      await addDoc(
        collection(db, 'sessions', sessionId, 'snapshots'),
        data
      );
    } catch (error) {
      console.error(`[useLogger] シーケンススナップショットの送信に失敗しました (isFinal: ${isFinal}):`, error);
    }
  };

  // =====================================================
  // ■ 5. 完成音源（録音）のアップロード記録
  // =====================================================
  /**
   * Firebase Storageへのアップロードが完了した後に呼ぶ。
   * ダウンロードURLとストレージ上のパスをセッションドキュメントに記録する。
   * @param {string} downloadUrl  Firebase StorageのダウンロードURL
   * @param {string} storagePath Storage上の保存パス（例: recordings/xxx.wav）
   */
  const logRecordingUploaded = async (downloadUrl, storagePath) => {
    await setDoc(
      doc(db, 'sessions', sessionId),
      {
        user_id:                 userId,
        session_id:              sessionId,
        recording_url:           downloadUrl,
        recording_storage_path:  storagePath,
        recording_uploaded_at:   serverTimestamp(),
        updated_at:              serverTimestamp(),
      },
      { merge: true }
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
    // リロード復元
    tutorialEndedAt,
    restoreTimers,
    // 実験条件・アンケート
    assignConditionByStratum,
    logPreSurvey,
    logPostSurvey,
    logPreSurveyOpen,
    logPostSurveyOpen, 
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
    // 録音アップロード
    logRecordingUploaded,
  };
}
