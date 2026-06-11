(function () {
  const config = window.APP_CONFIG || {};

  function normalize(text) {
    return String(text || "").trim().toLowerCase();
  }

  function getReviewBaseUrl() {
    if (config.reviewBaseUrl) return config.reviewBaseUrl;
    return new URL("review.html", window.location.href).toString();
  }

  function buildReviewUrl(outlet) {
    const url = new URL(getReviewBaseUrl(), window.location.href);
    url.searchParams.set("code", outlet.code);
    return url.toString();
  }

  async function loadOutlets() {
    const response = await fetch("data/outlets.json", { cache: "no-store" });
    if (!response.ok) throw new Error("网点数据加载失败");
    return response.json();
  }

  function getSupabaseClient() {
    if (!config.supabaseUrl || !config.supabaseAnonKey) return null;
    if (!window.supabase) return null;
    return window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  function findOutlet(outlets, code) {
    return outlets.find((item) => item.code === code);
  }

  function escapeCsv(value) {
    const text = String(value ?? "");
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  window.App = {
    config,
    normalize,
    buildReviewUrl,
    loadOutlets,
    getSupabaseClient,
    findOutlet,
    escapeCsv
  };
})();
