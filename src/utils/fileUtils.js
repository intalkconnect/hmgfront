// src/utils/fileUtils.js

// 1) Tipos permitidos e tamanho máximo
export const ALLOWED_MIME_TYPES = [
  'text/plain',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Áudios
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/mp3',
  'audio/amr',
  'audio/opus',
  'audio/aac',
  'audio/webm;codecs=opus', // 👈 adicione este
'audio/webm;codecs=opus',

  // Imagens
  'image/jpeg',
  'image/png',
  'image/webp',

  // Vídeos (opcional)
  'video/mp4',
  'video/3gpp',
];


export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Faz upload de um File (docs/imagem/áudio) para o servidor e retorna a URL pública.
 * Retorna null se falhar.
 */
export async function uploadFileAndGetURL(fileToUpload) {
  const formData = new FormData();
  formData.append('file', fileToUpload);

  try {
    const res = await fetch(
      'https://ia-srv-meta.9j9goo.easypanel.host/api/v1/bucket/upload',
      { method: 'POST', body: formData }
    );
    const data = await res.json();
    if (!res.ok || !data.url) {
      console.error('[❌ Upload erro]', data);
      return null;
    }
    return data.url;
  } catch (err) {
    console.error('[❌ Upload falhou]', err);
    return null;
  }
}

/**
 * Valida se um File tem tipo permitido e tamanho OK.
 * Retorna { valid: boolean, errorMsg?: string }
 */
export function validateFile(file) {
  if (!file) {
    return { valid: false, errorMsg: 'Nenhum arquivo selecionado.' };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      errorMsg:
        'Tipo de arquivo não permitido. Apenas .txt, .xls, .xlsx, .doc, .docx, .ppt, .pptx, .pdf e áudio (.ogg).',
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      errorMsg: 'Arquivo muito grande. Máximo permitido: 5 MB.',
    };
  }
  return { valid: true };
}
