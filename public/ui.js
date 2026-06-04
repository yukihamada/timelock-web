(function () {
  let lang = (navigator.language || "ja").startsWith("ja") ? "ja" : "en";
  const $ = (id) => document.getElementById(id);
  const t = () => window.I18N[lang];

  function applyLang() {
    document.documentElement.lang = lang;
    const d = t();
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const v = d[el.getAttribute("data-i18n")];
      if (typeof v === "string") el.textContent = v;
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      const v = d[el.getAttribute("data-i18n-ph")];
      if (v) el.setAttribute("placeholder", v);
    });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const v = d[el.getAttribute("data-i18n-html")];
      if (v) el.innerHTML = v;
    });
    document.querySelectorAll(".lang button").forEach((b) =>
      b.classList.toggle("on", b.dataset.lang === lang)
    );
    renderPresets();
  }

  document.querySelectorAll(".lang button").forEach((b) =>
    b.addEventListener("click", () => { lang = b.dataset.lang; applyLang(); })
  );

  // ---- tabs ----
  function showTab(which) {
    $("pane-enc").classList.toggle("hidden", which !== "enc");
    $("pane-dec").classList.toggle("hidden", which !== "dec");
    $("tab-enc").classList.toggle("on", which === "enc");
    $("tab-dec").classList.toggle("on", which === "dec");
  }
  $("tab-enc").addEventListener("click", () => showTab("enc"));
  $("tab-dec").addEventListener("click", () => showTab("dec"));

  // ---- presets ----
  const PRESETS = [
    { ja: "1分後", en: "+1 min", ms: 60e3 },
    { ja: "1時間後", en: "+1 hour", ms: 3600e3 },
    { ja: "1日後", en: "+1 day", ms: 86400e3 },
    { ja: "1週間後", en: "+1 week", ms: 7 * 86400e3 },
    { ja: "1ヶ月後", en: "+1 month", ms: 30 * 86400e3 },
    { ja: "1年後", en: "+1 year", ms: 365 * 86400e3 },
  ];
  function toLocalInput(date) {
    const off = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - off).toISOString().slice(0, 16);
  }
  function renderPresets() {
    const box = $("presets");
    box.innerHTML = "";
    PRESETS.forEach((p) => {
      const b = document.createElement("button");
      b.textContent = lang === "ja" ? p.ja : p.en;
      b.addEventListener("click", () => {
        $("enc-when").value = toLocalInput(new Date(Date.now() + p.ms));
      });
      box.appendChild(b);
    });
  }
  // 既定: 1日後
  $("enc-when").value = toLocalInput(new Date(Date.now() + 86400e3));

  function fmt(ms) {
    return new Date(ms).toLocaleString(lang === "ja" ? "ja-JP" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }
  function msg(el, kind, text) {
    el.className = "msg " + kind;
    el.textContent = text;
  }

  // ---- TL ready gate ----
  let ready = !!window.TL;
  window.addEventListener("tl-ready", () => { ready = true; });

  // ---- encrypt ----
  $("enc-go").addEventListener("click", async () => {
    const d = t();
    const text = $("enc-text").value;
    const whenVal = $("enc-when").value;
    if (!text.trim()) return msg($("enc-msg"), "err", d.err_empty);
    if (!whenVal) return msg($("enc-msg"), "err", d.err_when);
    const when = new Date(whenVal);
    if (when.getTime() <= Date.now()) return msg($("enc-msg"), "err", d.err_future);

    const btn = $("enc-go");
    btn.disabled = true;
    const orig = btn.textContent;
    btn.innerHTML = `<span class="spin"></span>${d.working}`;
    try {
      const { ciphertext, round } = await window.TL.encrypt(text, when);
      $("enc-result").value = ciphertext;
      $("enc-info").textContent = d.locked(fmt(when.getTime())) + ` · round ${round}`;
      $("enc-out").classList.remove("hidden");
      msg($("enc-msg"), "ok", d.enc_done);
    } catch (e) {
      msg($("enc-msg"), "err", (e && e.message) || String(e));
    } finally {
      btn.disabled = false; btn.textContent = orig;
    }
  });

  // ---- decrypt ----
  $("dec-text").addEventListener("input", async () => {
    const ct = $("dec-text").value;
    const pill = $("dec-when");
    const round = window.TL && window.TL.roundFromCiphertext(ct);
    if (round) {
      try {
        const ms = await window.TL.roundUnlockMs(round);
        pill.textContent = (ms > Date.now() ? "🔒 " : "🔓 ") +
          (lang === "ja" ? "解錠時刻 " : "unlocks ") + fmt(ms);
        pill.classList.remove("hidden");
      } catch { pill.classList.add("hidden"); }
    } else pill.classList.add("hidden");
  });

  $("dec-go").addEventListener("click", async () => {
    const d = t();
    const ct = $("dec-text").value;
    if (!ct.trim()) return msg($("dec-msg"), "err", d.err_ct);
    const btn = $("dec-go");
    btn.disabled = true;
    const orig = btn.textContent;
    btn.innerHTML = `<span class="spin"></span>${d.working}`;
    try {
      const pt = await window.TL.decrypt(ct);
      $("dec-result").value = pt;
      $("dec-out").classList.remove("hidden");
      msg($("dec-msg"), "ok", d.dec_ok);
    } catch (e) {
      let m = (e && e.message) || String(e);
      const round = window.TL.roundFromCiphertext(ct);
      if (/too early|decryptable at/i.test(m) && round) {
        const ms = await window.TL.roundUnlockMs(round);
        m = d.too_early(fmt(ms));
      }
      msg($("dec-msg"), "err", m);
    } finally {
      btn.disabled = false; btn.textContent = orig;
    }
  });

  // ---- copy / download ----
  function copy(srcId, btn) {
    const d = t();
    navigator.clipboard.writeText($(srcId).value).then(() => {
      const o = btn.textContent; btn.textContent = d.copied;
      setTimeout(() => (btn.textContent = o), 1500);
    });
  }
  $("enc-copy").addEventListener("click", (e) => copy("enc-result", e.target));
  $("dec-copy").addEventListener("click", (e) => copy("dec-result", e.target));
  $("enc-dl").addEventListener("click", () => {
    const blob = new Blob([$("enc-result").value], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "timelock.age.txt";
    a.click();
  });

  applyLang();
})();
