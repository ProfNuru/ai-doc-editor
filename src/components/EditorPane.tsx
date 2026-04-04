import React from 'react';
import { EditorContent, Editor } from '@tiptap/react';
import mammoth from 'mammoth';
import htmlToDocx from 'html-to-docx';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { useStore } from '../store/useStore';
import { Bold, Italic, Heading1, Heading2, Save, FolderOpen } from 'lucide-react';

interface EditorPaneProps {
  editor: Editor | null;
}

export const EditorPane: React.FC<EditorPaneProps> = ({ editor }) => {
  const store = useStore();

  const handleOpen = async () => {
    try {
      const selectedPath = await open({
        multiple: false,
        filters: [{
          name: 'Word Document',
          extensions: ['docx']
        }]
      });

      if (selectedPath && typeof selectedPath === 'string') {
        const fileBytes = await readFile(selectedPath);
        // mammoth expects an array buffer
        const result = await mammoth.convertToHtml({ arrayBuffer: fileBytes.buffer });
        if (editor) {
          editor.commands.setContent(result.value);
        }
        store.setCurrentFilePath(selectedPath);
      }
    } catch (e) {
      console.error("Failed to open file", e);
    }
  };

  const handleSave = async (isSaveAs: boolean = false) => {
    try {
      if (!editor) return;
      
      let targetPath = store.currentFilePath;
      
      if (!targetPath || isSaveAs) {
        const selectedPath = await save({
          filters: [{
            name: 'Word Document',
            extensions: ['docx']
          }]
        });
        if (!selectedPath) return; // User cancelled
        targetPath = selectedPath;
        store.setCurrentFilePath(targetPath);
      }

      // Export HTML from TipTap
      const htmlContent = `<!DOCTYPE html><html><body>${editor.getHTML()}</body></html>`;
      
      // Convert HTML to Docx Blob
      const docxBlob = await htmlToDocx(htmlContent, null, {
        documentOptions: {
          creator: 'AI Doc Editor',
        }
      });
      
      // Read array buffer from blob and write to file system
      const arrayBuffer = await docxBlob.arrayBuffer();
      const unit8Array = new Uint8Array(arrayBuffer);
      await writeFile(targetPath, unit8Array);
      
    } catch (e) {
      console.error("Failed to save file", e);
    }
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
        <button 
          onClick={handleOpen}
          className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md"
          title="Open Document"
        >
          <FolderOpen size={18} />
        </button>
        <button 
          onClick={() => handleSave(false)}
          className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md"
          title="Save Document"
        >
          <Save size={18} />
        </button>

        <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 mx-2"></div>

        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded-md ${editor.isActive('bold') ? 'bg-zinc-200 dark:bg-zinc-800' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
        >
          <Bold size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded-md ${editor.isActive('italic') ? 'bg-zinc-200 dark:bg-zinc-800' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
        >
          <Italic size={18} />
        </button>
        
        <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 mx-2"></div>
        
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded-md ${editor.isActive('heading', { level: 1 }) ? 'bg-zinc-200 dark:bg-zinc-800' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
        >
          <Heading1 size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded-md ${editor.isActive('heading', { level: 2 }) ? 'bg-zinc-200 dark:bg-zinc-800' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
        >
          <Heading2 size={18} />
        </button>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center">
        <div className="w-full max-w-[800px] bg-white dark:bg-zinc-950 min-h-full">
          <EditorContent editor={editor} className="prose dark:prose-invert max-w-none" />
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="flex justify-between p-2 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
        <div>{store.currentFilePath || 'Untitled.docx'}</div>
        <div>
          {editor.storage.characterCount.words()} words
        </div>
      </div>
    </div>
  );
};
