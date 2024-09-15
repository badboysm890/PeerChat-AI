// webllm.js

import * as webllm from 'https://esm.run/@mlc-ai/web-llm';
import { prebuiltAppConfig } from './model_list.js'; // Import the model list configuration

let engineInstance = null;
export let selectedModelId = null;

/**
 * Checks if the device is capable of running the LLM locally.
 * @returns {Promise<boolean>} - True if capable, else false.
 */
export async function isDeviceCapable() {
  if (!navigator.gpu) {
    return false;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return false;
    const device = await adapter.requestDevice();
    if (!device) return false;
    // Device is capable
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Initializes the WebLLM engine.
 * @returns {Promise<object>} - The initialized engine instance.
 */
export async function initializeWebLLM() {
  if (engineInstance) {
    return engineInstance;
  }

  // Get selected model from the dropdown
  const modelListElement = document.getElementById('model-list');
  selectedModelId = modelListElement.value || prebuiltAppConfig.model_list[0].model_id;

  // Show model loading indicator
  showModelLoading();

  const initProgressCallback = (progress) => {
    console.log('Model loading progress:', progress);
    updateProgressBar(progress);
  };

  const engineConfig = {
    initProgressCallback,
    appConfig: {
      model_list: window.modelList, // Use the global model list loaded in models.js
      useIndexedDBCache: prebuiltAppConfig.useIndexedDBCache, // Utilize the configuration from model_list.js
    },
  };

  try {
    const engine = await webllm.CreateMLCEngine(
      selectedModelId,
      engineConfig
    );

    engineInstance = engine;

    // Hide model loading indicator after loading
    hideModelLoading();

    return engineInstance;
  } catch (error) {
    console.error('Error initializing WebLLM:', error);
    hideModelLoading();
    throw error;
  }
}

/**
 * Updates the progress bar based on the model loading progress.
 * @param {object} progress - The progress information.
 */
function updateProgressBar(progress) {
  const progressBar = document.getElementById('model-loading-bar');
  if (progressBar) {
    const percentage = Math.floor(progress.progress * 100);
    progressBar.style.width = `${percentage}%`;
    progressBar.setAttribute('aria-valuenow', percentage);
  }
}

/**
 * Shows the model loading indicator.
 */
function showModelLoading() {
  const modelLoading = document.getElementById('model-loading');
  if (modelLoading) {
    modelLoading.style.display = 'block';
  }
}

/**
 * Hides the model loading indicator.
 */
function hideModelLoading() {
  const modelLoading = document.getElementById('model-loading');
  if (modelLoading) {
    modelLoading.style.display = 'none';
  }
}