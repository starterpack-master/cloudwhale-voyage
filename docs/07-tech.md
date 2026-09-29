# 07. 기술 설계

## 스택
| 영역 | 선택 | 이유 |
|---|---|---|
| 언어·빌드 | TypeScript + Vite | 빠른 개발, PWA 플러그인 |
| 렌더링 | three.js (WebGL2) | 셰이더·후처리 자유도 |
| UI | HTML/CSS 오버레이 (+ Preact 또는 Svelte) | 선명한 글자, 빠른 UI 작업 |
| 대화·퀘스트 | ink (inkjs) | 분기 대화를 글로 작성 |
| 오디오 | Web Audio API (+ Howler.js 또는 Tone.js) | 음악 층 섞기, ASMR 좌우 위치감 |
| 저장 | IndexedDB (Dexie 등) | 오프라인 저장 |
| PWA | vite-plugin-pwa | 오프라인 캐시, 설치, 업데이트 |
| 실시간 | Trystero (WebRTC P2P) | 서버 없이 유저끼리 직접 연결 |
| 백엔드 | Supabase | 내 서버 없이 계정·친구·우편·저장 |
| 배포 | 무료 정적 호스팅 (Cloudflare Pages, GitHub Pages 등) | HTTPS 기본 제공 |

## 렌더링 파이프라인
1. 씬을 **저해상도 렌더 타깃**에 그린다 (화면의 긴 변 기준 내부 해상도 약 480~640px, 가로·세로 공통).
2. 후처리: 외곽선 → 색보정(LUT) → 저해상도 블룸 → 디더 안개.
3. **최근접 필터 + 정수 배율**로 화면에 확대한다.
4. **카메라 스냅:** 카메라를 텍셀 격자에 맞춰 도트가 지글거리지 않게 하고, 남는 소수점만큼은 최종 확대 단계에서 화면을 밀어 부드럽게 스크롤한다.
5. UI와 글자는 DOM으로 원래 해상도에서 그린다.

- 저해상도로 그리면 픽셀 연산이 크게 줄어서 **모바일 성능에도 유리**하다.
- **화면 방향 전환:** `resize`·`orientationchange` 때 렌더 타깃 크기를 다시 잡고, 카메라를 돌려 누리의 몸이 화면의 긴 변을 따라 놓이게 한다 (기본 가로, [06-art-sound.md](06-art-sound.md#카메라)).

### 씬 구성
| 레이어 | 내용 |
|---|---|
| 하늘 | 그라데이션 돔, 별, 해·달, 오로라 |
| 원경 | 먼 구름·섬 빌보드 (시차) |
| 구름바다 | 노이즈로 일렁이는 평면 셰이더 |
| 안개 | 높이 안개 + 흐르는 노이즈 평면 (디더) |
| 누리 | 로우폴리 메시 + 툰 셰이더, 절차적 헤엄 |
| 누리 등 | 격자 블록(인스턴싱), 구조물, 가구, 작물 |
| 캐릭터 | 빌보드 스프라이트 (옷 레이어 합성) |
| 입자 | 인스턴싱 파티클 |

### 누리 좌표계 (핵심)
- 등 위의 모든 것은 **누리의 로컬 좌표**에 산다. 카메라도 누리를 따라가므로 플레이어에겐 등 위가 늘 안정된 땅이고, 주변 구름·섬이 흘러간다.
- 헤엄 애니메이션은 버텍스 셰이더에서 척추를 따라 사인파로 처리한다. **등 위 건축 구역은 흔들림 0**, 꼬리·지느러미만 크게 움직인다.
- 등 격자는 성장할 때 가장자리로만 넓어진다. 원점을 등 중앙에 고정해서 기존 건물 좌표가 바뀌지 않게 한다.

### ASMR 케어 화면
- 케어는 별도 클로즈업 씬 (누리 얼굴·몸 일부 + 케어 도구).
- 터치 궤적 → 문지른 영역 마스크(따개비·거품·이끼 상태) → 진행도·소리·진동.
- 소리는 문지르는 속도에 따라 볼륨·재생 속도를 바꾸고, 화면 좌우 위치를 스테레오 위치로 옮긴다 (Web Audio의 StereoPannerNode).

### 모바일 성능 목표 (초안)
| 항목 | 목표 |
|---|---|
| 프레임 | 중급 기기 60fps, 저사양 30fps |
| 드로우콜 | 150 이하 |
| 삼각형 | 화면당 10만 이하 |
| 첫 로딩 | 3MB 이하 (해역 에셋은 필요할 때) |
| 품질 설정 | 낮음 / 중간 / 높음, 첫 실행 때 자동 판단 |

## 게임 구조
- 게임 로직은 고정 간격(초당 20회)으로 돌리고, 렌더는 화면 주사율에 맞춰 보간한다.
- 가벼운 ECS 형태로 시스템을 나눈다 (농사, 동물, 낚시, 건축, 케어, 방치, 퀘스트, 오디오).
- **데이터 주도:** 아이템·작물·물고기·레시피·NPC·이벤트는 데이터 파일로 정의한다. 콘텐츠 추가 = 데이터 추가.
- 문자열은 처음부터 다국어 키로 관리한다.

### 폴더 구조 (안)
```
cloudwhale-voyage/
  docs/        # 기획 문서
  public/      # 아이콘, 매니페스트
  src/
    core/      # 루프, 하늘 시계, 시드 난수, 저장
    render/    # 픽셀 파이프라인, shaders/, 스프라이트
    world/     # whale/, sky/, cloudsea/, islands/, grid/
    systems/   # farming, fishing, drift, building, care, idle, quest, song, audio
    net/       # NetAdapter, p2p, backend
    ui/        # HUD, 인벤토리, 건축 모드, 대화창, 사진 모드
    data/      # items, crops, fish, recipes, npcs, events, i18n
    story/     # ink 스크립트
  assets/      # 원본 에셋
```

## 시간과 방치 계산
### 하늘 시계
서버 없이 기기 시각(UTC)으로 모두가 같은 하늘을 본다.

```ts
const SKY_EPOCH = Date.UTC(2026, 0, 1);
const SKY_DAY_MS = 2 * 60 * 60 * 1000; // 1 하늘일 = 2시간

export function skyClock(now = Date.now()) {
  const t = now - SKY_EPOCH;
  return {
    day: Math.floor(t / SKY_DAY_MS),      // 몇 번째 하늘일
    phase: (t % SKY_DAY_MS) / SKY_DAY_MS, // 0~1: 낮 → 노을 → 밤 → 새벽
  };
}
```

### 모두가 같이 보는 이벤트
플랑크톤 밤, 보름달, 떠돌이 섬은 **하늘일 + 해역 + 채널을 시드로 쓴 난수**로 정한다. 입력이 같으면 누구 기기에서든 결과가 같다.

```ts
const isPlanktonNight = (region: string, day: number) =>
  seededRandom(`plankton:${region}:${day}`) < 0.15; // 하늘일의 약 15%
const isFullMoon = (day: number) => day % 8 === 0;  // 8 하늘일마다
```

### 방치 계산
시뮬레이션을 돌리지 않고 **시각 차이로 계산**한다.

```ts
function applyOffline(save: SaveData, now: number) {
  const elapsed = Math.min(Math.max(0, now - save.lastSeenAt), save.offlineCapMs); // 기본 12시간
  // 작물: plantedAt + growMs <= now 이면 다 자람 (따로 계산할 것 없음)
  // 생산: 수염 필터·울림·동물 = 시간당 생산량 × elapsed (보관 한도까지)
  // 항해: 속도 × elapsed 만큼 진행, 도착하면 목적지 채집으로 전환
  // 항해 일지: 1시간 단위로 (유저ID, 시간) 시드 추첨 → 뽀뽀의 일지 문장
  save.lastSeenAt = now;
}
```

- 기기 시계를 조작해도 경쟁 요소가 없어 남에게 피해가 적으므로 가볍게 대응한다. 시간이 거꾸로 가면 무시하고, 백엔드를 붙인 뒤에는 서버 시각으로 보정한다.

## 저장
- IndexedDB에 자동 저장 (행동 직후 + 앱이 백그라운드로 갈 때).
- 저장 데이터에 **버전 번호**를 두고, 업데이트 때 순서대로 변환한다.
- 지원 브라우저에서는 영구 저장을 요청하고(`navigator.storage.persist()`), 백업 코드 내보내기를 제공한다.
- 2단계부터 클라우드 저장 (기기 변경·브라우저 데이터 삭제 대비).

```ts
interface SaveData {
  version: number;
  lastSeenAt: number;
  offlineCapMs: number;
  player: { name: string; look: Record<string, string>; outfit: string[] };
  whale: { stage: number; bond: number; mood: string; fullness: number; verses: number[]; greetingSong: string }; // 인사 노래 프리셋 ID
  grid: { w: number; h: number; blocks: Uint16Array; heights: Uint8Array; objects: PlacedObject[] };
  crops: { x: number; y: number; cropId: string; plantedAt: number; growMs: number }[];
  inventory: { id: string; qty: number }[];
  voyage: { to: string; departedAt: number; speed: number } | null;
  quests: Record<string, string>;
  friendship: Record<string, number>;
}
```

## PWA
- `vite-plugin-pwa`로 서비스 워커와 매니페스트를 만든다.
- 매니페스트: `orientation: "any"` (가로·세로 모두, 기본 연출은 가로), `display: "standalone"`, 테마색 크림, 누리 아이콘.
- 캐시: 앱 기본 파일은 미리 받아 두고, 해역 에셋은 처음 쓸 때 저장한다. 새 버전이 나오면 "새 노래가 도착했어요" 알림으로 새로고침을 안내한다.
- 설치 안내: 프롤로그가 끝나면 "누리를 홈 화면에 데려가기" (iOS는 공유 → 홈 화면에 추가 안내 그림).
- iOS 주의: 백그라운드 실행이 없다 → 방치는 돌아왔을 때 계산한다. 웹 푸시는 홈 화면에 설치한 경우에만 된다.
- 푸시는 보내는 서버가 필요하다 → 2단계(백엔드 함수)부터.
- 모바일 브라우저는 첫 터치 전엔 소리가 안 난다 → 타이틀 화면의 "시작" 터치에서 오디오를 켠다.

## 네트워크
### 구조
| 층 | 도구 | 담당 | 비용 |
|---|---|---|---|
| 실시간 | Trystero (P2P) | 해역 채널, 선단, 방문, 협동 이벤트 | 0원 |
| 비동기 | Supabase | 계정, 친구, 우편, 유리병, 방명록, 갤러리, 월드 게이지, 클라우드 저장 | 무료 플랜으로 시작 |
| 계산 | 하늘 시계 + 시드 | 자연 현상, 떠돌이 섬 | 0원 |

- [Trystero](https://github.com/dmotz/trystero)는 Nostr·MQTT·BitTorrent 같은 공개 인프라로 서로를 찾은 뒤 브라우저끼리 직접 연결한다. 신호 서버를 직접 운영할 필요가 없고, 오가는 데이터는 종단 간 암호화된다.
- 실시간까지 Supabase로 하지 않는 이유: [Realtime 한도](https://supabase.com/docs/guides/realtime/quotas)가 무료 플랜 기준 프로젝트 전체 동시 접속 200, 초당 메시지 100이라 위치 동기화에는 모자라다. (Pro는 동시 500·초당 500, 지출 상한을 풀면 동시 10,000까지 — 나중에 확장할 때의 선택지)

### 방
- 이름 규칙: `cw:{해역}:{채널}`, `cw:pod:{선단ID}` (초대 코드를 비밀번호로), `cw:visit:{주인ID}`.
- 채널 배정: 1번 채널부터 들어가 인원을 확인하고, 8명이 넘으면 다음 채널로. 친구가 있는 채널이 우선.
- 모두가 모두와 연결되는 구조라 인원이 늘면 연결 수가 급격히 늘어난다 → 방 인원 상한을 둔다 (실기기 테스트로 확정).

### 누가 정하나
| 대상 | 결정권 |
|---|---|
| 내 누리, 내 등 위, 내 인벤토리 | 내 기기 |
| 떠돌이 섬, 자연 현상 | 모두가 같은 시드로 같은 계산 |
| 채집물 | 유저마다 따로 |
| 협동 이벤트 진행 | 방 호스트 (먼저 들어온 사람, 나가면 다음 사람) |
| 방문 중 등 위 변경 | 주인 기기가 확정 |

### 메시지
| 종류 | 빈도 | 내용 |
|---|---|---|
| hello | 입장할 때 | 닉네임, 외형, 누리 단계·꾸미기, 인사 노래 프리셋 ID |
| move | 입력할 때만 | 목적지 + 출발 시각 (탭 이동이라 경로는 각자 계산) |
| pose | 초당 2~5회 | 위치 보정, 애니메이션 상태 |
| whale | 초당 1~2회 | 누리 위치·방향·행동 |
| action | 이벤트 때 | 이모트, 도구, 이펙트 |
| chat | 입력할 때 | 정해진 문장 ID 또는 (친구끼리) 필터된 글 |
| event | 호스트 → 전원 | 협동 이벤트 상태·박자·결과 |
| snapshot | 방문 시작 때 | 등 위 격자 압축 데이터 (나눠서 전송) |

- 다른 유저 캐릭터는 100~200ms 늦게 보간해서 부드럽게 보이게 한다.

### 나중에 갈아 끼울 수 있게
```ts
interface NetRoom {
  readonly selfId: string;
  peers(): string[];
  send<T>(type: string, data: T, to?: string): void;
  on<T>(type: string, handler: (data: T, from: string) => void): void;
  onJoin(handler: (peerId: string) => void): void;
  onLeave(handler: (peerId: string) => void): void;
  leave(): void;
}
interface NetAdapter {
  join(roomId: string, opts?: { password?: string }): Promise<NetRoom>;
}
// 1단계: TrysteroAdapter → 나중에: 전용 서버 Adapter
```

### P2P의 한계와 대응
| 한계 | 대응 |
|---|---|
| 일부 모바일 네트워크에서 직접 연결 실패 | TURN 중계 서버 추가 (무료 한도가 있는 서비스로 시작) |
| 연결된 상대에게 IP가 보일 수 있음 | 선단·방문은 친구끼리만. 공개 채널은 중계 연결이나 서버 방식으로 전환 검토 |
| 방 인원 제한 | 채널 나누기 + 비동기 기능으로 "많은 사람" 느낌 |
| 부정행위를 막기 어려움 | 거래·경쟁이 없어 피해가 적음 |
| 공개 신호망 불안정 | 신호 방식 교체 가능, 실패하면 재시도 |

### 확장 단계
| 단계 | 구성 | 규모 |
|---|---|---|
| 1. 프로토타입 | P2P + 기기 저장 | 친구·테스터 |
| 2. 공개 베타 | P2P + Supabase | 수백~수천 명 |
| 3. 정식 | 공개 채널은 전용 실시간 서버 (예: Colyseus), 선단·방문은 P2P 유지 | 동시 수천 명 이상 |

## 백엔드 (Supabase, 2단계)
| 테이블 | 내용 |
|---|---|
| profiles | 닉네임, 외형 요약, 누리 요약 |
| friends | 친구, 차단 |
| letters | 포롱 우편 (도착 시각, 내용, 선물) |
| bottles | 유리병 편지 (문장 ID, 스티커) |
| guestbook | 방명록 |
| blueprints | 설계도 (압축 격자, 썸네일) |
| snapshots | 친구가 없을 때 방문용 모습 |
| world_goals | 월드 게이지 |
| reports | 신고 |

- 모든 테이블에 행 단위 보안(RLS): 내 것만 쓰고, 공개된 것만 읽는다.
- 익명 로그인으로 시작하고, 원하면 소셜 계정을 연결한다.
- 게이지 합산·도착 시각·필터처럼 속이면 안 되는 일은 서버 함수(Edge Functions)에서 처리한다.

## 배포
- 정적 파일만 있으면 되므로 무료 정적 호스팅을 쓴다 (PWA·WebRTC 모두 HTTPS가 필요).
- GitHub에 올리면 자동으로 빌드·배포되게 한다.
