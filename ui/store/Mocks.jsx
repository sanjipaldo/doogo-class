"use client";
/* DOOGO CLASS VOD 학습 시스템 그림 (예전 vod.js sysMock — 사진 대신 CSS 로 그린 작은 화면 · 흑백 + 레드 포인트)
 * 홈 ‘실행까지 함께하는 VOD’ · 소개 화면이 같이 써요. 예전 화면이 그린 모양 그대로 옮겼어요 (예전 화면 출력을 JSX 로) */

/** k: room · files · note · ai · coach */
export default function SysMock({ k }) {
  if (k === "room") return (
    <>
      <div className="mk-win">
        <div className="mk-bar"><i /><i /><i /><span>두잉고 강의실</span></div>
        <div className="mk-room">
          <div className="mk-video"><span className="mk-play" /><span className="mk-wm">김OO · VOD 수강생</span><span className="mk-seek"><u /></span></div>
          <div className="mk-list"><p className="done"><i />1-1 시작 전 체크리스트</p><p className="done"><i />1-2 첫 상품 고르기</p><p className="cur"><i />2-1 마진 계산하기</p><p><i />2-2 상세페이지 만들기</p></div>
        </div>
        <div className="mk-prog"><span>전체 진도</span><b>67%</b><span className="mk-pbar"><u /></span></div>
      </div>
    </>
  );
  if (k === "files") return (
    <>
      <div className="mk-win">
        <div className="mk-bar"><i /><i /><i /><span>수업 자료</span></div>
        <div className="mk-files">
          <p style={{ "--k": "0" }}><em className="t-pdf">PDF</em><b>실전 교재</b><small>42쪽</small><span className="mk-dl" /></p>
          <p style={{ "--k": "1" }}><em className="t-xlsx">XLSX</em><b>마진 · ROAS 계산기</b><small>엑셀</small><span className="mk-dl" /></p>
          <p style={{ "--k": "2" }}><em className="t-pdf">PDF</em><b>첫 주문 체크리스트</b><small>12항목</small><span className="mk-dl" /></p>
          <p style={{ "--k": "3" }}><em className="t-zip">ZIP</em><b>상세페이지 템플릿</b><small>5종</small><span className="mk-dl" /></p>
        </div>
      </div>
    </>
  );
  if (k === "note") return (
    <>
      <div className="mk-win">
        <div className="mk-bar"><i /><i /><i /><span>강의 노트</span></div>
        <div className="mk-notes">
          <p style={{ "--k": "0" }}><time>03:12</time><span>재고 없이 시작 → 위탁 · 구매대행부터</span></p>
          <p style={{ "--k": "1" }}><time>12:40</time><span>마진 30% 아래는 광고비에 다 먹혀요</span></p>
          <p style={{ "--k": "2" }}><time>21:05</time><span>첫 주문은 리뷰 체험단으로</span></p>
          <span className="mk-pen">+ 메모하기</span>
        </div>
      </div>
    </>
  );
  if (k === "ai") return (
    <>
      <div className="mk-win">
        <div className="mk-bar"><i /><i /><i /><span>AI 조교 · 24시간</span></div>
        <div className="mk-chat">
          <p className="me">첫 상품은 어떻게 골라야 해요?</p>
          <p className="bot">강의에서 말한 기준 세 가지를 먼저 보세요. ① 마진 30% 이상 ② 재구매가 되는 상품 ③ 배송이 쉬운 상품이에요.</p>
          <p className="me">마진 계산은 어디서 해요?</p>
          <p className="bot typing"><i /><i /><i /></p>
        </div>
      </div>
    </>
  );
  if (k === "coach") return (
    <>
      <div className="mk-win">
        <div className="mk-bar"><i /><i /><i /><span>1:1 코칭 · TEA TIME</span></div>
        <div className="mk-coach">
          <p className="q"><small>내 코칭 질문 · 남은 코칭 2회</small>마진 22%인데 광고를 시작해도 될까요?</p>
          <p className="a"><i className="mk-av">강</i><span><b>강사님 답변</b>광고보다 리뷰 체험단부터 해 보세요. 마진이 30%를 넘으면 그때 시작해요.</span></p>
          <p className="tea"><em>TEA TIME</em><span>11/12 (수) 19:00 · 강남</span><u>확정</u></p>
        </div>
      </div>
    </>
  );
  return null;
}
