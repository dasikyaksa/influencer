# Dashboard Sidebar + Product Slot Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dashboard.html 에 좌측 사이드바와 해시 라우팅 기반 view 분리를 도입하고, "제품 구좌" view 를 신규 구현하여 `GET /api/admin/v2/group-purchases/product-influencers` 조회·필터링이 가능하도록 한다.

**Architecture:** 단일 파일(`dashboard.html`) 컨벤션 유지. 기존 admin-view 안에 사이드바와 5개 `<section id="view-*">` 컨테이너를 두고 `location.hash` 기반 `router()` 가 view 토글. 작업 도구 메뉴는 별도 그룹으로 `<a target="_blank">` 외부 이동. 제품 구좌는 Swagger 명세의 서버 파라미터 (keyword/availableGroupPurchaseProduct/isExpired/sortType/page/size) 를 그대로 사용하고 클라이언트 측 정렬·검색은 하지 않는다.

**Tech Stack:** 순수 HTML/CSS/JS (빌드 없음), Cloudflare Pages Functions 프록시(`/api/*`), wrangler 로컬 개발(`npm run dev` → `http://localhost:8788`).

**Spec:** `docs/superpowers/specs/2026-05-17-dashboard-products-menu-design.md`

**Branch:** `feature/dashboard-products-menu` (스펙 커밋 `3725e22` 위에 이어 작업)

**Test convention:** 자동화 테스트 프레임워크 없음. 각 task 마지막에 `npm run dev` 로 띄운 `http://localhost:8788/dashboard.html` 에서 수동 검증 단계가 들어간다. 검증 명령과 기대 결과는 각 task 에 명시되어 있다.

---

## File Structure

이번 작업의 모든 변경은 단 한 파일에 집중된다.

| 경로 | 변경 종류 | 책임 |
|---|---|---|
| `dashboard.html` | 수정 (CSS 추가 + DOM 재구조화 + JS 추가) | 사이드바 레이아웃 / Router / Placeholder view / 제품 구좌 view / 모달 재사용 |

기존 함수 (login/logout/refreshToken/apiCall/showToast/openDetailModal 등) 는 그대로 재사용한다. 신규 함수는 모두 `dashboard.html` 의 기존 `<script>` 블록에 추가한다.

---

## Task 1: 사이드바 레이아웃 (HTML + CSS)

기존 `#admin-view` 의 직속 자식들을 우측 본문(`<main class="dash-main">`) 안으로 이동하고, 좌측에 사이드바(`<aside class="sidebar">`) 를 추가한다. 사이드바는 두 그룹("관리 도구" / "작업 도구") + 하단(토큰/로그아웃)으로 구성된다.

**Files:**
- Modify: `dashboard.html` (admin-view 구조 + 새 CSS 변수/규칙)

- [ ] **Step 1.1: 사이드바 CSS 추가**

`dashboard.html` 의 `<style>` 블록 맨 아래에 다음 규칙을 추가:

```css
/* === Sidebar Layout === */
.dash-shell { display: flex; min-height: 100vh; }
.sidebar {
  width: 240px; flex-shrink: 0;
  background: #0d1117; color: #c9d1d9;
  border-right: 1px solid #1f2530;
  display: flex; flex-direction: column;
  position: sticky; top: 0; height: 100vh;
  overflow-y: auto;
}
.sidebar-brand {
  padding: 20px 18px 16px;
  font-weight: 700; letter-spacing: 0.08em; font-size: 13px;
  color: #fff; border-bottom: 1px solid #1f2530;
}
.sidebar-group-label {
  padding: 14px 18px 6px;
  font-size: 11px; letter-spacing: 0.12em;
  color: #6e7681; text-transform: uppercase;
}
.sidebar-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 18px; font-size: 14px;
  color: #c9d1d9; cursor: pointer; text-decoration: none;
  border-left: 3px solid transparent;
}
.sidebar-item:hover { background: #161b22; color: #fff; }
.sidebar-item.active {
  background: #161b22; color: #fff;
  border-left-color: var(--teal, #2dd4bf);
}
.sidebar-item .icon { width: 18px; text-align: center; }
.sidebar-item .wip {
  margin-left: auto; font-size: 10px; color: #6e7681;
  border: 1px solid #30363d; padding: 1px 6px; border-radius: 3px;
}
.sidebar-divider { height: 1px; background: #1f2530; margin: 10px 0; }
.sidebar-footer { margin-top: auto; padding: 12px 0 18px; border-top: 1px solid #1f2530; }
.dash-main { flex: 1; min-width: 0; }

/* View containers */
.view { display: none; }
.view.active { display: block; }
.view-placeholder {
  padding: 80px 40px; text-align: center; color: #6e7681;
}
.view-placeholder h2 { font-size: 24px; margin-bottom: 8px; color: #c9d1d9; }
```

- [ ] **Step 1.2: admin-view DOM 재구조화**

기존 `<div id="admin-view">` 의 `<div class="dash-wrap">` 직속 자식을 사이드바 + 본문 구조로 감싼다. 다음과 같이 변경:

```html
<div id="admin-view">
  <div class="dash-shell">
    <!-- 좌측 사이드바 -->
    <aside class="sidebar">
      <div class="sidebar-brand">파마브로스</div>

      <div class="sidebar-group-label">관리 도구</div>
      <a class="sidebar-item" href="#dashboard" data-view="dashboard">
        <span class="icon">📊</span><span>대시보드</span>
      </a>
      <a class="sidebar-item" href="#products" data-view="products">
        <span class="icon">📦</span><span>제품 구좌</span>
      </a>
      <a class="sidebar-item" href="#sellers" data-view="sellers">
        <span class="icon">🏷️</span><span>셀러</span><span class="wip">WIP</span>
      </a>
      <a class="sidebar-item" href="#sales" data-view="sales">
        <span class="icon">💰</span><span>매출</span><span class="wip">WIP</span>
      </a>
      <a class="sidebar-item" href="#customers" data-view="customers">
        <span class="icon">👥</span><span>고객</span><span class="wip">WIP</span>
      </a>

      <div class="sidebar-divider"></div>
      <div class="sidebar-group-label">작업 도구</div>
      <a class="sidebar-item" href="./index.html" target="_blank" rel="noopener">
        <span class="icon">🗓️</span><span>공구 캘린더</span>
      </a>
      <a class="sidebar-item" href="./event.html" target="_blank" rel="noopener">
        <span class="icon">🎁</span><span>이벤트 폼</span>
      </a>
      <a class="sidebar-item" href="./event-admin.html" target="_blank" rel="noopener">
        <span class="icon">🎁</span><span>이벤트 관리</span>
      </a>
      <a class="sidebar-item" href="./study.html" target="_blank" rel="noopener">
        <span class="icon">📚</span><span>스터디 신청</span>
      </a>
      <a class="sidebar-item" href="./study-admin.html" target="_blank" rel="noopener">
        <span class="icon">📚</span><span>스터디 관리</span>
      </a>
      <a class="sidebar-item" href="./study-raffle.html" target="_blank" rel="noopener">
        <span class="icon">📚</span><span>스터디 룰렛</span>
      </a>
      <a class="sidebar-item" href="./study-curriculum.html" target="_blank" rel="noopener">
        <span class="icon">📚</span><span>커리큘럼</span>
      </a>
      <a class="sidebar-item" href="./study-skills-practice.html" target="_blank" rel="noopener">
        <span class="icon">📚</span><span>스킬 실습</span>
      </a>

      <div class="sidebar-footer">
        <a class="sidebar-item" href="#" onclick="event.preventDefault(); document.getElementById('mask-btn').click();">
          <span class="icon">🪙</span><span>금액 토글</span>
        </a>
        <a class="sidebar-item" href="#" onclick="event.preventDefault(); logout();">
          <span class="icon">🚪</span><span>로그아웃</span>
        </a>
      </div>
    </aside>

    <!-- 우측 본문 -->
    <main class="dash-main">
      <section class="view" id="view-dashboard">
        <!-- 기존 .dash-wrap 의 모든 자식 (header, metrics-grid, charts, table-area 등) 을 여기로 이동 -->
        <!-- 단, 기존 .dash-wrap 의 padding 은 view-dashboard 에 inline 또는 클래스로 적용 -->
      </section>
      <section class="view" id="view-products"></section>
      <section class="view" id="view-sellers"></section>
      <section class="view" id="view-sales"></section>
      <section class="view" id="view-customers"></section>
    </main>
  </div>
</div>
```

**이동 가이드:** 기존 `<div id="admin-view"><div class="dash-wrap">...</div></div>` 구조에서, `.dash-wrap` 내부의 모든 자식 노드 (header / metrics-grid / charts / search-bar / table-area / 등 약 1000~1050 라인 범위) 를 `<section class="view" id="view-dashboard">` 안으로 그대로 옮긴다. `.dash-wrap` 클래스는 유지하되 위치만 `view-dashboard` 안쪽으로 이동:

```html
<section class="view" id="view-dashboard">
  <div class="dash-wrap">
    <div class="header">...</div>
    <div class="metrics-grid">...</div>
    ...
  </div>
</section>
```

- [ ] **Step 1.3: wrangler 실행 + 시각 확인**

```bash
npm run dev
```

브라우저로 `http://localhost:8788/dashboard.html` 접속, 로그인 (기존 ID/PW + 2FA) 후 다음 확인:
- 좌측에 검정 사이드바가 보이는가 (240px 폭)
- "관리 도구" 5개 + "작업 도구" 8개 + 하단 토큰/로그아웃이 모두 표시되는가
- 기존 대시보드 콘텐츠(통계 카드, 차트, 테이블)가 우측에 그대로 보이는가
- 외부 메뉴 (예: 공구 캘린더) 클릭 시 새 탭이 열리는가

이 시점에서 사이드바 메뉴 클릭은 아직 아무 동작 안 함 (Task 2 에서 처리). 단, `href="#products"` 같은 해시 변경은 일어남.

- [ ] **Step 1.4: 커밋**

```bash
git add dashboard.html
git commit -m "$(cat <<'EOF'
feat(dashboard): add sidebar layout with view containers

- 좌측 사이드바 (관리 도구 5 + 작업 도구 8 + 푸터)
- 기존 dashboard 콘텐츠를 view-dashboard 섹션으로 이동
- view-products / sellers / sales / customers 빈 컨테이너 추가
- 외부 메뉴는 target=_blank

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 해시 라우터 + 활성 메뉴 표시

`router()` 함수로 해시 → view 토글을 구현하고 사이드바 활성 상태를 갱신한다. Placeholder view 3개 (셀러/매출/고객) 의 "준비 중" UI도 함께 마련.

**Files:**
- Modify: `dashboard.html` (script 영역에 Router 함수 추가, view-sellers/sales/customers DOM 채움)

- [ ] **Step 2.1: Placeholder view DOM 채우기**

`<section class="view" id="view-sellers"></section>` 등 3개를 다음과 같이 채운다 (동일 마크업, 라벨만 다름):

```html
<section class="view" id="view-sellers">
  <div class="view-placeholder">
    <h2>셀러</h2>
    <p>이 메뉴는 준비 중입니다.</p>
  </div>
</section>
<section class="view" id="view-sales">
  <div class="view-placeholder">
    <h2>매출</h2>
    <p>이 메뉴는 준비 중입니다.</p>
  </div>
</section>
<section class="view" id="view-customers">
  <div class="view-placeholder">
    <h2>고객</h2>
    <p>이 메뉴는 준비 중입니다.</p>
  </div>
</section>
```

- [ ] **Step 2.2: Router 함수 추가**

`dashboard.html` 의 기존 `<script>` 블록 끝부분(toast/모달 닫기 핸들러 근처)에 다음 코드를 추가:

```js
// === View Router ===
const VALID_VIEWS = ['dashboard', 'products', 'sellers', 'sales', 'customers'];
let currentView = null;

const VIEW_INITIALIZERS = {
  dashboard: function initDashboardView() {
    // 기존 dashboard 콘텐츠는 항상 로드되어 있음 (Task 3 에서 boot 시점 정리)
  },
  products: function initProductsView() { /* Task 5 에서 채움 */ },
  sellers: function initPlaceholderView() {},
  sales: function initPlaceholderView() {},
  customers: function initPlaceholderView() {},
};

function showView(name) {
  if (!VALID_VIEWS.includes(name)) name = 'dashboard';
  if (currentView === name) return;
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelectorAll('.sidebar-item[data-view]').forEach(el => {
    el.classList.toggle('active', el.dataset.view === name);
  });
  currentView = name;
}

function router() {
  const hash = (location.hash.replace('#', '') || 'dashboard');
  const name = VALID_VIEWS.includes(hash) ? hash : 'dashboard';
  showView(name);
  const init = VIEW_INITIALIZERS[name];
  if (typeof init === 'function') init();
}

window.addEventListener('hashchange', router);
```

- [ ] **Step 2.3: showDashboard() 종료 시 router 한 번 호출**

기존 `showDashboard()` 함수 (로그인 성공 후 admin-view 를 띄우는 함수, 약 line 1399 근방) 의 마지막 줄에 `router();` 호출을 추가한다. 정확한 이전/이후 컨텍스트:

```js
// 변경 전 (예시 위치):
function showDashboard() {
  document.getElementById('login-view').classList.remove('active');
  document.getElementById('admin-view').classList.add('active');
  // ... 기존 초기화 코드
}

// 변경 후 — 마지막 줄에 router() 한 줄 추가:
function showDashboard() {
  document.getElementById('login-view').classList.remove('active');
  document.getElementById('admin-view').classList.add('active');
  // ... 기존 초기화 코드
  router();   // 이 줄 추가
}
```

또한 `view-dashboard` 가 새로고침 직후 한 번도 `.active` 가 안 붙어 빈 화면이 보이는 걸 방지하기 위해, Step 2.1 의 마크업에서 `view-dashboard` 에는 처음부터 `.active` 를 붙여둔다:

```html
<section class="view active" id="view-dashboard">  <!-- active 추가 -->
```

- [ ] **Step 2.4: wrangler 수동 검증**

브라우저에서 (이미 떠 있으면 새로고침):
- 로그인 후 자동으로 `#dashboard` 로 들어가고 사이드바의 "대시보드" 가 활성(진한 배경 + 좌측 teal 보더) 인지
- "제품 구좌" 클릭 → URL 이 `#products` 로 바뀌고 본문이 빈 화면으로 전환되며 "제품 구좌" 메뉴가 활성
- "셀러" 클릭 → URL `#sellers` + "셀러 / 이 메뉴는 준비 중입니다." 표시
- 매출 / 고객 동일
- 주소창에 임의의 `#foo` 직접 입력 → 대시보드로 폴백 + 사이드바 "대시보드" 활성
- 브라우저 뒤로가기 → 이전 해시로 정상 복귀

- [ ] **Step 2.5: 커밋**

```bash
git add dashboard.html
git commit -m "$(cat <<'EOF'
feat(dashboard): add hash-based router and placeholder views

- VALID_VIEWS 5종, showView() / router() / hashchange 바인딩
- 셀러/매출/고객 placeholder view ("준비 중")
- 사이드바 .active 표시 동기화
- showDashboard() 종료 시 router() 1회 호출로 초기 진입 처리

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 제품 구좌 view DOM 골격 (필터/테이블/페이지네이션 자리)

`view-products` 안에 필터 영역, 빈 테이블, 페이지네이션 자리, 상태 영역(로딩/에러/빈) 의 DOM을 모두 마련한다. 데이터 바인딩은 다음 task.

**Files:**
- Modify: `dashboard.html` (view-products 내부 채움 + 제품 구좌 전용 CSS)

- [ ] **Step 3.1: 제품 구좌 CSS 추가**

`<style>` 블록 끝에 추가:

```css
/* === Products View === */
.pv-wrap { padding: 24px 28px; }
.pv-title { font-size: 22px; font-weight: 700; margin-bottom: 16px; color: #fff; }
.pv-filters {
  display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center;
  padding: 14px 16px; background: #161b22; border: 1px solid #1f2530;
  border-radius: 8px; margin-bottom: 16px;
}
.pv-filters .field-inline { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #c9d1d9; }
.pv-filters input[type="text"] {
  background: #0d1117; border: 1px solid #30363d; color: #c9d1d9;
  padding: 7px 10px; border-radius: 6px; min-width: 240px; font-size: 13px;
}
.pv-filters select {
  background: #0d1117; border: 1px solid #30363d; color: #c9d1d9;
  padding: 7px 10px; border-radius: 6px; font-size: 13px;
}
.pv-filters label { cursor: pointer; }
.pv-radio { display: inline-flex; gap: 10px; }
.pv-radio input { accent-color: #2dd4bf; }
.pv-table-wrap { position: relative; min-height: 200px; }
.pv-table { width: 100%; border-collapse: collapse; }
.pv-table th, .pv-table td {
  padding: 10px 12px; text-align: left; font-size: 13px;
  border-bottom: 1px solid #1f2530; color: #c9d1d9;
}
.pv-table th { background: #161b22; color: #8b949e; font-weight: 600; font-size: 12px; letter-spacing: 0.04em; }
.pv-table tbody tr { cursor: pointer; }
.pv-table tbody tr:hover { background: #161b22; }
.pv-thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; background: #1f2530; }
.pv-product-name { font-weight: 600; color: #fff; }
.pv-brand-name { font-size: 11px; color: #8b949e; margin-top: 2px; }
.pv-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.pv-badge.ok { background: rgba(45, 212, 191, 0.15); color: #2dd4bf; }
.pv-badge.ng { background: rgba(248, 113, 113, 0.15); color: #f87171; }
.pv-pagination {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 16px; padding: 12px 4px; font-size: 13px; color: #8b949e;
}
.pv-pagination button {
  background: #0d1117; border: 1px solid #30363d; color: #c9d1d9;
  padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px;
}
.pv-pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.pv-loading-overlay {
  position: absolute; inset: 0; background: rgba(13, 17, 23, 0.65);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; color: #c9d1d9; gap: 10px;
}
.pv-spinner {
  width: 18px; height: 18px; border: 2px solid #30363d; border-top-color: #2dd4bf;
  border-radius: 50%; animation: pv-spin 0.8s linear infinite;
}
@keyframes pv-spin { to { transform: rotate(360deg); } }
.pv-empty, .pv-error {
  padding: 60px 20px; text-align: center; color: #8b949e;
}
.pv-error { color: #f87171; }
.pv-empty button, .pv-error button {
  margin-top: 12px; background: #2dd4bf; color: #0d1117;
  border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;
}
```

- [ ] **Step 3.2: view-products DOM 골격**

`<section class="view" id="view-products"></section>` 를 다음으로 채운다:

```html
<section class="view" id="view-products">
  <div class="pv-wrap">
    <div class="pv-title">제품 구좌</div>

    <div class="pv-filters">
      <div class="field-inline">
        <input type="text" id="pv-keyword" placeholder="제품명·브랜드·약국 검색" spellcheck="false">
      </div>
      <div class="field-inline">
        공구가능:
        <span class="pv-radio">
          <label><input type="radio" name="pv-avail" value=""> 전체</label>
          <label><input type="radio" name="pv-avail" value="true" checked> 가능</label>
          <label><input type="radio" name="pv-avail" value="false"> 불가</label>
        </span>
      </div>
      <div class="field-inline">
        <label><input type="checkbox" id="pv-expired"> 만료 포함</label>
      </div>
      <div class="field-inline">
        정렬:
        <select id="pv-sort">
          <option value="LAST_PLAN_ASC" selected>직전 공구일 오래된 순</option>
          <option value="LAST_PLAN_DESC">직전 공구일 최신순</option>
          <option value="CREATED_AT_ASC">매핑 등록일 오래된 순</option>
          <option value="CREATED_AT_DESC">매핑 등록일 최신순</option>
        </select>
      </div>
      <div class="field-inline">
        페이지 크기:
        <select id="pv-size">
          <option value="20" selected>20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
    </div>

    <div class="pv-table-wrap" id="pv-table-wrap">
      <table class="pv-table">
        <thead>
          <tr>
            <th style="width:64px"></th>
            <th>제품</th>
            <th>약국</th>
            <th>셀러</th>
            <th>직전 공구</th>
            <th>다음 공구</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody id="pv-tbody"></tbody>
      </table>
    </div>

    <div class="pv-pagination">
      <span id="pv-stat">—</span>
      <span>
        <button id="pv-prev" disabled>이전</button>
        <span id="pv-page-info" style="margin: 0 12px;">1 / 1</span>
        <button id="pv-next" disabled>다음</button>
      </span>
    </div>
  </div>
</section>
```

- [ ] **Step 3.3: wrangler 시각 확인**

브라우저에서 `#products` 로 이동, 다음 확인:
- 필터 영역에 검색박스 / 공구가능 라디오 3개 / 만료 체크박스 / 정렬 드롭다운 4개 / 페이지 크기 드롭다운 3개 가 모두 보이는가
- 테이블 헤더(7컬럼)가 표시되고 body 는 비어 있는가
- 하단에 [이전] [1/1] [다음] 페이지네이션이 보이는가 (버튼은 disabled)

- [ ] **Step 3.4: 커밋**

```bash
git add dashboard.html
git commit -m "$(cat <<'EOF'
feat(dashboard): scaffold products view DOM and styles

- 필터 영역 (keyword, 공구가능 라디오, 만료 체크박스, 정렬 4종, 페이지 크기 20/50/100)
- 테이블 헤더 7컬럼 + 빈 tbody
- 페이지네이션 자리 (이전/다음, 페이지 정보)
- pv-* 클래스 기반 다크 테마 CSS

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: productsState + fetchProducts + 기본 호출

상태 객체와 API 호출 함수를 구현하고, view 진입 시 한 번 호출되도록 한다. 이 단계에서는 응답을 콘솔에만 찍어 호출이 정상인지 확인.

**Files:**
- Modify: `dashboard.html` (script 영역에 productsState + fetchProducts 추가, VIEW_INITIALIZERS.products 채움)

- [ ] **Step 4.1: 상태 객체 + fetchProducts 추가**

Router 정의 근처(같은 `<script>` 블록 안)에 다음 코드를 추가:

```js
// === Products View ===
const productsState = {
  keyword: '',
  available: 'true',          // '' (전체) | 'true' | 'false' — 라디오 value
  isExpired: false,
  sortType: 'LAST_PLAN_ASC',
  page: 0,
  size: 20,
  data: null,                  // 마지막 응답 { meta, data }
  loading: false,
  error: null,                 // 'auth' | 'network' | null
};

function buildProductsQuery() {
  const p = new URLSearchParams();
  if (productsState.keyword.trim()) p.set('keyword', productsState.keyword.trim());
  if (productsState.available === 'true' || productsState.available === 'false') {
    p.set('availableGroupPurchaseProduct', productsState.available);
  }
  p.set('isExpired', productsState.isExpired ? 'true' : 'false');
  p.set('sortType', productsState.sortType);
  p.set('page', String(productsState.page));
  p.set('size', String(productsState.size));
  return p.toString();
}

async function fetchProducts() {
  productsState.loading = true;
  productsState.error = null;
  renderProductsView();    // Task 5 에서 정의됨 — 일단은 console 출력 함수로 임시 채움
  try {
    const qs = buildProductsQuery();
    const res = await fetch(API_BASE + '/api/admin/v2/group-purchases/product-influencers?' + qs, {
      headers: { 'accept': 'application/json', 'Authorization': 'Bearer ' + bearerToken },
    });
    if (res.status === 401 || res.status === 403) {
      productsState.error = 'auth';
      productsState.loading = false;
      renderProductsView();
      showToast('인증이 만료되었습니다. 다시 로그인해주세요.');
      logout();
      return;
    }
    if (!res.ok) {
      productsState.error = 'network';
      productsState.loading = false;
      renderProductsView();
      return;
    }
    const json = await res.json();
    productsState.data = json;
    productsState.loading = false;
    renderProductsView();
  } catch (e) {
    productsState.error = 'network';
    productsState.loading = false;
    renderProductsView();
  }
}

// 임시 renderProductsView — Task 5에서 진짜 구현으로 교체됨
function renderProductsView() {
  console.log('[products]', { ...productsState });
}
```

- [ ] **Step 4.2: VIEW_INITIALIZERS.products 교체**

Task 2 에서 추가한 `VIEW_INITIALIZERS` 의 `products: function initProductsView() {}` 를 다음으로 교체:

```js
products: (function() {
  let bound = false;
  return function initProductsView() {
    if (!bound) {
      // Task 6 에서 bindProductsFilters() 호출 추가됨
      bound = true;
    }
    fetchProducts();
  };
})(),
```

- [ ] **Step 4.3: wrangler 검증**

브라우저 콘솔 열고 `#products` 진입 후:
- 콘솔에 `[products] { keyword: "", available: "true", ... }` 로그가 두 번 찍히는가 (loading=true 한 번, loading=false 한 번)
- 네트워크 탭에서 `GET /api/admin/v2/group-purchases/product-influencers?availableGroupPurchaseProduct=true&isExpired=false&sortType=LAST_PLAN_ASC&page=0&size=20` 가 200 응답으로 호출되는가
- 응답 JSON 에 `{ meta: { totalCount: ... }, data: [...] }` 가 포함되어 있는가

(아직 화면에는 아무것도 안 그려진다 — Task 5)

- [ ] **Step 4.4: 커밋**

```bash
git add dashboard.html
git commit -m "$(cat <<'EOF'
feat(dashboard): wire products API call with state object

- productsState 객체 (keyword, available, isExpired, sortType, page, size, data, loading, error)
- buildProductsQuery() URLSearchParams 빌더
- fetchProducts() — 401/403 시 logout, 그 외 에러는 error 플래그
- VIEW_INITIALIZERS.products 가 진입 시 fetchProducts 호출

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 테이블 렌더링 (7컬럼 + 빈 상태 + 로딩 + 에러)

`renderProductsView()` 를 실제 DOM 갱신으로 교체한다. 4가지 상태(로딩/에러/빈/데이터) 를 모두 처리.

**Files:**
- Modify: `dashboard.html` (renderProductsView 함수 교체)

- [ ] **Step 5.1: 헬퍼 함수 + renderProductsView 교체**

Task 4의 임시 `renderProductsView` 함수를 다음으로 통째 교체:

```js
function pvFormatDate(iso) {
  if (!iso) return '-';
  return String(iso).slice(0, 10);
}
function pvSafe(s) {
  return esc(s == null ? '' : String(s));   // 기존 esc() 재사용
}

function renderProductsView() {
  const wrap = document.getElementById('pv-table-wrap');
  const tbody = document.getElementById('pv-tbody');
  const stat = document.getElementById('pv-stat');
  const pageInfo = document.getElementById('pv-page-info');
  const prev = document.getElementById('pv-prev');
  const next = document.getElementById('pv-next');

  // 기존 오버레이/상태 메시지 제거
  wrap.querySelectorAll('.pv-loading-overlay, .pv-empty, .pv-error').forEach(el => el.remove());

  // 로딩 오버레이
  if (productsState.loading) {
    const ov = document.createElement('div');
    ov.className = 'pv-loading-overlay';
    ov.innerHTML = '<span class="pv-spinner"></span><span>불러오는 중...</span>';
    wrap.appendChild(ov);
  }

  // 에러
  if (productsState.error === 'network') {
    tbody.innerHTML = '';
    const err = document.createElement('div');
    err.className = 'pv-error';
    err.innerHTML = '오류가 발생했습니다. 잠시 후 다시 시도해주세요.<br><button id="pv-retry">↻ 재시도</button>';
    wrap.appendChild(err);
    document.getElementById('pv-retry').onclick = () => fetchProducts();
    stat.textContent = '—';
    pageInfo.textContent = '1 / 1';
    prev.disabled = true; next.disabled = true;
    return;
  }

  // 데이터 없음 (초기 또는 응답 전)
  if (!productsState.data) {
    tbody.innerHTML = '';
    stat.textContent = '—';
    return;
  }

  const total = productsState.data.meta.totalCount;
  const items = productsState.data.data || [];

  // 빈 결과
  if (items.length === 0) {
    tbody.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'pv-empty';
    empty.innerHTML = '조건에 맞는 매핑이 없습니다.<br><button id="pv-reset">필터 초기화</button>';
    wrap.appendChild(empty);
    document.getElementById('pv-reset').onclick = () => resetProductsFilters();
    stat.textContent = '총 0건';
    pageInfo.textContent = '1 / 1';
    prev.disabled = true; next.disabled = true;
    return;
  }

  // 테이블 본문
  tbody.innerHTML = items.map((it, idx) => `
    <tr data-idx="${idx}">
      <td><img class="pv-thumb" src="${pvSafe(it.imageUrl)}" alt="" onerror="this.style.visibility='hidden'"></td>
      <td>
        <div class="pv-product-name">${pvSafe(it.productName)}</div>
        <div class="pv-brand-name">${pvSafe(it.brandName)}</div>
      </td>
      <td>${pvSafe(it.pharmacyName)}</td>
      <td>${pvSafe(it.sellerName)}</td>
      <td>${pvFormatDate(it.previousPlanStartedAt)}</td>
      <td>${pvFormatDate(it.nextPlanStartedAt)}</td>
      <td>${it.availableGroupPurchaseProduct
        ? '<span class="pv-badge ok">✅ 가능</span>'
        : '<span class="pv-badge ng">❌ 불가</span>'}</td>
    </tr>
  `).join('');

  // 행 클릭 핸들러 (Task 8 에서 모달 연결)
  tbody.querySelectorAll('tr').forEach(tr => {
    tr.onclick = () => {
      const i = Number(tr.dataset.idx);
      const row = items[i];
      if (typeof openProductDetail === 'function') openProductDetail(row);
    };
  });

  // 통계 + 페이지네이션
  const totalPages = Math.max(1, Math.ceil(total / productsState.size));
  stat.textContent = `총 ${total}건`;
  pageInfo.textContent = `${productsState.page + 1} / ${totalPages}`;
  prev.disabled = productsState.page <= 0;
  next.disabled = productsState.page + 1 >= totalPages;
}

function resetProductsFilters() {
  productsState.keyword = '';
  productsState.available = 'true';
  productsState.isExpired = false;
  productsState.sortType = 'LAST_PLAN_ASC';
  productsState.page = 0;
  productsState.size = 20;
  document.getElementById('pv-keyword').value = '';
  document.querySelectorAll('input[name="pv-avail"]').forEach(r => r.checked = (r.value === 'true'));
  document.getElementById('pv-expired').checked = false;
  document.getElementById('pv-sort').value = 'LAST_PLAN_ASC';
  document.getElementById('pv-size').value = '20';
  fetchProducts();
}
```

- [ ] **Step 5.2: wrangler 검증**

브라우저에서 `#products` 진입:
- 짧게 spinner + "불러오는 중..." 이 보이고 사라지는가
- 30 건이 표시되고 각 행에 썸네일 / 제품명·브랜드 / 약국 / 셀러 / 직전·다음 공구일 / 상태 배지가 모두 보이는가
- 하단에 "총 30건" + "1 / 2" (size=20 이라 30/20=2) 가 표시되는가
- 빈 응답 시뮬: 콘솔에서 `productsState.data = {meta:{totalCount:0}, data:[]}; renderProductsView();` 실행 → "조건에 맞는 매핑이 없습니다" + [필터 초기화] 가 보이고, 필터 초기화 클릭 시 다시 데이터 로드

- [ ] **Step 5.3: 커밋**

```bash
git add dashboard.html
git commit -m "$(cat <<'EOF'
feat(dashboard): render products table with loading/empty/error states

- renderProductsView() — 4상태 (loading / error / empty / data) 처리
- 7컬럼 테이블 (썸네일, 제품·브랜드, 약국, 셀러, 직전·다음 공구일, 상태 배지)
- 행 클릭 핸들러 (모달 연결은 Task 8)
- pv-error / pv-empty placeholder + 재시도 / 필터 초기화 버튼
- resetProductsFilters() 헬퍼

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 필터 / 정렬 / 페이지 크기 바인딩

필터 컨트롤의 input/change 이벤트를 productsState 에 반영하고 재호출. keyword 는 300ms 디바운스.

**Files:**
- Modify: `dashboard.html` (bindProductsFilters 함수 + VIEW_INITIALIZERS.products 의 bound 분기 채움)

- [ ] **Step 6.1: bindProductsFilters 추가**

`renderProductsView` 아래에 다음 함수 추가:

```js
function pvDebounce(fn, ms) {
  let t = null;
  return function() {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, arguments), ms);
  };
}

function bindProductsFilters() {
  const keywordEl = document.getElementById('pv-keyword');
  const expiredEl = document.getElementById('pv-expired');
  const sortEl = document.getElementById('pv-sort');
  const sizeEl = document.getElementById('pv-size');
  const prev = document.getElementById('pv-prev');
  const next = document.getElementById('pv-next');

  const onKeyword = pvDebounce(() => {
    productsState.keyword = keywordEl.value;
    productsState.page = 0;
    fetchProducts();
  }, 300);
  keywordEl.addEventListener('input', onKeyword);

  document.querySelectorAll('input[name="pv-avail"]').forEach(r => {
    r.addEventListener('change', () => {
      const checked = document.querySelector('input[name="pv-avail"]:checked');
      productsState.available = checked ? checked.value : '';
      productsState.page = 0;
      fetchProducts();
    });
  });

  expiredEl.addEventListener('change', () => {
    productsState.isExpired = expiredEl.checked;
    productsState.page = 0;
    fetchProducts();
  });

  sortEl.addEventListener('change', () => {
    productsState.sortType = sortEl.value;
    productsState.page = 0;
    fetchProducts();
  });

  sizeEl.addEventListener('change', () => {
    productsState.size = Number(sizeEl.value);
    productsState.page = 0;
    fetchProducts();
  });

  prev.addEventListener('click', () => {
    if (productsState.page > 0) {
      productsState.page -= 1;
      fetchProducts();
    }
  });

  next.addEventListener('click', () => {
    if (!productsState.data) return;
    const totalPages = Math.max(1, Math.ceil(productsState.data.meta.totalCount / productsState.size));
    if (productsState.page + 1 < totalPages) {
      productsState.page += 1;
      fetchProducts();
    }
  });
}
```

- [ ] **Step 6.2: VIEW_INITIALIZERS.products 의 bound 분기 채움**

Task 4 Step 4.2 에서 추가한 IIFE 안의 `if (!bound) {}` 블록을 다음으로 갱신:

```js
products: (function() {
  let bound = false;
  return function initProductsView() {
    if (!bound) {
      bindProductsFilters();   // 이 줄 추가
      bound = true;
    }
    fetchProducts();
  };
})(),
```

- [ ] **Step 6.3: wrangler 검증**

`#products` 에서 (네트워크 탭 열고):
1. 검색박스에 "오메가" 입력 → 300ms 후 한 번만 호출, `keyword=%EC%98%A4%EB%A9%94%EA%B0%80` 쿼리 확인
2. 공구가능 라디오 "불가" → `availableGroupPurchaseProduct=false`, 결과가 불가 항목으로 갱신
3. 공구가능 "전체" → `availableGroupPurchaseProduct` 파라미터 자체가 빠짐
4. "만료 포함" 체크 → `isExpired=true`
5. 정렬 4종 각각 변경 → `sortType` 값 변경 + 결과 순서 변경
6. 페이지 크기 50/100 → `size` 변경 + page 0으로 리셋
7. [다음] 버튼 → `page=1` 호출, [이전] 활성화 확인. 마지막 페이지에서 [다음] disabled

- [ ] **Step 6.4: 커밋**

```bash
git add dashboard.html
git commit -m "$(cat <<'EOF'
feat(dashboard): bind product view filter/sort/pagination controls

- keyword input 300ms 디바운스
- 라디오/체크박스/정렬/페이지 크기 change 핸들러
- 페이지 변경 시 fetchProducts 재호출, 필터 변경 시 page=0 리셋
- 이전/다음 버튼 활성화 조건 처리

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 상세 모달 (행 클릭 → 항목 상세)

기존 `#detail-modal` 컴포넌트를 재사용해서 행 클릭 시 상세 정보를 띄운다. 기존 모달이 dashboard view 전용 콘텐츠로 채워져 있을 수 있으므로 `openProductDetail()` 은 동일 모달 DOM의 `#modal-title` + `#modal-body` 를 갈아끼우는 방식.

**Files:**
- Modify: `dashboard.html` (openProductDetail 함수 추가 + 기존 모달 표시 패턴 확인)

- [ ] **Step 7.1: openProductDetail 함수 추가**

`bindProductsFilters` 아래에 추가:

```js
function openProductDetail(row) {
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  const modal = document.getElementById('detail-modal');
  if (!title || !body || !modal) return;

  title.textContent = '제품 구좌 상세';

  const grid = [
    ['약국', row.pharmacyName],
    ['인플루언서', row.influencerName],
    ['셀러', row.sellerName],
    ['담당자', row.adminName],
    ['매핑 번호', row.groupPurchaseProductInfluencerIdx],
    ['제품 번호', row.groupPurchaseProductIdx],
    ['매핑 등록일', pvFormatDate(row.createdAt)],
    ['직전 공구일', pvFormatDate(row.previousPlanStartedAt)],
    ['다음 공구일', pvFormatDate(row.nextPlanStartedAt)],
    ['임시 매핑', row.isTemp ? '예' : '아니오'],
  ];

  const badge = row.availableGroupPurchaseProduct
    ? '<span class="pv-badge ok">✅ 공구 가능</span>'
    : '<span class="pv-badge ng">❌ 공구 불가</span>';

  const reason = (row.unavailableReason && row.unavailableReason.trim())
    ? `<div style="margin-top:10px; color:#f87171; font-size:13px;">사유: ${pvSafe(row.unavailableReason)}</div>`
    : '';

  body.innerHTML = `
    <div style="display:flex; gap:16px; margin-bottom:18px; align-items:center;">
      <img src="${pvSafe(row.imageUrl)}" style="width:120px; height:120px; object-fit:cover; border-radius:8px; background:#1f2530;" onerror="this.style.visibility='hidden'">
      <div>
        <div style="font-size:11px; color:#8b949e; margin-bottom:4px;">${pvSafe(row.brandName)}</div>
        <div style="font-size:18px; font-weight:700; color:#fff;">${pvSafe(row.productName)}</div>
        <div style="margin-top:10px;">${badge}</div>
        ${reason}
      </div>
    </div>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; font-size:13px;">
      ${grid.map(([k,v]) => `
        <div>
          <div style="color:#8b949e; font-size:11px; margin-bottom:2px;">${pvSafe(k)}</div>
          <div style="color:#c9d1d9;">${pvSafe(v)}</div>
        </div>
      `).join('')}
    </div>
  `;

  modal.classList.add('active');
}
```

- [ ] **Step 7.2: 모달 active 클래스 확인**

기존 dashboard 의 모달 열기/닫기 방식을 검토해서 `.active` 클래스가 표시 트리거로 쓰이는지 확인. `rg "detail-modal" dashboard.html` 로 사용 위치 확인하고, 만약 다른 표시 메커니즘 (예: `style.display = 'flex'`) 을 쓴다면 그 패턴에 맞춰 Step 7.1 의 마지막 줄을 조정.

기존 패턴 (대표 예시):

```bash
grep -n "detail-modal" /Users/kimkyuhyun/workspace/influencer/dashboard.html
```

- 기존 코드가 `modal.classList.add('active')` 패턴이면 Step 7.1 그대로 사용
- 기존 코드가 `modal.style.display = 'flex'` 패턴이면 Step 7.1 의 `modal.classList.add('active')` 를 `modal.style.display = 'flex'` 로 교체
- 모달 닫기는 기존 닫기 버튼/오버레이 클릭 핸들러가 이미 있으므로 별도 추가 없음

- [ ] **Step 7.3: wrangler 검증**

`#products` 에서:
- 임의의 행 클릭 → 모달 열림
- 헤더에 썸네일 + 브랜드(작게) + 제품명(크게) + 공구가능 배지가 보이는가
- 정보 그리드 10개 항목(약국/인플루언서/셀러/담당자/매핑번호/제품번호/매핑등록일/직전·다음 공구일/임시매핑) 표시
- `availableGroupPurchaseProduct=false` 인 행: 빨간 사유 텍스트 표시 (unavailableReason 있는 경우)
- 모달 외부 클릭 또는 닫기 버튼 → 모달 닫힘
- 닫은 후 기존 대시보드 (`#dashboard`) 의 행 클릭 시 모달이 원래 콘텐츠로 정상 동작하는가 (회귀 검증)

- [ ] **Step 7.4: 커밋**

```bash
git add dashboard.html
git commit -m "$(cat <<'EOF'
feat(dashboard): add product detail modal (read-only)

- openProductDetail(row) — 기존 #detail-modal 재사용
- 헤더 (썸네일 + 제품·브랜드 + 가능/불가 배지 + 불가 사유)
- 2열 그리드 10항목 (약국/인플루언서/셀러/담당자/번호/일자/임시여부)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 최종 통합 검증 + README 업데이트

스펙 §10 의 12개 시나리오를 차례로 확인하고, 회귀로 기존 대시보드 기능이 깨지지 않았는지 점검.

**Files:**
- Modify: `README.md` (사이드바·제품 구좌 기능 한 줄 추가)

- [ ] **Step 8.1: 시나리오 검증 (스펙 §10 그대로)**

`npm run dev` 로 띄운 `http://localhost:8788/dashboard.html` 에서 다음을 순서대로 확인하고 모든 항목이 PASS 인지 체크. 한 항목이라도 실패하면 해당 task 로 돌아가 수정.

1. [ ] 로그인 → `#dashboard` 자동 진입 + "대시보드" 활성
2. [ ] "제품 구좌" 클릭 → 해시 `#products` + view 전환 + API 호출 + 테이블 렌더
3. [ ] 검색박스 "오메가" → 300ms 후 자동 재호출 + `keyword=오메가`
4. [ ] 공구가능 "불가" → `availableGroupPurchaseProduct=false` 호출
5. [ ] "만료 포함" 체크 → `isExpired=true` 호출
6. [ ] 정렬 4개 옵션 각각 → `sortType` 값 변경
7. [ ] 페이지 크기 50 / 100 → `size` 값 변경 + page 0 리셋
8. [ ] 페이지네이션 → `page` 증가, 응답 데이터로 갱신
9. [ ] 행 클릭 → 상세 모달 + 필드 매핑 (특히 `unavailableReason` 빈 경우 숨김)
10. [ ] "공구 캘린더" 클릭 → 새 탭에서 `index.html` 열림, 현재 탭은 `#products` 유지
11. [ ] "셀러/매출/고객" 클릭 → "준비 중" placeholder
12. [ ] 토큰 만료 시뮬레이션 — 콘솔에서 `localStorage.setItem('dashboard_bearer_token', 'BROKEN')` 후 새로고침 → 로그인 화면 복귀 (또는 `#products` 진입 시 401 → logout)

회귀 점검:
- [ ] `#dashboard` 의 기존 통계 카드 / 차트 / 검색 / 날짜 필터 / 행 클릭 모달 모두 정상 동작
- [ ] 새로고침 시 현재 해시 유지
- [ ] 잘못된 해시 (`#foo`) → 대시보드 폴백

- [ ] **Step 8.2: README 업데이트**

`README.md` 의 "공구 매출 대시보드" 섹션 (약 25-28 라인 근방) 의 항목 목록 끝에 한 줄 추가:

```diff
 ### 공구 매출 대시보드 (`dashboard.html`)
 - 친한스토어 어드민 REST API 직접 연동
 - 셀러/공구/상품/옵션/커미션 현황 시각화
 - 통계 카드, CSS 바 차트, 상세 테이블, 엑셀/CSV 내보내기
+- 좌측 사이드바 + 해시 라우팅으로 다중 view 지원 (대시보드 / 제품 구좌)
+- "제품 구좌" view: 본인에게 매핑된 공구 가능 제품 조회 (검색/필터/정렬/페이지네이션)
+- 작업 도구 그룹에서 캘린더·이벤트·스터디 페이지로 새 탭 이동
```

`grep -n "공구 매출 대시보드" /Users/kimkyuhyun/workspace/influencer/README.md` 로 정확한 라인 위치를 먼저 확인.

- [ ] **Step 8.3: 최종 커밋**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
docs: note new dashboard sidebar and product slot view in README

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 8.4: PR 전 점검**

```bash
git log --oneline feature/dashboard-products-menu ^main
```

다음 커밋들이 순서대로 보여야 함 (스펙 커밋 + Task 1~8 의 commit 메시지):
- `docs: add spec for dashboard sidebar + product slot menu`
- `feat(dashboard): add sidebar layout with view containers`
- `feat(dashboard): add hash-based router and placeholder views`
- `feat(dashboard): scaffold products view DOM and styles`
- `feat(dashboard): wire products API call with state object`
- `feat(dashboard): render products table with loading/empty/error states`
- `feat(dashboard): bind product view filter/sort/pagination controls`
- `feat(dashboard): add product detail modal (read-only)`
- `docs: note new dashboard sidebar and product slot view in README`

PR 본문 작성과 push 는 사용자 명시 요청을 받은 뒤에 진행 (세션 가이드라인).

---

## Out of Scope (이번 플랜에서 제외)

- 모바일 햄버거 토글 (스펙 §9 에는 있으나 검증 시나리오 핵심이 아니라 후속 작업으로 분리)
- 셀러/매출/고객 view 의 실제 데이터 연동
- 제품 구좌의 수정/액션 (PUT/POST)
- 인플루언서/브랜드/셀러/담당자 ID 필터 (응답에 ID 미포함)
- 자동화 테스트 도입
