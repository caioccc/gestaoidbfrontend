import React, { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../i18n';
import type { Member } from '../types';
import { memberQrValidationUrl } from '../utils/memberCard';

interface MemberQrBadgeProps {
  member: Member;
  churchName: string;
}

const MemberQrBadge = forwardRef<HTMLDivElement, MemberQrBadgeProps>(
  function MemberQrBadge({ member, churchName }, ref) {
    const { t } = useLanguage();
    const code = (member.qr_hash || '').trim().toUpperCase();
    const url = code ? memberQrValidationUrl(code) : '';

    return (
      <div
        ref={ref}
        style={{
          width: 420,
          padding: 24,
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid #dee2e6',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
          {t.memberCard.qrBadgeTitle}
        </div>
        <div
          style={{
            margin: '16px auto 12px',
            padding: 12,
            width: 308,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {url ? (
            <QRCodeSVG value={url} size={280} includeMargin fgColor="#0f172a" bgColor="#ffffff" />
          ) : (
            <div style={{ width: 280, height: 280 }} />
          )}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, color: '#0f172a' }}>
          {code || '---'}
        </div>
        <div style={{ marginTop: 10, fontSize: 16, fontWeight: 700, color: '#334155' }}>
          {member.name}
        </div>
        <div style={{ marginTop: 2, fontSize: 13, color: '#64748b' }}>{churchName}</div>
        <div style={{ marginTop: 14, fontSize: 11, color: '#64748b' }}>
          {t.memberCard.qrBadgeHint}
        </div>
      </div>
    );
  }
);

export default MemberQrBadge;
