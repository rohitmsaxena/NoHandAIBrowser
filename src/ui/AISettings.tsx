// src/ui/AISettings.tsx
import React, { useEffect, useState } from "react";
import "./AISettings.css";
import { ModelConfig } from "../services/ai/modelManager";

interface AISettingsProps {
  isExpanded: boolean;
}

const AISettings: React.FC<AISettingsProps> = ({ isExpanded }) => {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loadedModelIds, setLoadedModelIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newModelPath, setNewModelPath] = useState<string>("");
  const [newModelName, setNewModelName] = useState<string>("");

  // Check if AI API is available and load models
  useEffect(() => {
    if (!window.aiAPI) {
      setError("AI API not available");
      return;
    }

    const loadModelsData = async () => {
      try {
        setIsLoading(true);
        const availableModels = await window.aiAPI.getAvailableModels();
        const loadedModels = await window.aiAPI.getLoadedModels();

        setModels(availableModels);
        setLoadedModelIds(loadedModels);
        setIsLoading(false);
      } catch (err: any) {
        console.error("Error loading models:", err);
        setError(err.message || "Error loading models");
        setIsLoading(false);
      }
    };

    loadModelsData();

    // Set up event listeners for model loading/unloading
    if (window.aiAPI) {
      window.aiAPI.onModelLoaded((modelId) => {
        setLoadedModelIds((prev) => [...prev, modelId]);
      });

      window.aiAPI.onModelUnloaded((modelId) => {
        setLoadedModelIds((prev) => prev.filter((id) => id !== modelId));
      });
    }

    return () => {
      if (window.aiAPI) {
        window.aiAPI.removeAllListeners();
      }
    };
  }, []);

  // Handle loading a model
  const handleLoadModel = async (modelId: string) => {
    if (!window.aiAPI) return;

    try {
      setIsLoading(true);
      await window.aiAPI.loadModel(modelId);
      setIsLoading(false);
    } catch (err: any) {
      console.error("Error loading model:", err);
      setError(err.message || "Error loading model");
      setIsLoading(false);
    }
  };

  // Handle unloading a model
  const handleUnloadModel = async (modelId: string) => {
    if (!window.aiAPI) return;

    try {
      setIsLoading(true);
      await window.aiAPI.unloadModel(modelId);
      setIsLoading(false);
    } catch (err: any) {
      console.error("Error unloading model:", err);
      setError(err.message || "Error unloading model");
      setIsLoading(false);
    }
  };

  // Handle registering a new model
  const handleRegisterModel = async () => {
    if (!window.aiAPI || !newModelPath || !newModelName) return;

    try {
      setIsLoading(true);
      await window.aiAPI.registerModel({
        id: `model-${Date.now()}`,
        name: newModelName,
        description: "User added model",
        path: newModelPath,
        parameters: 7, // Default to 7B
        contextSize: 4096,
        type: "chat",
        quantization: "4-bit",
        size: 0, // Will be updated after loading
      });

      // Refresh the model list
      const availableModels = await window.aiAPI.getAvailableModels();
      setModels(availableModels);

      // Clear the form
      setNewModelPath("");
      setNewModelName("");
      setIsLoading(false);
    } catch (err: any) {
      console.error("Error registering model:", err);
      setError(err.message || "Error registering model");
      setIsLoading(false);
    }
  };

  // Handle selecting a model file
  const handleSelectModelFile = async () => {
    try {
      // Use window.electron.ipcRenderer to send a message to the main process
      // The main process will open a file dialog and return the selected file path
      const filePath = await window.electronAPI.selectModelFile();

      if (filePath) {
        setNewModelPath(filePath);

        // If no name is provided yet, use the filename as default name
        if (!newModelName) {
          const fileName = filePath.split(/[\\/]/).pop() || "";
          // Remove file extension and format as a nicer name
          const modelName = fileName.replace(/\.\w+$/, "").replace(/_/g, " ");
          setNewModelName(modelName);
        }
      }
    } catch (err: any) {
      console.error("Error selecting model file:", err);
      setError(err.message || "Error selecting model file");
    }
  };

  // Don't render if sidebar is collapsed
  if (!isExpanded) {
    return null;
  }

  return (
    <div className="ai-settings">
      <h2>AI Settings</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="model-manager-section">
        <h3>Models</h3>

        {isLoading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            <div className="models-list">
              {models.length === 0 ? (
                <p>No models available. Add a model below.</p>
              ) : (
                models.map((model) => (
                  <div key={model.id} className="model-item">
                    <div className="model-info">
                      <div className="model-name">{model.name}</div>
                      <div className="model-details">
                        {model.parameters}B params • {model.type} •{" "}
                        {model.quantization}
                      </div>
                      <div className="model-path">{model.path}</div>
                    </div>
                    <div className="model-actions">
                      {loadedModelIds.includes(model.id) ? (
                        <button
                          onClick={() => handleUnloadModel(model.id)}
                          disabled={isLoading}
                        >
                          Unload
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLoadModel(model.id)}
                          disabled={isLoading}
                        >
                          Load
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="add-model-form">
              <h4>Add New Model</h4>
              <div className="form-field">
                <label>Model Name:</label>
                <input
                  type="text"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="e.g., Llama 3 8B Chat"
                />
              </div>
              <div className="form-field">
                <label>Model Path:</label>
                <div className="file-input-container">
                  <input
                    type="text"
                    value={newModelPath}
                    readOnly
                    placeholder="Select a model file"
                    className="file-path-display"
                  />
                  <button
                    onClick={handleSelectModelFile}
                    className="file-select-button"
                  >
                    Browse...
                  </button>
                </div>
              </div>
              <button
                onClick={handleRegisterModel}
                disabled={isLoading || !newModelPath || !newModelName}
              >
                Register Model
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AISettings;
