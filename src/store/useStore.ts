import { create } from 'zustand';
import { load } from '@tauri-apps/plugin-store';

export type AIProvider = 'openai' | 'anthropic' | 'google';

interface StoreState {
  provider: AIProvider;
  openaiKey: string;
  anthropicKey: string;
  googleKey: string;
  setProvider: (provider: AIProvider) => void;
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
  openaiKey: '',
  anthropicKey: '',
  googleKey: '',
  
  setProvider: (provider) => set({ provider }),
  setKeys: (keys) => set((state) => ({ ...state, ...keys })),
  
  loadKeys: async () => {
    try {
      const store = await load(STORE_PATH);
      const provider = await store.get<{value: string}>('provider');
      const openaiKey = await store.get<{value: string}>('openaiKey');
      const anthropicKey = await store.get<{value: string}>('anthropicKey');
      const googleKey = await store.get<{value: string}>('googleKey');
      set({ 
        provider: (provider?.value as AIProvider) || 'openai', 
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
