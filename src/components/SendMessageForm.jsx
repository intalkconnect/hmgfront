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
  // Controle para indicar se estamos gravando áudio
  const [isRecording, setIsRecording] = useState(false);
  // Instância do MediaRecorder
  const mediaRecorderRef = useRef(null);
  // Partes de áudio capturadas
  const audioChunksRef = useRef([]);
  // Referência ao input de arquivo para limpar quando necessário
  const fileInputRef = useRef(null);
  const pickerRef = useRef(null);

  // ----------------------------------------------------------------------
  // Lista de MIME types permitidos (texto, docs, áudio ogg será tratado separadamente)
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
  // handleSend: chamado quando o usuário clica no botão SEND/REC
  // ----------------------------------------------------------------------
  const handleSend = async (e) => {
    e.preventDefault();

    // Se estamos gravando, parar a gravação
    if (isRecording) {
      stopRecording();
      return;
    }

    // Se houver texto ou arquivo, fazer envio
    if (text.trim() || file) {
      // Se não há texto e o file é um objeto que não seja áudio, validar extensão/tamanho
      if (!text.trim() && file) {
        // arquivo já validado em handleFileSelect; prosseguimos
      }

      // Preparar envio
      await sendMessageOrFile();
      return;
    }

    // Se não há texto nem arquivo, iniciar gravação de áudio
    startRecording();
  };

  // ----------------------------------------------------------------------
  // sendMessageOrFile: lógica de upload + envio de texto, arquivo ou áudio
  // ----------------------------------------------------------------------
  const sendMessageOrFile = async () => {
    // Se não há texto nem file (pode ser áudio gerado), ignora
    if (!text.trim() && !file) {
      toast.warn('Digite algo ou grave áudio antes de enviar.', {
        position: 'bottom-right',
        autoClose: 2000
      });
      return;
    }

    // Guarda o arquivo em variável local antes de limpar estado
    const fileToSend = file;
    const textToSend = text.trim();

    // Cria mensagem provisória (Optimistic UI)
    const tempId = Date.now();
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let provisionalMessage = null;
    if (fileToSend) {
      // Se o file for de tipo áudio/ogg
      const realFileName = fileToSend.name;
      const captionText = textToSend !== '' ? textToSend : realFileName;

      provisionalMessage = {
        id: tempId,
        type: fileToSend.type.startsWith('audio/') ? 'audio' :
              fileToSend.type.startsWith('image/') ? 'image' : 'document',
        content: {
          url: null,
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

    if (typeof onMessageAdded === 'function') {
      onMessageAdded(provisionalMessage);
    }

    // Limpa formulário local
    setFile(null);
    setText('');
    setShowEmoji(false);

    setIsSending(true);

    toast.info('Enviando mensagem…', {
      position: 'bottom-right',
      autoClose: 1500
    });

    try {
      const to = userIdSelecionado.replace('@w.msgcli.net', '');
      const payload = { to };

      if (fileToSend) {
        // Se for áudio, fazemos upload do blob
        const fileUrl = await uploadFileAndGetURL(fileToSend);
        if (!fileUrl) {
          throw new Error('Não foi possível obter URL de upload.');
        }

        const realFileName = fileToSend.name;
        const captionText = textToSend !== '' ? textToSend : realFileName;

        const mime = fileToSend.type;
        if (mime.startsWith('audio/')) {
          payload.type = 'audio';
          payload.content = {
            url: fileUrl,
            filename: realFileName,
            caption: captionText
          };
        } else {
          payload.type = fileToSend.type.startsWith('image/') ? 'image' : 'document';
          payload.content = {
            url: fileUrl,
            filename: realFileName,
            caption: captionText
          };
        }
      } else {
        payload.type = 'text';
        payload.content = textToSend;
      }

      console.log('[📨 Enviando payload]', payload);

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

      if (typeof onMessageAdded === 'function') {
        const serverData = responseText ? JSON.parse(responseText) : null;
        onMessageAdded({
          id: tempId,
          status: 'sent',
          serverResponse: serverData
        });
      }

      toast.success('Mensagem enviada!', {
        position: 'bottom-right',
        autoClose: 1500
      });
    } catch (err) {
      console.error('[❌ Erro ao enviar mensagem]', err);
      if (typeof onMessageAdded === 'function') {
        onMessageAdded({
          id: tempId,
          status: 'error',
          errorMessage: err.message
        });
      }
      toast.error('Falha ao enviar mensagem.', {
        position: 'bottom-right',
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

    // Verifica se é MP3, WAV, OGG ou tipos permitidos para docs
    if (
      !ALLOWED_MIME_TYPES.includes(selectedFile.type) &&
      !selectedFile.type.startsWith('audio/')
    ) {
      alert(
        'Tipo de arquivo não permitido.\n\n' +
          'Somente os formatos .txt, .xls, .xlsx, .doc, .docx, .ppt, .pptx, .pdf e áudio (ogg) são aceitos.'
      );
      e.target.value = '';
      return;
    }

    // Verifica tamanho máximo
    if (selectedFile.size > MAX_FILE_SIZE) {
      alert('Arquivo muito grande. O tamanho máximo permitido é 5 MB.');
      e.target.value = '';
      return;
    }

    setFile(selectedFile);
  };

  // ----------------------------------------------------------------------
  // handleRemoveFile: remove o anexo atualmente selecionado
  // ----------------------------------------------------------------------
  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ----------------------------------------------------------------------
  // startRecording: solicita permissão e inicia gravação via MediaRecorder
  // ----------------------------------------------------------------------
  const startRecording = async () => {
 // 1) Contexto seguro
  // Se não estiver em https (fora “localhost”), getUserMedia falhará.
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    alert('Gravação de áudio só funciona em HTTPS ou em localhost.');
    return;
  }

  // 2) Verifica suporte
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Este navegador não suporta captura de áudio (getUserMedia).');
    return;
  }
if (!window.MediaRecorder) {
  alert('MediaRecorder não suportado neste navegador.');
  return;
}

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Gravação de áudio não suportada neste navegador.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: 'audio/ogg; codecs=opus' };
      const mediaRecorder = new MediaRecorder(stream, options);

      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = handleRecordingStop;

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      toast.info('Gravando áudio… clique novamente para parar.', {
        position: 'bottom-right',
        autoClose: 1500
      });
    } catch (err) {
  console.error('[❌ Erro ao iniciar gravação]', err);
  alert(`Não foi possível iniciar gravação de áudio:\n${err.name} – ${err.message}`);
    }
  };

  // ----------------------------------------------------------------------
  // stopRecording: para o MediaRecorder e finaliza fluxo de gravação
  // ----------------------------------------------------------------------
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
  };

  // ----------------------------------------------------------------------
  // handleRecordingStop: invocado quando a gravação é interrompida
  // ----------------------------------------------------------------------
  const handleRecordingStop = () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
    if (audioBlob.size > MAX_FILE_SIZE) {
      toast.error('Áudio muito grande. Máximo permitido é 5 MB.', {
        position: 'bottom-right',
        autoClose: 2000
      });
      return;
    }

    const audioFile = new File([audioBlob], `gravacao_${Date.now()}.ogg`, {
      type: 'audio/ogg'
    });
    setFile(audioFile);
    toast.success('Gravação concluída. Toque em enviar para enviar o áudio.', {
      position: 'bottom-right',
      autoClose: 2000
    });
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
              placeholder={
                file
                  ? 'Digite uma legenda para o anexo...'
                  : isRecording
                  ? 'Gravando áudio...'
                  : 'Digite sua mensagem...'
              }
              disabled={isSending || isRecording}
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
              disabled={isSending || isRecording}
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
              disabled={isSending || isRecording}
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
              accept=".txt,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.pdf,audio/ogg"
              onChange={handleFileSelect}
            />

            {/* Botão de enviar / gravar áudio */}
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
              {isRecording ? (
                // Ícone de parar gravação
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#e3342f" viewBox="0 0 24 24">
                  <path d="M6 6h12v12H6z" />
                </svg>
              ) : text.trim() || file ? (
                // Ícone de enviar
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#0084ff" viewBox="0 0 24 24">
                  <path d="M2.01 21l20.99-9L2.01 3v7l15 2-15 2z" />
                </svg>
              ) : (
                // Ícone de microfone para iniciar gravação
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#000" viewBox="0 0 24 24">
                  <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2zM11 19.93A7.002 7.002 0 0 1 5 13H3a9 9 0 0 0 18 0h-2a7.002 7.002 0 0 1-6 6.93V23h-2v-3.07z" />
                </svg>
              )}
            </button>
          </div>

          {/* Preview do nome do arquivo + botão “×” para remover */}
          {file && (
            <div
              style={{
                marginTop: '8px',
                fontSize: '0.9rem',
                color: '#444',
                paddingLeft: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {file.type.startsWith('audio/') ? '🔉 Áudio:' : '📎 Anexado:'}{' '}
              <strong>{file.name}</strong>
              <button
                type="button"
                onClick={handleRemoveFile}
                disabled={isSending || isRecording}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#e3342f',
                  fontSize: '1.1rem',
                  lineHeight: '1',
                  padding: '0'
                }}
                aria-label="Remover anexo"
              >
                ×
              </button>
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
