# サードパーティ・ライセンス表示 (Third-Party Notices)

`public/bundle.js`（配布物）には以下のオープンソースが組み込まれています。
いずれも MIT / Apache-2.0 / BSD-3-Clause というパーミッシブ・ライセンスで、
コピーレフト（GPL等）は含まれません。各著作権者へ謝意とともに表示します。

| パッケージ | ライセンス | 著作権 |
|---|---|---|
| tlock-js | Apache-2.0 OR MIT | © 2022 drand team |
| drand-client | Apache-2.0 OR MIT | © Alan Shaw / Protocol Labs |
| @noble/curves | MIT | © 2022 Paul Miller (paulmillr.com) |
| @noble/hashes | MIT | © 2022 Paul Miller (paulmillr.com) |
| @stablelib/* (binary, chacha, chacha20poly1305, constant-time, int, poly1305, wipe) | MIT | © 2016 Dmitry Chestnykh |
| base64-js | MIT | © 2014 Jameson Little |
| buffer | MIT | © Feross Aboukhadijeh |
| ieee754 | BSD-3-Clause | © 2008 Fair Oaks Labs, Inc. |

ビルド／配信に使用（バンドルには非同梱）:

| ソフトウェア | ライセンス |
|---|---|
| esbuild | MIT |
| nginx | 2-clause BSD |
| Node.js / `node:22-alpine` | MIT ほか |

## ライセンス全文

### MIT License
```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT...
```

### Apache License 2.0
tlock-js / drand-client は `Apache-2.0 OR MIT` のデュアルライセンスで提供されます。
Apache-2.0 には**明示的な特許許諾（第3条）**が含まれ、コントリビューターから
利用者へ特許ライセンスが付与されます（= タイムロック実装の特許リスクを軽減）。
全文: https://www.apache.org/licenses/LICENSE-2.0

### BSD-3-Clause (ieee754)
```
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the above copyright notice,
this list of conditions and the following disclaimer are retained...
```

---

本プロジェクト自体のライセンスは [LICENSE](./LICENSE)（MIT）です。
