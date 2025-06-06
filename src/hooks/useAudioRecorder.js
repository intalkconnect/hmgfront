// src/hooks/useAudioRecorder.js
import { useState, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';

// Hook que encapsula toda a lógica de gravação por MediaRecorder.
// Retorna: { isRecording, startRecording, stopRecording, recordedFile }
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedFile, setRecordedFile] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = useCallback(async () => {
    if (
      window.location.protocol !== 'https:' &&
      window.location.hostname !== 'localhost'
    ) {
      alert('Gravação de áudio só funciona em HTTPS ou em localhost.');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      alert('Este navegador não suporta gravação de áudio.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 48000 },
      });

      if (!MediaRecorder.isTypeSupported('audio/webm; codecs=opus')) {
        alert('Seu navegador não suporta gravação em WebM/Opus.');
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm; codecs=opus',
      });
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = () => {
        // Ao parar gravação, cria o File e guarda em recordedFile
        const mime = mediaRecorder.mimeType; // ex: audio/webm; codecs=opus
        const blob = new Blob(audioChunksRef.current, { type: mime });
        if (blob.size > 5 * 1024 * 1024) {
          // 5MB
          toast.error('Áudio muito grande. Máximo permitido: 5 MB.', {
            position: 'bottom-right',
            autoClose: 2000,
          });
          return;
        }
        const filename = `gravacao_${Date.now()}.webm`;
        const fileObj = new File([blob], filename, { type: mime });
        setRecordedFile(fileObj);
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      toast.info('Gravando áudio… clique novamente para parar.', {
        position: 'bottom-right',
        autoClose: 1500,
      });
    } catch (err) {
      console.error('[❌ Erro ao iniciar gravação]', err);
      alert(`Não foi possível iniciar gravação:\n${err.name} – ${err.message}`);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    recordedFile,
    clearRecordedFile: () => setRecordedFile(null),
  };
}
