// timelock 埋め込みブリッジ（cross-origin postMessage API）
// 他プロダクトが iframe 経由で暗号化/復号を呼べる。暗号処理はこの iframe(timelock-web) 内で実行。
// メッセージ形式:
//   親→iframe: { id, type:"encrypt", text, unlockISO, passphrase? }
//              { id, type:"decrypt", ciphertext, passphrase? }
//   iframe→親: { id, type:"result", ok:true, ciphertext, round } / { ok:true, plaintext }
//              { id, type:"result", ok:false, error, needPassphrase?, badPassphrase? }
//   起動時:     iframe→親 { type:"timelock-ready" }
(function () {
  function reply(msg) {
    parent.postMessage(msg, "*");
  }
  function ready() {
    reply({ type: "timelock-ready" });
  }
  if (window.TL) ready();
  else window.addEventListener("tl-ready", ready);

  window.addEventListener("message", async (e) => {
    const m = e.data;
    if (!m || typeof m !== "object" || !m.id) return;
    try {
      if (m.type === "encrypt") {
        const when = new Date(m.unlockISO);
        const r = await window.TL.encrypt(m.text, when, m.passphrase || undefined);
        reply({ id: m.id, type: "result", ok: true, ciphertext: r.ciphertext, round: r.round, hasPassphrase: r.hasPassphrase });
      } else if (m.type === "decrypt") {
        const pt = await window.TL.decrypt(m.ciphertext, m.passphrase || undefined);
        reply({ id: m.id, type: "result", ok: true, plaintext: pt });
      }
    } catch (err) {
      reply({
        id: m.id, type: "result", ok: false,
        error: (err && err.message) || String(err),
        needPassphrase: !!(err && err.needPassphrase),
        badPassphrase: !!(err && err.badPassphrase),
      });
    }
  });
})();
