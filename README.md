# TinyTap 兒童樂園

專為 1～3 歲幼兒設計的安全觸控遊戲 PWA，支援離線遊玩、可安裝至手機桌面。

## 功能特色

- 完整 PWA 支援（Android Chrome / PC Chrome 可安裝為獨立 App）
- 離線可用（Service Worker 快取所有資源）
- 全螢幕 standalone 模式
- 大觸控區域、鮮豔色彩、無失敗懲罰、即時正面回饋
- 家長設定（長按右上角）：預設模式、音量、遊玩計時提醒
- 全介面中文化

## 遊戲模式

### 寶寶模式（適合 1 歲）

- **氣球點點樂** — 點擊畫面任何地方爆出彩色氣球 + 粒子噴射 + 音效回饋，點空白處也有小火花

### 幼兒模式（適合 3 歲）

- **畫畫板** — 全螢幕 Canvas 繪畫，8 色色盤、3 種筆刷、橡皮擦、印章（星星/愛心/貓咪/小狗/花朵/蝴蝶）、撤銷、清除、背景色切換。內建描繪圖線模板（小馬/兔子/迷你豬），淺灰虛線引導小朋友沿線描繪
- **記憶翻牌** — 4x3 翻牌配對遊戲，6 對可愛動物 SVG，全部配對完成有慶祝動畫
- **數一數** — 隨機顯示 1～5 個水果（蘋果/香蕉/葡萄/橘子/草莓），點選正確數字
- **賽車** — Canvas 跑道自動捲動，中央方向盤觸控轉動控制車子平滑移動。3-2-1 倒數開始、2 分鐘計時、目標 30 金幣。吃到金幣會飛向右上角收集欄。撞到石頭會扣一顆愛心，撞 3 次就結束
- **玩沙沙** — 側視圖沙盤，沙子是一粒一粒的格子沙（falling sand 細胞自動機），會往下掉、堆太陡就滑落。手指可以推沙、挖沙堆成沙丘；水桶倒出的沙粒會真的落下堆積；壓平板可以把沙壓平；城堡 / 波浪 / 小山是裝滿沙倒扣的模具，點在沙面上再拿起來就留下形狀，模具壓出來的沙是紮實的、不會自己崩塌
- **釣魚** — 釣魚池裡有鯊魚、鯉魚、河豚、烏龜、章魚、螃蟹和輪胎、舊靴子，每次進來的數量、組合與深度都隨機；魚會左右也會上下游動，每隔幾秒會有新的魚從池邊游進來，池子滿了舊的會游走。按右下角「丟竿」後點池塘哪裡就丟哪裡，等魚上鉤後出現捲線輪，手指在輪子上畫滿 3 圈就釣上來，飛進左邊的水桶。點水桶可以看目前釣到什麼
- **打彈珠** — 太空主題彈珠台：霓虹檯面、星球彈射器、星星通道燈、發光拖尾的彈珠。右下角有彈簧拉桿，按住把手往下拉再放開就把彈珠打上去，拉越深力道越大；按畫面左半或右半邊控制左右擋板，撞星球得分、四顆星星全亮有大獎，五顆球用完結算分數；剛進檯面 8 秒內掉球會免費還一顆。檯面參考 Space Cadet 的玩法：擋板上方有三角彈射板、兩側有出球道與回球道（出球道的救球燈亮著時會把球彈回來一次）、右牆有三個落靶、中央黑洞會把慢速的球傳送到上方白洞、左側有 U 形坡道（上層）。任務依序是「打倒三個靶 → 進黑洞 → 衝上坡道」，黃色箭頭會指著現在該打的目標，完成後有大獎並升一級

## 技術架構

| 項目 | 技術 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| PWA | Serwist (@serwist/next) + 手動 SW 註冊 |
| 樣式 | Tailwind CSS v4 |
| 音效 | Web Audio API 合成 + .wav 檔案 |
| 動畫 | CSS Animations + Canvas 粒子特效 |
| 圖形 | Inline SVG React 元件 |
| 狀態 | React Context + useState |
| 觸控 | Pointer Events API（統一觸控與滑鼠） |

## 專案結構

```
src/
├── app/                    # Next.js App Router 頁面
│   ├── baby/               # 寶寶模式
│   ├── toddler/            # 幼兒模式
│   │   ├── drawing/        # 畫畫板
│   │   ├── memory/         # 記憶翻牌
│   │   ├── counting/       # 數一數
│   │   ├── racing/         # 賽車
│   │   ├── sand/           # 玩沙沙
│   │   ├── fishing/        # 釣魚
│   │   └── pinball/        # 打彈珠
│   ├── ~offline/           # 離線 fallback
│   ├── sw.ts               # Service Worker
│   └── manifest.ts         # PWA Manifest
├── components/
│   ├── baby/               # 氣球遊戲 + 粒子 Canvas
│   ├── toddler/            # 畫畫板 / 記憶翻牌 / 數數 / 賽車 / 玩沙沙 / 釣魚 / 打彈珠
│   ├── svg/                # SVG 圖形 (shapes/animals/fruits)
│   └── ui/                 # BigButton / BackButton / ParentSettings / TimerOverlay / RegisterSW
├── lib/
│   ├── audio/              # AudioManager (singleton) + synth.ts (合成音效)
│   ├── particles/          # Canvas 粒子引擎
│   ├── sand/               # 格子沙物理（純函式，含 node --test 測試）
│   ├── fishing/            # 釣魚遊戲邏輯（魚種、游動、收線圈數，含測試）
│   ├── pinball/            # 彈珠台物理（牆、彈射器、擋板、發射軌道、落靶、蟲洞、坡道、任務，含測試）
│   ├── templates/          # 描繪圖線模板 (小馬/兔子/迷你豬)
│   ├── settings/           # SettingsContext + localStorage
│   └── utils/              # 顏色、隨機數工具
├── public/
│   ├── icons/              # PWA 圖示 (192/512/maskable/apple-touch)
│   └── sounds/             # 音效檔案 (動物/語音/回饋)
└── scripts/
    └── generate-sounds.mjs # 音效產生腳本
```

## 開始使用

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev

# 單元測試（沙子物理模組，使用 Node 內建 test runner）
npm test

# 建置
npm run build

# 預覽 production（PWA 安裝需在此模式測試）
npm start
```

> 注意：因 Serwist 尚未支援 Turbopack，dev 和 build script 已內建 `--webpack` 旗標。

## PWA 安裝測試

1. 執行 `npm run build && npm start`
2. Chrome 開啟 `http://localhost:3000`
3. 網址列右邊出現安裝圖示，或到 `⋮ → 安裝 TinyTap 兒童樂園`
4. DevTools → Application → Service Worker 確認已註冊
5. 斷網後重新整理，確認可正常遊玩
6. Android Chrome 點選「新增到主畫面」可安裝為獨立 App
