// Wires a form's file input to a live thumbnail preview and keeps the compressed
// data URLs ready for submission. Used by both the resident and chief forms.

import { filesToDataUrls } from "./images.js";

export function attachImageInput(form) {
  const input = form.querySelector("[data-image-input]");
  const preview = form.querySelector("[data-image-preview]");
  let dataUrls = [];

  function render() {
    preview.innerHTML = dataUrls
      .map((url, i) => `<div class="image-preview__item"><img src="${url}" alt="預覽 ${i + 1}" /></div>`)
      .join("");
  }

  if (input) {
    input.addEventListener("change", async () => {
      preview.innerHTML = `<span class="image-preview__loading">圖片處理中…</span>`;
      try {
        dataUrls = await filesToDataUrls(input.files);
      } catch {
        dataUrls = [];
      }
      render();
    });
  }

  return {
    get: () => dataUrls,
    reset: () => {
      dataUrls = [];
      if (input) input.value = "";
      preview.innerHTML = "";
    },
  };
}
