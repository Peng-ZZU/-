# 网点评价码网页

本仓库包含一套静态网页：

- `web-app/index.html`：员工选择网点并生成高清二维码海报。
- `web-app/review.html`：客户扫码后填写评价、上传照片。
- `web-app/admin.html`：查看评价数据并导出 CSV。

数据存储使用 Supabase。建表脚本在 `web-app/supabase/schema.sql`，配置文件在 `web-app/assets/config.js`。

本地预览：

```powershell
cd web-app
python -m http.server 5173
```

然后打开 `http://localhost:5173/`。
