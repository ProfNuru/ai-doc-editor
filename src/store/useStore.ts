import { create } from 'zustand';
import { load } from '@tauri-apps/plugin-store';

export type AIProvider = 'openai' | 'anthropic' | 'google';

export const MODEL_OPTIONS: Record<AIProvider, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022', 'claude-3-7-sonnet-20250219'],
  google: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
};

interface StoreState {
  provider: AIProvider;
  model: string;
  openaiKey: string;
  anthropicKey: string;
  googleKey: string;
  setProvider: (provider: AIProvider) => void;
  setModel: (model: string) => void;
  setKeys: (keys: { openaiKey?: string; anthropicKey?: string; googleKey?: string }) => void;
  loadKeys: () => Promise<void>;
  saveKeys: () => Promise<void>;
  
  // File state
  currentFilePath: string | null;
  setCurrentFilePath: (path: string | null) => void;
}

const STORE_PATH = 'settings.json';

export const useStore = create<StoreState>((set, get) => ({
  provider: 'openai',
  model: 'gpt-4o',
  openaiKey: '',
  anthropicKey: '',
  googleKey: '',
  
  setProvider: (provider) => set({ provider, model: MODEL_OPTIONS[provider][0] }),
  setModel: (model) => set({ model }),
  setKeys: (keys) => set((state) => ({ ...state, ...keys })),
  
  loadKeys: async () => {
    try {
      const store = await load(STORE_PATH);
      const provider = await store.get<{value: string}>('provider');
      const model = await store.get<{value: string}>('model');
      const openaiKey = await store.get<{value: string}>('openaiKey');
      const anthropicKey = await store.get<{value: string}>('anthropicKey');
      const googleKey = await store.get<{value: string}>('googleKey');
      const resolvedProvider = (provider?.value as AIProvider) || 'openai';
      set({ 
        provider: resolvedProvider, 
        model: model?.value || MODEL_OPTIONS[resolvedProvider][0],
        openaiKey: openaiKey?.value || '', 
        anthropicKey: anthropicKey?.value || '', 
        googleKey: googleKey?.value || '' 
      });
    } catch (e) {
      console.error("Failed to load settings from store", e);
    }
  },
  
  saveKeys: async () => {
    try {
      const state = get();
      const store = await load(STORE_PATH);
      await store.set('provider', {value: state.provider});
      await store.set('model', {value: state.model});
      await store.set('openaiKey', {value: state.openaiKey});
      await store.set('anthropicKey', {value: state.anthropicKey});
      await store.set('googleKey', {value: state.googleKey});
      await store.save();
    } catch (e) {
      console.error("Failed to save settings to store", e);
    }
  },

  currentFilePath: null,
  setCurrentFilePath: (path) => set({ currentFilePath: path }),
}));
