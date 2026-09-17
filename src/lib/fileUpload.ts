/**
 * Utility for uploading files (PDFs, docs, audio, images) to the server
 * to avoid exceeding the Firestore document size limit (1,048,576 bytes).
 */

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
