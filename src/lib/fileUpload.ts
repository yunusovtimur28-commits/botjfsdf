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

export async function uploadBlobToServer(blob: Blob, fileName: string): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      if (!base64) return resolve('');
      try {
        const url = await uploadBase64ToServer(base64, fileName);
        resolve(url);
      } catch (err) {
        console.warn('Failed to upload blob:', err);
        resolve(base64);
      }
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(blob);
  });
}

export async function uploadFileToServer(file: File): Promise<{ url: string; size: string; name: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (!base64) {
        return reject(new Error('Failed to read file'));
      }

      try {
        const url = await uploadBase64ToServer(base64, file.name);
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' МБ';
        resolve({
          url,
          size: sizeMb,
          name: file.name,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
