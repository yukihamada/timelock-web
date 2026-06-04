# MU 時限ドロップ暗号保証 — 実装プラン（ポン実証パターンの横展開）

> ポン(`feat/sealed-contracts`)で E2E 実証済みの「本文をブラウザ内で timelock 暗号化→
> サーバーは暗号文のみ保存→解禁時刻にブラウザ内で自動復号」を MU 商品ページに当てる。
> 対象: `mu-brand/store`（Rust/Axum・catalog.rs）。本番は AUTO_PUBLISH 注意（§危険）。

## ねらい
「この時刻に解禁されるドロップ」を、運営も時刻前に中身を読めない形で保証する。
例: fest-gogai 号外の限定コンセプト/シリアル、MUON 的な時限公開を**暗号で**担保。

## 変更点（最小・スキーマ変更なし・後方互換）— 実コード確認済み

> CLAUDE.md カタログ契約「商品ごとの挙動は config_json/meta_json に」「列を増やすな」に準拠。
> **新カラム不要**。`meta_json` に `unlock_iso` を入れ、`description_ja` に age 暗号文を格納する。

### 1. 商品ページ PDP（`catalog.rs::shop_pdp`、L3616）— 読み取り側（安全・追加的）
`shop_pdp` は既に SELECT で `meta_json` を取得済み（L3624, 戻り値 `meta_json` L3644）。
desc 描画箇所に、ポンで実証した封印ブロックをそのまま移植:
```
// meta_json から unlock_iso を取り出し、desc が age 暗号文なら封印扱い
let unlock_iso = meta_json.as_deref()
    .and_then(|m| serde_json::from_str::<serde_json::Value>(m).ok())
    .and_then(|v| v.get("unlock_iso").and_then(|x| x.as_str().map(String::from)));
let is_sealed = unlock_iso.is_some() && desc.contains("BEGIN AGE ENCRYPTED FILE");
let desc_html = if is_sealed { /* ポンの封印ブロック(隠しct+bundle.js+自動復号) */ }
                else { /* 従来の desc 描画 */ };
```
- **これは追加的＝既存商品(unlock_iso 無し)に一切影響なし**。デプロイは安全。
- bundle は self-host 推奨: `store/static/timelock.bundle.js`（第三者非依存）。CSPは現状無し。

### 2. 封印商品の作成（opt-in・別操作）
- 暗号化は**クライアント側**（admin UI か /make で `TL.encrypt(desc, unlockDate)`）。
  サーバーは暗号文を `description_ja`、`unlock_iso` を `meta_json` に保存するだけ。
- 既存の作成経路（`/admin/catalog/nl`・`agent_api`）に meta_json パススルーを足す or
  admin に「封印商品」専用フォームを1枚足す（最小）。
- OGP/`meta description` は平文を使わず「🔒 解禁: T」プレースホルダ（SEO安全）。
- status は `draft` で作り、確認後 `live`（CLAUDE.md: 読みは status='live'）。

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
