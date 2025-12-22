
// Gemini API 호출
function gemini_fetch(apiKey, prompt, modelName = 'gemini-flash-latest', useSearch = false, temperature = 0.2) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: temperature,
        }
    };

    // useSearch 가 true 면 검색 도구를 payload 에 추가
    if (useSearch) {
        payload.tools = [
            { google_search: {} }
        ];
    }

    const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true // 에러 상세 내용을 로그로 보기 위해 true 설정
    };

    const res = UrlFetchApp.fetch(url, options);
    const resCode = res.getResponseCode();
    const result = JSON.parse(res.getContentText());

    if (resCode === 200) {
        if (!result.candidates || result.candidates.length === 0) {
            throw new Error("No candidates returned");
        }

        const candidate = result.candidates[0];
        let contentText = "";

        // 텍스트 파트 안전하게 추출
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            contentText = candidate.content.parts[0].text;
        }

        // 검색 출처(Source) 추출 -> 프롬프트에서 처리하고 여기서는 디버깅 용도로만 사용하기로
        if (useSearch && candidate.groundingMetadata && candidate.groundingMetadata.groundingChunks) {
            const chunks = candidate.groundingMetadata.groundingChunks;
            // const uniqueSources = new Map();

            chunks.forEach(chunk => {
                if (chunk.web && chunk.web.uri && chunk.web.title) {
                    // uniqueSources.set(chunk.web.uri, chunk.web.title);
                    console.log(` grounding source check.. Title: ${chunk.web.title}, URI: ${chunk.web.uri}`);
                }
            });

            // if (uniqueSources.size > 0) {
            //   contentText += "\n\n---\n\n### 📚 참고 자료 (References)\n";
            //   uniqueSources.forEach((title, uri) => {
            //     contentText += `- [${title}](${uri})\n`;
            //   });
            // }
        }

        // 토큰 사용량 추출 (없을 경우 0으로 처리)
        const usage = result.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };

        return {
            text: contentText,
            usage: usage
        };
    }
    else {
        const errMsg = result.error ? result.error.message : "Unknown Error";
        console.error(`Gemini Error (${resCode}): ${errMsg}`);
        throw new Error(`Gemini API Error: ${errMsg}`);
    }
}


// 사용 가능한 모델 확인
function gemini_checkAvailableModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${Gemini.ApiKey}`;

    try {
        const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        const data = JSON.parse(response.getContentText());

        if (data.models) {
            console.log("✅ [사용 가능한 모델 목록]");
            // 'generateContent' 기능이 있는 모델만 필터링해서 출력
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    // 'models/' 접두사 빼고 이름만 깔끔하게 출력
                    console.log(m.name.replace("models/", ""));
                }
            });
        } else {
            console.log("❌ 모델 목록 조회 실패:", data);
        }
    } catch (e) {
        console.log("❌ 연결 실패:", e.toString());
    }
}


// Gemini 테스트
function test_gemini() {
    const frompt = 'API 테스트용 프롬프트. 한줄 답장만 보내줘'
    console.log(gemini_fetch(frompt))
}
