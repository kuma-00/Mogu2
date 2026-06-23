# Mogu2 (Food Identification Library)

`Mogu` は ONNX Runtime と MobileNetV4 を使用した、超高速かつ軽量な食べ物判定ライブラリです。

## ディレクトリ構成

- `crates/mogu-core`: Rust 製コアライブラリ。画像の前処理、モデル推論、ラベル判定等を行います。
- `packages/mogu-bun`: Bun から mogu-core を呼び出すためのパッケージ（FFI 経由）。
- `scripts`: 各種自動化スクリプト。

## クイックスタート

### 1. 依存関係のインストール

プロジェクトのルートディレクトリで以下を実行して JS 依存関係をインストールします。

```bash
bun install
```

### 2. モデルのダウンロード

Hugging Face Hub から ONNX モデルをダウンロードします。

```bash
bun scripts/download_model.ts
```

モデルは `models/MobileNetV4-Conv-Small.onnx` に保存されます。

### 3. Rust コアライブラリのビルドとテスト

```bash
cd crates/mogu-core
cargo test
```

## Rust でのライブラリ使用例

```rust
use mogu_core::{ImageProcessor, FoodDetector};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. 検出器の初期化
    let mut detector = FoodDetector::new("models/MobileNetV4-Conv-Small.onnx")?;
    
    // 2. 前処理（ImageNet 規格の正規化。アスペクト比維持のリサイズを行います）
    let processor = ImageProcessor::with_imagenet_normalization(224, 224);

    // 3. 画像の読み込みと前処理
    let img = image::open("path/to/food.jpg")?;
    let input = processor.preprocess(&img);

    // 4. 判定（詳細なスコア、カテゴリ、Top-K予測情報が得られます）
    let result = detector.detect_food(input)?;
    println!("Is Food: {}", result.is_food);
    println!("Food Kind: {:?}", result.kind);
    println!("Total Score: {}", result.score);
    
    Ok(())
}
```
