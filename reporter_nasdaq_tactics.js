class NasdaqTacticsReporter extends ReporterBase {
    constructor() {
        super();

        this.botToken = Telegram.Suhmplus.BotToken;
        this.chatId = Telegram.Suhmplus.ChatId_미래;
        this.useSearch = true;
        this.reportTemperature = 0.1;

        // Nasdaq
        this.type = ReportType.NasdaqTactics;
        this.title = "나스닥 보유주 정밀 진단";
    }

    generatePrompt(data) {
        const today = Utilities.formatDate(new Date(), "GMT+9", "yyyy년 MM월 dd일");

        return `
[보유 기술주 정밀 진단: 보수적 중기 투자자용 (v2.0)]

1. 기본 설정:
   - 분석 대상: 엔비디아(NVDA), 메타(META), 구글(GOOGL), 넷플릭스(NFLX)
   - 나의 성향: **'보수적(Conservative)'**이며 거래 빈도가 낮음(2~3개월 1회).
   - 핵심 원칙: 노이즈(Daily)는 무시하되, **'구조적 위험 신호(Weekly)'**가 뜨면 가차 없이 비중을 줄임.

2. 분석 요청 절차:

[STEP 1. 시장 기후 확인]
   - 나스닥 주봉 추세와 VIX(공포지수) 체크.

[STEP 2. 종목별 정밀 분석 (검색 기반)]
   
   A. 팩트 & 이슈 (Fact Check)
      - 기업 가치에 영향을 주는 핵심 뉴스 및 악재 여부 확인. (출처/날짜 필수)
   
   B. 중기 기술적 분석 (★Timeframe: Weekly Chart★)
      - **이동평균선:** 주봉 기준 20주/60주 이평선 지지 여부.
      - **RSI (상대강도지수):** * 주봉 RSI가 70을 넘는지(과열 경고), 30 아래인지(저점 기회) 체크.
      - **다이버전스 (Divergence):** ★핵심 필터★
         * 주가는 고점을 높이는데 RSI는 낮아지는 '하락 다이버전스'가 주봉상 발생했는지 반드시 확인.
         * 발생 시 강력한 매도 신호로 해석.
      - 거래량이 실린 하락인지, 단순 조정인지 구분.

[STEP 3. 보수적 투자 점수 및 행동 가이드]
   - 위 분석을 토대로 **0~10점 척도**로 점수를 매기고, 구체적인 수량을 제안해 줘.
   
   * 행동 가이드:
     - **0~3점 (매도/축소):** 구조적 하락 징후. (예: "다이버전스 발생, 보유량 30% 익절 권장")
     - **4~6점 (관망/Hold):** 애매하거나, 상승 중 쉬어가는 구간. (보수적 투자자는 이 구간에서 절대 움직이지 않음. "현 상태 유지")
     - **7~10점 (매수/확대):** 완벽한 정배열 + 실적 호재. (예: "여유 현금의 10% 추가 투입")

3. 출력 형식:
   - [종목명] 점수: X점
   - [핵심 지표] 주봉 RSI: OO / 다이버전스 유무: O,X
   - [추천 행동] 구체적 % 제시
   - [근거] IT 종사자용 한 줄 요약
`;
    }
}

function _testNasdaqTacticsReporter() {
    new NasdaqTacticsReporter().execute();
}

