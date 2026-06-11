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
    clearReviews: document.getElementById("clearReviews"),
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

  function assertConfig() {
    const config = App.config || {};
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      throw new Error("还没有配置 Supabase，请先填写 assets/config.js。");
    }
    return config;
  }

  async function callAdminRpc(name, extra = {}) {
    const config = assertConfig();
    const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        admin_user: state.adminUser,
        admin_password: state.adminPassword,
        ...extra
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  function renderRows() {
    if (!state.rows.length) {
      els.tbody.innerHTML = '<tr><td colspan="8">暂无数据</td></tr>';
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
            <td><button class="danger-button small-button" type="button" data-delete-id="${row.id}">删除</button></td>
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

  async function loadReviews() {
    setStatus("正在加载...");
    try {
      state.rows = await callAdminRpc("admin_list_reviews");
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

  async function deleteReview(id) {
    if (!id) return;
    const confirmed = window.confirm("确定删除这条评价记录吗？删除后不可恢复。");
    if (!confirmed) return;
    setStatus("正在删除...");
    try {
      await callAdminRpc("admin_delete_review", { review_id: id });
      await loadReviews();
      setStatus("已删除 1 条记录。", "ok");
    } catch (error) {
      console.error(error);
      setStatus("删除失败，请刷新后重试。", "error");
    }
  }

  async function clearReviews() {
    if (!state.rows.length) {
      setStatus("当前没有可清空的数据。");
      return;
    }
    const confirmed = window.confirm(`确定清空全部 ${state.rows.length} 条评价记录吗？清空后不可恢复。`);
    if (!confirmed) return;
    setStatus("正在清空...");
    try {
      const deletedCount = await callAdminRpc("admin_clear_reviews");
      await loadReviews();
      setStatus(`已清空 ${deletedCount || 0} 条记录。`, "ok");
    } catch (error) {
      console.error(error);
      setStatus("清空失败，请刷新后重试。", "error");
    }
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
    try {
      assertConfig();
      restoreSession();
    } catch (error) {
      setLoginStatus(error.message, "error");
    }
  }

  els.loginPanel.addEventListener("submit", (event) => {
    event.preventDefault();
    login();
  });
  els.logoutButton.addEventListener("click", logout);
  els.refresh.addEventListener("click", loadReviews);
  els.clearReviews.addEventListener("click", clearReviews);
  els.exportCsv.addEventListener("click", exportCsv);
  els.tbody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-id]");
    if (button) deleteReview(button.dataset.deleteId);
  });
  init();
})();
