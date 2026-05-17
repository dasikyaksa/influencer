# 공동구매 캘린더 & AI 스터디 플랫폼

Google Spreadsheet 기반 인스타그램용 공동구매 캘린더 이미지 생성기와 AI 그룹 스터디 운영 플랫폼입니다.

## 미리보기

- 프로덕션 URL은 본인의 Cloudflare Pages 프로젝트명에 따라 달라집니다 (예: `https://<your-project>.pages.dev`).

## 기능

### 공동구매 캘린더 (`index.html`)
- Google Sheets API를 통해 스프레드시트 데이터 실시간 연동
- 인스타그램 최적 비율(4:5) 캘린더 자동 생성
- 제품명, 설명, 배지(HOT 등) 인라인 편집
- 테마 색상 커스텀 변경
- PNG 이미지 다운로드
- 제품 클릭 시 판매 링크 이동
- 모든 설정 localStorage 자동 저장

### AI 스터디 (`study.html`, `study-admin.html`, `study-curriculum.html`)
- 스터디 신청 폼 (Google Apps Script → Google Sheets 연동)
- 관리자 대시보드 (신청자 조회 및 관리)
- 커리큘럼 안내 페이지 (4주 과정)

### 공구 매출 대시보드 (`dashboard.html`)
- 친한스토어 어드민 REST API 직접 연동
- 셀러/공구/상품/옵션/커미션 현황 시각화
- 통계 카드, CSS 바 차트, 상세 테이블, 엑셀/CSV 내보내기
- 좌측 사이드바 + 해시 라우팅으로 다중 view 지원 (대시보드 / 제품 구좌)
- "제품 구좌" view: 본인에게 매핑된 공구 가능 제품 조회 (검색/필터/정렬/페이지네이션)
- 작업 도구 그룹에서 캘린더·이벤트·스터디 페이지로 새 탭 이동

## 시작하기

### 1. 사전 준비

1. [Google Cloud Console](https://console.cloud.google.com)에서 프로젝트 생성
2. **Google Sheets API** 활성화
3. **사용자 인증 정보 → API 키** 생성
4. 스프레드시트 공유 설정: **"링크가 있는 모든 사용자 — 뷰어"**

### 2. 스프레드시트 컬럼 구조 (A~H)

| 컬럼 | 내용 |
|------|------|
| A | 공구번호 |
| B | 공구타이틀 |
| C | 상품명 |
| D | 공구시작일시 (예: 2026-04-06 00:00:00) |
| E | 공구종료일시 |
| F | 판매링크 URL |
| G | 공구 상태코드 |
| H | 썸네일이미지 URL |

### 3. 실행

> ⚠️ **로컬 개발은 반드시 wrangler로 실행하세요.**
> `python -m http.server`, `npx serve`, VSCode Live Server 등 다른 정적 서버로 띄우면
> `/api/*` 프록시(Cloudflare Pages Functions)가 동작하지 않아 친한스토어 API 호출 시
> CORS 오류가 발생합니다. 프로덕션과 동일한 환경을 보장하기 위해 wrangler 사용이 표준 컨벤션입니다.

**최초 1회 (저장소를 clone 받은 직후):**
```bash
# Node.js 18+ 필요
npm install

# 환경변수 템플릿 복사 후 본인 값으로 수정
cp .dev.vars.example .dev.vars
# .dev.vars 를 열어 STUDY_SCRIPT_URL 등 실제 값 입력
```

> `.dev.vars` 는 `.gitignore` 에 포함되어 커밋되지 않습니다.
> 프로덕션 배포 시에는 Cloudflare Pages 대시보드 > **Settings > Environment variables** 에서 동일 키로 등록하세요.

**로컬 개발 서버 기동:**
```bash
npm run dev
# → http://localhost:8788 에서 정적 파일 + functions/* 프록시 동시 서빙
```

내부적으로 `wrangler pages dev . --port 8788` 을 실행합니다.
글로벌 설치 불필요 — `devDependencies`의 wrangler가 사용됩니다.
`functions/api/[[path]].js`(친한스토어 프록시)와 `functions/api/study-submit.js`(스터디 폼 프록시)가
프로덕션과 동일하게 동작합니다.

**Cloudflare Pages 배포:**
```bash
CLOUDFLARE_API_TOKEN=<토큰> npm run deploy
```

> `npm run deploy` 스크립트는 `--project-name=influencer` 로 고정되어 있습니다.
> 본인의 Cloudflare Pages 프로젝트명에 맞게 `package.json` 의 `scripts.deploy` 값을 수정해서 사용하세요.

### Apify 인스타그램 연동 (선택)

대시보드의 "이번 달 컨텐츠 / 누적 조회" metric 과 "최근 인스타 포스트" panel 은 [Apify](https://apify.com) 의 `apify/instagram-scraper` Actor 를 통해 본인 인스타 피드를 가져옵니다.

1. [Apify console](https://console.apify.com/account/integrations) 에서 API 토큰 발급
2. `.dev.vars` 에 `APIFY_TOKEN=apify_api_xxx` 추가 (로컬 개발)
3. 프로덕션은 Cloudflare Pages 대시보드 > Settings > Environment variables 에 동일 키 등록
4. 대시보드 우측 상단 "📷 인스타 설정" 버튼에서 본인 인스타 핸들 입력 (localStorage 저장)

토큰을 설정하지 않으면 컨텐츠 metric 카드는 "—" 로 유지되고 panel 은 안내 메시지를 표시합니다.

### 4. 사용법

1. 페이지 상단에 **API 키**와 **스프레드시트 URL** 입력
2. **적용** 클릭 → 캘린더 자동 생성
3. 텍스트 클릭하여 제품명/설명/배지/타이틀 편집
4. 테마 컬러 피커로 색상 변경
5. **이미지 저장** → PNG 다운로드
6. 인스타그램에 업로드

## 프로젝트 구조

```
influencer/
├── index.html              ← 공동구매 캘린더 (메인 앱)
├── study.html              ← AI 스터디 신청 폼
├── study-admin.html        ← 스터디 관리자 대시보드
├── study-curriculum.html   ← 스터디 커리큘럼 안내 페이지
├── dashboard.html          ← 공구 매출 대시보드
├── CLAUDE.md               ← Claude Code 설정
├── PLAN.md                 ← 프로젝트 플랜
└── README.md               ← 이 파일
```

## 기술 스택

- 순수 HTML + CSS + JavaScript (프레임워크 없음)
- Google Sheets API v4
- Google Apps Script (폼 데이터 저장)
- html2canvas (PNG 변환)
- Google Fonts (Noto Sans KR, Cormorant Garamond)
- Cloudflare Pages (정적 배포)

## 라이선스

MIT
