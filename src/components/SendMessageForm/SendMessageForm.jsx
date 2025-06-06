import React, { useState, useRef, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Smile, Paperclip, Image } from 'lucide-react';
import './SendMessageForm.css';

import { useSendMessage } from '../../hooks/useSendMessage';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useClickOutside } from '../../hooks/useClickOutside';
import FilePreview from './FilePreview';
import AutoResizingTextarea from './AutoResizingTextarea';
import EmojiPicker from './EmojiPicker';

export default function SendMessageForm({ userIdSelecionado, onMessageAdded }) {
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
    if (recordedFile) setFile(recordedFile);
  }, [recordedFile]);

  const handleSend = (e) => {
    e.preventDefault();
    if (isRecording) return stopRecording();
    if (text.trim() || file) {
      sendMessage({ text, file, userId: userIdSelecionado }, onMessageAdded);
      setText('');
      setFile(null);
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

  return (
    <>
      <form className="send-message-form" onSubmit={(e) => e.preventDefault()} style={{ position: 'relative' }}>
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
            accept=".txt,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.pdf,audio/ogg"
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
