import { useState } from "react";

function AIChat() {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);

    async function handleSendMessage(e) {
        e?.preventDefault();

        const userMessage = message.trim();

        if (!userMessage || loading) return;

        setMessages((previous) => [
            ...previous,
            { role: "user", text: userMessage },
        ]);

        setMessage("");
        setLoading(true);

        try {
            const response = await fetch(
                "http://127.0.0.1:5000/api/ai/chat",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        message: userMessage,
                    }),
                }
            );

            // Read the backend response safely
            const responseText = await response.text();
            let data;

            try {
                data = JSON.parse(responseText);
            } catch {
                console.error(
                    "Invalid backend response:",
                    responseText
                );

                throw new Error(
                    `The backend returned an invalid response (HTTP ${response.status}).`
                );
            }

            // Check for HTTP errors
            if (!response.ok) {
                console.error("Backend error:", data);

                throw new Error(
                    data.error ||
                    `AI request failed (HTTP ${response.status}).`
                );
            }

            // Check if the backend reported success
            if (data.success === false) {
                throw new Error(
                    data.error || "The AI request was unsuccessful."
                );
            }

            // Check if Gemini returned a reply
            if (
                typeof data.reply !== "string" ||
                !data.reply.trim()
            ) {
                console.error("Empty AI response:", data);

                throw new Error(
                    "The AI returned an empty response. Please try again."
                );
            }

            // Display Gemini's answer
            setMessages((previous) => [
                ...previous,
                {
                    role: "assistant",
                    text: data.reply.trim(),
                },
            ]);
        } catch (error) {
            console.error("Chat error:", error);

            let errorMessage = error.message;

            if (error instanceof TypeError) {
                errorMessage =
                    "Cannot connect to the backend. Make sure your server is running at http://127.0.0.1:5000 and check the browser console.";
            }

            setMessages((previous) => [
                ...previous,
                {
                    role: "assistant",
                    text:
                        errorMessage ||
                        "Unable to connect to the AI.",
                },
            ]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <div>
                {messages.map((msg, index) => (
                    <div key={index}>
                        <strong>
                            {msg.role === "user"
                                ? "You"
                                : "AI Assistant"}:
                        </strong>{" "}
                        {msg.text}
                    </div>
                ))}

                {loading && <p>Gemini is thinking...</p>}
            </div>

            <form onSubmit={handleSendMessage}>
                <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask anything about your project or bakery inventory..."
                    disabled={loading}
                />

                <button
                    type="submit"
                    disabled={loading || !message.trim()}
                >
                    {loading ? "Thinking..." : "Ask AI"}
                </button>
            </form>
        </div>
    );

}

export default AIChat;