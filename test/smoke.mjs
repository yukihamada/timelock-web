// Node 上のスモークテスト: 暗号化 → 早期復号ブロック → 解錠時刻後に復号成功
// 実際に drand quicknet と通信して end-to-end を検証する。
import { timelockEncrypt, timelockDecrypt, roundAt, mainnetClient, Buffer } from "tlock-js";

const client = mainnetClient();
const info = await client.chain().info();
const MSG = "時間解放テスト🔒 time-release works";

const unlock = Date.now() + 9000; // 約9秒後（quicknetは3秒周期）
const round = roundAt(unlock, info);
const ct = await timelockEncrypt(round, Buffer.from(MSG, "utf8"), client);
console.log(`✓ encrypted to round ${round} (${ct.length} bytes)`);

let early = false;
try { await timelockDecrypt(ct, client); } catch { early = true; }
if (!early) { console.error("✗ FAIL: decrypted before unlock time"); process.exit(1); }
console.log("✓ early decryption correctly blocked");

console.log("… waiting 12s for the round to be published");
await new Promise((r) => setTimeout(r, 12000));

const pt = Buffer.from(await timelockDecrypt(ct, client)).toString("utf8");
if (pt !== MSG) { console.error(`✗ FAIL: got "${pt}"`); process.exit(1); }
console.log(`✓ decrypted after unlock: "${pt}"`);
console.log("\nALL PASS");
