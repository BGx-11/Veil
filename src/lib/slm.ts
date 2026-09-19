import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.allowRemoteModels = true;
// @ts-ignore
env.useBrowserCache = true; // IMPORTANT: Must be true so models are downloaded/cached in browser
// @ts-ignore
env.backends.onnx.wasm.wasmPaths = '/wasm/';

export const RECOMMENDED_MODELS = [
  { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', name: 'Qwen 2.5 (0.5B)', desc: 'Extremely smart and capable for its size. Best overall.', size: '~400MB' },
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', name: 'Llama 3.2 (1B)', desc: 'State of the art reasoning, but requires more RAM and takes longer to load.', size: '~800MB' },
  { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC', name: 'Phi 3.5 Mini', desc: 'Powerful Microsoft model, balanced speed and quality.', size: '~2GB' },
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen 2.5 (1.5B)', desc: 'Very capable intermediate model.', size: '~1GB' },
];

let _enginePromise: Promise<any> | null = null;
let _translatorPromise: Promise<any> | null = null;
let _progressCallbacks: Set<(data: any) => void> = new Set();
let _activeModelId: string = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';

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
  _enginePromise = null; // force re-init next time
}

export async function getSLMPipeline(progressCallback?: (data: any) => void) {
  if (progressCallback) {
    _progressCallbacks.add(progressCallback);
  }
  
  if (!_enginePromise) {
    const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
    const modelIdToLoad = getActiveModelId();
    
    const initProgressCallback = (report: any) => {
      const percentage = report.progress; // 0 to 1
      for (const cb of _progressCallbacks) {
        if (percentage >= 1) {
          cb({ status: 'ready' });
        } else {
          cb({ status: 'downloading', loaded: percentage * 100, total: 100 });
        }
      }
    };
    
    _enginePromise = CreateMLCEngine(modelIdToLoad, {
      initProgressCallback
    }).catch(async (err) => {
      console.warn("WebLLM initialization failed:", err);
      _enginePromise = null;
      throw err;
    });
  }
  return _enginePromise;
}

export function removeSLMProgressCallback(cb: (data: any) => void) {
  _progressCallbacks.delete(cb);
}

export async function getTranslatorPipeline(progressCallback?: (data: any) => void) {
  if (progressCallback) {
    _progressCallbacks.add(progressCallback);
  }
  
  if (!_translatorPromise) {
    const progress_callback = (data: any) => {
      for (const cb of _progressCallbacks) {
        cb(data);
      }
    };
    
    _translatorPromise = pipeline('translation', 'Xenova/nllb-200-distilled-600M', {
      dtype: 'q8',
      progress_callback
    }).catch(async (err) => {
      console.warn("Translator initialization failed:", err);
      throw err;
    });
  }
  return _translatorPromise;
}
