import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Editor } from '@tiptap/react';
import { streamText, tool, stepCountIs } from 'ai';

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
        return openai(store.model);
      case 'anthropic':
        if (!store.anthropicKey) throw new Error("Anthropic key not configured");
        const anthropic = createAnthropic({ apiKey: store.anthropicKey });
        return anthropic(store.model);
      case 'google':
        if (!store.googleKey) throw new Error("Google key not configured");
        const google = createGoogleGenerativeAI({ apiKey: store.googleKey });
        return google(store.model);
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
      
      const docText = editor.getText();
      const systemPrompt = `You are an AI document editor assistant. You have access to tools to modify the current document that is open in a rich-text editor (TipTap).

AVAILABLE TOOLS:
- "set_document_content": Replace the ENTIRE document with new content. Use for rewriting everything or clearing the document.
- "replace_text": Find and replace a specific substring. Use for changing specific words or sentences.
- "insert_at_end": Append new content after existing content.
- "delete_text": Remove a specific piece of text.
- "format_text": Apply visual formatting (bold, italic, underline, h1, h2, h3) to text. CRITICAL: You MUST use this tool whenever the user asks to make text bold, bigger, larger, italic, underline, or change heading levels. Do NOT try to format with HTML tags or set_document_content - those won't apply real formatting.
- "read_document": Read the full document text.

CRITICAL RULES:
- When the user asks to FORMAT or STYLE text (bold, bigger, heading, italic), you MUST use "format_text". Never use set_document_content or replace_text for formatting.
- When the user asks to WRITE or CHANGE text content, use the appropriate content tool.
- Do NOT output edited text in chat. Use tools instead.

WORKFLOW (you MUST follow this exact sequence):
1. [ANALYSIS]: Analyze the user's request. Is it complex? Do you need more context?
   - If the request requires looking at specific text not visible in the snippet below, use "read_document" FIRST to plan your edits.
   - Break down complex requests into a sequence of simpler tool calls.
2. [EXECUTION]: Make your edits using the appropriate tool(s) based on your analysis.
3. [VERIFICATION]: ALWAYS call "read_document" to verify your edits had the expected result.
4. [CONFIRMATION]: If successful, briefly confirm to the user what you did. If it failed, analyze the failure and try again.

Current document snippet:
"""
${docText.substring(0, 3000)}
"""`;

      const result = streamText({
        model,
        messages: newMessages,
        system: systemPrompt,
        stopWhen: stepCountIs(5),
        onStepFinish({ stepNumber, text, toolCalls, toolResults }) {
          console.log(`[AI] Step ${stepNumber} finished`, { text: text?.substring(0, 100), toolCalls, toolResults });
        },
        tools: {
          set_document_content: tool({
            description: "Replace the ENTIRE document with new content. Use this when the user wants to rewrite everything, clear the document, or replace all content. The content can include HTML tags for formatting like <h1>, <h2>, <p>, <strong>, <em>, <ul>, <li>.",
            inputSchema: z.object({
              content: z.string().describe("The new full document content (can include HTML tags for formatting)")
            }),
            execute: async ({ content }) => {
              console.log('[Tool] set_document_content called with:', content.substring(0, 200));
              const htmlContent = content.includes('<') ? content : content.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('');
              editor.commands.setContent(htmlContent);
              return `Document content has been completely replaced with new content.`;
            }
          }),
          replace_text: tool({
            description: "Find and replace a specific substring in the document. Use for targeted edits.",
            inputSchema: z.object({
              searchText: z.string().describe("The exact text to find in the document"),
              replacement: z.string().describe("The new text to replace it with. Use empty string to delete.")
            }),
            execute: async ({ searchText, replacement }) => {
              console.log('[Tool] replace_text called:', { searchText: searchText.substring(0, 50), replacement: replacement.substring(0, 50) });
              const currentText = editor.getText();
              if (currentText.includes(searchText)) {
                const content = editor.getHTML();
                const newContent = content.replace(new RegExp(escapeRegExp(searchText), 'g'), replacement);
                editor.commands.setContent(newContent);
                return `Successfully replaced the text.`;
              }
              return `Text not found in document. Try using read_document to see the exact current text.`;
            }
          }),
          delete_text: tool({
            description: "Delete a specific piece of text from the document.",
            inputSchema: z.object({
              textToDelete: z.string().describe("The exact text to remove from the document")
            }),
            execute: async ({ textToDelete }) => {
              console.log('[Tool] delete_text called:', textToDelete.substring(0, 50));
              const currentText = editor.getText();
              if (currentText.includes(textToDelete)) {
                const content = editor.getHTML();
                const newContent = content.replace(new RegExp(escapeRegExp(textToDelete), 'g'), '');
                editor.commands.setContent(newContent);
                return `Successfully deleted the specified text.`;
              }
              return `Text not found in document.`;
            }
          }),
          insert_at_end: tool({
            description: "Appends new content to the end of the document. Content can include HTML.",
            inputSchema: z.object({
              text: z.string().describe("The text/HTML to append at the end")
            }),
            execute: async ({ text }) => {
              console.log('[Tool] insert_at_end called:', text.substring(0, 100));
              editor.commands.insertContentAt(editor.state.doc.content.size, text);
              return `Appended text to the end of the document.`;
            }
          }),
          read_document: tool({
            description: "Reads the entire document text. Use this to see the full current content before making changes.",
            inputSchema: z.object({}),
            execute: async () => {
              console.log('[Tool] read_document called');
              return editor.getText();
            }
          }),
          format_text: tool({
            description: "Apply formatting to a specific piece of text in the document. Can make text bold, italic, underline, or convert it to a heading (h1, h2, h3). Use this when the user asks to change the style/appearance of text like making it bigger, bolder, etc.",
            inputSchema: z.object({
              text: z.string().describe("The exact text to format"),
              formatting: z.array(z.enum(['bold', 'italic', 'underline', 'h1', 'h2', 'h3'])).describe("Array of formatting to apply, e.g. ['bold', 'h1']")
            }),
            execute: async ({ text, formatting }) => {
              console.log('[Tool] format_text called:', { text: text.substring(0, 80), formatting });
              
              // Search full document text for position
              const fullText = editor.getText();
              const searchIdx = fullText.indexOf(text);
              
              if (searchIdx === -1) {
                console.log('[Tool] format_text: text not found in:', fullText.substring(0, 200));
                return `Text "${text.substring(0, 50)}" not found in document. Use read_document to see exact text.`;
              }
              
              // Map plain-text offset to ProseMirror position
              // We need to walk the document to translate the plain-text index to a doc position
              const doc = editor.state.doc;
              let charCount = 0;
              let from = -1;
              let to = -1;
              
              doc.descendants((node, pos) => {
                if (from !== -1 && to !== -1) return false;
                
                if (node.isText && node.text) {
                  const nodeStart = charCount;
                  const nodeEnd = charCount + node.text.length;
                  
                  // Check if the search range starts in this node
                  if (from === -1 && searchIdx >= nodeStart && searchIdx < nodeEnd) {
                    from = pos + (searchIdx - nodeStart);
                  }
                  
                  // Check if the search range ends in this node
                  if (from !== -1 && to === -1 && (searchIdx + text.length) <= nodeEnd) {
                    to = pos + (searchIdx + text.length - nodeStart);
                  }
                  
                  charCount = nodeEnd;
                } else if (node.isBlock && node.content.size === 0) {
                  // Empty blocks still add a newline in getText()
                } else if (node.isBlock && pos > 0) {
                  // Block boundaries add separator characters in getText()
                  charCount += 1; // newline between blocks
                }
              });
              
              // Fallback: if precise mapping failed, try direct node search
              if (from === -1 || to === -1) {
                doc.descendants((node, pos) => {
                  if (from !== -1) return false;
                  if (node.isText && node.text) {
                    const idx = node.text.indexOf(text);
                    if (idx !== -1) {
                      from = pos + idx;
                      to = from + text.length;
                      return false;
                    }
                  }
                });
              }
              
              if (from === -1 || to === -1) {
                return `Could not locate text position. Try a different or shorter text.`;
              }
              
              console.log('[Tool] format_text: found at positions', { from, to });
              
              // Build a chain with selection + all formatting
              let chain = editor.chain().focus().setTextSelection({ from, to });
              
              for (const fmt of formatting) {
                switch (fmt) {
                  case 'bold':
                    chain = chain.setBold();
                    break;
                  case 'italic':
                    chain = chain.setItalic();
                    break;
                  case 'underline':
                    chain = chain.setUnderline();
                    break;
                  case 'h1':
                    chain = chain.setHeading({ level: 1 });
                    break;
                  case 'h2':
                    chain = chain.setHeading({ level: 2 });
                    break;
                  case 'h3':
                    chain = chain.setHeading({ level: 3 });
                    break;
                }
              }
              
              chain.run();
              
              return `Applied formatting [${formatting.join(', ')}] to "${text.substring(0, 50)}".`;
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

      // If the AI only called tools and didn't produce text, show a default confirmation
      if (!fullResponse.trim()) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: '✅ Done! I\'ve updated the document.' };
          return updated;
        });
      }
      
    } catch (e: any) {
      console.error(e);
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${e.message}. Please check your API keys in Settings.` }]);
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
