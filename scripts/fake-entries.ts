import { format, isSaturday, subDays, subYears } from "date-fns";

// Invented diary entries for local development, demos and screenshots. Every
// name, place and event here is made up; none of it comes from a real diary.

export type FakeEntry = {
  entry_date: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

// Each story is one entry's opening paragraphs; a closer from the same topic
// may follow.
type Topic = { tags: string[]; stories: string[][]; closers: string[] };

const TOPICS: Topic[] = [
  {
    tags: ["日記", "工作"],
    stories: [
      [
        "今天上班一整天都在開會，中間幾乎沒有時間寫 code。",
        "開會的時候我試著把想法講得慢一點、清楚一點，感覺對方比較聽得進去。",
      ],
      [
        "早上一到公司就發現昨晚的排程跑失敗了，花了一個上午在查原因。",
        "後來發現問題出在時區，資料庫存的是 UTC，畫面卻直接拿來顯示。",
      ],
      [
        "今天終於把拖了兩週的重構送出 PR，心裡的石頭放下一半。",
        "阿哲 review 的時候提了幾個很好的問題，有些情況我真的沒想到。",
      ],
      [
        "下午跟設計師小安對新版首頁，討論了很久按鈕到底要放哪裡。",
        "最後決定先做兩個版本給使用者測，用數據說話。",
      ],
      [
        "這週的 sprint 排得很滿，今天一直在趕進度。",
        "寫測試的時候順手抓到一個邊界條件的 bug，算是今天的小確幸。",
      ],
      [
        "主管說下個月可能要接一個新專案，聽起來蠻有挑戰性的。",
        "中午跟同事去吃巷口那家咖哩飯，大家都在猜是什麼專案。",
      ],
    ],
    closers: [
      "明天要記得先把文件補完再開始新的東西。",
      "下班的時候天已經全黑了，希望明天可以早點走。",
      "整體來說是有進展的一天。",
      "提醒自己：不懂的地方早點問，不要一個人卡太久。",
    ],
  },
  {
    tags: ["日記", "運動"],
    stories: [
      [
        "下班後去河濱跑了五公里，配速比上次快了一點。",
        "跑到後半段的時候很想停下來，但是告訴自己再撐一個路燈就好。",
      ],
      ["今天第一次去攀岩館，手臂到現在還在抖。", "教練說我的姿勢太依賴手，要多用腳的力量。"],
      [
        "早上六點起床去游泳，池子裡人很少，很舒服。",
        "游完坐在池邊發呆了一下，看著陽光從窗戶照進水裡。",
      ],
      [
        "跟雅婷騎腳踏車，從大稻埕一路騎到淡水。",
        "沿路風很大，但夕陽真的很漂亮，停下來拍了好幾張照片。",
      ],
    ],
    closers: [
      "運動完整個人清爽很多，腦袋也安靜下來了。",
      "目標是年底前可以跑完一場半馬。",
      "今晚應該會很好睡。",
    ],
  },
  {
    tags: ["日記", "家人"],
    stories: [
      [
        "晚上回家吃飯，媽媽煮了一大鍋排骨湯。",
        "吃飯的時候大家聊到以前住在老家的事情，好多細節我都忘了。",
      ],
      [
        "跟爸爸視訊，他最近迷上種多肉植物，一直秀給我看。",
        "他說陽台的那盆仙人掌開花了，語氣像小孩一樣興奮。",
      ],
      ["妹妹今天打電話來說她考上研究所了，好替她開心。", "她緊張了好幾個月，講到一半聲音都在抖。"],
      [
        "週末帶外婆去公園散步，她走得比上次穩很多。",
        "外婆一直問我工作累不累，還偷偷塞了紅包給我。",
      ],
    ],
    closers: ["覺得應該要多回家一點。", "有家人在的感覺真好。"],
  },
  {
    tags: ["讀書"],
    stories: [
      [
        "這週在讀一本講習慣養成的書，今天讀到一半。",
        "書裡說改變不需要一次很大，每天進步一點點就好，這句話很打動我。",
      ],
      [
        "在書店翻到一本關於城市散步的散文集，忍不住買了回家。",
        "作者寫的街道我都走過，但從來沒有注意過那些細節。",
      ],
      ["睡前看了幾章小說，主角的選擇讓我想了很久。", "如果是我，大概沒有勇氣在那個時候離開吧。"],
    ],
    closers: ["想把讀到的東西真的用在生活裡，而不只是畫線。", "明天繼續讀。"],
  },
  {
    tags: ["旅行"],
    stories: [
      [
        "今天搭早班火車到花蓮，一出車站就看到很藍的天。",
        "租了一台腳踏車沿著海岸線騎，海浪聲一直在耳邊。",
      ],
      [
        "第一次一個人去台南，沿路一直吃。",
        "早上吃了牛肉湯，中午吃了碗粿，晚上還排了一小時的豆花。",
      ],
      ["抵達京都的第一天，下著小雨。", "撐著傘走在石板路上，整條街安靜到只剩雨聲。"],
      [
        "跟朋友去宜蘭泡湯，終於好好休息了一次。",
        "晚上在民宿的陽台聊天聊到很晚，好久沒有這樣放空了。",
      ],
    ],
    closers: ["想把今天的感覺記下來，以後累的時候可以翻回來看。", "明天打算早起去看日出。"],
  },
  {
    tags: ["夢"],
    stories: [
      [
        "做了一個很奇怪的夢，夢到我回到高中考數學，但是題目全部都是英文。",
        "醒來的時候心跳很快，愣了好幾秒才確定只是夢。",
      ],
      [
        "夢到自己在一個很大的圖書館裡迷路，書架一直往上延伸。",
        "夢裡的感覺很真實，連翻書的聲音都記得。",
      ],
      ["昨晚夢到家裡的貓會說話，還跟我抱怨飼料不好吃。", "笑著醒來的，今天心情不錯。"],
    ],
    closers: ["不知道是不是最近壓力太大了。", "決定以後醒來先把夢記下來。"],
  },
  {
    tags: ["日記", "美食"],
    stories: [
      ["今天自己試做了番茄燉牛肉，比想像中簡單。", "燉了兩個小時，整個房子都是香味。"],
      ["跟朋友去吃了一家新開的拉麵店，湯頭很濃。", "排隊排了四十分鐘，但吃到第一口就覺得值得。"],
      ["在市場買了很多當季的柿子，甜到不行。", "老闆娘多送了兩顆，還教我怎麼挑比較甜的。"],
    ],
    closers: ["下次想挑戰做紅酒燉雞。", "吃飽就是幸福。"],
  },
  {
    tags: ["尋找自己"],
    stories: [
      [
        "最近常常在想，自己真正想要的生活是什麼樣子。",
        "也許不需要馬上有答案，先誠實面對現在的感受就好。",
      ],
      [
        "今天跟諮商師聊到我很容易把別人的情緒攬在自己身上。",
        "她說可以試著在回應之前先停一下，問自己這是誰的感受。",
      ],
      [
        "整理房間的時候翻到五年前寫的目標清單。",
        "有些目標已經做到了，有些現在看起來已經不重要了。",
      ],
    ],
    closers: ["慢慢來，比較快。", "給自己多一點耐心。"],
  },
];

// The one walk the launch film follows, kept on the latest Saturday so the
// calendar and the On This Day card both have it to show.
const RIVER_WALK =
  "傍晚沿著河邊散步，風很涼，天空從橘色慢慢變成紫色。\n\n" +
  "路上有人在放風箏，也有小朋友追著鴿子跑。走了一個多小時，腦袋裡那些工作的事情好像都被風吹走了。\n\n" +
  "想把這種平靜的感覺留下來。";

const DAYS = 3 * 365;

// Fake entries for the last three years up to `today`: most recent days have
// an entry more often than older ones, and every past year has one on today's
// date for On This Day. `seed` makes the output repeatable.
export function fakeEntries(today: Date, seed = 20261025): FakeEntry[] {
  const random = mulberry32(seed);
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];
  const onThisDay = new Set([1, 2].map((years) => format(subYears(today, years), "yyyy-MM-dd")));
  const lastSaturday = Array.from({ length: 7 }, (_, i) => subDays(today, i)).find((day) =>
    isSaturday(day),
  )!;

  const entries: FakeEntry[] = [];
  for (let offset = DAYS; offset >= 0; offset--) {
    const day = subDays(today, offset);
    const date = format(day, "yyyy-MM-dd");
    const rate = offset < 120 ? 0.7 : 0.35;
    if (day.getTime() === lastSaturday.getTime()) {
      entries.push(entry(date, RIVER_WALK, ["日記", "散步"], random));
      continue;
    }
    if (!onThisDay.has(date) && random() > rate) continue;

    const topic = pick(TOPICS);
    const story = pick(topic.stories);
    const paragraphs = random() < 0.25 ? story.slice(0, 1) : [...story];
    if (random() < 0.5) paragraphs.push(pick(topic.closers));
    entries.push(entry(date, paragraphs.join("\n\n"), topic.tags, random));
  }
  return entries;
}

// Written in the evening, Taipei time, sometimes edited a little later.
function entry(date: string, body: string, tags: string[], random: () => number): FakeEntry {
  const minutes = 19 * 60 + Math.floor(random() * 240);
  const created = new Date(
    `${date}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00+08:00`,
  );
  const updated = random() < 0.3 ? new Date(created.getTime() + random() * 3_600_000) : created;
  return {
    entry_date: date,
    body,
    tags,
    created_at: created.toISOString(),
    updated_at: updated.toISOString(),
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// A small seeded PRNG, so the same seed always gives the same diary.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
