import React, { useState, useEffect, useRef } from 'react';
import 'emoji-picker-element';

export default function SendMessageForm({ userIdSelecionado }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const pickerRef = useRef(null);
  const fileInputRef = useRef(null);

  const uploadFileAndGetURL = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('https://ia-srv-meta.9j9goo.easypanel.host/bucket/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        console.error('[❌ Upload erro]', data);
        return null;
      }
      console.log('[✅ Upload URL]', data.url);
      return data.url;
    } catch (err) {
      console.error('[❌ Upload falhou]', err);
      return null;
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    console.log('►► handleSend disparado! file=', file, 'text=', text);

    if (!text.trim() && !file) {
      console.log('►► Abortei: nem texto nem arquivo.');
      return;
    }

    const fileToSend = file;
    const textToSend = text.trim();

    // Não limpar ainda o state; só depois de tudo dar certo:
    // setFile(null);
    // setText('');
    // setShowEmoji(false);

    const to = userIdSelecionado.replace('@w.msgcli.net', '');
    const payload = { to };

    if (fileToSend) {
      console.log('►► Iniciando upload do arquivo:', fileToSend);
      const fileUrl = await uploadFileAndGetURL(fileToSend);
      console.log('►► uploadFileAndGetURL retornou:', fileUrl);

      if (!fileUrl) {
        console.log('►► Abortei: não recebi URL de upload.');
        return;
      }

      const isImage = fileToSend.type.startsWith('image/');
      payload.type = isImage ? 'image' : 'document';
      payload.content = isImage
        ? { url: fileUrl, caption: textToSend }
        : { url: fileUrl, filename: fileToSend.name };

      console.log('[📨 Enviando arquivo]', payload);
    } else {
      payload.type = 'text';
      payload.content = textToSend;
      console.log('[📨 Enviando texto]', payload);
    }

    try {
      const resp = await fetch('https://ia-srv-meta.9j9goo.easypanel.host/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('►► Resposta do /messages/send:', resp.status, await resp.text());

      if (resp.ok) {
        // Tudo certo: limpa o form
        setFile(null);
        setText('');
        setShowEmoji(false);
      } else {
        console.warn('►► /messages/send retornou erro:', resp.status);
      }
    } catch (err) {
      console.error('[❌ Erro ao enviar mensagem]', err);
    }
  };

  const handleFileSelect = (e) => {
    console.log('>>> handleFileSelect disparado, fileInputRef.current =', fileInputRef.current);
    console.log('>>> e.target.files =', e.target.files);
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      console.log('[📎 Arquivo selecionado]', selectedFile.name);
      setFile(selectedFile);
      console.log('>>> Estado “file” atualizado para:', selectedFile);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (pickerRef.current) {
      pickerRef.current.addEventListener('emoji-click', (e) => {
        setText((prev) => prev + e.detail.unicode);
      });
    }
  }, [showEmoji]);

  return (
    <form
      onSubmit={handleSend}
      style={{
        position: 'relative',
        padding: '12px',
        background: '#f0f2f5',
        borderTop: '1px solid #ddd',
        width: '100%'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#fff',
            borderRadius: '24px',
            padding: '8px 12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            height: '56px',
            gap: '10px'
          }}
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={file ? 'Digite uma legenda para o anexo...' : 'Digite sua mensagem...'}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1rem', background: 'transparent' }}
          />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowEmoji((prev) => !prev);
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span role="img" aria-label="emoji" style={{ fontSize: '20px' }}>
              😊
            </span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#555" viewBox="0 0 24 24">
              <path d="M16.5 2a2.5 2.5 0 0 1 1.768 4.268l-9.193 9.192a1.5 1.5 0 1 1-2.122-2.122l9.193-9.193A2.5 2.5 0 0 1 16.5 2zm0 1a1.5 1.5 0 0 0-1.06 2.56l-9.193 9.193a2.5 2.5 0 1 0 3.536 3.536l9.192-9.193A1.5 1.5 0 0 0 16.5 3z" />
            </svg>
          </button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />

          <button
            type="submit"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#0084ff" viewBox="0 0 24 24">
              <path d="M2.01 21l20.99-9L2.01 3v7l15 2-15 2z" />
            </svg>
          </button>
        </div>

        {/* Preview do arquivo só aparece se “file” NÃO for null */}
        {file && (
          <div
            style={{
              marginTop: '8px',
              fontSize: '0.9rem',
              color: '#444',
              paddingLeft: '12px'
            }}
          >
            📎 Anexado: <strong>{file.name}</strong>
          </div>
        )}
      </div>

      {showEmoji && (
        <div
          style={{
            position: 'absolute',
            bottom: '70px',
            right: '10px',
            zIndex: 999,
            background: '#fff',
            borderRadius: '10px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
            maxHeight: '350px',
            overflowY: 'auto'
          }}
        >
          <emoji-picker ref={pickerRef} style={{ backgroundColor: '#fff', height: '350px' }}></emoji-picker>
        </div>
      )}
    </form>
  );
}
