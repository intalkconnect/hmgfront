import React, { useState, useRef, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Smile, Paperclip, Image } from 'lucide-react';
import './SendMessageForm.css';

import TextMessage from '../ChatWindow/messageTypes/TextMessage';
import ImageMessage from '../ChatWindow/messageTypes/ImageMessage';
import DocumentMessage from '../ChatWindow/messageTypes/DocumentMessage';
import AudioMessage from '../ChatWindow/messageTypes/AudioMessage';
import ListMessage from '../ChatWindow/messageTypes/ListMessage';
import UnknownMessage from '../ChatWindow/messageTypes/UnknownMessage';


import { useSendMessage } from '../../hooks/useSendMessage';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useClickOutside } from '../../hooks/useClickOutside';
import FilePreview from './FilePreview';
import AutoResizingTextarea from './AutoResizingTextarea';
import EmojiPicker from './EmojiPicker';

export default function SendMessageForm({ userIdSelecionado, onMessageAdded, replyTo, setReplyTo }) {

  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const { isSending, sendMessage } = useSendMessage();
  const {
    isRecording,
    startRecording,
    stopRecording,
    recordedFile,
    clearRecordedFile,
  } = useAudioRecorder();

  // 🛠️ Correto: useClickOutside espera array de refs
  useClickOutside([emojiPickerRef], () => setShowEmoji(false));
  useEffect(() => {
  setText('');
  setFile(null);
  setReplyTo(null);
}, [userIdSelecionado]);

useEffect(() => {
  if (replyTo) {
    console.log('🔁 Mensagem sendo respondida (ID):', replyTo.whatsapp_message_id);
  }
}, [replyTo]);


  useEffect(() => {
    if (recordedFile) setFile(recordedFile);
  }, [recordedFile]);

const handleSend = (e) => {
  e.preventDefault();

  if (isRecording) return stopRecording();

  if (text.trim() || file) {
    const payload = {
      text,
      file,
      userId: userIdSelecionado,
      replyTo: replyTo?.whatsapp_message_id || null,
    };

    console.log('📦 Payload sendo enviado:', payload);

    sendMessage(payload, onMessageAdded);

    setText('');
    setFile(null);
    setReplyTo(null);
  } else {
    startRecording();
  }
};


  const handleRemoveFile = () => {
    setFile(null);
    clearRecordedFile();
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleFileSelect = (e) => {
    setFile(e.target.files[0] || null);
  };

  const handleImageSelect = (e) => {
    setFile(e.target.files[0] || null);
  };

  const handleSelectEmoji = (emoji) => {
    if (typeof emoji === 'string') {
      setText((prev) => prev + emoji);
    }
  };

  const renderReplyContent = (msg) => {
  if (!msg || !msg.content) return '[mensagem]';

  // Caso seja uma string simples (texto puro)
  if (typeof msg.content === 'string' && !msg.content.trim().startsWith('{')) {
    return <TextMessage content={msg.content} />;
  }

  try {
    const parsed = typeof msg.content === 'string'
      ? JSON.parse(msg.content)
      : msg.content;

    console.log('🔍 Conteúdo parseado:', parsed);

    const url = parsed.url?.toLowerCase?.() || '';
    const filename = parsed.filename?.toLowerCase?.() || '';
    const extension = filename.split('.').pop();

    // Lista
    if ((parsed.type === 'list' || parsed.type === 'buttons') && parsed.action?.sections) {
      return <ListMessage listData={parsed} small />;
    }

    // Áudio
    if (parsed.voice || /\.(ogg|mp3|wav|webm)$/i.test(url)) {
      return <AudioMessage url={parsed.url} small />;
    }

    // Imagem
    if (/\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(url)) {
      return <ImageMessage url={parsed.url} caption={parsed.caption} small />;
    }

    // Documento
    const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];
    if (filename && docExts.includes(extension)) {
      return (
        <DocumentMessage
          filename={filename}
          url={parsed.url}
          caption={parsed.caption}
          small
        />
      );
    }

    // Texto (caption ou text)
    if (parsed.text || parsed.caption) {
      return <TextMessage content={parsed.text || parsed.caption} />;
    }

    return <TextMessage content="[mensagem]" />;
  } catch (err) {
    console.error('❌ Erro ao parsear msg.content:', err);
    return <TextMessage content={msg.content} />;
  }
};




  return (
    <>
      <form className="send-message-form" onSubmit={(e) => e.preventDefault()} style={{ position: 'relative' }}>
{replyTo && (
  <div className="reply-preview">
    <div className="reply-content">
      <strong>{replyTo.sender || 'Você'}</strong>
      <div className="reply-text">
        {renderReplyContent(replyTo)}
      </div>
    </div>
    <button className="reply-close-btn" onClick={() => setReplyTo(null)}>×</button>
  </div>
)}



        <AutoResizingTextarea
          ref={textareaRef}
          className="send-message-textarea"
          placeholder={
            file
              ? file.type.startsWith('audio/')
                ? 'Gravação pronta (aperte enviar) ou digite legenda...'
                : 'Digite uma legenda para o anexo...'
              : isRecording
              ? 'Gravando áudio...'
              : 'Escreva uma mensagem...'
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onSubmit={handleSend}
          disabled={isSending || isRecording}
          rows={1}
        />

        <div className="send-button-group">
          <button
            type="button"
            className="btn-attachment"
            onClick={() => setShowEmoji((prev) => !prev)}
            disabled={isSending || isRecording}
            title="Emoji"
          >
            <Smile size={24} color="#555" />
          </button>

          <button
            type="button"
            className="btn-attachment"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || isRecording}
            title="Anexar arquivo"
          >
            <Paperclip size={24} color="#555" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
             accept=".txt,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.pdf"
            onChange={handleFileSelect}
          />

          <button
            type="button"
            className="btn-attachment"
            onClick={() => imageInputRef.current?.click()}
            disabled={isSending || isRecording}
            title="Anexar imagem"
          >
            <Image size={24} color="#555" />
          </button>
          <input
            type="file"
            ref={imageInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleImageSelect}
          />

          <FilePreview
            file={file}
            onRemove={handleRemoveFile}
            isSending={isSending}
            isRecording={isRecording}
          />

          <button
            type="submit"
            className="btn-send"
            onClick={handleSend}
            disabled={isSending}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fff">
              <path d={
                isRecording ? "M6 6h12v12H6z"
                : text.trim() || file ? "M2.01 21l20.99-9L2.01 3v7l15 2-15 2z"
                : "M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zM17 11a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2z"
              } />
            </svg>
          </button>
        </div>

        {/* Picker flutuante com ref e condição de exibição */}
        {showEmoji && (
          <div ref={emojiPickerRef} style={{ position: 'absolute', bottom: '50px', left: 0, zIndex: 1000 }}>
            <EmojiPicker onSelect={handleSelectEmoji} />
          </div>
        )}
      </form>

      <ToastContainer />
    </>
  );
}
