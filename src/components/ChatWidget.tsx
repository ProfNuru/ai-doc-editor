import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Editor } from '@tiptap/react';
import { streamText, tool } from 'ai';

type CoreMessage = { role: 'user' | 'assistant'; content: string };
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { Send, Settings, Bot, User } from 'lucide-react';
import { SettingsDialog } from './SettingsDialog';

interface ChatWidgetProps {
  editor: Editor | null;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ editor }) => {
  const store = useStore();
  const [messages, setMessages] = useState<CoreMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getModel = () => {
    switch (store.provider) {
      case 'openai':
        if (!store.openaiKey) throw new Error("OpenAI key not configured");
        const openai = createOpenAI({ apiKey: store.openaiKey });
        return openai('gpt-4o');
      case 'anthropic':
        if (!store.anthropicKey) throw new Error("Anthropic key not configured");
        const anthropic = createAnthropic({ apiKey: store.anthropicKey });
        return anthropic('claude-3-7-sonnet-20250219');
      case 'google':
        if (!store.googleKey) throw new Error("Google key not configured");
        const google = createGoogleGenerativeAI({ apiKey: store.googleKey });
        return google('gemini-2.5-pro');
      default:
        throw new Error("Invalid provider");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !editor) return;

    const userMessage: CoreMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const model = getModel();
      
      const systemPrompt = `You are an AI document editor assistant. You have access to tools to modify the current document.
If the user asks you to modify the document, USE YOUR TOOLS.
Do not output the edited text directly in the chat unless specifically asked.
Current Document Text Segment: """${editor.getText().substring(0, 2000)}..."""`;

      const result = streamText({
        model,
        messages: newMessages,
        system: systemPrompt,
        tools: {
          replace_text: tool({
            description: "Replace a specific substring in the document with new text.",
            parameters: z.object({
              searchText: z.string().describe("The exact text to find in the document"),
              replacement: z.string().describe("The new text to replace it with")
            }),
            // @ts-ignore
            execute: async ({ searchText, replacement }) => {
              const currentText = editor.getText();
              if (currentText.includes(searchText)) {
                const content = editor.getHTML();
                const newContent = content.replace(new RegExp(escapeRegExp(searchText), 'g'), replacement);
                editor.commands.setContent(newContent);
                return `Replaced "${searchText}" with "${replacement}"`;
              }
              return `Text "${searchText}" not found in document.`;
            }
          }),
          insert_at_end: tool({
            description: "Appends text to the very end of the document",
            parameters: z.object({
              text: z.string().describe("The text to append")
            }),
            // @ts-ignore
            execute: async ({ text }) => {
              editor.commands.insertContentAt(editor.state.doc.content.size, `\n${text}`);
              return `Appended text to document.`;
            }
          }),
          read_document: tool({
            description: "Reads the entire document text. Use this if you need to see more than the snippet in the system prompt.",
            parameters: z.object({}),
            // @ts-ignore
            execute: async () => {
              return editor.getText();
            }
          })
        }
      });

      let fullResponse = '';
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      for await (const textPart of result.textStream) {
        fullResponse += textPart;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullResponse };
          return updated;
        });
      }
      
      // We must await tool calls if they happen, streamText handles it automatically with maxSteps
      // Once it completes, the final state of messages can be extracted, but streamText manages the loop.
      // We will just fetch the final message list from result.response if needed, but for now we appended text visually.
      
    } catch (e: any) {
      console.error(e);
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${e.message}. Please check your API keys.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800">
      <div className="flex justify-between items-center p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <h2 className="font-semibold flex items-center gap-2">
          <Bot size={20} className="text-blue-500" />
          AI Assistant
        </h2>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500"
        >
          <Settings size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.filter(m => m.role === 'user' || (m.role === 'assistant' && m.content)).map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
              {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`px-4 py-2 rounded-2xl max-w-[85%] ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'}`}>
              <pre className="whitespace-pre-wrap font-sans text-sm m-0">{m.content as string}</pre>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <Bot size={16} />
            </div>
            <div className="px-4 py-2 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm italic text-zinc-500">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask me to write or edit..."
          className="flex-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-full px-4 py-2 text-sm outline-none focus:border-blue-500"
          disabled={isLoading}
        />
        <button 
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 hover:bg-blue-700 disabled:opacity-50"
        >
          <Send size={16} className="-ml-0.5" />
        </button>
      </div>

      {isSettingsOpen && <SettingsDialog onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
};
