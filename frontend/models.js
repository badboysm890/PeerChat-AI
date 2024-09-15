// models.js

// Import the provided model list
import { prebuiltAppConfig } from './model_list.js';

/**
 * Loads the models into the selection dropdown.
 */
export function loadModels() {
  // Expose model list globally
  window.modelList = prebuiltAppConfig.model_list;

  // Load models into the dropdown
  updateModelList(window.modelList);
}

/**
 * Updates the model selection dropdown with available models.
 * @param {Array} models - The list of models to populate.
 */
export function updateModelList(models) {
  const modelListElement = document.getElementById('model-list');
  modelListElement.innerHTML = '';

  models.forEach((model) => {
    const option = document.createElement('option');
    option.value = model.model_id;
    option.textContent = `${model.model_id} - ${model.low_resource_required ? 'Low Resource' : 'High Resource'}`;
    modelListElement.appendChild(option);
  });

  // Initialize the select using Bootstrap's custom select if needed
  // Bootstrap 4 doesn't require additional initialization for standard selects
}