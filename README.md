# TinyTap 兒童樂園

專為 1～3 歲幼兒設計的安全觸控遊戲 PWA，支援離線遊玩、可安裝至手機桌面。

## 功能特色

- 完整 PWA 支援（Android Chrome / PC Chrome 可安裝為獨立 App）
- 離線可用（Service Worker 快取所有資源）
- 全螢幕 standalone 模式
- 大觸控區域、鮮豔色彩、無失敗懲罰、即時正面回饋
- 家長設定（長按右上角）：預設模式、音量、遊玩計時提醒

## 遊戲模式

### 寶寶模式（適合 1 歲）

- **氣球點點樂** — 點擊畫面任何地方爆出彩色氣球 + 粒子噴射 + 音效回饋

### 幼兒模式（適合 3 歲）

- **畫畫板** — 全螢幕 Canvas 繪畫，8 色色盤、3 種筆刷、橡皮擦、印章、撤銷、清除、背景色切換
- **記憶翻牌** — 4x3 翻牌配對遊戲，6 對可愛動物 SVG
- **數一數** — 隨機顯示 1～5 個水果，點選正確數字
- **賽車** — Canvas 跑道自動捲動，左右移動收集金幣閃避障礙

## 技術架構

| 項目 | 技術 |
|------|------|
| 框架 | Next.js 15+ (App Router) |
| PWA | Serwist (@serwist/next) |
| 樣式 | Tailwind CSS v4 |
| 音效 | Web Audio API 合成 + .mp3 檔案 |
| 動畫 | CSS Animations + Canvas 粒子特效 |
| 圖形 | Inline SVG React 元件 |
| 狀態 | React Context + useState |

## 專案結構

```
src/
├── app/                    # Next.js App Router 頁面
│   ├── baby/               # 寶寶模式
│   ├── toddler/            # 幼兒模式
│   │   ├── drawing/        # 畫畫板
│   │   ├── memory/         # 記憶翻牌
│   │   ├── counting/       # 數一數
│   │   └── racing/         # 賽車
│   ├── ~offline/           # 離線 fallback
│   ├── sw.ts               # Service Worker
│   └── manifest.ts         # PWA Manifest
├── components/
│   ├── baby/               # 氣球遊戲元件
│   ├── toddler/            # 幼兒遊戲元件
│   ├── svg/                # SVG 圖形 (shapes/animals/fruits)
│   └── ui/                 # 共用 UI 元件
├── lib/
│   ├── audio/              # AudioManager + 合成音效
│   ├── particles/          # Canvas 粒子引擎
│   ├── settings/           # Context + localStorage
│   └── utils/              # 顏色、隨機數工具
└── public/
    ├── icons/              # PWA 圖示
    └── sounds/             # 音效檔案
```

## 開始使用

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev -- --webpack

# 建置
npm run build

# 預覽 production
npm start
```

> 注意：因 Serwist 尚未支援 Turbopack，開發與建置需使用 `--webpack` 旗標。

## 離線測試

1. 執行 `npm run build && npm start`
2. 開啟 Chrome → DevTools → Application → Service Worker 確認已註冊
3. 斷網後重新整理，確認可正常遊玩
4. Android Chrome 點選「新增到主畫面」可安裝為獨立 App
