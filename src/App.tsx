import { useEffect } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import { EditorPane } from './components/EditorPane';
import { ChatWidget } from './components/ChatWidget';
import { useStore } from './store/useStore';
import './App.css';

function App() {
  const store = useStore();

  useEffect(() => {
    store.loadKeys();
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      CharacterCount,
    ],
    content: '<p>Start typing or ask the AI to write something...</p>',
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[500px] h-full w-full',
      },
    },
  });

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      <div className="flex-1 w-[70%] h-full">
        <EditorPane editor={editor} />
      </div>
      <div className="w-[30%] min-w-[320px] max-w-[450px] h-full border-l border-zinc-200 dark:border-zinc-800">
        <ChatWidget editor={editor} />
      </div>
    </div>
  );
}

export default App;
