class CryptoReporter extends ReporterBase {
    constructor(ticker) {
        super();

        this.botToken = Telegram.Suhmplus.BotToken;
        this.chatId = Telegram.Suhmplus.ChatId_미래;
        this.useSearch = true;

        // Crypto
        this.ticker = ticker.toUpperCase();
        this.type = `${ReportType.Crypto}-${this.ticker}`;
        this.title = `${ReportType.Crypto} ${this.ticker} 시장 분석`;
        this.candleCount = 60; // 넉넉하게 60일치 캔들 가져오기 (다이버전스 확인용)
        this.rsiPeriod = 14;
        this.alertThresholds = {
            rsiHigh: 70,    // 과매수 기준
            rsiLow: 30,     // 과매도 기준
            volumeRatio: 2.0, // 거래량 2배 폭발
            checkDivergence: true // 다이버전스 체크 여부
        };
    }

    fetchData() {
        // 캔들 데이터 확보 (최근 60주 - RSI, 볼륨, 다이버전스 분석용)
        let candles = this._fetchUpbitWeeklyCandles(this.ticker, 60);

        if (!candles || candles.length === 0) {
            throw new Error(`${this.ticker} 캔들 데이터를 불러올 수 없습니다.`);
        }

        // 마지막 캔들이 완성되지 않은 경우(7일 미만) 삭제
        // 주봉은 월요일 00:00 UTC 시작, 다음 월요일 00:00 UTC 종료
        const lastCandle = candles[candles.length - 1];
        const incompleteInfo = this._isIncompleteWeeklyCandle(lastCandle);
        if (incompleteInfo) {
            console.log(`마지막 주봉이 불완전함 (${incompleteInfo.daysPassed}일차) - 삭제 후 이전 주봉 사용`);
            candles.pop(); // 미완성 주봉 삭제
        }

        const candle = candles[candles.length - 1];
        const candleDate = new Date(candle.timestamp);
        const rsiArray = this._calculateRsiArray(candles, 14);
        const currentRsi = rsiArray[rsiArray.length - 1];

        // RSI 최근 5주 추세 (변화 방향 파악용)
        const rsiTrend = rsiArray.slice(-5).map(v => v.toFixed(1));

        // 거래량 최근 5주 추이 (평균 대비 비율로 표시)
        const recentCandles = candles.slice(-5);
        const avgVolume = candles.slice(-25, -5).reduce((sum, c) => sum + c.volume, 0) / 20; // 5주 전~25주 전 평균
        const volumeTrend = recentCandles.map(c => {
            const ratio = avgVolume > 0 ? (c.volume / avgVolume) : 1;
            return (ratio * 100).toFixed(0) + '%';
        });

        return {
            ticker: this.ticker,
            date: new Date().toISOString(),
            candleInfo: {
                lastCompletedWeek: `${candleDate.getFullYear()}년 ${candleDate.getMonth() + 1}월 ${candleDate.getDate()}일 주봉`,
                timestamp: candle.timestamp
            },
            price: {
                close: candle.close.toLocaleString() + " KRW",
                open: candle.open.toLocaleString() + " KRW",
                changeRate: ((candle.close - candle.open) / candle.open * 100).toFixed(2) + '%' // 이번 주 등락률
            },
            indicators: {
                rsi: currentRsi,
                rsiTrend: rsiTrend, // 최근 5주 RSI 추세
                divergence: this._analyzeDivergenceRaw(candles, rsiArray),
                volumeRatio: this._calculateVolumeRatio(candles),
                volumeTrend: volumeTrend, // 최근 5주 거래량 추이
                fngScore: this._fetchFngScore()
            }
        };
    }

    analyzeSignals(data) {
        if (!data || data.indicators) return [];

        const indicators = data.indicators;

        const signals = [];

        if (indicators.rsi !== null && indicators.rsi >= this.alertThresholds.rsiHigh) {
            signals.push(this._getRsiStatus(indicators.rsi));
        }
        if (indicators.rsi !== null && indicators.rsi <= this.alertThresholds.rsiLow) {
            signals.push(this._getRsiStatus(indicators.rsi));
        }
        if (indicators.volumeRatio !== null && indicators.volRatio >= this.alertThresholds.volumeRatio) {
            signals.push(this._getVolumeStatus(indicators.volumeRatio));
        }
        if (indicators.divergence !== null) {
            signals.push(this._getDivergenceStatus(indicators.volumeRatio));
        }

        return signals;
    }

    generatePrompt(data) {
        const today = Utilities.formatDate(new Date(), "GMT+9", "yyyy년 MM월 dd일");

        // '균형 리포트' 최종 프롬프트
        return `
[시스템 설정]
- 현재 날짜: **${today}**
- 역할: 당신은 10년 차 암호화폐 전문 퀀트 애널리스트입니다.
- 어조: 냉철하고 전문적인 문체 (해요체 지양, '~다/함'체 사용)
- 목표: 제공된 데이터와 웹 검색 결과를 결합하여 심층 투자 리포트를 작성하십시오.

[제공된 정량 데이터 (Fact)]
아래 데이터는 API를 통해 실시간으로 수집된 정확한 수치이므로, 이 수치를 절대적인 기준으로 삼으십시오.
1. 종목: ${data.ticker}
2. 분석 기준 주봉: ${data.candleInfo.lastCompletedWeek}
3. 가격: ${data.price.close} (변동률: ${data.price.changeRate})
4. RSI(14): ${data.indicators.rsi.toFixed(1)} (${this._getRsiStatus(data.indicators.rsi)})
   - 최근 5주 RSI 추세: [${data.indicators.rsiTrend.join(' → ')}] ${this._getRsiTrendStatus(data.indicators.rsiTrend)}
5. 다이버전스: ${this._getDivergenceStatus(data.indicators.divergence)}
6. 거래량: ${this._getVolumeStatus(data.indicators.volumeRatio)}
   - 최근 5주 거래량 추이 (평균 대비): [${data.indicators.volumeTrend.join(' → ')}]
7. 공포탐욕지수: ${this._getFngStatus(data.indicators.fngScore)}

[필수 검색 및 분석 지침 (Search Instructions)]
**Google 검색 도구를 적극 활용하여 아래 내용을 리포트에 반드시 포함하십시오:**

1. **BTC MVRV 확인 (필수 - 시장 과열도 판단 지표):**
   - **검색 우선순위:** "MVRV Ratio"를 우선 검색하고, Ratio를 찾지 못한 경우에만 "MVRV Z-Score"를 대안으로 활용하십시오.
   - **검색 대상:** 반드시 **비트코인(BTC)** MVRV를 검색하십시오. (알트코인 MVRV는 신뢰할 수 있는 실시간 데이터 소스가 없으므로, BTC MVRV를 암호화폐 시장 전반의 과열도 지표로 활용)
   - **참고 사이트 (신뢰도 높은 순):**
     - blockchain.com/explorer/charts/mvrv (무료, 실시간, Ratio)
     - bitcoinmagazinepro.com/charts/mvrv-zscore (Z-Score)
     - glassnode.com (유료지만 검색 결과에 값이 노출될 수 있음)
     - theblock.co/data/on-chain-metrics/bitcoin
   - **검색 쿼리 (순서대로 시도):**
     1) "Bitcoin MVRV ratio ${today}"
     2) "BTC MVRV ratio today"
     3) "Bitcoin MVRV Z-Score today" (Ratio를 못 찾은 경우)
   - **⚠️ 날짜 검증 (매우 중요 - 반드시 준수):**
     - 검색 결과에서 MVRV 수치를 발견하면, 해당 데이터의 **기준 날짜**를 반드시 확인하십시오.
     - 오늘은 **${today}**입니다.
     - ✅ **허용**: 기준 날짜가 ${today} 또는 어제(1일 전)인 데이터만 사용
     - ❌ **거부**: 2일 이상 지난 데이터는 **절대 사용 금지**. 오래된 데이터를 사용하느니 차라리 생략하십시오.
     - ❌ **거부 예시**: "12월 18일 기준" 데이터를 12월 22일 리포트에 사용하는 것은 금지
   - **최신 데이터를 찾지 못한 경우:**
     - 대시보드에 "⚠️ BTC MVRV: 최신 데이터(24시간 이내) 확보 실패"라고 정직하게 표기
     - 점수 산정에서 MVRV 항목 제외
   - **표기 시 주의:** 리포트에 MVRV를 기재할 때 **"BTC MVRV Ratio"** 또는 **"BTC MVRV Z-Score"**를 명확히 구분하여 표기하고, 기준 날짜와 출처도 함께 기재하십시오.
   - **MVRV Ratio 해석 기준:**
     - Ratio < 1: 저평가 (매수 기회)
     - Ratio 1~2: 적정 가치
     - Ratio 2~3: 고평가 주의
     - Ratio 3+: 과열/매도 신호
   - **MVRV Z-Score 해석 기준 (Ratio를 못 찾은 경우 대안):**
     - Z-Score < 0: 저평가 (매수 기회)
     - Z-Score 0~2: 적정 가치
     - Z-Score 2~4: 고평가 주의
     - Z-Score 4+: 과열/매도 신호

2. **가격 변동 원인 파악:** 오늘 혹은 최근 24시간 내에 ${data.ticker} 가격에 영향을 미친 주요 뉴스(호재/악재, 규제, 해킹, 거시경제 이슈 등)를 검색하여 "시황 분석" 파트에 구체적으로 서술하십시오.

3. **데이터와 뉴스 연결:**
   - 예: "가격이 급락했는데(데이터), 검색해보니 SEC 소송 뉴스가 원인이었다(뉴스)."
   - 예: "거래량이 폭발했는데(데이터), 이는 바이낸스 상장 이슈 때문이다(뉴스)."

4. **최신 전망 확인:** 유명 트레이더나 기관의 최신 ${data.ticker} 분석 의견이 있다면 짧게 인용하십시오.

[리포트 작성 양식]
1. **헤드라인** 
  - 현재 시장 상황을 관통하는 한 줄 요약 (자극적이지 않게, 전문적으로)

2. **[핵심 지표 대시보드]**
  - 입력된 모든 지표 데이터를 독자가 한눈에 보기 좋게 **마크다운 표(Table)** 형태로 정리하십시오.
  - 컬럼 구성: | 지표명 | 수치/상태 | 비고(해석) |
  - 예시:
    | RSI | 75.2 (과매수) | 차익 실현 욕구 증가 |
    | BTC MVRV | 2.35 (고평가 주의) - ${today} 기준 | 암호화폐 시장 과열도 판단 |
    | BTC MVRV | ⚠️ 데이터 미확인 | 최신 데이터 검색 실패 |

3. **[심층 시장 분석]**
  - 위 지표들과 웹 검색 결과(뉴스)를 결합하여 현재 상황을 분석하십시오.
  - 단순히 "올랐다"가 아니라 "왜(Why)" 올랐는지 인과관계를 설명하십시오.
  - 특히 **다이버전스**나 **거래량 폭발**이 발생했다면 이를 핵심 근거로 다루십시오.

4. **[최종 결론]**
  - **투자 매력도:** 0~100점 척도로 현재 투자 매력도를 수치화하십시오. (예: 🟢 72/100)
    - 🔴 0~20: 매도 권고 (즉시 탈출)
    - 🟠 21~40: 비중 축소 (일부 정리)
    - 🟡 41~60: 관망 (뚜렷한 방향성 없음)
    - 🟢 61~80: 분할 매수 (기회 포착)
    - 🔵 81~100: 적극 매수 (최적의 진입 시점)
  - **점수 산출 근거:** RSI, **BTC MVRV Ratio (확인된 경우에만, 기준 날짜 명시)**, 다이버전스, 거래량, 공포탐욕지수 등 각 지표가 점수에 미친 영향을 간략히 서술하십시오. MVRV 데이터를 확인할 수 없었다면 해당 지표는 점수 산정에서 제외하고 그 사실을 명시하십시오.
  - **포지션:** 점수에 따라 **[적극 매수 / 분할 매수 / 관망 / 비중 축소 / 매도]** 중 하나를 명시하십시오.
  - **핵심 근거:** 이유를 3줄 이내로 요약하십시오.
    `;
    }

    // --- Helper Methods ---

    // 마지막 주봉이 불완전한지 확인 (7일 미만)
    // 주봉은 월요일 00:00 UTC 시작 -> 다음 월요일 00:00 UTC 종료
    _isIncompleteWeeklyCandle(candle) {
        const candleStartTime = new Date(candle.timestamp);
        const now = new Date();

        // 캔들 시작일로부터 경과한 일수 계산
        const daysPassed = Math.floor((now - candleStartTime) / (1000 * 60 * 60 * 24));

        // 7일 미만이면 불완전
        if (daysPassed < 7) {
            return { daysPassed: daysPassed, candleStart: candleStartTime.toISOString() };
        }
        return false;
    }

    // Upbit 주봉 캔들 배열 가져오기 (과거 -> 최신 순)
    _fetchUpbitWeeklyCandles(ticker, count) {
        const market = `KRW-${ticker.toUpperCase()}`;
        const url = `https://api.upbit.com/v1/candles/weeks?market=${market}&count=${count}`;
        console.log('upbit fetch url', url);

        const options = {
            method: 'get',
            headers: { 'Accept': 'application/json' },
            muteHttpExceptions: true
        };

        const res = UrlFetchApp.fetch(url, options);
        if (res.getResponseCode() !== 200) {
            throw new Error(`Upbit API Error: ${res.getContentText()}`);
        }

        const json = JSON.parse(res.getContentText());
        return json.map(data => ({
            timestamp: data.timestamp,
            open: data.opening_price,
            high: data.high_price,
            low: data.low_price,
            close: data.trade_price,
            volume: data.candle_acc_trade_volume,
        })).reverse(); // [과거 -> 최신] 순으로 정렬
    }

    // RSI 배열 전체를 반환
    _calculateRsiArray(candles, period) {
        let rsiValues = [];
        let gains = 0;
        let losses = 0;

        // 초기 평균 계산
        for (let i = 1; i <= period; i++) {
            const change = candles[i].close - candles[i - 1].close;
            if (change > 0) gains += change;
            else losses -= change;
        }
        let avgGain = gains / period;
        let avgLoss = losses / period;

        // 초기 RSI
        rsiValues.push(100 - (100 / (1 + (avgGain / (avgLoss === 0 ? 1 : avgLoss)))));

        // 이후 데이터 Smoothing 계산
        for (let i = period + 1; i < candles.length; i++) {
            const change = candles[i].close - candles[i - 1].close;
            let gain = change > 0 ? change : 0;
            let loss = change < 0 ? -change : 0;

            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;

            let rs = avgGain / (avgLoss === 0 ? 1 : avgLoss); // 0 나누기 방지
            rsiValues.push(100 - (100 / (1 + rs)));
        }

        return rsiValues;
    }

    // 1. RSI 다이버전스 분석 (Return: { type: 'bull'|'bear', weeksAgo: n } or null)
    _analyzeDivergenceRaw(candles, rsiArray) {
        const currentIdx = candles.length - 1;
        const currentPrice = candles[currentIdx].close;
        const currentRsi = rsiArray[rsiArray.length - 1];

        // 신뢰도를 위해 현재 RSI가 중립 구간(35~65)이면 무시
        if (currentRsi > 35 && currentRsi < 65) return null;

        // 과거 5주 ~ 20주 전 데이터를 스캔
        for (let i = 5; i <= 20; i++) {
            // 인덱스 안전 장치
            if (currentIdx - i < 0) continue;

            const pastPrice = candles[currentIdx - i].close;
            const rsiIndex = rsiArray.length - 1 - i;

            if (rsiIndex < 0) continue;
            const pastRsi = rsiArray[rsiIndex];

            // 상승 다이버전스 (가격 하락 + RSI 상승)
            if (currentPrice < pastPrice && currentRsi > pastRsi) {
                return { type: 'bullish', weeksAgo: i };
            }

            // 하락 다이버전스 (가격 상승 + RSI 하락)
            if (currentPrice > pastPrice && currentRsi < pastRsi) {
                return { type: 'bearish', weeksAgo: i };
            }
        }

        return null; // 특이사항 없음
    }

    // 2. 거래량 비율 계산 (Return: Number(비율) or null)
    _calculateVolumeRatio(candles) {
        if (candles.length < 21) return null; // 데이터 부족

        const lastCandle = candles[candles.length - 1];

        // 직전 20주 평균 거래량 (이번 주 제외)
        const pastCandles = candles.slice(candles.length - 21, candles.length - 1);
        const avgVol = pastCandles.reduce((sum, c) => sum + c.volume, 0) / pastCandles.length;

        if (avgVol === 0) return 0; // 0 나누기 방지

        // 예: 평소의 2배면 2.0 반환
        return lastCandle.volume / avgVol;
    }

    // 3. 공포/탐욕 지수 점수만 가져오기 (Return: Number(0~100) or null)
    _fetchFngScore() {
        try {
            const url = 'https://api.alternative.me/fng/';
            const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
            if (res.getResponseCode() !== 200) {
                console.warn('FNG Fetch Error. Code: ' + res.getResponseCode() + ', Body: ' + res.getContentText());
                return null;
            }

            const json = JSON.parse(res.getContentText());
            if (!json.data || json.data.length === 0) {
                console.warn('FNG Fetch Error. Json: ' + json);
                return null;
            }

            // 문자열을 숫자로 변환하여 반환
            return parseInt(json.data[0].value, 10);
        } catch (e) {
            console.warn('FNG Fetch Error: ' + e.toString());
            return null;
        }
    }

    _getRsiStatus(rsi) {
        const rsiStr = rsi.toFixed(0);
        if (rsi >= 70) return `🔴 과매수(위험, 점수: ${rsiStr})`;
        if (rsi <= 30) return `🔵 과매도(기회, 점수: ${rsiStr})`;
        return `🟡 중립, 점수: ${rsiStr}`;
    }

    // RSI 추세 분석 (최근 5주 배열 기준)
    _getRsiTrendStatus(rsiTrend) {
        if (!rsiTrend || rsiTrend.length < 3) return '';

        const values = rsiTrend.map(v => parseFloat(v));
        const first = values[0];
        const last = values[values.length - 1];
        const diff = last - first;

        // 연속 상승/하락 체크
        let rising = 0, falling = 0;
        for (let i = 1; i < values.length; i++) {
            if (values[i] > values[i - 1]) rising++;
            else if (values[i] < values[i - 1]) falling++;
        }

        if (rising >= 3) return `📈 상승 추세 (+${diff.toFixed(1)})`;
        if (falling >= 3) return `📉 하락 추세 (${diff.toFixed(1)})`;
        if (Math.abs(diff) > 10) {
            return diff > 0 ? `↗️ 상승 중 (+${diff.toFixed(1)})` : `↘️ 하락 중 (${diff.toFixed(1)})`;
        }
        return `➡️ 횡보 중`;
    }

    _getDivergenceStatus(data) {
        if (data && data.type && data.weeksAgo) {
            if (data.type === 'bullish') return `✅ 상승 다이버전스 감지 (${data.weeksAgo}주 전과 비교)`;
            if (data.type === 'bearish') return `⚠️ 하락 다이버전스 감지 (${data.weeksAgo}주 전과 비교)`;
        }

        return 'N/A';
    }

    _getVolumeStatus(ratio) {
        if (ratio !== null) {
            const pct = (ratio * 100).toFixed(0);
            if (ratio >= 2.0) return `🔥 거래량 폭발 (평소의 ${pct}%)`;
            if (ratio >= 1.5) return `📈 거래량 증가 (평소의 ${pct}%)`;
            if (ratio <= 0.6) return `📉 거래량 감소 (평소의 ${pct}%)`;
            return `🟡 평소 수준 (평소의 ${pct}%)`;
        }

        return 'N/A';
    }

    _getFngStatus(value) {
        if (value !== null) {
            if (value <= 25) return `🥶 극단적 공포 (패닉 셀/매수 기회, 점수: ${value})`;
            if (value <= 46) return `😨 공포 (시장 위축/약세, 점수: ${value})`;
            if (value <= 54) return `😐 중립 (방향성 탐색 중, 점수: ${value})`;
            if (value <= 75) return `😋 탐욕 (매수세 증가/상승장, 점수: ${value})`;
            return `🤯 극단적 탐욕 (초과열/고점 주의, 점수: ${value})`;
        }

        return 'N/A';
    }
}

function _testCryptoPrompt() {
    reporter = new CryptoReporter('ETH');
    console.log('prompt', reporter.generatePrompt(reporter.fetchData()));
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
