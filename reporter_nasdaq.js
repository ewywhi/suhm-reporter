class NasdaqReporter extends ReporterBase {
    constructor() {
        super();

        this.botToken = Telegram.Suhmplus.BotToken;
        this.chatId = Telegram.Suhmplus.ChatId_미래;
        this.useSearch = true;

        // Nasdaq
        this.type = ReportType.Nasdaq;
        this.title = "나스닥 중장기 분석";
    }

    generatePrompt(data) {
        const today = Utilities.formatDate(new Date(), "GMT+9", "yyyy년 MM월 dd일");

        // '균형 리포트' 최종 프롬프트
        return `
[작성 기준일: ${today}]
위 날짜를 기준으로 나스닥 시장을 분석하세요. 기준일 근처의 최신 데이터를 기반으로 작성해야 합니다.

[역할: 글로벌 매크로 및 퀀트 전략가]
[분석 목표] 나스닥(NASDAQ)의 중장기 상승 동력과 잠재적 리스크 지표를 교차 검증하여, 편향되지 않은 '균형 리포트'를 작성한다.

[1. 메인 동력 분석 (The Bulls)]
- 지표 A: 이익 성장성 (S&P500/나스닥 EPS 가이던스 및 빅테크 CAPEX)
- 지표 B: 유동성 환경 (M2 통화량 및 미 연준의 통화 스탠스)
- 지표 C: 기술적 주도권 (AI 병목 구간을 해결하는 섹터의 확장성 분석)

[2. 리스크 검증 및 상충 지표 (The Bears & Validators)]
- 리스크 1 (심리): Fear & Greed Index를 통한 시장 과열 단계 측정
- 리스크 2 (신용): 하이일드 채권 스프레드를 통한 실질적 신용 위험 감지
- 리스크 3 (밸류): ERP(Equity Risk Premium) 분석
- 리스크 4 (추세): 주가와 200일 이동평균선 간의 이격도

[3. 논리적 충돌 및 종합 판단]
- 상승 동력과 리스크 지표 간 상충하는 지점 명시.
- [낙관 / 신중 / 보수] 중 의견 도출 및 종합 스코어(1~10점) 제시.

[4. 실전 투자 연결고리]
- 최적의 자산 배분 전략 및 주도주(반도체/에너지/로봇 등) 중 가성비 섹터 추천.

[출력 형식]
- 전문가용 마크다운 리포트 형식
- '지표 간 균형점 요약' 섹션 필수 포함
    `;
    }
}