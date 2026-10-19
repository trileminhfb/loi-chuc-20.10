// 1. Database lời chúc lấy trực tiếp từ Google Sheets
// Sheet cần được chia sẻ quyền "Bất kỳ ai có đường liên kết - Người xem"
// Các cột dự kiến: ID, Ma_danh_muc, Danh_muc, Noi_dung_loi_chuc, Trang_thai, Ghi_chu
const GOOGLE_SHEET_ID = "1tNzKwp3BBHPONpLzUOi-_1LpHdjJa0LxTmNJ4SgXWFg";
const GOOGLE_SHEET_GID = "0";
const GOOGLE_SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GOOGLE_SHEET_GID}`;

const wishesDatabase = { all: [] };

const categoryAliases = {
  mom: "mom",
  danhchome: "mom",
  me: "mom",
  lover: "lover",
  nguoiyeungotngao: "lover",
  nguoiyeu: "lover",
  friends: "friends",
  banbechiem: "friends",
  colleague: "colleague",
  dongnghieprangro: "colleague",
  dongnghiep: "colleague",
  funny: "funny",
  haihuocvuinhon: "funny",
  selflove: "selflove",
  tuyeubanthan: "selflove",
};

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "");
}

// Đọc CSV có hỗ trợ dấu phẩy, dấu ngoặc kép và xuống dòng trong ô.
function parseCSV(csvText) {
  const rows = [];
  let row = [],
    cell = "",
    inQuotes = false;
  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    if (ch === '"') {
      if (inQuotes && csvText[i + 1] === '"') {
        cell += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && csvText[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
  }
  return rows;
}

async function loadWishesFromGoogleSheet() {
  const response = await fetch(GOOGLE_SHEET_CSV_URL, { cache: "no-store" });
  if (!response.ok)
    throw new Error(`Không thể tải Google Sheets (HTTP ${response.status})`);
  const csvText = await response.text();
  if (/^\s*<!doctype html|^\s*<html/i.test(csvText)) {
    throw new Error(
      "Google Sheets chưa được chia sẻ công khai hoặc chưa cho phép xem dữ liệu.",
    );
  }

  const rows = parseCSV(csvText);
  if (rows.length < 2)
    throw new Error("Google Sheets chưa có dữ liệu lời chúc.");
  const headers = rows[0].map(normalizeHeader);
  const findColumn = (...names) =>
    headers.findIndex((header) => names.includes(header));
  const categoryIndex = findColumn(
    "madanhmuc",
    "category",
    "categoryid",
    "loai",
  );
  const contentIndex = findColumn(
    "noidungloichuc",
    "noidung",
    "loichuc",
    "wish",
    "content",
    "message",
  );
  const statusIndex = findColumn("trangthai", "status", "active", "hoatdong");

  if (categoryIndex < 0 || contentIndex < 0) {
    throw new Error(
      "Không tìm thấy cột Ma_danh_muc và Noi_dung_loi_chuc. Hãy kiểm tra hàng tiêu đề trong sheet.",
    );
  }

  Object.keys(wishesDatabase).forEach((key) => {
    wishesDatabase[key] = [];
  });
  const activeRows = rows
    .slice(1)
    .map((row) => {
      const rawCategory = String(row[categoryIndex] || "").trim();
      const normalizedCategory = normalizeHeader(rawCategory).replace(
        /([a-z])([A-Z])/g,
        "$1 $2",
      );
      const category =
        categoryAliases[rawCategory.toLowerCase()] ||
        categoryAliases[normalizedCategory] ||
        categoryAliases[normalizeHeader(rawCategory)] ||
        normalizeHeader(rawCategory);
      const content = String(row[contentIndex] || "").trim();
      const rawStatus =
        statusIndex >= 0
          ? String(row[statusIndex] || "")
              .trim()
              .toLowerCase()
          : "1";
      const inactive = [
        "0",
        "false",
        "inactive",
        "hidden",
        "an",
        "ngung",
      ].includes(rawStatus);
      return { category, content, inactive };
    })
    .filter(
      (item) =>
        item.content &&
        !item.inactive &&
        item.category !== "all" &&
        item.category !== "danhmuc",
    );

  activeRows.forEach((item) => {
    if (!wishesDatabase[item.category]) wishesDatabase[item.category] = [];
    wishesDatabase[item.category].push(item.content);
  });
  wishesDatabase.all = activeRows.map((item) => item.content);
  if (!wishesDatabase.all.length)
    throw new Error("Không có lời chúc đang hoạt động trong Google Sheets.");
  return wishesDatabase.all.length;
}

// Trạng thái hiện tại

let currentCategory = "all";

let previousIndex = -1;

let heartCount = 20;

const catDisplayNames = {
  all: "🌸 Tất cả đối tượng",

  mom: "👩 Dành cho Mẹ",

  lover: "💕 Người yêu ngọt ngào",

  friends: "🫶 Bạn bè & Chị em",

  colleague: "🌷 Đồng nghiệp rạng rỡ",

  funny: "😂 Hài hước & Vui nhộn",

  selflove: "✨ Tự yêu bản thân",
};

// DOM Elements

const wishDisplay = document.getElementById("wish-display");

const categoryBadge = document.getElementById("current-category-badge");

const wishCounter = document.getElementById("wish-counter");

const btnNextWish = document.getElementById("btn-next-wish");

const btnCopyWish = document.getElementById("btn-copy-wish");

const btnShareWish = document.getElementById("btn-share-wish");

const btnHeartBurst = document.getElementById("btn-heart-burst");

const heartBadge = document.getElementById("heart-count-badge");

const refreshIcon = document.getElementById("refresh-icon");

const toast = document.getElementById("toast-notification");

const toastMsg = document.getElementById("toast-message");

const categoryButtons = document.querySelectorAll(".cat-pill");

// Hàm lấy ngẫu nhiên không trùng lặp ngay trước đó

function getRandomWish(category) {
  const list = wishesDatabase[category] || wishesDatabase.all || [];
  if (!list.length) return { text: "", index: 0, total: 0 };
  if (list.length === 1) return { text: list[0], index: 1, total: 1 };
  let nextIndex;
  do {
    nextIndex = Math.floor(Math.random() * list.length);
  } while (nextIndex === previousIndex);
  previousIndex = nextIndex;
  return { text: list[nextIndex], index: nextIndex + 1, total: list.length };
}

// Hiển thị lời chúc với hiệu ứng mềm mại

function renderWish(category = currentCategory) {
  const { text, index, total } = getRandomWish(category);
  if (!text) {
    wishDisplay.textContent = "Đang tải lời chúc từ Google Sheets...";
    categoryBadge.textContent =
      catDisplayNames[category] || catDisplayNames.all;
    wishCounter.textContent = "Đang kết nối dữ liệu...";
    return;
  }

  // Hiệu ứng fade-out nhẹ

  wishDisplay.classList.add("opacity-0", "scale-95");

  refreshIcon.classList.add("rotate-180");

  setTimeout(() => {
    wishDisplay.textContent = `"${text}"`;

    categoryBadge.textContent = catDisplayNames[category];

    wishCounter.textContent = `Lời chúc số: ${index} / ${total} câu chọn lọc`;

    wishDisplay.classList.remove("opacity-0", "scale-95");

    refreshIcon.classList.remove("rotate-180");
  }, 200);
}

// Xử lý chuyển tab Filter

categoryButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    categoryButtons.forEach((b) => {
      b.classList.remove(
        "bg-primary",
        "text-white",
        "shadow-md",
        "shadow-primary/20",
        "scale-105",
      );

      b.classList.add(
        "bg-white/80",
        "text-on-surface",
        "border",
        "border-outline-variant/30",
      );
    });

    btn.classList.add(
      "bg-primary",
      "text-white",
      "shadow-md",
      "shadow-primary/20",
      "scale-105",
    );

    btn.classList.remove(
      "bg-white/80",
      "text-on-surface",
      "border",
      "border-outline-variant/30",
    );

    currentCategory = btn.getAttribute("data-cat");

    previousIndex = -1; // Reset để ngẫu nhiên mượt mà

    renderWish(currentCategory);
  });
});

// Nút đổi lời chúc tiếp theo

btnNextWish.addEventListener("click", () => {
  renderWish(currentCategory);
});

// Toast helper

function showToast(message) {
  toastMsg.textContent = message;

  toast.classList.remove("opacity-0", "-translate-y-4");

  toast.classList.add("opacity-100", "translate-y-0");

  setTimeout(() => {
    toast.classList.remove("opacity-100", "translate-y-0");

    toast.classList.add("opacity-0", "-translate-y-4");
  }, 2500);
}

// Sao chép lời chúc

btnCopyWish.addEventListener("click", async () => {
  const text = wishDisplay.textContent;

  try {
    await navigator.clipboard.writeText(text);

    showToast("Đã sao chép lời chúc yêu thương! 💕");
  } catch (err) {
    // Fallback

    const textarea = document.createElement("textarea");

    textarea.value = text;

    document.body.appendChild(textarea);

    textarea.select();

    document.execCommand("copy");

    document.body.removeChild(textarea);

    showToast("Đã sao chép lời chúc yêu thương! 💕");
  }
});

// Chia sẻ lời chúc

btnShareWish.addEventListener("click", async () => {
  const text = wishDisplay.textContent;

  const shareData = {
    title: "Lời chúc 20/10 ngọt ngào",

    text: `${text}\n-- Gửi gắm nhân ngày Phụ Nữ Việt Nam 20/10 💕 --`,

    url: window.location.href,
  };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
    } catch (e) {
      // User cancelled
    }
  } else {
    // Sao chép link + nội dung

    navigator.clipboard.writeText(
      `${text}\nXem thêm lời chúc tại: ${window.location.href}`,
    );

    showToast("Đã copy lời chúc & link chia sẻ vào clipboard! 💌");
  }
});

// Hiệu ứng Thả tim văng bùng nổ (Heart Burst Effect)

btnHeartBurst.addEventListener("click", (e) => {
  heartCount++;

  heartBadge.textContent = heartCount;

  const rect = btnHeartBurst.getBoundingClientRect();

  const originX = rect.left + rect.width / 2;

  const originY = rect.top;

  const heartIcons = ["💖", "💕", "💗", "🌸", "✨", "🌷", "💝"];

  for (let i = 0; i < 14; i++) {
    const el = document.createElement("div");

    el.className = "burst-heart text-2xl select-none";

    el.textContent = heartIcons[Math.floor(Math.random() * heartIcons.length)];

    const randomX = originX + (Math.random() - 0.5) * 160;

    const randomY = originY + (Math.random() - 0.5) * 40;

    const duration = 1.2 + Math.random() * 0.8;

    el.style.left = `${randomX}px`;

    el.style.top = `${randomY}px`;

    el.style.fontSize = `${18 + Math.random() * 20}px`;

    el.style.animationDuration = `${duration}s`;

    document.body.appendChild(el);

    setTimeout(() => {
      el.remove();
    }, duration * 1000);
  }
});

// 2. KHU VỰC CÁ NHÂN HÓA (CUSTOM CARD BUILDER)

const inputRecipientName = document.getElementById("input-recipient-name");

const selectRecipientRole = document.getElementById("select-recipient-role");

const selectWishTone = document.getElementById("select-wish-tone");

const btnGenerateCustom = document.getElementById("btn-generate-custom");

const previewRecipientName = document.getElementById("preview-recipient-name");

const previewCustomBody = document.getElementById("preview-custom-body");

const btnCopyCustom = document.getElementById("btn-copy-custom");

const customTemplates = {
  mom: {
    sincere:
      "Nhân ngày 20/10, con chúc [TÊN] luôn dồi dào sức khỏe, tràn đầy niềm vui và an yên bên gia đình. Cảm ơn [TÊN] vì tất cả tình yêu thương và sự hy sinh bao la!",

    romantic:
      "Gửi đến [TÊN] ngàn đóa hồng thơm ngát và tình yêu lớn nhất trong tim con. Chúc [TÊN] ngày 20/10 thật hạnh phúc và bình yên!",

    joyful:
      "Chúc [TÊN] ngày 20/10 vui tươi phơi phới, cười nhiều trẻ mãi, mọi việc đã có chúng con lo hết rồi!",

    inspiring:
      "[TÊN] luôn là nguồn động lực và ngọn hải đăng soi sáng con đường con đi. Chúc [TÊN] một ngày 20/10 tràn đầy tự hào và hạnh phúc!",
  },

  lover: {
    sincere:
      "Chúc [TÊN] ngày 20/10 luôn an yên, hạnh phúc và cảm nhận được sự chân thành sâu sắc nhất từ anh mỗi phút giây.",

    romantic:
      "Chúc [TÊN] - người con gái anh yêu nhất một ngày 20/10 ngập tràn ngọt ngào. Cảm ơn em vì đã đến và biến mỗi ngày của anh thành một ngày lễ tình yêu!",

    joyful:
      "20/10 chúc [TÊN] ăn hoài không béo, shopping không cần nhìn giá và luôn có anh bên cạnh chiều chuộng hết mực!",

    inspiring:
      "Em vừa dịu dàng vừa kiên cường, anh vô cùng tự hào về [TÊN]. Hãy luôn tỏa sáng rực rỡ theo cách của em nhé!",
  },

  friend: {
    sincere:
      "Chúc [TÊN] ngày Phụ nữ Việt Nam luôn bình an, hạnh phúc và đạt được mọi mong ước chân thành trong tim.",

    romantic:
      "Gửi [TÊN] một chiếc ôm thật ấm và ngàn lời chúc ngọt ngào nhất trong ngày 20/10 này!",

    joyful:
      "Chúc [TÊN] 20/10 xinh đẹp không đối thủ, tiền vào như nước sông Đà và sớm dẫn người yêu ra mắt hội bạn!",

    inspiring:
      "Cảm ơn [TÊN] vì luôn là một người bạn tuyệt vời. Hãy luôn tự tin, mạnh mẽ và tỏa sáng rạng ngời nhé!",
  },

  colleague: {
    sincere:
      "Chúc [TÊN] ngày 20/10 thật nhiều niềm vui, luôn thuận lợi trong công việc và viên mãn trong cuộc sống.",

    romantic:
      "Chúc [TÊN] có một ngày 20/10 ngập tràn hoa thơm, quà đẹp và những khoảnh khắc ấm lòng.",

    joyful:
      "Chúc [TÊN] ngày 20/10 việc nhẹ lương cao, KPI về đích sớm và luôn giữ nụ cười tươi tắn rạng rỡ!",

    inspiring:
      "Chúc [TÊN] luôn giữ vững sự bản lĩnh, sắc sảo và gặt hái thêm nhiều thành công rực rỡ trong sự nghiệp!",
  },

  sister: {
    sincere:
      "Chúc [TÊN] có một ngày 20/10 ngập tràn tình yêu thương, luôn được che chở và đón nhận vạn điều may mắn.",

    romantic:
      "Gửi đến [TÊN] những điều ngọt ngào nhất. Chúc em/chị ngày 20/10 luôn xinh xắn như một đóa hoa chớm nở!",

    joyful:
      "Chúc [TÊN] 20/10 nhận quà mỏi tay, luôn nhí nhảnh yêu đời và ngày càng xinh đẹp rạng rỡ!",

    inspiring:
      "Hãy luôn tự tin theo đuổi ước mơ của mình nhé [TÊN], em/chị luôn là niềm tự hào của cả nhà!",
  },

  myself: {
    sincere:
      "Gửi [TÊN]: Cảm ơn vì đã luôn kiên cường bước qua mọi thử thách. Chúc chính tôi một ngày 20/10 thật dịu êm và hạnh phúc.",

    romantic:
      "Hôm nay hãy yêu thương bản thân nhiều hơn một chút nhé [TÊN]. Bạn xứng đáng nhận được tất cả những điều lãng mạn nhất trần đời!",

    joyful:
      "Chúc [TÊN] 20/10 vui hết mình, tự thưởng cho bản thân một ngày nghỉ ngơi thảnh thơi và một ly trà sữa ngọt ngào!",

    inspiring:
      "Tôi là phiên bản duy nhất và tuyệt vời nhất. Chúc [TÊN] luôn vững vàng, kiêu hãnh và nở rộ rực rỡ!",
  },
};

btnGenerateCustom.addEventListener("click", () => {
  const name = inputRecipientName.value.trim() || "Người Phụ Nữ Tuyệt Vời";

  const role = selectRecipientRole.value;

  const tone = selectWishTone.value;

  const template =
    (customTemplates[role] && customTemplates[role][tone]) ||
    "Chúc [TÊN] một ngày Phụ nữ Việt Nam 20/10 thật nhiều niềm vui, may mắn và hạnh phúc!";

  const finalizedWish = template.replaceAll("[TÊN]", name);

  previewRecipientName.textContent = name;

  previewCustomBody.textContent = `"${finalizedWish}"`;

  // Cuộn mượt nhẹ tới thẻ thiệp để người dùng thấy ngay

  document
    .getElementById("custom-preview-card")
    .scrollIntoView({ behavior: "smooth", block: "nearest" });

  showToast("Đã tạo lời chúc dành riêng thành công! ✨");
});

// Sao chép thiệp cá nhân hóa

btnCopyCustom.addEventListener("click", async () => {
  const recipient = previewRecipientName.textContent;

  const content = previewCustomBody.textContent;

  const messageToCopy = `💌 THIỆP MỪNG 20/10\nThân gửi: ${recipient}\n\n${content}\n\n-- Chúc mừng ngày Phụ Nữ Việt Nam 20/10 🌷 --`;

  try {
    await navigator.clipboard.writeText(messageToCopy);

    showToast("Đã sao chép nội dung thiệp cá nhân hóa! 💕");
  } catch (err) {
    showToast("Đã sao chép nội dung thiệp! 💕");
  }
});

// 3. HIỆU ỨNG CÁNH HOA & TRÁI TIM RƠI TỰ NHIÊN

const petalContainer = document.getElementById("petal-container");

const petalSymbols = ["🌸", "💮", "🌹", "💕", "✨", "🌷"];

function createFallingPetal() {
  if (document.hidden) return;

  const petal = document.createElement("div");

  petal.className = "petal-particle text-lg select-none";

  petal.textContent =
    petalSymbols[Math.floor(Math.random() * petalSymbols.length)];

  const startLeft = Math.random() * 100;

  const duration = 6 + Math.random() * 6;

  const size = 12 + Math.random() * 16;

  petal.style.left = `${startLeft}vw`;

  petal.style.fontSize = `${size}px`;

  petal.style.animationDuration = `${duration}s`;

  petal.style.opacity = (0.4 + Math.random() * 0.5).toFixed(2);

  petalContainer.appendChild(petal);

  setTimeout(() => {
    petal.remove();
  }, duration * 1000);
}

// Tạo cánh hoa định kỳ

setInterval(createFallingPetal, 900);

for (let i = 0; i < 5; i++) {
  createFallingPetal();
}

// 4. BACK TO TOP BUTTON LOGIC

const btnBackToTop = document.getElementById("btn-back-to-top");

window.addEventListener("scroll", () => {
  if (window.scrollY > 400) {
    btnBackToTop.classList.remove("opacity-0", "pointer-events-none");

    btnBackToTop.classList.add("opacity-100");
  } else {
    btnBackToTop.classList.remove("opacity-100");

    btnBackToTop.classList.add("opacity-0", "pointer-events-none");
  }
});

btnBackToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// 5. AUDIO TOGGLE SIMULATION

let isMusicPlaying = false;

const toggleMusicBtn = document.getElementById("toggle-bg-music");

const footerMusicBtn = document.getElementById("footer-music-link");

function toggleMusicAction() {
  isMusicPlaying = !isMusicPlaying;

  if (isMusicPlaying) {
    showToast("Đang phát: Giai điệu nhẹ nhàng ngày 20/10 🎵");
  } else {
    showToast("Đã tạm dừng nhạc nền ⏸️");
  }
}

toggleMusicBtn.addEventListener("click", toggleMusicAction);

if (footerMusicBtn) footerMusicBtn.addEventListener("click", toggleMusicAction);

// Khởi tạo: tải database từ Google Sheets rồi hiển thị lời chúc ngẫu nhiên.
wishDisplay.textContent = "Đang tải lời chúc từ Google Sheets...";
wishCounter.textContent = "Đang kết nối dữ liệu...";
loadWishesFromGoogleSheet()
  .then((total) => {
    renderWish("all");
    console.info(`Đã tải ${total} lời chúc từ Google Sheets.`);
  })
  .catch((error) => {
    console.error("Lỗi tải database Google Sheets:", error);
    wishDisplay.textContent =
      "Chưa tải được lời chúc. Hãy kiểm tra quyền chia sẻ Google Sheets và kết nối Internet rồi tải lại trang.";
    wishCounter.textContent = "Không thể kết nối database";
    showToast(
      "Không tải được dữ liệu Google Sheets. Vui lòng kiểm tra quyền chia sẻ.",
    );
  });
