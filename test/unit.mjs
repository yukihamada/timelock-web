// 高速・決定的・ネットワーク不要のユニットテスト。
// このサービスの核は「暗号の正しさ」。drand と通信する end-to-end は test/smoke.mjs（別物）。
// ここでは暗号の正しさに直結する純粋関数だけを検証する:
//   - age armor の base64 デコード → round 抽出（既知の罠の回帰）
//   - roundTime はミリ秒単位（既知の罠の回帰）
//   - round ⇄ 日時の往復変換が厳密に一致
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  timelockEncrypt,
  roundAt,
  roundTime,
  defaultChainInfo,
  Buffer,
} from "tlock-js";
import { roundFromCiphertext } from "../src/app.js";

const info = defaultChainInfo;

// encrypt はチェーン情報(公開鍵)のみ使用しネットワーク不要（公開鍵は chainInfo に内蔵）。
const offlineClient = {
  chain() {
    return {
      async info() {
        return info;
      },
    };
  },
};

test("roundFromCiphertext: armorはbase64包装なのでデコード後にroundを抽出する（既知の罠）", async () => {
  const round = 12345678;
  const armored = await timelockEncrypt(
    round,
    Buffer.from("hello timelock", "utf8"),
    offlineClient
  );

  // 生のarmor先頭はbase64文字列で、デコードせず "-> tlock" を探すと絶対に見つからない。
  assert.ok(armored.includes("BEGIN AGE ENCRYPTED FILE"));
  assert.equal(
    /->\s*tlock\s+\d+/.test(armored.replace(/-----[^\n]*-----/g, "")),
    false,
    "armor本文(base64)にデコードせず tlock 行が見えてはいけない"
  );

  // 正しくデコードして抽出すれば暗号化時の round に一致する。
  assert.equal(roundFromCiphertext(armored), round);
});

test("roundFromCiphertext: 壊れた入力ではnullを返す（例外を投げない）", () => {
  assert.equal(roundFromCiphertext("not an armor at all"), null);
  assert.equal(roundFromCiphertext(""), null);
});

test("roundTime はミリ秒単位を返す（秒ではない・既知の罠）", () => {
  // 2030-01-01T00:00:00Z = 1893456000000 ms
  const target = Date.parse("2030-01-01T00:00:00Z");
  const round = roundAt(target, info);
  const ms = roundTime(info, round);

  // 秒(1.8e9)ではなくミリ秒(1.8e12)の桁であること。
  assert.ok(ms > 1e12, `roundTimeはms単位のはず: got ${ms}`);
  assert.equal(ms, 1893456000000);
  assert.equal(new Date(ms).toISOString(), "2030-01-01T00:00:00.000Z");
});

test("round ⇄ 日時 の往復変換が厳密に一致する", () => {
  for (const iso of [
    "2027-06-05T12:00:00.000Z",
    "2030-01-01T00:00:00.000Z",
    "2099-12-31T23:59:57.000Z", // periodは3秒なので3の倍数秒で厳密一致
  ]) {
    const t = Date.parse(iso);
    const round = roundAt(t, info);
    const backMs = roundTime(info, round);
    assert.equal(
      new Date(backMs).toISOString(),
      iso,
      `往復不一致: ${iso} -> round ${round} -> ${new Date(backMs).toISOString()}`
    );
  }
});

test("roundFromCiphertext(encrypt出力) が encrypt時のroundと常に一致（end-to-endの純粋部分）", async () => {
  for (const round of [1, 2, 1000, 66884212]) {
    const armored = await timelockEncrypt(
      round,
      Buffer.from(`payload-${round}`, "utf8"),
      offlineClient
    );
    assert.equal(roundFromCiphertext(armored), round);
  }
});
