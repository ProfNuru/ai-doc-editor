import React, { useState, useEffect } from 'react';
import { useStore, AIProvider, MODEL_OPTIONS } from '../store/useStore';
import { X } from 'lucide-react';

interface SettingsDialogProps {
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ onClose }) => {
  const store = useStore();
  const [provider, setProvider] = useState<AIProvider>(store.provider);
  const [model, setModel] = useState(store.model);
  const [openaiKey, setOpenaiKey] = useState(store.openaiKey);
  const [anthropicKey, setAnthropicKey] = useState(store.anthropicKey);
  const [googleKey, setGoogleKey] = useState(store.googleKey);

  useEffect(() => {
    setProvider(store.provider);
    setModel(store.model);
    setOpenaiKey(store.openaiKey);
    setAnthropicKey(store.anthropicKey);
    setGoogleKey(store.googleKey);
  }, [store]);

  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
    setModel(MODEL_OPTIONS[newProvider][0]);
  };

  const handleSave = async () => {
    store.setProvider(provider);
    store.setModel(model);
    store.setKeys({ openaiKey, anthropicKey, googleKey });
    await store.saveKeys();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-md flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Active AI Provider</label>
            <select 
              value={provider} 
              onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
              className="px-3 py-2 border rounded-md bg-transparent dark:border-zinc-700"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google Gemini</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Model</label>
            <select 
              value={model} 
              onChange={(e) => setModel(e.target.value)}
              className="px-3 py-2 border rounded-md bg-transparent dark:border-zinc-700"
            >
              {MODEL_OPTIONS[provider].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">OpenAI API Key</label>
            <input 
              type="password" 
              value={openaiKey} 
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="px-3 py-2 border rounded-md bg-transparent dark:border-zinc-700"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Anthropic API Key</label>
            <input 
              type="password" 
              value={anthropicKey} 
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
              className="px-3 py-2 border rounded-md bg-transparent dark:border-zinc-700"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Google Gemini API Key</label>
            <input 
              type="password" 
              value={googleKey} 
              onChange={(e) => setGoogleKey(e.target.value)}
              placeholder="AIza..."
              className="px-3 py-2 border rounded-md bg-transparent dark:border-zinc-700"
            />
          </div>
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
