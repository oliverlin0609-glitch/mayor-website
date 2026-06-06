// Entry point: page routing (Home / Report / Chief), the chief password gate,
// the home page feed (featured chief carousel on top, resident reports below),
// and the resident report form with image upload and code-based deletion.

import { initChiefDashboard } from "./chief.js";
import { STATUS_LABELS, formatDate, escapeHtml } from "./config.js";
import { fetchReports, createReport, deleteReport, chiefAuth } from "./api.js";
import { askInput, alertBox } from "./modal.js";
import { attachImageInput } from "./formImages.js";

const views = {
  home: document.getElementById("view-home"),
  report: document.getElementById("view-report"),
  chief: document.getElementById("view-chief"),
};
const switchButtons = document.querySelectorAll(".view-switch__btn");
let chiefInitialized = false;

// Render a row of image thumbnails for a report.
function imagesHtml(images) {
  if (!images || !images.length) return "";
  return `<div class="report-images">${images
    .map((url) => `<img class="report-images__img" src="${url}" alt="通報照片" />`)
    .join("")}</div>`;
}

// ---------------------------------------------------------------------------
// Chief access gate
// ---------------------------------------------------------------------------
async function ensureChiefAccess() {
  if (sessionStorage.getItem("chiefAuthed") === "yes") return true;

  const password = await askInput({
    title: "里長模式",
    message: "請輸入里長密碼以進入管理後台。",
    inputType: "password",
    placeholder: "密碼",
    confirmText: "進入",
  });
  if (password == null) return false;

  if (await chiefAuth(password)) {
    sessionStorage.setItem("chiefAuthed", "yes");
    sessionStorage.setItem("chiefPassword", password);
    return true;
  }
  await alertBox({ title: "密碼錯誤", message: "里長密碼不正確，無法進入管理後台。" });
  return false;
}

// ---------------------------------------------------------------------------
// View switching
// ---------------------------------------------------------------------------
async function showView(name) {
  if (!views[name]) name = "home";

  if (name === "chief" && !(await ensureChiefAccess())) {
    name = "home";
  }

  for (const [key, el] of Object.entries(views)) {
    el.hidden = key !== name;
  }
  switchButtons.forEach((btn) =>
    btn.classList.toggle("is-active", btn.dataset.view === name)
  );

  if (location.hash !== `#${name}`) {
    history.replaceState(null, "", `#${name}`);
  }

  if (name === "chief") {
    chiefInitialized
      ? initChiefDashboard.refresh()
      : (initChiefDashboard(), (chiefInitialized = true));
  }
  if (name === "home") loadHomeFeed();

  window.scrollTo({ top: 0 });
}

switchButtons.forEach((btn) =>
  btn.addEventListener("click", () => showView(btn.dataset.view))
);
// Any element with [data-nav] navigates to that view (e.g. the hero button).
document.querySelectorAll("[data-nav]").forEach((el) =>
  el.addEventListener("click", () => showView(el.dataset.nav))
);
window.addEventListener("hashchange", () => showView(location.hash.slice(1)));

// ---------------------------------------------------------------------------
// Featured chief announcements (carousel)
// ---------------------------------------------------------------------------
const featuredSection = document.getElementById("featured-section");
const featuredTrack = document.getElementById("featured-track");
const featuredDots = document.getElementById("featured-dots");
let featuredPosts = [];
let featuredIndex = 0;

function featuredSlideHtml(p) {
  return `
    <article class="featured-card">
      <div class="featured-card__head">
        <span class="featured-card__badge">里長公告</span>
        <span class="badge badge--${p.status}">${STATUS_LABELS[p.status]}</span>
      </div>
      <h3 class="featured-card__loc">${escapeHtml(p.location)}</h3>
      <div class="featured-card__meta">${escapeHtml(p.category)}　·　${formatDate(p.createdAt)}</div>
      <p class="featured-card__desc">${escapeHtml(p.description)}</p>
      ${imagesHtml(p.images)}
    </article>`;
}

function renderFeatured(posts) {
  featuredPosts = posts;
  featuredIndex = 0;

  if (!posts.length) {
    featuredSection.hidden = true;
    return;
  }
  featuredSection.hidden = false;
  featuredTrack.innerHTML = posts.map(featuredSlideHtml).join("");

  const single = posts.length <= 1;
  document.getElementById("featured-prev").style.display = single ? "none" : "";
  document.getElementById("featured-next").style.display = single ? "none" : "";
  featuredDots.innerHTML = single
    ? ""
    : posts.map((_, i) => `<button class="carousel__dot" data-i="${i}" aria-label="第 ${i + 1} 則"></button>`).join("");
  featuredDots.querySelectorAll(".carousel__dot").forEach((dot) =>
    dot.addEventListener("click", () => {
      featuredIndex = Number(dot.dataset.i);
      updateCarousel();
    })
  );
  updateCarousel();
}

function updateCarousel() {
  featuredTrack.style.transform = `translateX(-${featuredIndex * 100}%)`;
  featuredDots.querySelectorAll(".carousel__dot").forEach((dot, i) =>
    dot.classList.toggle("is-active", i === featuredIndex)
  );
}

function moveCarousel(delta) {
  if (featuredPosts.length < 2) return;
  featuredIndex = (featuredIndex + delta + featuredPosts.length) % featuredPosts.length;
  updateCarousel();
}

document.getElementById("featured-prev").addEventListener("click", () => moveCarousel(-1));
document.getElementById("featured-next").addEventListener("click", () => moveCarousel(1));

// ---------------------------------------------------------------------------
// Home feed: chief posts featured on top, resident posts at the bottom
// ---------------------------------------------------------------------------
const residentFeed = document.getElementById("resident-feed");
const FEED_LIMIT = 30;

async function loadHomeFeed() {
  try {
    const all = await fetchReports();
    renderFeatured(all.filter((r) => r.isChief));

    const residentReports = all.filter((r) => !r.isChief).slice(0, FEED_LIMIT);
    if (!residentReports.length) {
      residentFeed.innerHTML = `<p class="resident-feed__empty">目前尚無里民通報紀錄。</p>`;
      return;
    }

    residentFeed.innerHTML = residentReports
      .map(
        (r) => `
        <article class="rfeed-item">
          <div class="rfeed-item__head">
            <span class="rfeed-item__loc">${escapeHtml(r.location)}</span>
            <span class="badge badge--${r.status}">${STATUS_LABELS[r.status]}</span>
          </div>
          <div class="rfeed-item__meta">${escapeHtml(r.category)}　·　${formatDate(r.createdAt)}</div>
          <p class="rfeed-item__desc">${escapeHtml(r.description)}</p>
          ${imagesHtml(r.images)}
          <div class="rfeed-item__foot">
            <button class="btn-del" data-id="${r.id}">刪除</button>
          </div>
        </article>`
      )
      .join("");

    residentFeed.querySelectorAll(".btn-del").forEach((btn) =>
      btn.addEventListener("click", () => deleteAsResident(btn.dataset.id))
    );
  } catch {
    residentFeed.innerHTML = `<p class="resident-feed__empty">通報資料載入失敗，請稍後再試。</p>`;
  }
}

async function deleteAsResident(id) {
  const code = await askInput({
    title: "刪除通報",
    message: "請輸入此通報的三位數刪除碼。只有發布者知道這組號碼。",
    placeholder: "例如：342",
    maxlength: 3,
    inputMode: "numeric",
    confirmText: "刪除",
  });
  if (code == null) return;

  try {
    await deleteReport(id, { code });
    await loadHomeFeed();
  } catch (err) {
    await alertBox({ title: "刪除失敗", message: err.message });
  }
}

// ---------------------------------------------------------------------------
// Resident report form
// ---------------------------------------------------------------------------
const form = document.getElementById("report-form");
const formMsg = document.getElementById("report-msg");
const formImages = attachImageInput(form);

const submitBtn = form.querySelector('button[type="submit"]');
const submitBtnDefaultText = submitBtn ? submitBtn.textContent : "";
let submitting = false;

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submitting) return; // guard against double-clicks while in flight
  submitting = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "送出中…";
  }
  formMsg.textContent = "";
  formMsg.className = "form-msg";

  const data = Object.fromEntries(new FormData(form).entries());
  delete data.images; // file input value isn't used; send compressed data URLs
  data.images = formImages.get();

  try {
    const report = await createReport(data);
    form.reset();
    formImages.reset();

    await alertBox({
      title: "通報成功",
      message: "請記下您的刪除碼，日後刪除此通報時必須輸入：",
      code: report.deleteCode,
      confirmText: "我已記下",
    });

    showView("home"); // jump to the feed so the resident sees their post
  } catch (err) {
    formMsg.textContent = err.message;
    formMsg.classList.add("is-error");
  } finally {
    submitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtnDefaultText;
    }
  }
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
showView(location.hash.slice(1) || "home");
