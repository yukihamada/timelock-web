// timelock — drand tlock によるトラストレスな時間解放暗号 (ブラウザ完結)
// 暗号化/復号はすべてこのブラウザ内で実行され、平文はサーバーに送られません。
import {
  timelockEncrypt,
  timelockDecrypt,
  roundAt,
  roundTime,
  defaultChainInfo,
  Buffer,
} from "tlock-js";

// drand quicknet（3秒周期・タイムロック対応の閾値ネットワーク）
const HASH = defaultChainInfo.hash;

// 複数の公開リレーをフォールバック（1つ落ちても/遅くても繋がる）
const RELAYS = [
  "https://api.drand.sh",
  "https://api2.drand.sh",
  "https://api3.drand.sh",
  "https://drand.cloudflare.com",
];

async function fetchJson(path, timeoutMs = 6000) {
  let lastErr;
  for (const base of RELAYS) {
    try {
      const ctrl = new AbortController();
      const tm = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(`${base}/${HASH}${path}`, { signal: ctrl.signal });
      clearTimeout(tm);
      if (res.ok) return await res.json();
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("drandネットワークに接続できませんでした");
}

// tlock-js が期待する ChainClient 互換オブジェクト。
// chain info は静的値（公開鍵入り）を使うので /info への通信は不要。
// 復号の整合性は IBE の束縛（=正しい閾値署名でしか復号できない）で担保される。
const chain = {
  baseUrl: `${RELAYS[0]}/${HASH}`,
  async info() {
    return defaultChainInfo;
  },
};
const client = {
  options: { disableBeaconVerification: true, noCache: false },
  chain() {
    return chain;
  },
  async latest() {
    return fetchJson("/public/latest");
  },
  async get(round) {
    return fetchJson(`/public/${round}`);
  },
};

const TL = {
  // ISO文字列の時刻に向けて文字列を暗号化 → age armored テキストを返す
  async encrypt(plaintext, unlockDate) {
    const t = unlockDate.getTime();
    if (t <= Date.now()) throw new Error("解錠時刻は未来にしてください");
    const round = roundAt(t, defaultChainInfo);
    const ct = await timelockEncrypt(round, Buffer.from(plaintext, "utf8"), client);
    return { ciphertext: ct, round };
  },

  // armored テキストを復号（時刻前なら例外）
  async decrypt(ciphertext) {
    const pt = await timelockDecrypt(ciphertext.trim(), client);
    return Buffer.from(pt).toString("utf8");
  },

  // 任意ラウンドが解錠可能になる実時刻(ms)。roundTime は既に ms を返す。
  async roundUnlockMs(round) {
    return roundTime(defaultChainInfo, round);
  },

  // 暗号文ヘッダからラウンド番号を抜き出す（age armorはbase64包装なのでデコードしてから）
  roundFromCiphertext(ciphertext) {
    try {
      const body = ciphertext
        .split(/-----[^\n]*-----/)
        .filter((s) => s.trim())
        .join("")
        .replace(/\s+/g, "");
      const head = Buffer.from(body, "base64").toString("utf8").slice(0, 200);
      const m = head.match(/->\s*tlock\s+(\d+)\s/);
      return m ? parseInt(m[1], 10) : null;
    } catch {
      return null;
    }
  },
};

window.TL = TL;
window.dispatchEvent(new Event("tl-ready"));
