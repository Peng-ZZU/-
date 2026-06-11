(function () {
  const state = {
    rows: [],
    client: null,
    session: null
  };

  const els = {
    loginPanel: document.getElementById("loginPanel"),
    loginStatus: document.getElementById("loginStatus"),
    adminEmail: document.getElementById("adminEmail"),
    loginButton: document.getElementById("loginButton"),
    logoutButton: document.getElementById("logoutButton"),
    status: document.getElementById("adminStatus"),
    tbody: document.getElementById("reviewRows"),
    refresh: document.getElementById("refreshReviews"),
    exportCsv: document.getElementById("exportCsv")
  };

  function setStatus(message, type = "") {
    els.status.textContent = message;
    els.status.className = `status-text ${type}`;
  }

  function setLoginStatus(message, type = "") {
    els.loginStatus.textContent = message;
    els.loginStatus.className = `status-text ${type}`;
  }

  function renderRows() {
    if (!state.rows.length) {
      els.tbody.innerHTML = '<tr><td colspan="7">暂无数据</td></tr>';
      return;
    }
    els.tbody.innerHTML = state.rows
      .map((row) => {
        const photos = (row.photo_urls || [])
          .map((url, index) => `<a href="${url}" target="_blank" rel="noreferrer">照片${index + 1}</a>`)
          .join(" ");
        return `
          <tr>
            <td>${new Date(row.created_at).toLocaleString("zh-CN")}</td>
            <td>${row.outlet_code || ""}</td>
            <td>${row.outlet_name || ""}</td>
            <td>${row.environment_score || ""}</td>
            <td>${row.service_score || ""}</td>
            <td>${row.feedback || ""}</td>
            <td>${photos}</td>
          </tr>
        `;
      })
      .join("");
  }

  async function loadReviews() {
    if (!state.client) {
      setStatus("还没有配置 Supabase，请先填写 assets/config.js。", "error");
      renderRows();
      return;
    }
    if (!state.session) {
      setStatus("请先登录管理员账号。");
      renderRows();
      return;
    }
    setStatus("正在加载...");
    const { data, error } = await state.client
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) {
      setStatus(`加载失败：${error.message}`, "error");
      return;
    }
    state.rows = data || [];
    renderRows();
    setStatus(`已加载 ${state.rows.length} 条记录`, "ok");
  }

  async function login() {
    if (!state.client) {
      setLoginStatus("还没有配置 Supabase，请先填写 assets/config.js。", "error");
      return;
    }
    const email = els.adminEmail.value.trim();
    if (!email) {
      setLoginStatus("请输入邮箱。", "error");
      return;
    }
    const { error } = await state.client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href }
    });
    if (error) {
      setLoginStatus(`发送失败：${error.message}`, "error");
      return;
    }
    setLoginStatus("登录链接已发送，请打开邮箱完成登录。", "ok");
  }

  async function logout() {
    if (state.client) await state.client.auth.signOut();
    state.session = null;
    state.rows = [];
    updateAuthUi();
    renderRows();
  }

  function updateAuthUi() {
    const loggedIn = Boolean(state.session);
    els.loginPanel.hidden = loggedIn;
    els.logoutButton.hidden = !loggedIn;
    if (loggedIn) loadReviews();
  }

  function exportCsv() {
    const headers = [
      "提交时间",
      "网点编码",
      "网点名称",
      "上级名称",
      "城市",
      "区县",
      "详细地址",
      "网点负责人",
      "第一个问题得分",
      "第二个问题得分",
      "意见反馈",
      "照片"
    ];
    const lines = [
      headers.map(App.escapeCsv).join(","),
      ...state.rows.map((row) =>
        [
          row.created_at,
          row.outlet_code,
          row.outlet_name,
          row.parent_name,
          row.city,
          row.district,
          row.address,
          row.leader,
          row.environment_score,
          row.service_score,
          row.feedback,
          (row.photo_urls || []).join(" ")
        ]
          .map(App.escapeCsv)
          .join(",")
      )
    ];
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `网点评价数据_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function init() {
    state.client = App.getSupabaseClient();
    if (!state.client) {
      setStatus("还没有配置 Supabase，请先填写 assets/config.js。", "error");
      renderRows();
      return;
    }
    const { data } = await state.client.auth.getSession();
    state.session = data.session;
    state.client.auth.onAuthStateChange((_event, session) => {
      state.session = session;
      updateAuthUi();
    });
    updateAuthUi();
  }

  els.loginButton.addEventListener("click", login);
  els.logoutButton.addEventListener("click", logout);
  els.refresh.addEventListener("click", loadReviews);
  els.exportCsv.addEventListener("click", exportCsv);
  init();
})();
