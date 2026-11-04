#!/bin/sh
# Vercel ‘빌드 건너뛰기’ 검사 (vercel.json ignoreCommand) — 끝 코드 0 = 이번 빌드 건너뛰기 · 1 = 빌드해요
#  · 직전 배포 커밋(VERCEL_GIT_PREVIOUS_SHA · 없으면 바로 앞 커밋)과 비교해 화면 · 서버 파일이 그대로면 건너뛰어요
#  · 그 커밋이 Vercel 이 받아 온 기록(얕은 복제)에 없으면 비교를 못 하니 그냥 빌드해요
#    (커밋이 많이 쌓인 운영 배포에서 git diff 가 ‘bad object’ 로 멈춰 배포가 실패하던 것 — 2026-11-04)
test -f class/scripts/db-build.js || exit 0
P="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"
git cat-file -e "$P^{commit}" 2>/dev/null || exit 1
git diff --quiet "$P" HEAD -- class app pages nextlib ui proxy.js next.config.js vercel.json .vercelignore package.json package-lock.json
