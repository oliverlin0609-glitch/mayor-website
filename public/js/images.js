// Client-side image handling: reads selected files, downsizes/compresses them
// in the browser, and returns data URLs. Keeping images small lets us store
// them directly with the report without a separate upload pipeline.

const MAX_IMAGES = 4;
const MAX_DIMENSION = 1200; // px, longest edge
const JPEG_QUALITY = 0.7;

// Compress a single image File into a JPEG data URL.
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("圖片讀取失敗。"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("圖片格式無法辨識。"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Convert a FileList/array of files into compressed data URLs (max 4 images).
export async function filesToDataUrls(files) {
  const list = Array.from(files || [])
    .filter((f) => f.type.startsWith("image/"))
    .slice(0, MAX_IMAGES);
  return Promise.all(list.map(compressImage));
}

export { MAX_IMAGES };
