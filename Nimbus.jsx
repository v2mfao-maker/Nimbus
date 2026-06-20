import React, { useState, useRef, useEffect } from "react";
import { Send, Plus, Menu, X, Copy, Check, Cloud } from "lucide-react";

// ---------------------------------------------------------------------------
// NIMBUS — a self-hosted AI chat app
//
// This artifact runs with SIMULATED responses so you can see the full UI
// and interaction flow right now, with zero setup.
//
// TO MAKE IT REAL (free):
//   1. Get a free API key at https://console.groq.com
//   2. Deploy this code with a tiny backend (instructions at the bottom
//      of this file, and in the README I'll generate alongside it)
//   3. Swap `simulateResponse()` for a real fetch() call to your backend
// ---------------------------------------------------------------------------

const SUGGESTED = [
  "Explain quantum computing simply",
  "Write a Python function to sort a list",
  "Give me ideas for a weekend trip",
  "Help me draft a follow-up email",
];

async function getAIResponse(conversationMessages) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: conversationMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden my-2 border border-white/10">
      <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 text-xs text-stone-400 font-mono">
        <span>{lang || "code"}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-1 hover:text-amber-400 transition-colors"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="bg-black/30 p-3 overflow-x-auto text-sm">
        <code className="font-mono text-stone-200">{code}</code>
      </pre>
    </div>
  );
}

function renderContent(text) {
  // Very small markdown-ish renderer: handles ```code blocks``` and `inline code`
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
      const lang = match?.[1] || "";
      const code = match?.[2]?.trim() || "";
      return <CodeBlock key={i} code={code} lang={lang} />;
    }
    const inlineParts = part.split(/(`[^`]+`)/g);
    return (
      <span key={i} className="whitespace-pre-wrap leading-relaxed">
        {inlineParts.map((seg, j) =>
          seg.startsWith("`") && seg.endsWith("`") ? (
            <code
              key={j}
              className="bg-white/10 text-amber-300 px-1.5 py-0.5 rounded text-[0.9em] font-mono"
            >
              {seg.slice(1, -1)}
            </code>
          ) : (
            seg
          )
        )}
      </span>
    );
  });
}

function ClearingDots() {
  // Signature "fog lifting" loading state
  return (
    <div className="flex items-center gap-1.5 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-amber-400/70"
          style={{
            animation: `nimbus-clear 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes nimbus-clear {
          0%, 100% { opacity: 0.25; transform: translateY(0px) scale(0.85); filter: blur(1px); }
          50% { opacity: 1; transform: translateY(-3px) scale(1); filter: blur(0px); }
        }
      `}</style>
    </div>
  );
}

export default function Nimbus() {
  const [chats, setChats] = useState([{ id: 1, title: "New chat", messages: [] }]);
  const [activeId, setActiveId] = useState(1);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const activeChat = chats.find((c) => c.id === activeId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChat?.messages, loading]);

  function updateMessages(chatId, updater) {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, messages: updater(c.messages) } : c))
    );
  }

  async function handleSend(text) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");

    const isFirstMessage = activeChat.messages.length === 0;
    updateMessages(activeId, (msgs) => [...msgs, { role: "user", content }]);
    if (isFirstMessage) {
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, title: content.slice(0, 32) || "New chat" } : c
        )
      );
    }

    setLoading(true);

    try {
      const fullHistory = [...activeChat.messages, { role: "user", content }];
      const reply = await getAIResponse(fullHistory);
      updateMessages(activeId, (msgs) => [...msgs, { role: "assistant", content: reply }]);
    } catch (err) {
      updateMessages(activeId, (msgs) => [
        ...msgs,
        {
          role: "assistant",
          content: `Something went wrong reaching the AI backend: ${err.message}\n\nCheck that your GROQ_API_KEY is set correctly in your deployment's environment variables.`,
        },
      ]);
    } finally {
      setLoading(false);
    }

  function newChat() {
    const id = Date.now();
    setChats((prev) => [{ id, title: "New chat", messages: [] }, ...prev]);
    setActiveId(id);
  }

  return (
    <div className="flex h-screen w-full bg-[#13151A] text-[#F2F0EA] font-sans overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-200 overflow-hidden border-r border-white/10 flex flex-col shrink-0`}
      >
        <div className="p-3 flex items-center gap-2">
          <div className="flex items-center gap-2 px-1 py-1.5 flex-1">
            <Cloud size={20} className="text-amber-400" strokeWidth={2.2} />
            <span className="font-semibold tracking-tight text-[15px]">Nimbus</span>
          </div>
        </div>
        <div className="px-3 pb-2">
          <button
            onClick={newChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-stone-200 border border-white/10"
          >
            <Plus size={16} /> New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
          {chats.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                c.id === activeId
                  ? "bg-amber-400/10 text-amber-300"
                  : "text-stone-400 hover:bg-white/5 hover:text-stone-200"
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-white/10 text-[11px] text-stone-500 leading-relaxed">
          Connected to your Groq-powered backend.
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            className="p-1.5 rounded-md hover:bg-white/10 text-stone-400 transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <span className="text-sm text-stone-400 truncate">{activeChat?.title}</span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {activeChat?.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-6">
              <Cloud size={36} className="text-amber-400/80 mb-4" strokeWidth={1.6} />
              <h1 className="text-2xl font-semibold mb-1 tracking-tight">What's on your mind?</h1>
              <p className="text-stone-500 text-sm mb-8">Ask anything, or try one of these</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-left px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-amber-400/30 transition-colors text-sm text-stone-300"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
              {activeChat.messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] ${
                      m.role === "user"
                        ? "bg-amber-400 text-[#1A1308] rounded-br-sm"
                        : "bg-white/[0.06] border border-white/10 rounded-bl-sm"
                    }`}
                  >
                    {renderContent(m.content)}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-bl-sm px-4">
                    <ClearingDots />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 shrink-0">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-end gap-2 bg-white/[0.06] border border-white/10 focus-within:border-amber-400/50 focus-within:shadow-[0_0_0_3px_rgba(255,159,74,0.12)] rounded-2xl px-3 py-2 transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Message Nimbus…"
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-[15px] placeholder:text-stone-500 max-h-40 py-1.5"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="shrink-0 p-2 rounded-xl bg-amber-400 text-[#1A1308] disabled:bg-white/10 disabled:text-stone-500 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-center text-[11px] text-stone-600 mt-2">
              Nimbus · powered by Llama 3.3 via Groq
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
