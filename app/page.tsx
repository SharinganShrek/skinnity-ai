'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const requestRoutine = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'Please provide me with a comprehensive personalized skincare routine based on my skin analysis.',
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: Message = { role: 'assistant', content: data.message };
      setMessages((prev) => [...prev, assistantMessage]);

      // Save both messages to database
      await supabase.from('chat_history').insert([
        {
          user_id: user.id,
          role: 'user',
          content: 'Please provide me with a comprehensive personalized skincare routine based on my skin analysis.',
        },
        {
          user_id: user.id,
          role: 'assistant',
          content: data.message,
        },
      ]);
    } catch (error) {
      console.error('Error requesting routine:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadChatHistory();
      checkAnalysis();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/auth/login');
      return;
    }

    setUser(user);
  };

  const checkAnalysis = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('skin_analysis')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setHasAnalysis(true);
    } else {
      // No analysis found, redirect to analyze page
      router.push('/analyze');
      return;
    }
  };

  const loadChatHistory = async () => {
    if (!user) return;

    setIsLoadingHistory(true);

    try {
      // Load last 10 messages
      const { data: chatHistory } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(10);

      if (chatHistory && chatHistory.length > 0) {
        setMessages(
          chatHistory.map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          }))
        );
      } else {
        // No chat history - automatically request routine
        const { data: analysis } = await supabase
          .from('skin_analysis')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (analysis) {
          // Automatically request the routine
          setTimeout(async () => {
            await requestRoutine();
          }, 500);
          setMessages([
            {
              role: 'assistant',
              content: 'Hello! I\'m your skincare advisor. Let me create a personalized skincare routine for you based on your analysis...',
            },
          ]);
        } else {
          setMessages([
            {
              role: 'assistant',
              content: 'Hello! I\'m your skincare advisor. How can I help you today?',
            },
          ]);
        }
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setMessages([
        {
          role: 'assistant',
          content: 'Hello! I\'m your skincare advisor. How can I help you today?',
        },
      ]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !user) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message to database
      await supabase.from('chat_history').insert({
        user_id: user.id,
        role: 'user',
        content: input,
      });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: Message = { role: 'assistant', content: data.message };
      setMessages((prev) => [...prev, assistantMessage]);

      // Save assistant message to database
      await supabase.from('chat_history').insert({
        user_id: user.id,
        role: 'assistant',
        content: data.message,
      });

      // Keep only last 10 messages in database
      const { data: allMessages } = await supabase
        .from('chat_history')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (allMessages && allMessages.length > 10) {
        const idsToDelete = allMessages.slice(10).map((m) => m.id);
        await supabase.from('chat_history').delete().in('id', idsToDelete);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🌿</div>
          <p className="text-emerald-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasAnalysis) {
    return null; // Will redirect to /analyze
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 p-4">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white/80 backdrop-blur-sm shadow-2xl border border-emerald-100/50 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              🌿 Skincare Advisor
            </h1>
            <p className="text-emerald-100 text-sm mt-1">
              Your personalized skincare consultation
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/analyze"
              className="text-sm text-emerald-100 hover:text-white transition-colors"
            >
              Re-analyze
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-emerald-100 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                    : 'bg-emerald-50 text-emerald-900 border border-emerald-100'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="text-sm leading-relaxed prose prose-emerald prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({ node, ...props }) => (
                          <h1 className="text-lg font-semibold mt-2 mb-2 text-emerald-900" {...props} />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2 className="text-base font-semibold mt-2 mb-2 text-emerald-900" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 className="text-sm font-semibold mt-2 mb-1 text-emerald-900" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="mb-2 last:mb-0" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong className="font-semibold text-emerald-900" {...props} />
                        ),
                        em: ({ node, ...props }) => (
                          <em className="italic" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="list-disc list-inside mb-2 space-y-1" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="ml-2" {...props} />
                        ),
                        code: ({ node, ...props }) => (
                          <code className="bg-emerald-100 px-1.5 py-0.5 rounded text-xs font-mono" {...props} />
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-2xl px-4 py-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-emerald-100 bg-white/50 p-4"
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your skin type, concerns, or routine..."
              className="flex-1 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-900 placeholder:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-medium text-white transition-all hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
