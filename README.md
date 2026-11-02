# 두고클래스 (DOOGO CLASS)

**www.doogoclass.com** — VOD · 전자책 · LIVE 클래스 스토어(두고클래스)와 강의 운영 시스템(두잉고, `/doinggo`).

| 위치 | 내용 |
|---|---|
| [`class/`](class/) | 앱 전체 (화면 · 서버 코드 · 빌드 스크립트 · 테스트). 자세한 설명은 [`class/README.md`](class/README.md) |
| `api/*.js` | Vercel 서버 함수 입구 — 실제 코드 `class/api/*.js` 를 불러옴 |
| `vercel.json` · `.vercelignore` · `package.json` | 빌드 · 배포 설정 |

배포: Vercel 프로젝트 `doogo-class` · Production Branch `main` (푸시하면 자동 배포)

> 2026-11-02 여러 작업이 함께 있던 `sanjipaldo/sanjipaldo` 저장소에서 두고클래스만 떼어 왔어요 (`claude/keen-ride-j85f6u` 브랜치 이력 그대로).
