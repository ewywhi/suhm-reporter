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
        const candles = this._fetchUpbitWeeklyCandles(this.ticker, 60);

        if (!candles || candles.length === 0) {
            throw new Error(`${this.ticker} 캔들 데이터를 불러올 수 없습니다.`);
        }

        const candle = candles[candles.length - 1];
        const rsiArray = this._calculateRsiArray(candles, 14);
        const currentRsi = rsiArray[rsiArray.length - 1];

        return {
            ticker: this.ticker,
            date: new Date().toISOString(),
            price: {
                close: candle.close.toLocaleString() + " KRW",
                open: candle.open.toLocaleString() + " KRW",
                changeRate: ((candle.close - candle.open) / candle.open * 100).toFixed(2) + '%' // 이번 주 등락률
            },
            indicators: {
                rsi: currentRsi,
                divergence: this._analyzeDivergenceRaw(candles, rsiArray),
                volumeRatio: this._calculateVolumeRatio(candles),
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
2. 가격: ${data.price.close} (변동률: ${data.price.changeRate})
3. RSI(14): ${data.indicators.rsi} (${this._getRsiStatus(data.indicators.rsi)})
4. 다이버전스: ${this._getDivergenceStatus(data.indicators.divergence)}
5. 거래량: ${this._getVolumeStatus(data.indicators.volumeRatio)}
6. 공포탐욕지수: ${this._getFngStatus(data.indicators.fngScore)}

[필수 검색 및 분석 지침 (Search Instructions)]
**Google 검색 도구를 적극 활용하여 아래 내용을 리포트에 반드시 포함하십시오:**
1. **MVRV Z-Score 확인 (필수):** "${data.ticker} MVRV Z-Score ${today}" 또는 "Bitcoin MVRV ratio today"로 검색하여 **오늘(${today}) 기준** 최신 MVRV 수치를 찾아 리포트에 포함하십시오.
2. **가격 변동 원인 파악:** 오늘 혹은 최근 24시간 내에 ${data.ticker} 가격에 영향을 미친 주요 뉴스(호재/악재, 규제, 해킹, 거시경제 이슈 등)를 검색하여 "시황 분석" 파트에 구체적으로 서술하십시오.
3. **데이터와 뉴스 연결:** - 예: "가격이 급락했는데(데이터), 검색해보니 SEC 소송 뉴스가 원인이었다(뉴스)."
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
    | MVRV | 3.2 (과열) | 고점 징후 포착 |

3. **[심층 시장 분석]**
  - 위 지표들과 웹 검색 결과(뉴스)를 결합하여 현재 상황을 분석하십시오.
  - 단순히 "올랐다"가 아니라 "왜(Why)" 올랐는지 인과관계를 설명하십시오.
  - 특히 **다이버전스**나 **거래량 폭발**이 발생했다면 이를 핵심 근거로 다루십시오.

4. **[최종 결론]**
  - **[매수 / 분할 매수 / 관망 / 매도]** 중 하나의 포지션을 선택하십시오.
  - 그 이유를 3줄 이내로 요약하십시오.
    `;
    }

    // --- Helper Methods ---

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

function _testCryptoReporter() {
    new CryptoReporter('ETH').execute();
}
