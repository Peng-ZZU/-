(async function () {
  const state = {
    outlets: [],
    selected: null
  };

  const els = {
    count: document.getElementById("outletCount"),
    search: document.getElementById("searchInput"),
    suggestions: document.getElementById("suggestions"),
    toggleArea: document.getElementById("toggleArea"),
    areaFinder: document.getElementById("areaFinder"),
    city: document.getElementById("citySelect"),
    district: document.getElementById("districtSelect"),
    outlet: document.getElementById("outletSelect"),
    selected: document.getElementById("selectedOutlet"),
    download: document.getElementById("downloadPoster"),
    canvas: document.getElementById("posterCanvas")
  };

  const ctx = els.canvas.getContext("2d");

  function fitText(text, maxWidth, startSize, weight = "700") {
    let size = startSize;
    do {
      ctx.font = `${weight} ${size}px "Microsoft YaHei", Arial, sans-serif`;
      if (ctx.measureText(text).width <= maxWidth) return ctx.font;
      size -= 3;
    } while (size >= 32);
    return ctx.font;
  }

  function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawCentered(text, x, y, maxWidth, size, color = "#111827", weight = "700") {
    ctx.font = fitText(text, maxWidth, size, weight);
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(text, x, y);
  }

  function drawIcon(type, x, y) {
    ctx.save();
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    if (type === "scan") {
      ctx.beginPath();
      ctx.arc(x - 22, y - 10, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 26, y + 12, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 44, y + 30);
      ctx.lineTo(x + 70, y + 48);
      ctx.stroke();
    } else if (type === "write") {
      ctx.strokeRect(x - 48, y - 52, 72, 86);
      ctx.beginPath();
      ctx.moveTo(x - 25, y - 18);
      ctx.lineTo(x + 16, y - 18);
      ctx.moveTo(x - 25, y + 8);
      ctx.lineTo(x + 7, y + 8);
      ctx.moveTo(x + 25, y + 46);
      ctx.lineTo(x + 70, y + 1);
      ctx.lineTo(x + 54, y - 14);
      ctx.lineTo(x + 9, y + 31);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y - 25, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y + 58, 62, Math.PI, 0);
      ctx.fill();
    }
    ctx.restore();
  }

  function clearPoster() {
    const width = els.canvas.width;
    const height = els.canvas.height;
    ctx.fillStyle = "#2ca9f2";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    for (let i = 0; i < 12; i += 1) {
      ctx.beginPath();
      ctx.arc(120 + i * 125, 95 + (i % 3) * 22, 52, 0, Math.PI * 2);
      ctx.fill();
    }
    roundRect(115, 165, 1270, 1185, 52);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#c8eefb";
    ctx.lineWidth = 8;
    ctx.stroke();
    drawCentered("请选择网点生成二维码", 750, 690, 1020, 62, "#334155");
  }

  async function makeQrCanvas(text, size) {
    const qrCanvas = document.createElement("canvas");
    qrCanvas.width = size;
    qrCanvas.height = size;

    if (!window.QRCode) {
      throw new Error("二维码生成库未加载");
    }

    if (typeof window.QRCode.toCanvas === "function") {
      await window.QRCode.toCanvas(qrCanvas, text, {
        width: size,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#000000", light: "#ffffff" }
      });
      return qrCanvas;
    }

    const holder = document.createElement("div");
    holder.style.position = "fixed";
    holder.style.left = "-9999px";
    holder.style.top = "-9999px";
    document.body.appendChild(holder);
    try {
      new window.QRCode(holder, {
        text,
        width: size,
        height: size,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.M : 0
      });

      const generatedCanvas = holder.querySelector("canvas");
      if (generatedCanvas) {
        qrCanvas.getContext("2d").drawImage(generatedCanvas, 0, 0, size, size);
        return qrCanvas;
      }

      const image = holder.querySelector("img");
      if (image) {
        if (!image.complete && image.decode) {
          await image.decode();
        }
        qrCanvas.getContext("2d").drawImage(image, 0, 0, size, size);
        return qrCanvas;
      }
    } finally {
      holder.remove();
    }

    throw new Error("二维码生成失败");
  }

  async function drawPoster(outlet) {
    const width = els.canvas.width;
    const height = els.canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#2da8f5";
    ctx.fillRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "rgba(255,255,255,0.34)");
    gradient.addColorStop(0.42, "rgba(255,255,255,0)");
    gradient.addColorStop(1, "rgba(11,94,168,0.24)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#263246";
    roundRect(108, 35, 870, 126, 34);
    ctx.fill();
    ctx.fillStyle = "#5f728a";
    ctx.beginPath();
    ctx.moveTo(890, 35);
    ctx.quadraticCurveTo(1015, 44, 1075, 96);
    ctx.lineTo(1020, 161);
    ctx.lineTo(880, 161);
    ctx.closePath();
    ctx.fill();
    drawCentered(`${outlet.code}${outlet.name}`, 540, 70, 820, 58, "#ffffff");

    ctx.fillStyle = "#ffffff";
    roundRect(85, 190, 1330, 1220, 42);
    ctx.fill();
    ctx.strokeStyle = "#bfeeff";
    ctx.lineWidth = 9;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    roundRect(452, 325, 596, 596, 34);
    ctx.fill();
    ctx.strokeStyle = "#5fc9ed";
    ctx.lineWidth = 24;
    ctx.stroke();

    try {
      const qrCanvas = await makeQrCanvas(App.buildReviewUrl(outlet), 510);
      ctx.drawImage(qrCanvas, 495, 368, 510, 510);
    } catch (error) {
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(495, 368, 510, 510);
      drawCentered("二维码生成失败", 750, 610, 420, 38, "#c2410c");
      drawCentered("请刷新页面后重试", 750, 670, 420, 30, "#64748b", "500");
      console.error(error);
    }

    const steps = [
      ["scan", "1", "打开手机扫一扫", "扫码进入评价页面"],
      ["write", "2", "根据实际情况", "作出真实反馈"],
      ["person", "3", "点击提交", "即可完成评价"]
    ];
    steps.forEach((step, index) => {
      const x = 265 + index * 475;
      const iconY = 1075;
      ctx.fillStyle = "#169ff0";
      ctx.beginPath();
      ctx.arc(x, iconY, 76, 0, Math.PI * 2);
      ctx.fill();
      drawIcon(step[0], x, iconY);
      ctx.fillStyle = "#111827";
      ctx.font = '700 82px "Microsoft YaHei", Arial, sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(step[1], x - 98, 1226);
      drawCentered(step[2], x + 42, 1182, 275, 35, "#111827");
      drawCentered(step[3], x + 42, 1234, 275, 32, "#374151", "500");
    });

    drawCentered(
      "微信扫一扫 评价有惊喜（诚邀点评服务与环境，感谢您的支持）",
      750,
      1340,
      1210,
      34,
      "#4b5563",
      "500"
    );
  }

  function renderSuggestions(query = "") {
    const value = App.normalize(query);
    els.suggestions.innerHTML = "";
    if (!value) return;
    const words = value.split(/\s+/).filter(Boolean);
    const matches = state.outlets
      .map((outlet) => {
        const text = outlet.searchText;
        let score = 0;
        words.forEach((word) => {
          if (outlet.code.toLowerCase().startsWith(word)) score += 8;
          if (outlet.name.toLowerCase().includes(word)) score += 6;
          if (text.includes(word)) score += 2;
        });
        return { outlet, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.outlet.code.localeCompare(b.outlet.code))
      .slice(0, 10);

    matches.forEach(({ outlet }) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "suggestion-item";
      item.innerHTML = `<strong>${outlet.code} ${outlet.name}</strong><span>${outlet.city || "-"} ${outlet.district || ""} · ${outlet.parentName || "无上级"}</span>`;
      item.addEventListener("click", () => selectOutlet(outlet));
      els.suggestions.appendChild(item);
    });
  }

  function renderAreaControls() {
    const cities = [...new Set(state.outlets.map((item) => item.city).filter(Boolean))].sort();
    els.city.innerHTML = cities.map((city) => `<option value="${city}">${city}</option>`).join("");
    renderDistricts();
  }

  function renderDistricts() {
    const city = els.city.value;
    const districts = [
      ...new Set(
        state.outlets
          .filter((item) => item.city === city)
          .map((item) => item.district)
          .filter(Boolean)
      )
    ].sort();
    els.district.innerHTML = districts.map((district) => `<option value="${district}">${district}</option>`).join("");
    renderOutletsByArea();
  }

  function renderOutletsByArea() {
    const city = els.city.value;
    const district = els.district.value;
    const outlets = state.outlets.filter((item) => item.city === city && item.district === district);
    els.outlet.innerHTML = outlets
      .map((outlet) => `<option value="${outlet.code}">${outlet.code} ${outlet.name}</option>`)
      .join("");
    if (outlets[0]) selectOutlet(outlets[0], false);
  }

  function renderSelected() {
    const outlet = state.selected;
    if (!outlet) {
      els.selected.className = "selected-outlet empty";
      els.selected.textContent = "请选择一个网点";
      els.download.disabled = true;
      clearPoster();
      return;
    }
    els.selected.className = "selected-outlet";
    els.selected.innerHTML = `
      <strong>${outlet.code} ${outlet.name}</strong>
      <span>${outlet.city || ""} ${outlet.district || ""}</span><br>
      <span>上级：${outlet.parentName || "无"}${outlet.leader ? ` · 负责人：${outlet.leader}` : ""}</span>
    `;
    els.download.disabled = false;
    drawPoster(outlet);
  }

  function selectOutlet(outlet, syncArea = true) {
    state.selected = outlet;
    els.search.value = `${outlet.code} ${outlet.name}`;
    els.suggestions.innerHTML = "";
    if (syncArea && outlet.city && outlet.district) {
      els.city.value = outlet.city;
      renderDistricts();
      els.district.value = outlet.district;
      renderOutletsByArea();
      els.outlet.value = outlet.code;
      state.selected = outlet;
    }
    renderSelected();
  }

  function downloadPoster() {
    if (!state.selected) return;
    const link = document.createElement("a");
    link.download = `${state.selected.code}_${state.selected.name}_评价码.png`;
    link.href = els.canvas.toDataURL("image/png");
    link.click();
  }

  try {
    state.outlets = await App.loadOutlets();
    els.count.textContent = `${state.outlets.length} 个网点`;
    renderAreaControls();
    clearPoster();
  } catch (error) {
    els.count.textContent = "加载失败";
    els.selected.textContent = error.message;
  }

  els.search.addEventListener("input", (event) => renderSuggestions(event.target.value));
  els.toggleArea.addEventListener("click", () => {
    els.areaFinder.hidden = !els.areaFinder.hidden;
  });
  els.city.addEventListener("change", renderDistricts);
  els.district.addEventListener("change", renderOutletsByArea);
  els.outlet.addEventListener("change", () => {
    const outlet = App.findOutlet(state.outlets, els.outlet.value);
    if (outlet) selectOutlet(outlet, false);
  });
  els.download.addEventListener("click", downloadPoster);
})();
