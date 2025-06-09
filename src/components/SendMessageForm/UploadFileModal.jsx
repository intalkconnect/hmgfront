import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function UploadFileModal({ file, onClose, onSubmit }) {
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      await onSubmit(file, caption);
      onClose();
    } catch (err) {
      console.error('Erro ao enviar:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const getIcon = () => {
    const type = file.type || '';
    if (type.includes('image')) return '🖼️';
    if (type.includes('audio')) return '🎤';
    if (type.includes('pdf')) return '📄';
    if (type.includes('excel')) return '📊';
    return '📎';
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl relative">
        <h2 className="text-xl font-semibold mb-4">Enviar arquivo</h2>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{getIcon()}</span>
          <div>
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>

        <textarea
          className="w-full border rounded-lg p-2 mb-4"
          rows={3}
          placeholder="Adicione uma legenda (opcional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
            disabled={isUploading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="animate-spin" size={18} /> : null}
            {isUploading ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}
