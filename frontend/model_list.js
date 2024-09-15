// model_list.js

export const prebuiltAppConfig = {
    // Paste the entire code you provided here, starting from `export const prebuiltAppConfig = { ... };`
    // For brevity, only a few models are included here as an example.
  
    useIndexedDBCache: false,
    model_list: [
      {
        model: "https://huggingface.co/mlc-ai/Llama-3.1-8B-Instruct-q4f32_1-MLC",
        model_id: "Llama-3.1-8B-Instruct-q4f32_1-MLC",
        model_lib: "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_48/Llama-3_1-8B-Instruct-q4f32_1-ctx4k_cs1k-webgpu.wasm",
        vram_required_MB: 6101.01,
        low_resource_required: false,
        overrides: {
          context_window_size: 4096,
        },
      },
      {
        model: "https://huggingface.co/mlc-ai/SmolLM-135M-Instruct-q4f16_1-MLC",
        model_id: "SmolLM-135M-Instruct-q4f16_1-MLC",
        model_lib: "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_48/SmolLM-135M-Instruct-q4f16_1-ctx2k_cs1k-webgpu.wasm",
        vram_required_MB: 130.33,
        low_resource_required: true,
        required_features: ["shader-f16"],
        overrides: {
          context_window_size: 2048,
        },
      },
      {
        model: "https://huggingface.co/mlc-ai/SmolLM-360M-Instruct-q0f16-MLC",
        model_id: "SmolLM-360M-Instruct-q0f16-MLC",
        model_lib: "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_48/SmolLM-360M-Instruct-q0f16-ctx2k_cs1k-webgpu.wasm",
        vram_required_MB: 360.33,
        low_resource_required: true,
        required_features: ["shader-f16"],
        overrides: {
          context_window_size: 2048,
        },
      }
      
    ],
  };


//   model: "https://huggingface.co/mlc-ai/SmolLM-135M-Instruct-q4f16_1-MLC",
//       model_id: "SmolLM-135M-Instruct-q4f16_1-MLC",
//       model_lib:
//         modelLibURLPrefix +
//         modelVersion +
//         "/SmolLM-135M-Instruct-q4f16_1-ctx2k_cs1k-webgpu.wasm",
//       vram_required_MB: 130.33,
//       low_resource_required: true,
//       required_features: ["shader-f16"],
//       overrides: {
//         context_window_size: 2048,