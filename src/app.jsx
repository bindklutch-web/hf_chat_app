cat > /workspaces/hf_chat_app/frontend/src/App.jsx << 'EOF'
import React, { useState, useRef, useEffect } from "react"

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || streaming) return;

    const userMsg = { role: "user", content: input };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("https://probable-cod-jjxr46pj5w97cg95-8000.app.github.dev/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const json = JSON.parse(line.slice(6));
            const delta = json.choices?.[0]?.delta?.content || "";
            assistantText += delta;
            setMessages(prev => [
              ...prev.slice(0, -1),
              { role: "assistant", content: assistantText }
            ]);
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}>
      <h2>HuggingFace Chat</h2>
      <div style={{ height: 500, overflowY: "auto", border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 16, textAlign: m.role === "user" ? "right" : "left" }}>
            <span style={{
              display: "inline-block", padding: "8px 14px", borderRadius: 16,
              background: m.role === "user" ? "#0070f3" : "#f0f0f0",
              color: m.role === "user" ? "#fff" : "#000", maxWidth: "80%"
            }}>
              {m.content || "▋"}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Type a message..."
          style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 15 }}
        />
        <button onClick={send} disabled={streaming}
          style={{ padding: "10px 20px", background: "#0070f3", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
          {streaming ? "..." : "Send"}
        </button>
      </div>
    </div>
  )
}
EOF
