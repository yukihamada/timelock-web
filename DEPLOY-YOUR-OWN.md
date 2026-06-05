# 自分のタイムロック暗号サーバを立てる（みんなで分散）

> 「本サイトが消えても、暗号は解ける。」— 時刻解放の信頼は **drand（League of Entropy／世界分散の閾値BLSネットワーク）** が担う。
> このリポジトリのサーバは **ただのミラー（UIと部品配布）**。だから **一人一台立てれば、それだけ強くなる。**

このドキュメントは **人間でも AI エージェント（Claude Code 等）でもそのまま実行できる**手順です。
5分で自分のノードが公開され、ATSM の焚き火に「これ俺のノードね」とくべられます。

---

## なぜ自分で立てるのか

- **第三者を信じない**: 暗号化・復号は **あなたのブラウザ内**で完結（`bundle.js` は MIT）。サーバは平文を一切見ない。
- **分散＝消えない**: timelock-web.fly.dev が落ちても、あなたのノードがあれば封印は開け続けられる。極論、**全ノードが消えても drand があれば誰でも復号できる**（後述）。
- **信頼の所在**: 時刻のロックは drand のビーコン署名。あなたのサーバはその署名を中継して age 暗号文を作るだけ。

---

## 0. 前提（30秒で確認）

```bash
git --version            # あれば何でも
# デプロイ先は3択：A) Fly.io  B) 任意の静的ホスト  C) 手元で試すだけ
# ビルドには Node 22+（Docker を使うなら不要）
```

---

## 1. 取得 → 自分の名前に

```bash
git clone https://github.com/yukihamada/timelock-web.git my-timelock
cd my-timelock
```

`fly.toml` の `app =` をあなた専用の名前に変える（Fly に出す場合のみ）:

```bash
# 例: app = "timelock-yourname"
sed -i '' 's/^app = .*/app = "timelock-REPLACE_ME"/' fly.toml   # macOS
# Linux は sed -i 's/.../.../' fly.toml
```

---

## 2. デプロイ（3択・どれか1つ）

### A) Fly.io（推奨・HTTPS自動・無料枠で十分）

```bash
flyctl launch --no-deploy --copy-config --name timelock-REPLACE_ME   # 既存 fly.toml を流用
git add fly.toml && git commit -m "my timelock node" && git push     # → GitHub Actions がデプロイ（推奨）
# もしくは初回だけ: flyctl deploy
flyctl scale count 2 --region nrt,iad                                 # ← 自分の中でも分散（任意）
```

> Fly は `min_machines_running = 0`（scale-to-zero）。個人ノードはこれで十分（初回だけ数百ms 起きる）。
> 常時起動にしたいなら `fly.toml` の `min_machines_running = 1`。

### B) 任意の静的ホスト（Pages / Netlify / R2 / 自宅サーバ…「どこでもいい」）

ビルドすると `public/` が **完全な静的サイト**になる。あとは置くだけ：

```bash
npm ci --omit=dev && node build.mjs     # → public/ に bundle.js 等が生成される
# 例: そのまま配る
npx serve public                        # 手元確認
# 例: GitHub Pages / Cloudflare Pages → public/ を publish dir に指定
# 例: R2/S3 → aws s3 sync public/ s3://your-bucket/
```

### C) 手元で試すだけ

```bash
npm ci --omit=dev && node build.mjs && npx serve public   # → http://localhost:3000
```

---

## 3. 動作確認（封印 → 時刻前は開かない → 時刻後に開く）

```bash
# health
curl -s -o /dev/null -w "%{http_code}\n" https://timelock-REPLACE_ME.fly.dev/
```

ブラウザの DevTools コンソールで：

```js
const { ciphertext } = await TL.encrypt("test", new Date(Date.now()+60000));  // 60秒後解禁
await TL.decrypt(ciphertext).catch(e => console.log("まだ→", e.message));      // "too early"
// 60秒待つと decrypt が本文を返す
```

---

## 4. 「時刻解放＋宛先」で焚き火にセキュアに流す（公開鍵セット）

時刻ロック（drand）だけだと**時刻が来れば誰でも**開ける。**特定の人だけ**が時刻後に開ける形にするには、
`age` の公開鍵で二重に包む（時刻 AND 鍵）。

```bash
brew install age   # or apt-get install age

# 受信者は自分の鍵を発行し、公開鍵だけを配る
age-keygen -o ~/.takibi-age.key            # 秘密鍵（絶対に配らない・git に入れない）
# 出力の "Public key: age1..." を公開する

# 送る側: ① age で受信者に宛てて暗号化 → ② その暗号文を時刻ロック（ブラウザ TL.encrypt か tlock CLI）
echo "秘密のメモ" | age -r age1RECIPIENT_PUBKEY > sealed.age   # ①宛先封
# ②を TL.encrypt(sealed.age本文, 解禁日時) で時刻ロックし、armor を焚き火に投稿
```

> **ATSM 焚き火の共有受信鍵（時刻解放専用・公開鍵）**:
> ```
> age103d9x80mmjcsu5ukj00hnfm9kme978rr4228z6ce4swpwp6hnyyqvzqk63
> ```
> これに宛てて時刻ロックすれば「解禁時刻まで運営も読めない・解禁後も鍵保持者だけ」を満たす。
> （秘密鍵は運営が `.secrets.local` に保管・git やチャットには絶対に出さない）

---

## 5. いちばん大事：サーバが全部消えても復号できる

このノードは**便利UI**にすぎない。封印の本体は age 暗号文＋drand の round 番号。
だから手元に **暗号文さえ残っていれば**、サーバ全滅後でも誰でも復号できる：

```bash
# tlock-age CLI（drand 公式系）で、公開 drand データだけから復号
go install github.com/drand/tlock/cmd/tle@latest    # or プリビルド
tle -d < sealed_tlock.age                            # 解禁時刻後ならネット越しに drand 署名を取得して復号
```

drand quicknet のリレーは複数（`api.drand.sh` ほか）。1つ落ちても fallback で取れる。

---

## 6. AI エージェント用（Claude Code にこのまま渡す）

> 以下を Claude Code / 任意のエージェントに貼れば、自分のノードを立てて焚き火に報告するまで自走できる。

```
タスク: timelock 暗号ノードを自分用に立てて公開し、ATSM焚き火に報告する。
1. git clone https://github.com/yukihamada/timelock-web.git && cd timelock-web
2. fly.toml の app 名を "timelock-<自分の名前>" に変更
3. flyctl launch --no-deploy --copy-config --name timelock-<名前> → git push（GHAデプロイ）
   ※ Fly を使わないなら: npm ci --omit=dev && node build.mjs して public/ を任意の静的ホストへ
4. デプロイ後 curl で / が 200 を確認
5. ブラウザ DevTools で TL.encrypt→decrypt の60秒テストが通ることを確認
6. ATSM MCP の atsm_log で「timelock ノード timelock-<名前> を立てた。URL=…」を wood_kind=oak でくべる
制約: 暗号化/復号はブラウザ内のみ。秘密鍵・トークンは git に入れない。fly deploy 直叩きは避け git push 経由。
```

---

## 補足

- ライブラリとして組み込む詳細は [`INTEGRATION.md`](INTEGRATION.md)（`window.TL` API・iframe ブリッジ）。
- MU/ポン等への組み込み例は [`INTEGRATION-MU.md`](INTEGRATION-MU.md)。
- 仕組み（IBE × 閾値BLS × age）は [`README.md`](README.md)。
- ライセンス MIT。**fork して自分のものにしてOK。** 立てたら焚き火で教えて 🔥
