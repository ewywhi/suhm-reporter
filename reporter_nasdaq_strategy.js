class NasdaqStrategyReporter extends ReporterBase {
   constructor() {
      super();

      // this.botToken = Telegram.Suhmplus.BotToken;
      // this.chatId = Telegram.Suhmplus.ChatId_미래;
      this.useSearch = true;
      this.reportTemperature = 0.4;

      // Nasdaq
      this.type = ReportType.NasdaqStrategy;
      this.title = "나스닥 가치 투자 분석";
   }

   generatePrompt(data) {
      const today = Utilities.formatDate(new Date(), "GMT+9", "yyyy년 MM월 dd일");

      return `
[미국 주식 종목 선정 및 가치 분석: IT 전문가 관점]

1. 기본 철학:
   - **"가격(Price)은 잊고 가치(Value)만 본다."**
   - 내가 이해할 수 있는 IT/Tech 기업 중, 2~3년 뒤 확실히 성장할 **'내재 가치'**가 있는 대상을 선정한다.
   - 당장의 주가 등락이나 차트 위치는 분석에서 **완전히 배제**하라.

2. 분석 지침 (Value Selection):
   - **BM(Business Model) 견고성:** 이 회사의 돈 버는 구조가 경쟁사(Deep Moat)에 의해 보호받고 있는가?
   - **IT 전문성 검증:** 개발자 관점에서 이 회사의 기술(AI, 클라우드 등)이 '진짜'인지 '마케팅'인지 판별.
   - **구조적 성장:** 글로벌 트렌드(M2 유동성 등 거시환경 포함)가 이 회사에 유리하게 작용하는가?

3. 출력 형식:
   - [종목명] 가치 점수: X점 / 10점
   - [Fundamental] 경쟁 우위 요소: (기술적 해자 설명)
   - [IT Insight] 개발자가 본 이 회사의 킬러 포인트.
   - **[결론]** 이 종목을 '관심 종목(Watchlist)'에 넣을 가치가 있는가? (O/X)
`;
   }
}

function ReportNasdaqStrategyReporter() {
   new NasdaqStrategyReporter().execute();
}
