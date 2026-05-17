# 대시보드 사이드바 + 제품 구좌 메뉴 설계

- **날짜**: 2026-05-17
- **대상 파일**: `dashboard.html`
- **상태**: 설계 승인됨 (브레인스토밍 완료)

## 1. 배경 / 동기

현재 `dashboard.html` 은 친한스토어 어드민 REST API 와 직접 연동되는 단일 페이지(2,129줄)로, 셀러/공구/상품/커미션 통계를 시각화한다. 다음 두 가지 필요가 생겼다.

1. 인플루언서가 본인에게 매핑된 "공구 가능 제품 구좌" 목록을 조회·필터링하는 메뉴
2. 향후 셀러/매출/고객 등 후속 메뉴를 추가할 수 있는 좌측 사이드바 레이아웃, 그리고 기존 정적 페이지(공구 캘린더·이벤트·스터디)로의 신속한 이동 허브

## 2. 스코프

**In-scope**
- `dashboard.html` 에 좌측 사이드바를 도입하고 해시 라우팅 기반의 view 분리
- "제품 구좌" view 신규 구현 (조회 중심): `GET /api/admin/v2/group-purchases/product-influencers` 연동
- 사이드바 "관리 도구" 그룹: 대시보드(기존) / 제품 구좌(신규) / 셀러·매출·고객(준비 중 placeholder)
- 사이드바 "작업 도구" 그룹: 공구 캘린더, 이벤트 폼/관리, 스터디 5개 페이지로 새 탭 이동
- 기존 토큰·로그인·로그아웃·차트·캐시 로직 그대로 재사용

**Out-of-scope**
- 셀러/매출/고객 메뉴의 실제 데이터 연동 (자리만 잡고 "준비 중" 표시)
- 제품 구좌의 생성/수정/삭제 (조회 전용)
- 모바일 외 디바이스 최적화 (기존 대시보드 반응형 정책 유지)
- 인플루언서/브랜드/셀러/담당자 ID 기반 필터 (응답에 ID 미포함, 별도 매핑 API 필요 — 추후 확장)

## 3. 사이드바 구조

```
┌────────────────────────────────┐
│  파마브로스                     │
│  ────                          │
│  [관리 도구]                    │   ← 내부 view (해시 라우팅)
│  📊 대시보드      #dashboard    │
│  📦 제품 구좌     #products     │
│  🏷️ 셀러         #sellers (WIP)│
│  💰 매출         #sales (WIP)   │
│  👥 고객         #customers(WIP)│
│  ────                          │
│  [작업 도구]                    │   ← 외부 페이지 (target=_blank)
│  🗓️ 공구 캘린더  → index.html  │
│  🎁 이벤트 폼     → event.html  │
│  🎁 이벤트 관리   → event-admin │
│  📚 스터디 신청   → study.html  │
│  📚 스터디 관리   → study-admin │
│  📚 스터디 룰렛   → study-raffle│
│  📚 커리큘럼      → study-curr.│
│  📚 스킬 실습     → study-skil.│
│  ────                          │
│  🪙 토큰 / 🚪 로그아웃          │
└────────────────────────────────┘
```

**그룹 구분 원칙**: 클릭 동작이 다른 두 종류를 시각·기능적으로 분리한다.
- 관리 도구: `location.hash` 변경 → `router()` → view 토글 (같은 탭, 같은 토큰)
- 작업 도구: `<a target="_blank">` → 새 탭에서 별도 HTML 진입 (localStorage 토큰 자동 복원)

활성 표시는 관리 도구에만 적용 (`.sidebar-item.active`).

## 4. 제품 구좌 view — API 연동

### 4.1 엔드포인트

```
GET /api/admin/v2/group-purchases/product-influencers
```

(`functions/api/[[path]].js` 의 CORS 프록시를 통해 호출)

### 4.2 쿼리 파라미터 (Swagger 명세 기반)

| 파라미터 | 타입 | UI 노출 | 기본값 / 비고 |
|---|---|---|---|
| `keyword` | string | ✅ 검색박스 (300ms debounce) | 미지정 시 생략 |
| `availableGroupPurchaseProduct` | boolean (null/true/false) | ✅ 라디오 (전체/가능/불가) | "전체" 일 때 파라미터 생략 |
| `isExpired` | boolean | ✅ 체크박스 ("만료 포함 — 90일 경과") | `false` |
| `sortType` | enum: `CREATED_AT_DESC` / `CREATED_AT_ASC` / `LAST_PLAN_DESC` / `LAST_PLAN_ASC` | ✅ 드롭다운 4개 | `LAST_PLAN_ASC` |
| `page` | int | ✅ 페이지네이터 | `0` |
| `size` | int | ✅ 페이지 크기 선택 (20/50/100) | `20` |
| `influencerIdx` / `adminIdx` / `brandId` / `sellerIdx` | int | ❌ 일단 미사용 | YAGNI |

### 4.3 응답 스키마

```ts
type Response = {
  meta: { totalCount: number };
  data: Array<{
    groupPurchaseProductInfluencerIdx: number;   // 매핑 PK
    groupPurchaseProductIdx: number;             // 제품 PK
    isTemp: boolean;                              // 임시 매핑 여부
    availableGroupPurchaseProduct: boolean;       // 공구 가능 여부
    unavailableReason: string;                    // 불가 사유 (빈 문자열 가능)
    createdAt: string;                            // ISO 8601 매핑 등록일
    imageUrl: string;                             // 제품 썸네일
    productName: string;
    brandName: string;
    pharmacyName: string;                         // 약국명
    previousPlanStartedAt: string | null;         // 직전 공구 시작일
    nextPlanStartedAt: string | null;             // 다음 공구 시작일
    adminName: string;                            // 담당 관리자
    sellerName: string;                           // 셀러(파트너)
    influencerName: string;                       // 인플루언서 (호출자 본인)
  }>;
};
```

### 4.4 호출 정책

- 필터/정렬/페이지 변경 시마다 서버 재호출
- `keyword` 입력은 300ms 디바운스
- 클라이언트 측 정렬·검색 **없음** — 서버 명세에 맞춤
- 로딩 중에는 이전 데이터 유지하면서 spinner 오버레이 (깜박임 방지)

## 5. 제품 구좌 view — UI

### 5.1 레이아웃

```
┌────────────────────────────────────────────────────────────────────┐
│ [🔍 keyword...]   공구가능 ⬤전체 ◯가능 ◯불가   ☐ 만료 포함        │
│ 정렬 [직전 공구일 오래된 순 ▼]    페이지 크기 [20 ▼]                │
├────────────────────────────────────────────────────────────────────┤
│ 썸 │ 제품 (브랜드)          │ 약국 │ 셀러 │ 직전 공구 │ 다음 공구 │ 상태 │
├────┼────────────────────────┼──────┼──────┼──────────┼──────────┼──────┤
│ 🖼 │ 알래스카 오메가3 (위타민)│고약사│아르케│2025-11-29│2026-05-26│ ✅  │
│ ...                                                                │
├────────────────────────────────────────────────────────────────────┤
│                          < 1 / N >  (총 NN건)                       │
└────────────────────────────────────────────────────────────────────┘
```

### 5.2 테이블 컬럼 (7개)

| 컬럼 | 응답 필드 | 표시 형태 |
|---|---|---|
| 썸네일 | `imageUrl` | `<img>` 60×60, 둥근 모서리 |
| 제품 / 브랜드 | `productName` + `brandName` | 1행 제품명, 2행 회색 브랜드명 |
| 약국 | `pharmacyName` | 텍스트 |
| 셀러 | `sellerName` | 텍스트 |
| 직전 공구 | `previousPlanStartedAt` | `YYYY-MM-DD` (null → `-`) |
| 다음 공구 | `nextPlanStartedAt` | `YYYY-MM-DD` (null → `-`) |
| 상태 | `availableGroupPurchaseProduct` | ✅ 가능 / ❌ 불가 배지 |

행 클릭 → 상세 모달 (§7).

### 5.3 정렬 드롭다운 라벨

| `sortType` 값 | 라벨 |
|---|---|
| `LAST_PLAN_ASC` (기본) | 직전 공구일 오래된 순 |
| `LAST_PLAN_DESC` | 직전 공구일 최신순 |
| `CREATED_AT_ASC` | 매핑 등록일 오래된 순 |
| `CREATED_AT_DESC` | 매핑 등록일 최신순 |

## 6. 코드 구조

기존 `dashboard.html` 의 단일 파일 컨벤션을 유지하면서 view 별 책임을 분리한다.

```js
// ─── 공통 (기존 코드 유지) ───
function login() / logout() / refreshToken() / apiCall(path, opts)

// ─── Router ───
const ROUTES = {
  dashboard: initDashboardView,
  products:  initProductsView,
  sellers:   initPlaceholderView('셀러'),
  sales:     initPlaceholderView('매출'),
  customers: initPlaceholderView('고객'),
};
function router() {
  const hash = (location.hash.replace('#', '') || 'dashboard');
  const route = ROUTES[hash] || ROUTES.dashboard;
  showView(hash);  // CSS hidden 토글 + 사이드바 .active 갱신
  route();
}
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);

// ─── 대시보드 view (기존 로직을 함수로 캡슐화) ───
function initDashboardView() { /* 기존 loadPlans + renderTable + charts */ }

// ─── 제품 구좌 view (신규) ───
const productsState = {
  keyword: '',
  available: null,        // null | true | false
  isExpired: false,
  sortType: 'LAST_PLAN_ASC',
  page: 0,
  size: 20,
  data: null,             // 마지막 응답
  loading: false,
};
async function fetchProducts() { /* productsState → query string → apiCall */ }
function renderProductsTable() { /* 7컬럼 + 빈 상태 */ }
function renderProductsPagination(totalCount) { /* < page / N > */ }
function bindProductsFilters() { /* 1회만 — input/change 핸들러 + 디바운스 */ }
let productsBound = false;
function initProductsView() {
  if (!productsBound) { bindProductsFilters(); productsBound = true; }
  fetchProducts();
}

// ─── Placeholder ───
function initPlaceholderView(label) {
  return () => {
    document.getElementById('view-placeholder-title').textContent = label;
    /* "준비 중" 화면 표시 */
  };
}
```

DOM 측면에서 각 view 는 `<section id="view-{name}" hidden>` 로 감싸고 `showView()` 가 hidden 토글.

## 7. 상세 모달

행 클릭 → 기존 `#modal-title` 모달 구조 재사용. 표시 항목:

- **헤더**: 썸네일 (120×120) + `brandName · productName`
- **정보 그리드 (2열)**:
  - 약국 / 인플루언서 / 셀러 / 담당자
  - 매핑번호 (`groupPurchaseProductInfluencerIdx`) / 제품번호 (`groupPurchaseProductIdx`)
  - 매핑 등록일 (`createdAt`) / 직전 공구일 / 다음 공구일 / 임시 여부 (`isTemp`)
- **하단**:
  - 공구 가능 배지 (✅/❌)
  - `unavailableReason` (비어있지 않을 때만 표시)
- 액션 버튼 없음 (조회 전용)

## 8. 에러 / 로딩 / 빈 상태

| 상황 | 동작 |
|---|---|
| 로딩 중 | 테이블 위 오버레이 spinner + "불러오는 중..." (이전 데이터 유지) |
| `401` / `403` | 토큰 만료 안내 토스트 → `logout()` 호출 → 로그인 화면 노출 |
| `5xx` / 네트워크 오류 | 토스트 "오류, 잠시 후 다시 시도" + 우측 상단 [↻ 재시도] 버튼 |
| 빈 응답 (`data: []`) | 테이블 자리에 "조건에 맞는 매핑이 없습니다" + [필터 초기화] 버튼 |

## 9. 라우팅 / 사이드바 동작

- **초기 진입** (해시 없음 또는 알 수 없는 해시) → `#dashboard` 로 폴백, "대시보드" 메뉴 `.active`
- **모바일** (max-width: 768px) → 사이드바 햄버거 토글 (왼쪽 슬라이드 인/아웃)
- **외부 메뉴** (작업 도구 그룹) → `<a target="_blank" rel="noopener">` 로 새 탭, 활성 표시 없음
- **메뉴 클릭 → 해시 변경 → `hashchange` 이벤트** 패턴 (직접 함수 호출 금지)

## 10. 검증 / 수동 테스트 시나리오

로컬은 `npm run dev` (wrangler pages dev) 로 띄운 `http://localhost:8788/dashboard.html` 에서 진행:

1. 로그인 → `#dashboard` 자동 진입 + "대시보드" 활성 확인
2. 사이드바 "제품 구좌" 클릭 → 해시 `#products` + view 전환 + API 호출 + 테이블 렌더
3. 검색박스에 "오메가" 입력 → 300ms 후 자동 재호출, `keyword=오메가` 쿼리 확인 (네트워크 탭)
4. 공구가능 라디오 "불가" 선택 → `availableGroupPurchaseProduct=false` 호출
5. 만료 포함 체크 → `isExpired=true` 호출
6. 정렬 드롭다운 4개 옵션 각각 → `sortType` 값 변경
7. 페이지 크기 50 / 100 변경 → `size` 값 변경 + page 0으로 리셋
8. 페이지네이션 → `page` 증가, 응답 데이터로 갱신
9. 행 클릭 → 상세 모달 + 필드 매핑 확인 (특히 `unavailableReason` 빈 경우 숨김)
10. 사이드바 "공구 캘린더" 클릭 → 새 탭에 `index.html` 열림, 현재 탭은 `#products` 유지
11. 사이드바 "셀러/매출/고객" 클릭 → "준비 중" placeholder 표시
12. 토큰 만료 시나리오 (localStorage 토큰 임의 손상) → 401 → 로그인 화면 복귀

## 11. 후속 작업 (이 스펙 범위 밖)

- 셀러/매출/고객 메뉴의 실제 데이터 연동 (각각 별도 스펙)
- 제품 구좌의 수정/액션 (불가 사유 입력, 활성 토글 등)
- 인플루언서/브랜드/셀러/담당자 ID 기반 필터 (응답에 ID 노출 후 진행)
- `study-skills-practice.html` 에 superpowers 플러그인 설치 가이드 추가 (별도 브레인스토밍)
  - 학생이 개별 과제 진행 시 brainstorming 스킬을 활용하도록 안내
  - 설치 후 제공되는 각 스킬에 대한 한 줄 설명 포함 (예: `brainstorming` — 아이디어를 대화로 정제해 설계로, `writing-plans` — 스펙을 실행 가능한 단계로 분해 등)
