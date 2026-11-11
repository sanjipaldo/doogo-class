# 상시 화면 테스트 (E2E) — Next.js 전환 0단계

지금 화면에서 먼저 전부 통과시켜 **기준선**으로 삼고, 1~6단계마다 같은 테스트로 확인해요. 바뀐 화면이 이 테스트를 모두 통과해야 다음 단계로 넘어가요.

## 돌리는 방법

```bash
cd class
node scripts/e2e/run.js            # 전부 (시험 DB를 새로 만들고, 테스트마다 새 복사본으로)
node scripts/e2e/run.js routes idle  # 고른 것만
node scripts/e2e/fixture.js /tmp/fx  # 시험 DB만 만들기 → E2E_FIXTURE=/tmp/fx 로 다시 쓰기
E2E_SERVER=next node scripts/e2e/run.js              # Next.js 서버로 (먼저 저장소 맨 위에서 node class/scripts/site.js public && npx next build)
E2E_SERVER=next E2E_REACT=1 node scripts/e2e/run.js  # React 화면을 모두 켠 채로 같은 테스트 (react* 테스트가 고른 값은 그대로)
E2E_FILES=storage node scripts/e2e/run.js            # 사진 · 첨부를 가짜 Supabase Storage(진짜 HTTP · 비공개 버킷)에 두고 (DB 전환 2부 B1 · E2E_SERVER · E2E_DB 와 같이 써도 돼요)
E2E_AREAS=all:only node scripts/e2e/run.js           # 문서 종류마다 제 표에서 읽고 쓰기 (DB 전환 2부 B2~B6 · off · dual · table · only · 영역마다 B2:dual,B3:only 처럼)
```

- Playwright(chromium)가 설치된 컴퓨터에서 돌려요. 배포 빌드가 무거워지지 않게 저장소 `package.json`에는 넣지 않아요.
- **운영 DB · 운영 사이트에는 접속하지 않아요.** 테스트 서버(`scripts/dev-server.js`)를 시험용 SQLite 파일로 띄우고, 운영 비밀 값(DB · Storage · 토스페이먼츠 · 카카오 · AI 키)은 넘기지 않아요 (`lib.js` `cleanEnv`).
- 시험 DB는 운영과 같은 순서로 만들어요: 처음 데이터(data.js) → 마스터가 스토어를 한 번 열어 스토어 데이터 · 결제 가격표 올림 → 배포 빌드처럼 일회성 작업 전부 + 기본값 채우기 (`fixture.js`).
- 체험 계정 이름 · 뒷자리는 코드에 적지 않고 시험 DB에서 읽어요 (`fixture.json`).
- 화면은 운영처럼 `#` 없는 깨끗한 주소로 열어요 (`dc:clean`).
- 실패하면 그 화면 사진을 남겨요 (`E2E_SHOTS=폴더`).

## 테스트 목록

| 이름 | 확인하는 것 |
| --- | --- |
| routes | 주소 목록(아래)이 모두 같은 화면으로 열림 · 예전 `#/` 링크가 깨끗한 주소로 바뀜 · 정적 파일 · 공개 API · 공개 문서에 강사 연락처 · 정산 · 뒷자리 · 비밀번호 없음 |
| logins | 마스터 · 강사 · 코치 · 두잉고 수강생 · DOOGO CLASS 회원 로그인 → 서버도 같은 사람 · 새로 고쳐도 그대로 · 로그아웃하면 서버 쿠키까지 풀림 · 틀린 비밀번호 막음 · 권한 밖 화면 못 엶 |
| store | 무료 강의 수강 시작 → 내 강의 → VOD 강의실 · 무통장 주문 → 입금 대기 → 마스터 입금 확인 → 수강 열림 |
| classroom | 두잉고 수강생 과제 제출 → 강사 과제 검수에서 승인 → 수강생 화면에 반영 |
| center | 강사센터 저장이 서버에 남음 (새로 고친 뒤에도) · 마스터 강사 정산 화면(상품 종류 탭 · 정산 규칙) |
| idle | 자동 로그아웃: 강사센터 30분 무동작 · 29분 그대로 · 강사센터 밖 탭은 새로 고치지 않음 · 수강생 · 회원은 창을 닫고 60분 뒤 (브라우저 시계를 앞으로 돌려서) |
| split | 화면 나눠 받기 (4-3단계) — 영역별 파일만 받고 · 영역을 옮길 때 나머지를 받아 같은 화면이 그려짐 |
| files | 사진 · 첨부: 마스터가 올린 공개 사진 · 수업 자료(vodp) · 서류(adm) — 방문자는 사진만(화면에 보임) · 나머지 403 · 같은 크기 · 캐시 머리말 · 없는 파일 404 (`E2E_FILES=storage` 면 가짜 Supabase Storage 를 거쳐요) |
| onboard | 강사 입점 → 강사센터 계정: 두고 파트너스 지원서 → 계약 완료(처리할 일에 남음) → ‘VOD 강사로 등록’(이름 · 뒷자리 · 활동명 미리 채움, 같은 이름 스토어 외부 클래스 연결 — 정산 비율 · 강사진 순서 키까지) → 결과 창 안내 → 강사 로그인 DOOGO CLASS 열림 · 두잉고 자물쇠 · LIVE 문의는 반대 · 같은 이름(띄어쓰기 무시) + 뒷자리 막기 · 지워진 계정이면 다시 등록 버튼 |
| react · reactdg | React 화면(스토어 · 회원 · 두잉고 강의실)이 예전 화면과 같은 구조 · 누르기 (Next.js 서버 `E2E_SERVER=next` 에서만) |
| reactct | 강사센터 · 코치 · VOD 탭 · 마스터 · 운영자(스태프) 계정 화면이 예전 화면과 같은 구조 (PC · 휴대폰) · 운영 화면 · 무료강의 · 강사 소개 페이지 편집 · 클래스 세팅 · 마스터 화면 누르기 (Next.js 서버에서만) |
| reactpm | 마스터가 화면에서 만든 파트너 · 온드미디어 계정으로 파트너센터 · 온드미디어 센터가 예전 화면과 같은 구조 · 탭 · 고르기 · 찾기 (Next.js 서버에서만) |
| pay | 결제 화면 (토스페이먼츠 · 2026-11-11): 시험용 가짜 토스 키 · 결제수단을 넣은 서버로 — 탈잉 순서 목록(계좌이체 · 네이버페이 · 카카오페이 · 카드/간편결제 · 가상계좌 · 무통장) · 처음엔 카드 · 고른 수단 아래 안내 · 예전 화면 = React 화면 · 결제하기 → 가짜 토스 SDK 가 받은 값(네이버페이 · 카카오페이 DIRECT · 카드 통합결제창 · 계좌이체 · 가상계좌 입금 기한 · 금액 · 주문 번호 · 돌아올 주소) · 결제창에서 취소하고 돌아오면 ‘결제 안 됨’ · 무통장 + 현금영수증 신청 → 마스터 입금 확인 → 주문 목록 ‘현금영수증’ 탭(예전 화면 = React) · 상세 ‘현금영수증 발급 완료’ (`spec.env` 로 그 시험만 서버 설정 · `E2E_PAY_SHOTS=<폴더>` 면 사진) |

## 주소 목록 (지금 운영에서 열리는 주소 — 전환 뒤에도 그대로)

| 주소 | 화면 |
| --- | --- |
| `/` · `/vod` | DOOGO CLASS 스토어 |
| `/vod/c/<all · soon · biz · commerce · marketing · ai · money · career>` · `/vod/teachers[/<강사>]` · `/vod/search?q=` · `/vod/about` · `/vod/partners` | 카테고리 · 강사진 · 검색 · 소개 · 두고 파트너스 |
| `/vod/p/<클래스>` (`?rs=` · `?by=` · `utm_*`) | 클래스 상세 (VOD · 전자책 · LIVE · 오프라인 · 종이책) |
| `/vod/login` · `/vod/signup` (`?next=`) | 스토어 로그인 · 회원가입 |
| `/vod/checkout/<클래스>` (`?plan=180·365` · `coach=1` · `item=coach·tea·extend` · `qty=`) · `/vod/order/<주문번호>` | 결제 · 주문 완료 |
| `/vod/my/<classes · free · vod · addons · ebooks · live · alarm · likes · pending · orders · ship · coupons · points · reviews · posts · badges · account · devices · help>` | 회원 마이페이지 |
| `/vod/learn/<클래스>/<강의>` · `/vod/dg` · `/vodclass/<클래스>/<강의>` | VOD 강의실 |
| `/terms` · `/privacy` · `/refund` | 약관 · 개인정보 처리방침 · 환불 규정 |
| `/doinggo` | 두잉고 소개 (예전 `/about` · `/partner` 도 여기로) |
| `/p/<강사>` · `/free/<강사>` | 강사 소개 · 무료강의 페이지 |
| `/login` · `/login?ins=<강사>` · `/login?tab=vod` | 두잉고 수강생 로그인 · DOOGO CLASS 회원 로그인 |
| `/home` · `/curriculum` · `/missions[/<주차>[/<과제>]]` · `/replays` · `/showcase` · `/notes` · `/glossary` · `/schedule` · `/notices` · `/qna` · `/docs` · `/bot` · `/library` · `/motivation` · `/channels` · `/partners` · `/certificate` · `/page/<키>` | 두잉고 수강생 강의실 |
| `/center/login` · `/center/<메뉴>` · `/center/master/<메뉴>` · `/center/partner/…` · `/center/media/…` | 강사센터 · 코치 · 마스터 · 파트너 · 온드미디어 |
| `/#/…` | 예전 링크 — 깨끗한 주소로 바꿔서 같은 화면 |

**돌아오는 주소의 값:** 결제 `/` (토스 결제창이 붙여 보내는 `paymentKey` · `orderId` · `amount` · `paymentType` 또는 실패 · 취소 `code` · `message` · `orderId` — 처리하면 주소에서 지우고 `#/vod/order/<주문번호>` 로) · 카카오 로그인 `?vodlogin=ok|linked|deny|dup|taken|other|blocked|fail` — 화면이 읽고 나서 주소에서 지워요 (`ROUTE.dropQuery`).

**바깥 서비스에 등록된 주소 (바뀌면 바로 장애):** 카카오 로그인 Redirect URI `/api/vod-kakao` · 토스 결제창 돌아오는 주소 `/` · 토스 웹훅 `/api/vod-pay?hook=toss` · 무통장 입금 확인 웹훅 `/api/vod-bank` · `doinggo.doogoclass.com` → `/doinggo` 넘기기(vercel.json).

## 기준선에서 찾아 고친 것 (2026-11-03)

- 자동 로그아웃: 운영의 깨끗한 주소(`/center/…`)에서는 켜 둔 강사센터 화면의 30분 자동 로그아웃이 돌지 않았어요 (`location.hash` 대신 `ROUTE.hash`). 다음에 열 때의 로그아웃은 원래도 됐어요.
- DOOGO CLASS 회원 로그아웃: 보내지 못한 진도 기록을 로그아웃 **뒤에** 보내서 서버가 거절했어요 → 먼저 보내고 로그아웃해요.

## 시험용 DB (미리보기 배포)

2026-11-03부터 미리보기 배포는 **시험용 DB(Turso `doogo-class-staging`)** 에만 연결돼요. 운영 DB(`doogo-class-db`)는 운영(Production) · 개발(Development) 환경에만 있어요.

| 미리보기 환경 변수 | 값 |
| --- | --- |
| `TURSO_DATABASE_URL` · `TURSO_AUTH_TOKEN` | 시험용 DB (Storage 연결 · Preview만) |
| `DB_ROLE` | `staging` — 빌드(`scripts/db-build.js`)가 시험용 DB에만 처음 데이터 · 일회성 작업 · 기본값 채우기를 돌려요 |
| `MASTER_PASSWORD` | 시험용 마스터 비밀번호 (운영과 다름 · 아이디 `doogobiz`) |

- 시험용 표시(oplog `__staging-db__`)가 없는데 데이터가 있는 DB(운영 DB일 수 있음)면 아무것도 바꾸지 않고 빌드를 멈춰요.
- 운영과 같은 순서: 빈 DB → 처음 데이터 → 마스터가 스토어를 한 번 열어 스토어 데이터를 올림 → 다음 미리보기 빌드 때 일회성 작업.
- 미리보기 주소: 브랜치마다 `https://doogo-class-git-<브랜치>-sanjipaldo.vercel.app` (Vercel 로그인 필요).
- 시험 배포에 읽기 전용 테스트 돌리기: `E2E_BASE=<미리보기 주소> node scripts/e2e/run.js routes` (Vercel 보호가 켜져 있으면 브라우저에서 확인).
