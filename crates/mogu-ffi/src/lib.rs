use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use mogu_core::{FoodDetector, ImageProcessor};

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

#[unsafe(no_mangle)]
pub extern "C" fn detector_set_config(
    detector: *mut FoodDetector,
    threshold: f32,
    weak_threshold: f32,
    tableware_weight: f32,
    drink_weight: f32,
    cooking_tool_weight: f32,
    food_context_weight: f32,
    top_k: usize,
) {
    if !detector.is_null() {
        let detector = unsafe { &mut *detector };
        detector.config.threshold = threshold;
        detector.config.weak_threshold = weak_threshold;
        detector.config.tableware_weight = tableware_weight;
        detector.config.drink_weight = drink_weight;
        detector.config.cooking_tool_weight = cooking_tool_weight;
        detector.config.food_context_weight = food_context_weight;
        detector.config.top_k = top_k;
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
    img_bytes_len: usize,
) -> *mut c_char {
    if detector.is_null() {
        return return_error("Null detector pointer");
    }
    if img_bytes.is_null() || img_bytes_len == 0 {
        return return_error("Invalid image bytes");
    }

    let detector = unsafe { &mut *detector };
    let bytes = unsafe { std::slice::from_raw_parts(img_bytes, img_bytes_len) };

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
