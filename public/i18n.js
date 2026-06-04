const I18N = {
  ja: {
    tagline: "時間解放暗号",
    lead: "指定した時刻まで、誰も — 運営すらも — 開けない暗号。鍵を預けるサーバーはありません。",
    tab_enc: "🔐 暗号化", tab_dec: "🔓 復号",
    msg_label: "メッセージ", msg_ph: "ここに秘密のメッセージを入力…",
    unlock_label: "解錠時刻（この時刻まで開けません）",
    enc_btn: "この時刻まで封印する",
    ct_label: "暗号文（この全文を相手に渡してください）",
    copy: "📋 コピー", download: "💾 .txt保存", copied: "✓ コピーしました",
    ct_in_label: "暗号文を貼り付け",
    ct_in_ph: "-----BEGIN AGE ENCRYPTED FILE----- …",
    dec_btn: "復号する", pt_label: "復号結果",
    enc_done: "封印しました。解錠時刻まで誰も開けません。",
    err_future: "解錠時刻は未来にしてください。",
    err_empty: "メッセージを入力してください。",
    err_when: "解錠時刻を選んでください。",
    err_ct: "暗号文を貼り付けてください。",
    locked: (t) => `🔒 解錠予定: ${t}`,
    too_early: (t) => `まだ開けません。解錠時刻: ${t}`,
    dec_ok: "復号成功。",
    working: "通信中…",
    how_sum: "仕組みとセキュリティ（トラストレスである理由）",
    how_body: `
      <ul>
        <li><b>誰も時間前に開けない</b>：暗号化は drand <code>quicknet</code> の将来ラウンドの「まだ存在しない署名」を公開鍵として使います（IBE）。署名はネットワークが指定時刻に <b>閾値（過半数）</b> で初めて生成・公開するため、運営も第三者も時間前に復号できません。</li>
        <li><b>鍵を預けない</b>：このサイトのサーバーは静的ファイルを配るだけ。暗号化・復号はすべて<b>あなたのブラウザ内</b>で実行され、平文も鍵もサーバーに送られません。</li>
        <li><b>単一障害点がない</b>：drand は世界中の複数団体が運用する閾値ネットワーク（League of Entropy）。一部が落ちても・悪意を持っても、過半数が結託しない限り早期復号も改竄もできません。</li>
        <li><b>標準フォーマット</b>：出力は <code>age</code> 暗号フォーマット。公式CLI <code>drand/tlock</code> でも同じ暗号文を復号できます（READMEに手順）。</li>
        <li><b>注意</b>：暗号文を保存・共有するのはあなたの責任です。解錠時刻を過ぎれば<b>暗号文を持つ誰でも</b>復号できます（=タイムカプセル用途向け）。</li>
      </ul>`,
    foot: "drand quicknet（League of Entropy）の閾値BLS署名 × IBE。暗号化・復号はすべてあなたのブラウザ内で実行されます。",
    oss: "オープンソース / 鍵を預けない設計",
  },
  en: {
    tagline: "time-release encryption",
    lead: "A message no one — not even us — can open until the time you choose. No server holds any key.",
    tab_enc: "🔐 Encrypt", tab_dec: "🔓 Decrypt",
    msg_label: "Message", msg_ph: "Type your secret message…",
    unlock_label: "Unlock time (cannot be opened before this)",
    enc_btn: "Seal until this time",
    ct_label: "Ciphertext (give this whole text to the recipient)",
    copy: "📋 Copy", download: "💾 Save .txt", copied: "✓ Copied",
    ct_in_label: "Paste ciphertext",
    ct_in_ph: "-----BEGIN AGE ENCRYPTED FILE----- …",
    dec_btn: "Decrypt", pt_label: "Decrypted result",
    enc_done: "Sealed. No one can open it before the unlock time.",
    err_future: "Unlock time must be in the future.",
    err_empty: "Please enter a message.",
    err_when: "Please pick an unlock time.",
    err_ct: "Please paste a ciphertext.",
    locked: (t) => `🔒 Unlocks at: ${t}`,
    too_early: (t) => `Too early to open. Unlocks at: ${t}`,
    dec_ok: "Decrypted successfully.",
    working: "Contacting network…",
    how_sum: "How it works & security (why it's trustless)",
    how_body: `
      <ul>
        <li><b>No one can open it early</b>: encryption uses a future round's "not-yet-existing signature" of drand <code>quicknet</code> as the public key (IBE). The network only produces that signature via a <b>threshold</b> at the scheduled time — so neither we nor anyone can decrypt early.</li>
        <li><b>No key custody</b>: this site only serves static files. All encryption/decryption runs <b>in your browser</b>; no plaintext or key ever reaches a server.</li>
        <li><b>No single point of failure</b>: drand is a threshold network run by many independent orgs (League of Entropy). Unless a majority colludes, no early decryption or tampering is possible.</li>
        <li><b>Standard format</b>: output is the <code>age</code> format. The official <code>drand/tlock</code> CLI decrypts the same ciphertext (see README).</li>
        <li><b>Note</b>: storing/sharing the ciphertext is up to you. After the unlock time, <b>anyone holding the ciphertext</b> can decrypt it (time-capsule model).</li>
      </ul>`,
    foot: "Threshold BLS signatures × IBE on drand quicknet (League of Entropy). All crypto runs in your browser.",
    oss: "Open source / no key custody",
  },
};
window.I18N = I18N;
