import os
os.environ["KERAS_BACKEND"] = "tensorflow"
import tensorflow as tf
try:
    import keras
except ImportError:
    from tensorflow import keras

MODEL_PATH = os.path.join("models", "global_Brain_model.keras")

try:
    print(f"Loading model from {MODEL_PATH}...")
    model = keras.models.load_model(MODEL_PATH, compile=False)
    print("✅ Model loaded.")
    
    with open("model_info.txt", "w", encoding="utf-8") as f:
        f.write(f"Model Output Shape: {model.output_shape}\n")
        f.write("\n--- Layers ---\n")
        for layer in model.layers:
            f.write(f"Layer: {layer.name}, Type: {type(layer).__name__}\n")
            if hasattr(layer, 'layers'):
                 f.write(f"  -> Nested layers: {len(layer.layers)}\n")
                 for sub in layer.layers[-5:]: # Last 5
                      f.write(f"     Sub: {sub.name}, Type: {type(sub).__name__}\n")

    def find_last_conv_layer(model):
        """Recursively find the last convolutional layer in a model."""
        for layer in reversed(model.layers):
            # Check for nested models (e.g., VGG16, ResNet base)
            if hasattr(layer, 'layers') and len(layer.layers) > 0:
                result = find_last_conv_layer(layer)
                if result:
                    return result
            # Check for direct Conv layer
            if 'conv' in layer.name.lower() or isinstance(layer, keras.layers.Conv2D):
                return layer.name
        return None

    last_conv = find_last_conv_layer(model)
    with open("model_info.txt", "a", encoding="utf-8") as f:
        f.write(f"\nLast Conv Layer: {last_conv}\n")

except Exception as e:
    print(f"Error: {e}")
    with open("model_info.txt", "w", encoding="utf-8") as f:
        f.write(f"Error: {e}\n")
