class NasdaqStrategyReporter extends ReporterBase {
   constructor() {
      super();

      // this.botToken = Telegram.Suhmplus.BotToken;
      // this.chatId = Telegram.Suhmplus.ChatId_미래;
      this.useSearch = true;
      this.reportTemperature = 0.4;

      // Nasdaq
      this.type = ReportType.NasdaqStrategy;
      this.title = "나스닥 거시 전략 분석 v4.0";
   }

   generatePrompt(data) {
      const today = Utilities.formatDate(new Date(), "GMT+9", "yyyy년 MM월 dd일");

      return `
[미국 주식 거시 전략: 얼리버드 탐색 & 보수적 투자 판정 (Hybrid)]

1. 기본 설정:
   - 분석 주기: 월 1회
   - 나의 성향: 
      - **'탐색은 공격적으로, 투자는 보수적으로'**.
      - **IT 전문성을 갖춘 투자자**. (단순 팩트 나열보다는 '기술적/경제적 인과관계'를 원함)
   - 목표: 
      - 개발자들이 열광하는 초기 트렌드를 찾되, 실제 투자는 **'검증된 수단(ETF, 대장주)'**이 있을 때만 집행한다.
      - 남들이 모르는 **'Next Big Thing'**을 발굴하고, 그 배경(Why)을 이해한다.

2. 분석 지침 (Deep Dive):
   - **Trend Hunting (Aggressive):** GitHub Star 급증, Hacker News 논쟁 등 **개발자 트렌드**를 공격적으로 발굴. 아직 상장사가 없는 기술이라도 OK. **"왜 지금 이 기술인가?"(Pain Point 해결)**에 집중할 것.
   - **Validation (Objective):** VC 자금 흐름과 Google Trends 기울기 확인.

3. 출력 형식 및 제약 (★Strict Constraints):
   - **서술형 허용:** 기술의 맥락(Why)을 이해할 수 있도록 2~3문장 설명 포함.
   - **인사이트 필수:** 단순 현상(What) 나열에 그치지 말고, 이것이 시장 판도를 어떻게 바꿀지(Impact) 설명해 줘.
   - **점수 로직:** 기술의 혁신성이 아니라, **'보수적 투자자가 진입 가능한지'**를 기준으로 점수 매길 것.

4. 리포트 포맷:

[🔭 Part 1. 감지된 넥스트 트렌드 (Aggressive Search)]
* 핵심 키워드: [기술명/프로젝트명]
* [Why Now?] 개발자들이 왜 여기에 열광하는가? (기존 기술의 한계와 해결책)
* [Buzz Check] GitHub/커뮤니티의 구체적 반응.

[💰 Part 2. 자금과 확산]
* [Smart Money] VC들이 어디에 돈을 쓰고 있는가?
* [Trend Velocity] 대중 확산 단계 진단 (초기/확산/대세).
* [Macro Check] M2(유동성) 환경이 이 기술 성장을 뒷받침하는가?

[⚖️ Part 3. 보수적 투자 매력도 (Conservative Scoring)] (★핵심 변경)
* **점수: X점 / 10점**
  - **감점 요인:** 관련 ETF 없음(-2), 적자 스타트업만 존재(-3), 기술 표준 미확립(-2).
  - **가산 요인:** 빅테크(MS, Apple 등)가 주도함(+3), 관련 우량주 존재(+2), 하드웨어 인프라 단계(+2).
  
  * **0~4점 (관심종목 등록):** 기술은 혁신적이나, 투자하기엔 위험함. (Wait)
  * **5~7점 (소액 정찰병):** 우량주를 통한 간접 투자 가능. (Nibble)
  * **8~10점 (비중 확대):** 기술 검증 완료 + 안전한 투자처 확보됨. (Buy)

[⚔️ Part 4. 차세대 기술 대진표 (Candidates)]
* (현재 패권 다툼 중인 기술/진영 나열)
1. [후보 A] vs [후보 B]

[💡 Action Plan]
* **투자 대상:** (잡주/동전주 제외. 시총 상위 우량주 or ETF만 추천)
* **결론:** (보수적 투자자를 위한 최종 조언)
`;
   }
}

function ReportNasdaqStrategyReporter() {
   new NasdaqStrategyReporter().execute();
}
