import React, { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QrShareCardProps {
  url: string;
  size?: number;
}

const QrShareCard = forwardRef<SVGSVGElement, QrShareCardProps>(
  function QrShareCard({ url, size = 200 }, ref) {
    return (
      <div
        style={{
          padding: 14,
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e9ecef',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          display: 'inline-flex',
        }}
      >
        <QRCodeSVG ref={ref} value={url} size={size} includeMargin />
      </div>
    );
  }
);

export default QrShareCard;

// Serializa o SVG do QR Code e baixa como PNG em alta resolução — pronto para
// impressão no mural da igreja.
export function downloadQrPng(svg: SVGSVGElement | null, filename: string): void {
  if (!svg) return;
  const source = new XMLSerializer().serializeToString(svg);
  const size = svg.viewBox.baseVal.width || 200;
  const scale = 6;
  const canvas = document.createElement('canvas');
  canvas.width = size * scale;
  canvas.height = size * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = new Image();
  img.onload = () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };
  img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(source)))}`;
}
