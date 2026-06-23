use ort::session::builder::GraphOptimizationLevel;
use ort::session::Session;
use ort::value::Value;
use ndarray::{Array4, ArrayViewD};
use std::path::Path;
use crate::labels::{get_imagenet_label, classify_label, classify_food_kind, LabelCategory, FoodKind};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PredictionLabel {
    pub index: usize,
    pub label: String,
    pub probability: f32,
    pub category: LabelCategory,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FoodDetectionResult {
    pub is_food: bool,
    pub score: f32,
    pub food_prob: f32,
    pub drink_prob: f32,
    pub tableware_prob: f32,
    pub cooking_tool_prob: f32,
    pub food_context_prob: f32,
    pub kind: FoodKind,
    pub top_labels: Vec<PredictionLabel>,
}

#[derive(Debug, Clone)]
pub struct FoodDetectorConfig {
    pub threshold: f32,
    pub weak_threshold: f32,
    pub tableware_weight: f32,
    pub drink_weight: f32,
    pub cooking_tool_weight: f32,
    pub food_context_weight: f32,
    pub top_k: usize,
}

impl Default for FoodDetectorConfig {
    fn default() -> Self {
        Self {
            threshold: 0.40,
            weak_threshold: 0.28,
            tableware_weight: 0.35,
            drink_weight: 0.90,
            cooking_tool_weight: 0.15,
            food_context_weight: 0.20,
            top_k: 10,
        }
    }
}

pub struct FoodDetector {
    session: Session,
    pub config: FoodDetectorConfig,
}

impl FoodDetector {
    pub fn new<P: AsRef<Path>>(model_path: P) -> ort::Result<Self> {
        Self::with_threads(model_path, 4)
    }

    pub fn with_threads<P: AsRef<Path>>(model_path: P, num_threads: usize) -> ort::Result<Self> {
        let session = Session::builder()?
            .with_optimization_level(GraphOptimizationLevel::Level3)?
            .with_intra_threads(num_threads)?
            .commit_from_file(model_path)?;
        
        Ok(Self {
            session,
            config: FoodDetectorConfig::default(),
        })
    }

    pub fn predict(&mut self, input: Array4<f32>) -> Result<Vec<(usize, f32)>, Box<dyn std::error::Error>> {
        let input_value = Value::from_array(input)?;
        let outputs = self.session.run(ort::inputs![input_value])?;
        
        let (ort_shape, data) = outputs[0].try_extract_tensor::<f32>()?;
        let shape: Vec<usize> = ort_shape.iter().map(|&x| x as usize).collect();
        let output_view = ArrayViewD::from_shape(shape, data)?;
        
        let max_logit = output_view.iter().fold(f32::NEG_INFINITY, |a, &b| a.max(b));
        let exp_output = output_view.mapv(|x| (x - max_logit).exp());
        let exp_sum = exp_output.sum();
        let probabilities = exp_output / exp_sum;
        
        let mut results: Vec<(usize, f32)> = probabilities
            .iter()
            .enumerate()
            .map(|(i, &prob)| (i, prob))
            .collect();

        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        Ok(results)
    }

    pub fn predict_top_labels(
        &mut self,
        input: Array4<f32>,
        top_k: usize,
    ) -> Result<Vec<PredictionLabel>, Box<dyn std::error::Error>> {
        let results = self.predict(input)?;

        Ok(results
            .into_iter()
            .take(top_k)
            .map(|(index, probability)| {
                let label = get_imagenet_label(index).to_string();
                let category = classify_label(&label);
                PredictionLabel {
                    index,
                    label,
                    probability,
                    category,
                }
            })
            .collect())
    }

    pub fn detect_food(
        &mut self,
        input: Array4<f32>,
    ) -> Result<FoodDetectionResult, Box<dyn std::error::Error>> {
        let results = self.predict(input)?;
        
        let mut food_prob = 0.0;
        let mut drink_prob = 0.0;
        let mut tableware_prob = 0.0;
        let mut cooking_tool_prob = 0.0;
        let mut food_context_prob = 0.0;

        for &(idx, prob) in &results {
            let label = get_imagenet_label(idx);
            match classify_label(label) {
                LabelCategory::Food => food_prob += prob,
                LabelCategory::Drink => drink_prob += prob,
                LabelCategory::Tableware => tableware_prob += prob,
                LabelCategory::CookingTool => cooking_tool_prob += prob,
                LabelCategory::FoodContext => food_context_prob += prob,
                LabelCategory::Other => {}
            }
        }

        let total_score = food_prob
            + drink_prob * self.config.drink_weight
            + tableware_prob * self.config.tableware_weight
            + cooking_tool_prob * self.config.cooking_tool_weight
            + food_context_prob * self.config.food_context_weight;

        let top_labels = results
            .into_iter()
            .take(self.config.top_k)
            .map(|(index, probability)| {
                let label = get_imagenet_label(index).to_string();
                let category = classify_label(&label);
                PredictionLabel {
                    index,
                    label,
                    probability,
                    category,
                }
            })
            .collect::<Vec<_>>();

        let top5 = &top_labels[0..std::cmp::min(top_labels.len(), 5)];
        let has_food_in_top5 = top5.iter().any(|p| {
            matches!(p.category, LabelCategory::Food | LabelCategory::Drink)
        });
        let has_tableware_in_top5 = top5.iter().any(|p| {
            matches!(p.category, LabelCategory::Tableware)
        });

        let is_food = food_prob >= 0.30
            || total_score >= self.config.threshold
            || (has_food_in_top5 && has_tableware_in_top5 && total_score >= self.config.weak_threshold);

        let kind = if !top_labels.is_empty() {
            let best_food = top_labels
                .iter()
                .find(|p| matches!(p.category, LabelCategory::Food | LabelCategory::Drink));
            if let Some(pred) = best_food {
                classify_food_kind(&pred.label)
            } else {
                FoodKind::UnknownFood
            }
        } else {
            FoodKind::UnknownFood
        };

        Ok(FoodDetectionResult {
            is_food,
            score: total_score,
            food_prob,
            drink_prob,
            tableware_prob,
            cooking_tool_prob,
            food_context_prob,
            kind,
            top_labels,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ImageProcessor;

    #[test]
    fn test_detector_with_real_model() {
        let model_path = "../../models/MobileNetV4-Conv-Small.onnx";
        if !Path::new(model_path).exists() {
            println!("Skipping real model test (model not found at {})", model_path);
            return;
        }

        let mut detector = FoodDetector::new(model_path).expect("Failed to load model");
        let processor = ImageProcessor::with_imagenet_normalization(224, 224);
        
        let img = image::DynamicImage::ImageRgb8(image::RgbImage::new(224, 224));
        let preprocessed = processor.preprocess(&img);
        
        let result = detector.detect_food(preprocessed).expect("Failed to detect food");
        assert_eq!(result.top_labels.len(), detector.config.top_k);
    }
}

