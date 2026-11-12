// The story model, chosen by the Task 2 gate. Kept apart from the hook so the worker
// can import it without pulling in React.
export const STORY_MODEL = 'onnx-community/Qwen3.5-0.8B-Text-ONNX';
/** Download size shown to the learner before they agree (q4f16, WebGPU). */
export const STORY_MODEL_MB = 470;
/** The only build of the model that runs in the browser: every quantized export fails on WASM. */
export const STORY_MODEL_DTYPE = 'q4f16';

/**
 * True when this browser can run the story model: a WebGPU adapter with 16-bit float shaders,
 * which q4f16 needs. Works on the page and in the worker.
 */
export async function hasWebGPU(): Promise<boolean> {
  const gpu = (navigator as unknown as {
    gpu?: { requestAdapter(): Promise<{ features: ReadonlySet<string> } | null> };
  }).gpu;
  if (!gpu) return false;
  try {
    const adapter = await gpu.requestAdapter();
    return !!adapter && adapter.features.has('shader-f16');
  } catch {
    return false;
  }
}
