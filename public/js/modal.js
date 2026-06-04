// Lightweight promise-based modal dialogs (replaces native prompt/confirm/alert
// for a more professional look). All text is provided by the caller.

// Show a modal. Returns a Promise:
//   - input modals  -> resolves to the entered string, or null if cancelled
//   - non-input     -> resolves to true (confirm) or false (cancel)
function showModal({
  title = "",
  message = "",
  code = null,
  input = false,
  inputType = "text",
  placeholder = "",
  maxlength = null,
  inputMode = null,
  confirmText = "確認",
  cancelText = "取消",
  showCancel = true,
}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const codeHtml = code != null ? `<div class="modal__code">${code}</div>` : "";
    const inputHtml = input
      ? `<input class="modal__input" type="${inputType}"
              placeholder="${placeholder}"
              ${maxlength ? `maxlength="${maxlength}"` : ""}
              ${inputMode ? `inputmode="${inputMode}"` : ""} />`
      : "";
    const cancelHtml = showCancel
      ? `<button class="btn btn--ghost modal__cancel">${cancelText}</button>`
      : "";

    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3 class="modal__title">${title}</h3>
        ${message ? `<p class="modal__message">${message}</p>` : ""}
        ${codeHtml}
        ${inputHtml}
        <div class="modal__actions">
          ${cancelHtml}
          <button class="btn btn--primary modal__confirm">${confirmText}</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const inputEl = overlay.querySelector(".modal__input");
    const close = (result) => {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
      resolve(result);
    };
    const onConfirm = () => close(input ? (inputEl ? inputEl.value.trim() : "") : true);
    const onCancel = () => close(input ? null : false);
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter" && input) onConfirm();
    };

    overlay.querySelector(".modal__confirm").addEventListener("click", onConfirm);
    overlay.querySelector(".modal__cancel")?.addEventListener("click", onCancel);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) onCancel();
    });
    document.addEventListener("keydown", onKey);

    if (inputEl) inputEl.focus();
    else overlay.querySelector(".modal__confirm").focus();
  });
}

export const askInput = (opts) => showModal({ ...opts, input: true });
export const confirmBox = (opts) => showModal({ ...opts, input: false });
export const alertBox = (opts) =>
  showModal({ ...opts, input: false, showCancel: false });
