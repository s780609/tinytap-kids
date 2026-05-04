import type { Story } from "./types";

export const uglyDucklingStory: Story = {
  id: "ugly-duckling",
  title: "醜小鴨",
  emoji: "🦢",
  coverClass: "bg-gradient-to-br from-sky-300 via-emerald-200 to-pink-200",
  description: "一隻灰灰的小鴨踏上奇妙的旅程，最後變成美麗的天鵝。",
  pages: [
    {
      text: "在一個陽光明媚的夏日，農場裡充滿了生機。綠油油的草地上點綴著五顏六色的野花，蜜蜂和蝴蝶在花間飛舞。在小池塘邊，鴨媽媽正在她舒適的巢中孵蛋，巢是用柔軟的羽毛和乾草築成的。",
      bgClass: "bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-300",
      decoration: (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-t-[40%]" />
          <div className="absolute bottom-[6%] left-[12%] w-44 h-24 bg-blue-400/70 rounded-[50%] blur-sm" />
          <div className="absolute bottom-[14%] left-1/2 -translate-x-1/2 w-36 h-16 bg-amber-700 rounded-[50%] shadow-inner" />
        </>
      ),
      sprites: [
        { id: "sun", emoji: "☀️", x: 18, y: 16, size: 64, reaction: "✨" },
        { id: "cloud1", emoji: "☁️", x: 72, y: 12, size: 56, reaction: "💨" },
        { id: "cloud2", emoji: "☁️", x: 88, y: 24, size: 40, reaction: "💨" },
        { id: "butterfly1", emoji: "🦋", x: 30, y: 42, size: 40, bounce: true, reaction: "🌸" },
        { id: "butterfly2", emoji: "🦋", x: 65, y: 38, size: 36, bounce: true, reaction: "🌸" },
        { id: "bee", emoji: "🐝", x: 80, y: 50, size: 36, bounce: true, reaction: "🍯" },
        { id: "flower1", emoji: "🌼", x: 12, y: 80, size: 38 },
        { id: "flower2", emoji: "🌷", x: 88, y: 82, size: 38 },
        { id: "flower3", emoji: "🌻", x: 25, y: 88, size: 36 },
        { id: "mom", emoji: "🦆", x: 50, y: 65, size: 90, label: "鴨媽媽", reaction: "💛" },
        { id: "egg-big", emoji: "🥚", x: 50, y: 78, size: 46, reaction: "❓" },
      ],
    },
    {
      text: "鴨媽媽耐心地等待著，終於有一天，蛋殼裡傳來「啁啾」聲。一隻金黃色的小鴨從蛋殼中鑽了出來，接著其他的蛋也陸續孵化了。然而，還有一個特別大的蛋遲遲沒有動靜。「這顆蛋真奇怪。」鴨媽媽輕聲自語。",
      bgClass: "bg-gradient-to-b from-amber-100 via-orange-100 to-emerald-200",
      decoration: (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-b from-emerald-300 to-emerald-500 rounded-t-[40%]" />
          <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 w-52 h-20 bg-amber-700 rounded-[50%]" />
        </>
      ),
      sprites: [
        { id: "sun", emoji: "🌤️", x: 85, y: 15, size: 56, reaction: "✨" },
        { id: "mom", emoji: "🦆", x: 22, y: 56, size: 80, label: "鴨媽媽", reaction: "💛" },
        { id: "duckling1", emoji: "🐤", x: 38, y: 68, size: 50, bounce: true, reaction: "🎵" },
        { id: "duckling2", emoji: "🐤", x: 50, y: 73, size: 50, bounce: true, reaction: "🎵" },
        { id: "duckling3", emoji: "🐤", x: 62, y: 68, size: 50, bounce: true, reaction: "🎵" },
        { id: "egg-big", emoji: "🥚", x: 78, y: 70, size: 64, reaction: "❓" },
        { id: "flower1", emoji: "🌷", x: 10, y: 88, size: 36 },
        { id: "flower2", emoji: "🌼", x: 92, y: 90, size: 36 },
      ],
    },
    {
      text: "幾天後的清晨，那個大蛋終於裂開了。從蛋裡出來的是一隻與眾不同的小鴨——他比其他小鴨大得多，羽毛灰撲撲的。其他小鴨悄悄說：「他怎麼長得這麼奇怪？」鴨媽媽溫柔地說：「不管他長什麼樣，他都是我的孩子。」",
      bgClass: "bg-gradient-to-b from-orange-200 via-amber-100 to-emerald-300",
      decoration: (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-b from-emerald-300 to-emerald-500" />
          <div className="absolute bottom-[14%] left-1/2 -translate-x-1/2 w-56 h-20 bg-amber-700 rounded-[50%]" />
        </>
      ),
      sprites: [
        { id: "sun", emoji: "☀️", x: 12, y: 14, size: 56, reaction: "✨" },
        { id: "mom", emoji: "🦆", x: 25, y: 52, size: 80, label: "鴨媽媽", reaction: "💛" },
        { id: "duckling1", emoji: "🐤", x: 42, y: 62, size: 48, reaction: "🎵" },
        { id: "duckling2", emoji: "🐤", x: 54, y: 65, size: 48, reaction: "🎵" },
        { id: "duckling3", emoji: "🐤", x: 66, y: 62, size: 48, reaction: "🎵" },
        {
          id: "ugly",
          emoji: "🦆",
          x: 80,
          y: 58,
          size: 78,
          label: "醜小鴨",
          reaction: "💧",
          filter: "grayscale(0.7) brightness(0.85) contrast(1.05)",
        },
        { id: "frog", emoji: "🐸", x: 12, y: 78, size: 44, bounce: true, reaction: "🎵" },
      ],
    },
    {
      text: "農場裡的其他動物並不友善。鴨子們嘲笑他、追逐他、啄他，甚至把他推到泥巴裡。醜小鴨感到非常孤獨。在一個月朗星稀的夜晚，他悄悄離開了鴨棚，踏上未知的旅程。",
      bgClass: "bg-gradient-to-b from-indigo-700 via-indigo-500 to-slate-700",
      decoration: (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-gradient-to-b from-stone-700 to-stone-900" />
          <div className="absolute top-[10%] left-[15%] w-1 h-1 bg-white rounded-full shadow-[0_0_4px_white]" />
          <div className="absolute top-[8%] right-[35%] w-1 h-1 bg-white rounded-full shadow-[0_0_4px_white]" />
          <div className="absolute top-[18%] left-[40%] w-1 h-1 bg-white rounded-full shadow-[0_0_4px_white]" />
          <div className="absolute top-[14%] right-[12%] w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_6px_white]" />
        </>
      ),
      sprites: [
        { id: "moon", emoji: "🌙", x: 82, y: 18, size: 60, reaction: "✨" },
        { id: "star1", emoji: "⭐", x: 25, y: 12, size: 32, bounce: true },
        { id: "star2", emoji: "⭐", x: 60, y: 22, size: 28, bounce: true },
        { id: "duck-bully1", emoji: "🦆", x: 18, y: 60, size: 60, reaction: "😆" },
        { id: "duck-bully2", emoji: "🦆", x: 32, y: 65, size: 56, reaction: "😆" },
        {
          id: "ugly",
          emoji: "🦆",
          x: 65,
          y: 70,
          size: 70,
          label: "醜小鴨",
          reaction: "💔",
          filter: "grayscale(0.8) brightness(0.7)",
        },
        { id: "barn", emoji: "🏚️", x: 88, y: 58, size: 64, reaction: "🌙" },
      ],
    },
    {
      text: "他來到一片大森林，遇到了一群野鴨。「你長得太奇怪了，我們不想和你玩。」野鴨們說。突然，森林響起「砰砰」的槍聲——獵人來了！醜小鴨嚇壞了，趕緊躲進蘆葦叢中。",
      bgClass: "bg-gradient-to-b from-emerald-700 via-emerald-600 to-emerald-900",
      decoration: (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-gradient-to-b from-emerald-700 to-emerald-900" />
          <div className="absolute bottom-[40%] left-[5%] w-2 h-32 bg-emerald-900 rounded-full" />
          <div className="absolute bottom-[42%] left-[20%] w-2 h-28 bg-emerald-900 rounded-full" />
          <div className="absolute bottom-[40%] right-[25%] w-2 h-36 bg-emerald-900 rounded-full" />
          <div className="absolute bottom-[42%] right-[8%] w-2 h-28 bg-emerald-900 rounded-full" />
        </>
      ),
      sprites: [
        { id: "tree1", emoji: "🌲", x: 10, y: 38, size: 70 },
        { id: "tree2", emoji: "🌳", x: 28, y: 32, size: 60 },
        { id: "tree3", emoji: "🌲", x: 78, y: 35, size: 70 },
        { id: "tree4", emoji: "🌳", x: 92, y: 30, size: 56 },
        { id: "wild-duck1", emoji: "🦆", x: 22, y: 68, size: 56, reaction: "😆" },
        { id: "wild-duck2", emoji: "🦆", x: 38, y: 72, size: 56, reaction: "😆" },
        {
          id: "ugly",
          emoji: "🦆",
          x: 60,
          y: 75,
          size: 64,
          label: "醜小鴨",
          reaction: "😨",
          filter: "grayscale(0.8) brightness(0.75)",
        },
        { id: "boom", emoji: "💥", x: 85, y: 25, size: 60, bounce: true, reaction: "🔥" },
        { id: "reed", emoji: "🌾", x: 75, y: 80, size: 52 },
      ],
    },
    {
      text: "秋天來了，樹葉變成金黃色和紅色。醜小鴨來到一座小屋，一位慈祥的老婦人收留了他。但屋裡的貓和母雞並不歡迎他：「你又不會抓老鼠，又不會下蛋，待在這裡一點用都沒有。」醜小鴨只好再次離開。",
      bgClass: "bg-gradient-to-b from-orange-300 via-amber-200 to-red-200",
      decoration: (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-gradient-to-b from-amber-600 to-amber-800" />
          <div className="absolute bottom-[28%] right-[10%] w-32 h-28 bg-stone-200 rounded-tr-2xl" />
          <div
            className="absolute bottom-[50%] right-[8%] w-0 h-0"
            style={{
              borderLeft: "60px solid transparent",
              borderRight: "60px solid transparent",
              borderBottom: "40px solid #b91c1c",
              right: "8%",
            }}
          />
        </>
      ),
      sprites: [
        { id: "leaf1", emoji: "🍂", x: 15, y: 18, size: 32, bounce: true },
        { id: "leaf2", emoji: "🍁", x: 45, y: 12, size: 30, bounce: true },
        { id: "leaf3", emoji: "🍂", x: 70, y: 22, size: 28, bounce: true },
        { id: "tree", emoji: "🌳", x: 12, y: 50, size: 90, filter: "hue-rotate(-30deg) saturate(1.2)" },
        { id: "apple1", emoji: "🍎", x: 10, y: 42, size: 28 },
        { id: "apple2", emoji: "🍎", x: 18, y: 50, size: 28 },
        { id: "pumpkin", emoji: "🎃", x: 38, y: 78, size: 48, reaction: "🍂" },
        { id: "old-woman", emoji: "👵", x: 65, y: 60, size: 70, label: "老婦人", reaction: "💛" },
        { id: "cat", emoji: "🐈", x: 80, y: 68, size: 56, reaction: "😼" },
        { id: "hen", emoji: "🐔", x: 92, y: 72, size: 52, reaction: "😤" },
        {
          id: "ugly",
          emoji: "🦆",
          x: 50,
          y: 75,
          size: 66,
          label: "醜小鴨",
          reaction: "💧",
          filter: "grayscale(0.7) brightness(0.8)",
        },
      ],
    },
    {
      text: "寒冷的冬天悄然而至，池塘結了厚厚的冰。醜小鴨無處可去，差點凍死在小溪裡。就在他快要放棄希望時，一位戴著厚手套的農夫發現了他：「可憐的小傢伙，我帶你回家。」農夫把他帶到溫暖的穀倉，安全地度過了嚴寒的冬天。",
      bgClass: "bg-gradient-to-b from-slate-300 via-slate-100 to-cyan-100",
      decoration: (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-b from-cyan-100 to-blue-200" />
          <div className="absolute bottom-[42%] left-0 w-40 h-10 bg-white rounded-full" />
          <div className="absolute bottom-[42%] right-0 w-48 h-12 bg-white rounded-full" />
          <div className="absolute bottom-[50%] left-1/2 -translate-x-1/2 w-32 h-8 bg-white rounded-full" />
        </>
      ),
      sprites: [
        { id: "snow1", emoji: "❄️", x: 12, y: 14, size: 32, bounce: true },
        { id: "snow2", emoji: "❄️", x: 32, y: 22, size: 28, bounce: true },
        { id: "snow3", emoji: "❄️", x: 50, y: 10, size: 36, bounce: true },
        { id: "snow4", emoji: "❄️", x: 70, y: 18, size: 28, bounce: true },
        { id: "snow5", emoji: "❄️", x: 88, y: 28, size: 32, bounce: true },
        { id: "snow6", emoji: "❄️", x: 22, y: 38, size: 26, bounce: true },
        { id: "snow7", emoji: "❄️", x: 80, y: 42, size: 26, bounce: true },
        { id: "barn", emoji: "🏠", x: 80, y: 58, size: 80, reaction: "💛" },
        { id: "farmer", emoji: "🧑‍🌾", x: 28, y: 60, size: 76, label: "農夫", reaction: "💛" },
        {
          id: "ugly",
          emoji: "🦆",
          x: 50,
          y: 75,
          size: 66,
          label: "醜小鴨",
          reaction: "🥶",
          filter: "grayscale(0.6) brightness(0.85)",
        },
        { id: "hay", emoji: "🌾", x: 90, y: 78, size: 40 },
      ],
    },
    {
      text: "春天來了！冰雪融化，醜小鴨展開翅膀飛向藍天，來到一個美麗的大湖泊。湖面上有一群優雅的白天鵝。當他降落水面時，看見水中的倒影——他不再是醜小鴨，而是一隻美麗的天鵝！其他天鵝熱情地歡迎他：「歡迎你，新朋友！」從此，他過上了幸福快樂的生活。",
      bgClass: "bg-gradient-to-b from-pink-200 via-amber-50 to-sky-200",
      decoration: (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-b from-sky-300 to-blue-500" />
          <div className="absolute bottom-[38%] left-[10%] w-28 h-2 bg-white/40 rounded-full" />
          <div className="absolute bottom-[28%] right-[18%] w-24 h-2 bg-white/40 rounded-full" />
          <div className="absolute bottom-[18%] left-[35%] w-32 h-2 bg-white/40 rounded-full" />
        </>
      ),
      sprites: [
        { id: "sun", emoji: "🌞", x: 85, y: 14, size: 64, reaction: "✨" },
        { id: "rainbow", emoji: "🌈", x: 18, y: 22, size: 70, reaction: "💖" },
        { id: "blossom1", emoji: "🌸", x: 12, y: 40, size: 36, bounce: true },
        { id: "blossom2", emoji: "🌸", x: 92, y: 42, size: 32, bounce: true },
        { id: "blossom3", emoji: "🌺", x: 30, y: 48, size: 32, bounce: true },
        { id: "swan1", emoji: "🦢", x: 25, y: 70, size: 70, bounce: true, reaction: "✨" },
        { id: "swan2", emoji: "🦢", x: 40, y: 65, size: 70, bounce: true, reaction: "✨" },
        { id: "swan3", emoji: "🦢", x: 75, y: 68, size: 70, bounce: true, reaction: "✨" },
        { id: "self", emoji: "🦢", x: 55, y: 78, size: 100, label: "美麗的天鵝", reaction: "💖" },
        { id: "heart1", emoji: "💖", x: 50, y: 32, size: 40, bounce: true },
        { id: "heart2", emoji: "💖", x: 65, y: 40, size: 36, bounce: true },
      ],
    },
  ],
};
