/**
 * Utility for uploading files (PDFs, docs, audio, images) to the server
 * to avoid exceeding the Firestore document size limit (1,048,576 bytes).
 */

export function getSupportedAudioMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return '';
  }

  // Detect iOS Safari or Safari on macOS to prefer mp4/aac
  const isSafariOrIos =
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ||
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  const candidates = isSafariOrIos
    ? ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];

  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
}

export async function uploadBase64ToServer(base64: string, fileName: string): Promise<string> {
  if (!base64 || !base64.startsWith('data:')) {
    return base64;
  }

  try {
    const res = await fetch('/api/upload-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: fileName || 'file.pdf',
        base64,
      }),
    });

    if (!res.ok) {
      throw new Error(`Upload failed with status: ${res.status}`);
    }

    const data = await res.json();
    if (data.success && data.url) {
      return data.url;
    }
  } catch (err) {
    console.warn('Failed to upload file to server, falling back:', err);
  }

  return base64;
}

export async function uploadBlobWithBase64(blob: Blob, fileName: string): Promise<{ url: string; base64: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string) || '';
      if (!base64) return resolve({ url: '', base64: '' });
      try {
        const url = await uploadBase64ToServer(base64, fileName);
        resolve({ url: url || base64, base64 });
      } catch (err) {
        console.warn('Failed to upload blob with base64:', err);
        resolve({ url: base64, base64 });
      }
    };
    reader.onerror = () => resolve({ url: '', base64: '' });
    reader.readAsDataURL(blob);
  });
}

export async function uploadBlobToServer(blob: Blob, fileName: string): Promise<string> {
  const res = await uploadBlobWithBase64(blob, fileName);
  return res.url || res.base64;
}

async function compressImageIfNeeded(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/') || file.type.includes('svg')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_DIM = 1920;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };
    img.src = url;
  });
}

export async function uploadFileToServer(file: File): Promise<{ url: string; size: string; name: string }> {
  try {
    const base64 = await compressImageIfNeeded(file);
    if (!base64) {
      throw new Error('Failed to read file');
    }

    const url = await uploadBase64ToServer(base64, file.name);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' МБ';
    return {
      url,
      size: sizeMb,
      name: file.name,
    };
  } catch (err: any) {
    throw err;
  }
}
