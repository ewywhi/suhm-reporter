class NasdaqTacticsReporter extends ReporterBase {
    constructor() {
        super();

        this.botToken = Telegram.Suhmplus.BotToken;
        this.chatId = Telegram.Suhmplus.ChatId_미래;
        this.useSearch = true;

        // Nasdaq
        this.type = ReportType.NasdaqTactics;
        this.title = "나스닥 포트폴리오 리포트";
    }

    generatePrompt(data) {
        const today = Utilities.formatDate(new Date(), "GMT+9", "yyyy년 MM월 dd일");

        return `
[작성 기준일: ${today}]

[나스닥 보유 종목 정밀 점검 요청]
1. 분석 대상 (4종목): 엔비디아(NVDA), 메타(META), 구글(GOOGL), 넷플릭스(NFLX)
2. 페르소나:
너는 IT 기술에 대한 이해도가 높은 주식 투자 전문가야. 나는 IT 종사자로서 기업의 '기술적 해자'와 '제품 경쟁력'을 중요하게 생각해. 객관적인 데이터와 출처에 기반해서 분석해 줘.
3. 분석 절차 및 형식 (엄수):
STEP 1. 시장 전체 현황

나스닥 종합지수 흐름과 **VIX(공포지수)**를 먼저 체크할 것.
출처 예시: Google Finance, Yahoo Finance 등
STEP 2. 개별 종목 정밀 분석 (종목별로 아래 포맷 유지)
[종목명: Ticker]
(1) 주요 뉴스 및 호재/악재 (Fact Check)

최신 뉴스, 실적 발표, 월가 리포트 내용을 기반으로 호재와 악재를 정리해 줘.
반드시 날짜와 출처를 명시할 것.
작성 예시:
[2024-05-20, 블룸버그] 엔비디아, 차세대 칩 블랙웰 생산 일정 앞당겨... (호재)
[2024-05-19, 로이터] 미국 법무부, 구글 반독점 소송 관련 추가 증거 제출 (악재)
(2) 기술적 지표 분석

웹 검색을 통해 최신 지표 수치를 확인하고 해석해 줘.
확인 지표: 주가 이동평균선(20일/60일/120일) 위치, RSI(상대강도지수), MACD, 볼린저 밴드, 거래량 추이.
작성 예시:
이동평균선: 현재 60일선 위에 안착하여 상승 추세 유지 중 (출처: Yahoo Finance)
RSI: 현재 75로 과매수 구간 진입, 단기 조정 가능성 있음
볼린저 밴드: 밴드 폭이 좁아지며 변동성 축소, 조만간 방향성 결정될 듯
STEP 3. IT 종사자를 위한 종합 제언

위 데이터를 종합하여 [비중 확대 / 홀드 / 부분 익절 / 전량 매도] 중 하나의 포지션을 제안해 줘.
기술적 관점(차트)과 펀더멘털 관점(뉴스/기술력)이 충돌할 경우, 어떻게 대응하는 게 좋을지 조언해 줘.
`;
    }
}
