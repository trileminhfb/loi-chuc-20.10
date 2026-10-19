const GOOGLE_SHEET_ID = "1tNzKwp3BBHPONpLzUOi-_1LpHdjJa0LxTmNJ4SgXWFg";
const WISHES_SHEET_NAME = "Loi_chuc";
const CUSTOM_TEMPLATES_SHEET_NAME = "Tao_loi_chuc";
const getGoogleSheetCsvUrl = (sheetName) =>
  `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
const customTemplateRows = [];
let customTemplatesLoaded = false;
const wishesDatabase = { all: [] };
function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "");
}
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
async function loadSheetRows(sheetName) {
  const response = await fetch(getGoogleSheetCsvUrl(sheetName), {
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(
      `Không thể tải sheet ${sheetName} (HTTP ${response.status})`,
    );
  const csvText = await response.text();
  if (/^\s*<!doctype html|^\s*<html/i.test(csvText))
    throw new Error(
      `Sheet ${sheetName} chưa được chia sẻ công khai hoặc chưa cho phép xem dữ liệu.`,
    );
  const rows = parseCSV(csvText);
  if (rows.length < 2) throw new Error(`Sheet ${sheetName} chưa có dữ liệu.`);
  return {
    rows,
    headers: rows[0].map(normalizeHeader),
  };
}
function findColumn(headers, ...names) {
  return headers.findIndex((header) => names.includes(header));
}
function isActiveSheetValue(value) {
  return !["0", "false", "inactive", "hidden", "an", "ngung", "khong"].includes(
    String(value ?? "1")
      .trim()
      .toLowerCase(),
  );
}
async function loadWishesFromGoogleSheet() {
  const { rows, headers } = await loadSheetRows(WISHES_SHEET_NAME);
  const idIndex = findColumn(headers, "id");
  const contentIndex = findColumn(
    headers,
    "noidungloichuc",
    "noidung",
    "loichuc",
    "wish",
    "content",
    "message",
  );
  const statusIndex = findColumn(headers, "trangthai", "status", "active");
  if (idIndex < 0 || contentIndex < 0 || statusIndex < 0)
    throw new Error(
      `Sheet ${WISHES_SHEET_NAME} cần có các cột ID, Noi_dung_loi_chuc và Trang_thai.`,
    );
  wishesDatabase.all = rows
    .slice(1)
    .filter((row) => isActiveSheetValue(row[statusIndex]))
    .map((row) => String(row[contentIndex] || "").trim())
    .filter(Boolean);
  if (!wishesDatabase.all.length)
    throw new Error(
      `Không có lời chúc đang hoạt động trong sheet ${WISHES_SHEET_NAME}.`,
    );
  return wishesDatabase.all.length;
}
async function loadCustomTemplatesFromGoogleSheet() {
  const { rows, headers } = await loadSheetRows(CUSTOM_TEMPLATES_SHEET_NAME);
  const categoryIndex = findColumn(headers, "danhmuc");
  const recipientIndex = findColumn(headers, "doituong");
  const styleIndex = findColumn(headers, "phongcach");
  const templateContentIndex = findColumn(headers, "maunoidung");
  const closingIndex = findColumn(headers, "cauket");
  const variablesIndex = findColumn(headers, "biencanthay");
  const statusIndex = findColumn(headers, "trangthai");
  if (
    categoryIndex < 0 ||
    recipientIndex < 0 ||
    styleIndex < 0 ||
    templateContentIndex < 0 ||
    closingIndex < 0 ||
    variablesIndex < 0 ||
    statusIndex < 0
  )
    throw new Error(
      `Sheet ${CUSTOM_TEMPLATES_SHEET_NAME} cần có các cột Danh_muc, Doi_tuong, Phong_cach, Mau_noi_dung, Cau_ket, Bien_can_thay và Trang_thai.`,
    );
  customTemplateRows.length = 0;
  rows.slice(1).forEach((row) => {
    const template = String(row[templateContentIndex] || "").trim();
    const recipient = String(row[recipientIndex] || "").trim();
    const style = String(row[styleIndex] || "").trim();
    if (
      !isActiveSheetValue(row[statusIndex]) ||
      !template ||
      !recipient ||
      !style
    )
      return;
    customTemplateRows.push({
      category: String(row[categoryIndex] || "").trim(),
      recipient,
      style,
      template,
      closing: String(row[closingIndex] || "").trim(),
      variables: String(row[variablesIndex] || "").trim(),
    });
  });
  customTemplatesLoaded = customTemplateRows.length > 0;
  if (!customTemplatesLoaded)
    throw new Error(
      `Sheet ${CUSTOM_TEMPLATES_SHEET_NAME} chưa có mẫu đang hoạt động.`,
    );
  setupCustomBuilderFromSheet();
  return customTemplateRows.length;
}
let previousIndex = -1;
let heartCount = 780;
const wishDisplay = document.getElementById("wish-display");
const wishRevealOverlay = document.getElementById("wish-reveal-overlay");
const btnRevealWish = document.getElementById("btn-reveal-wish");
const wishActions = document.getElementById("wish-actions");
const btnNextWish = document.getElementById("btn-next-wish");
const btnCopyWish = document.getElementById("btn-copy-wish");
const btnPreviewWish = document.getElementById("btn-preview-wish");
const btnHeartBurst = document.getElementById("btn-heart-burst");
const heartBadge = document.getElementById("heart-count-badge");
const refreshIcon = document.getElementById("refresh-icon");
const toast = document.getElementById("toast-notification");
const toastMsg = document.getElementById("toast-message");
function getRandomWish() {
  const list = wishesDatabase.all;
  if (!list.length) return "";
  if (list.length === 1) return list[0];
  let nextIndex;
  do {
    nextIndex = Math.floor(Math.random() * list.length);
  } while (nextIndex === previousIndex);
  previousIndex = nextIndex;
  return list[nextIndex];
}
function renderWish() {
  const text = getRandomWish();
  if (!text) {
    wishDisplay.textContent = "Đang tải...";
    return;
  }
  wishDisplay.classList.add("opacity-0", "scale-95");
  refreshIcon.classList.add("rotate-180");
  setTimeout(() => {
    wishDisplay.textContent = `"${text}"`;
    wishDisplay.classList.remove("opacity-0", "scale-95");
    refreshIcon.classList.remove("rotate-180");
    if (!wishHasBeenRevealed) {
      wishDisplay.classList.add("wish-content-hidden");
      wishDisplay.setAttribute("aria-hidden", "true");
      wishRevealOverlay.hidden = false;
    }
  }, 200);
}
btnRevealWish.addEventListener("click", () => {
  wishHasBeenRevealed = true;
  wishDisplay.classList.remove("wish-content-hidden");
  wishDisplay.setAttribute("aria-hidden", "false");
  wishRevealOverlay.hidden = true;
  wishActions.hidden = false;
  wishActions.setAttribute("aria-hidden", "false");
  if (backgroundMusic.paused) startBackgroundMusic(true);
});
btnNextWish.addEventListener("click", () => {
  renderWish();
});
function showToast(message) {
  toastMsg.textContent = message;
  toast.classList.remove("opacity-0", "-translate-y-4");
  toast.classList.add("opacity-100", "translate-y-0");
  setTimeout(() => {
    toast.classList.remove("opacity-100", "translate-y-0");
    toast.classList.add("opacity-0", "-translate-y-4");
  }, 2500);
}
btnCopyWish.addEventListener("click", async () => {
  const text = wishDisplay.textContent;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Đã sao chép lời chúc yêu thương! 💕");
  } catch (err) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    showToast("Đã sao chép lời chúc yêu thương! 💕");
  }
});
btnHeartBurst.addEventListener("click", () => {
  heartCount++;
  heartBadge.textContent = heartCount;
  const heartIcons = ["💖", "💕", "💗", "🌸", "✨", "🌷", "💝"];
  for (let i = 0; i < 24; i++) {
    const el = document.createElement("div");
    el.className = "burst-heart text-2xl select-none";
    el.textContent = heartIcons[Math.floor(Math.random() * heartIcons.length)];
    const duration = 2.2 + Math.random() * 1.4;
    el.style.left = `${Math.random() * 100}vw`;
    el.style.bottom = "-40px";
    el.style.fontSize = `${18 + Math.random() * 20}px`;
    el.style.animationDuration = `${duration}s`;
    document.body.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, duration * 1000);
  }
});
const inputRecipientName = document.getElementById("input-recipient-name");
const selectRecipientCategory = document.getElementById(
  "select-recipient-category",
);
const selectRecipientObject = document.getElementById(
  "select-recipient-object",
);
const selectWishTone = document.getElementById("select-wish-tone");
const btnGenerateCustom = document.getElementById("btn-generate-custom");
const previewRecipientName = document.getElementById("preview-recipient-name");
const previewCustomBody = document.getElementById("preview-custom-body");
const btnCopyCustom = document.getElementById("btn-copy-custom");
const btnDownloadCustom = document.getElementById("btn-download-custom");
const cardPreviewModal = document.getElementById("card-preview-modal");
const modalContainer = document.getElementById("modal-container");
const modalCardFrame = document.getElementById("card-render-frame");
const modalDownloadButton = document.getElementById(
  "btn-modal-confirm-download",
);
let lastCustomMessage = "";
let modalReturnFocus = null;
let wishHasBeenRevealed = false;
function uniqueNonEmpty(values) {
  return [
    ...new Set(values.map((v) => String(v || "").trim()).filter(Boolean)),
  ];
}
function fillSelect(select, values, placeholder) {
  select.innerHTML = "";
  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder;
  select.appendChild(first);
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  select.disabled = values.length === 0;
}
function setupCustomBuilderFromSheet() {
  if (!customTemplateRows.length) return;
  fillSelect(
    selectRecipientCategory,
    uniqueNonEmpty(customTemplateRows.map((row) => row.category)),
    "Chọn danh mục",
  );
  fillSelect(
    selectWishTone,
    uniqueNonEmpty(customTemplateRows.map((row) => row.style)),
    "Chọn phong cách lời chúc",
  );
  updateRecipientObjects();
}
function updateRecipientObjects() {
  const category = selectRecipientCategory.value;
  fillSelect(
    selectRecipientObject,
    uniqueNonEmpty(
      customTemplateRows
        .filter((row) => row.category === category)
        .map((row) => row.recipient),
    ),
    category ? "Chọn đối tượng thân thiết" : "Chọn danh mục trước",
  );
}
selectRecipientCategory.addEventListener("change", updateRecipientObjects);
function replaceTemplateVariables(text, name, recipient, category) {
  return String(text || "")
    .replace(
      /\{\s*([^}]+)\s*\}|\[\s*([^\]]+)\s*\]/g,
      (whole, curly, square) => {
        const key = normalizeHeader(curly || square || "");
        if (
          [
            "ten",
            "name",
            "tennguoinhan",
            "tennguoigui",
            "recipientname",
            "nguoinhan",
          ].includes(key)
        )
          return name;
        if (["doituong", "recipient", "moiquanhe"].includes(key))
          return recipient;
        if (["danhmuc", "category"].includes(key)) return category;
        return name;
      },
    )
    .replace(/\[TÊN\]|\[TEN\]|\{TEN\}|\{TÊN\}/gi, name);
}
function getSelectedCustomTemplate() {
  const category = selectRecipientCategory.value,
    recipient = selectRecipientObject.value,
    style = selectWishTone.value;
  const candidates = customTemplateRows.filter(
    (row) =>
      row.category === category &&
      row.recipient === recipient &&
      row.style === style,
  );
  if (candidates.length)
    return candidates[Math.floor(Math.random() * candidates.length)];
  const nearby = customTemplateRows.filter(
    (row) => row.category === category && row.recipient === recipient,
  );
  return nearby.length
    ? nearby[Math.floor(Math.random() * nearby.length)]
    : null;
}
btnGenerateCustom.addEventListener("click", () => {
  if (!customTemplatesLoaded) {
    showToast(
      "Chưa tải được mẫu từ sheet Tao_loi_chuc. Kiểm tra tên tab, các cột và quyền chia sẻ nhé.",
    );
    return;
  }
  const name = inputRecipientName.value.trim() || "Người Phụ Nữ Tuyệt Vời";
  const category = selectRecipientCategory.value,
    recipient = selectRecipientObject.value,
    style = selectWishTone.value;
  if (!category || !recipient || !style) {
    showToast("Vui lòng chọn danh mục, đối tượng và phong cách lời chúc nhé.");
    return;
  }
  const template = getSelectedCustomTemplate();
  if (!template) {
    showToast("Chưa có mẫu phù hợp trong danh mục này.");
    return;
  }
  let finalizedWish = replaceTemplateVariables(
    template.template,
    name,
    recipient,
    category,
  );
  const closing = replaceTemplateVariables(
    template.closing,
    name,
    recipient,
    category,
  );
  if (closing && !finalizedWish.includes(closing))
    finalizedWish = `${finalizedWish.trim()} ${closing}`.trim();
  previewRecipientName.textContent = name;
  previewCustomBody.textContent = `“${finalizedWish}”`;
  lastCustomMessage = `💌 THIỆP MỪNG 20/10\nThân gửi: ${name}\nDanh mục: ${category}\nĐối tượng: ${recipient}\nPhong cách: ${style}\n\n${finalizedWish}\n\n-- Chúc mừng ngày Phụ nữ Việt Nam 20/10 🌷 --`;
  document
    .getElementById("custom-preview-card")
    .scrollIntoView({ behavior: "smooth", block: "nearest" });
  showToast("Đã tạo thiệp từ mẫu thành công! ✨");
});
btnCopyCustom.addEventListener("click", async () => {
  const recipient = previewRecipientName.textContent.trim(),
    content = previewCustomBody.textContent.trim();
  const messageToCopy =
    lastCustomMessage ||
    `💌 THIỆP MỪNG 20/10\nThân gửi: ${recipient}\n\n${content}\n\n-- Chúc mừng ngày Phụ nữ Việt Nam 20/10 🌷 --`;
  try {
    await navigator.clipboard.writeText(messageToCopy);
    showToast("Đã sao chép nội dung thiệp! 💕");
  } catch (err) {
    const textarea = document.createElement("textarea");
    textarea.value = messageToCopy;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    showToast("Đã sao chép nội dung thiệp! 💕");
  }
});
function openCardPreview(
  recipient = previewRecipientName.textContent.trim(),
  message = previewCustomBody.textContent,
) {
  modalReturnFocus = document.activeElement;
  const quote = message.trim().replace(/^[“"]|[”"]$/g, "");
  document.getElementById("modal-card-recipient").textContent =
    `Thân gửi ${recipient}`;
  document.getElementById("modal-card-quote").textContent = quote;
  cardPreviewModal.classList.add("is-open");
  cardPreviewModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  modalContainer.focus();
}

function closeCardPreview() {
  cardPreviewModal.classList.remove("is-open");
  cardPreviewModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (modalReturnFocus instanceof HTMLElement)
    modalReturnFocus.focus({ preventScroll: true });
}

btnPreviewWish.addEventListener("click", () => {
  openCardPreview("Mọi người", wishDisplay.textContent);
});
btnDownloadCustom.addEventListener("click", () => openCardPreview());
document
  .getElementById("btn-close-modal")
  .addEventListener("click", closeCardPreview);
cardPreviewModal.addEventListener("click", (event) => {
  if (event.target === cardPreviewModal) closeCardPreview();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && cardPreviewModal.classList.contains("is-open"))
    closeCardPreview();
});

async function createCardPreviewCanvas() {
  if (typeof html2canvas !== "function")
    throw new Error("Không tải được công cụ xuất ảnh.");
  const card = modalCardFrame;
  await Promise.all([
    document.fonts.load('700 32px "Quicksand"'),
    document.fonts.load('400 16px "Be Vietnam Pro"'),
    document.fonts.load('400 16px "Material Symbols Outlined"'),
  ]);
  await document.fonts.ready;
  return html2canvas(card, {
    scale: 3,
    backgroundColor: "#fff8fb",
    useCORS: true,
    allowTaint: false,
    logging: false,
    onclone: async (clonedDocument) => {
      const clonedCard = clonedDocument.getElementById("card-render-frame");
      clonedCard.classList.add("export-render-mode");
      clonedCard.style.transform = "none";
      clonedCard.style.animation = "none";
      clonedCard.style.transition = "none";
      const title = clonedDocument.getElementById("modal-card-title");
      title.style.fontFamily = '"Quicksand", sans-serif';
      const quote = clonedDocument.getElementById("modal-card-quote");
      quote.style.fontFamily = '"Be Vietnam Pro", sans-serif';
      quote.style.fontStyle = "italic";
      const recipient = clonedDocument.getElementById("modal-card-recipient");
      recipient.style.fontFamily = '"Be Vietnam Pro", sans-serif';
      recipient.style.lineHeight = "1.5";
      recipient.style.height = "auto";
      recipient.style.minHeight = "0";
      recipient.style.whiteSpace = "normal";
      clonedCard.querySelectorAll("*").forEach((element) => {
        element.style.animation = "none";
        element.style.transition = "none";
      });
      await clonedDocument.fonts.load('700 32px "Quicksand"');
      await clonedDocument.fonts.load('400 16px "Be Vietnam Pro"');
      await clonedDocument.fonts.ready;
    },
  });
}

async function downloadCardImage() {
  modalDownloadButton.disabled = true;
  const originalText = modalDownloadButton.innerText;
  modalDownloadButton.innerText = "Đang tạo PNG...";
  try {
    const canvas = await createCardPreviewCanvas();
    const imageBlob = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Không thể tạo tệp PNG."));
      }, "image/png");
    });
    const safeName = (previewRecipientName.textContent || "thiep-2010")
      .trim()
      .replace(/[^\p{L}\p{N}-]+/gu, "-");
    const link = document.createElement("a");
    link.download = `thiep-20-10-${safeName || "yeu-thuong"}.png`;
    link.href = URL.createObjectURL(imageBlob);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    showToast("Đã tải thiệp PNG về thiết bị! 🌸");
  } catch (error) {
    console.error("Không thể xuất thiệp:", error);
    showToast("Chưa thể xuất PNG. Hãy kiểm tra kết nối và thử lại.");
  } finally {
    modalDownloadButton.disabled = false;
    modalDownloadButton.innerText = originalText;
  }
}

modalDownloadButton.addEventListener("click", downloadCardImage);
const petalContainer = document.getElementById("floating-sticker-container");
const petalSymbols = ["🌸", "🎀", "💗", "🦋"];
const flowerStickerUrl =
  "https://marketplace.canva.com/VEx7M/MAG6-jVEx7M/1/tl/canva-pink-blossom_-cute-floral-sticker-icon-MAG6-jVEx7M.png";
function createFallingPetal() {
  if (document.hidden) return;
  const petal = document.createElement("div");
  petal.className = "petal-particle text-lg select-none";
  const useFlowerImage = Math.random() < 0.35;
  const startLeft = Math.random() * 100;
  const duration = 9 + Math.random() * 8;
  const size = 15 + Math.random() * 15;
  if (useFlowerImage) {
    const img = document.createElement("img");
    img.src = flowerStickerUrl;
    img.alt = "";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.className = "floating-sticker-image";
    img.style.width = `${size + 6}px`;
    img.style.height = `${size + 6}px`;
    petal.appendChild(img);
  } else {
    petal.textContent =
      petalSymbols[Math.floor(Math.random() * petalSymbols.length)];
  }
  petal.style.left = `${startLeft}vw`;
  petal.style.fontSize = `${size}px`;
  petal.style.animationDuration = `${duration}s`;
  petal.style.opacity = (0.28 + Math.random() * 0.42).toFixed(2);
  petalContainer.appendChild(petal);
  setTimeout(() => {
    petal.remove();
  }, duration * 1000);
}
setInterval(createFallingPetal, 1500);
for (let i = 0; i < 3; i++) {
  createFallingPetal();
}
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
const toggleMusicBtn = document.getElementById("toggle-bg-music");
const footerMusicBtn = document.getElementById("footer-music-link");
const backgroundMusic = document.getElementById("background-music");

document.body.classList.add("page-enter");
requestAnimationFrame(() => document.body.classList.add("page-ready"));

const scrollRevealTargets = document.querySelectorAll(
  "main > section, main > section > div, footer",
);
if ("IntersectionObserver" in window) {
  const scrollRevealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
  );
  scrollRevealTargets.forEach((element) => {
    element.classList.add("scroll-reveal");
    scrollRevealObserver.observe(element);
  });
} else {
  scrollRevealTargets.forEach((element) => {
    element.classList.add("scroll-reveal", "is-visible");
  });
}

function updateMusicControls(isPlaying) {
  [toggleMusicBtn, footerMusicBtn].filter(Boolean).forEach((button) => {
    button.setAttribute("aria-pressed", String(isPlaying));
    button.setAttribute(
      "aria-label",
      isPlaying ? "Tắt nhạc nền" : "Bật nhạc nền",
    );
    button.title = isPlaying ? "Tắt nhạc nền" : "Bật nhạc nền";
    const icon = button.querySelector(".material-symbols-outlined");
    if (icon) {
      icon.classList.toggle("animate-spin", isPlaying);
      icon.textContent = isPlaying ? "music_note" : "music_off";
    }
    const indicator = button.querySelector("[data-music-indicator]");
    if (indicator) indicator.classList.toggle("hidden", !isPlaying);
  });
}

async function startBackgroundMusic(showBlockedNotice = false) {
  try {
    await backgroundMusic.play();
  } catch (error) {
    updateMusicControls(false);
    if (error.name === "NotAllowedError") {
      if (showBlockedNotice)
        showToast("Trình duyệt chặn tự phát. Nhấn nút nhạc để bật nhé.");
      else
        console.info(
          "Tự phát nhạc bị trình duyệt chặn; cần thao tác bật từ người dùng.",
        );
      return;
    }
    console.error("Không thể phát nhạc nền:", error);
    showToast("Không phát được nhạc nền. Hãy kiểm tra tệp theme music.mp3.");
  }
}

async function toggleMusicAction() {
  if (backgroundMusic.paused) {
    await startBackgroundMusic(true);
    if (!backgroundMusic.paused) showToast("Đang phát nhạc nền 🎵");
    return;
  }
  backgroundMusic.pause();
  showToast("Đã tắt nhạc nền ⏸️");
}

backgroundMusic.addEventListener("play", () => updateMusicControls(true));
backgroundMusic.addEventListener("pause", () => updateMusicControls(false));
backgroundMusic.addEventListener("error", () => {
  console.error("Không thể tải tệp nhạc nền:", backgroundMusic.currentSrc);
  showToast("Không tìm thấy tệp access/theme music.mp3.");
});
toggleMusicBtn.addEventListener("click", toggleMusicAction);
if (footerMusicBtn) footerMusicBtn.addEventListener("click", toggleMusicAction);
updateMusicControls(false);
startBackgroundMusic();
wishDisplay.textContent = "Đang tải...";
Promise.allSettled([
  loadWishesFromGoogleSheet(),
  loadCustomTemplatesFromGoogleSheet(),
]).then(([wishesResult, templatesResult]) => {
  if (wishesResult.status === "fulfilled") {
    renderWish();
    console.info(
      `Đã tải ${wishesResult.value} lời chúc từ sheet ${WISHES_SHEET_NAME}.`,
    );
  } else {
    console.error(`Lỗi tải sheet ${WISHES_SHEET_NAME}:`, wishesResult.reason);
    wishDisplay.textContent =
      "Chưa tải được lời chúc. Hãy kiểm tra sheet Loi_chuc, quyền chia sẻ và kết nối Internet rồi tải lại trang.";
    showToast(
      "Không tải được sheet Loi_chuc. Vui lòng kiểm tra tên tab và quyền chia sẻ.",
    );
  }
  if (templatesResult.status === "fulfilled") {
    console.info(
      `Đã tải ${templatesResult.value} mẫu từ sheet ${CUSTOM_TEMPLATES_SHEET_NAME}.`,
    );
  } else {
    console.error(
      `Lỗi tải sheet ${CUSTOM_TEMPLATES_SHEET_NAME}:`,
      templatesResult.reason,
    );
    fillSelect(selectRecipientCategory, [], "Lỗi");
    fillSelect(selectRecipientObject, [], "Không tải được đối tượng");
    fillSelect(selectWishTone, [], "Lỗi");
    const templateError =
      templatesResult.reason instanceof Error
        ? templatesResult.reason.message
        : String(templatesResult.reason);
    showToast(`Lỗi: ${templateError}`);
  }
});
