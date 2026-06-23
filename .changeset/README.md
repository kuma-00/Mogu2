# Changesets

このディレクトリには Changesets の設定と、未リリースの変更記録（`.md` ファイル）が入ります。

## 使い方

機能変更を `main` にマージする PR には、changeset ファイルを追加してください。

```bash
bun changeset
```

1. `@kuma-00/mogu-bun` を選択（fixed グループのため 4 パッケージすべてに適用されます）
2. semver（patch / minor / major）を選択
3. CHANGELOG 用の説明を記述

`main` への merge 後、GitHub Actions が **Version Packages** PR を自動作成します。  
その PR を merge するとバージョンが更新され、`vX.Y.Z` タグが push されて GitHub Packages へ publish されます。
