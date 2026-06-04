import { chromium } from "playwright";
const EXE="/Users/yuki/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const b = await chromium.launch({executablePath:EXE});
const pg = await b.newPage();
pg.on("pageerror", e=>console.log("[pageerror]",e.message));
pg.on("console", m=>{ if(m.type()==="error") console.log("[err]",m.text()); });
await pg.goto("http://localhost:8799/", { waitUntil:"networkidle" });
await pg.waitForFunction("window.TL");
// 用途セレクタ
const opts = await pg.$$eval("#enc-usecase option", os=>os.map(o=>o.textContent));
console.log("usecase options:", opts.length, opts.join(" / "));
await pg.selectOption("#enc-usecase","bid");
console.log("tip(bid):", (await pg.textContent("#usecase-tip")).slice(0,30));
const when1 = await pg.inputValue("#enc-when");
await pg.selectOption("#enc-usecase","embargo");
const when2 = await pg.inputValue("#enc-when");
console.log("time changed on usecase switch:", when1 !== when2);

// 埋め込みブリッジ test: embed.html を iframe で
const host = await b.newPage();
await host.setContent(`<iframe id="tl" src="http://localhost:8799/embed.html"></iframe>`);
const res = await host.evaluate(async()=>{
  const frame=document.getElementById("tl");
  await new Promise(r=>{ window.addEventListener("message",function h(e){ if(e.data&&e.data.type==="timelock-ready"){window.removeEventListener("message",h);r();} }); });
  const pending={}; let seq=0;
  window.addEventListener("message",e=>{ const m=e.data; if(m&&m.type==="result"&&pending[m.id]){pending[m.id](m);delete pending[m.id];} });
  const call=p=>new Promise(res=>{const id=++seq;pending[id]=res;frame.contentWindow.postMessage({id,...p},"*");});
  const enc=await call({type:"encrypt",text:"ブリッジ経由🔌",unlockISO:new Date(Date.now()+9000).toISOString()});
  return {encOk:enc.ok, round:enc.round, ctHead:enc.ciphertext.slice(0,30)};
});
console.log("bridge encrypt:", JSON.stringify(res));
await b.close();
console.log("FEAT TEST DONE");
