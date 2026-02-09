import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  accentColor?: string; // Hex color for the bars
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyser, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match display size for retina sharpness
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    if (!analyser) {
       // Draw Idle State
       ctx.clearRect(0, 0, rect.width, rect.height);
       ctx.beginPath();
       ctx.moveTo(0, rect.height / 2);
       ctx.lineTo(rect.width, rect.height / 2);
       ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)'; // Indigo-ish faint line
       ctx.lineWidth = 2;
       ctx.stroke();
       return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, rect.width, rect.height);

      // Bar config
      const barCount = 40; // Fewer, thicker bars for modern look
      const step = Math.floor(bufferLength / barCount);
      const gap = 4;
      const barWidth = (rect.width / barCount) - gap;

      // Create Gradient
      const gradient = ctx.createLinearGradient(0, rect.height, 0, 0);
      gradient.addColorStop(0, '#818cf8'); // Indigo 400
      gradient.addColorStop(1, '#c084fc'); // Purple 400

      ctx.fillStyle = gradient;

      for (let i = 0; i < barCount; i++) {
        // Average out the frequency for this step to get a smoother bar
        let value = 0;
        for (let j = 0; j < step; j++) {
            value += dataArray[(i * step) + j];
        }
        value = value / step;

        const percent = value / 255;
        // Non-linear scaling for better visuals on low volume
        const height = Math.max(4, (Math.pow(percent, 1.5) * rect.height * 0.8)); 
        
        // Draw rounded rect
        const x = i * (barWidth + gap) + (gap / 2);
        const y = (rect.height - height) / 2;
        
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, 4);
        ctx.fill();
      }
    };

    if (isPlaying) {
      draw();
    } else {
      // Draw static line
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.beginPath();
      ctx.moveTo(0, rect.height / 2);
      ctx.lineTo(rect.width, rect.height / 2);
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyser, isPlaying]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default AudioVisualizer;