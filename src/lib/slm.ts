import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.allowRemoteModels = true;
// @ts-ignore
env.useBrowserCache = true; // IMPORTANT: Must be true so models are downloaded/cached in browser
// @ts-ignore
env.backends.onnx.wasm.wasmPaths = '/wasm/';

export const RECOMMENDED_MODELS = [
  { id: 'Xenova/Qwen1.5-0.5B-Chat', name: 'Qwen 1.5 (0.5B)', desc: 'Fast, balanced performance for general chat.', size: '~300MB' },
  { id: 'Felladrin/onnx-Llama-160M-Chat-v1', name: 'Llama 160M', desc: 'Ultra-lightweight, extremely fast but less capable.', size: '~100MB' },
  { id: 'Xenova/TinyLlama-1.1B-Chat-v1.0', name: 'TinyLlama 1.1B', desc: 'Smarter and more capable, but slower to load.', size: '~600MB' },
  { id: 'Xenova/phi-1_5', name: 'Phi 1.5', desc: 'Excellent reasoning for its size, focused on coding and logic.', size: '~800MB' },
];

let _generatorPromise: Promise<any> | null = null;
let _progressCallbacks: Set<(data: any) => void> = new Set();
let _activeModelId: string = 'Xenova/Qwen1.5-0.5B-Chat';

export function getActiveModelId() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('veil_active_slm') || _activeModelId;
  }
  return _activeModelId;
}

export function setActiveModelId(modelId: string) {
  _activeModelId = modelId;
  if (typeof window !== 'undefined') {
    localStorage.setItem('veil_active_slm', modelId);
  }
  _generatorPromise = null; // force re-init next time
}

export async function getSLMPipeline(progressCallback?: (data: any) => void) {
  if (progressCallback) {
    _progressCallbacks.add(progressCallback);
  }
  
  if (!_generatorPromise) {
    const modelIdToLoad = getActiveModelId();
    _generatorPromise = pipeline('text-generation', modelIdToLoad, {
      device: 'webgpu',
      dtype: 'q4f16',
      progress_callback: (data: any) => {
        for (const cb of _progressCallbacks) {
          cb(data);
        }
      }
    });
  }
  return _generatorPromise;
}

export function removeSLMProgressCallback(cb: (data: any) => void) {
  _progressCallbacks.delete(cb);
}
