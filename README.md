# 🔒 timelock — 時間解放暗号（time-release encryption）

**指定した時刻まで、誰も — 運営すらも — 開けない暗号。** 鍵を預けるサーバーはありません。

暗号化・復号はすべて**あなたのブラウザの中**で完結し、平文も鍵もどこにも送信されません。
時間が来るまで復号できないことは、特定の運営者の善意ではなく、世界中に分散した
**drand 閾値ネットワーク（League of Entropy）の暗号学**によって保証されます。

➡️ **公開URL: https://timelock-web.fly.dev**

---

## これは何？

- 「3年後に開封するタイムカプセル」
- 「結果発表まで開けない封筒」
- 「自分が居なくなった後に渡したいメッセージ（デッドマンスイッチ）」
- 「入札締切まで誰も中身を見られない封印入札」

…のような「**未来のある時刻まで秘密にしたい**」用途のための暗号ツールです。

メッセージを書いて解錠時刻を選ぶと、その時刻まで**世界中の誰にも**（このサイトの運営者にも）
開けない暗号文（`age` 形式）が手に入ります。時刻が来れば、暗号文を持つ人なら誰でも復号できます。

---

## なぜ「セキュア」なのか — トラストレスな仕組み

普通の「時限暗号サービス」は、運営サーバーが鍵を預かり「時間が来たら鍵を出す」方式です。
これは運営者を信頼するしかなく、運営者は**いつでも早期に開けてしまえます**。

timelock は鍵を預かりません。代わりに **tlock 方式（IBE × 閾値BLS署名）** を使います。

1. **誰も時刻前に開けない**
   暗号化には drand `quicknet` の「**まだ存在しない未来ラウンドの署名**」を公開鍵として使います
   （Identity-Based Encryption）。その署名は、ネットワークが指定時刻に
   **閾値（参加組織の過半数）** で初めて生成・公開します。署名が世に出るまで復号鍵は
   この世に存在しないため、**運営も第三者も時間前には復号できません。**

2. **鍵を預けない / 平文を渡さない**
   このサイトのサーバーは静的ファイル（HTML/JS）を配るだけ。暗号化も復号もすべて
   **あなたのブラウザ内**で実行され、平文も鍵もサーバーへ送られません。

3. **単一障害点がない**
   drand は世界中の独立した複数団体（Cloudflare, Protocol Labs, EPFL など）が運用する
   閾値ネットワークです。一部のノードが落ちても・悪意を持っても、**過半数が結託しない限り**
   早期復号も改竄もできません。本ツールは複数の公開リレーを自動フォールバックします。

4. **標準フォーマット（ロックインなし）**
   出力は [age](https://age-encryption.org/) 暗号フォーマット。本サイトが消えても、
   公式 CLI [`drand/tlock`](https://github.com/drand/tlock) で同じ暗号文を復号できます（下記）。

> ⚠️ **重要な性質**: これは「特定の相手だけが開ける」暗号ではなく「**時刻が来れば暗号文を
> 持つ誰でも開ける**」タイムカプセル型です。秘密にしたい相手にだけ暗号文を渡してください。
> 特定の受信者にも限定したい場合は、相手の公開鍵で二重に暗号化してください。

---

## 使い方（ブラウザ・インストール不要）

1. https://timelock-web.fly.dev を開く
2. **🔐 暗号化**タブでメッセージを入力
3. 解錠時刻を選ぶ（`+1時間` `+1日` `+1週間` などのプリセット、または任意の日時）
4. **「この時刻まで封印する」** を押す → 暗号文が出る → コピー / `.txt`保存して保管・共有
5. 解錠時刻を過ぎたら、**🔓 復号**タブに暗号文を貼って **「復号する」**

日本語 / English 切り替え対応。

---

## CLI で復号する（本サイトに依存しない）

本サイトが将来停止しても、暗号文は drand が動く限り公式ツールで復号できます。

```bash
# 1. tlock CLI をインストール（Go 1.21+）
go install github.com/drand/tlock/cmd/tle@latest

# 2. ブラウザで保存した暗号文（timelock.age.txt）を復号
#    quicknet チェーンを指定（本ツールと同一ネットワーク）
tle --decrypt \
    --network https://api.drand.sh \
    --chain 52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971 \
    timelock.age.txt
# → 解錠時刻前なら "too early" で失敗、時刻後なら平文を出力
```

CLI 側で暗号化することも可能です（例: 30日後に解錠）:

```bash
echo "秘密のメッセージ" | tle --encrypt --duration 720h \
    --network https://api.drand.sh \
    --chain 52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971 \
    -o secret.age
```

本ツールが出力した暗号文と CLI の暗号文は相互運用可能です。

---

## 仕組み（技術詳細）

```
暗号化:  解錠時刻 T → drand quicknet のラウンド番号 R に変換
         R を ID とする IBE 公開鍵で データ鍵を封印
         age フォーマットで本文を ChaCha20-Poly1305 暗号化

復号:    ラウンド R の閾値BLS署名 σ_R をネットワークから取得
         （σ_R は時刻 T 到来時にのみ世に出る）
         σ_R を IBE 秘密鍵としてデータ鍵を復元 → 本文を復号
```

- **ネットワーク**: drand `quicknet`（3秒周期 / unchained / G1署名・RFC9380）
- **チェーンハッシュ**: `52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971`
- **暗号ライブラリ**: [`tlock-js`](https://github.com/drand/tlock-js)（drand公式）を esbuild でブラウザ向けにバンドル
- **整合性**: 正しい閾値署名でしか復号鍵を導出できないため、誤った/偽のビーコンでは復号は失敗します

---

## 開発・ビルド

```bash
npm install
npm run build          # tlock-js を public/bundle.js にバンドル
npm run serve          # http://localhost:8799 でローカル確認
npm test               # Node 上で 暗号化→早期ブロック→時刻後復号 を実機検証
```

### デプロイ（Fly.io / GitHub Actions）

`main` ブランチへ push すると GitHub Actions が Fly.io へデプロイします
（直接 `fly deploy` はしません）。

```bash
# 初回のみ
fly apps create timelock-web
fly secrets ...        # 不要（シークレットなし・静的サイト）
gh secret set FLY_API_TOKEN --body "$(fly tokens create deploy)"
git push origin main   # → Actions が flyctl deploy
```

---

## よくある質問

**Q. 運営（あなた）は中身を読めますか？**
A. 読めません。暗号化はブラウザ内で行われ、平文はサーバーに届きません。復号鍵も
解錠時刻まで世界のどこにも存在しません。

**Q. drand が消えたら復号できなくなりますか？**
A. 解錠時刻を過ぎていれば、その時点の署名は drand のログや各リレーに残るため復号可能です。
未来分については drand ネットワークの継続が前提になります（League of Entropy は主要組織が長期運用）。

**Q. 解錠時刻を「早める」ことはできますか？**
A. できません。それが本ツールの核心です。逆に、暗号文を無くすと二度と復号できません。

**Q. 受信者を限定できますか？**
A. timelock 単体は「時刻が来れば暗号文を持つ誰でも開ける」方式です。相手限定にしたい場合は
相手の公開鍵（age recipient 等）で二重に暗号化してください。

---

## ライセンス

MIT License. 暗号処理は drand 公式の `tlock-js`（MIT/Apache-2.0）を利用しています。

## 謝辞

- [drand](https://drand.love/) / League of Entropy — 分散ランダムネス・ビーコン
- [tlock](https://github.com/drand/tlock) — Practical Timelock Encryption (Gailly, Melissaris, Yolan Romailler, 2023)
- [age-encryption](https://age-encryption.org/) — 暗号ファイルフォーマット
