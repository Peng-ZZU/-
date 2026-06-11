(async function () {
  const state = {
    outlet: null,
    environmentScore: 10,
    serviceScore: 10,
    selectedFiles: []
  };

  const els = {
    title: document.getElementById("reviewOutletName"),
    info: document.getElementById("outletInfo"),
    form: document.getElementById("reviewForm"),
    feedback: document.getElementById("feedback"),
    photos: document.getElementById("photos"),
    photoList: document.getElementById("photoList"),
    submit: document.getElementById("submitReview"),
    status: document.getElementById("submitStatus")
  };

  function setStatus(message, type = "") {
    els.status.textContent = message;
    els.status.className = `status-text ${type}`;
  }

  function renderOutlet(outlet) {
    if (!outlet) {
      els.title.textContent = "未找到网点";
      els.info.innerHTML = "<div>二维码参数不正确，请联系工作人员重新生成。</div>";
      els.submit.disabled = true;
      return;
    }
    els.title.textContent = `${outlet.code}${outlet.name}`;
    const rows = [
      ["地区", `${outlet.city || ""}${outlet.district ? ` ${outlet.district}` : ""}`.trim()],
      ["上级名称", outlet.parentName],
      ["详细地址", outlet.address],
      ["网点负责人", outlet.leader]
    ].filter((row) => row[1]);
    els.info.innerHTML = rows.map(([label, value]) => `<div><strong>${label}：</strong>${value}</div>`).join("");
  }

  function setStarValue(name, value) {
    state[name] = value;
    document.querySelectorAll(`.stars[data-name="${name}"] .star`).forEach((star, index) => {
      const fill = Math.max(0, Math.min(1, (value - index * 2) / 2));
      star.querySelector(".fill").style.width = `${fill * 100}%`;
    });
  }

  function renderStars() {
    document.querySelectorAll(".stars").forEach((wrap) => {
      const name = wrap.dataset.name;
      wrap.innerHTML = "";
      for (let i = 0; i < 5; i += 1) {
        const star = document.createElement("span");
        star.className = "star";
        star.innerHTML = '<span class="fill"></span>';
        star.addEventListener("mousemove", (event) => {
          const rect = star.getBoundingClientRect();
          const half = event.clientX - rect.left <= rect.width / 2 ? 1 : 2;
          setStarValue(name, i * 2 + half);
        });
        star.addEventListener("click", (event) => {
          const rect = star.getBoundingClientRect();
          const half = event.clientX - rect.left <= rect.width / 2 ? 1 : 2;
          setStarValue(name, i * 2 + half);
        });
        star.addEventListener("touchstart", (event) => {
          const touch = event.touches[0];
          const rect = star.getBoundingClientRect();
          const half = touch.clientX - rect.left <= rect.width / 2 ? 1 : 2;
          setStarValue(name, i * 2 + half);
        });
        wrap.appendChild(star);
      }
      setStarValue(name, state[name]);
    });
  }

  function renderPhotos() {
    els.photoList.innerHTML = "";
    state.selectedFiles.forEach((file) => {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.alt = file.name;
      img.onload = () => URL.revokeObjectURL(img.src);
      els.photoList.appendChild(img);
    });
  }

  async function uploadPhotos(client) {
    if (!state.selectedFiles.length) return [];
    const urls = [];
    for (const file of state.selectedFiles) {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
      const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
      const path = `${state.outlet.code}/${Date.now()}-${Math.random().toString(16).slice(2)}.${safeExt}`;
      const { error } = await client.storage.from("review-photos").upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: false
      });
      if (error) throw error;
      const { data } = client.storage.from("review-photos").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function submitReview(event) {
    event.preventDefault();
    if (!state.outlet) return;
    const client = App.getSupabaseClient();
    if (!client) {
      setStatus("还没有配置 Supabase，当前无法在线保存数据。请先填写 assets/config.js。", "error");
      return;
    }

    els.submit.disabled = true;
    setStatus("正在提交，请稍候...");
    try {
      const photoUrls = await uploadPhotos(client);
      const payload = {
        outlet_code: state.outlet.code,
        outlet_name: state.outlet.name,
        parent_name: state.outlet.parentName,
        city: state.outlet.city,
        district: state.outlet.district,
        address: state.outlet.address,
        leader: state.outlet.leader,
        environment_score: state.environmentScore,
        service_score: state.serviceScore,
        feedback: els.feedback.value.trim(),
        photo_urls: photoUrls
      };
      const { error } = await client.from("reviews").insert(payload);
      if (error) throw error;
      els.form.reset();
      state.selectedFiles = [];
      renderPhotos();
      setStarValue("environmentScore", 10);
      setStarValue("serviceScore", 10);
      setStatus("提交成功，感谢您的评价。", "ok");
    } catch (error) {
      setStatus(`提交失败：${error.message}`, "error");
    } finally {
      els.submit.disabled = false;
    }
  }

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code") || params.get("outletCode");

  try {
    const outlets = await App.loadOutlets();
    state.outlet = App.findOutlet(outlets, code);
    renderOutlet(state.outlet);
    renderStars();
  } catch (error) {
    els.title.textContent = "加载失败";
    els.info.textContent = error.message;
    els.submit.disabled = true;
  }

  els.photos.addEventListener("change", () => {
    state.selectedFiles = [...els.photos.files].slice(0, 6);
    renderPhotos();
  });
  els.form.addEventListener("submit", submitReview);
})();
