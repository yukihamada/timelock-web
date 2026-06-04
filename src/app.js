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

// 任意の「合言葉」レイヤー（時間 かつ 合言葉 で初めて開封可）。
// PBKDF2-SHA256(200k) → AES-256-GCM。合言葉なしの出力は素のUTF-8のまま＝tle/Timevault互換を維持。
const MAGIC = [0x54, 0x4c, 0x4f, 0x43, 0x4b, 0x70, 0x77, 0x31]; // "TLOCKpw1"
const PBKDF2_ITERS = 200000;

async function deriveKey(passphrase, salt) {
  const base = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERS, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}

async function wrapWithPassphrase(plaintext, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext))
  );
  return Buffer.concat([Buffer.from(MAGIC), Buffer.from(salt), Buffer.from(iv), Buffer.from(ct)]);
}

function hasMagic(buf) {
  if (buf.length < MAGIC.length + 16 + 12 + 16) return false;
  return MAGIC.every((b, i) => buf[i] === b);
}

async function unwrapWithPassphrase(buf, passphrase) {
  const off = MAGIC.length;
  const salt = buf.subarray(off, off + 16);
  const iv = buf.subarray(off + 16, off + 28);
  const ct = buf.subarray(off + 28);
  const key = await deriveKey(passphrase, new Uint8Array(salt));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, key, new Uint8Array(ct));
  return Buffer.from(pt).toString("utf8");
}

const TL = {
  // ISO文字列の時刻に向けて文字列を暗号化 → age armored テキストを返す。
  // passphrase を渡すと「時間 かつ 合言葉」で開封可になる。
  async encrypt(plaintext, unlockDate, passphrase) {
    const t = unlockDate.getTime();
    if (t <= Date.now()) throw new Error("解錠時刻は未来にしてください");
    const round = roundAt(t, defaultChainInfo);
    const payload = passphrase
      ? await wrapWithPassphrase(plaintext, passphrase)
      : Buffer.from(plaintext, "utf8");
    const ct = await timelockEncrypt(round, payload, client);
    return { ciphertext: ct, round, hasPassphrase: !!passphrase };
  },

  // armored テキストを復号（時刻前なら例外）。合言葉付きなら passphrase が必要。
  async decrypt(ciphertext, passphrase) {
    const raw = Buffer.from(await timelockDecrypt(ciphertext.trim(), client));
    if (hasMagic(raw)) {
      if (!passphrase) {
        const e = new Error("この暗号文には合言葉が必要です");
        e.needPassphrase = true;
        throw e;
      }
      try {
        return await unwrapWithPassphrase(raw, passphrase);
      } catch {
        const e = new Error("合言葉が違います");
        e.badPassphrase = true;
        throw e;
      }
    }
    return raw.toString("utf8");
  },

  // 暗号文が合言葉付きか（時刻到来後のみ判定可能。未到来時は null）
  async needsPassphrase(ciphertext) {
    try {
      const raw = Buffer.from(await timelockDecrypt(ciphertext.trim(), client));
      return hasMagic(raw);
    } catch {
      return null; // まだ復号できない＝判定不能
    }
  },

  // 任意ラウンドが解錠可能になる実時刻(ms)。roundTime は既に ms を返す。
  async roundUnlockMs(round) {
    return roundTime(defaultChainInfo, round);
  },

  // 暗号文ヘッダからラウンド番号を抜き出す（age armorはbase64包装なのでデコードしてから）
  roundFromCiphertext,
};

// 暗号文ヘッダからラウンド番号を抜き出す（age armorはbase64包装なのでデコードしてから）。
// ⚠ armor は base64 包装なので、必ずデコードしてから "-> tlock <round>" を探す（既知の罠の回帰対象）。
function roundFromCiphertext(ciphertext) {
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
}

// ブラウザでは window.TL として公開（Node からのユニットテスト import 時は副作用なし）
if (typeof window !== "undefined") {
  window.TL = TL;
  window.dispatchEvent(new Event("tl-ready"));
}

export { TL, roundFromCiphertext };
