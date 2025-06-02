// SendMessageForm.jsx

import React, { useState, useEffect, useRef } from 'react';
import 'emoji-picker-element';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function SendMessageForm({ userIdSelecionado, onMessageAdded }) {
  // Texto digitado pelo usuário
  const [text, setText] = useState('');
  // Arquivo selecionado (File object) ou null
  const [file, setFile] = useState(null);
  // Controle para exibir/esconder o emoji picker
  const [showEmoji, setShowEmoji] = useState(false);
  // Controle para habilitar/desabilitar spinner e botão de enviar
  const [isSending, setIsSending] = useState(false);

  const pickerRef = useRef(null);
  const fileInputRef = useRef(null);

  // ----------------------------------------------------------------------
  // Lista de MIME types permitidos
  // ----------------------------------------------------------------------
  const ALLOWED_MIME_TYPES = [
    'text/plain',                                                                       // .txt
    'application/vnd.ms-excel',                                                         // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',                // .xlsx
    'application/msword',                                                                // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',          // .docx
    'application/vnd.ms-powerpoint',                                                     // .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',         // .pptx
    'application/pdf'                                                                    // .pdf
  ];

  // Tamanho máximo (em bytes) - 5 MB
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 242 880 bytes

  // ----------------------------------------------------------------------
  // uploadFileAndGetURL: faz POST /bucket/upload e retorna a URL pública
  // ----------------------------------------------------------------------
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

  // ----------------------------------------------------------------------
  // handleSend: chamado quando o formulário é submetido
  // ----------------------------------------------------------------------
  const handleSend = async (e) => {
    e.preventDefault();
    // Se não há texto nem arquivo, não faz nada
    if (!text.trim() && !file) {
      toast.warn('Digite uma mensagem ou selecione um arquivo antes de enviar.', {
        position: toast.POSITION.BOTTOM_RIGHT,
        autoClose: 2000
      });
      return;
    }

    // Guarda cópia do arquivo (File) e do texto atual antes de limpar estados
    const fileToSend = file;
    const textToSend = text.trim();

    // Cria mensagem provisória (Optimistic UI) e repassa ao componente pai
    // onMessageAdded deve adicionar ao array de mensagens com status “sending”
    // Estrutura esperada: { id, type, content, status, timestamp }
    const tempId = Date.now();
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let provisionalMessage = null;
    if (fileToSend) {
      const realFileName = fileToSend.name;
      const captionText = textToSend !== '' ? textToSend : realFileName;

      provisionalMessage = {
        id: tempId,
        type: fileToSend.type.startsWith('image/') ? 'image' : 'document',
        content: {
          url: null,           // Ainda sem URL final
          filename: realFileName,
          caption: captionText
        },
        status: 'sending',
        timestamp
      };
    } else {
      provisionalMessage = {
        id: tempId,
        type: 'text',
        content: textToSend,
        status: 'sending',
        timestamp
      };
    }

    // Adiciona a mensagem provisória à lista (via callback do pai)
    onMessageAdded(provisionalMessage);

    // Limpa o formulário local (campo de texto e preview de arquivo)
    setFile(null);
    setText('');
    setShowEmoji(false);

    // Habilita spinner/desabilita botões
    setIsSending(true);

    // Exibe toast informando que começou a enviar
    toast.info('Enviando mensagem…', {
      position: toast.POSITION.BOTTOM_RIGHT,
      autoClose: 1500
    });

    try {
      // Constrói payload para envio ao backend
      const to = userIdSelecionado.replace('@w.msgcli.net', '');
      const payload = { to };

      if (fileToSend) {
        // Faz upload do arquivo ao bucket
        const fileUrl = await uploadFileAndGetURL(fileToSend);
        if (!fileUrl) {
          throw new Error('Não foi possível obter URL de upload.');
        }

        const realFileName = fileToSend.name;
        const captionText = textToSend !== '' ? textToSend : realFileName;

        payload.type = fileToSend.type.startsWith('image/') ? 'image' : 'document';
        payload.content = {
          url: fileUrl,
          filename: realFileName,
          caption: captionText
        };
      } else {
        payload.type = 'text';
        payload.content = textToSend;
      }

      console.log('[📨 Enviando payload]', payload);

      // Chama o endpoint para envio de mensagem
      const resp = await fetch('https://ia-srv-meta.9j9goo.easypanel.host/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const responseText = await resp.text();
      console.log('►► Resposta do /messages/send:', resp.status, responseText);

      if (!resp.ok) {
        throw new Error(`Servidor retornou ${resp.status}: ${responseText}`);
      }

      // Ao obter sucesso, atualiza o status da mensagem provisória (chama callback do pai novamente)
      const serverData = responseText ? JSON.parse(responseText) : null;
      onMessageAdded({
        id: tempId,
        status: 'sent',
        serverResponse: serverData
      });

      toast.success('Mensagem enviada!', {
        position: toast.POSITION.BOTTOM_RIGHT,
        autoClose: 1500
      });
    } catch (err) {
      console.error('[❌ Erro ao enviar mensagem]', err);
      // Marca a mensagem provisória como “error”
      onMessageAdded({
        id: tempId,
        status: 'error',
        errorMessage: err.message
      });

      toast.error('Falha ao enviar mensagem.', {
        position: toast.POSITION.BOTTOM_RIGHT,
        autoClose: 2000
      });
    } finally {
      setIsSending(false);
    }
  };

  // ----------------------------------------------------------------------
  // handleFileSelect: checa extensão e tamanho do arquivo antes de aceitar
  // ----------------------------------------------------------------------
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    console.log('[📎 Arquivo selecionado]', selectedFile.name);

    // 1) Verifica se o MIME type está na lista permitida
    if (!ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
      alert(
        'Tipo de arquivo não permitido.\n\n' +
          'Somente os formatos .txt, .xls, .xlsx, .doc, .docx, .ppt, .pptx e .pdf são aceitos.'
      );
      e.target.value = '';
      return;
    }

    // 2) Verifica se o tamanho não excede 5 MB
    if (selectedFile.size > MAX_FILE_SIZE) {
      alert('Arquivo muito grande. O tamanho máximo permitido é 5 MB.');
      e.target.value = '';
      return;
    }

    // Se passou nas duas checagens, guarda o arquivo
    setFile(selectedFile);
  };

  // ----------------------------------------------------------------------
  // Efeitos para lidar com clique fora do emoji picker e capturar emojis
  // ----------------------------------------------------------------------
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

  // ----------------------------------------------------------------------
  // Render do formulário de envio
  // ----------------------------------------------------------------------
  return (
    <>
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
            {/* Input de texto ou legenda */}
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={file ? 'Digite uma legenda para o anexo...' : 'Digite sua mensagem...'}
              disabled={isSending}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '1rem',
                background: 'transparent'
              }}
            />

            {/* Botão para abrir emoji picker */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowEmoji((prev) => !prev);
              }}
              disabled={isSending}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <span role="img" aria-label="emoji" style={{ fontSize: '20px' }}>
                😊
              </span>
            </button>

            {/* Botão para selecionar arquivo */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#555" viewBox="0 0 24 24">
                <path d="M16.5 2a2.5 2.5 0 0 1 1.768 4.268l-9.193 9.192a1.5 1.5 0 1 1-2.122-2.122l9.193-9.193A2.5 2.5 0 0 1 16.5 2zm0 1a1.5 1.5 0 0 0-1.06 2.56l-9.193 9.193a2.5 2.5 0 1 0 3.536 3.536l9.192-9.193A1.5 1.5 0 0 0 16.5 3z" />
              </svg>
            </button>

            {/* Input de arquivo oculto (apenas extensões permitidas) */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".txt,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.pdf"
              onChange={handleFileSelect}
            />

            {/* Botão de enviar (com spinner quando isSending===true) */}
            <button
              type="submit"
              disabled={isSending}
              style={{
                background: 'none',
                border: 'none',
                cursor: isSending ? 'default' : 'pointer',
                opacity: isSending ? 0.6 : 1
              }}
            >
              {isSending ? (
                // SVG de Spinner
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 38 38"
                  xmlns="http://www.w3.org/2000/svg"
                  stroke="#0084ff"
                >
                  <g fill="none" fillRule="evenodd">
                    <g transform="translate(1 1)" strokeWidth="2">
                      <circle strokeOpacity=".5" cx="18" cy="18" r="18" />
                      <path d="M36 18c0-9.94-8.06-18-18-18">
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from="0 18 18"
                          to="360 18 18"
                          dur="1s"
                          repeatCount="indefinite"
                        />
                      </path>
                    </g>
                  </g>
                </svg>
              ) : (
                // Ícone de Enviar normal
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#0084ff" viewBox="0 0 24 24">
                  <path d="M2.01 21l20.99-9L2.01 3v7l15 2-15 2z" />
                </svg>
              )}
            </button>
          </div>

          {/* Preview do nome do arquivo */}
          {file && (
            <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#444', paddingLeft: '12px' }}>
              📎 Anexado: <strong>{file.name}</strong>
            </div>
          )}
        </div>

        {/* Emoji Picker Flutuante */}
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

      {/* ToastContainer: necessário para exibir toasts */}
      <ToastContainer />
    </>
  );
}
