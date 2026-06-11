# 网点评价码网页

这个目录是一套静态网页版本：

- `index.html`：员工选择网点并生成可打印二维码海报。
- `review.html`：客户扫码后的评价页面。
- `admin.html`：查看和导出 Supabase 中的评价数据。
- `data/outlets.json`：从根目录 `网点信息.xlsx` 生成的网点数据。
- `supabase/schema.sql`：Supabase 建表和存储桶 SQL。

## 本地预览

在本目录运行：

```powershell
python -m http.server 5173
```

然后打开：

```text
http://localhost:5173/
```

## Supabase 配置

1. 在 Supabase 创建项目。
2. 打开 SQL Editor，执行 `supabase/schema.sql`。
3. 复制项目 URL 和 `anon public` key。
4. 编辑 `assets/config.js`：

```js
window.APP_CONFIG = {
  supabaseUrl: "https://你的项目.supabase.co",
  supabaseAnonKey: "你的 anon key",
  reviewBaseUrl: ""
};
```

`reviewBaseUrl` 部署后可留空，系统会自动用当前站点的 `review.html`。如果员工生成页和客户评价页不在同一域名，可以填完整地址，例如：

```js
reviewBaseUrl: "https://example.com/review.html"
```
