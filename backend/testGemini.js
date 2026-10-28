
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function testGemini() {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`Gemini test: attempt ${attempt}/${maxAttempts}`);

            const response = await ai.models.generateContent({
                model: "gemini-3.6-flash",
                contents: "Reply with: Gemini is working!"
            });

            console.log("Success:", response.text);
            return;
        } catch (error) {
            console.error("Attempt failed:", error.message);

            if (attempt === maxAttempts) {
                console.error("Gemini is still unavailable. Try again later.");
                return;
            }

            // Retry temporary server errors after increasing delays
            if (!/503|UNAVAILABLE|429|RESOURCE_EXHAUSTED|500|INTERNAL/i.test(error.message)) {
                console.error("This does not appear to be a temporary server error.");
                return;
            }

            const delay = attempt * 3000;
            console.log(`Retrying in ${delay / 1000} seconds...`);

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is missing from backend/.env");
} else {
    testGemini();
}
