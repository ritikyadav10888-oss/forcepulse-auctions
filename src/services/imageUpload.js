// Scale an image down in the browser, then upload it to the server. Returns the image URL.
// Without `fit`, images are scaled down to fit maxWidth × maxHeight (never up) and re-encoded.
// With `fit`, the result is exactly maxWidth × maxHeight, so every image in a slot has the same shape:
//   'cover'   fills the frame and crops the overflow (sides centred, tall photos keep the top, where the face is)
//   'contain' fits the whole image inside and pads the rest (transparent for PNG, so logos are never cut)
import { api } from './serverSync';

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // refuse very large originals before decoding

// The fixed image layout of the app: every upload of a kind is stored at this size and shape
export const IMAGE_SIZES = {
  // Player photos keep their own shape (never cut); screens show them whole
  playerPhoto: { maxWidth: 1000, maxHeight: 1000, type: 'image/jpeg', quality: 0.86, label: 'Any shape, up to 1000 px (portrait works best)' },
  teamLogo: { maxWidth: 500, maxHeight: 500, fit: 'contain', type: 'image/png', label: 'Square · 500 × 500 px' },
  tournamentLogo: { maxWidth: 500, maxHeight: 500, fit: 'contain', type: 'image/png', label: 'Square · 500 × 500 px' },
  banner: { maxWidth: 1600, maxHeight: 600, fit: 'cover', type: 'image/jpeg', quality: 0.8, label: 'Wide 8:3 · 1600 × 600 px' },
  screenBackground: { maxWidth: 1920, maxHeight: 1080, fit: 'cover', type: 'image/jpeg', quality: 0.82, label: 'Wide 16:9 · 1920 × 1080 px' }
};

// Source rectangle to draw for the chosen fit
const sourceRect = (img, w, h, fit) => {
  if (fit !== 'cover') return { sx: 0, sy: 0, sw: img.width, sh: img.height };
  const target = w / h;
  if (img.width / img.height > target) {
    const sw = img.height * target;
    return { sx: (img.width - sw) / 2, sy: 0, sw, sh: img.height };
  }
  const sh = img.width / target;
  // Tall photos: keep the upper part, where heads usually are
  return { sx: 0, sy: (img.height - sh) * 0.2, sw: img.width, sh };
};

const resizeImage = (file, { maxWidth = 500, maxHeight = 500, type = 'image/webp', quality = 0.85, fit } = {}) =>
  new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file (PNG, JPG or WebP).'));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      reject(new Error('That image is larger than 8 MB. Please choose a smaller one.'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (fit) {
        canvas.width = maxWidth;
        canvas.height = maxHeight;
        const { sx, sy, sw, sh } = sourceRect(img, maxWidth, maxHeight, fit);
        let dw = maxWidth;
        let dh = maxHeight;
        if (fit === 'contain') {
          const scale = Math.min(maxWidth / sw, maxHeight / sh);
          dw = sw * scale;
          dh = sh * scale;
          // JPEG has no transparency, so pad it with the screens' dark ink
          if (type === 'image/jpeg') {
            ctx.fillStyle = '#0A0D19';
            ctx.fillRect(0, 0, maxWidth, maxHeight);
          }
        }
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, sw, sh, (maxWidth - dw) / 2, (maxHeight - dh) / 2, dw, dh);
      } else {
        const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('This image could not be read. Try another file.'))), type, quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image could not be read. Try another file.'));
    };
    img.src = url;
  });

export const uploadImage = async (file, options) => {
  const blob = await resizeImage(file, options);
  const form = new FormData();
  form.append('file', blob, `image.${blob.type.split('/')[1] || 'png'}`);
  const { url } = await api('/api/uploads', { method: 'POST', body: form });
  return url;
};
