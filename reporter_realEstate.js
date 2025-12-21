class RealEstateReporter extends ReporterBase {
    constructor() {
        super();

        // this.botToken = Telegram.Suhmplus.BotToken;
        // this.chatId = Telegram.Suhmplus.ChatId_미래;

        this.type = ReportType.RealEstate;
        this.title = `이사 계획 점검 리포트`;
        this.useSearch = true;

        // 공공 데이터 포털
        this.dataPortalDecodingKey = 'e73c3a51d184a5fe3b3d5be01a73e3033bc57ea4f9887be7b4f8157c69462f52';
        this.aptService = new AptTransactionService(this.dataPortalDecodingKey);

        this.dataLookBackMonths = 3; // 분석 기간
        this.dataTarget = { name: '오포e편한세상', code: '41610', dong: '신현동', apt: '오포e편한세상' };
        this.dataBenchmarks = [ // 비교군
            { name: '분당 장안타운', code: '41135', dong: '분당동', apt: '장안' },
            // { name: '서현 시범단지', code: '41135', dong: '서현동', apt: '시범' }
        ];
        this.dataSubstitues = [ // 대체지
            // { name: '태전지구', code: '41610', dong: '태전동', apt: ''}, // 태전동 전체
            { name: '용인 모현(힐스테이트)', code: '41461', dong: '모현읍', apt: '힐스테이트' }
        ];

        // Gemini 검색 키워드 (useSearch=true 이므로 Gemini가 직접 검색)
        this.searchKeywords = ['경기 광주 신현동 교통 호재', '신현동 8호선 태재고개', '오포 e편한세상 시세'];
    }

    fetchData() {
        // 실거래 데이터 수집 (뉴스는 Gemini 검색으로 대체 - useSearch=true)
        const target = this.aptService.getAnalysis(this.dataTarget, 6);

        const abench = {};
        this.dataBenchmarks.forEach(b => {
            abench[b.name] = this.aptService.getAnalysis(b, 6);
        });

        const sub = {};
        this.dataSubstitues.forEach(s => {
            sub[s.name] = this.aptService.getAnalysis(s, 6);
        });

        return {
            target: target,
            benchmarks: abench,
            substitues: sub,
        };
    }

    generatePrompt(data) {
        const today = Utilities.formatDate(new Date(), "GMT+9", "yyyy년 MM월 dd일");

        const targetText = this._formatStatsText(data.target);
        const benchText = Object.keys(data.benchmarks).map(name =>
            `[${name}]\n${this._formatStatsText(data.benchmarks[name])}`
        ).join('\n');
        const subText = Object.keys(data.substitues).map(name =>
            `[${name}]\n${this._formatStatsText(data.substitues[name])}`
        ).join('\n');

        return `
- 현재 날짜: **${today}**

너는 대한민국 부동산 시장 전문가야. 
나의 '타겟 아파트(${this.dataTarget.name}, 경기 광주 신현동)' 매수 결정을 위해 아래 데이터를 기반으로 심층 분석 리포트를 작성해 줘.

### 1. 시장 데이터 (최근 ${this.dataLookBackMonths}개월)

**(1) 타겟 단지 흐름**
${targetText}

**(2) 비교군 흐름 (Gap)**
${benchText}

**(3) 대체지 흐름 (공급)**
${subText}

---
### 2. 웹 검색 요청
위 실거래 데이터 분석 전, 아래 키워드로 최신 뉴스/기사를 검색하여 참고하십시오:
${this.searchKeywords.map(k => `- "${k}"`).join('\n')}

---
### 3. 작성 요청 사항 (분석 프레임워크)

**Step 1: 타겟 자체 경쟁력 분석**
- 검색한 뉴스에서 언급된 이슈(교통, 호재 등)가 현재 시세에 반영되었는지, 선반영인지 분석.
- 거래량 증감 추세를 보고 매수 심리를 판단.

**Step 2: 비교군(Benchmark) 대비 가성비(Gap) 분석**
- 분당 등 상급지의 흐름과 타겟의 흐름 비교.
- 핵심: 과거 대비 갭이 벌어졌다면(저평가) 기회이고, 좁혀졌다면(고평가) 주의.

**Step 3: 대체지(Substitute) 위협 분석**
- 인근 대체지(태전, 용인)의 시세 급락이나 물량 부담이 타겟 수요를 뺏어갈 가능성 진단.

**Step 4: 최종 매수 의견 (Conclusion)**
- [강력 매수 / 분할 매수 / 관망 / 매수 보류] 중 하나의 포지션을 선택.
- 이유를 논리적으로 설명하고, 마지막에 **[타겟 vs 비교군 월별 가격 흐름]**을 Markdown Table로 요약.
    `;
    }

    /**
     * 월별 × 면적별 stats를 텍스트로 포맷팅
     * @param {Object} stats - { '2024-12': { '147.23': { avg, count }, ... }, ... }
     */
    _formatStatsText(stats) {
        const sortedMonths = Object.keys(stats).sort().reverse();
        if (sortedMonths.length === 0) return "거래 내역 없음";

        let lines = [];
        for (const month of sortedMonths) {
            const areas = stats[month];
            const areaTexts = Object.keys(areas)
                .sort((a, b) => parseFloat(a) - parseFloat(b))
                .map(area => {
                    const { avg, count } = areas[area];
                    const avgEok = Math.round(avg / 1000) / 10;
                    const pyeong = Math.round(parseFloat(area) / 3.3058);
                    return `${pyeong}평(${area}㎡) ${avgEok}억×${count}건`;
                });
            lines.push(`- ${month}: ${areaTexts.join(', ')}`);
        }
        return lines.join('\n');
    }

}



/**
 * 국토부 실거래가 데이터 처리 전담 클래스
 * 역할: 수집(Fetch) -> 정제(Parse) -> 통계(Stats) -> 포맷팅(Format)
 */
class AptTransactionService {
    constructor(decodingKey) {
        this.decodingKey = decodingKey;
    }

    /**
     * 메인 메서드: 특정 타겟의 N개월치 데이터를 수집하고 분석하여 반환
     * @returns {Object} 월별 × 면적별 평균가격/건수 { '2024-12': { '147.23': { avg, count }, ... }, ... }
     */
    getAnalysis(targetConfig, lookBackMonths = 6) {
        const months = this._getPastMonths(lookBackMonths);
        const rawData = this._fetchRawData(targetConfig, months);
        return this._calcStats(rawData);
    }

    // --- [Private] Fetch & Parse ---

    _fetchRawData(target, months) {
        let resultList = [];

        for (const yyyymm of months) {
            const url = `http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev` +
                `?serviceKey=${encodeURIComponent(this.decodingKey)}` +
                `&pageNo=1&numOfRows=100&LAWD_CD=${target.code}&DEAL_YMD=${yyyymm}`;

            try {
                const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
                const doc = XmlService.parse(response.getContentText());
                const items = doc.getRootElement().getChild('body')?.getChild('items')?.getChildren('item');

                items.forEach(item => {
                    const dongVal = this._getText(item, 'umdNm');
                    const aptVal = this._getText(item, 'aptNm');

                    if (dongVal.includes(target.dong) && (!target.apt || aptVal.includes(target.apt))) {
                        const year = this._getText(item, 'dealYear');
                        const month = this._getText(item, 'dealMonth');
                        const day = this._getText(item, 'dealDay');

                        resultList.push({
                            date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
                            price: parseInt(this._getText(item, 'dealAmount').replace(/,/g, '')),
                            floor: parseInt(this._getText(item, 'floor')),
                            area: parseFloat(this._getText(item, 'excluUseAr'))
                        });
                    }
                });

                Utilities.sleep(50); // API 매너 딜레이
            } catch (e) {
                console.error(`DataPortal Fetch Error ${target.dong} (${yyyymm}): ${e}`);
            }
        }

        // 날짜 내림차순 정렬 (최신순)
        return resultList.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * 월별 × 면적별 평균 가격(만원 단위)과 거래 건수 계산
     * @returns {Object} { '2024-12': { '147.23': { avg: 55000, count: 2 }, ... }, ... }
     */
    _calcStats(dataList) {
        let tempMap = {}; // { ym: { area: { sum, count } } }

        // 합계 및 건수 집계
        for (const item of dataList) {
            const ym = item.date.substring(0, 7); // "2024-12"
            const area = item.area.toFixed(2); // 면적을 키로 사용

            if (!tempMap[ym]) tempMap[ym] = {};
            if (!tempMap[ym][area]) tempMap[ym][area] = { sum: 0, count: 0 };

            tempMap[ym][area].sum += item.price;
            tempMap[ym][area].count += 1;
        }

        // 평균 계산
        let finalStats = {};
        for (const ym in tempMap) {
            finalStats[ym] = {};
            for (const area in tempMap[ym]) {
                const data = tempMap[ym][area];
                finalStats[ym][area] = {
                    avg: Math.round(data.sum / data.count),
                    count: data.count
                };
            }
        }

        return finalStats;
    }

    // --- Utils ---

    _getText(item, tagName) {
        const child = item.getChild(tagName);
        return child ? child.getText().trim() : '';
    }

    _getPastMonths(n) {
        let list = [];
        let d = new Date();
        for (let i = 0; i < n; i++) {
            const y = d.getFullYear();
            const m = (d.getMonth() + 1).toString().padStart(2, '0');
            list.push(`${y}${m}`);
            d.setMonth(d.getMonth() - 1);
        }
        return list;
    }
}

function _testRealEstatePrompt() {
    reporter = new RealEstateReporter();

    console.log('prompt', reporter.generatePrompt(reporter.fetchData()));
}

function _testRealEstateReporter() {
    new RealEstateReporter().execute();
}







