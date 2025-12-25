const ReportType = {
    None: 'none',
    NasdaqTactics: 'NasdaqTactics',
    NasdaqStrategy: 'NasdaqStrategy',
    Crypto: 'Crypto',
    RealEstate: 'RealEstate',
};

class ReporterBase {
    constructor() {
        // Apps Script
        this.webAppUrl = WebAppUrl;
        this.sheetId = ReportSheetId;
        this.sheetName = ReportSheetName;

        // Telegram
        this.botToken = Telegram.Dylee.BotToken;
        this.chatId = Telegram.Dylee.ChatId_General;

        // Gemini
        this.apiKey = GEMINI.API_KEY;;
        this.summaryModelName = 'gemini-flash-latest';
        this.reportModelName = 'gemini-flash-latest';
        this.useSearch = false;
        this.reportTemperature = 0.2;
        this.summaryTemperature = 0.2;
        this.reportRule = `\n
[📚 참고 자료 (References)]
* 분석에 인용된 모든 기사와 리포트의 출처를 정리하시오.
* **필수 포맷:** - YYYY-MM-DD, [기사 제목](URL)
  (반드시 **클릭 가능한 마크다운 하이퍼링크** 문법을 적용할 것)

* **★엄격한 문법 준수 가이드 (Strict Syntax Rules)★**:
  1. **Raw URL 금지:** URL을 괄호 안에 텍스트로 보여주지 말고, 제목에 링크를 걸 것.
     - (Bad): - 2025-12-24, 엔비디아 전망 (https://...)
     - (Good): - 2025-12-24, [엔비디아 전망](https://...)
  
  2. **대괄호 충돌 방지:** 기사 제목 안에 있는 대괄호 '[' 나 ']' 는 마크다운 링크 문법을 깨뜨림. 반드시 소괄호 '(' 와 ')' 로 바꾸거나 삭제할 것.
     - (Bad): - 2025-12-24, [[속보] 구글 급등](https://...) -> *링크 깨짐*
     - (Good): - 2025-12-24, [(속보) 구글 급등](https://...) -> *링크 정상*
  
  3. **제목 정제:** 사이트 이름(예: naver.com) 대신 기사의 **실제 헤드라인**을 제목으로 사용할 것.
`;
        this.summaryRule = `
[텔레그램 알림용 초압축 요약 요청]

너는 바쁜 투자자를 위해 긴 리포트를 스마트폰 화면 하나에 들어오도록 요약하는 '브리핑 비서'야.
아래 [상세 리포트] 내용을 바탕으로, **텔레그램 메시지용 요약본**을 작성해 줘.

[엄격한 작성 규칙 (Strict Constraints)]
1. **마크다운 금지:** **, ##, --- 등의 마크다운 문법을 절대 사용하지 마시오. (메시지가 깨짐)
2. **강조:** 강조할 단어는 반드시 HTML 태그인 <b>단어</b> 형식을 사용하시오.
3. **구조 (순서 엄수):**
   - **제목:** 📊 [리포트 제목] (이모지 포함)
   - **결론 (한 문장):** 최종 결론을 명확히 서술. 한 줄 띄우기.
   - **핵심 근거 (3가지):**
     * 글머리 기호(•) 사용.
     * 각 항목은 "~함", "~임"으로 간결하게 끝낼 것.
     * 가장 중요한 타겟에 대한 구체적 액션과 수치를 포함할 것

** 아래는 상세 리포트 전문
`;

        // have to override
        this.type = ReportType.None;
        this.title = "No Title";
    }

    // 모니터링 모드
    // Alert Signal 이 있다면 리포트 발행
    monitor() {
        try {
            console.log(`[Monitor] ${this.title}`);

            // --- fetchData 와 analyzeSignals 는 하위 클래스에서 관리 ---

            const data = this.fetchData();
            const signals = this.analyzeSignals(data);

            if (!signals || signals.length === 0) {
                console.log(`[Monitor] 특이사항 없음. 종료.`);
                return;
            }

            // --- 이하 공통 동작 ---

            console.log(`🚨 신호 감지됨: ${signals.join(', ')} -> 리포트 발행 시작`);

            this.type = `${this.type}-ALERT`; // 리포트 ID 구분
            this.title = `🚨 [ALERT] ${this.title || ''} ${signals.join(', ')}`;
            this.execute(data);

        } catch (e) {
            this._handleError(e);
        }
    }

    // 리포트 발행 모드
    execute(injectedData = null) {
        try {
            console.log(`[Report] ${this.title}`);

            // --- Data 와 Prompt 는 하위 클래스에서 관리 ---

            const data = injectedData || this.fetchData();
            if (!data) throw new Error("데이터를 가져올 수 없습니다.");

            const reportPrompt = this.generatePrompt(data).trimStart() + '\n\n' + this.reportRule;
            console.log('reportPrompt', reportPrompt);

            // --- 이하 공통 로직 ---

            // gemini
            const reportResult = suhmlib.gemini_fetch(this.apiKey, reportPrompt, this.reportModelName, this.useSearch, this.reportTemperature);
            console.log('reportResult', reportResult.text);

            const summaryPrompt = this.summaryRule.trimStart() + '\n\n' + reportResult.text;
            console.log('summaryPrompt', summaryPrompt);

            const summaryResult = suhmlib.gemini_fetch(this.apiKey, summaryPrompt, this.summaryModelName, false, this.summaryTemperature);
            console.log('summaryResult', summaryResult.text);

            // report id
            const dateStr = Utilities.formatDate(new Date(), "GMT+9", "yyyyMMdd");
            const timestamp = new Date().getTime();
            const reportId = `${this.type}-${dateStr}-${timestamp}`;
            console.log('reportId', reportId);

            // link
            const reportUrl = `${this.webAppUrl}?action=viewReport&id=${reportId}`;
            console.log('reportUrl', reportUrl);

            // usage
            const tracker = suhmlib.newGeminiTokenTracker();
            tracker.add(this.reportModelName, reportResult.usage);
            tracker.add(this.summaryModelName, summaryResult.usage);
            console.log(`tracker usage: ${tracker.getUsage()}, estimated price: $${tracker.getCost().toFixed(4)}`);

            // save
            const sheet = SpreadsheetApp.openById(this.sheetId).getSheetByName(this.sheetName);
            sheet.appendRow([reportId, new Date(), reportResult.text, this.type, summaryPrompt, summaryResult.text, reportUrl, reportPrompt, tracker.getUsage(), tracker.getCost().toFixed(4)]);

            // send
            const htmlSummary = suhmlib.string_md_to_html(summaryResult.text);
            const message = `📊 <b>${this.title}</b>\n\n${htmlSummary}\n\n🔗 <a href="${reportUrl}">상세 리포트 보기 (Click)</a>`;
            sendTelegram(this.botToken, this.chatId, message, "HTML");

            console.log(`[Report] 리포트 발행 완료!`);
        } catch (e) {
            this._handleError(e);
        }
    }


    // --- Abstract Methods ---
    //     하위 클래스에서 재정의해서 사용

    fetchData() { return {}; }
    analyzeSignals(data) { return []; }
    generatePrompt(data) { throw new Error("Method not implemented"); }

    // --- 공용 도우미 함수들 ---

    // private
    _handleError(e) {
        console.error(e);
        // 에러는 평문으로 보내자. 혹시나 파싱 에러로 씹히면 안되므로
        sendTelegram(this.botToken, this.chatId, `⚠️ ${this.title} Error: ${e.toString()}`);
    }
}

function _testGeminiTokenTracker() {
    let tracker = suhmlib.newGeminiTokenTracker();
    console.log(`tracker usage: ${tracker.getUsage()}, estimated price: $${tracker.getCost().toFixed(4)}`);
}
