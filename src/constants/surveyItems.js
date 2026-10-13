// アンケートの設問定義・選択肢。
// 設問を変更するときはこのファイルだけを編集すればよい。

// ---------------------------------------------------------
// 事前アンケート
// ---------------------------------------------------------
export const musicExperienceOptions = [
  { value: 'pops&rock', label: 'POPS・ロック・歌もの等' },
  { value: 'classic',   label: 'クラシック・現代音楽等' },
  { value: 'dtm',       label: 'DTM(DAWを用いた制作)' },
  { value: 'eam',       label: '電子音響音楽等' },
  { value: 'ambients',  label: '録音した音・環境音などを素材とした作品制作' },
  { value: 'other',     label: 'その他' },
];

export const musicExperienceCategory = [
  { value: 'individual', label: '個人' },
  { value: 'lesson',     label: '授業・講義' },
  { value: 'course',     label: '講座' },
  { value: 'workshop',   label: 'ワークショップ' },
  { value: 'other',      label: 'その他' },
];

export const musicExperienceTimes = [
  { value: 'once',       label: '1回' },
  { value: 'multiple',   label: '複数回' },
  { value: 'continuous', label: '継続的' },
];

export const TERMS_URL = 'https://sites.google.com/view/composition-music-res-lab-2026';

export const createDefaultPreSurvey = () => ({
  musicExperience: '',          // 'yes' | 'no'
  musicExperienceTypes: [],     // Q1-a 複数選択
  musicExperienceOther: '',     // 「その他」の自由記述
  musicExperienceDetails: {},   // { [genre]: { category, times } }
  agreeTerms: '',
});

// ---------------------------------------------------------
// 事後アンケート
// ---------------------------------------------------------
export const musicGenreOptions = [
  { value: 'pops', label: 'ポップス'  },
  { value: 'rock', label: 'ロック'  },
  { value: 'jazz', label: 'ジャズ'  },
  { value: 'classic', label: 'クラシック' },
  { value: 'hiphop', label: 'ヒップホップ／ラップ' },
  { value: 'edm', label: 'EDM／ダンスミュージック' },
  { value: 'vocaloid', label: 'ボーカロイド／ボカロ音楽'  },
  { value: 'eam', label: '電子音響音楽'  },
  { value: 'experimental', label: '実験音楽／現代音楽'  },
  { value: 'cinema', label: '映画・ゲームなどの音楽'  },
  { value: 'ethnic', label: '民族音楽／伝統音楽'  },
  { value: 'other', label: 'その他'  },
];

export const postSurveyItemsBase = [
  { key: 'noRightAnswer',          label: '正解を気にせずに制作できた' },
  { key: 'ownWork',                label: '自分でどう作るかを決めながら制作できた' },
  { key: 'feltConstrained',        label: 'やり方が決まっているように感じた' },
  { key: 'choseToLookGood',        label: 'うまく作るために、良い作品に見えるようなやり方を選んだ' },
  { key: 'expressMyself',          label: '自分らしい表現を入れられた' },
  { key: 'triedVariations',        label: '並び方を変えて、違いを確かめた' },
  { key: 'fixedAfterListening',    label: '一度聴いてみて、気になるところを直した' },
  { key: 'differentFromPrevious',  label: 'いくつかの異なる並べ方を試した' },
  { key: 'revisedUntilEnd',        label: '最後まで並べ方を見直しながら進めた' },
  { key: 'operationalStress',      label: '音を並べたり操作したりすることに負担を感じた'  },
  { key: 'workIngenuity',          label: '今回の作品についてどのような工夫をしましたか？', type: 'freeform', optional: true },
  { key: 'soundsAsImages',         label: '音を、イメージや意味をもつものとして捉えるようになった' },
  { key: 'shortSoundsHaveMeaning', label: '短い音でも、作品の中で意味や役割をもつものとして捉えられるようになったと感じた' },
  { key: 'foundPatterns',          label: '作っていく中で、音の並びに自分なりのまとまりや規則性を見出した' },
  { key: 'feltLikeMusic',          label: '今回の作品を、音楽として捉えられると感じた' },
  { key: 'otherSoundsAsMusic',     label: '今回の体験を通して、さまざまな音の組み合わせも音楽として捉えられるかもしれないと感じた' },
  { key: 'doppExperience',         label: '過去に「造形デザイン演習」または「電子音響ピープルプロジェクト」などで"比喩"を用いた作品制作の指導を受けたことがありますか？', type: 'yesno' },
  { key: 'loveMusicGenres',        label: 'あなたが普段聴いたり、演奏する音楽のジャンルを教えてください。', type: 'multiple', options: musicGenreOptions, hasOther: true, },
];

// VASありの条件のみ
export const postSurveyItemsVas = [
  { key: 'usedMetaphors',   label: '提示された言葉（比喩）を手がかりにして制作した' },
  { key: 'metaphorsHelped', label: '提示された言葉がアイデアを考える助けになった' },
];

// 最後に必ず置く自由記述
export const postSurveyItemFreeForm = {
  key: 'freeFormDescription',
  label: 'その他、ご要望や気づいた点などご自由にご記入ください',
  type: 'freeform',
  optional: true,
};

/** 条件に応じた事後アンケートの設問リストを返す（順序: 共通 → VAS専用 → 自由記述）。 */
export const buildPostSurveyItems = (vasEnabled) => [
  ...postSurveyItemsBase,
  ...(vasEnabled ? postSurveyItemsVas : []),
  postSurveyItemFreeForm,
];

/** 事後アンケートの回答オブジェクトの初期値。 */
export const createDefaultPostSurvey = () => ({
  noRightAnswer: null,
  ownWork: null,
  selfMotivated: null,
  feltConstrained: null,
  choseToLookGood: null,
  triedVariations: null,
  fixedAfterListening: null,
  differentFromPrevious: null,
  revisedUntilEnd: null,
  soundsAsImages: null,
  shortSoundsHaveMeaning: null,
  foundPatterns: null,
  feltLikeMusic: null,
  otherSoundsAsMusic: null,
  doppExperience: null,
  workIngenuity: '',
  usedMetaphors: null,
  metaphorsHelped: null,
  freeFormDescription: '',
  loveMusicGenres: [],
  loveMusicGenresOther: ''
});
