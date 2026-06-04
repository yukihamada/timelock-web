# MU 時限ドロップ暗号保証 — 実装プラン（ポン実証パターンの横展開）

> ポン(`feat/sealed-contracts`)で E2E 実証済みの「本文をブラウザ内で timelock 暗号化→
> サーバーは暗号文のみ保存→解禁時刻にブラウザ内で自動復号」を MU 商品ページに当てる。
> 対象: `mu-brand/store`（Rust/Axum・catalog.rs）。本番は AUTO_PUBLISH 注意（§危険）。

## ねらい
「この時刻に解禁されるドロップ」を、運営も時刻前に中身を読めない形で保証する。
例: fest-gogai 号外の限定コンセプト/シリアル、MUON 的な時限公開を**暗号で**担保。

## 変更点（最小・後方互換）

### 1. スキーマ（catalog.rs ensure_schema, 既存 ALTER 群に追記）
```sql
ALTER TABLE catalog_products ADD COLUMN unlock_iso TEXT;   -- 解禁予定(ISO8601)。NULL=通常
-- 本文(description) は unlock_iso が非NULLのとき age 暗号文を格納（別カラム不要）
```
※ MU は description 複数言語の可能性あり。最小実装は「`description_ja` に暗号文を入れ、
unlock_iso 非NULL のときは封印扱い」。多言語封印は将来拡張。

### 2. 商品作成/更新（agent_api.rs の product insert / admin 経路）
- 受け口に `unlock_iso: Option<String>` を追加（`#[serde(default)]`）
- 暗号化は**クライアント側**（MU の make ページ/admin UI で `TL.encrypt(desc, unlockDate)`）。
  サーバーは受け取った暗号文をそのまま `description_ja` に保存。
- OGP/`meta description` は「🔒 解禁: T」などのプレースホルダにする（平文を出さない・SEO安全）

### 3. 商品ページ PDP（catalog.rs shop_pdp ~L3616 / テンプレ ~L3989）
ポンの sign_page と同じ封印ブロックを description 描画箇所に差す:
- `unlock_iso` 非NULL かつ desc が `BEGIN AGE ENCRYPTED FILE` を含む → 封印UI＋隠しct＋
  `https://timelock-web.fly.dev/bundle.js`＋自動復号スクリプト（解錠時刻に再試行）
- それ以外 → 従来通り平文表示
- 実装は **ポンの該当ブロックを移植**（main.rs の `is_sealed`/`body_html` 生成＋`<script>`）

### 4. CSP
MU PDP は現状 CSP 無し（調査時）。`script-src` に timelock-web か self-host を許可。
self-host 推奨は `store/static/timelock.bundle.js` に bundle.js を置く（第三者非依存）。

## ⚠ 危険・本番を壊さないために（MU固有）
- **AUTO_PUBLISH**: `yuki@hamada.tokyo` は MA council/AUTO_PUBLISH_OWNERS で**即公開**になりうる
  （[[mu_auto_publish_policy.md]]）。テストSKUは必ず `status=draft` か別ストアで。
- **mockup_backfill** 等の一括処理が description/画像を上書きしうる。封印中SKUを除外する条件
  （unlock_iso 非NULL はスキップ）を入れる。
- ローカル/別Fly app（ステージング）で「解禁5分後」を設定し time-travel 検証してから本番。
- DB変更は CHANGELOG 必須（[[feedback_changelog_required.md]]）。

## 検証（ポンと同じ手順）
1. `cargo build`（store は大きいので m5 ビルド推奨 / [[feedback_heavy_tasks_m5.md]]）
2. ローカル起動→ `unlock_iso`=数十秒後の封印SKUを作成→ PDP が封印表示
3. Playwright: PDP を開き、解禁時刻後にブラウザ内復号で本文表示を確認
4. 通常SKU（unlock_iso=NULL）が従来通り表示＝後方互換

## 着手の合図
本番 auto-publish 事故を避けるため、**「MUブランチ実装してOK」**の合図をもらってから
`feat/timelock-drop` ブランチで実装→検証→デプロイは別途確認、で進める。
ポンの差分（main.rs の封印ブロック）がそのまま雛形になる。
