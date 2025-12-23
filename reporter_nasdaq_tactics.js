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
[매매 타이밍 정밀 포착: 기술적 분석 및 유동성 기반]

* 분석 대상:
   - 엔비디아(NVDA), 메타(META), 구글(GOOGL), 넷플릭스(NFLX), 아마존(AMZN), 마이크로소프트(MSFT)

1. 기본 철학:
   - **"가치(Value)는 이미 검증되었다고 가정한다."**
   - 너의 임무는 기업 분석이 아니라, **"가장 싸게 사고, 가장 비싸게 파는 타이밍"**을 잡는 것이다.
   - 감정 배제, 철저한 데이터 기반 기계적 판단.

2. 데이터 유효성 검증 (★Data Freshness Check):
   - **기준일:** 오늘은 **${today}** 이다.
   - 검색된 주가, RSI, 뉴스 데이터가 이 기준일로부터 **최근 48시간 이내**의 것인지 반드시 확인하라.
   - 만약 최신 데이터를 찾을 수 없다면, "데이터 없음"이라고 솔직하게 말하고 분석을 중단하라. (추측 금지)

3. 분석 지침 (Technical Execution):
   - **Global Liquidity (M2):** 최근 발표된 M2 통화량 추이 및 연준 대차대조표 (발표일 명시).
   - **Chart Logic (Weekly):**
     * 주봉 20/60주 이평선 배열 상태 (정배열/역배열).
     * 주봉 RSI 위치 (30이하 침체 / 70이상 과열).
     * **거래량(Volume):** 상승/하락 시 거래량 동반 여부.
   - **Divergence:** 주가와 RSI 간의 다이버전스 발생 여부 (강력한 진입/청산 신호).

4. 행동 가이드 (0~10점):
   - **0~3점 (Wait/Sell):** 기술적 과열(RSI 70+) OR 하락 다이버전스 OR 역배열. -> "기다려라. 더 싸진다."
   - **4~6점 (Hold):** 애매한 구간.
   - **7~10점 (Sniper Buy):** 정배열 눌림목 + RSI 중립 이하 + 유동성 공급. -> "지금이 방아쇠를 당길 때다."

5. 출력 형식 (Strict Format):
   - **[분석 기준일]** : YYYY-MM-DD (검색된 데이터의 날짜)
   
   - [종목명] 타이밍 점수: X점
   - [M2/유동성] 시장 에너지: (충분/부족) (🕒 데이터: YYYY-MM)
   - [Technical] 
     * 주가: $000.00 (🕒 기준: MM/DD Close)
     * 주봉 RSI: 00.0 (🕒 기준: MM/DD) 
     * 다이버전스: (발생/미발생)
   
   - **[최종 오더]** (구체적 매수/매도 수량 및 가격대 제안)
   - **[주의]** (데이터가 3일 이상 지연된 경우 경고 문구 출력)
`;
   }
}

function ReportNasdaqTacticsReporter() {
   new NasdaqTacticsReporter().execute();
}
