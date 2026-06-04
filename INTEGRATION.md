# timelock を自分のプロダクトに組み込む（封印API・部品化）

`timelock-web` は「時間解放暗号（drand tlock）」をブラウザ完結で提供します。
他プロダクト（ポン・MU 等）から**封印機能の部品**として再利用するための2通りの方法です。

トラストレス（運営も時刻前に開けない）を保つため、**暗号化・復号はブラウザ内**で行い、
サーバーには age 暗号文だけを保存します。

---

## 方法A: ライブラリを直接読み込む（推奨・トラストレス）

`bundle.js` は DOM に触らない純粋なライブラリで、`window.TL` を公開します。
**自プロダクトで self-host** すれば第三者を一切信頼しません（`bundle.js` は MIT）。

```html
<script src="/vendor/timelock.bundle.js"></script>   <!-- self-host 推奨 -->
<!-- もしくは時短: <script src="https://timelock-web.fly.dev/bundle.js"></script> -->
<script>
window.addEventListener("tl-ready", async () => {
  // 暗号化（合言葉は任意）
  const { ciphertext, round } = await TL.encrypt(
    "契約本文…", new Date("2026-12-25T00:00:00Z"), /* passphrase? */ undefined
  );
  // → ciphertext を age 暗号文としてサーバーに保存

  // 復号（時刻前は例外、合言葉付きは要 passphrase）
  try {
    const text = await TL.decrypt(ciphertext /*, passphrase */);
  } catch (e) {
    if (e.needPassphrase) { /* 合言葉入力を促す */ }
    else if (e.badPassphrase) { /* 合言葉違い */ }
    else if (/too early|decryptable at/i.test(e.message)) { /* まだ時刻前 */ }
  }
});
</script>
```

### `window.TL` API

| メソッド | 戻り値 | 説明 |
|---|---|---|
| `encrypt(text, unlockDate, passphrase?)` | `{ ciphertext, round, hasPassphrase }` | age 暗号文を生成。`passphrase` 指定で「時刻＋合言葉」 |
| `decrypt(ciphertext, passphrase?)` | `string` | 復号。時刻前は throw（`/too early/`）、要合言葉は `e.needPassphrase`、違いは `e.badPassphrase` |
| `roundUnlockMs(round)` | `number` | そのラウンドが解錠される実時刻(ms) |
| `roundFromCiphertext(ciphertext)` | `number\|null` | 暗号文からラウンド番号を抽出（解錠時刻の表示に） |
| `needsPassphrase(ciphertext)` | `bool\|null` | 合言葉付きか（時刻到来後のみ判定可・未到来は null） |

---

## 方法B: iframe 埋め込みブリッジ（最短・自前で暗号を持たない）

`embed.html` を不可視 iframe で読み込み、`postMessage` で呼ぶだけ。
自プロダクトは暗号コードを一切持ちません（ただし平文が一瞬 timelock-web オリジンを通るため、
**機微情報は方法A推奨**。社内プロダクト同士なら許容）。

```html
<iframe id="tl" src="https://timelock-web.fly.dev/embed.html" style="display:none"></iframe>
<script>
const frame = document.getElementById("tl");
const pending = {};
let seq = 0;
function call(payload) {
  return new Promise((resolve) => {
    const id = ++seq; pending[id] = resolve;
    frame.contentWindow.postMessage({ id, ...payload }, "https://timelock-web.fly.dev");
  });
}
window.addEventListener("message", (e) => {
  if (e.origin !== "https://timelock-web.fly.dev") return;
  const m = e.data;
  if (m.type === "result" && pending[m.id]) { pending[m.id](m); delete pending[m.id]; }
});

// 使い方
const enc = await call({ type:"encrypt", text:"…", unlockISO:"2026-12-25T00:00:00Z" });
// enc.ciphertext を保存
const dec = await call({ type:"decrypt", ciphertext: enc.ciphertext });
// dec.ok / dec.plaintext / dec.needPassphrase / dec.error
</script>
```

メッセージ仕様:
- 親→bridge: `{ id, type:"encrypt", text, unlockISO, passphrase? }` / `{ id, type:"decrypt", ciphertext, passphrase? }`
- bridge→親: `{ id, type:"result", ok, ciphertext|plaintext, round?, error?, needPassphrase?, badPassphrase? }`
- 起動完了: bridge→親 `{ type:"timelock-ready" }`

---

## 組み込み時の設計パターン（封印）

「指定日まで本文を開封不可にする」を**トラストレス**に実装する標準形:

1. **作成時**（ブラウザ）: 本文を `TL.encrypt(body, unlockDate)` → age 暗号文を得る
2. **保存**（サーバー）: 平文は保存せず、**暗号文のみ**を DB に保存（＋表示用に `unlock_iso`）
3. **解禁前の表示**: サーバーは暗号文をそのまま返す。フロントは時刻前なら「🔒 解禁: T」を表示
4. **解禁後**（ブラウザ）: `TL.decrypt(ciphertext)` でその場復号して表示

> サーバー側で平文を保存して時刻でフィルタするだけ（方法の簡易版）は、DBダンプで中身が見える＝
> **トラストレスではない**。契約・機微用途は必ず上記の E2E（暗号文のみ保存）で。

### CSP 注意
読み込み元（`timelock-web.fly.dev` か self-host パス）を `script-src`、
drand リレーを `connect-src` に許可。iframe 方式なら `frame-src https://timelock-web.fly.dev`。
