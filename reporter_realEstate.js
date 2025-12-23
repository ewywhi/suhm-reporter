class RealEstateReporter extends ReporterBase {
    constructor() {
        super();

        this.botToken = Telegram.RainyFog.BotToken;
        this.chatId = Telegram.RainyFog.ChatId_알림;
        this.useSearch = true;

        this.type = ReportType.RealEstate;
        this.title = `이사 계획 점검 리포트`;

        // 공공 데이터 포털 설정
        this.dataPortalConfig = {
            decodingKey: 'e73c3a51d184a5fe3b3d5be01a73e3033bc57ea4f9887be7b4f8157c69462f52',
            lookBackMonths: 6,
            target: {
                name: '신현 e편한세상', code: '41610', dong: '신현동', apt: '오포e편한세상',
                desc: '분당과 맞닿은 태재고개 초입 대장주. 교통 체증이 단점이나 분당 접근성 최상. 40평대 이상의 대형 평수는 희소성이 높고 실거주 만족도가 중요함.'
            },
            benchmarks: [
                // 비교군 (분당권 - 선행지표)
                {
                    name: '분당 장안타운', code: '41135', dong: '분당동', apt: '장안',
                    desc: '타겟 바로 윗동네. 이곳 20평대가 신현동 30평대의 천장(Ceiling) 역할'
                },
                {
                    name: '서현 시범단지', code: '41135', dong: '서현동', apt: '시범',
                    desc: '분당 시세를 리딩하는 곳. 시장 전체 흐름의 선행지표'
                },
                {
                    name: '야탑 장미마을', code: '41135', dong: '야탑동', apt: '장미',
                    desc: '분당 내 실거주 가성비 단지 (상대적 저가). "조금 더 무리해서 야탑 갈까?" 고민하는 실거주 대체재'
                },
                // 대체지 (경쟁 지역)
                {
                    name: '광주 태전지구', code: '41610', dong: '태전동', apt: '힐스테이트',
                    desc: '계획도시라 도로가 넓고 쾌적. 신현동 교통 체증을 싫어하는 젊은 부부들이 비교'
                },
                {
                    name: '광주역 e편한', code: '41610', dong: '역동', apt: 'e편한세상',
                    desc: '경강선(광주역)이 있어 판교 출퇴근 확실. 가격 차이 좁혀지면 수요 쏠림'
                },
                {
                    name: '용인 몬테로이', code: '41461', dong: '모현읍', apt: '힐스테이트',
                    desc: '~3,700세대 입주 진행 중. 신현동 전세/매매 수요를 빨아들이는 공급 블랙홀'
                }
            ]
        };
        this.tradeFetcher = new AptTradeFetcher(this.dataPortalConfig.decodingKey);

        // Gemini 검색 키워드 (useSearch=true 이므로 Gemini가 직접 검색)
        this.searchKeywords = ['경기 광주 신현동 교통 호재', '신현동 8호선 태재고개', '오포 e편한세상 시세'];
    }

    fetchData() {
        const config = this.dataPortalConfig;
        const months = config.lookBackMonths;

        const target = this.tradeFetcher.fetch(config.target, months);

        const benchmarks = {};
        config.benchmarks.forEach(b => {
            benchmarks[b.name] = {
                desc: b.desc,
                stats: this.tradeFetcher.fetch(b, months)
            };
        });

        return {
            target: target,
            benchmarks: benchmarks,
        };
    }

    generatePrompt(data) {
        const today = Utilities.formatDate(new Date(), "GMT+9", "yyyy년 MM월 dd일");
        const config = this.dataPortalConfig;

        const targetText = this._formatStatsText(data.target);
        const benchText = Object.keys(data.benchmarks).map(name => {
            const { desc, stats } = data.benchmarks[name];
            return `**[${name}]** - ${desc}\n${this._formatStatsText(stats)}`;
        }).join('\n\n');

        return `
- 현재 날짜: **${today}**

너는 대한민국 부동산 시장 분석가야. 
내가 매수를 고려 중인 **타겟 아파트**에 대해, 비교군 및 대체지 데이터를 기반으로 매수 적기를 판단해 줘.

⚠️ **[중요: 매수자 성향]**
  - 나는 **40평형 이상의 대형 평수(전용 110㎡ 이상)**를 선호해.
  - 국민평형(34평)과는 다른 **대형 평수만의 희소성, 환금성, 대체지 공급 부족(대형 공급 유무)** 관점에서 분석해 줘.
  
타겟 아파트: **${config.target.name}**
  > 특징: ${config.target.desc}

---
## 실거래 데이터 (최근 ${config.lookBackMonths}개월)

### 타겟: ${config.target.name}
${targetText}

### 비교 지역 (Context 포함)
신현동은 분당과의 가격 갭을 메우며 **후행하는 경향**이 강해. 비교군 시세가 꺾이면 신현동은 더 빨리 식고, 급등하면 온기가 돌아.
대체지 동향에 따라 신현동 수요가 이탈할 수도 있어.

${benchText}

**[시나리오별 해석 가이드]**
- 분당(장안) 대형은 오르는데 신현동 대형은 그대로? → **강력 매수 기회** (키 맞추기 예상)
- 인근 대체지(태전/용인)에 대형 평수 공급이 없다? → **가격 방어 긍정적** (희소성)
- 용인 모현 전세가 폭락? → 전세가 동반 하락 시 갭투자 이탈로 매매가 약세 예상

---
## 웹 검색 요청
현재 시점(${today})의 타겟 지역과 관련된 최신 뉴스/기사를 검색해서 분석에 참고해줘.
아래는 참고용 키워드야 (이것만 검색하지 말고, 필요하면 다른 키워드도 자유롭게 검색해):
${this.searchKeywords.map(k => `- "${k}"`).join('\n')}

---
## 최종 리포트 작성 (요청 사항)

1. **타겟 자체 경쟁력 (대형 평수 중심)**:
    - 교통 호재(8호선, 태재고개) 영향과 더불어, 대형 평수의 거래 흐름(매물 잠김/적체)을 분석해 줘.
2. **비교 지역 분석**: 
    - 분당권 대형 평수와의 가격 격차(Gap)를 분석하여 현재 저평가 여부 판단.
3. **결론 (Action)**: 
    - 지금 시점에 **[매매 / 전세 / 월세 / 관망]** 중 어떤 전략이 유리한지 제시.
    `;
    }

    /**
     * 월별 × 면적별 stats를 텍스트로 포맷팅
     * @param {Array} stats - [{ month, area, count, avg }, ...]
     */
    _formatStatsText(stats) {
        if (!stats || stats.length === 0) return "거래 내역 없음";

        // 월별로 그룹화
        const byMonth = {};
        stats.forEach(({ month, area, count, avg }) => {
            if (!byMonth[month]) byMonth[month] = [];
            const avgEok = Math.round(avg / 1000) / 10;
            const pyeong = Math.round(area / 3.3058);
            byMonth[month].push(`${pyeong}평(${area}㎡) ${avgEok}억×${count}건`);
        });

        return Object.keys(byMonth)
            .sort().reverse()
            .map(month => `- ${month}: ${byMonth[month].join(', ')}`)
            .join('\n');
    }
}



/**
 * 공공데이터포털 아파트 실거래가 Fetcher
 * 역할: 수집(Fetch) -> 정제(Parse) -> 월별×면적별 집계(Stats)
 */
class AptTradeFetcher {
    constructor(decodingKey) {
        this.decodingKey = decodingKey;
    }

    /**
     * 특정 타겟의 N개월치 실거래 데이터를 수집하여 월별×면적별 통계로 반환
     * @returns {Array} [{ month, area, count, avg }, ...]
     */
    fetch(targetConfig, lookBackMonths = 6) {
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
     * @returns {Array} [{ month, area, count, avg }, ...]
     */
    _calcStats(dataList) {
        let tempMap = {}; // { 'ym|area': { sum, count } }

        // 합계 및 건수 집계
        for (const item of dataList) {
            const month = item.date.substring(0, 7); // "2024-12"
            const area = parseFloat(item.area.toFixed(2));
            const key = `${month}|${area}`;

            if (!tempMap[key]) tempMap[key] = { month, area, sum: 0, count: 0 };
            tempMap[key].sum += item.price;
            tempMap[key].count += 1;
        }

        // 평균 계산 및 리스트 변환
        return Object.values(tempMap)
            .map(({ month, area, sum, count }) => ({
                month,
                area,
                count,
                avg: Math.round(sum / count)
            }))
            .sort((a, b) => b.month.localeCompare(a.month) || a.area - b.area);

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

function ReportRealEstate() {
    new RealEstateReporter().execute();
}

// function _testRainyfogTelegram() {
//     reporter = new RealEstateReporter();
//     sendTelegram(reporter.botToken, reporter.chatId, `알림 테스트`);
// }
