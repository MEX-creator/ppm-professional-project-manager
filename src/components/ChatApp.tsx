import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Bot, User, LayoutDashboard, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Message } from '../types';

export default function ChatApp() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      content: "What's the most chaotic thing on your plate right now?",
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    const currentHistory = [...messages];
    setMessages([...currentHistory, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          history: currentHistory.map(m => ({ role: m.role, content: m.content })),
          message: userMessage.content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response from server');
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported in this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      const assistantMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantMessageId, role: 'model', content: '' }]);

      let done = false;
      let assistantContent = '';
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          
          let endIndex;
          while ((endIndex = buffer.indexOf('\n\n')) !== -1) {
            const line = buffer.slice(0, endIndex);
            buffer = buffer.slice(endIndex + 2);
            
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                done = true;
                break;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  assistantContent += parsed.text;
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: assistantContent }
                      : msg
                  ));
                }
              } catch (e) {
                console.error('Error parsing stream chunk:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in chat:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: 'Sorry, I encountered an error. Please try responding again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#F4F4F5] font-sans text-slate-900 border-x-2 border-slate-900 shadow-none sm:max-w-4xl sm:mx-auto">
      {/* Header */}
      <header className="flex-none bg-white border-b-2 border-slate-900 p-6 sm:p-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-3 flex items-center justify-center">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">PPM</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1 text-slate-500">Alex // AI Project Manager</p>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System Status</div>
          <div className="flex items-center gap-2 mt-1 justify-end">
            <span className="w-2 h-2 bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900">Active Session</span>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-4 max-w-3xl mx-auto ${
              message.role === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`flex-none w-10 h-10 border-2 border-slate-900 flex items-center justify-center ${
                message.role === 'user'
                  ? 'bg-white text-slate-900'
                  : 'bg-slate-900 text-white'
              }`}
            >
              {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
            </div>
            
            <div
              className={`flex-1 p-5 sm:p-6 ${
                message.role === 'user'
                  ? 'bg-slate-900 text-white border-2 border-slate-900'
                  : 'bg-white border-2 border-slate-900 text-slate-900 shadow-[4px_4px_0_0_#0f172a] sm:shadow-[8px_8px_0_0_#0f172a]'
              }`}
            >
              {message.role === 'user' ? (
                <p className="whitespace-pre-wrap font-bold text-base sm:text-lg leading-snug">{message.content}</p>
              ) : (
                <div className="prose prose-slate max-w-none font-medium leading-relaxed marker:text-slate-900 prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-a:font-bold prose-strong:font-black prose-pre:bg-slate-100 prose-pre:border-2 prose-pre:border-slate-900 prose-pre:rounded-none prose-pre:text-slate-900 prose-code:font-mono prose-code:font-bold prose-code:text-slate-900 prose-code:bg-slate-100 prose-code:px-1 prose-code:border prose-code:border-slate-900 focus:outline-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-4 max-w-3xl mx-auto items-start">
            <div className="flex-none w-10 h-10 border-2 border-slate-900 bg-slate-900 text-white flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div className="bg-white border-2 border-slate-900 px-5 py-4 text-slate-900 font-bold uppercase tracking-widest text-xs shadow-[4px_4px_0_0_#0f172a] sm:shadow-[8px_8px_0_0_#0f172a] flex items-center">
              Processing <span className="animate-pulse ml-2 text-lg">...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="flex-none bg-slate-900 border-t-2 border-slate-900 p-4 sm:p-8 text-white relative z-10">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="hidden sm:flex gap-4 items-center mb-4">
             <div className="w-3 h-3 bg-cyan-400"></div>
             <div className="text-xl font-black tracking-tight italic opacity-90">"Awaiting Input"</div>
             <div className="flex-1 h-px bg-white opacity-20"></div>
             <div className="text-[10px] font-mono opacity-50 uppercase">Ready &gt; _</div>
          </div>
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-3 bg-white border-2 border-slate-900 p-2 shadow-[4px_4px_0_0_#22d3ee] focus-within:shadow-[8px_8px_0_0_#22d3ee] transition-shadow duration-200"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="YOUR MESSAGE HERE..."
              className="flex-1 max-h-32 min-h-[44px] resize-none border-0 bg-transparent px-4 py-3 text-sm sm:text-base font-bold text-slate-900 placeholder-slate-400 focus:ring-0 focus:outline-none uppercase tracking-wide"
              rows={1}
              style={{
                height: input ? `${Math.min(128, Math.max(44, input.split('\n').length * 20 + 24))}px` : '44px'
              }}
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="icon"
              className="mb-1 mr-1 rounded-none bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-500 border-2 border-transparent disabled:border-slate-300 transition-none h-10 w-10 shrink-0"
            >
              <Send size={18} />
            </Button>
          </form>
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-4">
            <p>Alex may produce inaccurate information.</p>
            <p className="hidden sm:block">/// END OF TRANSMISSION ///</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
