import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.allowRemoteModels = true;
// @ts-ignore
env.useBrowserCache = true; // IMPORTANT: Must be true so models are downloaded/cached in browser
// @ts-ignore
env.backends.onnx.wasm.wasmPaths = '/wasm/';

export const RECOMMENDED_MODELS = [
  { id: 'onnx-community/Qwen2.5-0.5B-Instruct', name: 'Qwen 2.5 (0.5B)', desc: 'Extremely smart and capable for its size. Best overall.', size: '~350MB' },
  { id: 'onnx-community/Llama-3.2-1B-Instruct', name: 'Llama 3.2 (1B)', desc: 'State of the art reasoning, but requires more RAM and takes longer to load.', size: '~800MB' },
  { id: 'Xenova/Qwen1.5-0.5B-Chat', name: 'Qwen 1.5 (0.5B)', desc: 'Fast, balanced legacy model for general chat.', size: '~300MB' },
  { id: 'Felladrin/onnx-Llama-160M-Chat-v1', name: 'Llama 160M', desc: 'Ultra-lightweight, extremely fast but less capable.', size: '~100MB' },
];

let _generatorPromise: Promise<any> | null = null;
let _progressCallbacks: Set<(data: any) => void> = new Set();
let _activeModelId: string = 'onnx-community/Qwen2.5-0.5B-Instruct';

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
    const progress_callback = (data: any) => {
      for (const cb of _progressCallbacks) {
        cb(data);
      }
    };
    
    _generatorPromise = pipeline('text-generation', modelIdToLoad, {
      device: 'webgpu',
      dtype: 'q4f16',
      progress_callback
    }).catch(async (err) => {
      console.warn("WebGPU initialization failed, falling back to WASM:", err);
      // Fallback to WebAssembly if WebGPU is not available
      return pipeline('text-generation', modelIdToLoad, {
        device: 'wasm',
        dtype: 'q8',
        progress_callback
      });
    });
  }
  return _generatorPromise;
}

export function removeSLMProgressCallback(cb: (data: any) => void) {
  _progressCallbacks.delete(cb);
}
