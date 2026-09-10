import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QrShareCardProps {
  url: string;
  size?: number;
}

export default function QrShareCard({ url, size = 200 }: QrShareCardProps) {
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
      <QRCodeSVG value={url} size={size} includeMargin />
    </div>
  );
}