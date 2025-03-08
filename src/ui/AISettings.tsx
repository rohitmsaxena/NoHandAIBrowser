// src/ui/AISettings.tsx
import React, { useEffect, useState } from "react";
import "./AISettings.css";

// Import the ModelConfig type directly
interface ModelConfig {
  id: string;
  name: string;
  description: string;
  path: string;
  parameters: number;
  contextSize: number;
  isLoaded: boolean;
  type: "chat" | "vision" | "embedding";
  quantization: "4-bit" | "5-bit" | "8-bit" | "none";
  size: number;
}

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
  const [apiChecked, setApiChecked] = useState<boolean>(false);

  // Check if AI API is available and load models
  useEffect(() => {
    console.log("AISettings checking if aiAPI exists:", !!window.aiAPI);
    setApiChecked(true);

    if (!window.aiAPI) {
      setError(
        "AI API not available in window object. Make sure the aiAPI is properly exposed in the preload script.",
      );
      console.error(
        "Available APIs:",
        Object.keys(window).filter((key) => key.includes("API")),
      );
      return;
    }

    const loadModelsData = async () => {
      try {
        setIsLoading(true);
        console.log("Fetching available models...");
        const availableModels = await window.aiAPI.getAvailableModels();
        console.log("Fetched models:", availableModels);

        console.log("Fetching loaded models...");
        const loadedModels = await window.aiAPI.getLoadedModels();
        console.log("Loaded models:", loadedModels);

        setModels(availableModels);
        setLoadedModelIds(loadedModels);
        setIsLoading(false);
      } catch (err: any) {
        console.error("Error loading models:", err);
        setError(`Error loading models: ${err.message || JSON.stringify(err)}`);
        setIsLoading(false);
      }
    };

    loadModelsData();

    // Set up event listeners for model loading/unloading
    if (window.aiAPI) {
      window.aiAPI.onModelLoaded((modelId) => {
        console.log("Model loaded event:", modelId);
        setLoadedModelIds((prev) => [...prev, modelId]);
      });

      window.aiAPI.onModelUnloaded((modelId) => {
        console.log("Model unloaded event:", modelId);
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
    if (!window.aiAPI) {
      setError("AI API not available");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log("Loading model:", modelId);
      const success = await window.aiAPI.loadModel(modelId);
      console.log("Model load result:", success);

      if (!success) {
        setError("Failed to load model. Check the console for details.");
      }
      setIsLoading(false);
    } catch (err: any) {
      console.error("Error loading model:", err);
      setError(`Error loading model: ${err.message || JSON.stringify(err)}`);
      setIsLoading(false);
    }
  };

  // Handle unloading a model
  const handleUnloadModel = async (modelId: string) => {
    if (!window.aiAPI) {
      setError("AI API not available");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log("Unloading model:", modelId);
      const success = await window.aiAPI.unloadModel(modelId);
      console.log("Model unload result:", success);

      if (!success) {
        setError("Failed to unload model. Check the console for details.");
      }
      setIsLoading(false);
    } catch (err: any) {
      console.error("Error unloading model:", err);
      setError(`Error unloading model: ${err.message || JSON.stringify(err)}`);
      setIsLoading(false);
    }
  };

  // Handle registering a new model
  const handleRegisterModel = async () => {
    if (!window.aiAPI) {
      setError("AI API not available");
      return;
    }

    if (!newModelPath || !newModelName) {
      setError("Model name and path are required");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log("Registering new model:", {
        name: newModelName,
        path: newModelPath,
      });

      const newModelConfig = {
        id: `model-${Date.now()}`,
        name: newModelName,
        description: "User added model",
        path: newModelPath,
        parameters: 7, // Default to 7B
        contextSize: 4096,
        type: "chat" as const,
        quantization: "4-bit" as const,
        size: 0, // Will be updated after loading
      };

      const result = await window.aiAPI.registerModel(newModelConfig);
      console.log("Model registration result:", result);

      // Refresh the model list
      const availableModels = await window.aiAPI.getAvailableModels();
      console.log("Updated models list:", availableModels);
      setModels(availableModels);

      // Clear the form
      setNewModelPath("");
      setNewModelName("");
      setIsLoading(false);
    } catch (err: any) {
      console.error("Error registering model:", err);
      setError(
        `Error registering model: ${err.message || JSON.stringify(err)}`,
      );
      setIsLoading(false);
    }
  };

  // Handle selecting a model file
  const handleSelectModelFile = async () => {
    try {
      setError(null);
      console.log("Opening file dialog to select model file");
      // Use electronAPI to send a message to the main process
      const filePath = await window.electronAPI.selectModelFile();
      console.log("Selected file path:", filePath);

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
      setError(
        `Error selecting model file: ${err.message || JSON.stringify(err)}`,
      );
    }
  };

  // Don't render if sidebar is collapsed or still checking API
  if (!isExpanded) {
    return null;
  }

  // If API isn't available, show error with debug info
  if (apiChecked && !window.aiAPI) {
    return (
      <div className="ai-settings">
        <h2>AI Settings</h2>
        <div className="error-message">
          <p>AI API not available. This could be due to:</p>
          <ul>
            <li>Missing or incorrect preload script configuration</li>
            <li>IPC channel setup issues</li>
          </ul>
          <p>
            Available APIs:{" "}
            {Object.keys(window)
              .filter((key) => key.includes("API"))
              .join(", ")}
          </p>
        </div>
      </div>
    );
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
