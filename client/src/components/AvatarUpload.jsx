import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Check, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import Button from './Button';
import api from '../utils/api';

const AvatarUpload = ({ onAvatarChange, defaultAvatar, disabled }) => {
  const [mode, setMode] = useState('view'); // view, upload, camera
  const [preview, setPreview] = useState(defaultAvatar || null);
  const [stream, setStream] = useState(null);
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      toast.error("Unable to access camera. Please check permissions.");
      setMode('view');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        handleFileSelection(file);
      }, 'image/jpeg', 0.8);
      
      stopCamera();
      setMode('view');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleFileSelection = (file) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    
    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    
    // Pass the file to parent
    if (onAvatarChange) {
      onAvatarChange(file);
    }
  };

  const clearAvatar = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onAvatarChange) onAvatarChange(null);
  };

  return (
    <div className="flex flex-col items-center gap-3 mb-4 p-3 border border-border/50 rounded-xl bg-surface-secondary/30">
      <h3 className="text-sm font-semibold text-text-secondary w-full text-left">Profile Picture</h3>
      
      <div className="relative group">
        {mode === 'camera' ? (
          <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-black border-2 border-primary/50 flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover transform -scale-x-100"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
        ) : (
          <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden flex items-center justify-center border-2 border-dashed ${preview ? 'border-primary/50' : 'border-border'} bg-surface-divider/50 transition-colors group-hover:border-primary/50`}>
            {preview ? (
              <img src={preview} alt="Avatar preview" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon size={40} className="text-text-muted opacity-50" />
            )}
          </div>
        )}
        
        {preview && mode !== 'camera' && !disabled && (
          <button 
            type="button"
            onClick={clearAvatar}
            className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors z-10"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {mode === 'camera' ? (
          <>
            <Button type="button" onClick={handleCapture} className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 h-8">
              <Check size={14} /> Capture
            </Button>
            <Button type="button" variant="outline" onClick={() => setMode('view')} className="gap-2 text-xs px-3 py-1.5 h-8">
              <X size={14} /> Cancel
            </Button>
          </>
        ) : (
          <>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/jpeg, image/png, image/webp" 
              className="hidden" 
              onChange={handleFileSelect}
              disabled={disabled}
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()} 
              className="gap-2 text-xs px-3 py-1.5 h-8"
              disabled={disabled}
            >
              <Upload size={14} /> {preview ? 'Change Image' : 'Upload Image'}
            </Button>
            
            {navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setMode('camera')} 
                className="gap-2 text-xs px-3 py-1.5 h-8"
                disabled={disabled}
              >
                <Camera size={14} /> Take Photo
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AvatarUpload;
