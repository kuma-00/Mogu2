# Mogu2 (Food Identification Library)

`Mogu` は ONNX Runtime と MobileNetV4 を使用した、超高速かつ軽量な食べ物判定ライブラリです。

## ディレクトリ構成

- `crates/mogu-core`: Rust 製コアライブラリ。画像の前処理、モデル推論、ラベル判定等を行います。
- `packages/mogu-bun`: Bun から mogu-core を呼び出すためのパッケージ（FFI 経由）。
- `scripts`: 各種自動化スクリプト。

## リリース（Release Please）

`@kuma-00/mogu-bun` とプラットフォーム別 FFI パッケージは [Release Please](https://github.com/googleapis/release-please) でバージョン管理します。

### 開発者フロー

```bash
# 1. Conventional Commits 形式で commit する
git commit -m "fix: correct Bun FoodKind type"

# 2. main に merge
# 3. GitHub Actions が Release PR を自動作成 → merge
# 4. GitHub Release / tag / npm publish が自動実行される
```

手動での `git tag` push は不要です（非推奨）。publish の再実行が必要な場合は、対象 version が npmjs.org で未公開であることを確認して Release Please ワークフローを workflow_dispatch で実行してください。

公開は npm Trusted Publishing（OIDC）のみを使用し、長期的なnpm tokenは使用しません。npmjs.orgの4パッケージそれぞれで、以下のTrusted Publisherを設定します。

- Provider: GitHub Actions
- Repository: `kuma-00/Mogu2`
- Workflow: `release-please.yml`
- Allowed action: `npm publish`

各パッケージのPublishing accessは「Require two-factor authentication and disallow tokens」に設定します。

### Conventional Commits の例

Release Please は Conventional Commits 形式の commit message から changelog と version を自動生成します。

**バージョンアップのルール:**
- `fix:` - バグ修正 → patch version (1.0.2 → 1.0.3)
- `feat:` - 新機能 → minor version (1.0.2 → 1.1.0)
- `perf:` - パフォーマンス改善 → patch version (1.0.2 → 1.0.3)
- `feat!`, `fix!`, `refactor!` 等（`!`付き）または commit body に `BREAKING CHANGE:` → major version (1.0.2 → 2.0.0)
- `chore:`, `docs:`, `refactor:`, `test:`, `ci:`, `build:`, `style:` → version bump なし（changelog には含まれる）

**注意:** `chore:` のみの commit では Release PR が作成されません。リリースしたい場合は `fix:` か `feat:` を含めるか、手動で Release PR を作成してください。

**commit 例:**
- `fix: correct Bun FoodKind type` → patch version
- `feat: add detectFoodFromUrl` → minor version
- `perf: optimize image preprocessing` → patch version
- `chore: update dependencies` → version bump なし
- `docs: update README` → version bump なし
- `refactor: simplify image processing` → version bump なし
- `feat!: breaking API change` → major version
- `fix: resolve memory leak\n\nBREAKING CHANGE: requires Node 18+` → major version

### 利用者向けインストール

```bash
bun add @kuma-00/mogu-bun
```

パッケージは npmjs.org で公開されているため、PATや追加の `.npmrc` は不要です。対応するネイティブパッケージは `optionalDependencies` の `os` / `cpu` 条件に従って自動的に導入されます。

対応環境:

- macOS Apple Silicon (`darwin-arm64`)
- Linux x64 (`linux-x64`)
- Windows x64 (`win32-x64`)

共有ライブラリを手動でビルドまたは配置する場合は、`MOGU_FFI_LIB` に `.dylib`、`.so`、`.dll` の絶対パスを指定できます。

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

## Bun でのライブラリ使用例

```typescript
import { FoodDetector } from "@kuma-00/mogu-bun";

// リソース解放の例 (using / Symbol.dispose)
{
  using detector = new FoodDetector("models/MobileNetV4-Conv-Small.onnx");
  const result = detector.detectFood("path/to/food.jpg");
  console.log("Is Food:", result.is_food);
  // スコープを抜けると自動的に close() が呼ばれます
}

// リソース解放の例 (try/finally)
const detector = new FoodDetector("models/MobileNetV4-Conv-Small.onnx");
try {
  const result = detector.detectFood("path/to/food.jpg");
  console.log("Is Food:", result.is_food);
} finally {
  detector.close(); // 必ずリソースを解放してください
}
```

**重要:** `FoodDetector` はネイティブリソース（FFI ライブラリの検出器インスタンス）を持つため、使用後に `close()` を呼び出してリソースを解放する必要があります。Bun 1.0.25+ では `using` キーワードと `Symbol.dispose` を使用して自動解放できます。それ以外の環境では `try/finally` で明示的に `close()` を呼んでください。
