(function () {
  const state = {
    rows: [],
    adminUser: "",
    adminPassword: ""
  };

  const els = {
    loginPanel: document.getElementById("loginPanel"),
    dataPanel: document.getElementById("dataPanel"),
    loginStatus: document.getElementById("loginStatus"),
    adminUser: document.getElementById("adminUser"),
    adminPassword: document.getElementById("adminPassword"),
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

  function showDataPanel() {
    els.loginPanel.hidden = true;
    els.dataPanel.hidden = false;
  }

  function showLoginPanel() {
    els.loginPanel.hidden = false;
    els.dataPanel.hidden = true;
    state.rows = [];
    state.adminUser = "";
    state.adminPassword = "";
    sessionStorage.removeItem("adminUser");
    sessionStorage.removeItem("adminPassword");
    renderRows();
  }

  async function callAdminListReviews() {
    const config = App.config || {};
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      throw new Error("还没有配置 Supabase，请先填写 assets/config.js。");
    }

    const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/admin_list_reviews`, {
      method: "POST",
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        admin_user: state.adminUser,
        admin_password: state.adminPassword
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async function loadReviews() {
    if (!App.config || !App.config.supabaseUrl) {
      setStatus("还没有配置 Supabase，请先填写 assets/config.js。", "error");
      renderRows();
      return;
    }
    setStatus("正在加载...");
    try {
      state.rows = await callAdminListReviews();
    } catch (error) {
      setStatus("账号或密码错误，或数据读取失败。", "error");
      setLoginStatus("账号或密码错误。", "error");
      console.error(error);
      showLoginPanel();
      return;
    }
    renderRows();
    setStatus(`已加载 ${state.rows.length} 条记录`, "ok");
  }

  async function login() {
    const user = els.adminUser.value.trim();
    const password = els.adminPassword.value;
    if (!user || !password) {
      setLoginStatus("请输入账号和密码。", "error");
      return;
    }
    state.adminUser = user;
    state.adminPassword = password;
    els.loginButton.disabled = true;
    setLoginStatus("正在登录...");
    showDataPanel();
    await loadReviews();
    els.loginButton.disabled = false;
    if (!els.dataPanel.hidden) {
      sessionStorage.setItem("adminUser", user);
      sessionStorage.setItem("adminPassword", password);
      setLoginStatus("");
    }
  }

  function logout() {
    els.adminUser.value = "";
    els.adminPassword.value = "";
    setLoginStatus("");
    setStatus("");
    showLoginPanel();
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

  function restoreSession() {
    const user = sessionStorage.getItem("adminUser");
    const password = sessionStorage.getItem("adminPassword");
    if (user && password) {
      state.adminUser = user;
      state.adminPassword = password;
      els.adminUser.value = user;
      els.adminPassword.value = password;
      showDataPanel();
      loadReviews();
    } else {
      showLoginPanel();
    }
  }

  function init() {
    if (!App.config || !App.config.supabaseUrl || !App.config.supabaseAnonKey) {
      setLoginStatus("还没有配置 Supabase，请先填写 assets/config.js。", "error");
      return;
    }
    restoreSession();
  }

  els.loginPanel.addEventListener("submit", (event) => {
    event.preventDefault();
    login();
  });
  els.logoutButton.addEventListener("click", logout);
  els.refresh.addEventListener("click", loadReviews);
  els.exportCsv.addEventListener("click", exportCsv);
  init();
})();
