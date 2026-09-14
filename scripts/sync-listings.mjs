/**
 * sync-listings.mjs
 * ------------------------------------------------------------
 * 抓取「永慶房仲網」門市公開物件列表頁(shop.yungching.com.tw),
 * 解析出物件基本資料,寫成 src/data/listings.json
 * 給 find.astro (待售物件頁面)在建置時讀取顯示。
 *
 * 用法: node scripts/sync-listings.mjs
 * 不需要額外安裝套件(只用 Node 18+ 內建的 fetch)。
 *
 * 支援同時抓多間門市(目前是鶯歌建國捷運店 + 鳳鳴站前店),
 * 每筆物件會標上 store / storeName,方便在頁面上分辨或篩選。
 *
 * 注意:這支程式解析的是門市「公開」列表頁,任何人不用登入都看得到,
 * 跟樂屋網後台「複製外網物件」功能做的事情一樣 —— 都是從永慶官網公開頁面取資料。
 * 沒有使用任何帳號密碼,也沒有連進後台系統。
 *
 * 每天整批重新抓取、整批覆蓋輸出檔案,所以官網上下架的物件隔天就會自動從
 * 網站消失,新上架的也會自動出現,不用另外寫上架/下架邏輯。
 *
 * 如果永慶官網改版導致抓不到資料或欄位跑掉,把 debug 資料夾裡存的原始頁面
 * 貼給 Claude 就能幫忙重新調整解析規則。
 * ------------------------------------------------------------
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 要同步的門市清單:shopCode 是永慶房仲網門市網址代碼(通常等於電話號碼)
const STORES = [
  { shopCode: '0226776996', storeName: '鶯歌建國捷運加盟店' },
  { shopCode: '0226772282', storeName: '鶯歌鳳鳴站前加盟店' }
];

const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'listings.json');
const DEBUG_DIR = path.join(__dirname, '..', '.sync-debug');

async function fetchPage(shopCode, pageNum) {
  const base = `https://shop.yungching.com.tw/${shopCode}/list`;
  const url = pageNum <= 1 ? base : `${base}?pg=${pageNum}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
    }
  });
  if (!res.ok) {
    throw new Error(`抓取失敗 ${url} -> HTTP ${res.status}`);
  }
  return res.text();
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&middot;/g, '‧')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMaxPage(html) {
  const nums = [...html.matchAll(/[?&]pg=(\d+)/g)].map((m) => parseInt(m[1], 10));
  return nums.length ? Math.max(...nums) : 1;
}

const TYPE_KEYWORDS = [
  '電梯大樓',
  '電梯華廈',
  '華廈',
  '透天厝',
  '公寓',
  '辦公',
  '廠房',
  '店面',
  '土地',
  '其他'
];

// 全台 22 縣市(含新舊字寫法 台/臺),避免外縣市土地物件因為找不到前綴
// 而讓案名跟地址黏在一起、address 欄位變成 null。
const CITY_PREFIXES = [
  '新北市',
  '台北市',
  '臺北市',
  '桃園市',
  '台中市',
  '臺中市',
  '台南市',
  '臺南市',
  '高雄市',
  '基隆市',
  '新竹市',
  '新竹縣',
  '苗栗縣',
  '彰化縣',
  '南投縣',
  '雲林縣',
  '嘉義市',
  '嘉義縣',
  '屏東縣',
  '宜蘭縣',
  '花蓮縣',
  '台東縣',
  '臺東縣',
  '澎湖縣',
  '金門縣',
  '連江縣'
];

function parseBlock(id, block, store) {
  const text = stripTags(block);

  const caseNoMatch = text.match(/YC\d{6,9}/);
  const priceMatches = [...text.matchAll(/([\d,]{3,})\s*萬/g)].map((m) =>
    parseInt(m[1].replace(/,/g, ''), 10)
  );
  const price = priceMatches.length ? priceMatches[priceMatches.length - 1] : null;
  const originalPrice =
    priceMatches.length > 1 && priceMatches[0] !== price ? priceMatches[0] : null;

  const roomMatch = text.match(/(\d+)房\(室\)(\d+)廳(\d+)衛/);
  const buildingPingMatch = text.match(/建物\s*([\d.]+)\s*坪/);
  const landPingMatch = text.match(/土地\s*([\d.]+)\s*坪/);

  // 型態/屋齡在頁面上是緊鄰的兩個欄位(例如「華廈」後面接「28.4年」),
  // 用這個組合關係來定位,比單純用 TYPE_KEYWORDS.find() 找關鍵字準確。
  // 因為文案裡常出現「電梯華廈~大三房」這種行銷句子,裡面也會包含型態關鍵字,
  // 若只找第一個出現的關鍵字容易誤判成文案裡提到的型態,而不是物件真正的型態欄位。
  const typeAgeMatch = text.match(
    /(電梯大樓|電梯華廈|華廈|透天厝|公寓|辦公|廠房|店面|土地|其他)\s*([\d.]+)\s*年/
  );
  const ageMatch = text.match(/([\d.]+)\s*年/);
  const typeMatch = typeAgeMatch
    ? typeAgeMatch[1]
    : TYPE_KEYWORDS.find((t) => text.includes(t)) || null;
  const age = typeAgeMatch ? parseFloat(typeAgeMatch[2]) : ageMatch ? parseFloat(ageMatch[1]) : null;
  const isNew = /新上/.test(text);
  const isHot = /強打/.test(text);
  const discountMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);

  // 標題與地址是最不穩定的欄位,採「盡量抓,抓不到就留空」的寬鬆策略。
  // h1 裡的案名(caseNo 之前那段)常被官網截斷加上「...」,
  // 但緊接在 caseNo 後面、型態關鍵字之前的那段文字是「完整未截斷」的案名,優先採用。
  const headStop = caseNoMatch ? text.indexOf(caseNoMatch[0]) : 100;
  const head = text.slice(0, Math.max(headStop, 0)).trim();

  // 地址一律取「最後一個」出現的縣市前綴,而不是第一個 —— 因為案名本身
  // 有時會用地名當開場(例如「桃園市龍潭區全新挑高店...」),真正的地址
  // 是緊接在案名後面、caseNo 之前的最後一段。
  let address = null;
  let name = head;
  let lastPrefixIdx = -1;
  for (const prefix of CITY_PREFIXES) {
    const idx = head.lastIndexOf(prefix);
    if (idx > lastPrefixIdx) lastPrefixIdx = idx;
  }
  if (lastPrefixIdx !== -1) {
    address = head.slice(lastPrefixIdx).trim();
    name = head.slice(0, lastPrefixIdx).trim();
  }

  return {
    id,
    store: store.shopCode,
    storeName: store.storeName,
    caseNo: caseNoMatch ? caseNoMatch[0] : null,
    name: name || null,
    address: address || null,
    type: typeMatch,
    age,
    rooms: roomMatch ? `${roomMatch[1]}房${roomMatch[2]}廳${roomMatch[3]}衛` : null,
    buildingPing: buildingPingMatch ? parseFloat(buildingPingMatch[1]) : null,
    landPing: landPingMatch ? parseFloat(landPingMatch[1]) : null,
    price,
    originalPrice,
    discountPercent: discountMatch ? parseFloat(discountMatch[1]) : null,
    isNew,
    isHot,
    url: `https://buy.yungching.com.tw/house/${id}`
  };
}

function parseListingsFromHtml(html, store) {
  const linkRe = /(?:https?:)?\/\/buy\.yungching\.com\.tw\/house\/(\d+)/g;
  const seen = new Map();
  let m;
  while ((m = linkRe.exec(html))) {
    const id = m[1];
    if (!seen.has(id)) {
      // 從連結出現的位置(在 <a href="..."> 屬性中間)往後找該標籤的 ">",
      // 讓區塊從標籤結束後的乾淨內容開始,避免殘留 class/attr 字串混進標題。
      const tagEnd = html.indexOf('>', m.index);
      seen.set(id, tagEnd !== -1 ? tagEnd + 1 : m.index);
    }
  }
  const ordered = [...seen.entries()].sort((a, b) => a[1] - b[1]);

  const results = [];
  for (let i = 0; i < ordered.length; i++) {
    const [id, start] = ordered[i];
    const end = i + 1 < ordered.length ? ordered[i + 1][1] : html.length;
    results.push(parseBlock(id, html.slice(start, end), store));
  }
  return results;
}

async function syncStore(store) {
  console.log(`\n== ${store.storeName} (${store.shopCode}) ==`);
  console.log('抓取第 1 頁…');
  const firstHtml = await fetchPage(store.shopCode, 1);
  const maxPage = extractMaxPage(firstHtml);
  console.log(`偵測到共 ${maxPage} 頁`);

  let all = parseListingsFromHtml(firstHtml, store);

  for (let p = 2; p <= maxPage; p++) {
    console.log(`抓取第 ${p} 頁…`);
    const html = await fetchPage(store.shopCode, p);
    all = all.concat(parseListingsFromHtml(html, store));
    await new Promise((r) => setTimeout(r, 1000)); // 放慢速度,對官網禮貌一點
  }

  return { listings: all, firstHtml };
}

async function main() {
  let all = [];
  const debugPages = {};

  for (const store of STORES) {
    const { listings, firstHtml } = await syncStore(store);
    all = all.concat(listings);
    debugPages[store.shopCode] = firstHtml;
    await new Promise((r) => setTimeout(r, 1000)); // 換下一間店前也緩一下
  }

  // 依 id+store 去重(理論上分頁不會重複,保險起見還是做一次)
  const dedup = new Map();
  for (const item of all) dedup.set(`${item.store}-${item.id}`, item);
  const listings = [...dedup.values()];

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(listings, null, 2), 'utf-8');
  console.log(`\n完成:共寫入 ${listings.length} 筆物件到 ${OUTPUT_PATH}`);

  // 如果解析結果看起來異常(例如名稱大量是 null),額外存原始頁面方便除錯
  const brokenCount = listings.filter((l) => !l.name || !l.price).length;
  if (brokenCount > listings.length * 0.3) {
    await mkdir(DEBUG_DIR, { recursive: true });
    for (const [shopCode, html] of Object.entries(debugPages)) {
      await writeFile(path.join(DEBUG_DIR, `${shopCode}-page1.html`), html, 'utf-8');
    }
    console.warn(
      `警告:有 ${brokenCount} 筆資料缺少關鍵欄位,可能是永慶官網改版。` +
        `已將各門市第1頁原始HTML存到 ${DEBUG_DIR}/,可以把這些檔案貼給 Claude 幫忙重新調整解析規則。`
    );
  }
}

main().catch((err) => {
  console.error('同步失敗:', err);
  process.exit(1);
});
