import type { MapId } from './maps';

export type Who = 'popo' | 'moa' | 'mar' | 'me' | 'nuri' | 'sign' | 'narr';
export interface Line { who: Who; text: string }
export interface Step { id: string; title: string; hint: string; need?: number; map: MapId; target: string }

// 첫날의 이야기 순서 = 튜토리얼
export const STEPS: Step[] = [
  { id: 'talkPopo', title: '뽀뽀에게 말 걸기', hint: '둥실 떠 있는 빨판상어 뽀뽀를 눌러 보세요', map: 'whale', target: 'popo' },
  { id: 'plant', title: '별딸기 씨앗 심기', hint: '울타리 위 밭을 눌러 씨앗을 심어요', need: 3, map: 'whale', target: 'soil' },
  { id: 'water', title: '씨앗에 물 주기', hint: '씨앗을 심은 칸을 한 번 더 눌러요', need: 3, map: 'whale', target: 'soil' },
  { id: 'care', title: '누리 돌봐 주기', hint: '오른쪽 누리 머리 쪽으로 가서 누리를 눌러요', map: 'whale', target: 'nuri' },
  { id: 'harvest', title: '별딸기 거두기', hint: '다 익은 별딸기를 눌러요', need: 3, map: 'whale', target: 'soil' },
  { id: 'feed', title: '누리에게 별딸기 주기', hint: '누리 머리 쪽에서 누리를 눌러요', map: 'whale', target: 'nuri' },
  { id: 'goHarbor', title: '등불항으로 건너가기', hint: '누리 옆구리에 놓인 배다리를 건너요', map: 'whale', target: 'gangway' },
  { id: 'meetMoa', title: '등대지기 모아 할머니 만나기', hint: '오른쪽 위, 등대 앞에 계세요', map: 'harbor', target: 'moa' },
  { id: 'wood', title: '하늘유목 줍기', hint: '아래쪽 작은 숲섬의 모래밭을 살펴봐요', need: 3, map: 'harbor', target: 'wood' },
  { id: 'bringWood', title: '모아 할머니에게 하늘유목 가져가기', hint: '등대 앞으로 가요', map: 'harbor', target: 'moa' },
  { id: 'placeBench', title: '누리 등에 벤치 놓기', hint: '누리 등으로 돌아가 아래 가방 줄의 벤치를 누르세요', map: 'whale', target: 'garden' },
  { id: 'free', title: '누리와 함께 쉬어 가기', hint: '밭을 가꾸고, 누리를 돌보고, 등불항을 둘러봐요', map: 'whale', target: '' },
];
export const stepIndex = (id: string): number => STEPS.findIndex((s) => s.id === id);

const p = (text: string): Line => ({ who: 'popo', text });
const m = (text: string): Line => ({ who: 'moa', text });

export const TALK: Record<string, Line[]> = {
  popoIntro: [
    p('정신이 들어? 여긴 구름바다 한가운데, 아기 고래 누리의 등 위야.'),
    p('나는 뽀뽀. 누리 볼에 붙어 사는 빨판상어지. 누리의 제일 오랜 친구이기도 하고.'),
    p('누리가 네 콧노래를 듣고 널 데려왔어. 30년 동안 고래 노래에 대답한 사람이 없었거든.'),
    p('여기서 지내려면 먹을 것부터 있어야겠지. 주머니에 별딸기 씨앗이 들어 있을 거야.'),
    p('울타리 위에 밭이 보이지? 칸을 눌러서 씨앗 세 개를 심어 봐.'),
  ],
  afterPlant: [p('잘했어. 이제 물을 줘야 해. 씨앗을 심은 칸을 한 번씩 더 눌러 봐.')],
  afterWater: [
    p('누리 등의 이끼흙은 금방 자라. 기다리는 동안 부탁 하나만 할게.'),
    p('누리 몸에 따개비가 붙어서 간지러운가 봐. 오른쪽 머리 쪽으로 가서 누리를 눌러 줄래?'),
  ],
  afterCare: [
    p('봐, 눈이 반달이 됐어. 고맙다는 말은 못 해도 다 티가 난다니까.'),
    p('별딸기도 거의 익었을 거야. 밭으로 가 보자.'),
  ],
  afterHarvest: [p('처음 거둔 것치고 꽤 탐스러운데? 누리에게 하나 줘 볼래? 머리 쪽에서 누리를 누르면 돼.')],
  afterFeed: [
    p('누리가 널 데려가고 싶은 곳이 있대. 등불항, 하늘에 남은 마지막 항구야.'),
    { who: 'narr', text: '누리가 천천히 방향을 틀어 구름 사이로 헤엄친다. 멀리 등대 불빛이 깜박인다.' },
    p('도착! 누리 옆구리에 배다리를 걸쳐 뒀어. 건너가서 등대지기 모아 할머니를 찾아봐.'),
  ],
  moaStory: [
    m('…고래가 깨어 있다니. 30년 동안 매일 밤 등대를 켜 둔 보람이 있구나.'),
    m('옛날엔 고래가 노래하면 사람들이 답가를 불렀단다. 부르고 답하며 구름의 올을 엮었지.'),
    m('그런데 사람들이 점점 하늘을 올려다보지 않게 됐어. 대답을 듣지 못한 고래들은 하나둘 잠들었고.'),
    m('그 긴 침묵을 대고요라고 부른단다. 노래가 멎자 땅들은 구름 아래, 잊힘의 바다로 가라앉았지.'),
    m('누리는 엄마에게 노래를 배우기도 전에 대고요를 맞았을 게야. 그래서 아직 노래를 모르는 거고.'),
    m('잠든 고래들을 깨우려면 누리가 하늘노래를 되찾아야 해. 먼 길이 되겠구나.'),
    m('우선 누리 등에 쉴 자리부터 만들자. 아래쪽 작은 숲섬에서 하늘유목 세 개만 주워 오렴.'),
  ],
  moaWood: [
    m('솜씨 좋은 손을 가졌구나. 잠깐만… 자, 벤치다.'),
    m('누리 등에 두고 쉬어 가렴. 긴 항해일수록 쉬는 자리가 필요한 법이란다.'),
  ],
  moaIdle: [m('등대 불은 오늘 밤에도 켤 게다. 이제는 기다리는 사람이 생겼으니까.')],
  marIdle: [{ who: 'mar', text: '어서 와요, 고래지기 손님. 가게는 아직 준비 중이에요. 다음 항해 때 꼭 들러 줘요.' }],
  signFarm: [{ who: 'sign', text: '누리 텃밭 — 씨앗을 심고 물을 주면 하루 만에 자라요.' }],
  signHarbor: [{ who: 'sign', text: '등불항 — 하늘에 남은 마지막 항구. 등대는 매일 밤 켜집니다.' }],
  hut: [{ who: 'popo', text: '누리 등 위의 작은 오두막이야. 문은 다음 항해 때 열 수 있을 거야.' }],
  house: [{ who: 'narr', text: '창가에 작은 화분이 놓여 있다. 안에서 찻잔 부딪히는 소리가 난다.' }],
  popoIdle: [p('누리는 칭찬해 주면 분수를 뿜어. 한 번 해 봐.')],
  woodAll: [p('하늘유목 세 개, 다 모았어! 모아 할머니에게 가져가자.')],
  benchPlaced: [
    { who: 'narr', text: '벤치에 앉자 누리가 낮게, 아주 작게 흥얼거린다.' },
    p('…방금 들었어? 누리가 노래를 흥얼거렸어. 태어나서 처음으로!'),
    p('하늘노래의 첫 조각이야. 이런 조각을 모으면 누리도 노래를 부를 수 있게 될 거야.'),
  ],
};
