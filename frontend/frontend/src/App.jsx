
import { useEffect, useState } from "react";
import "./App.css";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const API = `${API_BASE}/api/ai`;
const PRODUCT_API = `${API_BASE}/api/products`;

const initialProduct = {
  name: "",
  category: "",
  quantity: "",
  price: "",
  expirationDate: "",
};

function App() {
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello, baker! 👋 I'm your AI inventory assistant. Ask me about your ingredients, stock levels, or expiration dates.",
    },
  ]);

  // Add Product form state
  const [showProductForm, setShowProductForm] = useState(false);
  const [product, setProduct] = useState(initialProduct);
  const [addingProduct, setAddingProduct] = useState(false);
  const [productMessage, setProductMessage] = useState("");
  const [productMessageType, setProductMessageType] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const responses = await Promise.all([
        fetch(`${API}/summary`),
        fetch(`${API}/low-stock`),
        fetch(`${API}/expiration-alerts`),
      ]);

      if (responses.some((response) => !response.ok)) {
        throw new Error("Unable to retrieve inventory data.");
      }

      const [summaryData, stockData, expirationData] =
        await Promise.all(responses.map((response) => response.json()));

      if (summaryData.success === false) {
        throw new Error(summaryData.message || "Unable to load summary.");
      }

      setSummary(summaryData);
      setLowStock(
        Array.isArray(stockData)
          ? stockData
          : stockData.items || stockData.lowStockItems || []
      );
      setExpiring(
        Array.isArray(expirationData)
          ? expirationData
          : expirationData.items || expirationData.expiringItems || []
      );
    } catch (err) {
      setError(
        "Unable to connect to the backend. Check your VITE_API_URL setting and make sure the backend is online."
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleProductChange(event) {
    const { name, value } = event.target;

    setProduct((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleAddProduct(event) {
    event.preventDefault();

    if (
      !product.name.trim() ||
      !product.category.trim() ||
      product.quantity === "" ||
      product.price === ""
    ) {
      setProductMessage("Please complete all required fields.");
      setProductMessageType("error");
      return;
    }

    if (
      Number(product.quantity) < 0 ||
      Number(product.price) < 0 ||
      !Number.isFinite(Number(product.quantity)) ||
      !Number.isFinite(Number(product.price))
    ) {
      setProductMessage("Quantity and price must be valid non-negative numbers.");
      setProductMessageType("error");
      return;
    }

    setAddingProduct(true);
    setProductMessage("");

    try {
      const payload = {
        name: product.name.trim(),
        category: product.category.trim(),
        quantity: Number(product.quantity),
        price: Number(product.price),
        expirationDate: product.expirationDate || null,
      };

      const response = await fetch(PRODUCT_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          `Unable to add product (HTTP ${response.status}). Check your backend product route.`
        );
      }

      setProductMessage(
        data.message || "Product added successfully!"
      );
      setProductMessageType("success");
      setProduct(initialProduct);

      // Refresh the AI inventory overview after adding the product.
      await loadData();
    } catch (err) {
      setProductMessage(err.message);
      setProductMessageType("error");
      console.error("Add product error:", err);
    } finally {
      setAddingProduct(false);
    }
  }


  async function sendMessage(event) {
    event.preventDefault();

    const text = question.trim();
    if (!text || sending) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", text },
    ]);

    setQuestion("");
    setSending(true);

    try {
      const response = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Unable to get an AI response."
        );
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text:
            data.reply ||
            data.answer ||
            data.message ||
            "No answer was returned.",
        },
      ]);
    } catch (err) {
      console.error("AI chat error:", err);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: `Sorry, I couldn't answer that. ${err.message}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }


  const totalProducts =
    summary?.totalItems ?? summary?.totalProducts ?? 0;
  const lowCount = summary?.lowStockCount ?? lowStock.length;
  const expirationCount =
    summary?.expiringCount ?? expiring.length;

  const suggestions = [
    "Which ingredients should I restock?",
    "What ingredients expire soon?",
    "Summarize my inventory.",
  ];

  function itemName(item) {
    return (
      item.name ||
      item.ingredientName ||
      item.productName ||
      "Unnamed item"
    );
  }

  function formatDate(value) {
    if (!value) return "No expiration date";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand-icon">♨</span>
          <span>
            <strong>Crumb & Co.</strong>
            <small>BAKERY INVENTORY</small>
          </span>
        </a>

        <div className="topbar-right">
          <span className="connection-status">
            <i /> Inventory assistant
          </span>

          <button
            className="refresh-button"
            onClick={loadData}
            disabled={loading}
            type="button"
          >
            ↻ <span>Refresh</span>
          </button>

          <button
            className="refresh-button"
            type="button"
            onClick={() => {
              setShowProductForm((previous) => !previous);
              setProductMessage("");
            }}
          >
            + Add Product
          </button>
        </div>
      </header>

      <main id="home" className="dashboard">
        <section className="welcome-banner">
          <div className="welcome-copy">
            <span className="eyebrow">
              ✦ YOUR SMART BAKERY COMPANION
            </span>

            <h1>
              Your inventory,
              <br />
              <span>made smarter.</span>
            </h1>

            <p>
              Keep your ingredients organized, catch stock issues early,
              and make smarter decisions with your AI assistant.
            </p>

            <a className="welcome-link" href="#assistant">
              Meet your AI assistant <span>↗</span>
            </a>
          </div>

          <div
            className="welcome-illustration"
            aria-hidden="true"
          >
            <div className="illustration-circle circle-one" />
            <div className="illustration-circle circle-two" />

            <div className="illustration-card">
              <span className="illustration-symbol">✧</span>
              <div className="illustration-lines">
                <i />
                <i />
                <i />
              </div>
            </div>

            <div className="floating-note">✓ Smart insights</div>
          </div>
        </section>

        {/* ADD PRODUCT FORM */}
        {showProductForm && (
          <section
            className="content-card"
            style={{ marginBottom: 30 }}
            id="add-product"
          >
            <div className="card-heading">
              <div className="card-heading-icon purple-icon">
                +
              </div>

              <div className="card-heading-copy">
                <h3>Add a New Product</h3>
                <p>
                  Enter the product details to add it to your inventory.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleAddProduct}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 16,
                paddingTop: 20,
              }}
            >
              <label
                style={{
                  display: "grid",
                  gap: 7,
                  color: "#eadfce",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Product Name *
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. All-purpose flour"
                  value={product.name}
                  onChange={handleProductChange}
                  required
                  disabled={addingProduct}
                  style={{
                    width: "100%",
                    padding: "12px",
                    color: "#eadfce",
                    background: "#211b17",
                    border: "1px solid #59483a",
                    borderRadius: 10,
                  }}
                />
              </label>

              <label
                style={{
                  display: "grid",
                  gap: 7,
                  color: "#eadfce",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Category *
                <input
                  type="text"
                  name="category"
                  placeholder="e.g. Baking ingredients"
                  value={product.category}
                  onChange={handleProductChange}
                  required
                  disabled={addingProduct}
                  style={{
                    width: "100%",
                    padding: "12px",
                    color: "#eadfce",
                    background: "#211b17",
                    border: "1px solid #59483a",
                    borderRadius: 10,
                  }}
                />
              </label>

              <label
                style={{
                  display: "grid",
                  gap: 7,
                  color: "#eadfce",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Quantity *
                <input
                  type="number"
                  name="quantity"
                  placeholder="Enter quantity"
                  value={product.quantity}
                  onChange={handleProductChange}
                  min="0"
                  step="any"
                  required
                  disabled={addingProduct}
                  style={{
                    width: "100%",
                    padding: "12px",
                    color: "#eadfce",
                    background: "#211b17",
                    border: "1px solid #59483a",
                    borderRadius: 10,
                  }}
                />
              </label>

              <label
                style={{
                  display: "grid",
                  gap: 7,
                  color: "#eadfce",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Price (₱) *
                <input
                  type="number"
                  name="price"
                  placeholder="Enter price"
                  value={product.price}
                  onChange={handleProductChange}
                  min="0"
                  step="0.01"
                  required
                  disabled={addingProduct}
                  style={{
                    width: "100%",
                    padding: "12px",
                    color: "#eadfce",
                    background: "#211b17",
                    border: "1px solid #59483a",
                    borderRadius: 10,
                  }}
                />
              </label>

              <label
                style={{
                  display: "grid",
                  gap: 7,
                  color: "#eadfce",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Expiration Date
                <input
                  type="date"
                  name="expirationDate"
                  value={product.expirationDate}
                  onChange={handleProductChange}
                  disabled={addingProduct}
                  style={{
                    width: "100%",
                    padding: "12px",
                    color: "#eadfce",
                    background: "#211b17",
                    border: "1px solid #59483a",
                    borderRadius: 10,
                  }}
                />
              </label>

              <div
                style={{
                  display: "flex",
                  alignItems: "end",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="submit"
                  className="send-button"
                  disabled={addingProduct}
                >
                  {addingProduct ? "Saving..." : "Save Product"}
                </button>

                <button
                  type="button"
                  className="refresh-button"
                  disabled={addingProduct}
                  onClick={() => {
                    setProduct(initialProduct);
                    setProductMessage("");
                    setShowProductForm(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>

            {productMessage && (
              <p
                role="status"
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 9,
                  fontSize: 12,
                  lineHeight: 1.6,
                  overflowWrap: "anywhere",
                  color:
                    productMessageType === "success"
                      ? "#166534"
                      : "#991b1b",
                  background:
                    productMessageType === "success"
                      ? "#dcfce7"
                      : "#fee2e2",
                }}
              >
                {productMessage}
              </p>
            )}
          </section>
        )}

        {error && (
          <div className="error-banner">
            <span>⚠</span>
            <div>
              <strong>Connection issue</strong>
              <p>{error}</p>
            </div>
            <button onClick={loadData} type="button">
              Try again
            </button>
          </div>
        )}

        <section className="section-block">
          <div className="section-heading">
            <div>
              <span className="section-eyebrow">AT A GLANCE</span>
              <h2>Inventory overview</h2>
            </div>

            <span className="live-label">
              <i /> {loading ? "Updating..." : "Latest overview"}
            </span>
          </div>

          <div className="stats-grid">
            <article className="stat-card purple">
              <div className="stat-top">
                <span className="stat-icon">▣</span>
                <span className="stat-note">In inventory</span>
              </div>
              <strong className="stat-number">
                {loading ? "—" : totalProducts}
              </strong>
              <span className="stat-label">Total products</span>
            </article>

            <article className="stat-card blue">
              <div className="stat-top">
                <span className="stat-icon">▤</span>
                <span className="stat-note">Needs attention</span>
              </div>
              <strong className="stat-number">
                {loading ? "—" : lowCount}
              </strong>
              <span className="stat-label">Low-stock items</span>
            </article>

            <article className="stat-card pink">
              <div className="stat-top">
                <span className="stat-icon">◷</span>
                <span className="stat-note">Next 7 days</span>
              </div>
              <strong className="stat-number">
                {loading ? "—" : expirationCount}
              </strong>
              <span className="stat-label">Expiring soon</span>
            </article>

            <article className="stat-card green">
              <div className="stat-top">
                <span className="stat-icon">✧</span>
                <span className="stat-note">Your smart helper</span>
              </div>
              <strong className="stat-word">AI Ready</strong>
              <span className="stat-label">Inventory assistant</span>
            </article>
          </div>
        </section>

        <section className="alerts-grid">
          <article className="content-card">
            <div className="card-heading">
              <div className="card-heading-icon orange">↘</div>
              <div className="card-heading-copy">
                <h3>Restock watchlist</h3>
                <p>Ingredients that may need replenishing</p>
              </div>
              <span className="count-badge">
                {loading ? "…" : lowStock.length}
              </span>
            </div>

            <div className="item-list">
              {loading ? (
                <p className="empty-message">
                  Checking inventory...
                </p>
              ) : lowStock.length ? (
                lowStock.slice(0, 6).map((item, index) => (
                  <div
                    className="inventory-item"
                    key={
                      item._id ||
                      item.id ||
                      `${itemName(item)}-${index}`
                    }
                  >
                    <span className="item-symbol orange">▤</span>
                    <div className="item-details">
                      <strong>{itemName(item)}</strong>
                      <span>Quantity: {item.quantity ?? 0}</span>
                    </div>
                    <span className="item-badge restock">
                      Restock
                    </span>
                  </div>
                ))
              ) : (
                <p className="empty-message">
                  ✓ No low-stock items found.
                </p>
              )}
            </div>
          </article>

          <article className="content-card">
            <div className="card-heading">
              <div className="card-heading-icon purple-icon">◷</div>
              <div className="card-heading-copy">
                <h3>Freshness tracker</h3>
                <p>Ingredients approaching expiration</p>
              </div>
              <span className="count-badge">
                {loading ? "…" : expiring.length}
              </span>
            </div>

            <div className="item-list">
              {loading ? (
                <p className="empty-message">
                  Checking expiration dates...
                </p>
              ) : expiring.length ? (
                expiring.slice(0, 6).map((item, index) => (
                  <div
                    className="inventory-item"
                    key={
                      item._id ||
                      item.id ||
                      `${itemName(item)}-${index}`
                    }
                  >
                    <span className="item-symbol purple-icon">◷</span>
                    <div className="item-details">
                      <strong>{itemName(item)}</strong>
                      <span>
                        Expires:{" "}
                        {formatDate(
                          item.expirationDate ||
                          item.expiryDate ||
                          item.expiry
                        )}
                      </span>
                    </div>
                    <span className="item-badge check">Check</span>
                  </div>
                ))
              ) : (
                <p className="empty-message">
                  ✓ No upcoming expiration alerts.
                </p>
              )}
            </div>
          </article>
        </section>

        <section className="assistant-card" id="assistant">
          <div className="assistant-heading">
            <div className="assistant-avatar">✧</div>
            <div className="assistant-title">
              <div className="assistant-title-line">
                <h2>Ask your AI assistant</h2>
                <span className="ai-badge">✦ AI POWERED</span>
              </div>
              <p>
                Your helpful partner for smarter bakery inventory decisions.
              </p>
            </div>
            <span className="assistant-status">
              <i /> Ready to help
            </span>
          </div>

          <div className="chat-content">
            <div className="chat-welcome">
              <div className="chat-bot-icon">✧</div>
              <div>
                <strong>Hello, baker! 👋</strong>
                <p>
                  What would you like to know about your inventory today?
                </p>
              </div>
            </div>

            <div className="suggestion-list">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  className="suggestion-button"
                  type="button"
                  onClick={() => setQuestion(suggestion)}
                  disabled={sending}
                >
                  <span>✧</span>
                  {suggestion}
                  <span className="suggestion-arrow">↗</span>
                </button>
              ))}
            </div>

            <div className="message-list" aria-live="polite">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`message-row ${message.role}`}
                >
                  {message.role === "assistant" && (
                    <span className="message-avatar">✧</span>
                  )}
                  <div className="message-bubble">
                    {message.text}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="message-row assistant">
                  <span className="message-avatar">✧</span>
                  <div className="message-bubble typing">
                    AI is thinking...
                  </div>
                </div>
              )}
            </div>

            <form className="chat-form" onSubmit={sendMessage}>
              <span className="input-symbol">✧</span>
              <input
                type="text"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask about stock, ingredients, or expiration dates..."
                aria-label="Message your AI assistant"
                disabled={sending}
              />
              <button
                type="submit"
                className="send-button"
                disabled={!question.trim() || sending}
              >
                {sending ? "Sending..." : "Ask AI"}
                <span>➤</span>
              </button>
            </form>

            <p className="chat-disclaimer">
              ✦ AI responses are suggestions. Please verify important
              inventory decisions against your records.
            </p>
          </div>
        </section>

        <footer className="app-footer">
          <strong>♨ Crumb & Co.</strong>
          <span>Made for a fresher, smarter bakery.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;