import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Loader2, Sparkles, Trash2, ChevronDown, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { aiChat, type AiMessage } from '@/lib/api';

// Simple markdown-to-JSX renderer (headers, bullets, bold only)
function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        // ## header
        if (line.startsWith('## ')) {
          return (
            <p key={i} className="font-semibold text-foreground text-sm mt-2">
              {line.replace('## ', '')}
            </p>
          );
        }
        // **bold**
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
          part.startsWith('**') ? (
            <strong key={j}>{part.slice(2, -2)}</strong>
          ) : (
            part
          )
        );
        // bullet
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} className="flex gap-2 text-sm">
              <span className="text-muted-foreground mt-0.5 flex-shrink-0">•</span>
              <span>{parts.slice(1)}</span>
            </div>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed">
            {parts}
          </p>
        );
      })}
    </div>
  );
}

const WELCOME_MESSAGE: AiMessage & { id: string } = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hi! I\'m **EduYantra AI**, your school management assistant.\n\nI can help you with:\n- Student performance & attendance analysis\n- Fee management queries\n- Academic planning & exam insights\n- Parent communication tips\n- General school administration\n\nHow can I help you today?',
};

const QUICK_PROMPTS = [
  'How can I improve attendance?',
  'Tips for parent-teacher meetings',
  'How to identify at-risk students?',
  'Best practices for exam scheduling',
];

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<(AiMessage & { id: string })[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    const userMsg: AiMessage & { id: string } = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Build history for API (skip welcome message)
    const history: AiMessage[] = [
      ...messages.filter((m) => m.id !== 'welcome').map(({ role, content }) => ({ role, content })),
      { role: 'user', content: trimmed },
    ];

    try {
      const res = await aiChat(history);
      if (res.success && res.data?.reply) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString() + '_ai', role: 'assistant', content: res.data!.reply },
        ]);
      } else {
        throw new Error(res.error?.message || 'No response');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setError(null);
  };

  const hasUserMessages = messages.some((m) => m.role === 'user');

  return (
    <>
      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'fixed bottom-20 right-4 z-50 w-[360px] sm:w-[400px]',
              'flex flex-col rounded-2xl border border-border shadow-2xl',
              'bg-background overflow-hidden'
            )}
            style={{ maxHeight: 'min(600px, calc(100vh - 100px))' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-primary text-primary-foreground flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none">EduYantra AI</p>
                  <p className="text-xs opacity-75 mt-0.5">Powered by Gemini</p>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1">
                {hasUserMessages && (
                  <button
                    onClick={clearChat}
                    className="p-1.5 rounded-lg hover:bg-primary-foreground/20 transition-colors"
                    title="Clear chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-primary-foreground/20 transition-colors"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-2.5 max-w-full',
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {msg.role === 'user' ? (
                      <User className="h-3.5 w-3.5" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className={cn(
                      'rounded-2xl px-3.5 py-2.5 max-w-[82%]',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted text-foreground rounded-tl-sm'
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <SimpleMarkdown text={msg.content} />
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex gap-2.5 flex-row">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-3.5 py-3 flex items-center gap-1.5">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Quick prompts (only when no user messages yet) */}
            {!hasUserMessages && (
              <div className="px-4 pb-2 flex flex-wrap gap-2 flex-shrink-0">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-primary hover:text-primary bg-background transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t border-border px-3 py-3 flex items-center gap-2 flex-shrink-0 bg-background">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask EduYantra AI..."
                disabled={loading}
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground disabled:opacity-50"
              />
              <Button
                size="icon"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="h-8 w-8 rounded-xl flex-shrink-0"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB trigger button */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'fixed bottom-4 right-4 z-50 w-13 h-13 rounded-2xl shadow-lg shadow-primary/30',
          'flex items-center justify-center',
          'bg-primary text-primary-foreground',
          'hover:opacity-90 active:scale-95 transition-all',
          'border-2 border-primary-foreground/20'
        )}
        style={{ width: '52px', height: '52px' }}
        whileTap={{ scale: 0.92 }}
        title="EduYantra AI"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-5 w-5" />
            </motion.span>
          ) : (
            <motion.span
              key="bot"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Sparkles className="h-5 w-5" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
