import tensorflow as tf
try:
    from tensorflow import keras
except ImportError:
    import keras
import numpy as np
import cv2
import shap
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for server
import matplotlib.pyplot as plt


def has_nested_model(model):
    """Check if model contains nested Sequential/Model layers."""
    for layer in model.layers:
        if hasattr(layer, 'layers') and len(layer.layers) > 0:
            return True
    return False


def grad_cam(model, img_array, last_conv_layer_name):
    """Compute Grad-CAM heatmap for a given model and image.
    
    Optimized for nested Sequential models.
    """
    with open("gradcam_debug.log", "a") as f:
        f.write(f"\n--- New Grad-CAM Request ---\nTarget Layer: {last_conv_layer_name}\n")

    # Check if model has nested structure
    is_nested = has_nested_model(model)
    
    if is_nested:
        # Use layer-by-layer tracing for nested models
        return _grad_cam_nested(model, img_array, last_conv_layer_name)
    else:
        # Use standard approach for flat models
        return _grad_cam_standard(model, img_array, last_conv_layer_name)


def _grad_cam_nested(model, img_array, last_conv_layer_name):
    """Grad-CAM for nested Sequential models using layer-by-layer tracing."""
    
    try:
        with tf.GradientTape(persistent=True) as tape:
            x = img_array
            conv_output = None
            
            # Forward pass through each layer
            for layer in model.layers:
                if hasattr(layer, 'layers') and len(layer.layers) > 0:
                    # This is a nested model (like Sequential)
                    for sublayer in layer.layers:
                        x = sublayer(x)
                        if sublayer.name == last_conv_layer_name:
                            tape.watch(x)
                            conv_output = x
                else:
                    x = layer(x)
                    if layer.name == last_conv_layer_name:
                        tape.watch(x)
                        conv_output = x
            
            predictions = x
            class_idx = tf.argmax(predictions[0])
            class_output = predictions[:, class_idx]
        
        if conv_output is not None:
            grads = tape.gradient(class_output, conv_output)
            
            if grads is not None:
                pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
                conv_output_val = conv_output[0]
                heatmap = conv_output_val @ pooled_grads[..., tf.newaxis]
                heatmap = tf.squeeze(heatmap)
                heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-8)
                print("✅ Grad-CAM computed successfully (nested model)")
                return heatmap.numpy()
            else:
                # Fallback: just average conv activations
                msg = "Gradients are None - falling back to activation averaging"
                print(f"⚠️ {msg}")
                with open("gradcam_debug.log", "a") as f:
                    f.write(f"{msg}\n")
                    
                heatmap = tf.reduce_mean(conv_output, axis=-1)[0]
                heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-8)
                return heatmap.numpy()
        else:
            msg = f"Target layer {last_conv_layer_name} output not found during forward pass"
            print(f"❌ {msg}")
            with open("gradcam_debug.log", "a") as f:
                f.write(f"{msg}\n")
                
    except Exception as e:
        msg = f"Nested Grad-CAM failed: {e}"
        print(f"❌ {msg}")
        with open("gradcam_debug.log", "a") as f:
            f.write(f"{msg}\n")
    
    return None


def _grad_cam_standard(model, img_array, last_conv_layer_name):
    """Standard Grad-CAM for flat models."""
    
    try:
        target_layer = model.get_layer(last_conv_layer_name)
        
        grad_model = keras.Model(
            inputs=model.input,
            outputs=[target_layer.output, model.output]
        )
        
        with tf.GradientTape() as tape:
            conv_output, predictions = grad_model(img_array, training=False)
            class_idx = tf.argmax(predictions[0])
            class_output = predictions[:, class_idx]
        
        grads = tape.gradient(class_output, conv_output)
        
        if grads is None:
            raise ValueError("Gradients are None")
        
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        conv_output = conv_output[0]
        heatmap = conv_output @ pooled_grads[..., tf.newaxis]
        heatmap = tf.squeeze(heatmap)
        heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-8)
        print("✅ Grad-CAM computed successfully (standard model)")
        return heatmap.numpy()
        
    except Exception as e:
        msg = f"Standard Grad-CAM failed: {e}, trying nested approach..."
        print(f"⚠️ {msg}")
        with open("gradcam_debug.log", "a") as f:
            f.write(f"{msg}\n")
        return _grad_cam_nested(model, img_array, last_conv_layer_name)


# =========================
# SHAP IMPLEMENTATION
# =========================

def compute_shap(model, img_array, background_data=None, num_samples=50):
    """
    Compute SHAP values for image classification.
    
    Args:
        model: Keras model
        img_array: Input image array (1, H, W, C)
        background_data: Background samples for SHAP (optional)
        num_samples: Number of samples for GradientExplainer
    
    Returns:
        shap_values: SHAP values array
        base_value: Base value (expected prediction)
    """
    
    try:
        # Debug Logging
        with open("shap_debug.log", "a") as log_file:
            log_file.write(f"\n--- New SHAP Request ---\n")
            log_file.write(f"Input shape: {img_array.shape}\n")
        
        print("🔄 Computing SHAP values...")
        
        # 1. Define Prediction Wrapper
        def f(X):
            if isinstance(X, list):
                X = np.array(X)
            preds = model.predict(X)
            # Handle binary classification (1 output node)
            if preds.shape[-1] == 1:
                return np.hstack([1 - preds, preds])
            return preds

        # 2. Try generic Explainer (Permutation/Partition/Exact)
        try:
            # Use 'blur' for significantly faster masking than 'inpaint_telea'
            masker = shap.maskers.Image("blur(10,10)", img_array[0].shape)
            # Create explainer - output_names will be auto-detected or 0,1
            explainer = shap.Explainer(f, masker)
            # Reduced evals for speed (User requested "fast scan")
            shap_values = explainer(img_array, max_evals=50, batch_size=100)
            print("✅ SHAP computed using shap.Explainer (Optimized)")
            
            # Return values (shap_values, expected_value)
            # Handle different explainer return types
            expected_value = 0
            if hasattr(explainer, 'expected_value'):
                 expected_value = explainer.expected_value
            
            return shap_values, expected_value

        except Exception as e:
            err_msg = f"shap.Explainer process failed: {str(e)}"
            print(f"⚠️ {err_msg}")
            with open("shap_debug.log", "a") as log_file:
                log_file.write(f"{err_msg}\n")
            import traceback
            traceback.print_exc() 
            return None, None
    
    except Exception as e:
        err_msg = f"❌ compute_shap wrapper failed: {str(e)}"
        print(err_msg)
        with open("shap_debug.log", "a") as log_file:
            log_file.write(f"{err_msg}\n")
        return None, None


def generate_shap_plot(model, img_array, original_image, save_path, class_names=None):
    """
    Generate and save a SHAP visualization plot.
    
    Args:
        model: Keras model
        img_array: Preprocessed image array (1, H, W, C)
        original_image: Original image for overlay
        save_path: Path to save the SHAP plot
        class_names: List of class names
    
    Returns:
        True if successful, False otherwise
    """
    
    try:
        shap_values, base_value = compute_shap(model, img_array)
        
        if shap_values is None:
            return False
        
        # Get prediction
        pred = model(img_array, training=False).numpy()
        pred_class = np.argmax(pred[0])
        
        # Create the SHAP visualization
        plt.figure(figsize=(12, 4))
        
        # Handle different SHAP value formats
        if isinstance(shap_values, list):
            # Multi-class output
            shap_val = shap_values[pred_class][0]
        elif hasattr(shap_values, 'values'):
            # Explanation object
            shap_val = shap_values.values[0]
            if len(shap_val.shape) > 3:
                shap_val = shap_val[..., pred_class]
        else:
            shap_val = shap_values[0]
            if len(shap_val.shape) > 3:
                shap_val = shap_val[..., pred_class]
        
        # Sum across color channels for visualization
        if len(shap_val.shape) == 3:
            shap_val_2d = np.sum(np.abs(shap_val), axis=-1)
        else:
            shap_val_2d = shap_val
        
        # Normalize
        shap_val_2d = (shap_val_2d - shap_val_2d.min()) / (shap_val_2d.max() - shap_val_2d.min() + 1e-8)
        
        # Plot 1: Original Image
        plt.subplot(1, 3, 1)
        if isinstance(original_image, np.ndarray):
            plt.imshow(cv2.cvtColor(original_image, cv2.COLOR_BGR2RGB) if len(original_image.shape) == 3 else original_image)
        else:
            plt.imshow(img_array[0])
        plt.title("Original Image")
        plt.axis('off')
        
        # Plot 2: SHAP Values Heatmap
        plt.subplot(1, 3, 2)
        plt.imshow(shap_val_2d, cmap='RdBu_r')
        plt.colorbar(label='SHAP Value')
        class_label = class_names[pred_class] if class_names and pred_class < len(class_names) else f"Class {pred_class}"
        plt.title(f"SHAP: {class_label}")
        plt.axis('off')
        
        # Plot 3: Overlay
        plt.subplot(1, 3, 3)
        # Resize SHAP values to match original image
        shap_resized = cv2.resize(shap_val_2d, (224, 224))
        
        # Create overlay
        if isinstance(original_image, np.ndarray):
            base_img = cv2.cvtColor(cv2.resize(original_image, (224, 224)), cv2.COLOR_BGR2RGB) / 255.0
        else:
            base_img = img_array[0]
        
        # Apply colormap to SHAP
        shap_colored = plt.cm.RdBu_r(shap_resized)[:, :, :3]
        
        # Blend
        overlay = 0.6 * base_img + 0.4 * shap_colored
        overlay = np.clip(overlay, 0, 1)
        
        plt.imshow(overlay)
        plt.title("SHAP Overlay")
        plt.axis('off')
        
        plt.tight_layout()
        plt.savefig(save_path, dpi=100, bbox_inches='tight', facecolor='white')
        plt.close()
        
        print(f"✅ SHAP plot saved to {save_path}")
        return True
        
    except Exception as e:
        print(f"❌ SHAP plot generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False
