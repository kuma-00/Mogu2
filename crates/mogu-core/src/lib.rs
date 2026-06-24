pub mod processor;
pub mod detector;
pub mod labels;

pub use processor::ImageProcessor;
pub use detector::{FoodDetector, FoodDetectorConfig, FoodDetectionResult, PredictionLabel};
pub use labels::{get_imagenet_label, classify_label, classify_food_kind, LabelCategory, FoodKind};

