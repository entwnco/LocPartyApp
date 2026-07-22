// Resize an uploaded image client-side before it ever leaves the phone —
// keeps uploads fast on party wifi. fileToResizedBlob() is what actually
// gets uploaded to Supabase Storage; fileToResizedDataUrl() is only used
// for an instant local preview (e.g. showing a thumbnail before upload
// finishes) — never persisted anywhere.

function loadResizedCanvas(file, maxDim) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function fileToResizedDataUrl(file, maxDim = 900, quality = 0.82) {
  const canvas = await loadResizedCanvas(file, maxDim);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function fileToResizedBlob(file, maxDim = 1200, quality = 0.85) {
  const canvas = await loadResizedCanvas(file, maxDim);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}
