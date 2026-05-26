# 핸드오프 문서 — 약사 인플루언서 플랫폼

> 새로 합류한 개발자/운영자가 이 한 문서만 보고도 프로젝트를 이해하고 운영을 이어갈 수 있게 만든 핸드오프 문서.
>
> 마지막 업데이트: 2026-05-26

---

## 1. 한 줄 요약

파마브로스(친한스토어 어드민) 데이터를 기반으로, 약사 인플루언서가 **공동구매·이벤트 운영·SNS 컨텐츠 분석·AI 스터디 운영**을 모두 한 곳에서 처리할 수 있게 만든 **정적 웹 페이지 집합**. 백엔드는 Cloudflare Pages Functions (CORS 프록시 + Apify + 폼 수신) 만 사용하고, 데이터는 친한스토어 REST API + localStorage + Claude for Chrome 브라우저 자동화로 운영된다.

---

## 2. 기술 스택

- **순수 HTML + CSS + JavaScript** (프레임워크/번들러 없음 — 단일 파일 유지가 룰)
- **Cloudflare Pages** (정적 호스팅) + **Pages Functions** (`functions/api/[[path]].js` 라우터)
- **친한스토어 REST API** (캘린더/대시보드 데이터)
- **Apify** (인스타그램 컨텐츠 fetch — 옵션, 비용 있음)
- **Claude for Chrome 확장** (Apify 대안 — 비용 0, 사이드바 자동화)
- **Google Apps Script** (스터디 폼 → Google Sheets 연동)
- **Tesseract.js** (DM 상담 OCR — 한국어, 2-pass)
- **html2canvas / MediaRecorder** (캘린더 PNG·영상 출력)
- **xlsx (CDN)** (엑셀 import/export)

### 빌드 / 의존성
- `npm` 사용 안 함 (테스트용 wrangler 만 npx 로 호출)
- 모든 라이브러리는 CDN 로드
- 단일 파일 규칙 — 각 페이지 = HTML 하나에 CSS + JS 포함 (외부 분리 금지)

---

## 3. 파일 구조

```
influencer/
├── index.html                ← 공동구매 캘린더 (인스타용 1080x1350 이미지 생성)
├── dashboard.html            ← 메인 어드민 (매출 / 제품 / 상담 / 검색 / 공구신청)
├── calendar.html             ← (별도 캘린더 변형 — 백업)
├── event.html                ← 이벤트 당첨자 배송지 입력 폼 (외부 공유용)
├── event-admin.html          ← 이벤트 당첨자 관리 어드민
├── event-raffle.html         ← 엑셀 업로드 + 룰렛 추첨
├── study.html                ← AI 스터디 신청 폼
├── study-admin.html          ← 스터디 관리자 대시보드
├── study-raffle.html         ← A/B 그룹 추첨 룰렛
├── study-curriculum.html     ← 4주 커리큘럼 안내
├── study-skills-practice.html← 비개발자용 실습 가이드 (Xcode/brew/git 설치 가이드 포함)
├── apify-demo.html           ← Apify 토큰/핸들 설정용
├── superpowers-guide.html    ← Claude Code superpowers 소개
├── dasik-may-demo.html       ← 박약다식 5월 영상 시연 (참고용)
│
├── functions/api/
│   ├── [[path]].js           ← 친한스토어 어드민 CORS 프록시 (Bearer JWT 통과)
│   ├── apify                 ← (디렉터리 — Apify 액터 호출)
│   ├── img-proxy.js          ← Instagram CDN 이미지 → 외부 도메인 우회용
│   └── study-submit.js       ← 스터디 신청 폼 수신
│
├── CLAUDE.md                 ← Claude Code 가 항상 로드하는 프로젝트 룰
├── README.md                 ← 사용자 소개용
├── PLAN.md                   ← 초기 계획
├── HANDOFF.md                ← 이 문서
└── .claude/commands/         ← 커스텀 슬래시 명령어 (스킬)
```

### 페이지별 책임 한 줄 요약

| 파일 | 역할 |
|---|---|
| **index.html** | 친한스토어 공구 데이터 → 인스타 4:5 캘린더 이미지 자동 생성. PNG 다운로드. |
| **dashboard.html** | 어드민 메인 — 약사 필터·매출 분석·제품 관리·DM 상담·SNS 검색·공구 신청 자동화 통합 |
| **event-admin.html / event-raffle.html / event.html** | 구매 이벤트 당첨자 관리 — 엑셀 업로드, 룰렛 추첨, 외부 폼 |
| **study-*.html** | 스터디 신청·관리·추첨·커리큘럼·실습 가이드 |
| **functions/api/[[path]].js** | 친한스토어 어드민 REST API CORS 프록시 (브라우저에서 직접 호출 못하므로 경유) |

---

## 4. dashboard.html 메인 메뉴 구조

좌측 사이드바 그룹 + 메뉴(`#hash`):

| 그룹 | 메뉴 | hash | 상태 |
|---|---|---|---|
| 공동구매 | 일정 관리 | `#schedule` | ✅ |
| 공동구매 | 제품 관리 | `#products` | ✅ |
| 공동구매 | 매출 관리 | `#sales` | ✅ |
| 공동구매 | 파트너 관리 | `#sellers` | WIP |
| 고객관리 | 이벤트 당첨자 | (외부 링크: event-admin.html) | ✅ |
| 고객관리 | 개인 상담 | `#consult` | ✅ |
| 컨텐츠 관리 | 인스타그램 | `#contents` | ✅ |
| 컨텐츠 관리 | 인스타 해시태그 검색 | `#ig-search` | ✅ |
| 컨텐츠 관리 | 🧵 스레드 검색 | `#threads-search` | ✅ |
| 직원 관리 | 직원 / 근태 | `#staff` / `#attendance` | WIP |

라우터: `function router()` 가 `location.hash` 의 `?` 앞부분만 view 이름으로 매칭 (예: `#threads-search?_thd=...` → `threads-search`). `VALID_VIEWS` 배열로 화이트리스트.

---

## 5. 핵심 통합 패턴

### 5.1. 친한스토어 어드민 API (Bearer JWT)

- `localStorage[dashboard_bearer_token]` 에 토큰 저장 (캘린더·대시보드 공유)
- ID/PW + Slack 2FA 로 로그인 → JWT 발급 → 헤더에 `Authorization: Bearer ...`
- CORS 우회 위해 `functions/api/[[path]].js` 가 친한스토어로 proxy
- 상태 코드 필터 — 캘린더에서는 T4/T6/T8/Y0 만 표시 (확정·진행중·완료·정산대기)

### 5.2. Claude for Chrome 통합 (Apify 대안)

3가지 자동화 흐름 모두 동일한 패턴 사용:

| 흐름 | 진입점 | 결과 받는 함수 |
|---|---|---|
| 🛒 공구 신청 자동화 | `openGpApplyModal(row)` | (어드민 navigate back + dashboard 결과 토스트) |
| 🔍 인스타 해시태그 검색 | `runIgSearch()` | `window.receiveInstagramResults(data)` |
| 🧵 스레드 검색 | `runThreadsSearch()` | `window.receiveThreadsResults(data)` |
| 💬 DM 상담 분석 | (Claude 사이드바 분석 버튼) | `consult-summary` textarea |
| 📊 이벤트 당첨자 추출 | (게시물 URL → 댓글 추출) | event-admin 어드민 |

**공통 4원칙** (속도 최적화 — 모든 프롬프트에 명시):
1. **로그인 탭 재사용** — 이미 로그인된 같은 도메인 탭 있으면 재사용
2. **URL 직접 접근** — 검색창 타이핑 X, URL 쿼리로 바로 진입
3. **get_page_text + find 병렬** — 시각 인식 대신 텍스트·DOM 일괄
4. **browser_batch 일괄** — navigate→대기→추출→복귀 한 묶음

**금지 항목** (프롬프트에 명시):
- `take_screenshot` / `read_image` / 시각 인식
- 게시물 클릭 / 상세 진입 / 댓글 펼치기
- 글자 한 자씩 타이핑 시뮬레이션 → `.value = ...` + `dispatchEvent("input")` 강제

### 5.3. Claude → dashboard 결과 전달 (URL hash 방식)

Cloudflare 가 큰 query string 을 431 로 막아서 **URL hash 안에 base64(JSON)** 으로 전달:

```
threads.net 에서 JS 실행 후:
  location.assign('dashboard.html#threads-search?_thd=<base64>')

dashboard 페이지 로드 직후 (IIFE 안):
  - location.hash 의 ?_thd= 잡아서 디코딩
  - receiveThreadsResults(data) 직접 호출
  - history.replaceState 로 URL 정리
```

해시는 **서버로 전송 안 됨** → 431 회피 + 데이터 크기 사실상 무제한.

### 5.4. localStorage 키 목록 (주요)

| 키 | 용도 |
|---|---|
| `dashboard_bearer_token` | 친한스토어 JWT |
| `dashboard_admin_email` | 로그인 ID (약사 이메일) |
| `INFLUENCER_FILTER` | 약사명 필터 (제품/매출 공유) |
| `dm_consult_*` | DM 상담 (목록/필터/편집중) |
| `ig_search_history`, `ig_search_current`, `ig_search_snapshots`, `ig_search_mode` | IG 검색 |
| `threads_search_history`, `threads_search_current`, `threads_search_snapshots`, `threads_search_mode`, `threads_search_last_form`, `threads_search_pending` | 스레드 검색 |
| `gp_admin_credentials` | 공구 신청 자동화 — admin ID/PW (base64 obfuscation, **암호화 X**) |
| `gp_apply_defaults` | 공구 신청 폼 마지막 입력값 |
| `apify_demo_token`, `apify_demo_handle` | Apify 옵션 사용 시 |
| `study_script_url` | 스터디 폼 Google Apps Script URL |
| `study_submissions` | 스터디 신청 캐시 |
| `winner_extract_*` | 댓글 당첨자 추출 캐시 |

---

## 6. 자격증명 / 시크릿

### 6.1. dashboard.html 안에 하드코딩 (현재 상태)

```js
var GP_DEFAULT_EMAIL = 'product.pharmabros@gmail.com';
var GP_DEFAULT_PASSWORD = 'fp.pharmabros1!';
var GP_HARDCODED_PRODUCT_NAME = '보령 간엔포스M 액상 밀크씨슬';  // 테스트용 — 운영시 제거 권장
```

> ⚠️ **주의**: 정적 파일이라 누구나 view-source 로 볼 수 있음. staging 자격증명만 두고, 운영 시 별도 인증 게이트(예: Cloudflare Access) 검토 필요.

### 6.2. Cloudflare Pages 시크릿 (.dev.vars / Pages 환경변수)

- `STUDY_SCRIPT_URL` — 스터디 폼 Google Apps Script Webhook
- `APIFY_TOKEN` — Apify 호출용

`wrangler whoami` 로 OAuth 로그인 상태 확인. 계정: `Anthony@pharma-bros.com's Account`.

### 6.3. 친한스토어 어드민 토큰

- 사용자가 UI 에서 직접 로그인 → JWT 받음 → localStorage 저장. 코드에 토큰 하드코딩 절대 X.
- 2FA 는 Slack 채널로 코드 발송 → 사용자가 입력.

---

## 7. 배포

### 7.1. 운영 배포 (Cloudflare Pages)

```bash
npx wrangler pages deploy . \
  --project-name=influencer \
  --commit-dirty=true \
  --branch=main \
  --commit-message="ascii 한정 — 한글 포함시 cloudflare 가 431"
```

> 커밋 메시지에 한글/이모지 들어가면 Cloudflare API 가 `Invalid commit message, it must be a valid UTF-8 string` 으로 거부 → 무조건 영문 한 줄 권장.

배포 후:
- 프로덕션: https://influencer-p68.pages.dev
- 미리보기 (deploy 별): https://<hash>.influencer-p68.pages.dev

### 7.2. 로컬 개발 서버

```bash
npx wrangler pages dev . --port 8888 --compatibility-date=2025-05-01
```

- http://localhost:8888/dashboard.html
- functions/api 도 같이 동작
- **메모리 누수 주의**: 장시간 켜두면 wrangler 가 OOM 으로 죽음 → 재시작 필요 (`pkill -f "wrangler pages dev . --port 8888"`)

---

## 8. 주요 기능 사용법 (운영 매뉴얼 요약)

### 8.1. 공구 캘린더 PNG 만들기 (index.html)

1. 로그인 → JWT 자동 저장
2. 월 선택 → 자동 fetch
3. 제품명·설명·배지 인라인 편집 (contenteditable)
4. 우측 "PNG 다운로드" → html2canvas → 인스타용 1080x1350 이미지

주의:
- pseudo-element 사용 금지 (`::before`/`::after`) — html2canvas 호환 안 됨
- 이미지 CORS 우회 — canvas/fetch/corsproxy.io 3단계 fallback

### 8.2. 공구 신청 자동화 (dashboard.html#products)

1. 제품 관리 진입 → 약사 필터 자동 적용
2. 각 행의 🛒 공구 신청 버튼 클릭
3. 모달 — 자격증명 마스킹된 채 자동 채워짐 + 샘플 폼 기본값 자동 채움
4. "🤖 Claude 명령 생성" 클릭 → 토스트
5. ⌥A → ⌘V → Enter (Claude for Chrome 사이드바)
6. Claude 가 stg-admin 어드민에서 자동 신청 → 완료 후 `#products` 로 복귀

### 8.3. 스레드 검색 (#threads-search)

3가지 모드:
- ⚡⚡ **초고속** (기본) — DOM 일괄 JS + 페이징 + URL hash 전송. 5건 ≈ 10~15초
- ⚡ **빠름** — 메트릭까지 (좋아요/답글/리포스트)
- 📸 **이미지 캡처** — 메인 미디어 base64 캡처

결과 정렬: **좋아요 내림차순** (동률은 date 최신순)

### 8.4. 이벤트 당첨자 관리 (event-admin.html)

- 엑셀 업로드 — `이벤트명/응답일시/이름/연락처/인스타아이디/우편번호/배송지/당첨상품/발송상태/메모` 컬럼
- 룰렛 추첨 (event-raffle.html)
- 댓글에서 당첨자 핸들 추출 (Claude 사이드바)

### 8.5. DM 상담 관리 (#consult)

- 인스타 DM 스크린샷 붙여넣기 → Tesseract.js 한국어 OCR (2-pass)
- 또는 ChatGPT/Claude 에서 요약 후 붙여넣기 → 자동 태그 추출
- "🤖 Claude 사이드바로 분석" 으로 자동 요약·태그·답변 분리

---

## 9. 코드 스타일 / 규칙

CLAUDE.md 에 정리된 규칙 재확인:

- **단일 파일 유지** — HTML 하나에 CSS + JS, 외부 파일 분리 금지
- **빌드 없음** — 모든 라이브러리는 CDN
- **토큰 하드코딩 금지** (단, 현재 GP_DEFAULT_* 만 예외 — 보안 위험)
- **CSS 변수** — `--accent` (RGB), `--accent-hex` (HEX)
- **pseudo-element 사용 금지** — html2canvas 호환성 문제
- **contenteditable 에는 `spellcheck="false"`** 필수
- **TDZ 회피** — IIFE 안에서 router/checkSavedToken 이 동기 호출 → 변수는 `var` 사용 (특히 consult/GP/threads 영역)
- **window.X = function** — inline `onclick` 에서 호출되는 함수는 반드시 window 에 노출

---

## 10. 알려진 이슈 / 한계

| 이슈 | 영향 | 대응 |
|---|---|---|
| Cloudflare 가 한글 커밋 메시지 거부 | 배포 실패 | `--commit-message` 영문으로 명시 |
| wrangler OOM (장시간 dev 서버) | 8888 응답 없음 | 프로세스 kill 후 재시작 |
| Instagram/Threads 가 자동 수집 차단 | rate limit / captcha | 분당 1~2건 이내, 본인 평소 사용 계정 유지 |
| URL query string 큰 데이터 | 431 에러 | URL hash 안에 base64 (이미 적용) |
| localStorage 한도 (~5~10MB) | IG/Threads 스냅샷 캡처 시 빠르게 참 | 자동 LRU 트림 (오래된 50% 컷) |
| Claude for Chrome 시각 인식 사용시 | 매우 느림 (3분+) | 프롬프트에 take_screenshot 금지 명시 |
| GP credentials 하드코딩 | XSS 시 노출 가능 | staging 만 사용, 운영 시 Cloudflare Access 등 게이트 |

---

## 11. 최근 작업 이력 (2026-05 기준 직전 세션)

| 일자 | 작업 |
|---|---|
| 2026-05-26 | 스레드 검색에 ⚡⚡ 초고속 모드 (DOM 일괄 + 페이징 + URL hash) |
| 2026-05-26 | 인스타 검색 동일 초고속 모드 추가 (기본값 변경) |
| 2026-05-26 | 공구 신청 자동화 — 완료 후 `#products` 자동 복귀 |
| 2026-05-26 | URL hash 기반 cross-origin 데이터 전달 (431 회피) |
| 2026-05-26 | Threads 메트릭 한국어 집계 텍스트 정규식 매칭 (좋아요/답글/리포스트 정확 분리) |
| 2026-05-26 | UI chrome 제외 (팔로우/인증된 계정/더 보기) |
| 2026-05-26 | 제품 관리에 약사 드롭다운 필터 + 클라이언트 페이징 |
| 2026-05-26 | 공구 신청 모달 — 자격증명 마스킹, 샘플 폼 자동 채움, JS 일괄 폼 채움 |
| 2026-05-26 | view-products 8번째 컬럼 + 🛒 공구 신청 버튼 |
| 2026-05-25 | 이벤트 당첨자 추첨 + DM 상담 + IG 해시태그 검색 + 영상 |

`git log --oneline` 으로 더 자세한 이력 확인.

---

## 12. 다음 작업 후보 (in-tray)

- 운영 환경 인증 게이트 (Cloudflare Access) 검토 — GP credentials 보호
- IG/Threads 검색 결과 export (Excel)
- 공구 신청 자동화 — 다중 제품 일괄 (현재 1제품 1신청)
- 우편번호 자동 검색 API 연동 (다음/카카오)
- 매출 대시보드 — 분기별 트렌드 그래프

---

## 13. 도움 / 연락

- 주 작성자: Anthony (anthony@pharma-bros.com)
- Cloudflare 계정: `Anthony@pharma-bros.com's Account` (`890191432104561dc983f1983053bb57`)
- GitHub: `kimkh10/influencer`
- 슬랙: 친한스토어 채널 (2FA 코드)

문서·코드 의문점은 `git log` + 각 함수 위 주석 + CLAUDE.md 의 단일 파일 규칙 확인 후 작업.
