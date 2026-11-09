# 두고 클래스 — 강사가 운영하는 강의 플랫폼

한 화면(`index.html`) 안에 여러 영역이 있습니다. **대표 주소 `https://www.doogoclass.com/` 은 두고클래스 VOD 스토어**, 두잉고(강사용 기수 운영 플랫폼) 소개는 `/doinggo` 입니다.

정식 주소(www.doogoclass.com · *.vercel.app)는 **‘#’ 없는 주소**를 씁니다 — `/vod/p/v5` · `/doinggo` · `/center/master` · `/login` · `/terms`. 아래 표의 `#/…` 는 화면 코드 안의 이름이고, 주소창에서는 `#` 없이 보여요(`route.js`). 예전 `/#/…` 링크로 들어오면 자동으로 바뀝니다. 미리보기(claude.ai) · 정적 서버 · 파일로 열면 예전처럼 `#` 주소를 씁니다.

| 영역 | 주소 | 로그인 | 디자인 |
|---|---|---|---|
| 두고클래스 스토어 (VOD · 전자책 · 종이책 · LIVE) | `/` · `/vod…` (`vod.js` · `vod.css`) | 이메일 가입 · 로그인(서버 `api/vod-auth`) · 카카오 1초 가입(키를 넣으면) | 패스트캠퍼스 · 긱스쿨 느낌의 레드 스토어 |
| 두잉고 소개 | `/doinggo` (`home.js`) |
| 약관 및 정책 | `/terms` · `/privacy` · `/refund` (`vod.js` `pageLegal` · 글은 `legal.js`) | 로그인 없이 공개 — 탭 3개, 탭마다 따로 주소(PG 심사 · 공유용) · 환불 표는 마스터 › 환불 · 취소 관리 설정 그대로 | 스토어와 같은 레드 | 로그인 없이 공개 | 스낵클 레드 |
| 수강생 센터 | `#/login`, `#/home` … | 강사 선택(기억됨) → 이름 + 전화번호 뒷자리 | Wise 구조 + 강사별 색 (문대표 라임 · 황금농부 바이낸스 · 부알남 에어테이블) |
| 강사센터 | `#/center` … | 강사 이름 + 전화번호 뒷자리 | 여기어때 YDS (레드 #F94239). 로그인 왼쪽은 흰 바탕 + 빨강 포인트, 왼쪽 아래에 ‘두고 클래스 페이지 바로가기’ |
| 코치센터 | `#/center` … (강사센터와 같은 주소, 맡은 메뉴만 · LIVE 두잉고 / VOD 두잉고 담당) | 강사센터 로그인 화면의 ‘코치’ 탭 · 코치 이름 + 전화번호 뒷자리 | 여기어때 YDS (로그인 왼쪽 흰 바탕 + 그린 포인트) · 문대표 강의는 뉴질랜드 네이비 |
| 무료강의 페이지 | `#/free/<강사 id>` (예: `#/free/moon`) | 로그인 없이 공개 | doogo.site와 같은 화면 (`doogo-free.css`) |
| 강사 소개 페이지 | `#/p/<강사 id>` (예: `#/p/moon`), 모음 `#/p` | 로그인 없이 공개 · ‘신청하기’는 강사가 정한 링크로 새 창 | 흰 배경 + 강사 색 포인트 (뉴질랜드 테마는 은고사리 · 남십자성) |
| 온드미디어 센터 | `#/center/media` … | 로그인 화면 ‘마스터 · 파트너’ 탭 · 마스터가 만든 아이디 + 비밀번호 (서버는 해시로만 저장) | 여기어때 YDS (레드) |
| 마스터 관리자 | `#/center/master` … | 강사센터 로그인 화면의 ‘마스터 관리자’ 탭 · 서버: 아이디 `doogobiz` + `MASTER_PASSWORD` / 로컬 체험: `ADMIN / ADMIN` (대소문자 무관) | 여기어때 YDS (로그인 왼쪽 흰 바탕 + 레드 포인트 · 차콜 ‘마스터’ 표시) |

프레임워크 없는 HTML/CSS/JS 앱입니다. **Vercel에서는 서버(`api/`) + Supabase(Postgres · 서울) 데이터베이스**에 저장해서 여러 기기·여러 사람이 같은 데이터를 보고, 서버가 없는 곳(로컬 정적 서버, 미리보기)에서는 예전처럼 브라우저 `localStorage`에 저장합니다. 화면은 처음에 `api/bootstrap`이 있는지 보고 스스로 모드를 고릅니다.

## 실행

```bash
python3 -m http.server 4321 --directory class
# http://localhost:4321
```

### 배포 (Vercel)

> Vercel 무료(Hobby) 요금제는 배포 한 번에 서버 함수(저장소 맨 위 `api/*.js`)가 **12개까지**예요. 지금 12개를 다 쓰고 있어서, 새 서버 기능은 새 파일 대신 기존 함수(`admin` · `vod-pay` 등)의 action 으로 붙여요.

Vercel 프로젝트 **doogo-class**는 GitHub 저장소 `sanjipaldo/doogo-class`(두고클래스 전용)에 연결돼 있고, 루트 디렉터리는 **저장소 맨 위**입니다. 맨 위의 파일 몇 개가 두고 클래스로 이어 줍니다. 2026-11-02까지는 여러 작업이 함께 있던 `sanjipaldo/sanjipaldo` 저장소의 `claude/keen-ride-j85f6u` 브랜치였고, 이력은 그대로 옮겨 왔어요.

| 파일 (저장소 맨 위) | 하는 일 |
|---|---|
| `vercel.json` | 빌드 `node class/scripts/db-build.js && node class/scripts/site.js`, 화면 파일은 `class/.site`, 함수 설정. `ignoreCommand` → `class/scripts/ignore-build.sh`: `class/` 폴더가 없는 브랜치(다른 작업)는 빌드하지 않음(Canceled로 표시, 오류 아님) · 화면 · 서버 파일이 안 바뀐 커밋도 건너뜀 · 비교할 직전 배포 커밋을 Vercel 이 받아 온 기록(얕은 복제)에서 못 찾으면 그냥 빌드 (커밋이 많이 쌓인 운영 배포가 ‘bad object’ 로 실패하던 것 — 11/4) |
| `api/*.js` | Vercel 함수 입구. 실제 코드 `class/api/*.js`를 그대로 불러옴 |
| `.vercelignore` | 배포에 필요 없는 폴더(`dist/` · `server/` 등)와 `.env*` 제외 |

`class/scripts/site.js`는 브라우저가 받는 파일만 `class/.site`로 복사합니다(서버 코드 · 빌드 스크립트 · 설명서는 공개하지 않음). 같은 건너뛰기 명령이 Vercel 프로젝트 설정(Ignored Build Step)에도 들어 있어, `vercel.json`이 없는 다른 브랜치도 오류 없이 건너뜁니다.

```bash
# 저장소 맨 위에서
vercel link --yes --project doogo-class   # 새 컴퓨터에서 처음 한 번 (.vercel/ 은 git에 올리지 않음)
vercel deploy --prod                      # 운영 주소에 배포 (보통은 푸시하면 자동)
```

운영 주소: https://doogo-class.vercel.app

운영 주소에 바로 반영되는 브랜치(Production Branch)는 `main`이고, 다른 브랜치는 미리보기 배포(Vercel 로그인 필요)로 올라갑니다. 운영 주소는 로그인 없이 누구나 열 수 있습니다.

### 서버 · 데이터베이스

| 구성 | 내용 |
|---|---|
| 서버 | `api/*.js` — Vercel 함수 (Node). `bootstrap`(데이터 받기·변경 받기) · `sync`(바뀐 부분 저장) · `auth`(로그인) · `public`(수강 신청·무료강의 질문) · `file`(사진·첨부) · `admin`(마스터 초기화 · 복원 · 서버 백업) |
| 데이터베이스 | Supabase Postgres (서울 ap-northeast-2) — 운영 `doogo-prod` · 미리보기 `doogo-staging`. 환경변수 `SUPABASE_DB_URL`(Connect › Transaction pooler › **Shared Pooler** · 포트 6543 · 운영 · 미리보기 따로) · `DB_DRIVER=supabase`. 표는 `app` 스키마(아래 ‘DB 전환’). 2026-11-05 까지는 Turso 였어요(정리함) |
| 저장 단위 | 문서(doc): `meta` · `ins:<강사>` · `content:<강사>` · `cohorts:<강사>` · `stu:<강사>:<학생>` · `prog:<강사>:<학생>` · `inq:<id>`(입점 문의, 마스터만) · `bill:<강사>:<id>`(기수 이용료 신청 · 정산, 마스터 + 그 강사만). 브라우저는 바뀐 부분(경로 + 값)만 보내고 서버가 지금 값 위에 적용해서, 같은 문서의 다른 부분을 동시에 고쳐도 둘 다 남습니다(예: 코치 승인 중 수강생 제출) |
| 사진 · 첨부 | 저장할 때 서버가 `data:` 주소를 떼어 `files` 표에 보관하고 `/api/file?h=…` 주소로 바꿉니다. 공개 페이지 사진은 누구나, 과제 사진은 본인 · 그 강사 · 코치 · 마스터만 볼 수 있습니다 |
| 로그인 | 이름 + 전화번호 뒷자리(마스터는 아이디 `doogobiz`(환경변수 `MASTER_ID` 로 바꿀 수 있음) + `MASTER_PASSWORD` 환경변수, 한글 자판 상태로 친 글자도 같은 자리 영문 글자로 바꿔 비교 — 예: `한글2@` = `gksrmf2@`)를 서버에서만 확인하고, 서명한 토큰을 HttpOnly 쿠키(`dc_s` 수강생, `dc_a` 강사센터)에 담습니다. 15분 안에 8번 틀리면 잠시 막힙니다. 중지된 강사 · 코치, 탈퇴한 수강생은 요청마다 다시 확인해 바로 막습니다 |
| 볼 수 있는 범위 | 방문자: 로그인 화면 · 공개 페이지용 내용만(유료 자료 · 영상 주소 · 전화번호 제외). 수강생: 자기 강사 콘텐츠 + 자기 기록(다른 수강생은 이름 가림, 요청사항은 ‘비공개’ 줄만). 코치: 맡은 강사 데이터(비밀번호 제외), 권한 있는 메뉴만 저장. 강사: 자기 플랫폼 전체. 마스터: 전부 |
| 변경 받기 | 30초마다, 그리고 창으로 돌아올 때 다른 사람의 변경을 받아 화면을 다시 그립니다(입력 중이거나 팝업이 열려 있으면 다음 화면 이동 때) |
| 배포할 때 | 빌드 단계(`scripts/db-build.js`)가 운영 배포에서만: 표 만들기 → **지금 데이터 백업** → 비어 있으면 체험 데이터 → 아직 안 한 일회성 작업(`api/_lib/oneoff.js`) → 새 기본값 채우기(빠진 칸만). 미리보기 배포는 연결만 확인합니다 |

#### 데이터 보존 규칙 (배포해도 올린 내용은 그대로)

- 배포는 **저장된 내용을 지우거나 바꾸지 않습니다.** 새 기능에 필요한 칸이 없을 때만 채웁니다(`seed.js` 의 `fillMissing`: 객체는 없는 키만 더하고, 목록은 항목을 더하거나 빼지 않음). 강사센터에서 지운 공지 · 영상 · 전자책이 배포 후 되살아나지도 않습니다.
- 지우기는 강사센터 · 마스터에서 사람이 직접 지울 때만 일어납니다.
- 데이터를 바꿔 달라는 요청(예: 체험 계정 정리, 서류 가이드 단계 변경)은 `api/_lib/oneoff.js` 에 날짜가 붙은 작업으로 넣습니다. 운영 배포 때 한 번만 실행되고 `oplog` 표에 기록돼 다시 돌지 않습니다. 이미 사람이 고친 내용은 건드리지 않도록 조건을 좁게 잡습니다.
- **실제 운영 시작 (2026-10-31)**: 일회성 작업 `2026-10-31-launch-reset-bills` — ‘기수 신청 · 매출’에서 문대표 것을 뺀 이용료 기록(파트너센터를 처음 열 때 생긴 부알남 · 초이 1기 · 2기 예시 4건)을 지워 이번 달 · 올해 매출이 0원에서 시작해요. 문대표 기록은 예시만 지우고, 지운 기록으로 새로 열린 기수가 수강생 없이 남아 있으면 그 기수도 지워요. 가입한 계정(체험 계정 포함) · 처음부터 있던 기수 · 강사 · 파트너 계정(예시 파트너 · 새 파트너 김나영)은 그대로, 지운 기록으로만 계산된 예시 파트너 지급 기록(`aff-demo:2026-09`)만 지워요. `2026-10-31-moon-4th-cohort` — 문대표 4기를 **2026-11-21(토)부터 4주**(매주 토요일 강의, 수업 시간은 그대로). 두잉고 홈 문대표 카드의 ‘N주 과정’도 모집 중인 기수 기준(4주).
- **예시 계정이 정식 서버에 생기지 않게 (2026-11-01)**: 예전 마스터 화면은 운영자 · 파트너 목록이 비어 있으면 예시 운영자(김매니저 manager · 박정산 finance)와 예시 파트너(하지원 partner) — 모두 비밀번호 = 아이디 — 와 예시 이용료 · 입점 문의를 만들어 서버에도 저장했어요. 이제 서버에 연결된 화면에서는 빈 목록으로 시작하고 예시는 시안(서버 없음)에서만 만들어요(`admin.js` `STAFF` · `AFF` · `seedAffInq`). 운영자 계정은 서버에서 마스터와 같은 권한이라 일회성 작업 `2026-11-01-demo-staff-stop` 이 **비밀번호가 아직 예시 그대로인** 예시 운영자 계정만 중지해요(지우지 않음 · 마스터 › 운영자 계정에서 다시 켤 수 있어요). 예시 파트너는 그대로 두었어요 — 쓰지 않으면 마스터 › 파트너에서 중지하거나 비밀번호를 바꿔 주세요.
- 서버 자동 백업(`backups` 표, 최근 40개): 배포할 때마다 · 초기화나 복원 전에 자동으로 남습니다. 마스터 → 데이터 관리 → ‘서버 자동 백업’에서 목록을 보고 ‘이 시점으로’ 되돌리거나 ‘지금 백업’을 누를 수 있습니다(되돌리기 전 상태도 다시 백업). 사진 · 첨부(`files`)는 초기화해도 지우지 않아 백업으로 되돌릴 때 그대로 보입니다.

환경변수: `MASTER_PASSWORD`(마스터 비밀번호 — Vercel → doogo-class → Settings → Environment Variables 에서 바꾸고 다시 배포), `SESSION_SECRET`(로그인 쿠키 서명 키 — 운영 · 미리보기 따로, 48자 이상 무작위. 바꾸면 모두 한 번 다시 로그인. 운영 · 미리보기에서 없으면 로그인을 막아요 — 누구나 아는 기본 키로 서명하지 않게 · 2026-11-05 Turso 정리 뒤로 예전 Turso 토큰 키는 안 받아요), `SUPABASE_DB_URL` · `DB_DRIVER=supabase`(데이터베이스).

#### DB 전환 준비 — Turso → Supabase 1부 A1 (2026-11-05)

계획서: ‘DB 전환 계획서 · 설계서 (Turso → Supabase)’ 문서. 1부는 지금 표 6개를 Supabase Postgres 의 `app` 스키마에 같은 모양으로 옮기고, 화면 · API 코드는 그대로 둬요.

- **어느 DB 에 붙는지** (A6 Turso 정리 뒤 · 2026-11-05): Vercel(운영 · 미리보기)은 언제나 Supabase · 로컬 개발 · 시험은 `CLASS_SQLITE` 파일이 있으면 SQLite(없거나 `DB_DRIVER=supabase` 면 Postgres) · `DB_DRIVER=turso` 는 분명하게 멈춰요. (A1 때 처음 만든 모양: 비우면 Turso, `supabase` 면 `SUPABASE_DB_URL`(Supabase › Connect › **Transaction pooler**, 포트 6543)의 Postgres). 바꾸는 곳은 `api/_lib/store.js` 하나 — 같은 SQL 을 `pgSql` 이 Postgres 에 맞게만 바꿔요(`?` → `$1` · 표 이름 → `app.표` · 같은 시각 문서는 키를 바이트 순(`COLLATE "C"`)으로 SQLite 와 같은 순서). 문서(`v`)는 글자 그대로(`text`) — 키 순서 · 공백이 한 글자도 안 바뀌어요. 여러 문장(`batch`)은 한 트랜잭션(중간에 실패하면 전부 취소). 연결: npm `postgres` 3.4.9 · 미리 준비한 문장 끔(풀러 트랜잭션 모드) · 함수마다 연결 1개 · 숫자(ms 시각 · 개수)는 숫자로. 다른 점 하나: `LIKE` 가 영문 대소문자를 가려요(키 앞부분은 모두 코드가 만든 같은 글자라 결과는 같아요). `init.js` 가 직접 쓰던 SQL 3곳은 저장소 함수(`insertDocs` · `putSys` · `allDocRows`)로 옮겼어요.
- **로그인 실패 횟수 SQL**: `ON CONFLICT … DO UPDATE` 에서 기존 줄 값을 `rl.n` · `rl.until` 로 (Postgres 는 그냥 `until` 이면 새 줄 값과 헷갈린다고 막아요 · SQLite 도 같은 뜻).
- **쓰기 멈춤 — `DC_READONLY=1`** (운영 전환 당일 복사하는 동안): 문서 · 사진 쓰기는 `503 { error: "readonly" }` + ‘잠시 점검 중’ 안내(`http.js`). 화면은 바뀐 내용을 들고 있다가 30초 안쪽으로 다시 보내서 점검이 끝나면 저장돼요(`db.js` → `main.js` 안내 ‘이 창을 열어 두시면…’). 읽기 · 로그인(실패 횟수 `rl`) · 배포 전 백업(`backups`) · 작업 기록(`oplog`)은 그대로라 점검 중에도 들어가서 확인할 수 있어요. 배포 단계는 백업만 하고 일회성 작업 · 기본값 채우기는 건너뛰어요. 영상 길이 기억(`vdur`)은 점검 중엔 건너뛰고 길이는 그대로 알려 줘요.
- **배포 기록 (A0 확인용 · 읽기만)**: `[db] 사진 · 첨부: N개 · 합계 · 가장 큰 것` · Supabase 를 아직 안 쓰는데 `SUPABASE_DB_URL` 이 있으면 `[db] Supabase 연결 확인: 됐어요 · Postgres 버전 · 지역(ap-northeast-2 = 서울) · 포트 6543(트랜잭션 풀러) · 왕복 ms · app 표 있음/빈 DB` (주소 · 비밀번호는 안 적어요 · 실패해도 빌드는 계속 · 포트가 6543 이 아니면 주의 한 줄). 빌드 끝에 DB 연결을 닫아요(`store.close`).
- **로컬 시험 Postgres — PGlite** (Node 안에서 도는 진짜 Postgres, Docker · 인터넷 없이): `npm --prefix class/scripts/pg ci` (한 번) → `TEST_DB=pg node scripts/vod-test.js` 가 같은 서버 시험을 Postgres 로 돌려요(운영과 같은 `postgres` 드라이버로 TCP 접속 — `scripts/pg/server.js`). 화면 시험은 `E2E_DB=pg E2E_SERVER=next node scripts/e2e/run.js …` — 테스트마다 시험 DB(SQLite)를 옮기기 도구로 PGlite 에 복사해서 서버를 Postgres 로 띄워요. 운영 빌드(Vercel)는 이 폴더를 설치하지 않아요 — 저장소 맨 위 `package.json` 에는 `postgres` 드라이버만.

#### DB 전환 1부 A2 · A3 — Supabase 보안 · 사람이 읽는 보기 · 옮기기 도구 (2026-11-05)

- **보안 (A2 · `api/_lib/pgsetup.js`)**: 배포 때(`DB_DRIVER=supabase`) 한 번씩 · 여러 번 돌려도 같아요. Supabase 공개 API 역할(`anon` · `authenticated` — 브라우저에 주는 키)은 `app` 스키마 · 표 · 보기 · 함수 권한을 모두 빼고, 표 6개 모두 RLS(정책 없음 = 공개 API 로는 한 줄도 안 보여요 · 이미 켜져 있으면 그대로). 우리 서버(표 주인 `postgres`)는 그대로 읽고 써요.
- **사람이 읽는 보기 6개** (Supabase › Table Editor 에서 표처럼 · 읽기만 · 열 이름 한국어 · `security_invoker`): `app.v_orders`(주문번호 · 회원 · 구매자 · 강의 · 결제 금액 · 결제 수단 · 상태 · 포트원 상태 · 주문 · 결제 · 환불 시각) · `app.v_members`(회원 · 가입 경로 · 이름 · 이메일 · 전화 · 포인트 · 마케팅 동의 · 가입일 · 주문 수 — **비밀번호 해시 없음**) · `app.v_students`(강사 · 기수 · 이름 · 상태 · 신청일 — **전화 뒷자리(로그인 숫자) 없음**) · `app.v_cohorts`(기수 목록을 줄로) · `app.v_bills`(이용료 신청 · 입금 · 계산서 · 취소) · `app.v_inquiries`(입점 문의 + 1:1 문의).
- **SQL 파일**: `class/scripts/supabase.sql` = 표 6개 + 보안 + 보기 (Supabase › SQL Editor 에 붙여 돌려도 배포와 같은 결과 · `node class/scripts/pg-sql.js` 로 다시 만들어요 · 시험이 코드와 같은지 확인 · `scripts/` 라 공개 사이트로는 안 나가요).
- **옮기기 도구 (A3 · `scripts/db-move.js`)**: 문서 · 사진(나눠 읽기 — 25개 또는 4MB씩) · 볼 수 있는 범위 · 작업 기록 · 최근 백업 5개를 옮기고 **문서마다 해시**(키 · 글자 · 버전 · 순서 · 바뀐 시각) · 사진마다 해시로 확인 — 하나라도 다르면 실패. 모드: `copy`(받는 쪽이 비어 있을 때만 · 이미 같은 내용이면 확인만) · `sync`(받는 쪽을 먼저 그 DB 백업에 남기고 똑같이 — 되돌리기 전체) · `since:<ms>`(그 뒤 바뀐 것만 — 되돌리기) · `verify`(비교만). 로그인 실패 횟수(`rl`)는 옮기지 않아요.
- **배포 때 옮기기 — `DB_MOVE`**: `turso-to-supabase` · `supabase-to-turso`(sync) · `supabase-to-turso-since:<ms>` · `verify`. 빌드 단계가 다른 일보다 먼저 옮기고 확인 — 실패하면 빌드가 멈춰 그 배포는 올라가지 않아요. **운영에서는 쓰기 멈춤(`DC_READONLY=1`) 배포가 먼저 떠 있어야** 옮겨요(같은 배포에서 켜면 지금 떠 있는 배포가 아직 저장을 받으니까). 옮긴 뒤에는 `DB_MOVE` 를 지워요.
- **안전장치**: 운영에서 Supabase 가 비어 있는데 `DB_DRIVER=supabase` 로 배포하면(옮기기 전) 체험 데이터로 채우지 않고 빌드를 멈춰요.
- 시험: 서버 시험 — SQLite 552개 · Postgres 556개 통과 (시험 데이터 전체를 Postgres 로 · 다시 SQLite 로 옮겨도 한 글자도 안 달라요 · 몰래 바꾼 문서는 잡혀요 · anon 은 표 · 보기 모두 막혀요). 화면 시험 11묶음 190개 — SQLite · Postgres(`E2E_DB=pg`) 둘 다 통과 (A1 완료 기준).
- **환경 변수만 바꾼 뒤 다시 배포**: 빌드 건너뛰기(`scripts/ignore-build.sh` — 화면 · 서버 파일이 그대로면 건너뜀)가 같은 커밋의 다시 배포(Vercel ‘Redeploy’)도 건너뛰어 새 값이 안 들어갔어요(2026-11-05). 이제 **같은 커밋을 다시 배포하면 빌드해요** — 환경 변수를 바꾼 뒤 Redeploy 를 누르면 돼요.
- **Supabase 연결 문자열은 Shared Pooler**: Pro 요금제의 Connect 창은 전용 풀러(Dedicated Pooler · `db.<프로젝트>.supabase.co:6543`)를 먼저 보여 주는데, 이 주소는 IPv6 전용이라 Vercel(IPv4)에서 `ENETUNREACH` 로 안 붙어요. **Transaction pooler › Shared Pooler**(`aws-…-ap-northeast-2.pooler.supabase.com:6543`, 사용자 `postgres.<프로젝트>`) 주소를 넣어요. 배포 기록이 이 경우를 알려 줘요. 비밀번호 인증이 실패하면(`password authentication failed`) 배포 기록 `[db] 고칠 곳:` 줄이 모양만 보고 원인을 알려 줘요 — `[YOUR-PASSWORD]` 글자가 그대로 · 대괄호까지 들어감 · 아이디가 `postgres.<프로젝트>` 가 아님 · `%` 로 주소가 깨짐 · 그 밖엔 비밀번호가 틀림(Project Settings › Database › Reset database password 로 영문 · 숫자 비밀번호를 새로 정해 넣기, 풀러 반영에 몇 분). 비밀번호 · 아이디 글자는 기록에 안 나와요.

#### DB 전환 1부 A4 — 시험용(미리보기)을 Supabase 로 (2026-11-05)

- **연결**: Preview `SUPABASE_DB_URL` = 시험용 Supabase(doogo-staging · 서울 ap-northeast-2) Shared Pooler 6543 — 배포 기록 `Postgres 17.11 · 왕복 178ms`(빌드 서버가 미국 동부라서. 운영 전환 A5 때 서버 함수를 서울 `icn1` 로 옮겨요).
- **옮기기**: Preview 에 `DB_MOVE=turso-to-supabase` + `DB_DRIVER=supabase` 를 넣고 다시 배포 → `[db] 옮기기 Turso → Supabase (copy): 문서 46개 · 작업 기록 31개 · 백업 5개 · 확인: 문서마다 해시 맞음 · 36.7초` → 보안 · 보기 6개 적용 → 미리보기가 Supabase 로 떠요(문서 37개 · 시험용 표시 그대로).
- **복사 뒤 `DB_MOVE` 는 바로 껐어요**(Vercel 에서 Development 로만 남김 — 지워도 돼요). 남겨 두면 다음 미리보기 빌드가 ‘받는 DB 에 이미 문서가 있고 달라요’로 멈춰요(복사는 빈 DB 에만).
- **되돌리기(시험용)**: Preview `DB_DRIVER` 를 지우고 다시 배포 → 미리보기가 시험용 Turso 로(복사는 Turso 를 바꾸지 않아요 · Supabase 에서 고친 내용까지 돌려놓으려면 `DB_MOVE=supabase-to-turso` 로 한 번).
- **되돌리기 리허설 (A3 · 시험용 3번 중 2 · 3번째, 2026-11-05)**: 미리보기에서 저장 확인 뒤 Preview `DB_MOVE` 를 잠깐 바꿔 다시 배포 — ① `supabase-to-turso-since:<복사 직전 ms>` → `Supabase → Turso (since): 문서 5개(복사 뒤 고친 것) · 확인: 문서마다 해시 맞음 · 4.1초` ② `supabase-to-turso` → `Supabase → Turso (sync): 문서 46개 · 작업 기록 31개 · 확인: 문서마다 해시 맞음 · 6.3초`(받는 쪽 Turso 를 먼저 그 DB 백업에). 두 번 모두 미리보기는 계속 Supabase 로 떴고, 끝난 뒤 `DB_MOVE` 는 다시 Development 로. 이제 sync 기록에 ‘받는 쪽 문서 N개 먼저 백업’도 나와요.
- **운영은 그대로 Turso** — DB 를 바꾸는 Production 환경 변수(`DB_DRIVER` · `DB_MOVE` · `DC_READONLY`)는 안 넣었어요.
- **서버 함수 지역 = 서울 `icn1`** (`vercel.json` `regions`, 2026-11-05 · A5): DB(Supabase 서울 ap-northeast-2)와 같은 곳에서 돌아 DB 왕복이 짧아요. Hobby 요금제는 지역 하나만 고를 수 있어요. 빌드는 그대로 미국 동부(iad1)라 배포 기록의 ‘왕복 ms’는 빌드 서버 기준이에요.
- **A5 전 준비 운영 배포 (main `2b7e02d`, 2026-11-05)**: A1~A3 코드를 운영에 먼저 — 운영 Turso 문서 57개 · 배포 전 백업 90개 · 일회성 작업 없음 · **운영 Supabase 연결 확인**(Postgres 17.11 · 서울 · 6543 · 빈 DB) · 서버 오류 0. 이어서 Production `SESSION_SECRET` 을 새로 넣고 같은 커밋을 다시 배포 → 새 로그인은 `SESSION_SECRET` 으로 서명, 그 전 로그인(Turso 토큰 서명)도 그대로 유지. **Turso 토큰(`TURSO_AUTH_TOKEN`)은 2026-12-05 이후에 지워요**(A6 · 그 전에 지우면 그 전에 로그인한 사람이 로그아웃돼요).

#### DB 전환 1부 A5 — 운영을 Supabase 로 (2026-11-05 · 끝)

- **지금 운영 DB = Supabase**(doogo-prod · 서울 ap-northeast-2 · Shared Pooler 6543) · 서버 함수 = 서울 `icn1`. 미리보기 = Supabase(doogo-staging). Turso 는 되돌리기용으로만 남아 있어요(아래 A6).
- **배포 세 번** (정식 오픈 전이라 사용자 없음 · 시간대 상관없이 바로):
  1. Production `DC_READONLY=1` → 다시 배포(main `2b7e02d`) — 저장만 멈춤(503 ‘잠시 점검 중’) · 읽기 · 로그인은 그대로 · 배포 전 백업(Turso 문서 90개).
  2. Production `DB_MOVE=turso-to-supabase` + `DB_DRIVER=supabase` + main `aab922a`(`vercel.json` `regions: ["icn1"]`) → `[db] 옮기기 Turso → Supabase (copy): 문서 90개 · 작업 기록 31개 · 백업 5개 · 확인: 문서마다 해시 맞음 · 51.1초` → 보안 · 보기 6개 · 배포 전 백업(Supabase) · 쓰기 멈춤 그대로.
  3. Production `DC_READONLY=0` + `DB_MOVE=verify` → 다시 배포 → `[db] 비교 Turso ↔ Supabase: 같아요 · 문서 90→90 · 작업 기록 31→31` → 저장 다시 열림. 끝난 뒤 `DB_MOVE` 는 Development 로만(빌드가 안 읽어요 · 지워도 돼요).
- **되돌리기**: 전환 직후에는 Turso 로 되돌릴 수 있었는데, 사용자가 없어 바로 A6 에서 Turso 를 정리했어요(아래). 이제 문제가 생기면 Supabase 백업(Database › Backups · 앱 백업 표 `app.backups` — 배포마다 자동)으로 복구해요.
- **A6 정리**: 원래 Turso 를 2~4주 두려 했지만 정식 오픈 전이라 같은 날(2026-11-05) 바로 정리 — 아래 ‘A6’.

#### DB 전환 1부 A6 — Turso 정리 (2026-11-05)

- **코드**: Turso 연결(`store.js` 의 HTTP 클라이언트) · 배포용 옮기기(`DB_MOVE` · `db-move.js runFromEnv`) · 예전 로그인 키(Turso 토큰으로 만든 키)를 뺐어요. `db-build.js` 는 Supabase 만 — `SUPABASE_DB_URL` 이 없으면 멈추고, 접속 정보(버전 · 지역 · 포트 · 왕복)를 기록하고, 접속이 비밀번호로 실패하면 `[db] 고칠 곳:` 을 알려 줘요. `DB_MOVE` 가 남아 있으면 ‘더 이상 안 써요’ 경고만.
- **로그인**: `SESSION_SECRET` 하나로만 서명 · 확인 — 이 배포 전에 예전 키로 로그인했던 사람은 한 번 다시 로그인.
- **남긴 것**: 로컬 개발 · 시험용 SQLite(`CLASS_SQLITE` · `node:sqlite` — 서버 시험 · 화면 시험이 SQLite · Postgres 둘 다로 돌아요) · `db-move.js`(SQLite ↔ Postgres 복사 · 확인 — 화면 시험이 쓰고, `SUPABASE_DB_URL=… node scripts/db-move.js supabase sqlite:backup.db copy` 로 Supabase 를 내 컴퓨터 파일로 받아 둘 수도 있어요) · `DC_READONLY`(점검 때 저장 멈춤).
- **운영 배포 · 정리 끝 (2026-11-05)**: main `d0d020e` 운영 배포(Supabase · 서울 `icn1` · 서버 오류 0) → Vercel Storage 에서 Turso 연결 해제(`TURSO_DATABASE_URL` · `TURSO_AUTH_TOKEN` 빠짐) → Supabase › Database › Backups 확인 → Turso DB `doogo-class-db` · `doogo-class-staging` 삭제. Turso 연동(Integration) 자체는 두고푸드(`doogofood-db`)가 써서 남겨 뒀어요. 남은 `DB_MOVE` · `DC_READONLY` 환경 변수도 지웠어요(점검 때 저장을 멈추려면 Production 에 `DC_READONLY=1` 을 다시 넣고 배포).

#### DB 전환 2부 B1 — 사진 · 첨부 내용을 Supabase Storage 비공개 버킷으로 (2026-11-05)

- **무엇이 바뀌나**: 파일 목록(`app.files`) · 볼 수 있는 범위(`app.file_scopes`)는 그대로 DB 에, **내용(바이트)만** Supabase Storage 비공개 버킷 `class-files` 에 둬요(`api/_lib/blob.js` — 의존성 없이 Storage REST API 를 `fetch` 로). 주소는 예전 그대로 `/api/file?h=해시` — 서버가 범위(pub · adm · vodp:클래스)를 확인한 뒤 Storage 에서 꺼내 보내요(버킷은 비공개 · 공개 주소 없음). DB 의 `files.b64` 가 `''` 이면 ‘내용은 Storage 에’, 차 있으면 예전처럼 DB 에서 바로.
- **스위치 = 되돌리기**: `FILES_STORE=supabase` 일 때만 새로 올리는 파일을 Storage 에 둬요. 끄면 새 파일은 다시 DB 에(이미 Storage 에 있는 파일은 계속 Storage 에서 읽어요). 완전히 되돌리려면 `FILES_MOVE=to-db` 로 한 번 배포(Storage → DB · 파일마다 크기 확인) — `files` 표는 그대로라 언제든 돌아갈 수 있어요.
- **환경 변수** (Vercel · Preview(doogo-staging) · Production(doogo-prod) 따로):

  | 이름 | 값 | 비고 |
  |---|---|---|
  | `SUPABASE_URL` | `https://<프로젝트>.supabase.co` | Supabase › Project Settings › Data API(또는 API) › Project URL |
  | `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 비밀 키 | Supabase › Project Settings › API Keys › `secret`(sb_secret_…) 또는 예전 `service_role` · **Sensitive** 로 · 채팅 · 저장소에 붙이지 않기 |
  | `FILES_STORE` | `supabase` | 영역 스위치 (없으면 예전처럼 DB) |
  | `FILES_BUCKET` | (선택) 기본 `class-files` | 배포 때 없으면 비공개(5MB 한도)로 만들어요 |
  | `FILES_MOVE` | `to-storage` · `to-db` · `verify` | 한 번만 — 이미 있는 파일 옮기기 · 확인. 끝나면 지워요 (운영 · 시험용 DB(DB_ROLE=staging)에서만, `verify` 는 어디서나) |

- **옮기기** (`scripts/files-move.js` · 배포 빌드가 `FILES_MOVE` 를 보고 돌려요 · 로컬 `node scripts/files-move.js <to-storage|to-db|verify>`): `to-storage` 는 파일마다 Storage 에 올리고 → 다시 받아 바이트가 같은지 확인한 뒤에만 DB 의 b64 를 비워요(그 사이 바뀌었으면 그대로). `verify` 는 Storage 표시 파일이 모두 Storage 에 있고 크기가 맞는지. 하나라도 맞지 않으면 빌드가 멈춰요.
- **배포 빌드 기록**: `[db] 사진 · 첨부: n개 · … · 내용이 DB a개 · Storage b개` · `[db] Storage 버킷 class-files: 비공개 · 새 파일 내용은 Storage 에 (FILES_STORE=supabase)`. 버킷이 공개(public)로 바뀌어 있으면 **빌드를 멈춰요**(범위 확인을 건너뛰게 되니까). 키 · 주소는 기록에 안 남겨요.
- **Storage 가 고장 나면**: 올리기 503 `storage`(‘잠시 뒤 다시 올려 주세요’ · DB 에 빈 목록도 안 생겨요) · 받기 503. 키는 새 `sb_secret_…`(apikey 칸만) · 예전 service_role JWT(Authorization 도) 둘 다 돼요.
- **시험**: 서버 시험 38번(가짜 Storage `scripts/fake-storage.js` — 버킷 만들기 · 범위별 받기 · 같은 파일 다시 안 올림 · 옮기기 · 사라진 파일 잡기 · 되돌리기 · 고장 · 키 두 종류 · 배포 빌드(진짜 HTTP)) · 화면 시험 `E2E_FILES=storage node scripts/e2e/run.js`(시험 DB 의 파일 내용을 모두 가짜 Storage 로 옮기고 서버를 `FILES_STORE=supabase` 로 — 화면이 보는 사진 · 첨부가 전부 Storage 에서 와요).
- **순서**: ① 미리보기에 `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY`(doogo-staging) · `FILES_STORE=supabase` → 미리보기 배포(버킷 생김 · 비공개 확인) → 사진 올려 보기 ② `FILES_MOVE=to-storage` 로 미리보기 한 번(시험용 DB) → `FILES_MOVE=verify` ③ 운영도 같은 순서(doogo-prod 키 · 운영 배포는 따로 여쭤봐요).

#### DB 전환 2부 B2~B6 — 문서 종류마다 제 표 (2026-11-05)

- **무엇이 바뀌나**: 지금까지 거의 모든 데이터가 `docs` 표 한 곳에 JSON 문서로 있었어요. 이제 문서 종류마다 제 표가 있어요 (`api/_lib/areas.js`):

  | 영역 | 문서 → 표 (한 건씩 표) |
  |---|---|
  | B2 주문 · 결제 | `vo:` → `orders` · `vpay:` → `payments` (`payment_orders`) · `vbank` → `bank_log` (`bank_deposits`) |
  | B3 DOOGO CLASS 회원 | `vm:` → `members` (`member_coupons` · 2026-11-08) · `vme:` · `vmk:` → `member_logins` · `vp:` → `vod_progress` (`vod_progress_items`) |
  | B4 두잉고 강의실 | `ins:` → `instructors` (`coaches`) · `cohorts:` → `cohort_lists` (`cohorts`) · `stu:` → `students` · `prog:` → `progress` · `content:` → `contents` |
  | B5 이용료 · 문의 · 후기 · 지급 | `bill:` → `bills` · `inq:` → `partner_inquiries` · `vq:` → `member_inquiries` · `vr:` → `reviews` (후기 글 · 베스트 열 · 2026-11-08) · `vpl:` → `pledges` (숨김 · 베스트 열) · `vpo:` → `payout_lists` (`payouts`) |
  | B6 설정 · 상품 · 쿠폰 · 운영자 | `meta` · `vcat` · `vdur` · `vstat` · `vmsg` · `vupd` → `settings` (`products` — 상세 맨 위 영상 주소 `teaser` 열 · 2026-11-08 · `coupons` · `banners` · 2026-11-08 · `staff` · `partner_payouts`) |

  표 한 줄 = 문서 하나: `v` 는 예전 문서 글자 **그대로**(화면 · API 가 받는 모양이 한 글자도 안 바뀌어요) + 사람이 읽고 찾고 더하는 값은 열(금액 · 상태 · 회원 · 시각 …). 열과 한 건씩 표는 저장할 때마다 같은 트랜잭션에서 `v` 로 다시 만들어 어긋나지 않아요. 비밀번호 · 해시 · 로그인 숫자(전화 뒷자리)는 열로 꺼내지 않아요. Supabase › Table Editor 에서 표 · 열 이름 옆에 한국어 설명이 보여요. `docs` 에는 `sys` 처럼 영역이 없는 문서만 남아요.
- **바꾼 곳은 저장소 하나**: `store.js` 의 함수들(getDocs · listDocs · writeDoc · insertDocs · backup · restore …)이 키를 보고 docs 또는 제 표로 보내요(문서 ↔ 표 어댑터). 화면 · API · 일회성 작업 코드는 그대로.
- **영역 스위치 `DB_AREAS`** (Vercel 환경 변수 · 예: `all:dual` · `B2:table,B3:dual`): `off`(기본 · 예전처럼) → `dual`(같이 쓰기 · 읽기는 docs) → `table`(같이 쓰기 · 읽기는 제 표) → `only`(제 표에만 · docs 의 그 문서는 배포 때 지움). **한 칸씩만** — 배포하는 동안 예전 서버 함수가 쓰는 내용을 놓치지 않게, 배포 빌드가 지난 칸(`area_state` 표)을 기억해 건너뛰면 멈춰요.
- **배포 빌드** (`api/_lib/areasync.js`): 칸 건너뛰기 확인 → 배포 전 백업 → 영역마다 docs ↔ 제 표 맞추기(버전이 높은 쪽으로 · 같은 버전인데 내용이 다르면 고치지 않고 **멈춤**) → 열 · 한 건씩 표 다시 → `only` 면 docs 정리 → 비교(문서 수 · 글자 · 버전 · 열)를 기록 (`[db] 2부 B2 주문 · 결제: dual · orders docs 12 = 표 12 · … · 맞음`). 미리보기 · 쓰기 멈춤 중에는 비교만. 로컬: `node scripts/areas.js status|verify|sync`.
- **되돌리기**: 한 칸씩 거꾸로 (`only` → `table` 이면 배포 때 표 → docs 로 다시 채워요 → `dual` → `off`). 시험에서 only 에서 쓴 내용까지 off 로 돌아와도 그대로인 것을 확인해요.
- **보기(v_orders …)**: docs 와 제 표 중 버전이 높은 쪽을 읽어서 스위치가 어느 칸이든 같은 결과. 표 35개 모두 RLS · 공개 API 역할은 막혀 있어요.
- **시험**: 서버 시험 전체(578개)를 `DB_AREAS=all:off · dual · table · only` × SQLite · Postgres 로 · 39번은 실제 시험 데이터를 off → dual → table → only → off 로 옮기며 칸마다 내용 비교 · 칸 건너뛰기 · 내용 다름 멈춤 · 열 · 한 건씩 표 · only 에서 쓰기 · 버전 충돌 · 백업 · 되돌리기 · 배포 빌드. 화면 시험 `E2E_AREAS=all:only node scripts/e2e/run.js`.
- **순서**: 미리보기(시험용 DB) `DB_AREAS=all:dual` → `all:table` → `all:only` (배포마다 기록 확인) → 운영도 같은 순서 (운영 배포는 따로 여쭤봐요).
- **미리보기 기록 (2026-11-05 · next `996ea98` · 시험용 DB doogo-staging)**: Preview 환경 변수 `DB_AREAS` 를 `all:dual` → `all:table` → `all:only` 로 한 칸씩 바꿔 세 번 배포 — 칸마다 `[db] 2부 B2 … 맞음` (orders 9 · payments 3 · members 2 · member_logins 2 · vod_progress 1 · instructors 4 · cohort_lists 4(기수 3줄) · students 8 · progress 4 · contents 4 · settings 4(상품 · 쿠폰 · 운영자 50줄)) · only 에서 docs 의 그 문서 45개 정리 · 배포 전 백업은 칸마다 문서 46개 그대로 · 공개 데이터(`/api/bootstrap` 14개 문서)가 dual · table · only 에서 글자 하나 안 다름 · 서버 오류 0. 미국 빌드 서버 ↔ 서울 DB 왕복(약 180ms) 때문에 표 채우기가 배포마다 30~60초 더 걸려요.
- **운영 1단계 (2026-11-06 · main `4bd0697`)**: 코드만 운영에 (영역 스위치 꺼짐 · 예전과 같게) — `[db] 저장된 문서 57개` · 표 35개 RLS · 배포 전 백업 문서 90개 · 사진 · 첨부 0개 · 공개 데이터(`/api/bootstrap`) 16개 문서. 운영 환경 변수 `DB_AREAS=all:dual` 은 넣어 두었고, 다음 운영 배포 때 dual(같이 쓰기 · 표 채움)로 맞춰요 → table → only.
- **운영 2~4단계 끝 (2026-11-06 · main `afcedf3` · 세 번 배포)**: ① dual — 표 18개를 새 모양으로(비어 있어 바로) → docs 의 문서 89개를 제 표로(orders 9 · payments 3 · members 6 · member_logins 11 · vod_progress 1 · instructors 5 · cohort_lists 4 · students 20 · progress 12 · contents 5 · bills 4 · partner_inquiries 4 · member_inquiries 1 · settings 4(한 건씩 51줄)) · 모두 맞음 ② table — 제 표에서 읽기 · 모두 맞음 ③ only — docs 의 그 문서 89개 정리(docs 에는 `sys` 만) · 모두 맞음. 배포마다 배포 전 백업 문서 90개 · 공개 데이터(`/api/bootstrap` 16개 문서)가 칸마다 글자 하나 안 다름 · 서버 오류 0. **운영 DB 는 이제 문서 종류마다 제 표**(Supabase › Table Editor › `app` › orders · members · students …, 왼쪽에 읽는 값 · 한국 시간, 맨 오른쪽에 문서 JSON). 되돌리기는 `DB_AREAS` 를 한 칸씩 거꾸로(only → table → dual → off).

#### 2026-11-08 점검 — 오늘 만든 데이터도 한 건씩 (다짐 · 다짐 쿠폰 · 첫 화면 배너)

- **확인한 방법**: 운영과 같은 설정(Postgres · `DB_AREAS=all:only`)을 로컬에 띄워 화면에서 다짐을 실제로 남기고 표를 직접 읽었어요 — 다짐은 `pledges` 에 한 줄(k · id · pid · mid · nick · 응원 · 한국 시간 + 맨 오른쪽 `v`), 그 회원 문서는 `members` 한 줄, `docs` 에는 `sys` 만(같은 문서가 두 곳에 남지 않음).
- **JSON 안에만 있던 것 → 한 건씩 표 더함**: ① 다짐으로 받은 **쿠폰**은 회원 문서(`members.v`)의 `coupons` 안에만 있었어요 → `member_coupons` (받은 쿠폰 한 장 = 한 줄 · 회원 · 쿠폰 종류(`cp-pledge` = 다짐 쿠폰) · 클래스 · 금액 · 마지막 날 · 받은/쓴 시각 · 쓴 주문번호). 가입 쿠폰 · 코드 등록 · 상세에서 받은 쿠폰도 같이 보여요. ② **첫 화면 배너**는 마스터 설정 문서(`settings` 의 `meta` 줄 · 약 41KB)의 `vod.banners` 안에만 있었어요 → `banners` (배너 하나 = 한 줄 · 화면 순서 · 종류(img/art) · 제목 · 갈 곳 · 켜짐 · 노출 기간). ③ `pledges` 에 **다짐 글**(`text`) 열.
- 원본은 그대로 문서(`v`)예요 — 화면 · API 가 받는 모양은 한 글자도 안 바뀌고, 새 표는 저장할 때마다 같은 트랜잭션에서 `v` 로 다시 만들어요(상품 · 쿠폰 표와 같은 방식). 배포 빌드가 표 모양이 바뀐 것을 알아보고 `members` · `pledges` · `settings` 를 한 번 다시 만들며(문서 · 버전 · 시각 그대로) 새 표를 채워요. 표는 35개 → **37개**(모두 RLS · 공개 API 역할 막힘), `scripts/supabase.sql` 도 다시 만들었어요.
- 아직 JSON 문서로 두는 것(일부러): 마스터 설정 문서 안의 다른 설정들(카테고리 아이콘 · 홈 섹션 · 판매 영역 · 정산 비율 같은 화면 설정)과 각 표 맨 오른쪽 `v`(원본) — 기록이 아니라 ‘설정 화면 하나’라서 한 덩어리가 맞아요.

#### 2부 표 모양 — Supabase 에서 데이터가 JSON 으로만 보이던 것 (2026-11-06)

- **왜 JSON 으로 보였나 (버그 아님 · 두 가지 이유)**
  1. **운영은 아직 2부 1단계**(코드만 · 영역 스위치 꺼짐): 지금 운영 데이터는 전부 `app.docs` 표 한 곳에 문서(JSON) 그대로예요 — `k`(문서 이름 · 예: `vo:DC…` 주문) · `v`(그 문서 JSON). 두고클래스 화면 · 서버는 처음부터 데이터를 ‘문서’ 단위로 주고받게 만들어져 있고, 1부(Turso → Supabase)는 가장 안전하게 이 문서를 **모양 그대로** 옮겼어요(문서마다 해시 비교). 영역 표(orders · members …)는 1단계에서 만들어 두었지만 dual 단계 배포 전이라 비어 있어요.
  2. **2부 표의 예전 모양**: 표를 채운 뒤에도 둘째 칸이 `v`(문서 JSON 전체) · 시각이 ms 숫자(1793921740007)라, Table Editor 에서 표를 열면 JSON 부터 보였어요. → **고침**: 열 순서를 `k` → 꺼낸 값(주문번호 · 회원 · 금액 · 상태 · 시각 …) → 맨 오른쪽 `v` · `ver` · `updated` · `created` 로, 시각 칸은 **한국 시간**(Postgres `timestamp` · `2026-11-06 14:30:00`)으로.
- **`v` 칸을 남기는 이유**: 화면 · 결제 · 동기화(`/api/sync`)가 문서 단위로 움직여서, `v` 가 화면이 받는 원본(한 글자도 안 바뀜 · 되돌리기 보장)이에요. 없애려면 화면 · 서버를 다시 만들어야 해서 런칭이 몇 주 늦어져요. 사람이 읽는 값은 왼쪽 열 · 보기(`v_orders` · `v_members` · `v_students` · `v_cohorts` · `v_bills` · `v_inquiries` — 한국어 열 이름)로.
- **예전 모양 표 다시 만들기** (`areasync.rebuild` · 배포 빌드가 자동): 표마다 한 트랜잭션 — 잠그고 → 줄(k · v · ver · updated · created) 읽고 → 지우고 → 새 모양으로 만들고 → 같은 줄 다시(꺼낸 값 · 한 건씩 표는 v 에서 다시). 실패하면 그 표는 예전 그대로 · 빌드 멈춤. 다시 만든 뒤 보기 · RLS · 표 설명도 다시(`pgSetup`). 미리보기(시험용 DB 아님) · 쓰기 멈춤 중에는 찾기만. 운영 표는 지금 비어 있어 다음 배포 때 바로 새 모양.
- **시험**: 서버 시험 40번(예전 모양 표 3개 → 찾기 · 다시 만들기 · 문서 · 버전 · 시각 그대로 · 한 건씩 표 · 한국 시간 · Postgres 보기 · RLS 35) · 로컬 리허설(PGlite · 시험용 DB 역할 · only · 영역 표 18개 모두 예전 모양 → 진짜 `db-build.js` → 18개 다시 · 문서 그대로 · 보기 6개 · 2부 비교 모두 맞음).

#### DB 점검 (2026-11-07) — 지금 어디까지 옮겨졌나 · JSON 이 많아 보이는 까닭

- **옮긴 상태** (운영 배포 bc8bef8 빌드 기록 기준): ① 1부 Turso → Supabase **끝** (운영 doogo-prod · 미리보기 doogo-staging · 서울) ② 2부 B2~B6 문서 종류마다 제 표 **끝** — 운영 · 미리보기 모두 `DB_AREAS=all:only`, 영역마다 ‘맞음’ ③ 2부 B1 사진 · 첨부 → Supabase Storage **아직** — `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` 가 운영 · 미리보기 둘 다 없어요(지금은 파일 0개라 옮길 것은 없고, 키를 넣으면 앞으로 올리는 파일부터 Storage 로). `FILES_STORE=supabase` 는 2026-11-07 Vercel(운영 · 미리보기)에 넣어 뒀어요 — 키가 없으면 예전처럼 DB 에 · 빌드 기록에 한 줄.
- **Supabase 화면에서 보는 곳**: Table Editor 왼쪽 위 스키마를 **`app`** 으로(기본 `public` 은 비어 있어요). 표마다 왼쪽은 읽는 값(주문번호 · 회원 · 금액 · 상태 · 한국 시간 …), 맨 오른쪽 `v` 는 화면이 쓰는 원본 문서 JSON(일부러 남김 · 위 ‘2부 표 모양’). 사람이 보기 편한 건 보기 `v_orders` · `v_members` · `v_students` · `v_cohorts` · `v_bills` · `v_inquiries`(한국어 열 이름).
- **JSON 이 많아 보인 까닭**: ① `backups` 표 — 배포할 때마다 DB 전체를 JSON 한 덩어리(약 240KB)로 남겨 최대 40개까지 쌓였어요. 배포는 하루에도 여러 번인데 데이터는 그대로인 때가 많아 **같은 내용**이 여러 개였어요 → **고침**: 바로 앞 백업과 내용이 같으면 새로 쌓지 않고(`backup(…, { skipSame: true })`), 이미 쌓인 같은 내용 백업은 먼저 것 하나만 남겨요(`pruneSameBackups` · 배포 빌드가 자동 · 기록 `[db] 백업 표: n개 · 같은 내용 백업 m개 정리`). ② 모든 영역 표의 `v` 칸(원본 문서) ③ `docs` 에 남은 `sys` · 지운 문서 표시(v 가 빈 줄 — 다른 기기에 ‘지워짐’을 알리는 표시) ④ `oplog`(일회성 작업 기록).
- **사진 · 첨부 Storage 켜기 (남은 일 · 운영자가 키를 넣어요)**: Supabase › 각 프로젝트(doogo-staging · doogo-prod) › Project Settings › Data API 의 Project URL · API Keys 의 secret 키 → Vercel › Settings › Environment Variables 에 `SUPABASE_URL`(Plain) · `SUPABASE_SERVICE_ROLE_KEY`(**Sensitive**)를 미리보기(doogo-staging 값) · 운영(doogo-prod 값) 따로. 채팅에는 붙이지 않아요. 넣은 뒤 미리보기 배포 → 기록 `[db] Storage 버킷 class-files: 비공개 · 새로 만들었어요 · 새 파일 내용은 Storage 에` 확인 → 운영 배포(따로 여쭤봐요).
- **배포 결과 (2026-11-07)**: 미리보기(next `520c915` · 시험용 DB) 백업 35개 중 같은 내용 31개 정리 → 4개 · 운영(main `520c915`) 백업 19개 중 같은 내용 8개 정리 → 11개, ‘바뀐 데이터가 없어 새로 쌓지 않았어요’ · 문서 57개 · 2부 영역 모두 맞음 · 서버 오류 0. 지운 문서 표시(v 가 빈 줄)는 정리하지 않아요 — 버전 번호를 이어 가며 다른 기기에 ‘지워짐’을 알리는 데 쓰이고 크기도 거의 0이에요.

로컬에서 서버 모드로 띄우기 (Node 22 내장 SQLite 사용):

```bash
cd class
CLASS_SQLITE=/tmp/class.db MASTER_PASSWORD=test node scripts/dev-server.js 4400   # 마스터 아이디는 doogobiz (MASTER_ID=admin 으로 바꿀 수 있음)
# http://localhost:4400 — Vercel 과 같은 api/ 코드가 돕니다
```

### 체험 계정

서버(Vercel)에서는 로그인 화면에 체험 계정 안내가 보이지 않고, 마스터는 `doogobiz` + `MASTER_PASSWORD` 로만 들어갑니다(비밀번호는 코드에 두지 않음). 아래 체험 계정은 실제 운영 전에 마스터 · 강사센터에서 바꾸거나 지워 주세요.


| 역할 | 로그인 |
|---|---|
| 수강생 (문대표 3기, 체험 계정) | 강사 ‘문대표’ 선택 → 이수진 / 2186 — 모든 주차 · 수료증이 열려 있음 |
| 수강생 (문대표 1기 체험단) | 1기 체험단 / 1111 — 모든 과제 승인 · 수료증 발급 |
| 수강생 (문대표 2기 체험단) | 2기 체험단 / 2222 — 모든 과제 승인 · 수료증 발급 |
| 강사 (문대표) | 문원오 / 2186 |
| 코치 (문대표 · 초이 두 강의 코치) | ‘코치’ 탭 → 김하나 / 1004 → 들어갈 강의 고르기 |
| 강사 (부알남 · 예전 이름 로직메이커) | 로그인 이름은 그대로 로직메이커 / 1111 |
| 강사 (갓농부 · 예전 이름 황금농부) | 로그인 이름은 그대로 황금농부 / 3333 |
| 강사 (초이) | 초이 / 2222 |
| 마스터 | 로컬: ADMIN / ADMIN · 서버: doogobiz / `MASTER_PASSWORD` |

## 파일

| 파일 | 내용 |
|---|---|
| `data.js` | 첫 실행 기본값 — 강사 4명(문대표·부알남·갓농부·초이), 문대표 콘텐츠, 기수, 수강생, 예시 제출 기록 |
| `db.js` | 공용 데이터 계층 — 저장/불러오기(서버 모드: 문서 나누기 · 바뀐 부분 보내기 · 변경 받기), 기수 주차 계산, 일정 생성, 진행률, 세션 |
| `api/` | 서버 (Vercel 함수) — `_lib/`에 저장소(Supabase Postgres · 로컬 SQLite) · 사진 · 첨부 내용(`blob.js` · Supabase Storage 비공개 버킷) · 로그인 · 권한 · 처음 데이터 |
| `scripts/` | `db-build.js`(배포 때 데이터베이스 준비 · Storage 버킷 확인 · `FILES_MOVE` · 2부 영역 표 맞추기) · `files-move.js`(사진 · 첨부 DB ↔ Storage 옮기기 · 확인) · `areas.js`(2부 영역 표 보기 · 맞추기) · `site.js`(배포할 화면 파일만 `.site`로 모으기) · `dev-server.js`(로컬 서버 모드) |
| `icons.js` | 아이콘 (Lucide) — `<svg class="icon lucide lucide-<이름>">` (Lucide 공식 클래스 규칙) |
| `tags.js` | 분석 · 마케팅 도구 연결 — 마스터 › 첫 화면 · 사업자 정보 › 분석 · 마케팅 도구에 넣은 것만 정식 주소에서 불러와요 · 개인정보처리방침 ‘쿠키’ 항목 문구 |
| `app.js` | 수강생 센터 — 로그인·수강 신청, 기본 메뉴 17개(두고 클래스 이름), 자동검수, AI 조교, 학습 노트 · 용어 사전 · 모범 과제 · 라이브 다시보기, 강사 미리보기. 강사를 고르기 전 첫 로그인 화면은 특정 강사 색이 아니라 두고 클래스(흰 바탕 + 여기어때 레드, 강사 프로필 사진 목록 · 입점 문의 링크)로 보이고, 강사를 고르면 그 강사의 로그인 화면으로 바뀌어요 (모양은 `home.css` 맨 아래 `.login-dc`) |
| `admin.js` | 강사센터 · 마스터 (두고클래스: VOD 클래스 · 전시 · 쿠폰 · 주문 · 정산 · 회원 DB · CRM · 환불 · 취소 관리 · 1:1 문의) |
| `vod.js` / `vod.css` | 두고클래스 스토어 — 홈 · 클래스 목록 · 상세 · 결제 · 마이페이지 · 강의 플레이어 · 쿠폰 · 포인트 · 환불(7일 · 미수강 100% 바로 취소) · 문의하기(카카오톡 상담 채널) |
| `files.js` | 영수증 · 정산 명세서 · 수료증 · 노트 PDF / CSV 내려받기 |
| `api/_lib/vodupd.js` | 최신성 업데이트 알림톡 — 산 회원을 수강 중 · 수강 끝남으로 나눠 보내기(`/api/vod-pay` `updNotify`) |
| `scripts/web-icons.js` · `manifest.webmanifest` | 웹 아이콘(탭 · 아이폰 · 안드로이드 홈 화면) 만들기 · 알려 주기 |
| `api/_lib/media.js` | 온드미디어 RS 서버 — 계정 비밀번호 해시 · 로그인 확인 · 보여 줄 모양 · 자기 정보 고치기 · 결제 준비 때 링크 RS 확인(`attach`). 테스트 `node scripts/media-test.js` |
| `api/vod-*.js` · `api/_lib/vod*.js` | 두고클래스 서버 — 가입 · 로그인(`vod-auth`) · 카카오(`vod-kakao`) · 결제 · 환불 · 무통장 · 쿠폰 받기 · 두잉고 강의실 입장(`vod-pay`, 포트원 V2) · 연결 상태(`vod-config`) · 문서 권한(`vodaccess.js`) · Cloudflare · Turnstile(`edge.js`). 출시 안내 · 환경 변수는 `scripts/VOD-LAUNCH.md`, 테스트는 `node scripts/vod-test.js` |
| 기수 이용료 · 매출 | 이용료 = 강사님 **1인 수강료 × 1명분**, 기수마다(수강생 수와 상관없음). PG 없이 무통장 입금 + 세금계산서. **새 기수는 마스터만 연다** — 강사 · 코치는 이미 있는 기수만 고칠 수 있고 새 기수 추가 · 기수 삭제는 서버가 되돌려요(`access.js` keepCohortSet). 흐름: 강사센터 → 운영 → **다음 기수 신청**(기수 · 1주차 시작 예정일 · 1인 수강료 · 담당자 · 연락처 · 세금계산서 이메일 · 상호/사업자번호(선택) · 남길 말) → 마스터 왼쪽 메뉴 숫자 · 대시보드 알림 · 알림 토스트 → 마스터 → 운영 → **기수 신청 · 매출**에서 전화 → 입금 확인(입금일 · 입금자) → 세금계산서 발행(발행일 · 승인번호) → **기수 열기**(지난 기수의 강의 요일 · 시간 · 커리큘럼을 이어받아 `cohorts:<강사>`에 추가, 신청과 연결) → 그다음은 강사가 ‘기수 관리’에서 자유롭게 고치고 1기 · 2기 · 3기 수강생을 기수별로 관리. 강사는 처리 전(입금 · 계산서 · 기수 오픈 전) 신청만 고치거나 취소할 수 있고, 금액 · 입금 · 계산서 · 기수 연결 · 마스터 메모는 마스터만(서버 `fixBill`). 마스터 화면 탭: 처리할 일(단계 카드) · **달력**(기수 시작 · 시작 예정 · 신청 · 입금 · 계산서) · **매출표**(월별 막대 · 월/연 합계 · 계산서 발행 현황 · 강사별 · 연도별, 매출 = 입금일 기준 공급가액) · 전체 내역(강사 · 상태 필터, 계산서 미발행) · **입금 계좌 · 설정**(은행 · 계좌 · 예금주 · 부가세 포함(기본)/별도/없음 · 강사 안내 문구, `meta.billing` — 방문자 · 수강생에게는 안 보임). 부가세 포함이면 1인 수강료가 그대로 입금액이고, 매출(공급가액)은 그 금액 ÷ 1.1. CSV 내려받기 · 직접 기록. **새 강사 플랫폼** 만들 때 1기 이용료(1인 수강료 · 연락처 · 이메일 · 입금/계산서 여부)를 함께 기록하고, 입점 문의 카드의 ‘플랫폼 만들기’로 문의 내용을 채워 시작할 수 있어요. 강사 대시보드에는 진행 중인 신청, 또는 마지막 기수가 3주 안에 끝나면 다음 기수 신청 안내가 보여요 |
| `home.js` / `home.css` | 두잉고 — 강사님을 위한 세일즈 화면 (주소 `https://www.doogoclass.com/doinggo` · `#/doinggo` — 예전 `#/about` 도 여기로 · `#/partner` 는 입점 문의 팝업. 대표 주소 `/` 는 두고클래스 스토어). 두고 클래스는 강사님께 플랫폼 이용료를 받고 수강생은 무료, 이용료는 수강생 수와 상관없이 같아요(금액은 상담 때 안내라 화면에 숫자를 적지 않음). 강사님이 받는 세 가지: ① 강의 소개 랜딩페이지(`#/p/…`) ② 무료강의 전자책(`#/free/…`) ③ 수강생 케어 커리큘럼 · 튜토리얼 시스템. 순서(PC에서 빈 곳 없이 꽉 차게): 첫 화면(위 머리띠 오른쪽은 ‘강사센터’ 글자 + 빨간 ‘수강생 로그인’ 버튼 — 입점 문의는 머리띠에서 뺌. 큰 버튼은 빨간 ‘수강생 로그인’ + ‘3가지 기능 보기’, 아래 “강사님이신가요?” 카드(악수 아이콘 · 흰 바탕 빨간 글자 ‘입점 문의’, 카드 전체를 눌러도 팝업). 맨 아래 마지막 안내는 ‘입점 문의하기’ 버튼 하나) → 기수가 늘수록 버거운 운영 → **한 기수 운영 흐름 8단계**(모집 → 무료 강의 → 신청 · 승인 → 주차별 학습 → 과제 · 피드백 → 수료 → 수료 후 관리 → 다음 기수 — PC · 태블릿 4칸 × 2줄, 휴대폰 2칸 × 4줄, 번호는 26px 아이콘 색) → 세 가지(실제 화면 + 기능마다 6개 세부) → **지금 방식(단톡방 · 드라이브 · 노션)과 비교표 8줄** → 수강생이 받는 강의실(8개 탭 + 6개 기능) → 강사센터 세 화면 + 기능 8개 + **직접 고치는 메뉴 23개(운영 7 · 수강생 화면 13 · 홍보 3)** → 이용료 구조(강사님 정액 · 수강생 0원 · 인원 무관) + **기수 단위 운영 4단계**(1기 입점 → 다음 기수 신청 → 입금 · 세금계산서 → 기수 오픈) → 기수가 쌓일수록 강해지는 구조 → 강사진(프로필 사진 카드) → 입점 순서 5단계 → 자주 묻는 질문 10개(PC는 두 줄) → 마지막 안내(포인트 3개). **흰 바탕 + 아주 옅은 빨강**: 구역 · 패널(세 가지 기능 카드 · 수강생 화면 판 · 기수 운영 · 고객센터 상자) · 마지막 안내는 거의 흰색(#FFFEFE · #FFFCFC)에 빨강 기운만 아주 살짝, 구역은 옅은 구분선으로 나눔(빨강은 제목 일부 · 버튼만). 수강생 첫 로그인 · 강사 로그인 왼쪽도 같은 정도로 옅게. **아이콘은 여러 색** — 카드 순서대로 빨강 · 파랑 · 초록 · 보라 · 주황 · 분홍 파스텔(`--tone` / `--tone-bg`), 누르거나 마우스를 올려도 빨강으로 바뀌지 않음(올리면 카드만 살짝 뜸, 터치 화면은 반응 없음). **비교표**: 줄마다 화면에 들어오면 ‘지금 방식’ 글자에 빨간 줄이 왼쪽→오른쪽으로 그어지고, 이어서 두고 쪽 빨간 동그라미 체크가 톡 튀어나오며 칸이 한 번 밝아짐. 강사진 카드는 ‘N주 과정’만(과제 수는 뺌), 사진은 **긱스쿨 강사진처럼 큰 브랜드 모양 위에 누끼 사진** — 흰 바탕 액자 + 아주 큰 빨간 3D doogo 심볼(`DSYM_DEFS` 의 `#hm-dsym` 벡터, 뒤로 6겹 = 입체 두께, 카드마다 다른 부분이 보이게 크기 · 위치를 바꿈) 위에, 액자 위로 머리가 살짝 튀어나오는 누끼 사진(문대표 `moon-profile.webp` · 부알남 김신용 대표 `logic-profile.webp` · 갓농부(예전 이름 황금농부 — 강사님도 바뀌어 사진을 새 강사님으로 교체, 강의 분야 ‘귤 단 하나 팔아 월매출 10억’) `farmer-profile.webp` — 모두 배경을 뺀 800×1000(4:5), 머리 위 5% 여백 · 허리 위 상반신까지 같은 구도. 사진이 없으면 흰 실루엣), 이름 옆에 강사 SNS 이름표(유튜브 빨간 마크 + ‘강사 유튜브’ ↗ · 인스타그램 · 카카오톡 채널, 넣은 것만), 아래는 ‘강의 소개’ · ‘무료 강의’ 두 칸 버튼 + 한 줄 전체 ‘수강생 로그인’ 버튼(카드끼리 버튼 높이가 맞게). **색은 스낵클(snackle.classhub.ai) 레드** — 첫 화면 · 입점 문의 팝업만: `#FF0037`(누르면 `#D60035`, 밝은 `#FF6683`, 옅은 `#FFF0F4` · `#FFE5EB` · `#FFCCD7`, 3D 심볼 그림자 쪽은 같은 계열의 진한 빨강) + 글자 검정 `#121418` + 무채색 Neutral(`#FAFAFA` · `#F5F5F5` · `#E6E6E6` · `#DCDCDC` · `#999999` · `#707070` · `#474747`). 수강생 첫 로그인 화면 · 강사센터 · 공용 로고(.hm-lock)는 예전 여기어때 레드 `#F94239` 그대로. 화면 녹화 영상은 실제 수강생 화면 · 강사센터를 찍은 것이라 예전 색 그대로, 보조색은 시안 `#006CE0` · 그린 `#01A484` 만, 그림자는 역할별 4단계(평평 · 머리띠 `0 4px 6px rgba(0,0,0,.04)` · 떠 있는 카드 `0 2px 16px rgba(0,0,0,.08)` · 시트), 모서리 8 · 12 · 16 · 20px. **글꼴은 스낵클과 똑같이 Pretendard 하나**(`home.css` 의 `--hm-font` = `"Pretendard Variable", Pretendard, -apple-system, …` — 영문 · 숫자도 Pretendard, `assets/fonts/pretendard.css`), 자간도 스낵클처럼 본문 -0.035em(16px 에서 -0.56px) · 첫 제목 -0.05em · 구역 제목 -0.0375em, 첫 제목 54px/700 · 구역 제목 32px/700 · 카드 제목 17~20px/700 · 본문 14~17px · 버튼 15px/600. 휴대폰 · 태블릿(한 줄 화면)에서 세 가지 기능 카드는 설명 → 실제 화면 영상 → 세부 기능 6개 순서. **세 가지 기능 카드**: 위 번호(01 · 02 · 03) 옆에 16px 이름표(모집 · 무료 강의 · 수강생 케어). 번호는 60px(휴대폰 46px) **두께 있는 입체 숫자**(오른쪽 아래로 6겹 + 그림자). 휴대폰 화면은 **입체 무대**(`.hm-3d`) 위에 — 뒤에 아주 큰 입체 doogo 심볼(7겹, 각 3px 깊이) · 휴대폰 두께 · 빛 반사 · 바닥 그림자 · 앞에 떠 있는 알림 카드 2개(01 수강 신청 1건 · 4기 모집 38/50명, 02 선물 전자책 · 무료 강의 카운트다운(1초마다 줄어듦), 03 자동 검수 통과 · 진행률 75%)가 서로 다른 깊이에 있어, **평소에는 언제나 정면**(기본 각도 0 — 스크롤하면 위아래로 살짝 뜨고 빛 반사만 지나감, `--sp` · 클로드 아티팩트처럼 글 길이만큼 늘어난 틀 안에서는 보이는 비율로 계산). **끌어서 돌려 보기**: 마우스로 끌거나 손가락으로 좌우로 밀 때만 정면 기준 앞면이 보이는 범위(좌우 ±35° · 위아래 ±15°, `--gy` · `--gx`) 안에서 돌아가고, 놓으면 살짝 튕기며 정면으로 — 휴대폰에서 세로로 밀면 원래대로 화면이 스크롤(`touch-action: pan-y`), 끈 뒤의 클릭은 무시, 캡션 옆 ‘끌어서 돌려 보기’ 안내(`--mx` · `--my`, `deviceorientation` — 권한을 묻지 않는 안드로이드 등만, 몇 초 지나면 가운데로 돌아옴). 알림 카드는 천천히 위아래로 떠다니고, 이 입체 움직임은 기기의 ‘애니메이션 줄이기’가 켜져 있어도 느리게 그대로. 구역 위아래 여백은 72px(태블릿 60 · 휴대폰 52), 첫 화면은 순수 흰 바탕(빨강 번짐 없음), 이용료 칸의 금액 안내 문구는 뺐어요. 첫 로그인 강사 고르기 화면(`.login-dc`) · 강사센터 · 코치 · 마스터도 같은 레드 · 글꼴. **첫 화면 로고는 스낵클 느낌의 글자 로고**(`doogoClassWord()` in `icons.js`, 모양은 `home.css` `.hm-word`): 굵게 기울인 **DOOGO CLASS**(Lilita One — OFL 무료 글꼴 — 글자 모양을 12° 기울이고 자간을 좁힘) + D · G · S 위 모서리에 한입 베어 문 자국(작은 원 4개 + 큰 원 하나를 빼서), 스낵클 레드 한 색, 그림 하나(path)라 어느 크기에서도 선명. 첫 화면 머리띠(PC 26px · 휴대폰 20px 높이) · 바닥 · 비교표 · 입점 문의 팝업 · 강의 둘러보기(`#/p`) 머리띠 · 무료강의 준비 중 화면에 써요. 파일은 `assets/brand/doogo-class-word.svg` · `.png`(가로 1200px, 투명 바탕). **로그인 · 강사센터 로고도 같은 DOOGO CLASS 글자 로고**(`doogoClassLock()` in `icons.js`, 모양은 `home.css` `.hm-lock` — 예전 doogo 그림 + 빨간 CLASS 배지는 없앰): 수강생 첫 로그인(왼쪽 위 · 카드) · 강사별 수강생 로그인 카드 · 강사 로그인(왼쪽 위 · 카드) · 강사센터 · 코치센터 · 마스터 머리띠 · 첫 로딩 화면(`assets/brand/doogo-class-word.svg`)이 모두 같은 로고, 색은 어디서나 스낵클 레드 `#FF0037`. 크기는 예전처럼 `--lh` 하나로(글자 높이 = `--lh` × 0.72 — 예전 로고와 가로 길이가 거의 같아 자리 그대로). 검색용 구조화 데이터(Organization logo)도 `doogo-class-word.png`. `favicon.png` · ‘Powered by doogo’ · 강사별 로고 마크는 그대로. 위 막대는 흰 바탕 그대로, 내려가면 머리띠 그림자가 생기고 아래 빨간 줄이 읽은 만큼 차올라요. 바닥(흰 바탕)은 소개 · 바로가기 3단(두고 클래스 · 바로가기 · 고객지원) + 문의 상자(전화가 있으면 고객센터 번호, 없으면 **사업제휴 · 입점 문의 이메일**을 크게 + 운영 시간(첫 마디 굵게 · 점심 · 휴무는 작게)) + **사업자 정보 두 줄**(① 상호(굵게) · 대표 · 사업자등록번호(사업자정보확인) · 통신판매업신고 ② 주소 · 우편번호 · 고객센터 · 사업제휴 문의 · 개인정보 보호책임자 · 호스팅) + 맨 아래 안내 문구(통신판매중개자) + 이용약관 · 개인정보처리방침 · 오픈소스 라이선스(주소를 넣기 전에는 `legal.js` 의 두고클래스(www.doogoclass.com) 정식 문서를 팝업으로 — 수강생 로그인 화면 팝업도 같은 문서, "## " 소제목 · "- " 목록 형식)로, 마스터 → 운영 → 첫 화면 · 사업자 정보에서 고쳐요(채운 칸만 보임, `meta.site`). 기본값(`db.js` `SITE_DEFAULT`)은 (주)두고홀딩스 · 대표 문원오 · 726-87-03167 · 제 2024-세종아름-0878 호 · 세종특별자치시 갈매로 353 에비뉴힐 5층 5023호(30121) · doogobiz@gmail.com · 평일 오전 10시 ~ 오후 6시(점심 1~2시 · 주말 · 공휴일 제외), 저장된 칸이 비어 있으면 기본값이 보여요(DB는 건드리지 않음). 두고 그룹사 칸은 바닥에서 뺐어요(예전에 저장한 값은 그대로 둠). 휴대폰(검정 노치 없이 화면만) · 브라우저 틀 안은 **실제 화면을 녹화한 영상**(마우스 커서 · 클릭 효과, 이름은 OOO, 강사센터는 예시 수강생 김OO…, 수강생 화면 · 강의 페이지는 녹화할 때만 첫 화면과 같은 ‘레드’ 색(흰 바탕 + 빨강 포인트)으로 — 실제 강사 색은 그대로): 첫 화면 `v-admin` · `v-home`, 세 가지 `v-lp` · `v-free` · `v-care`, 수강생 강의실 `v-student`(8개 장 — 탭을 누르면 그 장면으로, 영상이 넘어가면 탭도 따라감), 강사센터 `v-admin`(3개 장). `assets/home/v-*.mp4`(H.264) · `v-*.webm`(VP9, mp4를 못 트는 브라우저용) · `v-*.webp`(첫 장면 사진). 처음엔 사진만 보이고, 화면 근처(400px)에 오면 미리 받아 두고 **영상이 절반 넘게 보일 때만** 소리 없이 반복 재생 · 거의 안 보이면 멈춤(아래에 있는 영상은 내려가서 볼 때 시작). 휴대폰에서는 재생 버튼을 감추고(멈춰 둔 영상에만 보임), PC는 마우스를 올리면 오른쪽 아래 버튼으로 멈춤/재생. 다시 보면 멈췄던 곳부터 이어서 재생. 휴대폰의 ‘애니메이션 줄이기’ · 절전 모드여도 멈춘 채로 두지 않고 저절로 재생(소리 없는 화면 녹화). **영상 자동 재생을 막는 앱 안 브라우저**(일부 안드로이드 웹뷰 · 절전 모드 — `play()` 가 NotAllowedError 이거나 받아 둔 장면이 있는데 3초 넘게 멈춰 있으면)에서는 같은 녹화를 **움직이는 그림 `v-*.anim.webp`**(ffmpeg libwebp_anim, 휴대폰 영상 400px · 10fps, 강사센터 720px · 8fps, 0.6~1.3MB)으로 바꿔 보여 줘요. 영상을 다시 찍으면 anim.webp 도 같이 다시 만들기. 화면이 바뀌어 다시 찍을 때는 `scripts/demo-videos/`(Playwright + ffmpeg, 사용법은 lib.js 맨 위). 메뉴 · ‘3가지 기능 보기’ 버튼은 `scrollIntoView` 로 내려가서 클로드 아티팩트처럼 다른 화면 안에 들어가 있어도 움직여요. **대표 주소는 https://www.doogoclass.com** (doogoclass.com 은 www 로 308 이동, doogo-class.vercel.app 도 그대로 열림). **검색 · 공유(SEO)**: `index.html` 머리에 제목 “두고클래스 | 강사를 위한 올인원 강의 운영 플랫폼” · 설명(강의 개설부터 수강생 관리, 출석·과제, 공지, 자료실, 운영 관리까지 …) · 공유 이미지 `assets/home/og.jpg`(대표님이 준 디자인 이미지를 1200×630으로, 화면 캡처로 다시 만들지 않기 — 바꾸면 `?v=` 숫자도 바꿔야 카카오톡 · 페이스북이 새로 가져감) · canonical · og/twitter 태그 · 구조화 데이터(WebSite · Organization JSON-LD), `robots.txt`(/api 제외) · `sitemap.xml`. 첫 화면 탭 제목(`home.js` `document.title`)도 같은 제목. **입점 문의**: 위 막대 · 첫 화면 · 세 가지 · 이용료 · 강사진 · 입점 순서 · FAQ · 마지막 안내 · 바닥의 버튼(또는 `#/partner`)으로 팝업이 열리고, 서버에서는 `inq:<id>` 문서로 저장(마스터만 읽기 · 같은 IP는 연속 6건까지), 마스터 → 지원 → 강사 입점 문의에서 상태 · 메모 · 삭제 |
| `landing.js` / `landing.css` | 강사 소개 페이지 · 무료강의 페이지 (공개) |
| `main.js` | 주소에 따라 소개(home) · 강사센터(admin) · 강사 페이지(landing) · 수강생 센터(app) 전환 |
| `styles.css` / `admin.css` | 수강생(Wise 구조 + 강사별 색) / 강사·코치·마스터(여기어때 YDS: 레드 #F94239 · 무채색 · 둥근 사각 버튼 8~12px · 자간 0, 흰 바탕에 옅은 빨강 파스텔 — 본문 위쪽 그라데이션 · 따뜻한 구분선 · 숫자 카드마다 다른 파스텔 · 강사 공지 띠도 파스텔) 디자인. 수강생 첫 로그인 강사 고르기 화면 왼쪽도 같은 파스텔, 글자 아바타는 여러 색. 기본 글꼴은 모두 `--font`(Inter + Pretendard, 문대표 수강생 화면과 같은 글꼴) |

## 운영 규칙

- **기수**: 1주차 시작일만 정하면 `n주차 공개 = 시작일 + 7×(n-1)`, `과제 마감 = 공개 + 6일`로 자동 계산됩니다. 기수마다 커리큘럼(주차 수)과 강의 요일·시간을 따로 정할 수 있습니다.
- **수강생 상태**: 승인 대기 → 수강 중(승인) / 거절, 수강 중 → 탈퇴. 승인된 수강생만 로그인됩니다. 탈퇴·거절은 기록이 남아 복구할 수 있습니다.
- **수강 신청**: 수강생 로그인 화면의 ‘수강 신청하기’ → 강사가 ‘신청 받기’를 켠 기수 중에서 고릅니다.
- **과제**: 제출 즉시 자동검수(사진·링크·글자 수·필수 단어). 강사가 승인/보완 요청하면 그 결과가 최종입니다. 필수 과제를 모두 통과하면 수료증이 열립니다.
- **강의 일정**: ‘강의 오픈’과 ‘과제 마감’은 자동, 라이브 Q&A·공지·챌린지·행사는 강사가 추가합니다. ‘모든 기수 반복(주차·요일)’ 또는 ‘특정 기수 하루’로 정합니다.
- **질문 · 요청 (예전 Q&A)**: ‘FAQ 검색’ 탭의 자주 묻는 질문은 분류별로 보이고, 강사센터에서 ‘한꺼번에 붙여넣기’(`[분류]` / `Q.` / `A.` 형식)로 한 번에 등록할 수 있습니다. ‘1:1 요청’(예전 요청사항)은 프로그램 오류·불편 신고 게시판으로, 모두 비공개(작성자·강사만 열람)이며 스크린샷을 3장까지 첨부합니다. 강사가 ‘요청사항 답변’에서 답하면 수강생 상세 화면에 바로 보입니다.
- **과제 일괄 검수**: 과제 검수 화면에서 체크박스(전체 선택 포함)로 여러 과제를 골라 한 번에 승인하거나 보완 요청할 수 있습니다.
- **자료실 영상 팝업**: VOD·시니어 기초 가이드를 누르면 팝업으로 영상·본문·첨부 자료(교습지·엑셀 등)가 열립니다. 강사센터에서 본문과 첨부(파일 2MB까지 또는 링크)를 수정합니다.
- **콘텐츠**: 수강생 메뉴와 같은 이름으로 강사센터 ‘수강생 화면 콘텐츠’에서 모두 고칠 수 있습니다. 유튜브는 주소를 붙여 넣으면 됩니다.
- **미리보기**: 강사센터 ‘수강생 화면 보기’ → 선택한 기수 기준의 수강생 화면. 미리보기 제출 기록은 실제 수강생과 분리됩니다.
- **강사별 메뉴 구성(마스터)**: ‘메뉴 · 색상 설정’에서 강사마다 수강생 메뉴를 ＋/−로 더하고 빼고, 이름·순서를 바꾸고, 자료실 4개 분류를 켜고 끕니다. ‘새 메뉴 만들기’(자유 페이지, 강사센터 ‘추가 메뉴’에서 내용 작성)와 ‘외부 링크 메뉴’를 더할 수 있습니다. 메뉴를 빼도 내용은 지워지지 않습니다.
- **수강생 화면 색상**: 강사(기본 정보 · 색상) 또는 마스터가 8가지 색 또는 디자인 세트(레드 — 흰 바탕 + 여기어때 레드 포인트 · 바이낸스 · 에어테이블) 중에 고르면 수강생 로그인·학습 화면 전체가 그 색으로 바뀝니다. 강사센터 · 마스터는 여기어때 레드로 고정입니다.
- **마스터 추가 메뉴**: 플랫폼 현황(강사별 진행률·검수 밀림·오류 신고), 오류 신고 모아보기(모든 강사 플랫폼, 마스터가 직접 답변), 강사 공지(강사센터 대시보드 맨 위), 데이터 관리(백업 복사·복원·초기화).
- **플랫폼 분양**: 마스터에서 ‘새 강사 플랫폼’을 만들면 기본 메뉴·예시 커리큘럼·1기가 들어간 상태로 시작합니다. ‘강사센터 접속’으로 대신 관리할 수 있습니다.

- **강사 소개 페이지** (`#/p/<강사>`, 예전 이름 ‘강의 소개 페이지’ · 두잉고 홈 강사 카드의 ‘강사 소개’ 버튼): 어떤 강사가 어떤 강의를 하는지 궁금하게 만드는 공개 페이지. 순서: 첫 화면(헤드라인 + 신청하기 + ‘강사 영상 보기’ + 모집 기수 D-day, 오른쪽은 강사 사진 판과 이름 카드) → **강사 영상**(유튜브 — 강사센터에 넣은 ‘강사 소개 영상’, 없으면 무료강의 페이지 영상 중 하나 · 누르면 그 자리에서 재생 · 유튜브 채널 버튼) → 강사 소개 → 숫자(강사가 넣은 것만) → 배우는 것 · 추천 대상 → 수강생 플랫폼 → 후기 → FAQ → 마지막 안내. **커리큘럼 · 수강 안내(실전 클래스 카드 · 수업 캘린더) · 첫 화면 학습 화면 모형(진행률 68%)은 없앴어요**(저장돼 있어도 안 보여요). **신청하기 링크는 하나**(강사센터 › 강사 소개 페이지 › ‘신청하기 링크’, `landing.applyUrl`): 위 막대 · 첫 화면 · 마지막 안내 · 휴대폰 아래 막대의 ‘신청하기’가 모두 이 주소를 **새 창**으로 열어요(예전 팝업 신청 창은 없앰). 비어 있으면 예전에 버튼마다 넣은 주소 → 카카오톡 문의 주소, 그것도 없으면 버튼을 숨겨요. 문대표는 `https://m.site.naver.com/2iZFQ`(일회성 작업 `2026-10-31-moon-apply-link`, 마지막 안내 ‘5주 뒤’ → ‘4주 뒤’도 같이). **뉴질랜드 테마(문대표)**: ‘Kia ora! 뉴질랜드에서 인사드려요’ 국기 배지, 남색 사진 판에 은고사리(`assets/brand/nz-fern-real.svg`) · 남십자성(`nz-stars.svg`), 이름 카드의 ‘Aotearoa · New Zealand’ 국기 이름표, 첫 화면 바로 아래 **‘왜 뉴질랜드 건강식품일까요?’** 남색 띠(청정 원료 · MPI 식품 안전 기준 · 마누카꿀 · 프로폴리스 · 초록입홍합 · 초유 · 현지 직접 소싱). 칸 켜고 끄기 · 순서 · 글 · 사진은 강사센터에서. ‘공개하기’를 끄면 강사 · 마스터만 볼 수 있습니다.
- **새 강사 플랫폼 = 문대표 구성 복사**: 마스터가 새 플랫폼을 만들 때 ‘문대표 플랫폼 그대로 시작’을 고르면 메뉴·5주 커리큘럼·과제·FAQ·서류 가이드·자료실 틀이 복사됩니다(이름은 새 강사로, 문대표 영상·첨부는 비움).
- **강사 메뉴 구성**: 강사도 강사센터 ‘메뉴 구성’에서 자기 수강생 메뉴를 더하고 빼고, 이름·순서를 바꾸고, 페이지·링크 메뉴를 만들 수 있습니다(마스터의 ‘메뉴 · 색상 설정’과 같은 화면).
- **수강생 편의 기능**: 홈 ‘시작 가이드’ 체크리스트(강사센터 ‘시작 가이드’), 일정·주차 강의의 ‘입장하기’ 링크(줌 등), 안 읽은 공지 숫자·NEW 표시, 강의별 자료 첨부와 ‘내 메모’, 카카오톡 문의 버튼.

- **성장 레벨**: 수강생 아이콘(상단·홈)이 주차가 지날 때마다 씨앗 → 풀잎 → 가지 → 나무 → 숲으로 바뀝니다. 마지막 단계는 늘 숲이라 4주 강의는 나무 없이 씨앗·풀잎·가지·숲 4단계입니다. 홈에 단계 표시와 다음 단계까지 남은 날이 보이고, 레벨이 오르면 다음 접속 때 축하 알림이 뜹니다.

- **기수별 커리큘럼 · 강의 요일**: 강사센터 ‘커리큘럼’에서 커리큘럼을 여러 개 만들 수 있습니다(기존 것을 복사해서 고치거나 빈 주차로 시작). ‘기수 관리’에서 기수마다 커리큘럼, 매주 강의 요일·시간, 입장 링크를 고르면 그 기수의 기간(주차 수)·강의 일정·과제 마감·성장 레벨·진행률·수료 조건이 모두 그 커리큘럼 기준으로 바뀝니다. 예: 1·2기 5주 기본 과정(매주 목 20:00), 4기 4주 압축 과정(매주 토 12:00). 쓰는 기수가 있는 커리큘럼은 지울 수 없습니다.
- **커리큘럼 주차 카드**: 수강생 커리큘럼은 주차마다 강의일 · 제목 · 부제, ‘과제 보러 가기’, 핵심 목표, 강의 내용(2칸 점 목록), 과제 제출 기간, 필수 · 도전 · 마인드 과제 목록을 한 장에 보여 줍니다. 아직 안 열린 주차는 ‘아직 열리지 않은 주차입니다 · M/D부터 공개’만 보입니다. 강의 영상은 있으면 카드 아래 ‘강의 영상’으로 덧붙고, 누르면 기존 강의 화면(영상 · 메모 · 시청 완료)으로 갑니다. 강사센터 주차 수정에서 부제 · 핵심 목표 · 강의 내용을, 과제 수정에서 과제 종류(필수 · 도전 · 마인드)를 고릅니다. 수료 조건은 필수 과제만입니다.
- **공지 사진 · 영상 · 본문 서식**: 공지는 글과 사진 여러 장(자동으로 줄여 저장), 유튜브 영상(선택)을 넣을 수 있습니다. 본문에 `[사진1]`을 적으면 그 자리에 사진이 들어가고 나머지는 글 아래에 순서대로 붙습니다. 공지 · 자료실 영상 본문 · 강의 설명 · 추가 메뉴 본문은 `## 소제목`, `- 목록`, `1. 번호`, `**굵게**`, `> 강조 상자`, `---` 구분선을 지원하고 주소는 자동 링크가 됩니다(편집창 위 서식 버튼으로 넣을 수 있음).
- **강의 자료함 (예전 유료강의 자료실)**: 다른 메뉴에서 자료함으로 들어올 때마다 ‘이용 안내’ 팝업이 뜨고 ‘확인했습니다’를 눌러야 자료가 보입니다(문구는 강사센터 자료실에서 수정). 자료실 화면에는 열람자 이름 · 기수 · 시각이 옅게 깔립니다. 이커머스 실전 VOD · 시니어 기초 가이드는 썸네일 카드 목록 → 게시판형 상세 페이지(유튜브 선택 + 글 + 사진 `[사진N]` + 첨부 자료, 이전/다음)로 열립니다.
- **응원 영상 (예전 동기부여)**: 위 큰 플레이어 + 아래 ‘영상 1, 2, 3…’ 썸네일. 썸네일을 누르면 위 플레이어에서 바로 재생됩니다.
- **성장 단계 (과제 성취 기준)**: 씨앗 → 풀잎 → 가지 → 나무 → 숲. 전체 과제 완료율 25% · 50% · 75%마다 한 단계씩 오르고, 필수 과제를 모두 통과(수료 조건)하면 ‘숲’입니다(4주 과정은 나무 없이 4단계). 수강생 홈에는 ‘다음 단계까지 과제 N개’가, 강사센터 대시보드에는 단계별 인원·이름, 수강생 관리·진행 현황 표·수강생 상세에는 단계가, 마스터 대시보드에는 강사별 단계 분포와 잘하고 있는 학생이 보입니다.
- **수강생 홈(내 강의실)**: 시간대별 인사 → 오늘의 응원 영상 → 성장 단계 → 이번 주 / 다음 주 카드(다음 주는 ‘M/D부터 과제 제출이 공개됩니다’, 주차 시작일에 자동으로 열림) → 과제 전체 진행률(필수 · 도전 · 마인드를 누르면 그 종류만 모아 보기 `#/missions?kind=`) + 다가오는 일정 → 시작 가이드 → 이어서 할 과제 → 공지.
- **시작 가이드**: 홈 맨 위. 1주차 항목은 처음 한 번(온보딩), ‘보이는 주차’를 정한 항목은 그 주차가 열리면 ‘N주차 시작 가이드’로 다시 뜹니다. ‘바로가기’를 누르면 자동 체크되고, 모두 체크하면 ‘완료’ 버튼이 나옵니다. ‘완료’를 누른 가이드는 다시 뜨지 않습니다(새로고침·재로그인 후에도).
- **빠른 이동 (예전 자주 찾는 페이지)**: 홈 클래스 소식 아래 카드. 윗줄은 플랫폼 안 메뉴(기본 색), 아랫줄은 외부 링크(흰 카드 + 브랜드 색 아이콘: 유튜브 · 네이버 카페 · 두고커넥트 · 두고푸드). 강사센터 ‘시작 가이드 · 자주 찾는 페이지’에서 이름 · 설명 · 주소(수강생 화면 또는 외부 링크) · 아이콘을 정합니다. 꺼진 메뉴나 주소가 빈 카드는 숨겨집니다.
- **주차 과제 화면**: ‘이 주차 과제 양식’(엑셀에서 열리는 CSV 등, 과제 수정에서 첨부) 내려받기, 과제 유형(전체 · 필수 · 도전 · 마인드)과 진행 상태(전체 · 미제출 · 보완 필요 · 체크 완료) 탭, 과제 카드(종류 · D-day · 마감 · 제출 방식 · 양식 다운로드 · 과제 제출). 1주차에는 서류 준비 가이드 바로가기가 붙습니다.
- **수업 캘린더**: 칸 안에 점 대신 **글씨 표시** (`DB.calChip` — 예전 화면 · React 같이) — 휴대폰은 짧게(‘1주차’ · ‘1주 마감’ · ‘1주 녹화’ · ‘챌린지 2’ · ‘초청’ · ‘Q&A’), PC는 길게(‘1주차 오프라인 강의’ · ‘1주차 과제 마감’ · **‘1주차 강의 녹화본 업로드’**, 두 줄까지 · 마우스를 올리면 전체). **강사가 추가한 일정은 종류 대신 일정 이름**(‘19:00 챌린지 2회차’ · ‘19:00 OO 특별강의 - 쿠팡’ · ‘20:00 수료식 · 성과 발표’ — 이름이 없으면 종류 이름, 휴대폰은 종류 + 이름 속 ‘N회차’ 숫자) (2026-11-04). 강의 날은 칸을 통째로 칠하지 않고 옅은 강사 색 칸 + 진한 ‘N주차’ 표시, 오늘은 검은 동그라미 숫자, 토요일 파랑 · 일요일 빨강, 칸 높이는 내용만큼(예전처럼 길쭉하게 늘어나지 않아요). 한 칸에 3개까지, 넘치면 ‘+N’. 아래에 고른 날 일정(‘커리큘럼 보기’ · ‘과제 보기’ 버튼) → **‘N월 일정 한눈에’** 날짜순 목록(지난 날은 흐리게). 색: 강의 = 강사 색(뉴질랜드는 남색) · **온라인 강의도 강의와 같은 색 · 강의 날 표시** · 녹화본 보라 · 과제 마감 빨강 · Q&A 주황 · 챌린지 초록 · 보너스 금색 · **초청강사 하늘색** · 행사 검정 · 오프라인 청록 · 공지 회색. 일정 종류: 무료 강의 · 오프라인 강의 · **온라인 강의** · 챌린지 · 라이브 Q&A · 보너스 강의 · **초청강사**(다른 강사님 특강 · 행사 바로 위) · 행사 · 공지. 문대표는 강의 녹화본 업로드가 **오프라인 강의(촬영) 이틀 뒤** 자동(`brand.cal.replayAfter: 2` — 운영은 일회성 작업 `2026-11-04-moon-cal-v2` 가 1 → 2 · 12/15 5주차 보너스 강의 → 5주차 온라인 강의 · 특강(행사) → 초청강사).
- **휴대폰 메뉴**: 휴대폰(720px 이하)은 위 막대가 58px 이라 `--header-h` 도 58px 로 맞췄어요 — 예전에는 메뉴 · 어두운 막이 68px 아래에서 시작해 그 사이 10px 로 시계 줄이 비쳐 보였어요. 수강생 · 강사 · 코치 · 마스터 · 파트너 모두 휴대폰 · 태블릿에서 위 막대와 메뉴가 딱 붙는지 재 봤어요.

- **무료강의 페이지**: doogo.site와 같은 화면(강의 일정·카운트다운, YouTube 영상 3개 넘겨보기, 질문 링크, 공개일에 자동으로 열리는 선물 전자책, 카카오톡 오픈채팅, 강사 소개, 진행 예정 강의 썸네일·신청 링크, 자주 묻는 질문, 신청하기)을 강사센터 ‘무료강의 페이지’에서 켜고 끄고 순서를 바꾸며 고칩니다. 스타일은 doogo.site 원본 CSS를 `.dg` 범위로 가져왔습니다. 질문 링크를 비우면 페이지에서 질문을 받아 같은 화면 아래에 모읍니다. 아직 무료강의 페이지를 만들지 않은 강사는 문대표 페이지와 같은 구성(선물 전자책 3권 · 질문 · 진행 예정 강의, 강사 색 · 이름)으로 공개되고, 썸네일이 없으면 강의 날짜 · 제목 · 강사 이름으로 포스터를 자동으로 그립니다. 강사센터 ‘무료강의 페이지’에서 한 번 저장하면 그 강사 것으로 고정됩니다.
- **코치 계정**: 강사가 강사센터 ‘코치 관리’에서 코치를 만들고(이름 + 전화번호 뒷자리 = 로그인 정보, 담당 업무 메모, 사용 중 / 중지) 볼 수 있는 메뉴를 고릅니다(운영: 수강생 관리 · 기수 관리 · 과제 검수 · 요청사항 답변 / 수강생 화면 콘텐츠 각 메뉴 / 홍보 페이지, 프리셋 ‘과제 · 문의만’ · ‘운영 전체’ · ‘모두 선택’ · ‘모두 해제’). 코치는 로그인 화면 ‘코치’ 탭(강사 탭에 넣어도 자동 인식)으로 들어오고, 대시보드 인사가 ‘OOO 코치님, 안녕하세요’(강사는 ‘OOO 강사님, 안녕하세요’)로 다르며 맡은 메뉴의 할 일(검수 대기 과제 · 답변 대기 문의 · 승인 대기 수강생)만 보입니다. 열리지 않은 메뉴와 ‘코치 관리’는 사이드 메뉴에 없고 주소로 들어가도 대시보드로 돌아갑니다. 코치가 승인 · 보완 요청한 과제와 답변에는 처리한 사람 이름(‘김하나 코치’)이 남고, 코치 관리 목록에 코치별 검수 · 답변 건수와 최근 접속이 보입니다. 중지하면 바로 로그인이 막히고 접속 중이던 코치도 로그아웃됩니다.
- **운영사 doogo 표시**: 수강생·강사·마스터 로그인 화면, 강사센터·마스터 상단 로고, 사이드 메뉴 아래, 공개 페이지 맨 아래에 doogo 로고(‘Powered by doogo’)가 들어갑니다. 원본은 `assets/brand/`.

### 수강생 메뉴 — 두고 클래스 이름 · 새 메뉴 4개 · 막힐 땐 카드 · AI 조교

- **메뉴 이름**: 내 강의실 · 주차별 강의 · 라이브 다시보기 · 과제 · 미션 · 모범 과제 · 학습 노트 · 수업 캘린더 · 클래스 소식 · 질문 · 요청 · 실무 체크리스트 · 용어 사전 · (강사) AI 조교 · 강의 자료함 · 응원 영상 · 1:1 상담 · 제휴 혜택 · 수료증 발급. 기본 이름은 `db.js`의 `STUDENT_MENUS` 한 곳에서 정하고, 화면 제목 · 경로 표시도 강사가 ‘메뉴 구성’에서 바꾼 이름을 따릅니다(`app.js`의 `ML()`). 예전 기본 이름이 그대로 저장된 메뉴는 새 이름으로 보이고, 강사가 직접 바꾼 이름은 그대로입니다.
- **새 메뉴 4개 (강사센터에서 커리큘럼에 맞게)**
  - **라이브 다시보기** — 강사센터 ‘라이브 다시보기’에서 유튜브 주소 · 주차 · 날짜 · 핵심 정리 · 자료를 올리면 주차별로 모이고, 수강생은 ‘다 봤어요’로 표시합니다. 하나라도 올려야 수강생 메뉴에 나타납니다.
  - **모범 과제** — 잘한 과제 사진 + 강사 코멘트. 과제와 이어 두면 그 과제 화면 · 주차 화면에 ‘모범 과제 보기’가 뜹니다. ‘과제 검수’에서 제출물을 열고 **모범 과제로 올리기**를 누르면 사진 · 과제 · 주차 · 가린 이름(예: 3기 이OO)이 채워진 편집 창이 열립니다(사진은 강의 콘텐츠용으로 복사 저장돼 다른 수강생도 볼 수 있음). 내용이 있을 때만 메뉴가 보입니다.
  - **학습 노트** — 주차마다 회고 질문(강사센터 ‘학습 노트 질문’, 비운 주차는 기본 질문 3개)에 답하고, 강의 화면 ‘내 메모’도 주차별로 모입니다. 자동 저장 · 텍스트 파일로 내려받기. 수강생 기록(`journal`)에 저장됩니다.
  - **용어 사전** — 가나다 순 · 초성 색인 · 분류 · 검색. 강사센터에서 하나씩 또는 ‘용어 : 풀이’ 줄로 한꺼번에 붙여넣기. AI 조교가 ‘○○ 뜻이 뭐예요?’에 이 풀이로 답합니다. 문대표 플랫폼에는 기본 용어 20개가 들어갑니다(비어 있을 때만).
- **막힐 땐 카드 (사이드 메뉴 아래)**: ‘혼자 고민하지 마세요’ — ① AI 조교에게 묻기(대화창 열기) ② FAQ에서 찾기 ③ 1:1 요청 남기기 순서의 단계 카드 + 카카오톡 문의(있을 때).
- **AI 조교 (예전 24시 AI봇)**: 기본 이름 ‘(강사 이름) AI 조교’. 오른쪽 아래 버튼(강사 사진 + ‘무엇이든 물어보세요’)을 누르면 더 큰 대화창(PC 440×680, 휴대폰은 아래에서 올라오는 시트)이 열리고, 위쪽에 브랜드 색 머리말 · 바로 묻기 칩(켜진 메뉴에 맞춰 바뀜) · 보내기 버튼이 있습니다.
- **상세 화면 이전 · 다음**: 강의 · 강의 자료함 · 라이브 다시보기 상세 아래에 같은 모양의 이전 · 다음 카드(`pager()` — 화살표 동그라미 · 작은 머리말 · 제목 두 줄까지, 한쪽이 없으면 빈 칸으로 자리를 맞춤, 휴대폰은 한 줄에 하나)와 가운데 ‘목록으로’ 흰 버튼.
- **배포 때 데이터**: 일회성 작업 `2026-10-13-menu-names-v15`가 예전 기본 이름(메뉴 이름 · ‘24시 OOO AI봇’ · 공지 · FAQ · 시작 가이드 · 빠른 이동의 기본 문구)만 새 이름으로 바꿉니다. 강사가 고친 문구는 건드리지 않습니다. 체험용 다시보기 · 모범 과제 예시는 브라우저 체험(로컬)에만 들어가고 운영 데이터에는 들어가지 않습니다.

### 검색 노출 (SEO)

- `index.html`: 제목 · 설명 · 키워드 · `robots index, follow` · 대표 주소(canonical) `https://www.doogoclass.com/` · 공유 미리보기(og · twitter, `assets/home/og.jpg` 1200×630) · 회사 정보 구조화 데이터(JSON-LD: WebSite + Organization).
- **소유 확인 태그**: 네이버 서치어드바이저 `naver-site-verification`, 구글 서치 콘솔 `google-site-verification` (머리말 `<meta>`).
- **첫 로딩 화면**: 서버에서 처음 데이터를 받는 동안(보통 1초 안팎) **흰 바탕 가운데 DOOGO CLASS 글자 로고 · 빨간 진행 막대 · ‘로딩중입니다…’**(빨강은 로고와 같은 스낵클 레드 `#FF0037`)(점 3개가 차례로 깜박임)가 보입니다. `index.html` 의 `#root` 맨 앞에 미리 들어 있어 페이지를 열자마자 흰 바탕이 깔리고(`main.js` 가 다시 그리지 않아 깜박임 없음), 로고 · 글자는 0.15초 뒤에 나타나 금방 끝나면 거의 보이지 않아요. 앱 화면이 그려지면 사라지고, 서버에 연결하지 못하면 같은 로고 아래 ‘서버에 연결하지 못했어요’ + ‘다시 시도’ 버튼. 자바스크립트가 꺼진 방문자 · 검색 로봇에게는 숨고 아래 안내 글만 보입니다. 모양은 `styles.css` 의 `.boot-*`.
- **검색 로봇용 안내 글**: 화면은 자바스크립트로 그려지므로, 자바스크립트를 실행하지 않는 검색 로봇(네이버 등)도 읽을 수 있게 `#root` 안에 첫 화면 요약(제목 · 소개 · 세 가지 기능 · 수강생 강의실 · 강사센터 · 사업자 정보)을 글로 넣어 두었습니다. 화면이 뜨면 앱이 그 자리를 바로 바꾸고, 자바스크립트가 켜진 방문자에게는 보이지 않습니다.
- `robots.txt`(전체 허용, `/api/`만 제외, 사이트맵 위치) · `sitemap.xml`(대표 주소 1개). `doogoclass.com` 은 `www.doogoclass.com` 으로 308 이동.
- 주소는 `#` 없는 경로라 검색엔진이 페이지마다 따로 모을 수 있어요. 사이트맵에는 대표 주소 · `/doinggo` · `/vod/c/all` · `/vod/teachers` · `/vod/about` · `/terms` · `/privacy` · `/refund` 가 들어 있어요.
- **깨끗한 주소가 도는 방식**: `vercel.json` rewrites 가 점(.)이 없는 경로를 모두 `index.html` 로 넘기고(`/api/` 제외 · 파일이 있으면 파일 먼저), `index.html` 맨 위 스크립트가 `<base href="/">` 를 둬서 어느 경로에서든 그림 · 화면 파일을 맨 위에서 찾아요. 배포할 때 `scripts/site.js` 가 `index.html` 의 CSS · JS 주소도 `/…` 로 바꿔 둡니다(`scripts/index-abs.js`). SVG 안 `#아이디` 참조는 `ROUTE.frag()` 로 이 문서 주소를 붙여 Safari 에서도 그려져요.

## AI 조교 (강사 학습 자료 + Claude)

- 수강생 강의실의 AI 조교는 진도 · 마감 · 일정 · 용어처럼 화면 데이터로 정확히 답할 수 있는 건 바로 답하고, 그 밖의 질문은 서버 `api/ai-tutor`(그 강사의 수강생 · VOD 구매자 · 강사 · 마스터만, 한 사람 15분에 30번)에 물어요.
- 서버는 강사가 보낸 학습 자료(`api/_lib/tutor/<강사 id>.md` + `api/_lib/tutor/<강사 id>/*.md` — 문대표는 `moon.md`(두고커넥트 · 소량 OEM) + `moon/` 파일 5개(배송 · 운송료 · 통관 · 마누카꿀 공정 · 캡슐 · 입금 계좌))와 강의 FAQ · 용어 사전 · 서류 가이드 · 주차를 프롬프트에 넣고(캐시) Claude로 답해요. 관세를 줄이려는 저가 신고(언더밸류) · 질병 효능 같은 법에 걸리는 안내는 하지 않게 했고, 학습 파일에 있던 언더밸류 안내는 넣지 않았어요.
- Vercel 환경 변수: `ANTHROPIC_API_KEY`(비밀 · 직접 넣기) · `AI_TUTOR_MODEL`(모델 이름). 둘 중 하나라도 없거나 호출이 실패하면 학습 자료에서 가장 가까운 단락을 그대로 보여 줘요(지어내지 않음). 이름 등 개인정보는 보내지 않아요.
- 공식 SDK `@anthropic-ai/sdk` 는 저장소 맨 위 `package.json` 에 있고, Vercel 이 `npm ci` 로 설치해요.

### 학습 자료 카드로 바로 답하기 (2026-11-03 · 키 없이 24시간)

- **왜**: 운영에는 `ANTHROPIC_API_KEY` 가 없어서 지금까지는 글자가 겹치는 한 줄을 찾아 보여 주는 정도였어요. ‘택배 언제 와요?’가 과제 마감으로, ‘배송 기간이 얼마나 돼요?’가 수강 기간으로 답하는 일도 있었어요(화면의 수업 규칙이 먼저 가로챔).
- **학습 자료** (문대표가 보낸 두 폴더 그대로): `api/_lib/tutor/moon.md`(안내) + `moon/doogobio-nz/` 5개 — 배송 일정 · 마감 · 선송장 · 송장 조회 / 운송료 · 창고 · 배대지 / 수량 제한 · 신고 가격 · 배송 정보 / 원산지 · 마누카꿀 8단계 · 배치 차이 / 캡슐 규격 · 입금 계좌, `moon/doogo-connect/` 5개 — 두고커넥트 소개 · 특장점 · 추천 대상 / 견적 요청(5,000P) · 포인트 환불 · 제조 진행 순서 / 최소 수량 · 제조 가능 카테고리 · 제조 국가 / 제조사 입점 / 누구나 요청 · 해외 배송 · 리드타임 · 고객 지원 (카드 28개). doogobio-nz 03 의 ‘관세 회피 전략(언더밸류, 제품당 USD $10 기입)’은 관세법 위반(허위 신고 · 관세 포탈)이 될 수 있어 넣지 않았어요.
- **문대표 답변으로 더한 것 (2026-11-03)**: 운송료 · 창고 금액은 뉴질랜드 달러(NZ$ · NZD) · 100g 미만은 100g으로 올림 · 발송 마감은 월 · 수 모두 뉴질랜드 시간 오후 2시쯤(한국 오전 10시쯤, 뉴질랜드 서머타임이 아닌 4~9월엔 오전 11시쯤) · ‘선송장’(ACI에서 자기 브랜드 제품으로 주문하면 송장 번호가 바로 나와서 쇼핑몰에 바로 입력 → 발송 지연 패널티 방어) 카드.
- **답 카드**(`api/_lib/tutor-kb.js`): ‘## 제목’ 하나가 카드 하나. 카드 아래 주석 `<!-- 질문: 낱말, /정규식/ -->` 이 학생 질문과 맞으면(긴 낱말 · 정규식일수록 점수가 높음) 그 카드를 그대로 보여 줘요. `<!-- 아님: /정규식/ -->` 이 맞으면 그 카드는 안 써요. `moon.json` 의 `avoid`(과제 · 라이브 · 수료 …)가 들어간 수업 질문은 점수를 반으로. 흔한 낱말(장점 · 환불 · 연락처 · 홈페이지 …)은 혼자 쓰지 않고 정규식으로 앞뒤(두고커넥트 · 견적 …)를 붙였어요.
- **계산**(`<!-- 계산: … -->`, 숫자 기준은 `moon.json` 의 `calc`): 운송료(무게 → 1kg까지 NZ$16 · 넘으면 100g마다 NZ$1, 남는 무게는 올림) · 도착일(뉴질랜드 지금 날짜 · 시각으로 오후 2시 마감이 지났는지 보고 가장 가까운 마감 → 화요일 발송이면 그 주 토~다음 주 월 / 목요일 발송이면 다음 주 화~수, 마감의 한국 시각은 서머타임에 맞춰 계산) · 수량(꿀을 뺀 건강식품 1회 6개 기준 — 넘으면 줄이라고만 하고 나눠 보내라고는 안내하지 않아요).
- **법 지키기**: ‘관세 안 내려면 가격 낮게 써도 돼요?’ · ‘언더밸류’ · ‘기준 넘으면 나눠 보내도 돼요?’ 같은 질문은 강사 · 자료와 상관없이(키가 있어도 Claude 없이) ‘실제 결제 가격대로 신고 · 관세청 고객지원센터 125 · 관세사 확인’ 안내.
- **화면**(`app.js`): 대화창을 열 때 `POST /api/ai-tutor { op: "info" }` 로 카드 낱말 · 정규식 · 칩만 받아(학습 자료 내용 · 계좌는 안 받아요) 같은 점수 규칙으로 ‘서버 학습 자료에 먼저 물을 질문’을 골라요 → 마감 · 일정 · 진도 · 용어 규칙보다 먼저. 서버 카드 답(hit)이 화면 FAQ 답보다 먼저예요. 용어 뜻만 묻는 질문(‘배대지가 뭐예요?’)은 용어 사전이 먼저. 짧게 이어 묻기(‘그럼 3kg은요?’)는 바로 앞 질문과 이어서 찾아요. 답 속 주소(배송 조회 · 신청 폼)는 새 창 링크.
- **바로 물어볼 질문 탭 · 한 줄 슬라이드**: 학습 자료가 있는 강사는 칩 위에 ‘수업 · 과제 | 배송 · 통관 | NZ 제조 · 결제 | 두고커넥트’ 탭 (`moon.json` 의 `tabs`, 탭은 4개까지 · 칩은 탭마다 14개까지). 칩은 여러 줄 대신 한 줄로 — 휴대폰은 옆으로 밀고, PC는 마우스로 끌거나 양옆 ‹ › 화살표로 넘겨요(끝에 닿으면 그쪽 화살표 · 흐림이 사라짐, 끌었을 때는 칩이 눌리지 않음). 학습 자료 질문은 화면 규칙이 무엇을 찾았든(‘견적이 안 되면?’ → 오류 안내 같은) 서버 카드에 먼저 물어요.
- **키를 넣으면**: Claude가 학습 자료 전체로 자연스럽게 답하고, 카드에서 계산한 값은 질문 끝에 ‘[조교 계산]’으로 붙여 숫자가 틀리지 않게 해요. Claude가 거절하거나 실패하면 카드 답으로.
- **자료 더 넣기**: 강사 폴더(`api/_lib/tutor/<강사 id>/`) 또는 그 아래 한 단계 폴더(예: `moon/doogo-connect/`)에 `.md` 를 넣고 카드마다 `<!-- 질문: … -->` 을 적으면 끝 (주석이 없으면 제목 · 본문 글자가 겹치는 정도로 찾아요). 탭에 바로 물어볼 질문을 더하려면 `moon.json` 의 `tabs`. `vercel.json` 의 `includeFiles` 가 `tutor/*.md · *.json · */*.md · */*/*.md` 를 함수에 같이 실어요(시험이 모든 학습 파일이 덮이는지 확인). 배포 뒤 `GET /api/ai-tutor` 로 강사별 카드 · 파일 · 탭 수를 확인할 수 있어요(내용 없음).
- **시험**: `node scripts/vod-test.js` 17) — 배송 · 통관 · NZ 제조 · 두고커넥트 질문 36개 · 헷갈리기 쉬운 수업 · 다른 질문 19개(카드 안 씀) · 관세 회피 5개 · 요일별 도착일 · 오후 2시 마감 앞뒤 · 서머타임 한국 시각 · 운송료(NZD) · includeFiles · info(탭 3개 · 계좌 없음) · 키가 있을 때 계산 값 전달 · 거절 · 401.

## 무통장 입금

- 받을 계좌는 VOD 설정(전시 · 쿠폰 · 설정) → 비어 있으면 기수 입금 계좌(매출 · 기수 정산). 주문할 때 입금자명 · 입금 기한(기본 3일)을 받아요.
- 마스터 › 주문 · 결제 위 ‘무통장 입금 확인’ 카드에서 **입금 확인** 을 누르면 바로 수강이 열려요(같이 산 코칭권도). 기한 지난 주문은 한 번에 취소 · 쓴 쿠폰 · 포인트는 돌려줘요.
- 실제 계좌: 배포 때 일회성 작업(`2026-10-30-store-bank-account`)이 통장 사본의 계좌(IBK기업은행 · (주)두고홀딩스)를 VOD 설정에 넣어요 — **계좌가 비어 있을 때만**, 마스터가 넣은 계좌는 그대로. 계좌가 생기면 결제 화면의 무통장 입금이 ‘준비 중’에서 바로 열려요(카드는 PG 심사가 끝날 때까지 ‘PG 심사 중’).
- 종이책을 무통장으로 사면 안내 문구가 ‘바로 수강’ 대신 ‘입금이 확인되면 책을 준비해서 보내 드려요’로 바뀌고, 입금 전에는 종이책 주문 · 배송 ‘입금 대기’, 입금 확인 뒤에는 ‘신규 주문’에 떠요(이 화면에서 바로 입금 확인도 돼요). 계좌번호는 휴대폰에서도 줄이 끊기지 않아요.
- 24시간 자동 확인: 페이액션(PayAction) 키 3개(`PAYACTION_API_KEY` · `PAYACTION_MALL_ID` · `PAYACTION_WEBHOOK_KEY`)를 넣고 웹훅 주소를 `https://www.doogoclass.com/api/vod-bank` 로 정하면, 주문을 만들 때 페이액션에 등록 → 같은 이름 · 금액이 들어오면 자동으로 입금 확인. 못 맞춘 입금은 마스터 카드에서 주문에 직접 연결해요.

## CRM 메시지 실제 발송 (마스터 › DOOGO CLASS › 메시지 · 자동화)

- 캠페인 ‘보내기’는 채널이 연결돼 있으면 서버 `api/admin` 의 `msg-send`(마스터만 · `api/_lib/msgapi.js` · `msg.js`)로 실제 발송해요. 서버가 회원 문서를 다시 읽어 소식 받기 동의 · 채널 동의 · 야간(문자 21~08시는 야간 동의자만 · 브랜드 메시지 20:50~08:00 금지) · 연락처를 확인하고, 광고면 맨 앞 (광고) · 끝에 수신 거부를 넣어요. 연결 전 채널은 예전처럼 기록 · 쿠폰만 남아요.
- 연결 순서와 상태는 ‘채널 · 발송 규칙’ 탭 맨 위 카드 4개(문자 · 알림톡 · 브랜드 메시지 · 이메일)에 나와요. 080 무료 수신거부 번호 · 브랜드 메시지 대상 · 알림톡 템플릿(카카오 승인된 ID · 내용)도 여기서 넣어요.
- Vercel 환경 변수: 문자 · 카카오(솔라피) `SOLAPI_API_KEY` · `SOLAPI_API_SECRET` · `SOLAPI_SENDER`(등록한 발신번호) · `SOLAPI_PFID`(카카오톡 채널) / 이메일(Resend) `RESEND_API_KEY` · `MAIL_FROM`. 발송 기록 최근 100건은 서버 전용 문서 `vmsg`.
- 자동 메시지(가입 환영 · 만료 알림 등)는 지금은 켜 둔 기록만 남아요. 채널 연결 · 알림톡 템플릿 승인 뒤 정해진 시간에 서버가 보내도록 이어서 연결해요.

## 두잉고 계약서 양식 (마스터 › 강사 계약 · 서류)

- ‘두잉고 계약서 양식’ 카드에서 **서비스 이용 계약서** · **개인정보 처리업무 위탁 계약서** Word 양식(회사 정보만 채운 빈칸 양식, `assets/docs/*.docx`)을 내려받아요. 한 번 계약하면 계약 기간 동안 여는 모든 기수(2기 · 3기 …)에 적용돼요.
- 강사별 ‘계약 등록 · 수정’ 창의 이용 계약서 · 개인정보 처리 위탁 동의 줄에서 **채워서 인쇄 · PDF** 를 누르면 그 창에 적힌 계약 기간 · 이용료 · 연락처 · 이메일과 사업자 정보로 채운 계약서가 새 창에 열려요(인쇄 → PDF로 저장).
- 글은 `contract-forms.js` 한 곳에 있어요. 글을 고치면 `node scripts/contract-docx.js` 로 Word 파일도 다시 만들어 주세요(docx 패키지 필요).

## 마스터 화면 편의

- 서버 자동 백업(데이터 관리)은 5개씩, 활동 기록(운영자 · 활동 기록)은 10개씩 ‹ 1 2 3 4 5 › 번호로 넘겨요.
- 두잉고 탭에도 오른쪽 분할 미리보기가 있어요: 대시보드 ‘두잉고 미리보기’ · 강사 플랫폼 관리 · 메뉴 · 색상 설정 ‘강의실 미리보기’ · 첫 화면 · 사업자 정보 ‘첫 화면 미리보기’. 위쪽에서 두잉고 소개 · 수강생 로그인 · 강사별 수강생 강의실 · 강의 소개 · 무료강의를 골라 봐요(강의실은 강사 미리보기와 같은 미리보기 세션이라 실제 수강생 기록은 바뀌지 않아요).

## 기수 · 일정 설계 (마스터 › 학사 관리 › 기수 · 일정 설계)

- 강사 탭을 고르고(모든 강사) 기수마다 **설계 · 수정** 창에서 기수 이름 · 1주차 강의일 · 커리큘럼 · **진행 주차**(기수마다 · 예: 1기 5주 · 2기 4주, `co.weeks` — 비우면 커리큘럼 전체) · 매주 강의 요일 · 시간 · 입장 링크 · 수강 신청 받기를 정해요. ‘새 기수 설계’로 새 기수도 열어요(마스터만).
- 같은 창의 **이 기수 특별 일정**에 무료 강의 · 오프라인 강의 · 온라인 강의 · 챌린지 · 라이브 Q&A · 보너스 강의 · 초청강사 · 행사 · 공지 날짜를 넣어요(장소나 입장 링크 선택). `content.schedule` 에 `scope: "cohort"` 로 저장돼 그 기수 수강생 홈 ‘다가오는 일정’ · 수업 캘린더에 그대로 보여요. 오른쪽에는 저장 전 수강생에게 보일 일정이 날짜순으로 나와요.
- **미리보기** · ‘저장하고 미리보기’는 오른쪽 분할 화면에 그 기수 수강생 대시보드 · 수업 캘린더를 열어요(미리보기 세션이라 실제 수강생 기록은 안 바뀌어요).
- 강사센터 ‘기수 관리’ 카드의 **일정 설계 · 수정**도 같은 창이에요(강사 · 코치는 있는 기수만 고치고, 새 기수 · 삭제는 마스터). ‘수업 캘린더 › 일정 추가’에도 무료 강의 · 오프라인 강의 종류와 장소 칸이 있어요.
- 기수 삭제: 실제 수강생이 있으면 막아요. 체험용 수강생만 있으면 남은 가장 최근 기수로 옮기고 지워요(체험 계정 유지).
- 바로가기: 전체 기수 일정 · 강사 플랫폼 관리 줄의 ‘기수 · 일정’. 담당자 권한은 ‘전체 기수 일정’을 맡으면 같이 가져요.

- **주차별 강의일 바꾸기 (2026-11-03)**: 설계 창 ‘주차별 강의일 바꾸기’에서 그 주차만 다른 날(예: 5주차는 수요일)을 골라요 — 비우면 매주 강의 요일대로. 기수에 `classDates: { "5": "2026-09-23" }` 로 기본과 다른 주차만 남아요(2주차부터 · 1주차 강의일 뒤). 바꾼 날이 원래 주차 시작보다 빠르면 그 날 주차가 열리고(수강생 강의 · 과제), 과제 마감은 원래 마감과 바꾼 날 중 늦은 날. 기수 카드 주차 칸에 ‘강의 9/23(수)’로 보여요 (`DB.classDate` · `weekOpen` · `weekDeadline` · `baseClassDate`).
- **문대표 기수 일정 (일회성 `2026-11-03-moon-cohort-dates`)**: 1기 1/24(토)~2/21(토) 5주 · 2기 8/29(토)~9/19(토) + 5주차 9/23(수) · 지금 4기(11/21 · c4)를 **3기**로 (4주 압축 과정 · 매주 토 12:00) + 3기 특별 일정 5주차 보너스 강의 12/15(화) · 챌린지 1~4회차 11/25 · 12/2 · 12/9 · 12/16(수). 예시였던 예전 3기(10/1 · c3)는 지우고 체험 수강생은 새 3기로(실제 수강생 · 이용료 기록이 있으면 ‘예전 3기’로 이름만). 처음 예시로 들어간 ‘모든 기수 반복’ 챌린지 · 보너스 강의 4개(예시 문구 그대로일 때만)도 지워요. 강사 소개 페이지 ‘4기 수강 신청하기’ → ‘3기 수강 신청하기’, 11/21 기수 이용료 기록 이름도 3기로. 강의 시간 · 특별 일정 시간은 설계 · 수정에서 넣어요.
- **메인 강사 강의를 주차마다 (2026-11-05)**: 메인 강사 강의는 주마다 날짜 · 시간 · 장소 · 방식이 다를 때가 많아서, 설계 창의 **메인 강사 강의** 표(예전 ‘주차별 강의일 바꾸기’ 자리)에서 주차마다 날짜 · 시작 ~ 끝 · 오프라인/온라인(줌) · 장소(또는 입장 링크) · 주제를 정해요. 비운 칸은 위 **기본 강의 시간(시작 ~ 끝)** · **기본 장소** · 강의 입장 링크 → 강사 기본 정보 순서로 채워요.
  - 저장: 날짜는 그대로 `classDates`(2주차부터 · 기본과 다른 날만), 나머지는 `co.classOver = { "1": { time, end, place, url, mode: "online", topic } }`(빈 칸은 빼고 · 장소 칸에 http 링크를 적으면 입장 링크) · 기수 기본값 `classEnd` · `classPlace`. 끝나는 시간은 시작 시간 뒤여야 하고, 그 주차만 시작을 바꾸고 끝을 비우면 끝은 비워요.
  - 수강생 일정: 주차 강의 제목은 ‘N주차 오프라인 강의 — 주제’(시간을 제목에 붙이지 않고 따로) · 온라인 주차는 ‘N주차 온라인 강의’(강의 날 같은 색 · 기본 장소 안 붙음) · 홈 ‘다가오는 일정’ · 일정 카드 · 이달 목록 · AI 조교 ‘다음 강의’ 답에 **13:30~18:30** · 장소. 계산은 `DB.lectureOf` · 시간 글씨는 `DB.evTime`(예전 화면 · React 같이).
  - 관리 화면: 기수 카드 요약(‘매주 토요일 12:00 · 주차별 따로’) · 주차 줄(‘강의 11/22(일) 09:00~13:30 · 3층’) · 일정 칩 · 강사센터 수업 캘린더 목록 · 표에 시작 ~ 끝.
  - 공개(로그인 전) 기수 정보에는 입장 링크를 빼요(기수 칸 · 주차별 강의 둘 다 · `publicCohorts`).
  - 칸 배치(배포 뒤 점검으로 고침): 한국어 브라우저는 날짜 · 시간을 ‘2026. 11. 21.’ · ‘오후 01:30’으로 써서 칸이 좁으면 글자가 잘렸어요(1024px 노트북 · 휴대폰). 줄 배치를 창 폭이 아니라 **왼쪽 칸 폭**(`.pl-left` `@container`)에 맞춰 바꿔요 — 넓은 PC: 특별 일정은 종류 · 날짜 · 시작 · 끝 한 줄, 메인 강사 강의는 날짜 · 시작 · 끝 · 방식 한 줄 · 중간: 종류 + 날짜 / 시작 · 끝, 날짜 · 시작 · 끝 / 방식 · 장소 · 휴대폰: 날짜 한 줄 · 시작 · 끝 나란히(320px 폰은 하나씩). 설계 창은 1180px까지 넓혀요. 재 본 필요한 폭: PC 글자 14px 날짜 132 · 시간 127, 휴대폰 글자 16px 날짜 149 · 시간 139(px).
- **모든 일정에 끝나는 시간 (2026-11-05)**: 챌린지 · 보너스 강의 · 초청강사 · 온라인 강의 등 특별 일정 줄(설계 창) · 강사센터 ‘수업 캘린더 › 일정 추가’에 끝나는 시간 칸 (`e.end` · 시작 시간이 있을 때만 · 시작 뒤). 수강생 화면엔 ‘19:00~22:00’, 달력 칸은 자리가 좁아 시작만.
- **LIVE 기수 정리 + 문대표 3기 강의 (일회성 `2026-11-05-live-lectures`)**: 문대표 말고는 아직 LIVE 기수가 없어서 다른 강사 기수(그 기수만의 특별 일정도)를 지워요 — 수강생(체험 계정 포함)이나 취소하지 않은 이용료 기록이 붙은 기수는 남기고 결과에 적어요(VOD 수강생은 기수가 따로라 그대로). 문대표는 1기 · 2기 · 3기만. 3기: 1주차 11/21(토) 13:30~18:30 3층 해외 건기식 OT · 2주차 11/22(일) 09:00~13:30 3층 브랜딩 · 3주차 12/5(토) 09:00~13:00 3층 자사몰 · 4주차 12/12(토) 09:00~13:30 2층 자동화 · 5주차 12/15(화) 19:00~22:00 ZOOM 라이브 광고의 모든것(커리큘럼 4주 밖이라 이 기수 특별 일정 ‘온라인 강의’ — 있던 5주차 일정을 고쳐요, 입장 링크 그대로).
## 강사별 정산 비율 · 정산 기준 (마스터 › 매출 · 정산 › 정산 비율 · 가격)

- 비율은 **강사 몫(%)** 이고 종류마다 따로예요: VOD 강의(수강권 · 1년 연장권) · 전자책 · LIVE · 오프라인 · 1:1 코칭권 · TEA TIME (+ 광고비 분담). 기본은 강사 50 : 플랫폼 50, 위 ‘기본 비율’에서 바꿔요. 예: 초이 TEA TIME 100% → TEA TIME 매출은 모두 강사님께.
- ‘비율 정하기’ 창의 **적용 시작일** 0시부터 결제한 주문에 새 비율을 써요. 그 전에 결제한 주문은 그때 비율 그대로(`VOD.rateAt`). 가장 나중에 확정한 비율이 그 시작일부터 앞 확정을 덮어요. 시작일이 아직 안 왔으면 표 · 강사 화면에 ‘예정’으로 보여요.
- 주문 한 건의 비율: 주문에 남은 비율 → 강의별 계약(클래스 수정의 ‘강사 정산 비율’) → 결제한 때의 강사 · 종류별 비율(`VOD.shareVal`). 무통장 입금 확인 때 남기는 비율도 같은 규칙이에요.
- **정산 규칙 (2026-11-03 · 하나로 고정)**: **정산 기준액 = 할인 전 판매가 − 온드미디어 RS − PG 결제 수수료**(결제수단별 `settings.pgFee`, 기본 카드 · 간편결제 3.3% · 계좌이체 2% · 가상계좌 건당 300원 · 무통장 0) → **정산액 = 정산 기준액 × 강사 비율(기본 50%)** − 그 달 광고비 강사 분담. 정산액은 부가세가 들어 있는 금액이에요. **사업자** 강사는 정산액 그대로 지급하고 강사님이 (주)두고홀딩스에 정산액(부가세 포함)으로 세금계산서를 발행해요. **개인(3.3%)** 강사는 정산액 ÷ 1.1(부가세 전 금액)에서 사업소득 3.3%를 떼고 지급해요. 예) 1,000만 원 판매 → RS · PG 빼고 500만 원 → 강사 250만 원 · 사업자 250만 원 지급(세금계산서 250만 원) · 개인 250만 ÷ 1.1 = 2,272,727원 − 3.3% 74,990원 = 2,197,737원 지급. `VOD.taxMode()` 는 늘 `"std"`(`VOD.insBase` · `VOD.pgFeeOf`), 마스터 › 정산 비율 · 가격의 ‘정산 기준’ 카드는 이 규칙과 예시를 보여 주기만 해요. 예전 방식(gross · net · supply)으로 확정한 명세서는 확정 때 숫자 그대로예요. 계약서 양식 제6조도 같은 규칙이에요. 체험 계정 주문(0원 · `demo`)은 정산에 넣지 않아요.
- 같은 탭 ‘강사별 가격’에서 강사를 고르면 그 강사 클래스의 정가 · 판매가 · 1:1 코칭권(가격 · 횟수) · TEA TIME(가격 · 시간)을 한 줄씩 바로 고쳐요. 수강권 기간별 가격 · 할인 마감은 클래스 수정에서.
- 강사가 많아도 길어지지 않게 ‘강사별 정산 비율’은 **5명씩**, ‘강사별 가격’은 **강의 5개씩** 번호(‹ 1 2 3 ›)로 넘겨요(다른 강사를 고르면 1쪽부터, 넘기면 그 목록 맨 위로). 휴대폰에서는 비율 칸마다 종류 이름(VOD 강의 · 전자책 · 종이책 · LIVE · 오프라인 · 1:1 코칭권 · TEA TIME · 광고비 분담)이 붙은 작은 칸 3개씩으로 보여요.
- 강사센터: DOOGO CLASS 대시보드 ‘내 수익 쉐어’ · 판매 정산 ‘내 정산 비율’에 같은 숫자가 보이고, **정산 달력**(메뉴 ‘정산 달력’)에서 날짜마다 VOD · 전자책 · LIVE · 코칭권 · TEA TIME 이 몇 개 팔려 정산 예정이 얼마인지 봐요(날짜를 누르면 주문 · 비율 · 정산액).
- TEA TIME 은 Zoom(온라인 화상)으로만 진행해요. 서버(`api/vod-pay`)도 신청을 늘 온라인으로 받아요.

## 코치 메뉴: LIVE 두잉고 / VOD 두잉고 (2026-11)

- 코치마다 **담당 두잉고**를 골라요: **LIVE 두잉고**(기수 · 주차 · 과제로 운영하는 프로그램) · **VOD 두잉고**(DOOGO CLASS에서 VOD를 산 수강생) · **둘 다**. 강사센터 › 코치 관리 › 코치 수정 창에서 담당을 고르면 그쪽 메뉴 묶음만 보여요(둘 다면 두 묶음). 담당이 아닌 쪽 메뉴는 체크해 두어도 열리지 않아요(저장할 때도 빼요).
- **LIVE 두잉고 메뉴**: 운영(수강생 관리 · 기수 관리 · 과제 검수 · 1:1 요청 답변) · 수강생 화면 콘텐츠 18개 · 홍보(무료강의 페이지 · 강사 소개 페이지). 빠른 선택: 과제 · 문의만 / 운영 전체 / 모두 선택 / 모두 해제.
- **VOD 두잉고 메뉴**: 운영(VOD 수강생 · 1:1 코칭 답변 · TEA TIME 신청) · **매출 (보기만)**(VOD 판매 내역 · 무료 LIVE · 온/오프라인 판매 · 판매 정산 · 정산 달력) · VOD 강의실 꾸미기(VOD 강의 · 수업 자료 · 기본 정보(LIVE와 함께 씀) · 메뉴 구성 · 시작 가이드 · 업데이트 소식 · FAQ · 실습 체크리스트 · 용어 사전 · 강의 자료함 · 응원 영상 · 1:1 상담 채널 · 제휴 혜택 · 추가 메뉴). 빠른 선택: 코칭 · TEA TIME만 / 운영 + 매출 / 모두 선택 / 모두 해제. VOD 강사가 직원을 코치로 두고 매출 확인 · TEA TIME 일정 확정 · 1:1 코칭 답변을 맡길 때 써요.
- VOD 강의실 꾸미기 메뉴는 LIVE 메뉴와 이름이 같아도 열쇠가 따로(`v-notices` …)라서, LIVE 코치는 VOD 강의실을, VOD 코치는 LIVE 강의실을 고치지 못해요. 서버도 같은 표로 문서 안에서 맡은 쪽만 받아요: `content` 는 LIVE 칸 / VOD 강의실(`vod` · `vodBy`), `ins` 는 LIVE 메뉴(`menu`) / VOD 메뉴(`menuVod` · `menuVodBy`).
- 코치센터: LIVE 코치는 두잉고 탭, VOD 코치는 DOOGO CLASS 탭으로 바로 열리고(탭 스위치 없음), 둘 다 맡은 코치만 탭을 오가요. 대시보드에 ‘내가 맡은 메뉴 · LIVE(VOD) 두잉고’ 카드(다른 탭 메뉴는 이름만). VOD 코치 대시보드 · 1:1 코칭 · TEA TIME 화면의 매출 숫자는 매출 메뉴를 맡았을 때만 보여요.
- **매출은 보기만**: 판매 정산 화면에서 코치는 정산 계좌 등록 칸 · ‘세금계산서 발행 완료’ 버튼이 없고(정산 유형만), 서버도 코치에게는 강사 계좌 · 사업자번호 · 이메일을 보내지 않아요(`access.js` coachIns). 정산 내역(`vpo:<강사>`)은 판매 정산 · 정산 달력을 맡은 코치만 읽고 고치지는 못해요. 계약 · 서류 · 코치 관리 · VOD 강의 연결은 강사님만.
- **TEA TIME 저장 고침**: 예전에는 강사가 TEA TIME 일정을 확정 · 진행 완료해도 그 강사 화면에만 남고 서버에 저장되지 않았어요. 이제 강사와 TEA TIME 코치가 자기 클래스 주문의 TEA TIME 칸만 저장해요(확정 날짜 · Zoom 링크 · 진행 완료 · 다시 잡기 — 금액 · 결제 · 회원 칸은 그대로, 취소 · 환불 요청은 강사만, `vodaccess.js` fixStaffTea). 같이 고친 것: VOD 강의 · 수업 자료를 맡은 코치는 그 강사 VOD 커리큘럼만 저장해요(전에는 코치가 고쳐도 서버에 안 갔어요). 1:1 코칭 답변만 맡은 코치도 답변이 저장돼요(전에는 서버가 막았어요).
- 주문 공개 범위: 그 강사 클래스 주문(이름 가림)은 강사와 VOD 쪽 메뉴(VOD 수강생 · 1:1 코칭 · TEA TIME · 매출)를 맡은 코치만 받아요. LIVE 코치에게는 VOD 주문 · 정산 문서가 내려가지 않아요.
- 예전 코치(담당 칸 없음): VOD 메뉴가 하나라도 있으면 ‘둘 다’, 없으면 ‘LIVE’로 읽어요(둘 다면 예전처럼 같은 이름의 VOD 강의실 메뉴도 열림). 문대표 코치들은 일회성 작업 `2026-11-03-moon-coaches-live` 로 LIVE 담당이 돼요(담당 칸이 빈 코치만 · 메뉴 체크는 그대로).
- 표는 `coach-perms.js` 한 곳(화면 `admin.js` · `db.js` 와 서버 `api/_lib/auth.js` · `access.js` · `vodaccess.js` 가 함께 씀 — `index.html` 에서 `db.js` 보다 먼저, 배포 함수 `includeFiles` 에도 들어 있어요). 테스트: `node scripts/vod-test.js` 22번.

## 강사 영역: LIVE 두잉고 / DOOGO CLASS(VOD) 나누기 (2026-11)

- 강사마다 열린 영역이 있어요(`ins.tracks` — `{ live, vod }`, 칸이 없으면 예전 강사라 둘 다 열림 · `DB.tracksOf`).
  - **VOD 강사**: 마스터 › 강사 입점 문의의 두고 파트너스 지원 → **‘VOD 강사로 등록’** (또는 강사 플랫폼 관리 › ‘VOD 강사 등록’) — 기수 · 1인 수강료 · 1기 시작일 없이 강사센터 계정(이름 + 전화번호 뒷자리)만 만들어요. DOOGO CLASS 탭만 열리고 두잉고(LIVE) 탭은 자물쇠.
  - **LIVE 강사**: 두잉고 첫 화면 ‘강사 입점 문의’ → **‘LIVE 플랫폼 만들기’** (또는 ‘새 강사 플랫폼 (LIVE)’) — 지금처럼 문대표 플랫폼 구성 · 1기 · 1인 수강료. 두잉고 탭만 열리고 DOOGO CLASS 탭은 자물쇠.
  - **둘 다**: 문대표처럼 두 탭이 다 열려요. 예전 강사(문대표 · 부알남 · 갓농부 · 초이)는 둘 다 열린 그대로예요. 마스터 › 강사 플랫폼 관리 › ‘수정’의 **열린 영역** 체크로 바로 열고 잠글 수 있고, 목록의 ‘열린 영역’ 칸에 보여요.
- 강사센터: 잠긴 탭은 자물쇠 아이콘(탭 아래 ‘… 입점 신청하기’ 버튼도). 누르면 그 영역 **입점 신청 팝업** — 두잉고(LIVE)는 두잉고 첫 화면 입점 문의와 같은 칸, DOOGO CLASS는 두고 파트너스 지원서의 핵심 칸(활동명 · 강의 분야 · 열고 싶은 클래스 · 클래스 주제 · 노하우 · 오픈 시기 · 판매가). 보내면 `POST /api/public { action: "track-apply" }`(로그인한 강사 본인만 · 처리 중인 같은 신청은 한 번만 · 이미 열린 영역은 거절)가 입점 문의(`inq:<id>`, `addTo` = 강사 · `want` = live | vod)로 저장하고 강사 계정에 ‘신청 중’(`trackReq`)을 남겨요. 잠긴 영역 메뉴를 주소로 열어도 자물쇠 안내 화면이에요(DOOGO CLASS 판매 메뉴 포함).
- 마스터 › 강사 입점 문의: ‘기존 강사 · LIVE 두잉고(DOOGO CLASS) 열기 신청’ 표시 → **‘열어 주기’**를 누르면 그 영역이 열리고 신청은 ‘계약 완료’, 5단계가 ‘… 열기’로 끝나요. ‘계약 안 됨’으로 바꾸면 강사님이 다시 신청할 수 있어요. 마스터가 강사센터를 대신 볼 때 자물쇠를 누르면 바로 열어 줄 수 있어요.
- 서버: 강사가 보내도 `tracks` · `trackReq` 는 서버 값 그대로(`access.js` INS_MASTER). 방문자 · 수강생이 받는 강사 계정에서는 연락처(`contact`) · 정산 정보(`vodSettle`) · 신청 표시를 빼요(전에는 정산 계좌가 공개 강사 계정에 들어 있었어요). 코치도 연락처는 안 받아요.
- LIVE 두잉고가 잠긴 강사(VOD 강사)는 수강생 로그인 강사 고르기 · 두잉고 첫 화면 강사진 · 강의 소개 · 무료강의 목록에 나오지 않아요(`DB.liveInstructors`). VOD 수강생은 DOOGO CLASS에서 들어와요.
- 코치: 강사님 영역이 잠긴 쪽은 코치 담당으로 고를 수 없어요(코치 수정 창에서 자물쇠). VOD 클래스 관리의 강사 고르기에는 ‘DOOGO CLASS 잠김’이 붙어요.
- 테스트: `node scripts/vod-test.js` 23번.

## 강사 입점 → 강사센터 계정 (2026-11-06)

- 흐름: 지원서(DOOGO CLASS ‘두고 파트너스’ = VOD · 두잉고 첫 화면 ‘강사 입점 문의’ = LIVE) → 마스터 › 강사 입점 문의에서 열람 · 상담 · **계약 완료** → 카드의 **‘VOD 강사로 등록’ / ‘LIVE 플랫폼 만들기’** → 지원서의 **이름 = 아이디**, **전화번호 뒷자리 4자리 = 비밀번호**로 강사센터 계정이 바로 열려요(사용 중). VOD 는 DOOGO CLASS 탭만(두잉고 LIVE 자물쇠), LIVE 는 두잉고 탭만(DOOGO CLASS 자물쇠). 등록이 끝나면 결과 창에 아이디 · 비밀번호와 **강사님께 보낼 안내**(강사센터 주소 · 아이디 · 열린 메뉴 — 비밀번호 숫자는 안 넣어요)가 나와요(‘안내 복사’).
- 처리할 일: 계약 완료인데 아직 계정을 안 만든 새 강사 문의도 ‘처리할 일’에 남아요(`inqTodo`) — 등록까지 끝나야 빠져요(예전엔 계약 완료로 바꾸는 순간 목록에서 빠져서 등록 버튼을 찾기 어려웠어요). 계약 완료로 바꾸면 토스트로 다음 할 일(등록)을 알려 줘요.
- 카드의 **강사센터 계정 칸**(`inqRegHtml` — 예전 화면 · React 같은 조각): 아이디 · 비밀번호(뒷자리) · 사용 중/멈춤 · 열린 영역 · 연결된 VOD 클래스(또는 LIVE 기수) · ‘로그인 안내’ · ‘강사 계정 수정’. 연결된 계정이 지워졌으면 ‘연결된 강사 계정을 찾지 못했어요’ + 다시 등록 버튼(예전엔 연결 표시 `iid` 만 보고 버튼을 숨겼어요). 진행 칸 5단계는 계정이 정말 있을 때만 끝(파트너센터는 예전처럼 `iid`).
- **스토어 클래스 연결**: 두잉고 계정 없이(강사 키 `ext:이름`) 먼저 올린 클래스(예: 셀러훈)를 그 강사 계정으로 옮겨요 — 등록 창(지원서 이름 · 활동명과 같으면 미리 체크)이나 계정 칸의 ‘스토어 클래스 연결’. 클래스 강사(`iid`)와 함께 `ext:이름` 키로 쓰던 스토어 노출(`insOff`) · 정산 비율(`insRates`) · 강사진 순서(`homeRails` teach) · 지급 기록 키도 새 계정으로 옮겨요. 이미 팔린 주문도 그 강사 정산에 들어가요(창에 건수). 마스터 저장 때 가격표(`vcat`)가 다시 올라가 VOD 수강생 강의실(`dg`)도 열려요. 두잉고 첫 화면의 VOD 강사 카드는 그대로(`home.js` vodOnly 가 VOD 강사 계정도 보여요) · 예전 강사 페이지 주소(`#/vod/teachers/ext:이름`)도 그 강사로 열려요. 마스터 › 강사 스토어 노출의 ‘두잉고 계정 없는 강사’에도 연결 안내가 붙어요.
- 겹침: 같은 이름(띄어쓰기 무시 — 서버 로그인 `auth.norm` 과 같게) + 같은 뒷자리로 로그인하는 강사 · 코치가 있으면 만들지 않아요(VOD 등록 · LIVE 만들기 · 강사 수정) — 겹치면 ‘강사’ 탭 로그인이 다른 계정으로 들어가요.
- 서버: 두잉고(LIVE)가 잠긴 강사(VOD 강사로만 등록)는 기수 수강 신청(`/api/public` signup)을 받지 않아요(예전 강사 · 칸 없음은 그대로).
- 테스트: `node scripts/vod-test.js` 23번 · 화면 `node scripts/e2e/run.js onboard`(지원서 → 계약 완료 → 등록 · 클래스 연결 → 강사 로그인 자물쇠 · LIVE 반대 · 겹침 · 지워진 계정 — 예전 화면 · `E2E_SERVER=next E2E_REACT=1` React 화면 모두).

- 스토어 머리띠(2026-11-06): 아래 줄 오른쪽 ‘DOOGO CLASS 소개 · 두잉고 · **강사센터** · 문의하기’ — 강사센터는 `#/center`(로그인 안 했으면 강사센터 로그인, 했으면 대시보드). 1023px 이하(휴대폰 · 태블릿)는 머리띠 오른쪽 줄이 숨고 ‘메뉴’(전체 메뉴) › DOOGO CLASS 묶음의 두잉고 바로 아래 ‘강사센터 (강사 · 코치 로그인)’ · 바닥 DOOGO CLASS 칸(두잉고 → 강사센터). (탭 줄 오른쪽 고정 버튼은 2026-11-06 써 보고 뺐어요) 태블릿(640~959px)은 머리띠 검색창이 눌려 ‘두고 파트너스’ 위로 겹쳐서 숨겨요(검색은 ‘전체 카테고리’ 맨 위). 예전 화면(`vod.js`) · React(`ui/store/Shell.jsx`) 같게.

- 두잉고 / 두고클래스 색 (2026-11-06): 고른 쪽 손잡이가 **두잉고 = 파란색**(`#2563eb` 그라데이션) · **두고클래스(DOOGO CLASS) = 빨간색**, 글자는 흰색. 스토어 · 두잉고 첫 화면 바꾸기(`.site-sw` · `vod.css`)와 강사센터 · 마스터 ‘관리 영역’(`.a-trk-sw` · `admin.css`) 모두 같게 — 문대표 NZ 테마도 DOOGO CLASS 는 빨간색(예전 네이비 손잡이 뺌). 맨 앞이 손잡이(`<i>`)라 글자 색은 `:first-of-type` 으로 잡아요.

- 로그인 · 로그아웃 손질 (2026-11-06): 두잉고 강의실 로그인(`/login`)의 두고클래스 탭 · 스토어 로그인(`/vod/login`)의 DOOGO CLASS 로고를 카드 가운데로. 두잉고 강의실 로그인 위쪽 큰 버튼은 고른 탭을 따라 ‘두잉고 홈페이지 이동하기’(`#/doinggo`) ↔ ‘두고클래스 홈페이지 이동하기’(`#/vod`) — 예전 화면은 `app.js` `homeBigTo` · 탭을 바꿀 때 `svcSwitch` 가 글자 · 주소를 바꿔요 · React 는 `ui/dg/Login.jsx`. **로그아웃은 어디서 하든 세 쿠키(`dc_s` 수강생 · `dc_a` 강사센터 · `dc_v` 회원)를 모두 풀어요**(`/api/auth` `{action:"logout", which:"all"}` — 강사센터 · 두잉고 강의실 · 스토어 로그아웃 모두 `"all"`). 예전에는 자기 쿠키만 풀어서, 같은 브라우저로 회원 로그인한 뒤 강사센터에서 로그아웃하면 스토어에 ‘체험회원님’이 남았어요. 테스트: `vod-test.js` 23번 · `e2e/run.js logins`(회원 + 강사센터 → 강사센터 로그아웃 → 스토어 ‘로그인’ · 두잉고 VOD 강의실 로그아웃 → 스토어 회원도 풀림).
- 강사센터 휴대폰 아래 탭 (2026-11-06): **전체(메뉴) 맨 왼쪽 · 가운데 동그란 ‘홈’ = 대시보드**(`#/center`) · 양옆에 나머지 탭 — LIVE ‘전체 · 수강생 · 홈 · 과제 검수 · 1:1’, VOD ‘전체 · VOD 수강생 · 홈 · 판매 · 코칭’. 동그란 홈은 두잉고(LIVE) 파랑 · 두고클래스(VOD) 빨강(`.bw-tr-live` / `.bw-tr-vod` · `home.css`). 권한으로 탭이 빠져도 홈이 가운데에 오게(짝수면 끝에 빈 칸 `.bw-tab-sp`). 예전 화면 `admin.js` · React `ui/center/Shell.jsx` 같게.
- 강사센터 머리띠 미리보기 버튼 (2026-11-06): 이름은 **‘수강생 화면’**(VOD 탭 PC 는 ‘VOD 수강생 화면’) — 휴대폰도 아이콘 + ‘수강생 화면’ 한 줄. 같은 날 다른 곳의 ‘수강생 화면 미리보기’ · ‘수강생 화면 보기’ 글자도 모두 ‘수강생 화면’으로(대시보드 · 메뉴 구성 · 사이드 카드 · 오른쪽 분할 제목 · 일정 미리보기 버튼).
- 메뉴 묶음 제목 (1차 카테고리 · 2026-11-06): 강사 · 코치 · 마스터 · 파트너 · 온드미디어 센터의 왼쪽 메뉴 묶음 제목(`.a-nav-label`)을 **진하게(13px · 800) + 왼쪽 색 막대 + 오른쪽 가는 선**으로. 막대 색은 관리 영역 탭을 따라 두잉고 파랑 · 두고클래스 빨강(`.a-side:has(.a-trk-sw.at-live/.at-vod)`), 탭이 없는 센터(파트너 · 온드미디어)는 센터 기본 색. 수강생 강의실(두잉고)은 묶음 제목이 없어서 **1차 메뉴를 진하게**(700 · 진한 글자 · 하위 메뉴는 500), 하위 메뉴가 열린 1차 메뉴는 왼쪽에 강사 색 막대(`styles.css`).
- 머리띠 로고 = 관리 영역 탭 (2026-11-06): 마스터 · 강사센터 · 코치센터에서 관리 영역 탭이 **DOOGO CLASS 면 머리띠 로고도 빨간 DOOGO CLASS 글자 로고**(`assets/brand/doogo-class-word.svg` · 누르면 `#/vod`), 두잉고면 두잉고 로고(`#/doinggo`). 마스터 옆 이름표는 두 탭 모두 ‘마스터 관리자’(로고가 영역을 보여 줘서). 좁은 폰(≤380px)은 로고를 조금 줄여 머리띠가 한 줄에 들어가요. 예전 화면 `admin.js` · React `ui/center/Shell.jsx`(`dcL`) 같게.
- 강사 플랫폼 관리 · 열린 영역 칩 (2026-11-06): ‘두잉고 LIVE’ = 파랑(`.a-pill.trk-dg`) · ‘DOOGO CLASS’ = 빨강(`.a-pill.trk-dc`) — 관리 영역 탭 · 첫 화면과 같은 색. 휴대폰 카드에서 긴 알약은 칸 안에서 줄을 바꾸고(‘처음 데이터 숫자 그대로’ 빨간 표시는 같은 날 뺐어요), 머리 버튼(강의실 미리보기 · VOD 강사 등록 · 새 강사 플랫폼 (LIVE))은 글자 길이대로 줄을 바꿔 채워요(예전엔 한 줄에 셋을 억지로 나눠 겹쳤어요 · `.a-head-actions` 휴대폰).
- 문구 (2026-11-06): 입점 카드 · 연결 창의 ‘스토어 클래스’를 ‘두고클래스’로 — ‘두고클래스 연결’ 버튼 · ‘두고클래스 강의를 ○○ 계정으로’ 창 · ‘두고클래스에 두잉고 계정 없이 올린 클래스’.
- **알림(토스트) 한 줄** (2026-11-07): 화면 아래 검은 알림을 한 줄로 — ① 문구: 알림 · 저장 안내(`toast` · `commit` · `notify` 등) 530여 개 중 긴 것 210여 개를 핵심만 남겨 줄였어요(예: ‘오래 사용하지 않아 안전을 위해 로그아웃했어요. 다시 로그인해 주세요.’ → ‘오래 사용하지 않아 로그아웃됐어요.’ · ‘…저장을 눌러야 반영돼요.’ → ‘…저장해 주세요.’). 예전 화면(`admin.js` · `app.js` · `vod.js` · `main.js`) · React(`ui/`) 같은 문구. ② 모양(`styles.css`): 휴대폰은 화면 폭에 맞춰 넓게 · 아래 탭 막대 위(84px) · 13px, 글자는 줄을 바꾸지 않고 넘치면 12px(`t-sm`), 그래도 넘치면 그때만 두 줄 — `icons.js` `toastFit`(#toast-root 에 붙는 알림을 지켜봐요). 측정: 지금 문구 전부를 360px · 390px 폰에서 띄워 보면 이름 자리에 세 글자를 넣어도 360px 에서 두 개만 두 줄(숫자가 들어가면 한 줄) · 390px 은 모두 한 줄.
- **DOOGO CLASS › 강사 관리** (`#/center/master/vod-ins` · 2026-11-06): DOOGO CLASS 탭 왼쪽 메뉴 ‘강사 · 크리에이터’ 묶음 맨 위. DOOGO CLASS에서 파는 강사(DOOGO CLASS 탭이 열렸거나 클래스가 있는 두잉고 계정)와 계정 없는 크리에이터(`ext:이름`)를 카드 한 장씩 — **한 쪽에 2명**, 아래 쪽 번호(1 · 2 · 3 …)로 넘겨요(강사가 많아도 가볍게):
  - 무엇을 파는지 — 종류별 클래스 수 · 클래스마다 판매 상태 · 가격 · 판매 수(4개까지 + 나머지는 VOD 클래스 관리) · 누적 / 이번 달 판매 · 지급일.
  - 정산 — 파는 종류의 강사 몫 비율 · 광고비 분담 · 계약 메모(‘정산 비율’ 버튼 = 정산 비율 · 가격의 같은 창) · 정산 유형 · 계좌 등록 여부 · 연락처.
  - 계정 · 정보 수정(`vins-edit`) — 강사 이름(아이디) · 전화번호 뒷자리(비밀번호) · 보이는 이름 · 연락처 · 이메일 · 상태(운영 중 / 로그인 중지) · 정산 유형(개인 3.3% / 사업자 — 정하면 ‘마스터가 정함’, 확정한 명세서는 그대로). 같은 이름 + 뒷자리 계정은 막아요(`loginTaken`).
  - 스토어 노출 끄기 · 켜기(`insOff` — 예전 ‘강사 스토어 노출’과 같은 스위치) · 강사센터 접속 · 정산 명세.
  - **강사 삭제**(`vins-del`): 클래스 · 주문이 있으면 지우지 않고 계정을 ‘삭제됨’(`status: "removed"`, `removedAt`)으로 — 강사센터 로그인 막힘(서버는 `active` 만 로그인) · 스토어 노출 끔(새로 못 삼) · 이미 산 회원은 내 강의실에서 계속 수강 · 강사님 VOD 두잉고 강의실은 닫힘 · 주문 · 정산 기록과 이번 달 판매분 정산은 그대로. 아래 ‘삭제한 강사’에서 되살리기(`vins-restore` · 로그인 · 스토어 노출 다시). 클래스 · 주문이 하나도 없으면 계정을 바로 지워요. 두잉고(LIVE) 기수 · 수강생도 있는 강사는 계정은 두고 DOOGO CLASS 탭만 닫고 스토어에서 내려요(플랫폼째 지우기는 두잉고 › 강사 플랫폼 관리 › 플랫폼 삭제). 삭제한 강사는 VOD 클래스 강사 고르기 목록에서 빠지고, 두잉고 강사 플랫폼 표에는 ‘삭제됨’으로 보여요.
  - 운영자 권한은 ‘강사 플랫폼 관리’(`master/instructors`)와 같아요. React 화면은 예전 본문을 React 틀 안에 그대로(`legacyPage`). 테스트: `e2e/run.js onboard` 5단계(메뉴 · 로고 · 카드 → 뒷자리 · 정산 유형 수정 → 새 뒷자리 로그인 → 삭제(로그인 막힘 · 스토어 숨김) → 되살리기).

## 강사 정산: 무엇이 팔렸는지 (상품 종류 탭 · 2026-11-03)

- 마스터 › 강사 정산 위에 **상품 종류 탭**(전체 · VOD 강의 · 전자책 · 종이책 · LIVE · 오프라인 · 1:1 코칭권 · TEA TIME, 숫자 = 그 달 건수)이 있어요. 탭을 고르면 그 종류를 판 강사만 남고, 위 요약 줄에 그 종류의 강사 수 · 건수 · 판매가 · 강사 정산액이 보여요.
- 강사 이름 아래에 종류별 칩(예: ‘전자책 1건 · 29,000원’), 판매가 아래에 PG 수수료, 세금 칸에 부가세 빼기 · 3.3%가 보여요. 명세서 창 · 강사센터 판매 정산 카드에도 **상품 종류 표**(건수 · 판매가 · 정산액)가 있어요. 예전에 확정한 명세서는 주문 목록(ids)으로 종류를 다시 계산해요. 명세 CSV 에 상품 종류 · 결제수단 · PG 수수료 · 정산 기준액 · 정산 비율 칸이 있어요.

## React 화면 (Next.js 전환 4-4 ~ 6단계 · 2026-11-04 시작)

화면을 하나씩 **React(Next.js)로 새로 만들고, 다 만든 화면만 켜요.** 꺼져 있으면 예전 화면(index.html) 그대로예요. 두고클래스 정식 홍보 전에 6단계(강사센터 · 마스터)까지 옮기는 게 목표예요.

- **어디에:** 화면 코드 `ui/`(저장소 맨 위) · 화면 틀 `app/(react)/layout.js` · 화면 고르기 `ui/App.jsx` · 주소 넘기기 `proxy.js` · 옮긴 화면 목록 `class/shared/screens.js`
- **어떻게 열려요:** 켜진 화면 주소(예: `/vod/my`)로 들어오면 `proxy.js` 가 React 화면 틀(`/n/vod/my` — 주소창은 그대로)을 보내요. 틀은 예전 index.html 과 같은 CSS · 같은 공용 스크립트(주소 · 데이터 · 아이콘 · 약관 · `main.js`)를 같은 순서로 받아요(빌드 때 만든 `public/index.html` 에서 목록을 읽어요).
- **나눠 맡기:** 서버 연결 · 로그인 맞추기 · 자동 로그아웃 · 다른 사람이 바꾼 내용 다시 그리기는 예전처럼 `main.js` 가 하고, **그리기만 React** 가 해요(`window.ReactApp.go`). 계산(가격 · 진도 · 쿠폰 · 배지 …)과 데이터 저장(db.js 동기화)은 예전 코드(`window.VOD` · `DB`)를 그대로 빌려 써서 결과가 어긋나지 않아요 — 화면을 다 옮기면 이 계산을 공용 모듈(`class/shared/`)로 옮겨요. React 화면 틀(`<body data-react>`)에서는 예전 스토어 화면 이벤트가 돌지 않아요.
- **오가기:** React 화면 ↔ 예전 화면으로 옮겨 가면 `main.js` 가 페이지를 새로 불러요(서버가 맞는 쪽을 보내요). 링크 · 주소 모양(`#/vod/…`)은 예전과 같아요.
- **아직 옮기지 않은 작은 조각:** 클래스 썸네일 그림(thumbArt)은 예전 코드 그대로 넣어요(`ui/lib/Raw.jsx` — 옮기면 지워요).
- **버튼 · 저장:** 쿠폰 등록 · 1:1 문의 · 회원 정보 저장 · 카카오 연결처럼 서버와 주고받는 일은 예전 처리 함수(`VOD.doCoupon` · `doInquiry` · `doAcct` · `kakaoLink` …)를 그대로 불러요. 돈이 걸린 주문 처리(입금 대기 주문 취소 `ordCancelDo` · 0원 신청 취소 `ordCancel0Do` · 환불 요청 `doRfReq` · 요청 취소 `rfUndoDo` · 바로 취소 `rfNowInfo` + `rfCancel` · 배송지 바꾸기 `doShipEdit`)는 예전 화면의 클릭 처리에서 함수로 빼서 예전 화면 · React 화면이 같은 함수를 써요. 폼 안 바꾸기(배송 요청사항 · 결제수단 · 동의)도 `VOD.formChange` 하나. 그 함수가 끝에 부르는 ‘다시 그리기’(`render`) · ‘팝업 닫기’(`closeModal`)는 React 화면 틀에서 React 로 넘어가요.
- **처음 그리기 전에:** 스토어 영역은 결제 · 로그인 설정(`/api/vod-config`)을 받은 뒤 그려요(`VOD.reactBoot` = 예전 `VodApp.mount` 와 같은 일). 받기 전에 그리면 쿠폰 받기 · 결제가 서버를 거치지 않는 시안 방식으로 처리돼요 — 4-4 시험에서 찾았고, 11/4 마스터 환불 버그와 같은 종류예요.
- **예전 HTML 칸의 바꾸기:** React 의 onChange 는 React 가 그린 칸에만 와서, 예전 HTML 로 넣은 칸(결제 화면의 수강권 줄 · 무통장 상자 · 배송지 칸)은 폼에 브라우저 change 를 직접 달아 `VOD.formChange` 로 보내요 — 4-4 시험에서 찾았어요(수강권을 바꿔도 금액이 그대로였어요).
- **새로 불러도 알림 그대로:** React 화면 ↔ 예전 화면 · 영역을 옮기려고 새로 부를 때 떠 있던 알림(로그아웃했어요 · 오래 사용하지 않아 로그아웃 …)을 새 페이지에서 이어서 보여 줘요(`main.js` `dc:toasts`).
- **켜고 끄기:**
  - 모두: Vercel 환경 변수 `DC_NEXT=all` · 몇 개만: `DC_NEXT=vod-my` (쉼표) · 하나만 끄기: `DC_NEXT_OFF=vod-my` — 바꾸면 다시 배포
  - 이 브라우저만: 아무 주소 뒤에 `?dc_next=all`(켜기) · `?dc_next=off`(모두 끄기) · `?dc_next=vod-my` — 쿠키 `dc_next` 로 90일 기억, 주소에서는 지워요
- **같은 모양인지 확인:** 화면 테스트 `react`(Next.js 서버에서만)가 같은 시험 DB · 같은 회원으로 예전 화면(`dc_next=off`)과 React 화면(`dc_next=all`)의 `#root` 구조(태그 · 속성 · 글자)를 PC · 휴대폰에서 줄마다 비교해요. 다르면 실패해요. 모든 화면 테스트를 React 화면을 켠 채로: `E2E_SERVER=next E2E_REACT=1 node scripts/e2e/run.js`
- **옮긴 화면:**

| 화면 키 | 주소 | 내용 | 상태 |
|---|---|---|---|
| `vod-my` | `/vod/my` · `/vod/my/<메뉴>` | 두고클래스 마이페이지 메뉴 전부 — 홈 · 내 강의실 · 무료강의 · VOD 강의 · 1:1 코칭 · TEA TIME · 전자책 · LIVE · 오프라인 · 오픈 알림 · 찜 · 관심 부업 · 결제 대기 · 주문 · 결제 내역(영수증 · 환불 규정 · 바로 취소 · 환불 요청 · 요청 취소) · 종이책 배송 조회(배송지 바꾸기 · 취소 · 반품 · 교환) · 쿠폰 · 포인트 · 내 수강 후기 · 다짐 한마디 · 내 배지 · 회원 정보 수정 · 기기 관리 · 고객센터 · 1:1 문의 (+ 머리띠 · 전체 카테고리 · 내 계정 메뉴 · 전체 메뉴 · 바닥 · 아래 메뉴) | 미리보기 · 운영은 꺼짐 |
| `vod-auth` | `/vod/login` · `/vod/signup` · `/vod/dg` | 두고클래스 로그인 · 회원가입(탭 [두잉고 · 두고클래스] · 두잉고 강사 고르기 · 카카오 · 비밀번호 찾기 · 자주 묻는 질문 · 봇 막기) · 두잉고 VOD 강의실 고르기 | 미리보기 · 운영은 꺼짐 |
| `vod-order` | `/vod/order/<번호>` | 주문 확인 (결제 · 신청 · 입금 대기 완료 · 휴대폰 결제에서 돌아오기) | 미리보기 · 운영은 꺼짐 |
| `vod-checkout` | `/vod/checkout/<클래스>` | 주문 · 결제 (수강권 · 코칭권 · TEA TIME · 종이책 · 무료 신청 — 금액 다시 계산 · 결제는 예전 함수 `coPaint` · `doPay` 그대로) | 미리보기 · 운영은 꺼짐 |
| `vod-learn` | `/vod/learn/<클래스>/<강의>` | VOD 강의실(영상 · 강의 노트 · 첨부 · 커리큘럼 · 완료하기 — 두잉고 강의실이 열린 VOD 는 두잉고로) · 전자책(표지 · 목차 · PDF) · LIVE · 오프라인 입장 안내(남은 시간) | 미리보기 · 운영은 꺼짐 |
| `vod-home` | `/` · `/vod` | 스토어 홈 (배너 — 끝에서 처음으로 같은 방향 · 5초마다 · 멈춤 · 밀기 / 카테고리 아이콘 / 홈 화면 섹션 — BEST · 학습 시스템 · 전자책 · 분야별 탭 · NEW · 무료 LIVE · 얼리버드 · 프리미엄 · 무료 · 오픈 예정 · 다루는 부업 찜 · 강사진 — PC · 휴대폰 모두 한 줄 슬라이드 · 좌우 화살표 · 끌기 · 밀기로만 넘어가요(자동으로 안 넘어가요)) · 공개 화면 | 미리보기 · 운영은 꺼짐 |
| `vod-product` | `/vod/p/<클래스>` | 클래스 상세 (배너 · 미리보기 창 · 별점 · 소개 · 강의 정보 · 추천 · 코멘트 / 가격 카드 — 수강권 · 코칭권 · 쿠폰 받기 창 · 수강신청 · 찜 · 공유 / 탭 · 소개 · 강사 · 수강권 · 커리큘럼 · 후기 쓰기 · 다짐 · 공감 · 강의 정보 · FAQ · 환불 규정 · 함께 보는 클래스 / 휴대폰 결제 막대 · 옵션 창) — 계산은 예전 `productView` · `buyView` · `planView` · `fbarView` · `ctaOf`, 쿠폰 · 후기 · 다짐은 `cpGet` · `doReview` · `doPledge` · `plUp` · `plDel` · 공개 화면 | 미리보기 · 운영은 꺼짐 |
| `vod-list` | `/vod/c/<분야 · all · soon · best · new · free>` · `/vod/search?q=` | 전체 클래스(종류 탭 · 분야 · 정렬 · 줄 넘기기) · 오픈 예정 · BEST · 새로 열린 · 무료 특강 · 검색 · 공개 화면 | 미리보기 · 운영은 꺼짐 |
| `vod-teachers` | `/vod/teachers` · `/vod/teachers/<강사>` | 강사진(이름 · 분야 · 초성 검색 — 다른 화면에 다녀와도 남아요) · 강사 페이지 · 공개 화면 | 미리보기 · 운영은 꺼짐 |
| `vod-about` | `/vod/about` | DOOGO CLASS 소개 (숫자 · 흐르는 줄 멈춤 · 슬라이드 · 강사진) · 공개 화면 | 미리보기 · 운영은 꺼짐 |
| `vod-partners` | `/vod/partners` · `/vod/partners/apply` | 두고 파트너스 소개 · 지원서(섹션 5개 · 쓰던 내용 기억 · 확인 · 보내기는 예전 함수 `ptIssues` · `ptSubmit`) · 공개 화면 | 미리보기 · 운영은 꺼짐 |
| `vod-legal` | `/terms` · `/privacy` · `/refund` · `/vod/legal/<약관>` | 약관 및 정책 (목차 · 인쇄 · 사업자 정보) · 공개 화면 | 미리보기 · 운영은 꺼짐 |

| `dg-home` | `/home` | 두잉고 강의실 홈 — 기수(LIVE) 버전(인사 · 메인 강의 · 시작 가이드 · 오늘 LIVE · 응원 영상 · 성장 단계 · 이번 주 · 진행률 · 다가오는 일정 · 이어서 할 과제 · 공지 · 빠른 이동) · VOD 버전(이어서 학습 · 다른 강의 · 수강 기간 · 1:1 코칭 · TEA TIME) + 강의실 틀(머리띠 · 왼쪽 메뉴 · 막힐 땐 · 세계 시계 · AI 조교 · 아래 메뉴) · 5단계 | 미리보기 · 운영은 꺼짐 |
| `dg-learn` | `/curriculum` · `/curriculum/<강의>` · `/missions` · `/missions?kind=` · `/missions/<주차>` · `/missions/<주차>/<과제>` | 두잉고 강의(주차 카드 · 강의 한 편 — 시청 완료 · 메모) · 과제 목록(전체 · 종류별 · 주차 — 유형 · 진행 상태 탭 · 과제 양식) · 과제 하나(글 · 사진 · 링크 제출 · 자동검수 결과 · 제출 이력 · 다른 수강생 우수 과제) · 잠긴 주차 · 5단계 | 미리보기 · 운영은 꺼짐 |
| `dg-board` | `/schedule` · `/notices(/<공지>)` · `/qna` · `/qna/requests(/new · /<요청>)` | 일정(달력 — 앞뒤 달 · 날짜 고르기 · 오늘 · 이번 달 한눈에) · 공지(목록 · 본문 사진 · 영상 · 읽음 표시 · 모두 읽음) · Q&A(FAQ 분류 · 검색) · 1:1 요청 · VOD 1:1 코칭 질문(목록 · 쓰기 — 사진 첨부 · 등록 · 취소) · 5단계 | 미리보기 · 운영은 꺼짐 |
| `dg-lib` | `/docs` · `/library(/<분류>(/<자료>))` · `/library/file?tool=calculator` · `/bot` | 서류 준비(단계 체크) · 자료실(분류 · 전자책 · 자료 파일 · VOD · 시니어 가이드 · 수업 자료 모음 — 들어올 때 이용 안내 팝업 · 열람자 표시) · 마진 계산기(내 제품 마진표 — 저장 · 불러오기 · 지우기) · AI 조교 전체 화면 · 5단계 | 미리보기 · 운영은 꺼짐 |
| `dg-more` | `/motivation` · `/channels` · `/partners(?tab=)` · `/certificate` · `/replays(/<영상>)` · `/showcase` · `/notes` · `/glossary` · `/page/<메뉴>` | 동기부여(영상 고르면 그 자리 재생) · 1:1 소통채널 · 제휴채널(분류 탭) · 수료증(PDF · 강사 미리보기) · 라이브 다시보기(주차 칩 · 다 봤어요) · 모범 과제(사진 크게 보기) · 학습 노트(주차 회고 자동 저장 · 내려받기) · 용어 사전(분류 · 검색 · 초성 색인) · 추가 메뉴 · 5단계 | 미리보기 · 운영은 꺼짐 |
| `dg-vod` | `/vodclass` · `/vodclass/<강의>(/<회차>)(?t=초)` · `/vodclass/notes` | VOD 버전 강의 목록(진도 · 업데이트 · 기간 끝난 강의) · 극장형 강의실(영상은 한 번만 — 워터마크 · 전체 화면 / 목차 · 내 노트 · 자료 탭 · 노트 종류 · 영상 시간 · 거르기 · 고치기 · 할 일 · 지우기 · 코칭 질문 보내기 · 완료하고 다음 강의) · 내 노트 모음(검색 · 내려받기 · 복사 · PDF) · 5단계 | 미리보기 · 운영은 꺼짐 |
| `dg-login` | `/login(?tab=vod)` | 두잉고 강의실 로그인 — 강사 고르기(이름 · 분야 · 초성 검색) · 이름 + 전화번호 뒷자리 · 두고클래스 탭(VOD 회원 이메일 · 카카오 · 사람 확인) · 수강 신청 · 로그인 안내 · 약관 팝업 · 강사 바꾸기 · 5단계 | 미리보기 · 운영은 꺼짐 |
| `ct-login` | `/center/login` | 강사센터 로그인 — 탭(강사 · 코치 · 마스터 · 파트너) · 번호 보기 · 6단계 | 미리보기 · 운영은 꺼짐 |
| `ct-dash` | `/center` | 강사센터 틀(머리띠 · 왼쪽 메뉴 · 관리 영역 탭 · 휴대폰 아래 메뉴) + 대시보드(강사 · 코치 · VOD 두잉고) · 6단계 | 미리보기 · 운영은 꺼짐 |
| `ct-ops` | `/center/students` · `cohorts` · `reviews` · `questions` · `billing` · `contract` | 수강생 관리 · 기수 관리 · 과제 검수 · 1:1 요청 답변 · 다음 기수 신청 · 계약 · 서류 · 6단계 | 미리보기 · 운영은 꺼짐 |
| `ct-content` | `/center/brand` · `menus` · `pages` · `free` · `landing` · `curriculum` · `missions` · `schedule` · `notices` · `faq` · `guide` · `docs` · `channels` · `coaches` · `partners` · `library` · `motivation` · `replays` · `showcase` · `glossary` · `notes` | 기본 정보 · 메뉴 구성 · 추가 메뉴 · 수강생 화면 콘텐츠 편집 화면 · 코치 관리 · 무료강의 · 강사 소개 페이지 편집 · 6단계 | 미리보기 · 운영은 꺼짐 |
| `ct-vod` | `/center/vod-students` · `vodlink` · `vod` · `vod-live` · `vod-cal` · `vod-settle` · `coaching` · `teatime` · `ops-notices` · `vodlessons` | VOD 수강생 · VOD 강의 연결 · VOD 판매 내역 · 무료 LIVE · 온/오프라인 판매 · 정산 달력 · 판매 정산 · 1:1 코칭 답변 · TEA TIME · 운영팀 공지 · VOD 강의 · 수업 자료 · 6단계 | 미리보기 · 운영은 꺼짐 |
| `ct-master` | `/center/master` · `master/instructors` · `students` · `health` · `notices` · `site` · `data` · `calendar` · `sla` · `reports` · `plan` · `menus` · `billing` · `certs` · `contracts` · `staff` · `rs` · `partners` · DOOGO CLASS `dc` · `vod` · `vod-ship` · `vod-refund` · `vod-inquiries` · `vod-members` · `vod-sales` · `vod-rank` · `vod-ads` · `vod-settle` · `vod-rates` · `vod-crm` · `vod-crm/<회원>` · `vod-seg` · `vod-msg` · `vod-crm-rp` · `vod-classes` · `vod-classes/<클래스>` · `vod-home` · `vod-display` · `vod-media` · `vod-media-rs` · `vod-media-pay` · `vod-recruit` | 마스터 두잉고 · DOOGO CLASS 메뉴 · 회원 상세 · 클래스 세팅 · 운영자 계정(맡지 않은 버튼 · 링크는 숨김) · 6단계 | 미리보기 · 운영은 꺼짐 |
| `ct-partner` | `/center/partner` · `partner/inquiries` · `refer` · `kit` · `notices` · `guide` · `instructors` · `earnings` · `payouts` · `settings` | 파트너센터 (영업 파트너 RS) · 6단계 | 미리보기 · 운영은 꺼짐 |
| `ct-media` | `/center/media` · `media/links` · `calendar` · `orders` · `payouts` · `guide` · `settings` | 온드미디어 센터 (YouTube 채널 팀 RS) · 6단계 | 미리보기 · 운영은 꺼짐 |

- **두잉고 강의실(5단계):** 화면 코드 `ui/dg/` · 계산 · 처리는 예전 app.js 를 그대로 빌려 써요(`window.DGA` — 상태 · 메뉴 구성 · 진행률 · 가이드 · AI 조교 `sendChat` …). 그리기 전에 예전 `render()` 처음에 하던 로그인 확인 · 꺼진 메뉴 · VOD 강의실 고르기 · 테마를 `DGA.prep` 으로 해요(`ui/App.jsx`) — 로그인 전이면 로그인 화면으로. React 화면 틀에서는 app.js 의 클릭 처리가 돌지 않고, app.js 가 부르는 다시 그리기(`render` · 대화 새로 고침)는 React 로 넘어가요. 테스트 `reactdg` 가 기수 · VOD 수강생으로 예전 화면과 모양을 비교해요.
- **강사센터 · 마스터(6단계):** 화면 코드 `ui/center/` · 계산 · 저장 · 처리는 예전 admin.js 그대로(`window.ADM`). 그리기 전 세션 · 로그인 · 역할별 주소 확인은 `ADM.prep`(예전 `render()` 처음과 같은 함수) — 결과는 `ADM.last`. 강의실과 달리 **버튼(data-action) · 폼 · 팝업은 admin.js 의 document 이벤트가 React 화면에서도 그대로 받아요**(처리 끝의 `render()` 가 React 에 다시 그리라고 알려요 · 팝업은 예전처럼 `#modal-root`). 그래서 admin.js 처리 코드에서 React 가 그린 칸의 내용을 직접 바꾸면 안 돼요 — 바꾸려면 `render()` 를 부르세요(예외: 예전 HTML 그대로 넣은 칸 `Isl` 안쪽 · 빈 오류 문구 칸 · 페이지 편집기의 ‘저장하지 않은 변경’ 글자 칸). 칸을 많이 적는 편집 화면(무료강의 · 강사 소개 페이지 · 클래스 세팅)은 적는 동안 다시 그리지 않고, 버튼으로 다시 그릴 때마다 칸을 지금 편집 중인 값으로 새로 그려요(예전 화면이 본문을 통째로 다시 그리던 것과 같은 결과). 운영자(스태프) 계정은 `staffStrip` 이 React 화면에서는 칸을 빼지 않고 숨겨요(`data-staff-cut` · 보이기 전에) — 그래서 운영자 계정 화면은 다시 그릴 때마다 본문을 새로 그려요. 화면은 모두 React 로 옮겼어요 — 마스터가 다른 탭 메뉴 주소로 온 때만 React 틀 안에 예전 본문 HTML 그대로(`ADM.legacyPage`). 테스트 `reactct` 가 강사 · 코치 · VOD 탭 · 마스터 화면을, `reactpm` 이 파트너센터 · 온드미디어 센터(마스터가 화면에서 만든 계정으로 로그인)를 예전 화면과 모양 · 누르기로 비교해요. 왼쪽 메뉴 숫자를 지울 때도 React 화면이면 `navBadgeGone` · `refreshInqBadges` 가 React 에 다시 그리라고만 해요.
- **공개 화면(검색 · 공유):** 목록에 `pub` 표시가 있는 화면은 React 화면 틀이 원래 주소로 예전과 같은 미리보기 정보(제목 · 설명 · 대표 주소 · 공유 그림 · 구조화 데이터 · 검색용 안내 글 `seo-static`)를 서버에서 넣어요(`api/_lib/pagemeta.js` 그대로). 회원 화면은 검색 제외(`noindex`). 테스트가 예전 화면과 같은 값인지 봐요.
- **그리기 전에 (스토어):** 예전 `render()` 가 그릴 때마다 처음에 하던 무료 LIVE 일정 맞추기(`VOD.syncFreeLive`)를 React 화면도 그리기 전에 해요(`ui/App.jsx`) — 안 하면 무료 LIVE 썸네일 날짜가 예전 화면과 달라져요 (React 화면만 켠 시험에서 찾음).
- **움직임:** 제목 글자 새김 · 스크롤 등장 · 숫자 올라가기는 `ui/lib/motion.jsx`(`<Eg>` · `useMotion`) — 예전 `egSplit` 이 만든 모양을 처음부터 React 가 그리고, 숫자는 글자 칸 값만 바꿔요(React 가 그린 글자를 갈아 끼우지 않아요). 주소를 옮겨 처음 그릴 때만 움직이고, 다시 그릴 때는 바로 보여요(예전과 같음).
- **긴 글 화면(소개 · 파트너스 · 학습 시스템 그림):** 예전 화면이 그린 출력을 JSX 로 바꿔 옮겼어요(손으로 옮겨 적다 틀리지 않게) — 데이터로 바뀌는 곳(숫자 · 강사 · 분야 · 날짜 · 카카오 주소)만 React 계산으로 바꿨어요.

## 결제 시험 환경 (Next.js 전환 4단계 · 4-2 · 2026-11-04)

미리보기(시험용 DB)에만 포트원 **테스트 채널**을 연결해 진짜 결제창으로 결제 → 수강 → 취소 · 환불을 시험해요 (실제 돈은 나가지 않아요).

| 환경 변수 (Preview 에만) | 값 |
| --- | --- |
| `PORTONE_STORE_ID` | 포트원 › 결제연동 › 연동 정보 › 식별코드 · API Keys 의 상점 아이디 `store-…` (공개 값) |
| `PORTONE_API_SECRET` | 같은 화면 V2 API 탭에서 발급한 Secret (Sensitive · 발급 때 한 번만 보여요 · 한 달마다 만료) |
| `PORTONE_CHANNEL_CARD` | 채널 관리의 테스트 채널 키 (KG이니시스 `inicis_v2` · MID `INIpayTest`) |

- 배포할 때마다 빌드 기록에 `[pay] 포트원 연결 확인` 이 남아요 — 없는 결제를 한 번 조회해 Secret 이 맞는지만 봐요(`api/_lib/portone.js` check · 아무것도 바꾸지 않아요). 만료되면 ‘확인 실패’ 로 알려 줘요.
- 운영에서 카드 결제를 열 때는 PG 계약 뒤 **실제 채널 키 · 새 Secret 을 Production 에 따로** 넣어요 (미리보기 값을 옮기지 않아요).
- 가상계좌 입금 알림(웹훅)은 미리보기 보호(Vercel 로그인) 때문에 따로 우회 토큰이 있어야 해요 — 카드 · 간편결제 시험에는 필요 없어요.
- **결제 대조:** 포트원 연결이 확인되면 빌드가 최근 포트원 결제 30건을 주문과 하나씩 맞춰 봐요(`api/_lib/payaudit.js` · 읽기만) — 상태 · 금액 합계 · 환불 합계 · 상점 아이디. 빌드 기록에 `[pay] 결제 대조: … 맞음 · 결제 안 끝남 · 확인 필요` 와 주문 번호 · 상태 · 금액만 남아요. ‘확인 필요’ 가 나오면 마스터 › 주문 · 결제 › 주문의 ‘포트원 결제 조회’로 맞춰요.
- 카드 · 간편결제 창만 열고 끝내지 않은 주문(`ready`) · 결제가 안 된 주문(`failed`)은 회원 주문 내역 · 배송 조회에 보이지 않고, 마스터 주문 목록에는 ‘결제 안 끝남 · 결제 안 됨’ 으로 보여요 (예전에는 ‘결제 완료’ 로 보였어요 · 2026-11-04 시험 결제에서 찾음).
- **포트원 결제 주문의 환불은 늘 포트원 취소를 거쳐요:** 마스터 환불은 ‘포트원 결제인지’ 를 주문 기록(결제수단 · 포트원 결제 번호)으로 정해 `/api/vod-pay` 환불(포트원 취소 → 주문 환불)로 보내요. 강사센터 · 마스터 화면을 열 때 결제 설정(`/api/vod-config`)도 받아요. 서버도 막아요: 포트원으로 결제창을 연 주문(결제 안 끝남 · 결제 완료 · 가상계좌 · 환불)은 화면 저장(sync)으로 상태 · 금액 · 환불 금액 · 결제 정보가 바뀌지 않아요(`api/_lib/vodaccess.js` `PG_LOCK`) — 메모 · 배송 · 클레임 같은 다른 칸은 그대로 저장돼요. 시안 화면의 시험 결제(`pg.st` mock)는 예전처럼 화면에서 기록해요.
- 2026-11-04 시험: 미리보기에서 카드 5,000원 결제 → 결제 완료 확인. 이어서 마스터에서 4,290원 부분 환불을 눌렀는데, 그때 마스터 화면이 결제 설정을 아직 받지 않아 포트원 취소 없이 주문만 ‘환불’ 로 저장됐어요(결제 대조가 ‘취소 금액이 달라요’ 로 찾음 → 위처럼 화면 · 서버 두 곳을 고침). 시험 결제라 KG이니시스가 자정에 자동으로 취소해요.

## 화면 나눠 받기 (Next.js 전환 4단계 · 4-3 · 2026-11-04)

예전에는 어느 주소로 들어와도 모든 화면 파일(강사센터 `admin.js` 1.2MB 포함 · 압축 약 1MB)을 받았어요. 이제 영역마다 필요한 파일만 받아요. 화면 코드는 그대로예요.

| 영역 (주소) | 더 받는 파일 | 첫 방문 (압축) |
| --- | --- | --- |
| 스토어 `/` · `/vod/…` · 약관 / 두잉고 강의실 `/login` · `/home` · `/vodclass` … | `vod.js` · `app.js` | 약 542KB (47% ↓) |
| 강사센터 · 마스터 `/center/…` | `vod.js` · `admin.js` + `admin.css` | 약 848KB (18% ↓) |
| 강사 소개 · 무료강의 `/p/…` · `/free/…` | `landing.js` + `landing.css` · `doogo-free.css` | 약 320KB (69% ↓) |
| 두잉고 소개 `/doinggo` | `vod.js` · `guide-data.js` · `guide.js` · `home.js` + `guide.css` | 약 507KB (51% ↓) |

- 늘 받는 파일(index.html 에 그대로): 주소 · 데이터 · 공용 규칙 · 아이콘 · 약관 글 · `main.js` + `styles.css` · `home.css`(로고 · 로그인 화면도 씀) · `vod.css`.
- 규칙은 `areas.js` 한 곳 (영역 고르기도 여기 — `main.js` 가 같은 규칙을 써요). 스크립트는 예전 index.html 순서대로 실행하고, CSS 도 예전 자리에 끼워 넣어요.
- 처음 들어올 때: `<head>` 의 `areas.js` 가 그 영역 CSS 를 넣고 스크립트를 미리 받기 시작 → `main.js` 가 서버 연결과 함께 기다렸다가 그려요.
- 다른 영역으로 옮겨 가면 `main.js` 가 저장 중인 내용을 먼저 보내고 페이지를 새로 불러요 (오래 열어 둔 창에서도 화면 파일이 섞이지 않게). 스토어 ↔ 두잉고 강의실은 같은 파일이라 그대로 이어져요.
- 강사센터 · 수강생 강의실 둘 다 쓰던 ‘아래 탭 표시’는 `app.js` 맨 끝에서 `main.js` 로 옮겼어요 (강사센터에는 이제 `app.js` 가 없어서).
- 확인: 화면 테스트 `split`(주소마다 받는 파일 · 영역 옮기기 · 뒤로 가기 · 끄기) · 64개 화면(PC · 휴대폰)을 나눠 받기 전 · 후로 찍어 픽셀 비교 — 모두 같아요.
- **끄기:** Vercel 환경 변수 `DC_SPLIT_OFF=1` 로 다시 배포하면 `<html data-split="off">` → 예전처럼 모든 파일을 받아요. 이 브라우저만: `localStorage dc:split = off`.

## 로그인 보안 (Next.js 전환 4단계 · 4-1 · 2026-11-04)

강사센터 로그인은 이름 + 숫자 4자리라서, 이름이 공개되면 남는 비밀은 숫자 4자리뿐이에요.

| 바뀐 것 | 내용 |
| --- | --- |
| 공개 문서에서 로그인 이름 빼기 | 방문자 · 수강생이 받는 강사 문서(`api/_lib/access.js` publicIns)의 `name`(강사센터 로그인 이름) 자리에 수강생에게 보이는 이름(`displayName`)을 넣어요. 뒷자리 · 코치 목록 · 연락처 · 정산 정보는 예전부터 빠져 있어요. 그 강사 본인 · 마스터 · 그 강사의 코치는 예전처럼 다 봐요 |
| 하루 기준 잠금 | 15분에 8번 잠금은 그대로 두고, 같은 이름(아이디)으로 24시간 안에 30번 틀리면 그 24시간이 끝날 때까지 막아요(`locked-day` · 숫자 4자리를 하루 30번까지만). 성공하면 바로 풀려요. 강사센터 · 코치 · 두잉고 수강생 · 파트너 · 온드미디어 · 운영자 계정에 적용 — 마스터는 빼요(누가 일부러 틀려 주인이 하루 내내 못 들어오는 일을 막으려고) |
| 처음 데이터 숫자 표시 | (2026-11-06 운영자 요청으로 뺐어요) 예전에는 마스터 › 강사 플랫폼 관리에서 `data.js`(누구나 받을 수 있는 공개 파일 · 공개 저장소)의 이름 · 숫자를 그대로 쓰는 강사 · 코치에 빨간 표시가 붙었어요. 표시는 없어졌지만 그 숫자 그대로면 누구나 들어올 수 있는 건 같아요 — 수정(강사) · 강사센터 › 코치 관리(코치)에서 뒷자리를 바꿔 주세요 |

- 화면 안내: 수강생 로그인(app.js) · 강사센터 로그인(admin.js)에 하루 잠금 문구.
- 시험: 서버 시험 30) · 화면 테스트 routes(공개 문서에 로그인 이름 없음).

## 공유 · 검색 미리보기: 클래스 상세 · 강사 소개 · 무료강의 · 스토어 홈 · 두잉고 소개 · 약관 (Next.js 전환 3단계 · 2026-11-04)

카카오톡 · 검색 로봇은 자바스크립트를 돌리지 않아서, 예전에는 어느 클래스 주소를 보내도 같은 제목 · 설명 · 사진(index.html)만 보였어요.
이제 서버가 아래 주소에 그 페이지의 정보를 넣어 보내요. 들어온 뒤 화면은 예전 그대로(vod.js · landing.js)예요.

| 주소 | 제목 (화면이 그리는 제목과 같게) | 설명 · 사진 | 보이는 조건 |
| --- | --- | --- | --- |
| `/vod/p/<클래스>` | `클래스 제목 \| DOOGO CLASS — 돈 되는 클래스` | 한 줄 소개 · 훅 — 강사 / 클래스 사진 · 책 표지 / 가격 | 판매 중 · 오픈 예정 · 숨긴 강사면 따로 보이게 한 상품만 |
| `/p/<강사>` | `강의 이름 · 브랜드` | 헤드라인 · 소개 — 강사 / 첫 화면 사진 · 강사 소개 사진 · 프로필 | 이용 중 강사 · 공개한 강사 소개 페이지 |
| `/free/<강사>` | `강의 제목 · 강사 무료강의` | 일시(11월 17일 (화) 19:30) 무료 LIVE · 소개 / 진행 예정 강의 포스터 · 프로필 | 이용 중 강사 · 공개한 무료강의 페이지 |

클래스 상세는 아래처럼 넣어요 (강사 소개 · 무료강의도 같은 방식 · 무료강의는 일정 구조화 데이터(Event · 한국 시간)).

| 넣는 것 | 내용 |
| --- | --- |
| 제목 · `og:title` · 트위터 | 클래스 제목 (`… | DOOGO CLASS — 돈 되는 클래스`, 화면 제목과 같게) |
| 설명 · `og:description` | 한 줄 소개(sub) · 훅 — 강사 이름 (150자 · 같은 말은 한 번만) |
| 사진 · `og:image` | 클래스 사진(thumb) · 책 표지(cover) — **JPG · PNG · GIF 만** (카카오톡이 webp 를 못 읽어요). webp 는 빌드 때 만든 JPG(`<이름>.og.jpg`, `public/og-images.json` — 강사 사진 · 클래스 사진 · 책 표지 폴더 `assets/home` · `assets/vod` · `assets/landing`), 없거나 브라우저에만 있는 사진이면 기본 공유 사진 |
| 주소 · `canonical` · `og:url` | `https://www.doogoclass.com/vod/p/<클래스>` (`?rs=` · `utm_*` 는 빼고) |
| 구조화 데이터(JSON-LD) | 상품 · 강사 · 가격(결제와 같은 규칙 `shared/price.js` · 한국 시간, 수강권 6 · 12개월이면 최저 ~ 최고) |
| 로봇용 안내 글(`.seo-static`) | 제목 · 종류 · 강사 · 가격 · 소개 · 배우는 것 · 추천 대상 (화면이 뜨면 앱이 바로 바꿔요) |

- 규칙: `api/_lib/pagemeta.js` — 배포는 Next.js `app/vod/p/[id]` · `app/p/[id]` · `app/free/[id]` (`nextlib/page-route.js`), 로컬은 `scripts/dev-server.js` 가 같은 규칙을 써요. 강사 소개 · 무료강의 기본값은 화면과 같은 `shared/data-rules.js` landingOf · freeOf.
- 스토어에 보이지 않는 클래스(판매 중 · 오픈 예정이 아님, 강사 노출을 끈 강사의 상품 — 따로 보이게 한 상품(showOff)은 보여요), 없는 주소, 오류 → 예전 index.html 그대로.
- 캐시: 1분(`s-maxage=60`) — 클래스 정보를 바꾸면 1분 안에 공유 미리보기에 반영돼요 (카카오톡은 자기 캐시가 있어서 카카오 개발자 도구 › 공유 디버거에서 초기화하면 바로 바뀌어요).
- **끄기(스위치):** Vercel 환경 변수 `DC_SSR_OFF` 에 `vod-detail` · `landing` · `free` (여러 개는 쉼표)를 넣고 다시 배포하면 그 주소는 예전 index.html 그대로 나가요.

### 스토어 홈 · 두잉고 소개 · 약관 · 사이트맵 (3단계 · 2026-11-04)

예전에는 `/doinggo` · `/terms` · `/privacy` · `/refund` 도 검색 로봇에게 스토어 홈과 같은 제목 · 대표 주소(`/`)로 보여서, 검색에서 따로 잡히지 않았어요.

| 주소 | 제목 (화면이 그리는 제목과 같게) | 넣는 것 |
| --- | --- | --- |
| `/` 스토어 홈 | index.html 그대로 (`배움이 기회가 되는 곳, 두고클래스 \| 온라인 클래스`) | 로봇용 안내 글 끝에 **지금 보이는 클래스 목록** (상세 주소 링크 · 종류 · 강사 · 오픈 예정) |
| `/doinggo` | `두잉고 \| 강의는 강사님이, 운영은 두잉고가` (home.js) | 설명 · 두잉고 소개 배너(`assets/home/og-doinggo.jpg`, 1200×630) · 대표 주소 `/doinggo` · 소개 글 |
| `/terms` · `/privacy` · `/refund` | `이용약관 · 개인정보처리방침 · 환불정책 \| 두고클래스 DOOGO CLASS` (vod.js) | 설명 · 탭마다 대표 주소 · 시행일(개정 안내 기간에는 공지일 · 새 시행일) · 목차(글의 소제목 전부) |
| `/sitemap.xml` | — | 고정 주소(`sitemap.xml`) + 보이는 클래스 `/vod/p/…` · 공개한 강사 소개 `/p/…` · 무료강의 `/free/…` (화면에 보이는 것과 같은 기준) |

- 약관 글은 화면과 같은 `legal.js` 를 서버가 읽어요(글만 담은 파일이라 data.js 처럼 빈 window 에서). 마스터 설정으로 바뀌는 환불 표 · 분석 도구 목록은 서버가 넣지 않아요(화면에서만 보여요).
- `/doinggo` 소개 글은 두잉고 첫 화면(home.js hero) 문구에서 가져왔어요 — 첫 화면 문구를 크게 바꾸면 `api/_lib/pagemeta.js` DG 도 같이.
- 배포는 Next.js `app/route.js` · `app/doinggo` · `app/terms` · `app/privacy` · `app/refund` · `app/sitemap.xml` (`nextlib/page-route.js`). 빌드 때 `sitemap.xml` 은 public/ 으로 복사하지 않아요(`scripts/site.js` — 같은 주소의 파일이 둘이면 Next.js 가 막아요). 로컬은 `scripts/dev-server.js` 가 같은 규칙.
- `/doinggo/…`(사용법 영상) · `/vod` · `/vod/c/…` 같은 다른 주소는 예전 index.html 그대로예요.
- 캐시: 페이지 1분 · 사이트맵 1시간. 오류 → 예전 index.html(사이트맵은 고정 주소 목록) 그대로.
- **끄기:** `DC_SSR_OFF` 에 `store-home` · `doinggo` · `legal` · `sitemap`.

## 화면 · 서버 공용 규칙 (Next.js 전환 2단계 · 2026-11-03)

같은 규칙이 화면과 서버에 따로 있으면 한쪽만 고쳐 금액 · 날짜가 어긋나요. 규칙은 `shared/` 한 곳에 두고, 화면(`<script>` → `window.DCS`)과 서버(`require`)가 같은 파일을 써요. 다음 단계의 Next.js 화면도 이 모듈을 그대로 불러요.

| 파일 | 규칙 | 쓰는 곳 |
| --- | --- | --- |
| `shared/dates.js` | 날짜 글자("YYYY-MM-DD") 더하기 · 빼기 | db.js · schedule.js |
| `shared/data-rules.js` | 강사별 화면 색 · 수강생 메뉴(LIVE · VOD) · 새 강사 기본 콘텐츠 · 자주 찾는 페이지 기본 목록 · 과제 종류 · **처음 데이터 · 빠진 기본값 채우기(한 번만 하는 정리 포함) · 불러오기 순서** | db.js (`DB.THEMES` · `DB.template` · `DB.menuConfig` · `DB.load` …) · 서버 `api/_lib/seed.js` (처음 데이터 · 배포 때 기본값 채우기) |
| `shared/schedule.js` | 주차 강의일 · 주차 열림 · 과제 마감 · 기수 끝 · 상태 · 이번 주차 · ‘N주차 무슨 요일’ 일정 | db.js (`DB.classDate` · `DB.weekOpen` · `DB.currentWeek` …) |
| `shared/price.js` | 판매가 · 할인 마감 · 무료 LIVE 뒤 얼리버드 (날짜 · 시각은 화면 · 서버 모두 한국 시간 — `KST` 도우미, 2026-11-05: 뉴질랜드 등 다른 시간대 브라우저에서도 할인 마감일 · 얼리버드 마지막 날 결제 금액이 서버와 같아요) · 수강권(6 · 12개월) · 코칭권 · TEA TIME · 재수강 할인 · 쿠폰 · 종이책 배송비 | vod.js (화면 가격) · `api/_lib/vodprice.js` (결제 금액) |
| `shared/settle.js` | PG 수수료 · 온드미디어 RS(규칙 · 비율 · 코드) · 강사 정산액 · 환불 비율 · 명세서 지급액(사업자 · 개인 3.3%) | vod.js · admin.js (강사 정산 명세서) · `api/_lib/media.js` |

- 시간대는 쓰는 쪽이 넘겨요: 화면은 이 기기 시간대(예전 그대로), 서버(결제 금액)는 한국 시간 — `price.make(ctx)`.
- 옮길 때 예전 코드와 결과를 비교했어요: 일정 362,880건 · 가격 서버 20,602건 · 화면 22,543건 · 정산 120,000건 모두 같음 (한국 · 뉴질랜드 시간대) · 처음 데이터 · 정리는 서버 29가지 데이터 상태(시험용 DB 실제 문서 포함) · 화면 저장소 29가지 × 브라우저/서버 모두 같음. 화면 변화 없음.
- **서버는 화면 파일 db.js 를 더 이상 돌리지 않아요.** 처음 데이터 파일(data.js)만 읽고 규칙은 `shared/data-rules.js` 를 `require` 해요 (배포 함수에도 db.js 를 싣지 않아요). 규칙 코드는 db.js 에 있던 그대로 옮겼어요 — 지금 데이터 · 저장 · 저장소는 쓰는 쪽이 `make(ctx)` 로 넘겨요.
- 순서: `index.html` 에서 `shared/*.js` 를 `db.js` · `vod.js` 보다 먼저 읽어요 (`data-rules.js` 는 `dates.js` 다음). 서버가 읽는 화면 쪽 파일은 `api/_lib/seed.js` `CLIENT_FILES`(data.js 하나), 배포 함수에 싣는 목록은 `next.config.js` `INCLUDE`(`class/shared/*.js`).
- 데이터 정리를 고칠 때: 새 기본값 · 한 번만 하는 정리는 `shared/data-rules.js` loadFixups 에 (브라우저 · 서버 모두 적용), 운영 데이터를 바꾸는 요청은 지금처럼 `api/_lib/oneoff.js` 일회성 작업으로.

## Next.js 틀 (Next.js 전환 1단계 · 2026-11-03)

화면 · API · 데이터는 **그대로**이고, 내보내는 틀만 Next.js(16.4.3 · pages 라우터)로 바꿔요. 다음 단계에서 화면을 하나씩 Next.js 로 옮길 바탕이에요.

| 파일 | 하는 일 |
| --- | --- |
| `next.config.js` (저장소 맨 위) | 예전 `vercel.json` 과 같은 주소 규칙(점 없는 주소 → `index.html`, `/api/…` 는 그대로) · 보안 헤더 · `/api` no-store · `doinggo.doogoclass.com` → `/doinggo` · 서버 함수에 함께 실을 파일 |
| `pages/api/<이름>.js` | `/api/<이름>` → `class/api/<이름>.js` 그대로 (예전 `api/*.js` 자리) |
| `nextlib/legacy-api.js` | 서버 코드를 묶지(bundle) 않고 Node 가 바로 불러요 — `__dirname` 으로 읽는 처음 데이터 · AI 조교 자료 · `node:sqlite` · 모듈 상태가 예전 서버 함수와 같아요. 요청 본문도 Next.js 가 읽지 않아요(`bodyParser: false`) — 결제 웹훅 서명이 원래 본문 그대로 맞아요 |
| `class/scripts/site.js public` | 빌드 때 `class/` 의 화면 파일을 `public/` 으로 복사 (예전 `class/.site` 와 같은 내용 · `?v=<커밋>`) |
| `vercel.json` | `framework: nextjs` · 빌드 `db-build.js → site.js public → next build` |

- 서버 함수에 실을 파일은 예전 Vercel 과 같은 방법(nft)으로 `class/api/*.js` 를 따라가 찾고, 이름을 만들어서 읽는 파일(`data.js` · `db.js` · `coach-perms.js` · AI 조교 자료)은 `INCLUDE` 에 적어요 (`vod-test.js` 가 확인).
- 로컬: `node scripts/dev-server.js` 는 그대로 써요. Next.js 로 보려면 저장소 맨 위에서 `node class/scripts/site.js public && npx next build && CLASS_SQLITE=/tmp/x.db MASTER_PASSWORD=… npx next start`.
- 화면 테스트를 Next.js 서버로: `E2E_SERVER=next node scripts/e2e/run.js` (먼저 위처럼 빌드).
- 되돌리기: 운영 전환 뒤 문제가 생기면 Vercel › Deployments 에서 전환 직전 배포로 **Instant Rollback** (데이터 모양이 그대로라 DB는 손대지 않아요).

## 상시 화면 테스트 (Next.js 전환 0단계 · 2026-11-03)

- `node scripts/e2e/run.js` — 시험 DB(운영과 같은 순서로 만든 SQLite)로 테스트 서버를 띄워 브라우저로 주소 목록 · 역할별 로그인 · 구매(무통장 → 입금 확인 → 수강) · 과제 제출 → 검수 · 강사센터 저장 · 정산 · 자동 로그아웃을 확인해요. 운영 DB · 비밀 값은 넘기지 않아요. 자세한 것 · 주소 목록은 `scripts/e2e/README.md`.
- 전환 단계마다 이 테스트가 모두 통과해야 다음 단계로 넘어가요. 기준선(0단계)에서 운영 버그 2개를 찾아 고쳤어요 (켜 둔 강사센터 화면의 30분 자동 로그아웃 · 회원 로그아웃 때 진도 기록).
- 시험용 미리보기: 미리보기 환경에 시험용 DB를 따로 연결하고 `DB_ROLE=staging` 을 두면, 빌드가 시험용 표시가 있는 DB에만 처음 데이터 · 일회성 작업을 돌려요 (표시 없는 DB면 멈춰요).

## 자동 로그아웃 (2026-11-03)

- 로그인한 채로 창을 닫거나 내려 두면 다음에 열 때도 로그인이 남아 있던 문제를 막아요 (`main.js`).
- **강사센터 · 코치 · 마스터 · 파트너 · 온드미디어**: **60분**(2026-11-09: 30분 → 60분) 동안 아무 동작(누르기 · 키보드 · 휠 · 스크롤)이 없으면 로그아웃. 창을 켜 둔 채여도 1분마다 확인해요. 단, 강사센터 밖(수강생 화면 · VOD 영상)을 보고 있는 탭은 새로 고치지 않고, 강사센터 탭을 다시 보거나 다음에 열 때 로그아웃해요.
- **수강생(두잉고 강의실) · DOOGO CLASS 회원**: 화면을 보고 있는 동안은 그대로(영상 시청 중 끊지 않아요). 창을 닫거나 내리고 **60분**이 지나면 다음에 열 때 로그아웃.
- **저장하지 않은 작업은 지켜요 (2026-11-09)**: 강사센터에서 편집 창(강의 수정 등)에 적던 내용이 30분 뒤 로그아웃으로 날아갔어요 → 편집 창이 열려 있거나, 칸에 적고 아직 저장(제출)하지 않았거나, 무료강의 페이지 편집에 저장하지 않은 변경이 있으면 자동 로그아웃을 미뤄요. 저장하거나 창을 닫으면 그때부터 다시 60분을 세요(`main.js unsaved` — 검색 칸은 빼요).
- **강의 듣는 동안은 그대로 (2026-11-09)**: 수강생 · 회원이 강의 영상을 틀어 둔 동안(두잉고 강의 · 다시보기 · 응원 영상의 재생기, VOD 극장 · DOOGO CLASS 강의 · 미리보기 영상 — 영상 파일은 재생 중일 때만)은 창을 내려 두고 소리로 들어도, 휴대폰 화면이 꺼졌다 돌아와도 로그아웃하지 않아요(`main.js watching`). 상시 e2e `idle` 16개(편집 창 2시간 그대로 → 닫고 61분 뒤 로그아웃 · 영상 틀어 둔 채 2시간 그대로 · 영상 없이 61분 뒤 로그아웃).
- 서버 쿠키까지 지워요(`api/auth` logout · `api/vod-auth` logout). 로그아웃되면 “오래 사용하지 않아 안전을 위해 로그아웃했어요” 안내가 한 번 떠요. 마지막 동작 시각은 이 브라우저에 남겨 탭끼리 같이 써요(`doinggo:last-input` · `doinggo:last-seen` · 서버 로그인 표시 `doinggo:signed`). 저장하지 않은 편집이 있으면 기다려요.

## 정식 운영: 테스트 데이터 정리 (2026-11-03 · 일회성 작업)

- `oneoff.js` `launchTestClean` (작업 id `2026-11-03-launch-test-clean`, 배포 때 한 번): 정식 오픈 전에 만든 테스트 계정 · 기록을 지우고 **체험 계정은 하나씩만** 남겨요.
- 남겨요: 실제 강사 · 수강생 체험 계정 이수진(s1 · 2186) · 코치 체험 계정(문대표 강의 coach1) · DOOGO CLASS 체험 계정(vod@gmail.com / vod · demo) · 마스터.
- 지워요: 두잉고 수강생 중 비밀번호(전화 뒷자리) 0000 · 처음 예시 VOD 회원(vm-demo · vm-2 · vm-3)에 딸린 두잉고 기록(예시 코칭 질문 포함) · 중복 체험 계정 1기 · 2기 체험단 · 전화번호 010-0000-0000 테스트 회원(체험 계정 빼고, 실제 결제가 있으면 남김 — 이메일 · 카카오 연결 · 진도 · 주문 · 후기 · 문의 · 다짐까지) · 테스트 코치(초이 강의 coach-hana) · 예시 운영자 계정(manager · finance, 비밀번호가 예시 그대로일 때만). 진도 기록도 같이 지워요.
- 결과는 이름을 가려(김OO) 빌드 기록에 남아요. 배포 직전 자동 백업이 있어 마스터 › 데이터 백업에서 되돌릴 수 있어요.

## 팝업은 X 버튼으로만 닫혀요 (2026-11)

- 강사센터 · 코치센터 · 마스터 · 파트너센터(`admin.js` openModal), 수강생 화면(`app.js` openModal · AI 조교 떠 있는 창), DOOGO CLASS(`vod.js` modal), 두잉고 첫 화면 입점 문의 · 약관(`home.js`), 무료강의 질문(`landing.js`) 팝업은 **바깥 어두운 곳을 눌러도 · ESC 를 눌러도 닫히지 않아요**. 쓰던 내용이 실수로 날아가지 않게, 위 X 버튼(또는 팝업 안의 취소 · 닫기 · 확인 버튼)으로만 닫혀요.
- 예외: DOOGO CLASS 위쪽 **전체 메뉴 · 내 계정 메뉴**는 펼침 메뉴라 예전처럼 바깥을 누르거나 ESC 로 닫혀요(`vod.js` MENU_MODAL).

## 강사 전용 색 (강사센터 · 코치센터)

- 강의실 색이 그 강사 전용 색(`db.js` THEMES 의 `only` — 지금은 문대표 ‘뉴질랜드’)이면 강사센터 · 코치센터도 빨강 대신 그 색이에요(`body[data-ath="nz"]` · `admin.css` 맨 아래). 국기 네이비 #0B2A5B 포인트 · 맨 위 국기 띠(네이비 · 흰색 · 실버 펀 · 남십자성 레드) · 코치 화면의 초록 포인트도 네이비. 오류 · 경고 · 일요일 빨강은 그대로. 마스터 · 파트너 · 로그인 화면은 예전 레드.

## 여러 강의를 맡은 코치

- 같은 사람이 여러 강사님 강의의 코치일 수 있어요. 각 강사님이 ‘코치 관리’에서 **같은 이름 + 같은 전화번호 뒷자리**로 코치를 등록하면 같은 사람으로 봐요.
- 로그인: 맡은 강의가 하나면 바로 들어가고, 둘 이상이면 서버가 쿠키를 주지 않고 **강의 목록**만 돌려줘서 팝업에서 고르게 해요(강사 이름 · 강의 이름 · 맡은 메뉴 수). 고른 강의로 다시 확인한 뒤 들어가요. 멈춘 코치 자리는 목록에서 빠지고, 모두 멈추면 ‘사용 중지’ 안내. 서버 `api/auth` 의 `admin`(+ `iid`) · `coachSwitch`.
- 코치센터 위쪽 강사님 이름(⇄ 초이 ▾)이나 대시보드의 ‘다른 강의 코치센터’를 누르면 맡은 다른 강의로 옮겨요. 서버가 지금 코치 자리와 같은 이름 + 뒷자리인 자리로만 옮겨 주고, 새 강의 자료를 받도록 새로고침해요.
- 테스트: 김하나 / 1004 는 문대표 · 초이 두 강의의 코치예요(초이 쪽은 ‘테스트 코치’ 메모 · 초이 강사센터 › 코치 관리에서 지우면 끝).

## 로그인 카드 탭 (두잉고 ↔ 두고클래스)

- 두고클래스 로그인(`/vod/login` · `/vod/signup`)과 두잉고 수강생 로그인(`/login`) 카드 위 **[두잉고 | 두고클래스]** 탭은 페이지를 옮기지 않고 **그 자리에서 카드 내용만** 바꿔요. 왼쪽 · 오른쪽을 몇 번 눌러도 같은 화면이에요. 고른 탭은 주소(`?tab=dg` · `?tab=vod`)에 남아서 새로고침해도 그대로예요.
- 두고클래스 화면의 ‘두잉고’ 탭: 강사 고르기 → 이름 · 전화번호 뒷자리 → 두잉고 수강생 홈. 로그인은 두잉고 화면과 같은 코드(`app.js` 의 `DG_LOGIN`)라 결과가 똑같아요.
- 두잉고 화면의 ‘두고클래스’ 탭: 카카오 · 이메일로 DOOGO CLASS 회원 로그인 → 두잉고 VOD 강의실 안내(`/vod/dg`). 로그인은 `vod.js` 의 `VOD.authLogin`. 회원가입 · 비밀번호 찾기는 두고클래스 화면으로 가요.

## 매출 · 정산 (마스터 › 매출 · 정산)

DOOGO CLASS 관리 메뉴는 **주문 · 결제** · **환불 · 취소 관리**와, 따로 묶은 **매출 · 정산**(매출 리포트 · 판매 순위 · 광고비 · ROAS · 강사 정산 · 정산 비율 · 가격)으로 나눠요. 금액은 모두 부가세 포함이에요.

- **매출 리포트**: 달마다 결제 금액(그 달 결제, 나중에 환불된 주문 포함) − 환불(그 달 처리한 환불) = **순매출**, 여기서 강사 정산(명세서 정산액 합계 · 광고비 강사 분담 차감 뒤) · 광고비 집행 · PG 수수료(추정)를 빼서 **플랫폼 이익(추정)**. 진행 중인 달은 지난달 · 작년 같은 기간(1일 ~ 오늘)과 비교하고, 일별 순매출 · 연간 12달 표 · 결제수단별 · 상품 종류별 비중을 봐요. ‘월별 손익 CSV’로 한 해 표를 내려받아 세무사에게 넘겨요. PG 수수료율은 결제수단별 카드의 ‘수수료율’에서 계약서대로 고쳐요(`settings.pgFee`, 기본 카드 · 간편결제 3.3% · 계좌이체 2% · 가상계좌 건당 300원 · 무통장 0, 전액 환불한 주문은 0).
- **판매 순위**: 이번 달 · 지난달 · 최근 3개월 · 올해 · 전체 중 고르고 종류(VOD · 전자책 · LIVE · 오프라인) · 정렬(매출 · 판매 수)을 바꿔요. 1~3위는 시상대, 표에는 바로 앞 같은 길이 기간보다 순위가 오르고 내린 걸(▲ · ▼ · NEW) 보여 주고, 강사별 순위도 같이 나와요. 금액은 환불을 뺀 순매출.
- **광고비 · ROAS**: 집행일 · 강사 · 광고한 강의(선택) · 채널(메타 · 유튜브 · 네이버 · 구글 · 카카오 · 틱톡 · 기타) · 금액 · 메모를 적어요. 강사 분담(기본 50%, 강사별 비율의 ‘광고비 분담’)은 그 달 강사 정산에서 자동으로 빠지고 강사센터 › 판매 정산 · 정산 달력에 그대로 보여요. ROAS = 그 달 매출 ÷ 광고비(강사별 · 강의별 · 채널별 · 연간). **정산을 확정한 달**의 그 강사 광고비는 적거나 지울 수 없어요 — 강사 정산에서 확정을 취소한 뒤 고쳐요.
- **강사 정산**: 예전 ‘월별 정산’ 탭이에요. 매달 1일 ~ 말일 판매분을 다음 달 10일(주말 · 공휴일이면 다음 영업일)에 지급, 확정하면 명세서가 고정돼요. 확정 뒤 환불은 다음 달 정산에서 차감.

## 결제 수단 · 결제 상세 · 환불 (마스터 › 주문 · 결제 / 환불 · 취소 관리)

- 결제 수단: 카드 · 카카오페이 · 토스페이 · 네이버페이(포트원) · **실시간 계좌이체** · **가상계좌**(포트원, 서버 환경 변수로 켤 때만) · 무통장 입금(우리 계좌). 켜는 법은 `scripts/VOD-LAUNCH.md` 3번.
- 가상계좌: 결제창에서 은행을 고르면 포트원이 계좌를 발급(기본 72시간, `PORTONE_VBANK_HOURS`)하고, 주문 완료 화면 · 마이페이지 주문 내역에 은행 · 계좌번호 · 입금 기한이 보여요. 회원이 입금하면 포트원 웹훅으로 자동 결제 완료(마스터 ‘입금 확인’ 버튼 없음). 입금 전 취소하면 발급 계좌도 닫고 쿠폰 · 포인트를 돌려줘요.
- 주문 목록은 결제수단으로 거를 수 있고, **주문번호를 누르면 결제 상세**(금액 · 쿠폰 · 포인트 · 결제 · 정산 · 환불 기록)가 열려요. ‘포트원에서 조회’는 포트원 사이트에 들어가지 않고 결제 상태 · 카드사 · 할부 · 승인 번호 · 영수증 · 가상계좌를 가져오고, 화면과 다르면(웹훅을 놓친 결제 완료 · 포트원에서 직접 취소한 결제) 주문을 맞춰 줘요.
- **회원 바로 취소 = 결제 후 7일 이내 · 한 번도 재생하지 않았으면 100% 환불 (2026-11-05)**: 규칙은 화면 · 서버가 같은 공용 모듈 `shared/refund.js` 하나(숫자는 환불 · 취소 관리의 규정). ‘재생’은 강의를 연 기록(seen) · 완료(done) · 수업 자료 내려받기(mat)이고, 서버 기록(`vp:`)으로 다시 확인해요.
  - **내 강의실** 카드에 ‘아직 재생 전이라 100% 환불할 수 있어요 · N일 남음’ + **‘환불하기’** — 7일이 지나거나 강의를 재생하면 버튼 · 안내가 없어져요(주문 · 결제 내역의 ‘결제 취소 · 100% 환불’도 같은 규칙). 그 뒤 환불은 ‘환불 요청’ → 마스터가 규정대로 처리.
  - 결제 방법별: 카드 · 간편결제 · 계좌이체 → 포트원 결제 바로 취소 / **가상계좌** → 팝업에 적은 환불 계좌로 포트원이 돌려줌 / **무통장 입금** → 팝업에 환불 계좌를 적으면 주문은 바로 취소(수강 권한이 바로 사라짐)되고 환불 · 취소 관리 ‘계좌 송금 대기’(마스터 대시보드 ‘오늘 할 일 · 환불 계좌 송금’)에서 마스터가 송금 → ‘송금 완료’.
  - 같은 주문을 두 번 누르면 서버가 잠가서(`rfLock`, 2분) 포트원 취소는 한 번만 · 포트원 취소가 실패하면 주문은 결제 완료 그대로이고 잠금도 풀려 다시 시도할 수 있어요.
  - **강의 시작 안내**: 아직 환불할 수 있는 동안 강의를 처음 열면 영상 대신 ‘아직 강의를 재생하지 않았어요 — 시작하면 100% 환불 대상에서 빠져요(○월 ○일까지 · N일 남음)’ + 강의 시작하기 · 환불하기 (DOOGO CLASS 강의실 · 두잉고 강의실 VOD 버전 같이). 시작하면 그때 연 기록이 서버에도 남아요.
  - 재생 기록이 빠지지 않게: 두잉고 강의실로 바로 들어오면 서버 설정(vod-config)을 아직 안 받아 연 기록이 서버에 안 가던 것을 고쳤고(먼저 받고 보내요), 서버는 회원 화면이 저장한 기록(`vm:` 의 prog)도 함께 세요 — 어느 쪽에든 있으면 들은 강의(서버 기록은 회원이 지울 수 없어 수가 줄지 않아요).
- **강사센터 › 환불 · 취소 내역 (`#/center/vod-refunds`, 2026-11-05)**: 내 클래스의 환불된 주문(환불일 · 구매자 가림 · 결제 · 환불 금액 · 구분 · **정산 반영**) + 이번 달 환불 · 순매출(결제 − 환불) · 정산에서 빠진 내 몫 · 회원 바로 취소 수. 정산 반영: 그 달 정산 확정 전 환불은 그 달 정산에서 빠지고(부분 환불은 남은 금액만), 확정 뒤 환불은 환불한 달 정산에서 차감 — 판매 정산 계산(`vdStmt`)과 같은 규칙. ‘VOD 판매 내역’ · 마스터 ‘DOOGO CLASS 대시보드’에도 **이번 달 환불** 칸, 강사 VOD 대시보드 ‘내 수익 쉐어 › 이번 달 정산 예정’에 ‘환불 N건 (정산 - 금액)’. 마스터 ‘환불 · 취소 관리’ 환불 내역에는 **강사 정산 반영**(어느 강사 정산에서 얼마가 빠지는지) 칸. 코치는 ‘매출 (보기만)’ 권한에 같이 있어요.
- **배포 뒤 점검으로 고친 것 (2026-11-05)**:
  - 정산: 지난달 주문을 그 달 정산 **확정 전에 부분 환불**하면 확정 명세서에 이미 남은 금액만 들어가는데, 다음 달 정산에서 환불분을 한 번 더 빼던 것(오래된 문제) — 확정 명세서에 들어간 주문은 **확정한 뒤 환불된 것만** 환불한 달에서 차감(`vdRfLate`, 강사 정산 `vdStmt` · 온드미디어 RS 정산 `mdStmt` · 환불 내역 ‘정산 반영’ 같은 규칙).
  - 환불 숫자: 강사 VOD 대시보드 ‘이번 달 정산 예정’의 환불은 이번 달 정산에 실제로 반영되는 것만(지난달 결제분을 이번 달에 환불하면 지난달 정산에서 빠져요) · 환불 · 취소 내역 ‘이번 달 순매출’ = 이번 달 결제 − 이번 달 결제분 환불 · 같이 결제해 같이 환불된 부가 상품(코칭권)은 건수 1건으로.
  - 서버: 환불 뒤처리(판매 수 · 쿠폰 · 포인트 돌려주기)는 그 호출이 실제로 ‘결제 완료 → 환불’로 바꿨을 때만 — 포트원 웹훅이 회원 취소보다 먼저 와도 한 번만, 회원 취소가 진행 중이면 웹훅 · ‘포트원에서 조회’도 ‘회원 바로 취소’로 기록하고 쿠폰 · 포인트를 돌려줘요(`syncCancelled`). 포트원 취소 결과가 FAILED 면 환불로 바꾸지 않고(회원 · 마스터 둘 다), REQUESTED(가상계좌 환불처럼 처리 중)면 환불로 기록하고 환불 · 취소 관리에 ‘환불 진행 중’.
  - 두잉고 강의실(VOD 버전): 강의 시작 안내 중에는 ‘완료하고 다음 강의’ 버튼을 숨겨요(DOOGO CLASS 강의실과 같게 — 누르면 경고 없이 100% 환불 대상에서 빠져요).
  - ‘환불 · 취소 내역’도 DOOGO CLASS 판매 메뉴라 DOOGO CLASS 가 잠긴 강사는 자물쇠 화면.
  - 스토어 홈 강사진 슬라이드: 태블릿 폭(640~860px)에서 화살표 한 번에 4장씩 넘겨 한 명을 건너뛰던 것(줄 안쪽 여백까지 폭으로 셌어요 → 3장) · 키보드 초점 테두리가 잘리던 것(안쪽에 그려요) · 마우스 버튼을 놓친 채 끌기가 계속되던 것(버튼이 안 눌린 움직임 · 창을 벗어나면 끝 · 끄는 동안 글자 선택 안 됨).
- **원클릭 환불**: 카드 · 간편결제 · 계좌이체는 환불 창의 ‘포트원으로 환불하기’ 한 번이면 포트원 결제 취소까지 끝나요(부분 환불 가능). 가상계좌는 환불받을 계좌(은행 · 계좌번호 · 예금주)를 같이 보내 포트원이 송금해요. 무통장 입금은 회원이 환불 요청에 적은 계좌가 채워지고, ‘환불 처리 (송금 대기로)’ 뒤 환불 · 취소 관리의 **계좌 송금 대기**에서 직접 송금하고 ‘송금 완료’를 누르면 끝나요(메뉴 숫자 = 아직 송금 안 한 환불).

## 강사센터 판매 정산 · 정산 달력

- 판매 정산 위쪽 두 카드: 지난달 판매분(확정 대기 · 확정 · 지급 완료)과 이번 달 판매분(집계 중) — 판매가 합계 → 내 정산액 → **광고비 분담**(그 달 광고비 × 내 분담 %) → 정산액 → 원천징수 3.3%(개인) → **받을 금액** · **받는 날**. 아래 ‘광고비 내역’에서 집행일 · 강의 · 채널 · 금액 · 내 분담을 봐요.
- 정산 달력: 날짜마다 팔린 개수 · 정산 예정, 그리고 **지급일 칸**(초록)에 ‘받을 돈 20,310원’처럼 그날 받을 금액(받은 뒤엔 ‘받음’)이 적혀 있어요. 누르면 ‘정산 − 광고비 분담 − 원천징수 = 지급’ 한 줄이 나오고, 아래 ‘지급 일정’ 표에 달마다 지급일 · 받을 금액 · 상태가 정리돼요.
- **정산 유형 · 개인 / 사업자 (2026-11-02)**: 마스터 › 강사 정산 › 명세서 창 위 ‘정산 유형’에서 **개인 · 3.3% 원천징수** / **사업자 · 부가세 · 세금계산서**를 골라요 — 고르면 아래 금액이 바로 다시 계산돼요(사업자는 3.3%를 떼지 않고, 세금계산서 금액은 정산 기준(판매가 · 정산액 · 공급가액)에 따라). 마스터가 고르면 `ins.vodSettle.typeBy = "master"` 로 남아 강사센터 ‘정산 받을 정보’의 유형 칸이 잠기고(“운영팀이 정했어요”), 서버도 강사 저장에서 그 유형을 지켜요(`access.js` `keepSettleType` — 강사가 스스로 ‘마스터가 정함’ 표시를 붙이지는 못해요). 마스터가 안 골랐으면 예전처럼 강사가 고른 유형(없으면 개인). 확정한 명세서는 확정할 때 유형으로 고정 — 바꾸려면 ‘확정 취소’ 뒤에. 강사 정산 목록의 정산 정보 칸은 계좌가 없어도 유형을 보여요(‘사업자 · 계좌 없음’).
- **이번 달 정산 명세서 (2026-11-02)**: 마스터가 지난달 판매분을 ‘정산 확정’하면 강사센터 › 판매 정산 맨 위에 **‘이번 달 정산 명세서가 나왔어요’**(판매 월 · 지급일 · 받을 금액 + ‘명세서 보기’, 사업자는 ‘세금계산서 발행 완료’)가 떠요. 확정 전(달이 끝난 뒤)에는 ‘운영팀이 확정하고 있어요’, 지급 뒤에는 ‘이번 달 정산을 지급했어요’. 메뉴 ‘판매 정산’ 옆에 1, 두잉고 쪽 화면이면 관리 영역 스위치의 DOOGO CLASS 버튼에 빨간 점 — 판매 정산을 열거나 명세서를 보면 사라져요(이 브라우저 기억 `dc:vs-seen:<강사>`). 위 숫자는 ‘이번 달 받을 금액’(지난달 판매분 · 이번 달 10일 지급) · ‘이번 달 판매 (집계 중)’(다음 달 10일 지급), 카드 제목은 ‘이번 달 명세서 · <지난달> 판매분’.

## 홈 꾸미기 (마스터 › DOOGO CLASS › 클래스 · 전시 › 홈 꾸미기)

스토어 첫 화면(PC · 휴대폰 같은 순서)을 마스터가 직접 꾸며요. 누르는 즉시 저장되고 스토어 홈에 바로 보여요(이름표 · 제목만 ‘저장’ 버튼).

- **섹션 순서**(왼쪽 · 휴대폰은 위): BEST · 학습 시스템 소개 · 전자책 · 분야별 · NEW · 무료 LIVE · 얼리버드 · LIVE · 오프라인 · 무료 특강 · 오픈 예정 · **다루는 부업** · **강사진** 12개를 ↑ ↓로 옮기고 스위치로 켜고 꺼요. 판매 영역이 꺼진 섹션은 줄을 그어 보여 주고 편집 화면에서 바로 켤 수 있어요. ‘전체 처음 상태로’는 순서 · 켜기 · 제목 · 고정 · 뺀 강의 · 탭 · 강사 순서를 모두 되돌려요.
- **섹션 편집**(오른쪽): 섹션을 누르면 지금 첫 화면에 보이는 순서 그대로 강의 줄이 나와요.
  - **맨 앞 · ↑ ↓**: 옮긴 자리까지 순서가 고정(빨간 표시)되고, 나머지와 새로 올라오는 강의는 원래 규칙(많이 팔린 순 · 최근 순 …)대로 그 뒤에 붙어요.
  - **빼기(×)**: 그 섹션에서만 빠지고 아래 ‘뺀 강의’에 남아요 → **다시 넣기**. 자동 규칙도 다시 넣지 않아요.
  - **강의 추가**: 스토어에 실제로 보일 수 있는 강의(판매 중 · 오픈 예정, 꺼진 판매 영역 · 지난 LIVE 제외)를 골라 넣어요.
  - **강의 고르는 방법**: 자동(기본 규칙) / 고정한 강의 먼저 + 나머지 자동 / 고른 강의만(바꾸는 순간 지금 보이던 강의를 그대로 골라 둬서 사라지는 강의가 없어요).
  - **분야별**: 분야 탭 순서 · 켜기를 정하고, 탭을 골라 탭 안 강의 순서 · 빼기를 해요(첫 화면 탭에는 6개, 나머지는 ‘전체보기’).
  - **강사진**: 강사 순서(첫 화면 강사진 · 강사진 메뉴에 같이 써요) · 빼기(첫 화면에서만 숨김). 첫 화면에는 8명까지.
  - **이 섹션 처음 규칙으로**: 그 섹션의 고정 · 뺀 강의 · 탭 순서만 지워요(이름표 · 제목 · 켜기는 그대로).
- 저장 모양: `VOD.homeRails` = `[{ k, on, tag, t, mode: auto|pin|only, picks, hide, cats: [{ k, on, picks, hide }] }]` — 예전에 저장한 값도 그대로 읽고, 없는 섹션(다루는 부업 · 강사진)은 맨 아래에 붙어요(지금 화면과 같은 자리). 운영자 권한은 ‘전시 · 쿠폰 · 설정’ 권한을 따라요. ‘전시 · 쿠폰 · 설정’에는 홈 꾸미기로 가는 버튼만 남겼어요.

## 카카오 1초 가입 (설정 · 회원 DB 분류)

- 서버 흐름은 이미 들어 있어요(`api/vod-auth?action=kakao` → 카카오 동의 화면 → `api/vod-kakao`): 가입 · 로그인 · 이메일 회원에 카카오 연결 · 카카오싱크 광고 동의 · 채널 친구 여부 · 탈퇴 때 연결 끊기 · 카카오 쪽 연결 끊기 알림. 자세한 콘솔 설정은 `scripts/VOD-LAUNCH.md` › 2.
- Vercel(운영) 환경 변수 3개가 모두 있어야 켜져요: `KAKAO_REST_KEY`(2026-10-31 등록함) · `KAKAO_CLIENT_SECRET`(비밀 · 2026-10-31 등록함) · `KAKAO_REDIRECT_URI`(= `https://www.doogoclass.com/api/vod-kakao`, 2026-10-30 등록함). 동의항목(2026-10-31): 닉네임 · 프로필 사진 · 카카오계정(이메일) · 카카오톡 채널 추가 상태 = 필수, 이름 · 전화번호 = 심사 중(승인 뒤 필수로). 카카오 콘솔 필수 3가지(공식 문서): [카카오 로그인] › 사용 설정 ON(꺼져 있으면 KOE004) · [앱] › [플랫폼 키] › [REST API 키]의 ‘카카오 로그인 리다이렉트 URI’ · 같은 화면의 클라이언트 시크릿(기본 ON → 토큰 요청에 꼭 포함). 선택: `KAKAO_ADMIN_KEY`(비밀 · 연결 끊기) · `KAKAO_MKT_TAG`. 넣은 뒤 **다시 배포**해야 적용돼요. 없으면 버튼은 ‘곧 열려요’ 안내만 해요.
- 카카오 로그인은 언제나 `www.doogoclass.com` 에서 시작해요: 다른 주소(`doinggo.doogoclass.com` · `doogo-class.vercel.app`)에서 버튼을 누르면 `/api/vod-auth?action=kakao` 가 먼저 www 로 옮긴 뒤 카카오로 보내요(10분짜리 state 쿠키는 누른 주소에만 붙어서, 다른 주소에서 시작하면 돌아올 때 ‘로그인을 마치지 못했어요’가 됐을 것). `doogoclass.com` 은 원래 www 로 308 이동. JavaScript 키 · 네이티브 앱 키 · 어드민 키는 이 로그인에 쓰지 않아요(REST API 키 + 클라이언트 시크릿만).
- **이메일 회원에 카카오 연결(합치기)**: 마이페이지 › **회원 정보 수정** 맨 위 카드 ‘카카오 계정 연결’ › **카카오 연결하기** → 카카오 동의 → 그 계정에 카카오가 붙어요(`/api/vod-auth?action=kakao&link=1` → 돌아오면 `?vodlogin=linked`, ‘카카오를 연결했어요’). 그 뒤로는 이메일 · 비밀번호와 카카오 둘 다로 로그인돼요(강의 · 주문 · 쿠폰 · 포인트는 그대로). 연결된 회원은 카드에 ‘카카오 연결됨’ + **연결 끊기**(한 번 더 눌러 확인 · `action: "kakao-off"`, 카카오 쪽 연결도 끊어요). 카카오로 가입한 회원은 끊을 수 없어요(비밀번호가 없어 로그인할 방법이 사라져서). 막아 둔 경우: 그 카카오가 **다른 두고클래스 계정**에 이미 연결돼 있으면 연결하지 않고 ‘이미 다른 계정에 연결돼 있어요’(`taken` — 예전에는 그 계정으로 로그인이 바뀌어 버리던 빈틈을 막았어요), 이 계정에 **다른 카카오**가 이미 붙어 있으면 ‘연결을 끊은 뒤 다시’(`other`, 덮어쓰지 않음). 카카오로 시작했는데 같은 이메일의 이메일 회원이 있으면(`dup`) 자동으로 합치지 않고 로그인 화면으로 안내 → **이메일로 로그인하면 바로 ‘카카오도 연결할까요?’** 창이 떠요(한 번만 · 이 탭에서만).
- **마스터 › 회원 DB**: 목록 위 **전체 / 카카오 1초 가입 / 이메일 가입** 버튼(숫자 포함 · ‘가입 방식’ 드롭다운과 같이 움직여요). 카카오로 가입한 회원은 노란 말풍선 **‘카카오 1초 가입’** 표시 + 사진 옆 카카오 표시, 이메일로 가입한 뒤 카카오를 연결한 회원은 **‘카카오 연결’**, 카카오 쪽에서 연결을 끊은 회원은 ‘카카오 연결 끊김’. 회원 상세 · 내려받기(‘가입 방식’ 칸)도 같아요.

## 스토어 강사진 · 마이페이지 프로필

- **홈 강사진**(최대 8명): PC는 **처음 모델 그대로 4칸 카드**(카드 폭 약 285px · 색 모양 위 상반신 사진 · ‘클래스 N’ 표시 · 이름 · 소개 · 분야 · 동그란 SNS / 강사 페이지 버튼, 많으면 다음 줄로) — 잠깐 넣었던 큰 가로 슬라이드는 너무 커서 되돌렸어요. 휴대폰 · 태블릿은 가로로 밀어 보는 줄(두 장 반) + 아래 빨간 진행 막대.
- **강사진 메뉴**(`#/vod/teachers`): 위에 **강사 검색**(이름 · 소개 · 분야, 초성도 돼요 — ‘ㅁㄷㅍ’ → 문대표)과 **분야 버튼**(전체 + 강사들이 여는 분야). 고르면 ‘부업 · 창업 강사님 n명’처럼 결과 수가 보이고, 없으면 ‘찾는 강사님이 없어요 · 강사진 전체 보기’. 글자를 칠 때마다 다시 그리지 않고 카드만 숨겨서 입력이 끊기지 않고, 고른 분야 · 검색어는 다른 화면에 갔다 와도 남아요.
- **마이페이지 메뉴 이동**: 회원 정보 수정 → 기기 관리 → 고객센터처럼 마이페이지 안에서 메뉴만 바꿀 때는 **맨 위로 올라가지 않아요**. 메뉴 줄은 누른 자리 · 가로 위치 그대로, 새 내용이 화면 위로 지나가 있으면 메뉴 바로 아래부터 보이게 맞춰요(PC는 제목이 머리글 아래 보이게). 휴대폰 · 태블릿 메뉴 줄은 아래로 내려도 **머리글 바로 아래에 붙어 있어요**(붙으면 아래쪽 그림자), 다른 화면에서 들어오면 고른 메뉴가 줄 가운데 보이게 밀어 둬요.
- **마이페이지 프로필 카드**(휴대폰): 이름 아래 한 줄에 **포인트 · 내 프로필**을 나란히, 그 아래 진행중 강의 · 쿠폰 · 결제대기 · 배송중 숫자. 회원 정보 수정 폼은 클래스 이름을 `.vd-acctf` 로 바꿔 머리글 계정 버튼(`.vd-acct`) 모양이 섞여 잘리던 문제를 고쳤어요.

## 스토어 전체 메뉴 · 클래스 상세 탈잉형 (2026-11-07 · 탈잉 · 프레스런 벤치마킹)

- **전체 메뉴**(휴대폰 · 태블릿 아래 줄의 ‘메뉴’): 2026-11-08 사용자 요청으로 **예전 기본처럼 왼쪽에서 나오는 판**(넓은 화면 360px · 휴대폰 화면의 86% · 뒤는 어둡게)으로 되돌렸어요 — 하루 써 본 ‘화면 전체 덮기’는 뺐어요. 줄마다 **아이콘 + 글자는 프레스런 정도로 가볍게**: 글자 16px 보통 굵기(500) 검정, 아이콘은 바탕 없는 26px — 카테고리와 같은 **3D 그림**(전체 · VOD · 전자책 · LIVE · 무료 · 오픈 예정 · 분야 6개 — `assets/vod/cat/*.webp`), 그림이 없는 메뉴는 **색 선 아이콘**(돈되는 클래스 빨강 · 강사진 보라 · 내 강의실 파랑 · 찜 분홍 · 쿠폰 노랑 · 주문 초록 · 고객센터 하늘 · 소개 주황 · 파트너스 청록 · 두잉고 파랑 · 강사센터 회청 · 카카오톡 노랑). 묶음 사이는 8px 회색 띠. 무엇을 어떤 순서로 보여 줄지는 `vod.js drawerSecs` 한 곳(예전 화면 · React `ui/store/Shell.jsx` 같이 씀) — 꺼진 판매 영역(무료 LIVE · LIVE · 무료강의 · 전자책)은 예전처럼 빠져요.
  - **맨 위 (2026-11-08)**: ‘전체 메뉴’ 글자 대신 **두고클래스 로고**(누르면 메뉴가 닫히고 스토어 첫 화면) + 그 아래 회색 **검색 제목 문구 ‘배움이 기회가 되는 곳, 두고클래스’**. 문구는 스토어 첫 화면 검색 제목(브라우저 탭 제목)과 같은 한 곳 `vod.js STORE_TITLE`(` | ` 앞부분 = `STORE_TAG`)에서 가져와요 — 서버가 보내는 `index.html` 의 `<title>` · 공유 제목을 바꾸면 여기도 같이 바꿔요. 화면 읽기 프로그램에는 창 이름 ‘전체 메뉴’가 그대로 읽혀요. 머리 내용은 `modal(title, body, cls, head)` / React `Modal` 의 `head` 로 넣어요.
- **클래스 상세 구성**(`/vod/p/<클래스>`):
  - **[PC]** 대표 영상이 없으면 맨 위 **넓은 썸네일(대표 배너 1200:420 · 예전 그대로)** → 아래 왼쪽: 베스트 후기 → 탭 → 본문 / 오른쪽: **따라오는 카드**(뱃지 · ‘미리보기 N개’ · 제목 · 별점 → 가격 → 한눈에 보는 정보 → 수강권 · 쿠폰 · 수강신청 · 찜 · 공유 · 환불 한 줄 — 화면보다 길면 카드 안에서 스크롤). **대표 영상이 있으면 탈잉 배치**(아래 ‘맨 위 대표 영상’): 왼쪽 위 16:9 영상 → 베스트 후기 → 탭 → 본문 / 오른쪽 카드는 영상과 같은 높이부터.
  - **[휴대폰 · 태블릿]** 썸네일(휴대폰은 화면 끝까지 16:10 · 예전 그대로) 또는 대표 영상(화면 끝까지 16:9) → 카드(같은 내용 · 뱃지 줄 오른쪽 ‘미리보기 N개’) → 베스트 후기(밀어서 넘김) → 탭 → 본문 → 아래 결제 막대(예전 그대로).
  - **가격은 제목 · 별점 바로 아래**(탈잉처럼): 수강권 강의는 12개월 기준 `정가(줄) · % · 월 가격` + ‘12개월 수강권 · 총 OOO원’, 그냥 가격은 `정가(줄) · % · 가격` + 할부 월 금액, 무료 · 오픈 예정가도 같은 자리. 할인 마감 시계도 그 아래. 카드 아래쪽의 큰 가격 · 정가/할인 금액 줄은 빼고(위와 겹쳐서) 쿠폰 적용가만 남겼어요. 계산: `vod.js headPrice · headView`.
  - **한눈에 보는 정보**(탈잉의 ‘VOD · 총 36강’ 줄): VOD 는 `VOD · 총 N강 · 시간` · 수강 기간 · PC/모바일 수강 · 강의 노트, 전자책 · 종이책 · LIVE · 오프라인은 각자 맞는 줄(`headInfo`). 예전 ‘구매하면 OOO 강사 두잉고 강의실이 열려요’ 상자는 **한 줄(빨간 아이콘)**로 줄였어요.
  - **뺀 것 · 옮긴 것**: 제목 아래 ‘고민 따옴표 소개 글’ · ‘이런 분들께 추천드려요’ 목록(소개 탭 안에 있는 것과 겹침) · ‘강의 정보’ 회색 상자 · 두잉고 강의실 큰 상자를 위에서 뺐어요. 강사 코멘트는 **강사 소개** 칸 아래로, 미리보기 카드는 **커리큘럼** 맨 위로, ‘수강권 · 1:1 코칭’ 안내는 **이용 안내**(강의 정보 다음)로 옮겼어요.
  - **탭 5개**(탈잉 · 프레스런처럼 한 페이지를 누르면 그 칸으로 내려가요): 클래스 소개 · 커리큘럼 · **다짐 · 후기 N**(2026-11-08 · 후기 + 다짐 한마디를 한 숫자로 · 숫자는 탈잉 ‘리뷰 613’처럼 빨간 글씨 · 0이면 숫자 없음 · 종이책은 ‘다짐 · 독자 후기’) · **강사 소개**(새로) · 이용 안내 — 고른 탭은 빨간 글자 + 밑줄, 탭 줄은 머리글 아래 붙어 따라와요. 화면 순서도 탭 순서 그대로(소개 → 커리큘럼 → 후기 · 다짐 → 강사 → 강의 정보 · 수강권 · FAQ · 환불).
  - 소개 탭 본문은 가볍게: 어두운 큰 띠 → 연회색 상자, 말풍선 색 번갈이 → 같은 연회색 카드, 왼쪽 정렬(CSS만 — 마스터가 쓰는 칸은 그대로).
- **맨 위 썸네일 (2026-11-08 예전으로 되돌림 → 같은 날 영상은 다시)**: 대표 영상이 없으면 대표 배너(썸네일 그림 · 마스터가 올린 배너 이미지) 그대로. 예전 썸네일 왼쪽 아래 있던 **‘미리보기 N개’** 버튼은 카드 뱃지 줄 오른쪽으로 옮겼어요(아래 ‘클래스 상세 맨 위 대표 영상’). 썸네일 HTML 은 `vod.js heroHtml` · React `ProductPage.jsx Hero` 같은 모양이에요.

## 클래스 상세 맨 위 대표 영상 · 베스트 후기 · ‘다짐 · 후기’ 탭 (2026-11-08 · 탈잉처럼)

- **맨 위 대표 영상**: 마스터 › DOOGO CLASS › 클래스 관리 › 세팅 › 3 썸네일의 **‘상세 맨 위 영상’**(유튜브 · 비메오 · mp4 주소)을 넣으면, 상세 맨 위에서 그 영상이 **소리 끈 채로 저절로 반복 재생**돼요(탈잉처럼). 비우면 예전 넓은 썸네일 그대로 — 2026-11-07 처럼 미리보기 강의 영상을 대신 틀지 않아요. ‘상세 맨 위 영상 잠깐 끄기’를 켜면 주소는 두고 썸네일만 보여요.
  - **배치(탈잉)**: [PC] 왼쪽 위 16:9 영상(본문 폭 · 둥근 모서리) → 베스트 후기 → 탭 → 본문 | 오른쪽 따라오는 카드는 영상과 같은 높이부터. [휴대폰] 영상이 화면 끝까지(16:9 · 모서리 없음) → 카드 → 베스트 후기 → 탭.
  - **재생**: 오른쪽 위 **⏸ 멈추기 버튼 · ‘소리 켜기 · 소리 끄기’**(탈잉 ‘음소거 해제’ 자리 · 실제로 돌 때만 보여요). **영상을 아무 데나 누르거나 ⏸ 버튼을 누르면 멈추고**(가운데 큰 ▶ · 유튜브는 대표 그림을 다시 덮어서 멈춘 화면의 유튜브 제목 · 다른 영상 안내가 안 보이게), 다시 누르거나 ▶ 버튼을 누르면 이어서 재생해요. 사람이 멈춘 영상은 화면 밖 · 미리보기 창에서 돌아와도 멈춘 그대로예요(`vod.js heroToggle` · React `HeroVid`). 주소에 시작 시각(`&t=1558s` · `t=25m58s` · `start=`)이 있으면 **그때부터** 재생하고, 영상이 끝나면 그 시각으로 돌아가 다시 돌아요(유튜브 반복은 0초부터라서 직접). 재생 전(불러오는 중)에는 유튜브 큰 썸네일이 보이다가 재생이 시작되면 걷혀요. 미리보기 창이 열려 있거나 영상이 화면 밖으로 지나가면 잠깐 멈추고, 돌아오면 — 우리가 멈춘 것만 — 다시 틀어요. 자동 재생이 막힌 휴대폰(저전력 모드 등)은 7초 · 12초 뒤 영상을 눌러서 재생할 수 있게, 데이터 절약 설정이면 저절로 틀지 않고 눌러서 재생(소리 켠 채). ‘동작 줄이기’(윈도우 애니메이션 효과 끔) PC 도 소리 없이 저절로 재생해요. 퍼가기가 막힌 영상이면 썸네일만 남아요.
  - **코드**: `vod.js heroOf`(주소 → 유튜브 · 비메오 · mp4 · 시작 초 `tStart`) · `heroVid`(영상 칸) · `heroWire`(그린 뒤 iframe · video 붙이기 · 유튜브 신호 주고받기) · `heroSnd` · `heroPause` — React `ProductPage.jsx HeroVid` 도 같은 함수를 써요. 비교 시험은 영상 칸 안쪽(iframe)과 재생 표시만 빼고 봐요(`e2e/lib.js`).
  - **AI 굿즈 클래스(v2)**: 사용자가 준 유튜브 주소(`…watch?v=j7TDQ-D1M1s&t=1558s` · 25분 58초부터)를 일회성 작업 `2026-11-08-v2-teaser` 가 배포 때 한 번 넣어요(영상 칸이 비어 있을 때만 · 미리보기는 시험용 DB 에 먼저). 바꾸려면 마스터 › 클래스 세팅에서 주소만 바꾸면 돼요.
- **찜 숫자 하트 (2026-11-08)**: 상세 제목 아래 ‘♥ 찜 수’ 하트는 **속까지 채운 빨간 하트**(CSS `.vd-pdt-rate > span > .icon`). 누르는 찜 버튼(가격 카드 ‘찜’ · 아래 막대 하트)은 예전처럼 찜했을 때만 채워져요.
- **숫자로 망설이지 않게 (2026-11-08 · 막 시작한 스토어라 ‘수강생 0명’ · ‘후기 0’ 이 오히려 구매를 망설이게 해서)**
  - **상세 제목 아래 줄**: ‘수강생 N명+’ · ‘판매 N권+’ 와 찜한 사람 얼굴을 뺐어요. 이제 **‘♥ 찜 수 | 💬 다짐 · 후기 N’**(누르면 다짐 · 후기 칸으로) — 0 인 숫자는 빼고, 둘 다 0 이면 줄이 없어요. 별점은 ‘다짐 · 후기’ 칸 안에서 보여요. 마스터의 ‘표시 수강생(base)’ 값은 그대로 남아 있지만 스토어에는 안 보여요. (BEST 카드의 ‘👥 100+’ 는 100명이 넘을 때만 보여서 그대로 뒀어요.)
  - **카드(홈 · 목록 · 검색 · 강사 페이지 · 함께 보는 클래스)**: 패스트캠퍼스처럼 **찜 수를 썸네일 오른쪽 위 ‘N ♡’ 알약**으로(반투명 검정 · 흰 글자 · 찜하면 빨간 하트 · 0 이면 숫자 없이 하트만 · 10 이상은 ‘120+’ 처럼 10단위 — `vod.js likeNum`). 카드 아래의 ‘♡ 찜 수 | ★ 별점 후기 N’ 줄은 뺐어요(강사 이름만). 후기 · 다짐은 클래스 상세(제목 아래 줄 · ‘다짐 · 후기 N’ 탭 · 베스트 후기 줄 · 다짐 쿠폰)에서 보여 줘요.
  - 가격 카드 ‘찜’ · 아래 막대 하트도 찜 0 이면 숫자 없이.
- **결제 쿠폰 자동 고르기 (React · 2026-11-08 고침)**: 결제 화면이 열린 뒤에 쿠폰이 들어오면(방금 다짐해서 받은 다짐 쿠폰 등) ‘사용 가능 1장’ 인데도 ‘쿠폰 쓰지 않기’ 로 남아 있었어요 — 쿠폰 목록이 바뀌면 고르기 칸을 다시 그려 가장 많이 깎이는 쿠폰을 골라 둬요(예전 화면과 같게 · `CheckoutPage.jsx` select `key`).
- **상단 영상 (2026-11-08 고침)**: 윈도우 ‘애니메이션 효과’를 끈 PC(동작 줄이기)에서는 일부러 자동 재생을 안 해서 유튜브 재생 버튼 · 제목이 보였어요 → 이제 탈잉처럼 이런 PC 에서도 소리 없이 저절로 재생(데이터 절약 설정만 눌러서 재생). ‘소리 켜기’ 알약은 영상이 실제로 돌 때만(`is-run`).
- **상단 영상 멈추기 (2026-11-08 고침)**: 영상 위를 눌러도 아무 일이 없었어요 — 유튜브 화면은 제목 · 다른 영상 안내가 눌리지 않게 막아 두었고(`pointer-events: none`), 버튼은 ‘소리 켜기’ 하나뿐이었어요. 이제 **영상을 누르거나 오른쪽 위 ⏸ 버튼**으로 멈추기 · 다시 재생(휴대폰도 같아요). 멈추면 가운데 큰 ▶, 버튼은 ▶ 로 바뀌어요. 사람이 멈춘 영상은 스크롤로 화면 밖에 다녀오거나 미리보기 창을 닫아도 저절로 다시 틀지 않아요(우리가 잠깐 멈춘 것만 다시 틀어요). 상시 e2e(react · 3) 클래스 상세)에 가짜 유튜브 플레이어로 ‘누르면 멈춤 → 화면 밖 다녀와도 그대로 → ▶ 로 다시 재생’ 확인을 넣었어요(예전 화면 · React · PC · 휴대폰).
- **‘미리보기 N개’ 버튼 자리**: 썸네일 · 영상 위(왼쪽 아래)에서 **카드 맨 위 뱃지 줄(NEW · 추천 · 온라인 …) 오른쪽**으로 — 영상과 겹치지 않게. 누르면 예전처럼 미리보기 창(그대로). `vod.js pcTag` · React `PcTag`.
- **베스트 후기**: 마스터 › DOOGO CLASS › **후기 · 다짐 · 문의** 의 후기 · 다짐 한마디 줄마다 **‘베스트로’ / ‘베스트 빼기’** — 고른 것(숨긴 것 빼고)이 그 클래스 상세 **탭 바로 위 ‘베스트 후기’ 가로 카드 줄**에 보여요(탈잉 ‘베스트 리뷰’처럼 · 후기 먼저, 그다음 다짐 · 최근 쓴 순 · 20개까지). 카드: 별점(다짐은 ‘다짐 한마디’ 표시) · 이름 · 글 4줄, 누르면 아래 그 칸으로. PC 는 오른쪽 위 좌우 화살표 · 마우스로 끌기, 휴대폰은 밀어서. 고른 게 없으면 이 줄은 없어요. 표시는 문서의 `best: true` — 서버는 마스터만 켜고 끌 수 있고(회원이 자기 후기 · 다짐을 고쳐도 그대로 · 새로 쓰면서 켤 수 없음), 한 건씩 표 `reviews.best` · `pledges.best` 열로도 보여요. `vod.js bestOf · bestHtml` · React `Best`.
- **운영 배포 (2026-11-08 · main `f088fed` · 520c915 에서 15개)**: 빌드 기록 — 배포 전 백업 문서 90개(240KB) · 2부 표 모양 바꿈 reviews 0줄 · pledges 0줄 · settings 4줄(새 열: 후기 글 · 베스트 · 숨김 · 상세 맨 위 영상) · B3 members 열 다시 4(회원 쿠폰 한 건씩 4줄) · B6 settings 한 건씩 59줄(배너 포함) · 영역 B2~B6 모두 ‘맞음’ · 표 37개 RLS · 일회성 `2026-11-08-v2-teaser` 완료(넣음 · 25:58) · READY · 운영 주소 /vod/p/v2 React 화면 200 · 서버 오류 0.
- **운영 배포 (2026-11-08 · main `c379246` · f088fed 에서 2개 — 상단 영상 멈추기 · 다시 재생)**: 빌드 기록 — 배포 전 백업 문서 90개(240KB) · 백업 표 13개 · 영역 B2~B6 모두 ‘맞음’(reviews 0줄 · pledges 0줄 · settings 한 건씩 59줄) · 새 일회성 작업 없음 · 빠진 기본값 바뀐 것 없음 · READY · 운영 주소 /vod/p/v2 200(화면 파일 `?v=c379246b`) · 서버 오류 0.
- **시험**: 서버 시험 41번(베스트는 마스터만 · 표 열 · 일회성 · 화면 코드) · React 비교 시험(회원 다짐 → 마스터 ‘베스트로’ · 클래스 세팅 영상 주소 → 상세 PC · 휴대폰 예전 화면 = React → 되돌리기) · 가짜 유튜브 플레이어로 재생 · 소리 · 미리보기 창 · 화면 밖 멈춤 · 끝나면 시작 시각으로 · 동작 줄이기 · 대답 없는 플레이어(12초 뒤 눌러서 재생)를 예전 화면 · React 둘 다 확인.

## 다짐 쿠폰 (2026-11-08 · 클래스 상세 ‘나의 다짐 한마디’)

- **규칙**: 클래스 상세에서 다짐을 **20자 이상**(띄어쓰기 여러 개는 하나로, 앞뒤 빈칸 빼고 셈) 처음 남기면 **그 강의에만 쓰는 5,000원 쿠폰**(받은 날부터 30일)이 들어와요. 클래스마다 한 번(지우고 다시 써도 한 번), 이미 산 강의 · 무료 · 오픈 예정 · 종이책은 쿠폰 없이 다짐만. 20자보다 짧은 다짐은 화면 · 서버 모두 받지 않고, 고칠 때도 20자보다 짧으면 예전 글 그대로.
- **서버가 줘요**: 다짐 저장 뒤 `api/_lib/vodaccess.js after()` 가 회원 문서(`vm:`)에 쿠폰 · 받은 클래스(`plCps`)를 넣어요. 회원이 직접 고칠 수 있는 칸이 아니라 쿠폰을 꾸며 넣을 수 없어요. 규칙 숫자(5,000원 · 30일 · 20자)와 쿠폰 정의는 화면 · 서버 같은 공용 모듈 `shared/price.js`(`PLEDGE` · `pledgeLen` · `pledgeDef` · `pledgeable`) — 결제 금액 계산(`api/_lib/vod.js quote`)도 같은 정의로 그 강의(`pid`)에만 빼요. 마이페이지 쿠폰 · 결제 화면 · 마스터 회원 쿠폰 목록에 ‘다짐 쿠폰 · ‘강의 제목’ 전용’으로 보여요.
- **쓰게 만드는 장치**: 다짐 칸 위 쿠폰 띠(‘다짐 20자 이상 남기면 이 강의 5,000원 쿠폰’) · 예시 문장 3개(누르면 칸에 채워짐) · 글자 수 막대(20자가 되면 초록) · 버튼 ‘다짐 남기고 쿠폰 받기’(20자 전에는 꺼짐) · 가격 카드 쿠폰 아래 ‘다짐 쓰고 5,000원 쿠폰 받기’ 버튼(누르면 다짐 칸으로) · 로그인하러 갔다 와도 쓰던 글이 남아요(이 기기 · 클래스마다). 받은 뒤에는 초록 ‘쿠폰을 받았어요’ 띠(쓸 수 있는 날짜).

## 스토어 첫 화면 배너 (2026-11-08 탈잉형 카드 시험 → 되돌림)

- 탈잉처럼 정사각형 큰 카드(휴대폰 한 장 · PC 세 장)로 바꿔 미리보기에서 보여 드렸다가, 사용자 판단으로 **예전 배너(가운데 크게 · 양옆 살짝 · 24px 둥근 모서리 · 별 스티커)로 되돌렸어요** — PC · 휴대폰 모두. 이미지 배너도 예전처럼 PC(1672 × 736) · 모바일(1050 × 600) 이미지를 따로 올려요. 시험 때 시험용 DB 의 기본 이미지 배너에 들어간 정사각형 이미지 칸(`sq`) · `v24` 표시는 화면이 쓰지 않아 그대로 둬도 돼요(운영에는 안 들어갔어요).

## 휴대폰에서 PC 화면 보기 (?pc=1 · 2026-11-08)

- 주소 뒤에 **`?pc=1`** 을 붙여 열면(예: `/vod?pc=1`) 휴대폰에서도 화면을 **PC 폭 1280px** 로 그려서 PC 화면 그대로 작게 보여요(손가락으로 확대). 한 번 켜면 쿠키 `dc_pc=1` 로 그 브라우저에서 다른 화면으로 옮겨도 계속 PC 화면, **`?pc=0`** 으로 원래대로(쿠키 지움 · 브라우저 세션이 끝나도 지워져요).
- React 화면은 `app/(react)/layout.js generateViewport` 가 주소(`x-dc-path` 의 `?pc=`)와 쿠키를 보고 처음부터 `width=1280`(Next 기본 `initial-scale=1` 은 빼요 — 빼야 PC 화면 전체가 보이게 줄여서 시작) 을 내보내고, 머리 스크립트(HEAD_JS)가 쿠키를 켜고 꺼요. 예전 화면은 `class/index.html` 머리 스크립트가 같은 규칙으로 화면 폭 표시(meta viewport)를 바꿔요.
- 검색 · 공유에는 영향 없어요(대표 주소 canonical 은 `?pc=` 없는 주소 그대로). 마스터 · 강사가 휴대폰으로 PC 화면을 확인할 때 써요.

## 두잉고 사용법 영상 (/doinggo/guide)

- **들어가는 곳**: 두잉고 소개 화면 머리글 ‘사용법 영상’ · 바닥글 브랜드 칸의 **사용법 영상** 버튼(입점 문의하기 · 강사센터 옆) · 바닥글 ‘바로가기’의 **사용법 영상 · 강사 / 수강생**. 주소 `/doinggo/guide/ins/<영상>` · `/doinggo/guide/stu/<영상>`.
- **화면**: 압도마케팅 사용법 영상처럼 큰 제목 + **강사 버전 / 수강생 버전** 탭 → 큰 묶음별 목록(제목 · 길이) → 소리 없는 영상. 영상은 처음 카드(아이콘 · 제목 · 한 줄 설명) → 단계마다 실제 화면 위에서 **누를 곳으로 확대해 따라가고, 마우스가 움직여 누르고, 아래 자막**(빨간 강조 글자)이 바뀌어요 → 끝 카드(다시 보기 · 4초 뒤 다음 영상). 위쪽 단계 막대 · 아래 시간 막대(끌기) · 일시정지 · 전체 화면(아이폰은 화면 가득) · 키보드(스페이스 · ← → · F). 영상 아래 ‘강사센터에서 열기 / 수강생 화면 열기’.
- **고른 영상 (꼭 알아야 직접 세팅할 수 있는 것만)**: 강사 13편 — 첫 세팅(기본 정보 · 색상 · AI 조교, 수강생 메뉴 구성) · 기수 · 수강생(기수 일정 설계, 수강생 추가 · 승인, 다음 기수 신청) · 강의 · 과제(주차별 강의 올리기, 과제 만들기 · 자동 검수, 과제 검수 · 피드백, 시작 가이드 · 빠른 이동) · 홍보 페이지(무료강의 페이지, 강사 소개 페이지) · 소통(1:1 요청 답변, 코치 계정). 수강생 7편 — 로그인 · 홈 화면 · 주차별 강의 · 과제 내기 · 1:1 요청 · AI 조교 · 수업 캘린더. 로그아웃 · 단순 보기처럼 쉬운 메뉴는 뺐어요.
- **만드는 법**: `scripts/guide-capture.js` 가 개발 서버(새 데이터베이스)에서 실제 화면을 단계마다 찍어 `assets/guide/<영상>/NN.webp` 와 `guide-data.js` 를 만들어요 (강사 PC 1280×800 · 수강생 휴대폰 390×844, 실명은 찍기 전에 가려요). 화면이 바뀌면 그 파일의 단계(누를 곳 · 자막)만 고치고 `node scripts/guide-capture.js 4480 [영상 id]` 로 다시 찍어요. 운영 데이터베이스에는 절대 돌리지 마세요. 재생기는 `guide.js` · `guide.css`.
- **두잉고 첫 화면에서 들어가기 (2026-11-02)**: ‘3가지 보기’ 아래 검은 띠 ‘사용법 영상 · 이제 고민하지 마시고, 바로 시작하세요’를 누르면 `/doinggo/guide`. 바닥은 왼쪽 ‘사용법 영상’ 버튼 하나만 두고, ‘바로가기’ 칸의 ‘사용법 영상 · 강사 / 수강생’ 링크는 뺐어요. 마지막 문의 영역(‘다음 기수부터, 두잉고로 운영해 보세요’)에는 ‘입점 문의하기’ 옆에 흰 바탕 · 검정 글씨 **회사소개서** 버튼(DocSend `https://docsend.com/view/v7hxrurp8thb6qgf`, 새 창 — 주소는 `home.js` `DECK_URL`).

## DOOGO CLASS 전용 강사 이름 · 사진 (두잉고 초이 → DOOGO CLASS 유나)

- 초이 강사는 아직 DOOGO CLASS 정식 계약 전이라, **스토어(테스트 클래스)에서는 ‘유나’**로 보여요. 사진은 AI로 만든 가상 인물(`assets/vod/yuna-profile-v4.webp`, 800×1000 투명 배경 · 흰 블라우스 · 오른쪽을 보는 허리 위 상반신 — 다른 강사 사진(갓농부 · 부알남)과 머리 크기 · 비율을 맞췄어요. 초이 얼굴을 닮게 만들지는 않았어요). **두잉고(강사 플랫폼 · 강사 카드 · 강사 소개 · 무료강의 페이지)는 초이 이름 · 사진 그대로**예요. 강의 내용은 그대로예요.
- 구조: `vod.js`의 `STORE_AS = { choi: { name, slug, photo, field } }` — 두잉고 강사 계정(iid `choi`)은 그대로 두고 스토어에서만 이름 · 사진 · 분야를 바꿔 보여요. 스토어는 이 강사의 두잉고 SNS · 경력 · 두잉고 무료강의/기수 페이지 링크 · ‘두잉고 기수 강의’ 안내를 쓰지 않아요. 강사 페이지 주소는 `#/vod/teachers/yuna`(예전 `…/choi` 주소도 열려요). 다른 강사도 같은 방식으로 이름 · 사진을 따로 둘 수 있어요(`STORE_AS`에 한 줄).
- 마스터 › DOOGO CLASS 화면(클래스 · 정산 비율 · 광고비 · 회원 태그 · 판매 순위)도 유나로 보여요. 클래스 편집의 ‘연결된 두잉고 강사’ 칸은 `유나 · 두잉고 초이 (로그인 이름)`처럼 함께 보여요(정산은 두잉고 계정 기준 그대로).
- 운영 데이터: 일회성 작업 `2026-11-01-store-choi-to-yuna` 가 스토어 데이터(상품 강사 이름 · 분야 ‘AI 굿즈 크리에이터’ · 소개의 ‘긱스쿨’ 문구 · 무료 LIVE 이름 · 배너 · 회원 태그 ‘유나 팬’) · 결제 가격표 · 주문 상품 이름 · 회원 태그를 바꿔요. 두잉고 강사 계정(`ins:choi`) · 콘텐츠(`content:choi`)는 건드리지 않고, ‘초이스’ 같은 다른 낱말도 그대로. 예전 데이터를 가진 브라우저는 화면이 같은 일을 한 번 해요(v22).

## 종이책 판매 · 배송 (스토어 ‘전자책’ 메뉴 · 마스터 › 종이책 주문 · 배송)

교보문고 주문 · 배송 방식(주문접수 → 결제완료 → 상품준비중 → 배송중 → 배송완료, 받은 뒤 반품 · 교환)을 작게 옮겼어요.

- **상품 종류 ‘종이책’**: 마스터 › VOD 클래스 관리 › 클래스 편집 › 상품 종류에서 ‘종이책’을 고르면 저자 · 출판사 · 쪽수 · 판형 · 출간일 · ISBN · **배송비**(주문마다 한 번, 0원이면 무료배송) · **재고**(비우면 제한 없음) · **표지 이미지** 칸이 열려요. 스토어 ‘전자책’ 메뉴 · 홈 전자책 줄에 전자책보다 먼저 보이고, 카드 · 상세 맨 위에는 표지 사진을 책으로 세워 보여요.
- **도서정가제**: 종이책 할인가는 정가의 90% 이상만 저장돼요(최대 10%). 종이책에는 쿠폰이 적용되지 않고(서버도 같은 규칙으로 금액을 다시 계산), 포인트는 결제 수단이라 쓸 수 있어요.
- **결제**: 수량(한 번에 10권까지 · 남은 재고까지) · 배송지(받는 분 · 휴대폰 · 우편번호 · 주소 · 상세 주소 · 배송 요청사항)를 받아요. ‘주소 찾기’는 다음(카카오) 우편번호 서비스를 화면 안에 열고, 불러오지 못하면 직접 적어요. 배송지 아래에 ‘택배사에 받는 분 정보를 전달(개인정보 처리 위탁)’ 안내가 있어요. 금액 = 판매가 × 수량 + 배송비 − 포인트.
- **현금영수증 (무통장 입금)**: 결제 화면에서 신청 안 함 · 소득공제용(휴대폰 번호) · 지출증빙용(사업자등록번호 10자리)을 골라요. 서버가 번호를 확인해 주문에 남기고, 마스터 주문 카드 · 주문 상세 · 주문 엑셀에 보여요. 홈택스(또는 PG)에서 발급한 뒤 카드의 ‘발급 완료로 표시’를 누르면 회원 화면에도 ‘발급 완료’로 보여요.
- **마스터 › 종이책 주문 · 배송**: 탭 순서 **입금 대기 → 신규 주문 → 배송 준비 → 배송 중 → 배송 완료 → 취소 · 반품 · 교환 → 전체**(휴대폰은 한 줄로 옆으로 넘겨요). 메뉴 숫자 = 처리할 주문(입금 대기 · 신규 · 배송 준비 · 요청).
  - 입금 대기: 입금자명 · 금액 · 기한을 보고 **입금 확인**(한 건 · 고른 여러 건) → 신규 주문으로. 기한 지난 주문은 한 번에 취소. 자동 입금 확인(페이액션)을 연결하면 이름 · 금액이 맞을 때 저절로 넘어가요.
  - 신규 주문: **택배 접수용 엑셀(.xlsx)** 을 내려받으면(주문번호 · 받는분 · 전화 · 우편번호 · 주소 · 품목 · 수량 · 배송메세지 + 빈 택배사 · 송장번호 칸) ‘배송 준비로 옮길까요?’를 물어요. 한 건씩 ‘배송 준비로’ · 카드에서 송장 넣고 발송도 돼요.
  - **송장 엑셀 올리기**: 택배사에서 받은 송장 파일(.xlsx · .csv) 또는 택배 접수용 엑셀의 송장번호 칸을 채운 파일을 올리면 ‘주문번호(고객주문번호)’ · ‘송장번호(운송장번호)’ · ‘택배사’ 칸을 찾아 맞춰요. 미리보기에서 반영할 줄과 건너뛸 줄(없는 주문 · 취소된 주문 · 입금 대기 · 송장 없음 · 이미 보냄 · 요청 처리 중)을 보여 주고 확인을 누르면 한 번에 ‘배송 중’. 송장의 ‘-’는 빼고, ‘우체국’ · ‘대한통운’ 같은 이름도 택배사로 맞춰요. 엑셀은 라이브러리 없이 브라우저에서 만들고(.xlsx · 머리글 고정 · 우편번호 · 전화 · 주문번호는 글자로) 읽어요(크롬 · 엣지 · 사파리 최신).
  - 배송 중 → 직접(한 건 · 여러 건) 또는 보낸 날부터 정한 날(기본 3일)이 지나면 자동으로 배송 완료.
  - **주문 엑셀**: 지금 탭(또는 고른 주문)의 주문 · 결제 · 받는 분 · 송장 · 취소 · 반품 · 교환 · 환불 금액 · 현금영수증을 한 파일로.
- **취소 · 반품 · 교환** (교보문고 규칙): 결제 완료면 회원이 바로 전액 취소 · 배송지 변경. 배송 준비부터는 ‘취소 요청’, 보낸 뒤에는 ‘반품 · 교환 신청’(반품 · 환불 / 같은 책으로 교환). 단순 변심 반품은 받은 날부터 7일 안 · 왕복 배송비(배송 설정)를 빼고 환불, 파손 · 파본 · 잘못 보낸 책은 30일 안 · 전액 환불 또는 교환. 단순 변심으로는 교환을 받지 않아요. 무통장 결제는 환불 계좌를 함께 받아요.
  - 마스터 ‘취소 · 반품 · 교환’ 탭: 취소 요청 → **취소 승인 · 환불**(전액) / 반품 요청 → **승인 · 수거 요청**(택배사 반품 접수 · 회수 송장 저장) → **책이 도착했어요 · 환불**(단순 변심이면 왕복 배송비를 뺀 금액 추천) / 교환 요청 → 승인 · 수거 → **교환 상품 보내기**(새 송장 · 다시 배송 중) / **반려**(사유를 고르거나 적으면 회원 화면에 보이고, 회원은 다시 신청할 수 있어요). 요청이 있는 주문은 송장 칸을 막아요.
  - 주문 문서: 회원 요청은 `refundReq{kind: cancel|return|exchange, why, text, acct}`, 승인 뒤 처리는 `claim{k, st: pick|done|no, rinv(회수 송장), oinv(교환 송장), note(반려 사유)}`. 서버는 배송 상태로 요청 종류를 정하고(보내기 전 = 취소), 수거 중에는 새 요청을 받지 않고, 회원은 `claim` · 현금영수증 발급 표시를 바꿀 수 없어요. 종이책 요청은 ‘환불 · 취소 관리’ 대신 이 화면에서 처리해요(대시보드 할 일에도 떠요).
- **회원 마이페이지**: 홈 맨 위 **주문 · 배송 조회**(입금 대기 · 결제 완료 · 상품 준비 중 · 배송 중 · 배송 완료 건수 + 취소 · 반품 · 교환), 프로필의 ‘배송중’ 숫자, **종이책 · 배송 조회**(단계별로 거르기 · 입금 대기면 입금 계좌 · 입금자명 · 금액 · 기한 · 단계 · 송장 · 배송 조회 · 요청 진행 · 회수 송장 · 반품 보낼 곳 · 환불 결과 · 현금영수증). 주문 내역에는 ‘종이책 n권’이 한 번만 보여요.
- **정산 · 매출**: 종이책은 정산 비율 종류 ‘종이책’(비우면 전자책 비율)으로 따로 정해요. 정산 기준은 책 값(배송비 제외)이고, 매출 리포트 · 판매 순위 · 강사 정산 달력에 ‘종이책’으로 따로 잡혀요. 판매 수는 권수로 세요.
- **강사 노출을 꺼 둔 강사의 상품**: 강의는 숨겨 두고 이 상품만 스토어에 보이고 싶으면 클래스 편집의 ‘이 상품만은 스토어에 보이기’를 켜요(문대표 종이책이 이 설정으로 보여요).
- **문대표 종이책**: 『내 인생의 추월차선은 내가 만든다』(OOO 지음 · 청춘미디어 · 15,900원 · 무료배송 · 재고 제한 없음). 표지 · 앞뒤 표지 · 펼침면 이미지는 `assets/vod/book/`. 운영 서버에는 배포할 때 일회성 작업 `2026-10-30-moon-paper-book`이 상품 · 가격표 · 배송 설정을 비어 있을 때만 넣어요(`api/_lib/books.js`). 쪽수 · ISBN · 출간일은 정해지면 클래스 편집에서 채워 주세요.

## 전자책 내려받기

- 전자책은 결제 후 마이페이지 › 전자책(또는 상세의 ‘전자책 열기’)에서 **PDF로 내려받아 평생 소장**해요(화면 안에서 읽는 뷰어는 없어요). 산 회원에게만 파일 주소가 보내져요(서버가 다른 사람에게는 주소를 지워서 보내요).
- 파일 올리기: 클래스 편집 › 전자책의 ‘PDF 파일 올리기’(정식 서버 3MB · 그 클래스를 산 회원만 받는 파일)로 올리거나, 더 큰 파일은 구글 드라이브 · 드롭박스 공유 링크를 ‘내려받기 파일 주소’에 넣어요(공유 링크는 링크를 아는 누구나 열 수 있으니 서버 파일을 권해요).
- 내려받으면 주문에 ‘내려받음’이 남고 그 뒤에는 바로 취소(100% 환불)가 막혀요(전자상거래법 제17조 제2항 제5호). 버튼을 거치지 않고 파일 주소로 받아도 서버가 기록해요.

## 주차는 강의일 5일 전부터 열려요 · 강사센터 커리큘럼은 지금 기수가 쓰는 것부터 (2026-11-09)

- **주차 열림**: 수강생 강의실에서 주차(강의 · 과제)가 **그 주 강의일 5일 전부터** 열려요 — 예: 3기 1주차 강의 11/21(토) → **11/16(월)부터**(강의일 포함 6일 전), 2주차 11/22 → 11/17, 3주차 12/5 → 11/30, 4주차 12/12 → 12/7. 예전에는 주차 시작일(기수 시작일 + 7일씩)에 열려서, 첫 강의일을 시작일로 둔 3기는 강의 당일에야 1주차가 열렸어요. 원래 더 일찍 열리던 주차(예: 월요일 시작 · 일요일 강의)는 그대로 일찍 열려요 — 지금 보이는 주차가 늦어지는 일은 없어요. ‘N일부터 강의 내용이 공개됩니다’ · ‘N일에 1주차가 열려요’ · 과제 제출 기간 시작 · 강사센터 기수 주차 줄도 그 날로 보여요. 과제 마감 · 이번 주차 · ‘N주차 무슨 요일’ 일정은 예전 그대로. 체험(테스트) 계정은 예전처럼 모든 주차가 열려 있고, 강사 ‘수강생 화면’ 미리보기는 실제 일정 그대로예요. 계산은 `shared/schedule.js weekUnlock`(OPEN_BEFORE = 5) · 강의실 `app.js openOf`.
- **강사센터 커리큘럼**: 커리큘럼이 여러 개면(예: 1·2기 ‘5주 기본 과정’ · 3기 다른 커리큘럼) 예전에는 늘 기본 커리큘럼이 열려서, 3기는 다른 커리큘럼을 쓰는데 기본 커리큘럼을 고치고 ‘수강생 화면에 안 바뀐다’ 고 느꼈어요 → 이제 처음엔 **지금 기수(진행 중 → 모집 중)가 쓰는 커리큘럼**이 열리고, 다른 커리큘럼을 고르면 위에 ‘지금 3기(모집 중) 수강생 화면에는 ‘…’ 커리큘럼이 보여요. 여기서 고친 내용은 1기 · 2기 수강생 화면에만 보여요’ 안내와 **‘… 고치기’**(바로 그 커리큘럼으로) · **‘3기가 이 커리큘럼 쓰기’**(3기 설계 창을 이 커리큘럼으로 골라 둔 채 열기 — 저장해야 바뀌어요) 버튼이 떠요. 과제 화면도 같은 줄.
- 상시 e2e `reactdg` 1-8(커리큘럼 기본값 · 안내 · 설계 창 · 돌아가기) · 1-9(강사 ‘수강생 화면’ + 브라우저 시계: 3기 1주차 11/15 잠김 ‘11/16부터 공개’ → 11/16 열림 · 예전 화면 = React).

## 두잉고 영상 비메오 (2026-11-09 · 강의 · 라이브 다시보기 · 응원 영상 · 자료실 · 추가 메뉴)

- **강사센터**: 강의 수정 · 라이브 다시보기 · 응원 영상 · 자료실 영상 · 추가 메뉴의 영상 칸이 **‘영상 주소 (유튜브 · 비메오)’** — 유튜브 주소처럼 비메오 주소(`https://vimeo.com/1244973319`, 일부 공개 `vimeo.com/숫자/해시`, `player.vimeo.com/video/숫자?h=…`)를 그대로 붙여 넣으면 돼요. 예전에는 유튜브만 받아서 비메오 주소를 넣으면 ‘유튜브 주소를 확인해 주세요’ 가 떴어요. 잘못된 주소는 ‘영상 주소를 확인해 주세요 … 비메오(vimeo.com/…) 주소만 돼요’ 로 알려 줘요. 목록에는 ‘영상 연결됨’ 이 보이고, 길이(분)는 실제 영상 길이로 자동으로 채워져요(아래 ‘영상 실제 길이’ — 비메오 oEmbed).
- **저장 모양**: 칸 이름은 예전 그대로 `youtubeId` — 유튜브는 11자리 ID, 비메오는 주소 `https://vimeo.com/숫자[/해시]` (`DB.vidVal`). 수강생 화면은 `DB.vimeoSrc` 로 비메오 재생기 주소(`player.vimeo.com/video/숫자?h=해시&title=0&byline=0&portrait=0&dnt=1`)를 만들어요. 공개 데이터(결제 전 방문자)에는 예전처럼 영상 칸이 빠져요(`access.js` 강의는 정한 칸만).
- **수강생 화면**: 주차별 강의 · 라이브 다시보기 · 자료실 글 · 추가 메뉴에서 비메오 영상은 유튜브와 같은 카드(대표 그림 없이 · 제목 · ▶ · ‘비메오에서 보기’ · 실제 길이)로 보이고, 누르면 **그 자리에서 비메오 재생기**가 돌아요(‘재생이 안 되면 비메오에서 보기’ 링크도). 응원 영상은 고르면 바로 재생. 예전 화면 `app.js video · vmFrame` · React `ui/dg/bits.jsx Video · VmFrame` 같은 모양.
- **비메오 영상 설정**: 비메오에서 영상의 **퍼가기(임베드)를 허용**해야 재생돼요(‘어디서나’ 또는 퍼가기 허용 도메인에 www.doogoclass.com). 비공개(비밀번호 · 나만 보기) 영상은 재생되지 않을 수 있어요.
- **같이 고친 것**: 뉴질랜드 테마(문대표)의 영상 카드가 `position: relative` 때문에 위쪽 글자 높이만큼만 차고 아래가 비어 보였어요 → 기본처럼 영상 칸 전체를 채워요(유튜브 썸네일 카드도).
- 상시 e2e: `reactdg` 1-8 — 강사센터에서 비메오 주소 저장(잘못된 주소 안내 · 다시 열면 그 주소 · ‘영상 연결됨’) → 수강생 강의 화면 비메오 카드(예전 화면 = React · PC · 휴대폰) → 누르면 비메오 재생기(시험 환경은 가짜 재생기) → 원래 값으로 되돌리기.

## 영상 실제 길이 (비메오 · 유튜브)

- 강의 · 다시보기 · 응원 영상 · 영상 자료의 길이를 적어 둔 분이 아니라 **영상의 실제 재생 시간**(24:30 · 1:02:03)으로 보여 줘요. `DB.vdur` 가 영상 주소를 모아 `api/public` 의 `vdur` 에 묻고, 서버는 비메오 oEmbed(우리 도메인 Referer — 퍼가기 허용 도메인 영상도) · 유튜브(`YOUTUBE_API_KEY` 가 있으면 Data API, 없으면 영상 페이지의 재생 시간)로 받아 서버 문서 `vdur` 에 기억해요(못 찾은 영상은 하루 뒤 다시).
- 마스터 · 강사(코치)가 강사센터를 열면, 영상은 있는데 길이가 없거나 영상이 바뀐 강의에 실제 길이(`durSec`)를 조용히 저장하고 분 칸도 맞춰요. 그래서 결제 전이라 영상 주소가 가려진 방문자에게도 상세 페이지 커리큘럼 · 총 시간이 실제 길이로 보여요. 길이를 아직 모르면 적어 둔 분을 그대로 보여 줘요.
- Vercel 환경 변수(선택): `YOUTUBE_API_KEY` — 구글 클라우드 콘솔에서 ‘YouTube Data API v3’ 키를 만들어 넣으면 유튜브 길이를 더 안정적으로 받아요.

## 분석 · 마케팅 도구 · 기술 표시 (Wappalyzer)

Wappalyzer 같은 기술 탐지 도구는 **페이지가 실제로 불러오는 것**만 보여 줘요. 그래서 실제로 쓰는 도구만 보이게 했어요(쓰지 않는 기술 이름을 흉내 내지 않아요). 두고커넥트처럼 Next.js · React · Tailwind CSS · Framer Motion · Turbopack 으로 만든 사이트는 그 이름이 뜨지만, 이 사이트는 프레임워크 없이 만든 화면이라 뜨지 않아요. Cloudflare(CDN) · HTTP/3 은 도메인을 Cloudflare 프록시 뒤로 옮겨야 뜨는데, Vercel 앞에 프록시를 두는 건 권하지 않아 하지 않았어요.

- **바로 보이는 것 (배포만 하면)**: 네이버 · 구글 **소유 확인 태그**를 되살렸어요 — 2026-10-31 스토어를 첫 화면으로 올릴 때 `index.html` 머리말에서 실수로 빠졌던 것(네이버 서치어드바이저 · 구글 서치 콘솔 소유 확인이 다시 유지돼요 · Wappalyzer 는 이 태그를 ‘Naver Analytics’로 표시해요). 아이콘에 Lucide 공식 클래스(`lucide`) → **Lucide**. 첫 화면 큰 그림(두잉고 첫 화면 사진 · 스토어 머리글 로고 · 지금 보이는 배너 · 첫 로딩 로고)에 `fetchpriority="high"` → **Priority Hints**(먼저 받아 첫 화면이 빨리 떠요). 두잉고 바닥 · 스토어 머리글의 운영팀 **카카오톡 상담** 링크(새 창) → **Kakao**. 그 밖에 Google Font API · Open Graph · Vercel(서버 응답 머리글로 — 새로 고침(Ctrl+Shift+R)한 화면에서 보여요).
- **ID 를 넣으면 켜지는 것 (마스터 › 첫 화면 · 사업자 정보 › 분석 · 마케팅 도구)**: 네이버 애널리틱스 사이트 ID(wcslog.js — 실제 방문 통계), Google 애널리틱스 4 측정 ID(gtag.js → Google Analytics · Google Tag Manager), 메타 픽셀 ID(fbevents.js → Facebook Pixel · 광고 성과), Cloudflare 웹 분석 토큰(beacon — 도메인을 옮기지 않아도 돼요, 쿠키 없음), 카카오 JavaScript 키(카카오 공식 SDK 2.8.3 · integrity 고정 → Kakao 버전 표시 · ‘카카오톡 상담’ 링크를 카카오톡 채널 채팅으로 바로 열어요, 카카오 디벨로퍼스 › 플랫폼 › Web 사이트 도메인에 doogoclass.com 등록 필요), Vercel 웹 분석 켜기(Vercel 대시보드 › Analytics 에서 먼저 Enable). 값은 정해진 모양만 저장돼요(아니면 ‘모양을 확인해 주세요’) — 스크립트 주소에 들어가는 값이라 불러올 때 한 번 더 검사해요. 빈 칸 도구는 불러오지 않아요.
- **어디서 · 언제**: 정식 주소(doogoclass.com)에서만 불러요(미리보기 · 내 컴퓨터는 `localStorage dc:tags = "1"` 일 때만 — 확인용). 강사센터 · 마스터 · 파트너 · 온드미디어 화면(`#/center…`)은 처음 연 화면이면 불러오지 않고 페이지뷰도 보내지 않아요. 화면을 옮길 때마다 GA4 `page_view` · 메타 `PageView` · 네이버 `wcs_do()` 를 한 번씩(같은 주소는 한 번만), Cloudflare(spa) · Vercel 은 스스로 세요.
- **개인정보처리방침**: ‘9. 쿠키 등 자동 수집 장치’의 `[[분석도구]]` 자리가 켠 도구 목록으로 바뀌어요(`legal.js` → `tags.js` `lines()`). 아무것도 안 켰으면 예전 문장(‘광고나 행태 분석 목적의 제3자 쿠키는 사용하지 않습니다’) 그대로, 네이버 · GA · 메타 픽셀을 켜면 도구 · 목적 · 수집 항목 · 해외 처리 · 거부 방법을 보여 줘요. 광고 · 행태 분석 도구를 켜기 전에 문구를 한 번 검토해 주세요.
- **검색 · 공유 문구 (2026-11-02)**: 제목 ‘배움이 기회가 되는 곳, 두고클래스 | 온라인 클래스’ · 설명 ‘새로운 배움이 새로운 기회가 되는 곳! …’ — `index.html` 머리말(title · description · og · twitter · 구조화 데이터 · 검색 로봇용 본문)과 스토어 첫 화면 탭 제목(`vod.js` `document.title`)을 함께 바꿔요. 클래스 상세 · 약관 화면은 각자 제목 그대로. 바꾼 뒤 네이버 서치어드바이저 ‘웹 페이지 수집 요청’ · 구글 서치 콘솔 ‘URL 검사 → 색인 생성 요청’ · 카카오 공유 디버거(캐시 초기화)를 쓰면 더 빨리 반영돼요.
- **공유 이미지 (2026-11-02)**: `assets/home/og-doogoclass.jpg`(1200×630) — 카카오톡 · 페이스북 미리보기는 보통 300~500px 너비로 줄어 보여서 작은 글씨(28px 이하)는 읽히지 않아요. 그래서 로고 · 큰 제목 ‘돈 되는 노하우, **두고클래스**에서’(112px · 아주 굵게) · 보조 문구 한 줄 ‘VOD · 전자책 · LIVE까지 한곳에서’(48px)만 남기고, 작은 이름표 · 두 번째 줄 · 아래 칩 3개는 뺐어요(오른쪽 빨간 원 · 아이콘 9칸은 그대로). 예전 이미지는 글꼴 이름이 달라(`Pretendard` ↔ 실제 이름 `Pretendard Variable`) 기본 글꼴로 찍혀 제목이 얇았어요. 다시 만들 때는 `node scripts/og-image.js`(playwright — 이 폴더를 잠깐 띄워 같은 주소에서 글꼴을 불러오고, 글꼴을 못 불러오면 찍지 않고 멈춰요). 이미지를 바꾸면 `index.html` 의 og:image · og:image:secure_url · twitter:image 끝 `?v=` 숫자도 바꿔요(지금 `?v=20261102`) — 그래야 카카오톡 · 페이스북이 예전 이미지 대신 새 이미지를 가져가요. 이미 공유된 링크는 카카오 공유 디버거(developers.kakao.com/tool/debugger/sharing) · 페이스북 공유 디버거에서 ‘캐시 초기화’ · ‘다시 가져오기’를 누르면 바로 바뀌어요.

## 온드미디어 RS (YouTube 채널 팀 · 홍보 링크 · RS 정산)

회사소개서 정산 구조 그대로예요: **YouTube 링크로 산 주문만** RS · 구독자 10만 이상 **20%** · 미만 **10%** · 자연 유입 0% · RS = (링크 구매 매출 − 환불) × (1 − PG 5%) × RS율 · 정산 전에 먼저 빼고 남은 금액을 강사 : 두고클래스가 나눠요 · 매월 1일~말일 판매분을 다음 달 10일 지급.

- **계정 (마스터 › DOOGO CLASS › 온드미디어 RS › 온드미디어 계정)**: 마스터가 직접 만들어요 — 아이디 · 비밀번호 · YouTube 채널 이름 · 팀 · 채널 주소 · 구독자 수 · RS율 직접 정하기(비우면 구독자 수로 자동) · 링크 코드(자동 6자리, 판매가 생기면 잠김) · 연락처 · 개인/사업자 · 정산 계좌 · 운영 메모. 채널(팀)마다 계정 하나 → 계정마다 링크 코드가 달라서 **VOD마다 고유한 홍보 링크**가 생겨요(채널 10개면 계정 10개 · 링크 VOD × 10개). 아이디는 운영자 · 파트너 · 온드미디어끼리 겹치지 않게 막아요. 중지하면 바로 로그인이 막히고 그 링크로 새로 산 주문엔 RS가 붙지 않아요(쌓인 RS · 정산은 그대로). 위쪽 ‘RS 기준’에서 높은 % · 낮은 % · 구독자 기준 · 링크 유효 기간(기본 30일) · PG 공제(기본 5%)를 바꿔요(`meta.vod.settings.rs`, 그때부터 결제한 주문에 적용).
- **비밀번호**: 서버에는 **scrypt 해시로만** 저장하고 누구에게도(마스터 포함) 보내지 않아요(마스터 화면은 ‘설정됨’만, 잊으면 ‘수정’에서 새 비밀번호). 마스터 화면이 새 비밀번호를 `pw` 칸에 담아 보내면 저장할 때 해시로 바꾸고, 화면이 모르는 해시는 서버 값을 지켜요(`api/_lib/media.js` `fixMaster`). 마스터처럼 한글 자판으로 친 비밀번호와 같은 자리 영문 글자를 같게 받아요.
- **첫 계정 doogomd**: 저장소가 공개라 비밀번호를 코드 · 설명서에 두지 않아요. Vercel 환경 변수 **`MEDIA_INIT_PW`** 가 있으면 배포 때 일회성 작업 `2026-11-01-media-doogomd` 가 `doogomd` 계정(두고미디어 YouTube · 주식회사 두고미디어 · 사업자)을 그 비밀번호의 해시로 만들어요. 환경 변수가 없으면 대기 목록에도 넣지 않고(`when`) 넣은 뒤 배포 때 돌아요. 이미 doogomd 가 있으면 건드리지 않아요. 만든 뒤에는 환경 변수를 지워도 돼요.
- **로그인**: 로그인 화면 ‘마스터 · 파트너’ 탭에서 아이디 + 비밀번호 → **온드미디어 센터**(`#/center/media`, 쿠키 `dc_a` `{ r: "media", md }`). 메뉴: 대시보드(이번 달 판매 · 잠정 RS · 다음 지급 · 누적 지급 · 최근 6개월 막대 · 최근 판매) · **내 홍보 링크**(VOD별 링크 복사 · 열기 · 전체 복사 · 강의 찾기 · 링크별 판매 수 · RS) · **판매 달력**(날짜별 판매 수 · RS · 지급일 칸 · 날짜 누르면 주문) · 판매 내역(기간 탭 · CSV) · **RS 정산 · 지급**(월별 명세 · 명세서) · RS 안내 · 내 정보 · 정산 계좌(개인/사업자 · 은행 · 계좌 · 예금주 · 연락처 · 이메일 · 비밀번호 바꾸기).
- **볼 수 있는 범위** (`access.js` · `vodaccess.js` · `media.js`): 온드미디어는 meta 에서 자기 계정(비밀번호 · 운영 메모 빼고)과 자기 RS 지급 기록만, 주문은 **자기 링크로 들어온 주문만** 판매 · RS 칸(상품 · 판매가 · 상태 · 결제일 · 환불 · rs)으로 받아요 — 회원 · 연락처 · 결제 수단 · 쿠폰 · 강사 비율은 안 보여요. 고칠 수 있는 건 자기 연락처 · 계좌 · 사업자 정보 · 비밀번호뿐(RS율 · 링크 코드 · 채널 · 상태는 서버가 되돌려요). 파트너 · 온드미디어 화면은 meta 를 통째로 보내요(자기 계정만 보이는 목록이라 칸 번호가 서버와 달라서) — 서버는 자기 계정의 허락된 칸만 골라 받아요.
- **링크 추적**: 홍보 링크 `https://www.doogoclass.com/vod/p/<상품>?rs=<코드>` 로 들어오면 브라우저에 상품마다 `{ 코드, 누른 때 }`(`dc:rs`, 같은 상품은 마지막 링크가 이겨요)를 남기고, 주소의 `rs` 는 지우지 않아요(유튜브 앱 안 브라우저 → 다른 브라우저로 열기에도 이어지게). 그 상품을 기간 안에 **수강권으로** 결제하면 결제 준비(`api/vod-pay` prepare)에 함께 보내고, 서버가 코드(사용 중 계정) · 상품 · 기간 · 시각을 다시 확인해 주문에 `rs { mid, code, ch, rate, pg, at }` 를 남겨요. 종이책 · 무료 · 1:1 코칭권 · TEA TIME · 연장권 · 다른 강의 링크 · 기간 지난 링크는 RS 없음.
- **정산 계산** (`vod.js` `rsOf` · `insAmt`): RS = 판매가 × (1 − 주문에 남은 PG%) × 주문에 남은 RS% (10원 아래 버림 · 부분 환불은 남은 비율만큼). **강사 정산액 = (판매가 − RS) × 강사 비율**(공급가액 방식이면 RS 도 ÷ 1.1). RS% 는 결제한 때 값이 주문에 남아 나중에 구독자 수 · 기준을 바꿔도 지난 주문은 그대로예요. 예: 65,000원 VOD · RS 20% → RS 12,350원 · 강사 (65,000 − 12,350) × 50% = 26,320원.
- **마스터 › 채널 성과 · 홍보 링크**: 기간(이번 달 · 지난달 · 3개월 · 올해 · 전체)별 채널 순위(판매 · 판매가 · RS · 많이 판 VOD) · VOD별 채널 판매 · **홍보 링크 찾기**(채널을 고르면 VOD별 링크, VOD를 고르면 채널별 링크) · 링크 판매 CSV. **RS 정산**: 판매 월마다 채널별 명세(판매 · 판매가 · RS · 확정 뒤 환불 차감 · 이월 · 개인 3.3% · 지급액) → 확정(명세 고정 `meta.mdPayouts["<계정>:<YYYY-MM>"]`) → 지급 완료(계좌가 없으면 막아요) · 확정 취소 · 지급 취소. 왼쪽 메뉴 숫자 = 지난달 확정 · 지급할 채널 수.
- **강사 · 마스터 정산 화면**: 강사센터 판매 정산 카드에 ‘온드미디어 RS − 금액(나누기 전에 먼저 빼요)’ 줄, 월별 명세 · 마스터 강사 정산의 판매가 칸 아래 ‘온드 RS − 금액’, ‘온드 RS n’ 표시, 명세서 · 정산 CSV · 판매 내역 · 정산 달력 · 마스터 주문 목록 · 주문 상세에 ‘YouTube <채널> 링크 · RS 20% − 금액’. 매출 리포트의 플랫폼 이익 = 순매출 − 강사 정산 − **온드미디어 RS** − 광고비 − PG 수수료(월별 표 · 손익 CSV에 RS 칸).
- **월별 보기 · 채널 링크 · 기간 조회 (2026-11-02)**: 마스터 › 온드미디어 계정 위 ‹ 2026년 10월 › 로 달을 바꾸면 위 숫자(링크 판매 · RS)와 표의 ‘월’ 칸이 그 달 기준으로 바뀌어요(기본 이번 달 · 다음 달은 못 가요). 채널 칸에는 계정의 **채널 주소**가 YouTube 표시와 함께 링크로 보여요(`@핸들`은 한글로 풀어서 — 예: @돈맛스토리 · 비어 있으면 ‘채널 주소 미입력’), 홍보 링크 창 머리에도 같은 링크. **RS 정산 › 기간 조회**: 시작일 ~ 종료일(달력)과 빠른 선택(이번 달 · 지난달 · 최근 7일 · 최근 30일 · 올해)으로 결제일 기준 채널별 판매 · 판매가 · 환불 · RS 합계, 주문 목록 펼치기, 기간 CSV(`doogoclass-rs-<시작>_<끝>.csv`) — 보기 전용이라 월별 확정 · 지급과는 따로예요(날짜를 거꾸로 넣으면 바로잡아요). 일회성 작업 `2026-11-02-media-doogomd-channel` — doogomd 채널을 YouTube **돈맛스토리**(`https://www.youtube.com/@돈맛스토리`)로(채널 주소가 비어 있거나 채널 이름이 첫 계정 기본값 ‘두고미디어 YouTube’ 그대로일 때만, 팀 이름 ‘두고미디어’는 그대로). 새로 만드는 첫 계정도 이 채널로 만들어요.
- **시안(서버 없음)**: 예시 계정 2개(아이디 media · media2, 비밀번호는 아이디와 같음)와 예시 주문 몇 건에 링크 표시를 브라우저에만 만들어요(정식 서버에서는 만들지 않아요).
- **테스트**: `node scripts/media-test.js`(61개 — 해시 저장 · 로그인 · 범위 · RS 기록 조건 · 자기 정보 고치기 · 중지 · 규칙 변경 · 일회성 작업 · 파트너 저장).

## 2026-11 수강권 6 · 12개월 · 재수강 할인 · 최신성 업데이트 · 두고 파트너스

- **수강권 (6개월 · 12개월)**: 수강권은 6개월(180일) · 12개월(365일) 두 가지예요. 예전 3년 수강권 · 1년 연장권은 더 팔지 않아요(이미 산 주문은 그대로 유효). 상세 · 아래 구매 막대는 **‘월 X원’을 크게, ‘12개월 · 총 X원’을 작게** 보여요(탈잉처럼 월 가격 + 총액은 늘 함께). 운영 데이터의 FAQ 예전 문구 · 재수강 기본값은 일회성 작업 `2026-11-03-plans-6-12-rebuy` 가 배포 때 맞춰요.
- **재수강 할인 (자동 40%)**: 수강 기간이 **끝난** 회원이 같은 강의를 다시 사면 수강권 가격에서 자동으로 40% 빠져요 — 마스터 › DOOGO CLASS › 전시 · 쿠폰 · 설정 › ‘재수강 할인’에서 켜고 끄기 · % 바꾸기. 금액은 서버가 다시 계산해요(`api/_lib/vodprice.js` `rebuyFor`). 쿠폰과는 함께 못 쓰고 포인트는 써요. 주문에 `rebuy: { pct, was }` 가 남고 **정산 기준(sale)이 할인가**라서 강사 몫도 할인가 기준이에요(기본 5:5면 할인도 플랫폼 · 강사가 반씩). 마스터 주문 · 강사센터 판매 정산 · 정산 달력에 **‘재결제(재수강)’** 표시.
- **최신성 업데이트**: 마스터 › VOD 클래스 관리 · 강사센터 › 내 VOD · VOD 강의 · 수업 자료의 **‘최신성 업데이트’** → 다시 찍은 강의는 UPDATE, 새 강의는 파트마다 NEW(새 영상 링크도 여기서). 저장하면 상세 해시태그 아래에 **‘2026년 11월에 최신 내용으로 업데이트된 강의예요’** 띠, 커리큘럼 · 두잉고 강의실에 **NEW · UPDATE** 배지(1년)가 붙어요. 강사는 자기 클래스 기록만 저장돼요(`vodaccess.js` `cleanUpds`).
- **업데이트 알림톡**: 산 회원을 **수강 중 · 수강 끝남**으로 나눠 서로 다른 템플릿으로 보내요(`/api/vod-pay` `updNotify` · `api/_lib/vodupd.js`, 보낸 기록 `vupd` — 같은 업데이트를 다시 눌러도 받은 회원은 빼요). 템플릿 변수 `#{이름}` `#{강의명}` `#{업데이트월}` `#{업데이트}` `#{링크}`. **지금 운영 서버는 솔라피 키가 없어 ‘연결 전’ — 대상 수만 기록**해요. 카카오 템플릿 승인 → 마스터 › 메시지 · 자동화 › 채널 · 발송 규칙에서 ‘업데이트 알림’ 템플릿(수강 중 · 수강 끝남)을 고른 뒤 업데이트 기록의 ‘다시 보내기’.
- **상세 탭 4개**: 클래스 소개 · 커리큘럼 · 후기 · 이용 안내 (강사 소개는 소개 끝 · 수강권 앞). 강사 카드는 **클래스 수만**(수강생 수는 안 보여요).
- **PC 전체 카테고리 펼침 메뉴**: 머리띠 ‘전체 카테고리’를 누르면 아래로 넓은 창 — 왼쪽 분야(마우스를 올리면 바뀜) · 가운데 종류별 바로가기 + 인기 클래스 6개 · 오른쪽 바로가기 + 두고 파트너스. 바깥 · Esc · 페이지 이동이면 닫혀요. 1023px 이하(휴대폰 · 태블릿)는 예전 ‘전체 메뉴’.
- **두고 파트너스 (강사 모집 팝업 대신)**: 머리띠 위 줄 **‘두고 파트너스’ + 말풍선 ‘파트너 강사로 지원하기’**(PC), 소개 `/vod/partners` · 지원서 `/vod/partners/apply`(예전 `/vod/recruit` · ‘강사 모집’ 버튼도 여기로). 지원서는 서버 문서 `inq:<id>`(source `partners` · 지원서 칸 `form`, 서버가 칸 이름 · 길이를 정해 받아요)로 **마스터만** 봐요 → **마스터 › DOOGO CLASS › 크리에이터 › 두고 파트너스 지원**(상태 탭 · 메모 · 엑셀 내려받기 · ‘VOD 강사로 등록’). 쓰던 지원서는 그 탭에 잠깐 기억(sessionStorage), 보내면 지워요. 강사 정산 비율은 대외비라 공개 페이지에 쓰지 않아요(상담에서 안내).
- **두고 파트너스 소개 페이지 개편 (2026-11-02)**: 첫 화면은 빨간 바탕 + 캐릭터 **‘두디’**(빨간 D · 베어 문 자국 · 클래퍼보드와 연필, `assets/partners/mascot-hero.webp`)가 톡 튀어나온 뒤 둥실둥실 · 동전 · 재생 · 반짝 · 확성기 소품과 말풍선 칩이 서로 다른 박자로 떠다녀요(바탕 빛 띠도 천천히). 예전 첫 화면 강사 사진은 바로 아래 **‘지금 DOOGO CLASS에서 강의하고 있어요’ — 왼쪽 · 오른쪽 엇갈린 카드**(동그란 사진 · 분야 · 강사 소개 한 줄, 누르면 강사 페이지)로 옮겼고, 화면에 들어오면 양옆에서 미끄러져 들어와요. 이어서 응원하는 두디(`mascot-cheer.webp`) + ‘처음이라 막막해도 괜찮아요. 두고 파트너스가 끝까지 함께해요.’(글자가 한 자씩 새겨지는 첫 화면 제목 움직임). 분야는 첫 화면 ‘다루는 부업’처럼 두 줄이 서로 반대로 흘러요. **자주 묻는 질문은 가운데 정렬**(회색 바탕 · 위에 질문하는 두디 `mascot-faq.webp` · ‘Q.’ · 하나만 열림). **오른쪽 아래 떠 있는 지원 상자**(휴대폰은 아래 메뉴 막대 위 한 줄)는 첫 화면 · 마지막 안내 · 바닥이 보일 때는 숨어요. 기기의 ‘움직임 줄이기’가 켜져 있으면 떠다니는 움직임은 멈춰요. 캐릭터 그림을 바꾸면 `assets/partners/` 의 webp 세 개만 바꾸면 돼요.
- **두고 파트너스 2차 다듬기 (2026-11-02)**
  - **첫 화면 색**: 쨍한 빨강(#ff0037) → 채도를 낮춘 로즈 · 코랄 핑크(`linear-gradient(112deg, #e64f6c, #f0607b, #ff8c9f)`). 글씨가 있는 왼쪽은 조금 진하게(흰 글씨 대비), 캐릭터 쪽은 밝게.
  - **WHY 그림 칸 ‘하나씩 열리기’**: 그림 칸(`.pt-ft-vis[data-rv="open"]`)을 문 두 짝(::before · ::after)이 덮고 있다가 화면에 들어오면 양옆으로 열려요 → 하얀 카드가 튀어 오르고 → 안쪽 항목이 `--k` 순서대로(체크 · 막대 · 꼬리표 · 그래프). 여러 칸이 한꺼번에 보여도 0.45초 간격으로 하나씩(vod.js `motion()`). 칸을 잘라내는(clip-path) 방식은 화면 감지가 안 돼서 쓰지 않아요.
  - **지원서 = 구글폼 형식** (`#/vod/partners/apply`): 머리 그림 → 제목 카드(위 색 띠) → 진행 막대(따라 내려와요) → 섹션 5개를 한 장씩(다음 · 이전, Enter 도 ‘다음’). 질문마다 카드 하나 · 누르고 있는 카드는 왼쪽 색 띠 · 고르기는 동그라미(하나) / 네모(여러 개). ‘다음’에서 그 섹션의 * 질문을 확인하고 빈 카드는 빨갛게. 쓰던 내용 · 보던 섹션은 이 탭에 기억(sessionStorage `dc:pt-draft` · `dc:pt-sec`). 새 질문: 연락받기 편한 시간(`ctime`) · 강사 소개 · 걸어온 길(`career`, 줄바꿈 유지) · 채널 규모(`reach`) · 수강 대상(`target`) · 커리큘럼 초안(`curri`, 줄바꿈 유지) · 촬영 방식(`film`) · 생각하는 판매가(`price`). 서버 `api/public.js` FORM_TXT · FORM_LONG 에 같은 이름 · 길이로만 받아요. 개정 개인정보처리방침(11/10 시행) 선택 항목에도 같은 항목을 적었어요.
  - **마스터 › 두고 파트너스 지원 = 순서대로 처리**: 상태 `new` 새 접수 → `seen` 열람 → `contact` 상담 중 → `done` 계약 완료 / `fail` 계약 안 됨 / `hold` 보류. 첫 탭 ‘처리할 일’(새 접수 · 열람 · 상담 중)은 들어온 순서(오래된 것 먼저)로, 맨 위가 **다음 차례**. 줄(접수 번호 No. · 이름 · 분야 · 주제 · 상태 · 며칠째)을 누르면 지원서가 펼쳐지고 **처음 펼치면 자동 ‘열람’**. 아래 상태 버튼으로 바꾸면 처리 기록(누가 · 언제, `log[].by`)에 남고, 끝내면 ‘다음 차례는 ○○ 님’ 안내. 위 처리 단계 칸(건수)을 누르면 그 상태만. 엑셀에 접수 번호 · 열람 일시 · 마지막 처리 · 새 질문 · 처리 기록까지. 두잉고 ‘강사 입점 문의’도 같은 화면 · 같은 상태를 써요(파트너센터 진행 단계도 5칸: 접수 → 열람 → 상담 → 계약 → 오픈).
  - **저자 · 강사 소개 카드**: 숫자 상자(‘1 클래스’) 대신 이름 오른쪽 검정 알약(아이콘 · 클래스 · 빨강 숫자, 누르면 강사 페이지). 휴대폰은 분야 꼬리표 오른쪽.
  - **바닥 ‘개정 예정’ 빨간 배지 뺌**: 약관 제3조 · 개인정보처리방침 13번(시행 7일 전 화면 공지) 때문에 생긴 표시라 PG 와는 상관없어요. 배지 대신 저작권 줄 위에 회색 안내 한 줄(시행일 11/10 0시에 저절로 사라져요). 약관 · 방침 페이지 맨 위 개정 안내는 그대로.
- **웹 아이콘**: 앱 아이콘 2안 — 흰 바탕 · 빨강 DOOGO / CLASS 두 줄(원본 `assets/brand/app-icon.svg`, 1024 각진 흰 정사각형 · 글자 폭 760). 탭 아이콘은 둥근 흰 사각형에 글자를 크게(폭 900), 안드로이드 maskable 은 동그랗게 잘려도 안전하게 글자 폭 620. `node scripts/web-icons.js` 가 원본에서 `assets/brand/favicon.svg` · `favicon.png` · `apple-touch-icon.png`(180) · `icon-192/512` · `icon-maskable-512` 와 사이트 맨 위 `apple-touch-icon.png` 를 만들고, `manifest.webmanifest` 가 안드로이드 홈 화면 아이콘을 알려요. 아이콘을 바꾸면 `index.html` 아이콘 · manifest 주소와 `manifest.webmanifest` 아이콘 주소의 `?v=` 도 올려 주세요(지금 `20261102b`).
- **휴대폰 아래 구매 막대**: 긴 버튼 문구(재수강 할인 · 입금 대기 등)는 두 줄로, 400px 이하 화면은 미리보기 버튼을 빼서 ‘수강신청 하기’가 잘리지 않아요.
- **테스트**: `node scripts/vod-test.js` 19)~20) — 수강권 · 재수강 할인 금액 · 연장권 거절 · 업데이트 기록 저장 범위 · 알림톡(연결 전 · 템플릿 없음 · 보냄 · 다시 보내기) · 두고 파트너스 지원서 저장 · 칸 정리(구글폼 새 칸 · 줄바꿈 · 길이) · 공개 범위(마스터만).

## 두고클래스 서버 연결 (회원 · 주문 · 결제)

정식 서버에서는 두고클래스 데이터를 문서별로 나눠 저장해요 — 공개 정보(클래스 · 배너 · 쿠폰 설정)는 `meta.vod`, 회원 `vm:` · 주문 `vo:` · 후기 `vr:` · 다짐 `vpl:` · 1:1 문의 `vq:` · 정산 `vpo:` · 숫자 집계 `vstat`. `db.js` 가 화면의 `d.vod` 를 이 문서들로 나누고 합치며, 누가 보고 고칠지는 서버 `api/_lib/vodaccess.js` 가 정해요(유료 강의 영상 · 자료 · LIVE 링크는 산 회원에게만, 회원은 쿠폰 · 포인트 · 주문 상태를 못 고침, 후기 포인트 · 수강생 수 · 찜 수는 서버가). 주문 · 결제 · 환불 · 무통장 · 쿠폰 받기 · 두잉고 강의실 입장은 `api/vod-pay` 로만. 정식 서버에서 처음 만들 때는 시안용 체험 회원 · 주문 · 후기 · 가짜 수강생 수를 빼고 시작해요. 환경 변수(`VOD_SERVER_AUTH=1` · 포트원 · 카카오 · Cloudflare)와 출시 순서는 `scripts/VOD-LAUNCH.md`.

## 다음 단계

1. 실제 운영 전에 체험 계정(강사 · 코치 · 수강생) 정리와 마스터 비밀번호 변경
2. 수강생이 많아지면 강사센터 처음 불러오기를 나눠 받기(지금은 강사 플랫폼 전체를 한 번에 받음)
3. AI 조교: Vercel 환경 변수 `ANTHROPIC_API_KEY` 를 넣으면 Claude로 답해요(모델 이름은 `AI_TUTOR_MODEL`). 키가 없으면 학습 자료에서 찾은 답을 보여 줘요.

- **모바일 최적화**: 360·390px에서 수강생 · 강사센터 · 마스터 · 공개 페이지의 모든 메뉴(햄버거 메뉴로 두 번씩)와 버튼 · 팝업을 점검했습니다. 입력칸 글자 16px(아이폰 확대 방지), 버튼 · 링크 터치 영역 확대, 빵부스러기는 ‘‹ 바로 위 화면’ 한 줄, 공지 제목 두 줄, 휴대폰에서는 화면을 옮기면 AI봇 창이 닫힙니다.
- **로고**: 수강생 화면 · 로그인 · 수료증 · 강의 소개 페이지 왼쪽 위 로고는 검은 바탕에 강사마다 정한 색(기본 정보 · 색상)의 화면 + 재생 버튼입니다.
- **무료강의 대표 영상 · 뉴질랜드 테마 · 한국 시간 (2026-11-01)**: 첫 화면 바로 아래 **대표 영상** 칸(`freeClass.intro.youtube`, 모든 강사 공통 · 강사센터 › 무료강의 페이지 › ‘YouTube 영상’ 탭 맨 위, 비우면 숨김 · 탭의 보임 스위치가 대표 영상 · 좌우 영상을 같이 켜고 꺼요) — 썸네일과 큰 재생 버튼만 먼저 보이고 누르면 그 자리에서 재생돼요. 내용이 그대로면 페이지를 다시 그리지 않아 1초 카운트다운 · 서버 새 소식에도 보던 영상이 끊기지 않아요. **뉴질랜드 테마(문대표)**는 검정 대신 하늘색: 첫 화면 하늘 · 흐르는 흰 구름 · 남알프스 설산 · 초록 언덕 그림, ‘Kia ora! 뉴질랜드에서 인사드려요’ 국기 배지, 포스터 엽서 테두리와 ‘NEW ZEALAND · Aotearoa’ 우표, 첫 화면 아래 짙은 숲 초록 띠 **‘왜 지금, 뉴질랜드 건강식품일까요?’**(청정 원료 · MPI 기준 · 인기 품목 · 아시아 최초 공장 승인 · 소량 제조), 흰 카드 · 고사리 초록 버튼, 맨 아래 ‘Ka kite anō!’ 인사, 남색 바닥. 고사리 잎 · 산 그림은 직접 그린 SVG(관광청 로고 · 상표 문구는 쓰지 않아요). 다른 강사는 예전 검정 화면 그대로. **강의 · 전자책 시간은 언제나 한국 시간(KST)**으로 읽고 보여 줘요(예전에는 보는 사람 휴대폰 시간대로 계산돼 뉴질랜드에서 열면 카운트다운이 4시간 어긋났어요). 일회성 작업 `2026-11-01-moon-free-1117`: 무료강의 **2026-11-17(화) 19:30**, 대표 영상 `mPFHz1JQj3U`(강사가 넣은 게 있으면 그대로), 카카오톡 오픈채팅 → `https://m.site.naver.com/2iZFQ`, 선물 전자책 1편 지금 공개 · 2편 **11/9(월) 19:00** · 3편 **11/17(화) 19:00**(노션 링크), 포스터를 날짜만 고친 `assets/landing/moon-thumb-1117.jpg` 로(강사가 바꾼 썸네일은 그대로), 자주 묻는 질문 맨 위 ‘무료강의는 언제 시작되나요?’ · ‘5주 실전 클래스’ → ‘4주’.
- **무료강의 2차 (2026-11-01)**: 강사센터 › 무료강의 페이지 탭을 **대표 영상**(첫 화면 아래 큰 영상 · 자기 보임 스위치) · **좌우 영상 3개**(따로 끄고 켬) · **사전 미션 · 질문** · **참여자 혜택**으로 나눴어요. 제목에 `*별표*`로 감싼 글자는 강조색(예: ‘문대표의 *사전 미션*’ → ‘사전 미션’만 빨강). 새 칸 **참여자 전원 증정 혜택**(`freeClass.bonus` — 배지 ‘🎁 톡방 참여자 전원 공개 예정 🎁’ · 01, 02 … 번호 목록(자료 이름 + 한 줄 설명, 최대 12개) · 아래 안내, 모든 강사 공통 · 항목이 없으면 숨김)은 카카오톡 오픈채팅 바로 앞에 와요. 뉴질랜드 테마는 직접 그린 산 · 구름 · 고사리 그림을 빼고 **실제 풍경 사진**으로 바꿨어요: 첫 화면 마운트 쿡 · 푸카키 호수(`assets/landing/nz-hero.jpg`, 휴대폰은 세로 구도 `nz-hero-m.jpg`, 글씨 쪽만 흰 덧칠), ‘왜 뉴질랜드’ 띠 고사리 숲(`nz-forest.jpg` + 짙은 초록 덧칠), 맨 아래 ‘Ka kite anō!’ 밀포드 사운드(`nz-milford.jpg`). 칸 제목은 크게(PC 34~44px · 휴대폰 29~34px), 아이비클래스 로고는 작게(230px · 휴대폰 190px) · ‘무료 LIVE 강의 진행 플랫폼’ 글씨는 크게. 일회성 작업 `2026-11-01-moon-free-mission`: 좌우 영상 3개 끄기(대표 영상만 · 영상 목록은 남김), 질문 칸 → **‘문대표의 사전 미션’**(강의 전에 딱 1분 · 새 구글폼 링크 · ‘사전 미션 하러 가기 →’ · ‘구글폼으로 연결됩니다 · 약 1분 소요’ · 초록 강조 상자 숨김), 참여자 전원 증정 혜택 01~08(전자책 1~3편 제목 · 소개와 강의 내용으로 만든 목록 — 비어 있을 때만 넣고, 강사센터에서 고쳐요).
- **무료강의 3차 (2026-11-01)**: ‘진행 예정인 강의’ 카드의 **무료강의 날짜를 크게**(PC 21px · 휴대폰 18px, 연한 바탕 상자, 날짜 / 시간이 따로 줄바꿈 — `landing.js` `longParts`) 보여 주고, 위쪽 **강의 플랫폼 로고(아이비클래스)는 작게**(뉴질랜드 160px · 휴대폰 136px) 줄였어요. 스타일은 `doogo-free.css` 맨 아래에 있어요.
- **참여자 전원 증정 — 간단 카드 (2026-11-01)**: 길던 01~08 목록 칸을 **한 장짜리 카드**로 줄였어요 — 선물 아이콘 · 작은 글씨(배지, 이모지는 빼고) · 제목 · ‘자료 N가지 전원 무료’ · 노란 **오픈채팅에서 받기** 버튼(카카오톡 칸의 오픈채팅 링크). 자료 목록은 ‘자료 N가지 보기’를 눌러야 펼쳐져요(이름만 · 아래 안내). 강사센터 › 참여자 혜택 편집도 제목 · 작은 글씨 · 자료 이름 · 펼친 목록 아래 안내만 남겼고, 아예 숨기려면 ‘이 칸 페이지에 보이기’를 끄면 돼요.
- **무료강의 페이지 (올블랙 + 3D)**: 모든 강사 공통으로 검정 바탕입니다. 강사마다 다른 건 포인트 색(기본 정보 · 색상) · 썸네일 · 문구입니다. 첫 화면은 왼쪽 헤드라인 · 3D 키캡 카운트다운, 오른쪽 기울어진 3D 썸네일(썸네일이 없으면 제목으로 자동 포스터)과 떠다니는 타일, 아래 원근 바닥 그리드입니다. 버튼은 아래로 두께가 있는 3D 버튼, 선물 전자책은 3D 책 표지입니다. 강사 소개 · 맨 아래 신청하기 칸은 없앴고, 강의 플랫폼(아이비클래스) 로고는 ‘● LIVE 진행’ 칩 옆 검정 배지로 보입니다.
- **한국 · 뉴질랜드 시간 (문대표)**: 수강생 화면 위(넓은 화면은 헤더 가운데, 태블릿·휴대폰은 헤더 아래 띠)에 한국 · 뉴질랜드 현재 시간이 나옵니다. 브라우저 시간대 데이터로 계산해서 뉴질랜드 서머타임(9월 마지막 일요일 ~ 4월 첫 일요일, 한국보다 +4시간 / 그 외 +3시간)이 자동 반영되고 ‘서머타임 / 표준시’로 표시됩니다. 강사센터 ‘기본 정보’에서 켜고 끌 수 있습니다(기본: 문대표만 켜짐).
- **1:1 상담 (예전 1:1 소통채널)**: 모든 강사 공통 메뉴(응원 영상 아래). 강사센터 ‘1:1 상담 채널’에서 채널 이름 · 종류(카카오톡 채널 · 오픈채팅 · 채널톡 · 네이버 톡톡 · 인스타그램 DM · 이메일 · 전화 · 기타) · 설명 · 연결 주소 · 운영 시간 · 버튼 글자를 정합니다. 수강생은 자료실처럼 카드로 보고, 누르면 그 채널로 연결됩니다. 이메일은 주소만, 전화는 번호만 적어도 바로 열립니다. 주소가 빈 카드는 ‘준비 중’으로 보이고, 개별 카톡방처럼 공개 링크가 없는 채널은 ‘링크가 없을 때 보일 안내’에 적은 문구가 카드에 보입니다. 카드 맨 위 작은 머리말(예: STEP 1 · 제조 상담)도 넣을 수 있습니다. 카드마다 아이콘 · 색(아이콘 · 버튼 · 머리말 · 위쪽 띠)을 따로 고를 수 있어서, 같은 카카오톡 채널이 여러 개여도 구분됩니다. 문대표는 두고바이오(뉴질랜드 제조공장 · 파랑) · 제조 입금 후 개별 카톡방(보라) · 두고푸드 식품 전문 도매몰(주황) 3개입니다.
- **수료증**: 종이 질감 · 이중 테두리 · 수료 로제트 · 강사 직인 · 증서 번호가 들어간 A4 가로 디자인(인쇄 · PDF 저장 한 장). 휴대폰에서는 세로로 정리됩니다. 체험 계정(`demo: true`, 이수진 / 2186)은 모든 주차와 수료증이 ‘체험 계정’ 표시와 함께 열려 있고, 강사 미리보기에서는 잠긴 수료증을 ‘미리보기’로 열어 볼 수 있습니다. 과제 화면에서 ‘‹ 1주차’ · 뒤로 가기로 돌아오면 보던 자리 그대로 돌아갑니다. 네이버 카페 링크는 휴대폰에서는 모바일 카페(m.cafe.naver.com), PC 에서는 PC 카페로 열립니다(`main.js` 의 `cafeLink`).
- **제휴채널**: 모든 강사 공통 메뉴(1:1 소통채널 아래). 탭(전체보기 · 두고그룹 · 제휴사)으로 나뉘고, ‘맨 위에 크게’를 켠 곳(문대표: 두고 N카페, 문대표 수강생 전용)은 가장 위 큰 카드와 ‘제휴 혜택 · 할인 코드는 모두 두고 N카페에서 안내’ 띠로 보입니다. 두고그룹: 두고 N카페 · 두고커넥트 · 두고푸드 / 제휴사: 코워크시티(비상주) · 유트랜스퍼(해외송금, 카페 글로 연결). 강사센터 ‘제휴채널’에서 이름 · 분류 · 머리말 · 설명 · 강조 항목 · 주소 · 버튼 · 아이콘 · 색을 바꿉니다. 다른 강사는 따로 정하기 전까지 문대표 구성이 강사 이름으로 바뀌어 보입니다. 네이버 카페 주소에는 네이버 표시가 붙습니다.
- **카카오톡 표시**: 1:1 소통채널의 카카오톡 채널 · 오픈채팅 카드에는 카카오톡 채널 표시(Ch)가 아이콘 모서리 · 안내 줄 · 버튼(노란 ‘카카오톡’ 버튼)에 붙어, 누르면 카카오톡으로 연결된다는 걸 알 수 있습니다.
