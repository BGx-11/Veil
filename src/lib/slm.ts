import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = true;
env.allowRemoteModels = false;
// @ts-ignore
env.localModelPath = '/models/';
env.useBrowserCache = false;
// @ts-ignore
env.backends.onnx.wasm.wasmPaths = '/wasm/';

let _generatorPromise: Promise<any> | null = null;
let _progressCallbacks: Set<(data: any) => void> = new Set();

export async function getSLMPipeline(progressCallback?: (data: any) => void) {
  if (progressCallback) {
    _progressCallbacks.add(progressCallback);
  }
  
  if (!_generatorPromise) {
    _generatorPromise = pipeline('text-generation', 'Xenova/TinyLlama-1.1B-Chat-v1.0', {
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
