use mogu_core::{ImageProcessor, FoodDetector};
use std::env;
use std::path::Path;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: cargo run --example predict <image_path> [model_path]");
        std::process::exit(1);
    }

    let image_path = &args[1];
    
    let model_path = if args.len() >= 3 {
        args[2].clone()
    } else {
        "../../models/MobileNetV4-Conv-Small.onnx".to_string()
    };

    if !Path::new(&model_path).exists() {
        eprintln!("Model file not found at {}.", model_path);
        std::process::exit(1);
    }

    println!("Loading model from {}...", model_path);
    let mut detector = FoodDetector::new(model_path)?;

    println!("Loading image from {}...", image_path);
    let img = image::open(image_path)?;
    
    let processor = ImageProcessor::with_imagenet_normalization(224, 224);
    let preprocessed = processor.preprocess(&img);

    println!("Running inference...");
    let result = detector.detect_food(preprocessed)?;

    println!("\nDetection Result:");
    println!("- Is Food: {}", result.is_food);
    println!("- Total Score: {:.4}", result.score);
    println!("- Food Prob: {:.4}", result.food_prob);
    println!("- Drink Prob: {:.4}", result.drink_prob);
    println!("- Tableware Prob: {:.4}", result.tableware_prob);
    println!("- Cooking Tool Prob: {:.4}", result.cooking_tool_prob);
    println!("- Food Context Prob: {:.4}", result.food_context_prob);
    println!("- Food Kind: {:?}", result.kind);

    println!("\nTop {} Prediction Labels:", result.top_labels.len());
    for (i, p) in result.top_labels.iter().enumerate() {
        println!(
            "{:2}. [{:3}] {:<40} | Prob: {:.4} | Category: {:?}",
            i + 1, p.index, p.label, p.probability, p.category
        );
    }

    Ok(())
}
