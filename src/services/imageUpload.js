// Scale an image down in the browser, then upload it to the server. Returns the image URL.
// Images are scaled down to fit maxWidth × maxHeight (never up) and re-encoded.
import { api } from './serverSync';

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // refuse very large originals before decoding

const resizeImage = (file, { maxWidth = 500, maxHeight = 500, type = 'image/webp', quality = 0.85 } = {}) =>
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
      const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
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
