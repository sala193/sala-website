# 蔡莎拉網站 —— Astro 專案骨架

這是根據我們討論的規劃（社區開箱文、地域知識文章、SEO/GEO優先、金＋深藍色系品牌視覺）
搭建的 Astro 網站骨架。這份檔案是在沒有網路連線的環境裡手寫完成的，
所以還沒有跑過 `npm install`、也還沒有實際啟動測試過，請照下面步驟在你自己的電腦上完成。

## 已經做好的部分

- 首頁、關於蔡莎拉、社區資料庫（列表＋詳情頁）、不動產知識（列表＋詳情頁）、我要賣屋
- 「找房子」「土地．廠房」「鶯歌．鳳鳴」目前是「建置中」的簡易頁面（stub），
  等物件頁範本規劃好之後再補上實際內容
- 品牌視覺 token（金／深藏青／磚紅配色、中文襯線＋黑體字型組合）都寫在 `src/styles/global.css`
- 社區頁、文章頁都已經內建 schema.org 結構化資料，供 SEO／GEO 使用
- 一篇示範社區開箱文（森晴，`src/content/communities/senqing.md`）跟一篇示範知識文章，
  裡面的資料是假設值，正式使用前記得替換成真實資料

## 第一次啟動（在你自己的電腦，用 Claude Code 或終端機執行）

1. 解壓縮這個檔案，放進你要用的資料夾
2. 打開終端機，切到這個資料夾，執行：
   ```
   npm install
   npm run dev
   ```
3. 瀏覽器打開 `http://localhost:4321` 應該就能看到網站

如果 `npm install` 或 `npm run dev` 出現錯誤，把錯誤訊息貼給 Claude Code 就可以請它幫你排除，
這類問題通常是套件版本或 Node.js 版本的小問題，很快能解決。

## 接到 GitHub / Vercel（讓網站正式上線）

你的 salahome.tw 已經接到 Vercel，做法是：

1. 把這個資料夾的內容加進你原本 `test-site` 對應的 GitHub repo（或建一個新 repo，
   再到 Vercel 專案設定裡改連結的 repo）
2. `git add . && git commit -m "建立 Astro 網站骨架" && git push`
3. Vercel 偵測到 push 會自動建置部署，幾分鐘後 salahome.tw 就會顯示新版網站

## 之後新增內容（社區、文章）怎麼做

現階段最簡單的方式：**直接新增一個 Markdown 檔案**。

- 新社區 → 在 `src/content/communities/` 裡新增一個檔案，例如 `qingsong-wan.md`，
  照 `senqing.md` 的格式（frontmatter + 開箱文正文）填資料
- 新文章 → 在 `src/content/articles/` 裡新增一個檔案，照範例格式填

存檔、`git push`，Vercel 就會自動重新產生對應的頁面，不用碰任何程式碼。
你也可以把資料丟給 Claude（我），我可以直接照範本幫你把 Markdown 檔案寫好。

## 後台設定（Decap CMS，選用，讓你不用碰檔案也能發布內容）

`public/admin/` 裡已經放了一個免費開源後台（Decap CMS）的起始設定，
介面會長得像簡化版的部落格後台，填表單、按發布，就會自動存成 Markdown 檔並 push 到 GitHub。

**但這個功能還沒接好，需要多做一次性設定：**

1. 到 GitHub 建立一個 OAuth App（GitHub 帳號設定 → Developer settings → OAuth Apps）
2. 需要一個小型的 OAuth 中介服務幫忙轉接登入請求 —— 最簡單的免費做法是搭配
   Netlify 的 Identity + Git Gateway 服務（即使網站主體還是部署在 Vercel，
   這個服務可以單獨申請來用），或使用 Decap CMS 官方文件裡列出的其他 OAuth provider 做法
3. 把 `public/admin/config.yml` 裡的 `repo:` 換成你實際的 GitHub 帳號／repo 名稱

這部分設定步驟比較瑣碎，建議之後有需要時再請 Claude Code 一步一步帶你設定，
現階段先用「直接新增 Markdown 檔案」的方式發布內容即可，完全不影響網站運作。

## 「我要賣屋」表單還缺一個東西

`src/pages/contact.astro` 裡的表單目前沒有接收後端，填了會送不出去。
最快的解法是申請一個免費表單服務（Formspree 或 Web3Forms 都有免費額度），
拿到專屬網址後貼到表單的 `action=""` 裡即可開始收到通知信，這行我在檔案裡有加註解標記。

## 下一步

- 物件頁範本（含到期下架機制）——規劃好之後我可以比照這次的方式幫你把檔案寫好
- 實際社區資料陸續補上，取代示範內容
- 形象照、海報等視覺素材就緒後，換掉首頁 hero 跟關於頁的佔位區塊
