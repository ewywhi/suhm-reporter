class NasdaqTacticsReporter extends ReporterBase {
   constructor() {
      super();

      this.botToken = Telegram.Suhmplus.BotToken;
      this.chatId = Telegram.Suhmplus.ChatId_미래;
      this.useSearch = true;
      this.reportTemperature = 0.1;

      // Nasdaq
      this.type = ReportType.NasdaqTactics;
      this.title = "나스닥 주식별 기술적 분석";
   }

   generatePrompt(data) {
      const today = Utilities.formatDate(new Date(), "GMT+9", "yyyy년 MM월 dd일");

      return `
[장기 투자자를 위한 매수/매도 구간 정밀 진단]

* 분석 대상:
   - 엔비디아(NVDA), 메타(META), 구글(GOOGL), 넷플릭스(NFLX), 아마존(AMZN), 마이크로소프트(MSFT)

1. 기본 철학 (Long-term Investor):
   - **"Time in the market > Timing the market."**
   - 잦은 매매는 수수료와 세금만 발생시킨다.
   - 너의 임무는 '단기 고점'을 맞추는 게 아니라, **"맘 편히 수량을 늘릴 수 있는 구간(저평가)"**과 **"과열이라 매수를 멈춰야 할 구간(고평가)"**을 구분해 주는 것이다.
   - 감정 배제, 철저한 데이터 기반 기계적 판단.

2. 데이터 유효성 검증:
   - 기준일: **${today}**
   - 검색된 주가, RSI, 뉴스 데이터가 이 기준일로부터 **최근 48시간 이내** 인지 반드시 확인할 것. (오래된 데이터면 분석 중단)

3. 분석 지침 (Long-term Technicals):
   - **Trend Filter:** 주봉(Weekly) 60주 또는 120주 이동평균선 지지 여부. (장기 추세가 살아있는가?)
   - **RSI Check:**
     * RSI 70 이상: "과열권" -> 추격 매수 금지 구간. (매도는 아님)
     * RSI 80 이상: "초과열(Bubble)" -> 비중 일부 축소 고려.
     * RSI 40~50: "건전한 조정" -> 분할 매수 기회.
   - **Volume:** 상승/하락 시 거래량 동반 여부. 거래량이 터지며 장기 이평선을 깨는지 확인.
   - **Divergence:** 주가와 RSI 간의 다이버전스 발생 여부 (진입/청산 신호).

4. 행동 가이드 (점수: '매수 매력도'):
   - **0~3점 (과열/위험):** RSI 75+ 또는 장기 추세 이탈. -> **"매수 버튼 삭제. 현금 보유하거나 과열 종목은 일부 이익 실현."**
   - **4~6점 (보유/관망):** 상승 중 쉬어가거나 완만한 등락. -> **"팔지 마라. 그냥 엉덩이 무겁게 홀드(Hold)."**
   - **7~10점 (모아가기):** 장기 이평선 지지 + RSI 안정화. -> **"수량을 늘릴 기회(Accumulate). 적립식 매수 실행."**

5. 출력 형식:
   - **[분석 기준일]** : YYYY-MM-DD
   
   - [종목명] 투자 매력도: X점
   - [현재 구간 진단] (예: 과열권 진입 / 건전한 눌림목 / 추세 붕괴 우려)
   - [Technical Check]
     * 주가: $000.00 (🕒 MM/DD)
     * 장기 추세(60주선): (지지 중 / 이탈)
     * 주봉 RSI: 00.0 (상태: 과열/중립/침체)

   - **[장기 투자자 행동 지침]** (예: "지금은 사지 말고 즐기세요(Hold)." 또는 "조정 시마다 줍줍하세요(Buy).")

   - **[최종 오더]** (구체적 매매 비중 및 가격대 제안)
   - **[주의]** (데이터가 3일 이상 지연된 경우 경고 문구 출력)
`;
   }
}

function ReportNasdaqTacticsReporter() {
   new NasdaqTacticsReporter().execute();
}
