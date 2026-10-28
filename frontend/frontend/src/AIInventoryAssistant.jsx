
import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  RefreshCw,
  Package,
  AlertTriangle,
  CalendarClock,
  MessageCircle,
  Sparkles,
  LoaderCircle,
} from "lucide-react";
import "./App.css";

const API_URL = "http://localhost:5000/api/ai";

function AIInventoryAssistant() {
  const [summary, setSummary] = useState({
    totalProducts: 0,
    totalQuantity: 0,
    lowStock: [],
    expired: [],
    expiringSoon: [],
  });

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm your Bakery Inventory AI Assistant powered by Gemini. Ask me about your stock, low-stock ingredients, or expiration dates.",
    },
  ]);

  const [userQuestion, setUserQuestion] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState("");

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/summary`);

      if (!response.ok) {
        throw new Error("Unable to load inventory summary.");
      }

      const data = await response.json();

      setSummary({
        totalProducts: data.totalProducts ?? 0,
        totalQuantity: data.totalQuantity ?? 0,
        lowStock: Array.isArray(data.lowStock) ? data.lowStock : [],
        expired: Array.isArray(data.expired) ? data.expired : [],
        expiringSoon: Array.isArray(data.expiringSoon)
          ? data.expiringSoon
          : [],
      });
    } catch (err) {
      console.error("Summary error:", err);
      setError(
        "Cannot load inventory. Make sure your backend and MongoDB are running."
      );
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleAskAI = async (event) => {
    event?.preventDefault();

    const question = userQuestion.trim();

    if (!question || sendingMessage) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", content: question },
    ]);

    setUserQuestion("");
    setSendingMessage(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Gemini could not answer your question."
        );
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            data.answer ||
            "Sorry, Gemini did not return an answer. Please try again.",
        },
      ]);
    } catch (err) {
      console.error("Gemini chat error:", err);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't connect to Gemini. Please check that your backend is running, your API key is configured, and your internet connection is working.",
        },
      ]);

      setError(err.message || "Failed to connect to the AI assistant.");
    } finally {
      setSendingMessage(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "No expiry date";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString();
  };

  const suggestions = [
    "Which ingredients are low in stock?",
    "Which products are expiring soon?",
    "What should we restock first?",
  ];

  return (
    <div className="ai-inventory-page">
      <div className="ai-page-header">
        <div className="ai-heading-icon">
          <Bot size={28} />
        </div>

        <div>
          <h1>AI Inventory Assistant</h1>
          <p>
            Manage your bakery inventory with Gemini AI.
          </p>
        </div>

        <button
          type="button"
          className="ai-refresh-button"
          onClick={loadSummary}
          disabled={loadingSummary}
          title="Refresh inventory"
        >
          <RefreshCw
            size={17}
            className={loadingSummary ? "ai-spinning" : ""}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div className="ai-error-message" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="ai-summary-grid">
        <div className="ai-summary-card">
          <div className="ai-summary-icon purple">
            <Package size={23} />
          </div>
          <div>
            <p>Total Products</p>
            <h2>{summary.totalProducts}</h2>
          </div>
        </div>

        <div className="ai-summary-card">
          <div className="ai-summary-icon blue">
            <Package size={23} />
          </div>
          <div>
            <p>Total Quantity</p>
            <h2>{summary.totalQuantity}</h2>
          </div>
        </div>

        <div className="ai-summary-card">
          <div className="ai-summary-icon orange">
            <AlertTriangle size={23} />
          </div>
          <div>
            <p>Low Stock</p>
            <h2>{summary.lowStock.length}</h2>
          </div>
        </div>

        <div className="ai-summary-card">
          <div className="ai-summary-icon red">
            <CalendarClock size={23} />
          </div>
          <div>
            <p>Expired Items</p>
            <h2>{summary.expired.length}</h2>
          </div>
        </div>
      </div>

      <div className="ai-inventory-grid">
        <section className="ai-panel">
          <div className="ai-panel-heading">
            <div className="ai-panel-title">
              <AlertTriangle size={20} />
              <h2>Low Stock Recommendations</h2>
            </div>
            <span className="ai-count-badge">
              {summary.lowStock.length}
            </span>
          </div>

          {summary.lowStock.length === 0 ? (
            <div className="ai-empty-state">
              <Package size={30} />
              <p>No low-stock items found.</p>
            </div>
          ) : (
            <div className="ai-item-list">
              {summary.lowStock.map((item, index) => (
                <div
                  className="ai-inventory-item"
                  key={item._id || item.id || `${item.name}-${index}`}
                >
                  <div className="ai-item-info">
                    <strong>{item.name}</strong>
                    <span>
                      Current stock: {item.quantity}
                    </span>
                    {item.minimumStock != null && (
                      <span>
                        Minimum stock: {item.minimumStock}
                      </span>
                    )}
                  </div>
                  <span className="ai-status low">
                    Restock
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="ai-panel">
          <div className="ai-panel-heading">
            <div className="ai-panel-title">
              <CalendarClock size={20} />
              <h2>Expiration Alerts</h2>
            </div>
            <span className="ai-count-badge">
              {summary.expired.length + summary.expiringSoon.length}
            </span>
          </div>

          {summary.expired.length === 0 &&
          summary.expiringSoon.length === 0 ? (
            <div className="ai-empty-state">
              <CalendarClock size={30} />
              <p>No expiration alerts found.</p>
            </div>
          ) : (
            <div className="ai-item-list">
              {summary.expired.map((item, index) => (
                <div
                  className="ai-inventory-item"
                  key={item._id || item.id || `expired-${index}`}
                >
                  <div className="ai-item-info">
                    <strong>{item.name}</strong>
                    <span>
                      Expired: {formatDate(item.expiryDate)}
                    </span>
                  </div>
                  <span className="ai-status expired">
                    Expired
                  </span>
                </div>
              ))}

              {summary.expiringSoon.map((item, index) => (
                <div
                  className="ai-inventory-item"
                  key={item._id || item.id || `soon-${index}`}
                >
                  <div className="ai-item-info">
                    <strong>{item.name}</strong>
                    <span>
                      Expires: {formatDate(item.expiryDate)}
                    </span>
                  </div>
                  <span className="ai-status warning">
                    Expiring Soon
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="ai-chat-panel">
        <div className="ai-chat-header">
          <div className="ai-chat-avatar">
            <Sparkles size={22} />
          </div>

          <div>
            <h2>Bakery Inventory Chatbot</h2>
            <p>
              <span className="ai-online-dot" />
              Gemini AI Assistant
            </p>
          </div>
        </div>

        <div className="ai-chat-messages" aria-live="polite">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`ai-message-row ${
                message.role === "user" ? "user-message" : "bot-message"
              }`}
            >
              {message.role === "assistant" && (
                <div className="ai-message-avatar">
                  <Bot size={18} />
                </div>
              )}

              <div className="ai-message-bubble">
                <span className="ai-message-label">
                  {message.role === "user" ? "You" : "Gemini AI"}
                </span>
                <p>{message.content}</p>
              </div>
            </div>
          ))}

          {sendingMessage && (
            <div className="ai-message-row bot-message">
              <div className="ai-message-avatar">
                <Bot size={18} />
              </div>
              <div className="ai-message-bubble ai-thinking">
                <LoaderCircle size={17} className="ai-spinning" />
                Gemini is thinking...
              </div>
            </div>
          )}
        </div>

        <div className="ai-chat-suggestions">
          {suggestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              onClick={() => setUserQuestion(suggestion)}
              disabled={sendingMessage}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form className="ai-chat-form" onSubmit={handleAskAI}>
          <div className="ai-input-wrapper">
            <MessageCircle size={19} />
            <input
              type="text"
              value={userQuestion}
              onChange={(event) => setUserQuestion(event.target.value)}
              placeholder="Ask about your bakery inventory..."
              aria-label="Ask the AI assistant"
              disabled={sendingMessage}
            />
          </div>

          <button
            type="submit"
            className="ai-send-button"
            disabled={!userQuestion.trim() || sendingMessage}
          >
            {sendingMessage ? (
              <LoaderCircle size={18} className="ai-spinning" />
            ) : (
              <Send size={18} />
            )}
            Send
          </button>
        </form>

        <p className="ai-chat-disclaimer">
          AI responses are suggestions. Verify stock and expiry information
          before making inventory decisions.
        </p>
      </section>
    </div>
  );
}

export default AIInventoryAssistant;
