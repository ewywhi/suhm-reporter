const ReportType = {
    None: 'none',
    Nasdaq: 'Nasdaq',
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
        this.apiKey = 'AIzaSyAUzV11Ml95p3ZMFd95ckc_e6M_XsRrhtM';
        this.summaryModelName = 'gemini-flash-latest';
        this.reportModelName = 'gemini-flash-latest';
        this.useSearch = false;
        this.reportRule = `\n
**📚 참고 자료 (References)**
- 마지막에 참고 문헌 챕터를 만들고 기사 제목과 링크를 적어줘
- 검색에 활용된 주요 기사나 리포트의 **'정확한 제목'**과 **'링크(URL)'**를 리스트로 작성하십시오.
- 기사 제목에서 마크다운 문법과 충돌하는 내용은 제거해야 함.
- 형식: - [기사 제목](URL)
- 사이트 이름(예: naver.com) 대신 기사의 헤드라인을 제목으로 쓰십시오.
`;
        this.summaryRule = `
    핵심 내용 3가지를 텔레그램 메시지용으로 요약해줘.
[엄격한 작성 규칙]
- **절대 마크다운 문법(**, ---, ## 등)을 사용하지 마시오.**
- 강조가 필요하면 반드시 HTML 태그인 <b>강조할 단어</b> 형식을 사용하시오.
- 수평선(---)이나 제목(#) 문법을 쓰지 마시오.
- 표 대신 리스트(글머리 기호)로 요약하시오.
- 첫 줄에 리포트의 결론(매수/매도/관망)을 한 문장으로 명확히 적고, 한 줄 띄운 뒤, 
- 핵심 근거 3가지를 글머리 기호(•)를 사용하여 개조식으로 작성하시오.
- 문장은 간결하게 끝맺을 것 (~함, ~임).
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

            const prompt = this.generatePrompt(data);
            console.log('prompt', prompt);

            // --- 이하 공통 동작 ---

            // gemini
            const reportResult = suhmlib.gemini_fetch(this.apiKey, prompt + '\n' + this.reportRule, this.reportModelName, this.useSearch);
            const summaryResult = suhmlib.gemini_fetch(this.apiKey, reportResult.text + "\n" + this.summaryRule, this.summaryModelName, false);
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

function ReportNasdaq() {
    new CryptoReporter("ETH").execute();
}

function ReportETH() {
    new CryptoReporter("ETH").execute();
}

function MonitorETH() {
    new CryptoReporter("ETH").monitor();
}

function ReportBTC() {
    new CryptoReporter("BTC").execute();
}

function MonitorBTC() {
    new CryptoReporter("BTC").monitor();
}

function ReportRealEstate() {
    new RealEstateReporter().execute();
}
