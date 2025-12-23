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
**📚 참고 자료 (References)**
* 마지막에 참고 문헌 챕터를 만들고, 분석에 인용된 모든 기사와 리포트의 출처를 이 섹션에 모아서 정리할 것.
* 작성 형식: "- YYYY-MM-DD, [기사 제목](URL)"
* ★중요 문법 지침★:
  1. 기사 제목 안에 있는 대괄호 '[', ']'는 마크다운 링크 문법과 충돌하므로 반드시 소괄호 '(', ')'로 바꾸거나 제거할 것.
     - (Bad): - 2025-12-20, [[속보] 엔비디아 급등](http://...)
     - (Good): - 2025-12-20, [(속보) 엔비디아 급등](http://...)
  2. 사이트 이름(예: naver.com) 대신 '기사의 실제 헤드라인'을 제목으로 쓸 것.
  3. 링크(URL)가 없는 지식은 출처로 적지 말 것.
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

            const prompt = this.generatePrompt(data).trimStart();
            console.log('prompt', prompt);

            // --- 이하 공통 동작 ---

            // gemini
            const reportResult = suhmlib.gemini_fetch(this.apiKey, prompt + '\n' + this.reportRule, this.reportModelName, this.useSearch, this.reportTemperature);
            const summaryResult = suhmlib.gemini_fetch(this.apiKey, this.summaryRule + "\n\n" + + reportResult.text, this.summaryModelName, false, this.summaryTemperature);
            console.log('summary', summaryResult.text);

            // report id
            const dateStr = Utilities.formatDate(new Date(), "GMT+9", "yyyyMMdd");
            const timestamp = new Date().getTime();
            const reportId = `${this.type}-${dateStr}-${timestamp}`;
            console.log('reportId', reportId);

            // link
            const reportUrl = `${this.webAppUrl}?action=viewReport&id=${reportId}`;
            console.log('reportUrl', reportUrl);

            // usage
            const tracker = new TokenTracker();
            tracker.add(this.reportModelName, reportResult.usage);
            tracker.add(this.summaryModelName, summaryResult.usage);
            console.log('usage', tracker.toJson());

            // save
            const sheet = SpreadsheetApp.openById(this.sheetId).getSheetByName(this.sheetName);
            sheet.appendRow([reportId, new Date(), reportResult.text, this.type, summaryResult.text, reportUrl, prompt, tracker.toJson()]);

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

// 토큰 사용량 집계
class TokenTracker {
    constructor() {
        this.usageData = {}; // 데이터 저장소
    }

    add(modelName, usage) {
        if (!usage) return;

        if (!this.usageData[modelName]) {
            this.usageData[modelName] = { input: 0, output: 0 };
        }

        this.usageData[modelName].input += (usage.promptTokenCount || 0);
        this.usageData[modelName].output += (usage.candidatesTokenCount || 0);
    }

    toJson() {
        return JSON.stringify(this.usageData);
    }
}
