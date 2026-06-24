use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use mogu_core::{FoodDetector, ImageProcessor};

// TODO: Improve error reporting for detector_new
// Currently returns null on any error, making it hard to diagnose issues from the Bun side.
// Consider changing the API to return a struct with both the detector pointer and error message,
// or add a separate detector_get_last_error() function. This would be a breaking change.
#[unsafe(no_mangle)]
pub extern "C" fn detector_new(model_path: *const c_char) -> *mut FoodDetector {
    if model_path.is_null() {
        return std::ptr::null_mut();
    }
    let c_str = unsafe { CStr::from_ptr(model_path) };
    let path_str = match c_str.to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    match FoodDetector::new(path_str) {
        Ok(detector) => Box::into_raw(Box::new(detector)),
        Err(_) => std::ptr::null_mut(),
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn detector_free(detector: *mut FoodDetector) {
    if !detector.is_null() {
        unsafe {
            let _ = Box::from_raw(detector);
        }
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn detector_free_string(ptr: *mut c_char) {
    if !ptr.is_null() {
        unsafe {
            let _ = CString::from_raw(ptr);
        }
    }
}

#[derive(serde::Serialize)]
struct FfiError {
    error: String,
}

fn return_error(msg: &str) -> *mut c_char {
    let err = FfiError { error: msg.to_string() };
    let json = serde_json::to_string(&err).unwrap_or_else(|_| r#"{"error":"Serialization failed"}"#.to_string());
    CString::new(json).unwrap().into_raw()
}

#[unsafe(no_mangle)]
pub extern "C" fn detector_detect_food(
    detector: *mut FoodDetector,
    img_bytes: *const u8,
    img_bytes_len: u64,
) -> *mut c_char {
    if detector.is_null() {
        return return_error("Null detector pointer");
    }
    if img_bytes.is_null() {
        return return_error("Null image bytes pointer");
    }
    if img_bytes_len == 0 {
        return return_error("Image bytes length is zero");
    }

    let detector = unsafe { &mut *detector };
    let bytes_len = match usize::try_from(img_bytes_len) {
        Ok(len) => len,
        Err(_) => return return_error("Image bytes length too large for platform"),
    };
    let bytes = unsafe { std::slice::from_raw_parts(img_bytes, bytes_len) };

    let img = match image::load_from_memory(bytes) {
        Ok(img) => img,
        Err(e) => return return_error(&format!("Failed to decode image from memory: {}", e)),
    };

    let processor = ImageProcessor::with_imagenet_normalization(224, 224);
    let preprocessed = processor.preprocess(&img);

    match detector.detect_food(preprocessed) {
        Ok(result) => {
            match serde_json::to_string(&result) {
                Ok(json) => CString::new(json).unwrap().into_raw(),
                Err(e) => return_error(&format!("Failed to serialize result to JSON: {}", e)),
            }
        }
        Err(e) => return_error(&format!("Detection error: {}", e)),
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn detector_detect_food_by_path(
    detector: *mut FoodDetector,
    img_path: *const c_char,
) -> *mut c_char {
    if detector.is_null() {
        return return_error("Null detector pointer");
    }
    if img_path.is_null() {
        return return_error("Null path pointer");
    }

    let detector = unsafe { &mut *detector };
    let c_str = unsafe { CStr::from_ptr(img_path) };
    let path_str = match c_str.to_str() {
        Ok(s) => s,
        Err(_) => return return_error("Invalid path string encoding"),
    };

    let img = match image::open(path_str) {
        Ok(img) => img,
        Err(e) => return return_error(&format!("Failed to open image at {}: {}", path_str, e)),
    };

    let processor = ImageProcessor::with_imagenet_normalization(224, 224);
    let preprocessed = processor.preprocess(&img);

    match detector.detect_food(preprocessed) {
        Ok(result) => {
            match serde_json::to_string(&result) {
                Ok(json) => CString::new(json).unwrap().into_raw(),
                Err(e) => return_error(&format!("Failed to serialize result to JSON: {}", e)),
            }
        }
        Err(e) => return_error(&format!("Detection error: {}", e)),
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn detector_get_default_config() -> *mut c_char {
    let default_config = mogu_core::FoodDetectorConfig::default();
    match serde_json::to_string(&default_config) {
        Ok(json) => CString::new(json).unwrap().into_raw(),
        Err(e) => return_error(&format!("Failed to serialize default config: {}", e)),
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn detector_set_config_json(
    detector: *mut FoodDetector,
    config_json: *const c_char,
) -> *mut c_char {
    if detector.is_null() {
        return return_error("Null detector pointer");
    }
    if config_json.is_null() {
        return return_error("Null config JSON pointer");
    }

    let detector = unsafe { &mut *detector };
    let c_str = unsafe { CStr::from_ptr(config_json) };
    let json_str = match c_str.to_str() {
        Ok(s) => s,
        Err(_) => return return_error("Invalid config JSON encoding"),
    };

    let partial_config: serde_json::Value = match serde_json::from_str(json_str) {
        Ok(v) => v,
        Err(e) => return return_error(&format!("Failed to parse config JSON: {}", e)),
    };

    // Merge partial config with current config
    if let Some(threshold) = partial_config.get("threshold").and_then(|v| v.as_f64()) {
        detector.config.threshold = threshold as f32;
    }
    if let Some(weak_threshold) = partial_config.get("weak_threshold").and_then(|v| v.as_f64()) {
        detector.config.weak_threshold = weak_threshold as f32;
    }
    if let Some(tableware_weight) = partial_config.get("tableware_weight").and_then(|v| v.as_f64()) {
        detector.config.tableware_weight = tableware_weight as f32;
    }
    if let Some(drink_weight) = partial_config.get("drink_weight").and_then(|v| v.as_f64()) {
        detector.config.drink_weight = drink_weight as f32;
    }
    if let Some(cooking_tool_weight) = partial_config.get("cooking_tool_weight").and_then(|v| v.as_f64()) {
        detector.config.cooking_tool_weight = cooking_tool_weight as f32;
    }
    if let Some(food_context_weight) = partial_config.get("food_context_weight").and_then(|v| v.as_f64()) {
        detector.config.food_context_weight = food_context_weight as f32;
    }
    if let Some(top_k) = partial_config.get("top_k").and_then(|v| v.as_u64()) {
        let top_k_usize = match usize::try_from(top_k) {
            Ok(v) => v,
            Err(_) => return return_error("top_k is too large for platform"),
        };
        detector.config.top_k = top_k_usize;
    }

    // Return success as empty JSON object
    CString::new("{}").unwrap().into_raw()
}
