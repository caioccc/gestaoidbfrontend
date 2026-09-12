import React from 'react';
import type { CertificateLayoutMode, CertificateType } from '../types';
import { CERT_A4_H_PX, CERT_A4_W_PX, formatPtDate } from '../utils/certificate';

export interface CertificateChurchData {
  name: string;
  logo: string | null;
  city: string;
  state: string;
}

export interface CertificateData {
  certificate_type: CertificateType;
  type_label: string;
  recipient_name: string;
  event_date: string;
  officiant_name: string;
  father_name?: string;
  mother_name?: string;
  scripture_verse?: string;
  registry_book?: string;
  registry_page?: string;
  registry_number?: string;
}

export interface CertificateLabels {
  certificateTitle: string;
  grants: string;
  childOf: string;
  officiatedBy: string;
  dateLabel: string;
  registry: string;
  book: string;
  page: string;
  term: string;
  placeAndDate: string;
  footer: string;
}

interface CertificateDocumentProps {
  church: CertificateChurchData;
  data: CertificateData;
  layoutMode: CertificateLayoutMode;
  backgroundImage?: string | null;
  labels: CertificateLabels;
  innerRef?: React.Ref<HTMLDivElement>;
}

const NAVY = '#1f4e79';
const GOLD = '#b08d3f';
const IVORY = '#fdfbf7';

const sharedOuter: React.CSSProperties = {
  width: CERT_A4_W_PX,
  height: CERT_A4_H_PX,
  position: 'relative',
  overflow: 'hidden',
  boxSizing: 'border-box',
  fontFamily: "Georgia, 'Times New Roman', serif",
};

export function CertificateDocument({
  church,
  data,
  layoutMode,
  backgroundImage,
  labels,
  innerRef,
}: CertificateDocumentProps) {
  const isImage = layoutMode === 'CUSTOM_IMAGE';

  if (isImage) {
    const overlay: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      margin: 'auto',
      width: '64%',
      height: '62%',
      background: 'rgba(255,255,255,0.72)',
      border: `2px solid ${GOLD}`,
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      gap: 10,
      color: NAVY,
    };
    return (
      <div
        ref={innerRef}
        style={{
          ...sharedOuter,
          backgroundImage: backgroundImage ? `url("${backgroundImage}")` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div style={overlay}>
          {church.logo ? (
            <img
              src={church.logo}
              alt=""
              style={{ height: 78, maxWidth: 220, objectFit: 'contain' }}
            />
          ) : null}
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: 2 }}>
            {data.type_label}
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.15 }}>
            {data.recipient_name}
          </div>
          {data.father_name || data.mother_name ? (
            <div style={{ fontSize: 18 }}>
              {labels.childOf}: {[data.father_name, data.mother_name].filter(Boolean).join(' e ')}
            </div>
          ) : null}
          {data.officiant_name ? (
            <div style={{ fontSize: 17 }}>
              {labels.officiatedBy}: {data.officiant_name}
            </div>
          ) : null}
          <div style={{ fontSize: 17, color: '#374151' }}>
            {labels.dateLabel}: {formatPtDate(data.event_date)}
          </div>
          {(data.registry_number || data.registry_page || data.registry_book) && (
            <div style={{ fontSize: 15, color: '#374151' }}>
              {labels.registry}:{' '}
              {[data.registry_number && `${labels.term} ${data.registry_number}`,
                data.registry_page && `${labels.page} ${data.registry_page}`,
                data.registry_book && `${labels.book} ${data.registry_book}`]
                .filter(Boolean)
                .join(' | ')}
            </div>
          )}
        </div>
      </div>
    );
  }

  const frame: React.CSSProperties = {
    position: 'absolute',
    inset: 26,
    border: `3px double ${GOLD}`,
    borderRadius: 6,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '56px 70px 40px',
    boxSizing: 'border-box',
  };

  return (
    <div ref={innerRef} style={{ ...sharedOuter, background: IVORY }}>
      <div style={frame}>
        {church.logo ? (
          <img
            src={church.logo}
            alt=""
            style={{ height: 74, maxWidth: 220, objectFit: 'contain', marginBottom: 14 }}
          />
        ) : null}
        {church.name ? (
          <div
            style={{
              color: NAVY,
              fontSize: 20,
              letterSpacing: 6,
              textTransform: 'uppercase',
              fontWeight: 600,
              textAlign: 'center',
              marginBottom: 10,
            }}
          >
            {church.name}
          </div>
        ) : null}
        <div
          style={{
            color: GOLD,
            fontSize: 40,
            letterSpacing: 12,
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 6,
            textAlign: 'center',
          }}
        >
          {labels.certificateTitle}
        </div>
        <div style={{ color: NAVY, fontSize: 24, marginBottom: 46, textAlign: 'center' }}>
          {data.type_label}
        </div>

        <div style={{ color: '#374151', fontSize: 18, textAlign: 'center' }}>
          {labels.grants}
        </div>
        <div
          style={{
            color: NAVY,
            fontSize: 44,
            fontWeight: 700,
            lineHeight: 1.1,
            textAlign: 'center',
            margin: '18px 0',
          }}
        >
          {data.recipient_name}
        </div>

        {data.father_name || data.mother_name ? (
          <div style={{ color: '#374151', fontSize: 18, textAlign: 'center', marginBottom: 16 }}>
            {labels.childOf}: {[data.father_name, data.mother_name].filter(Boolean).join(' e ')}
          </div>
        ) : null}

        {data.officiant_name ? (
          <div style={{ color: '#374151', fontSize: 18, textAlign: 'center', marginBottom: 16 }}>
            {labels.officiatedBy}: <b>{data.officiant_name}</b>
          </div>
        ) : null}

        <div
          style={{
            color: '#374151',
            fontSize: 17,
            textAlign: 'center',
            marginBottom: 18,
          }}
        >
          {labels.placeAndDate}: {church.city && church.state
            ? `${church.city} - ${church.state}, `
            : ''}
          {formatPtDate(data.event_date)}
        </div>

        {(data.registry_number || data.registry_page || data.registry_book) && (
          <div
            style={{
              color: '#4b5563',
              fontSize: 15,
              textAlign: 'center',
              borderTop: `1px solid ${GOLD}`,
              paddingTop: 14,
              marginBottom: 22,
            }}
          >
            {labels.registry}:{' '}
            {[data.registry_number && `${labels.term} ${data.registry_number}`,
              data.registry_page && `${labels.page} ${data.registry_page}`,
              data.registry_book && `${labels.book} ${data.registry_book}`]
              .filter(Boolean)
              .join(' | ')}
          </div>
        )}

        {data.scripture_verse ? (
          <div
            style={{
              color: NAVY,
              fontStyle: 'italic',
              fontSize: 16,
              textAlign: 'center',
              maxWidth: 820,
              marginBottom: 26,
            }}
          >
            “{data.scripture_verse}”
          </div>
        ) : null}

        <div
          style={{
            position: 'absolute',
            bottom: 26,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: 12,
          }}
        >
          {labels.footer}
        </div>
      </div>
    </div>
  );
}