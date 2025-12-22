class NasdaqStrategyReporter extends ReporterBase {
   constructor() {
      super();

      // this.botToken = Telegram.Suhmplus.BotToken;
      // this.chatId = Telegram.Suhmplus.ChatId_미래;
      this.useSearch = true;
      this.reportTemperature = 0.4;

      // Nasdaq
      this.type = ReportType.NasdaqStrategy;
      this.title = "나스닥 거시 전략 분석";
   }

   generatePrompt(data) {
      const today = Utilities.formatDate(new Date(), "GMT+9", "yyyy년 MM월 dd일");

      return `
[미국 주식 거시 전략: 얼리 버드 & 기술 대진표 (Insight Ver.)]

1. 기본 설정:
   - 분석 주기: 월 1회 (매월 1일)
   - 타겟 독자: **IT 전문성을 갖춘 투자자**. (단순 팩트 나열보다는 '기술적/경제적 인과관계'를 원함)
   - 목표: 남들이 모르는 **'Next Big Thing'**을 발굴하고, 그 배경(Why)을 이해한다.

2. 분석 지침 (Deep Dive):
   - **Trend Hunting:** GitHub/Hacker News에서 개발자들이 열광하는 기술을 찾되, **"왜 지금 이 기술인가?"(Pain Point 해결)**에 집중할 것.
   - **Money Follows:** VC 자금 흐름이 단순 유행인지, 구조적 변화인지 검증할 것.

3. 출력 가이드 (Relaxed Constraints):
   - **서술형 허용:** 각 항목에 대해 **2~3문장의 설명**을 덧붙여 맥락을 충분히 전달할 것.
   - **인사이트 필수:** 단순 현상(What) 나열에 그치지 말고, 이것이 시장 판도를 어떻게 바꿀지(Impact) 설명해 줘.
   - **대진표 유지:** 경쟁 구도는 명확히 구조화해서 보여줄 것.

4. 리포트 포맷:

[📊 전략 점수: X점 / 10점]
* 판단: (시기상조 / 골든타임 / 끝물)
* 핵심 논리: (점수 산정의 배경과 시장의 현 위치를 통찰력 있게 요약)

[🔭 Part 1. 감지된 넥스트 트렌드]
* 핵심 키워드: [기술명/프로젝트명]
* [Why Now?] 개발자들이 왜 이 기술에 주목하는가?
  (기존 기술의 한계점과 이 기술이 해결하는 문제점을 IT 관점에서 설명)
* [Buzz Check] 커뮤니티/GitHub의 구체적인 반응과 주요 논쟁 포인트.

[💰 Part 2. 자금과 확산 (Validation)]
* [VC & Smart Money] 실리콘밸리 자금은 어디로 향하는가?
  (구체적인 투자 트렌드와 그 의미 해석)
* [Trend Velocity] Google Trends 등을 통한 대중 확산 단계 진단.
* [Macro Check] M2(유동성) 환경이 이 기술 성장을 뒷받침하는가?

[⚔️ Part 3. 차세대 기술 대진표 (Candidates)]
* (결론은 없어도 됨. 현재 패권 다툼 중인 기술/진영을 나열)
1. [후보 A] (핵심 특징 & 지지 기업/진영)
   : (이 후보의 강점과 약점, 시장 장악 가능성 분석)
2. [후보 B] ...
3. [후보 C] ...

[💡 Action Plan for IT Investors]
* 관심 가질 기업/ETF: (티커명과 선정 이유)
* IT 종사자 팁: (기술 트렌드 변화에 따른 포트폴리오 헷지 전략 제안)
`;
   }
}

function _testNasdaqStrategyReporter() {
   new NasdaqStrategyReporter().execute();
}

