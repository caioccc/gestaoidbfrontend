import React, { forwardRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../i18n';
import type { CardConfig, CardTheme, Member } from '../types';
import type { ChurchContact } from '../hooks/useChurchCardConfig';
import { DEFAULT_CARD_CONFIG } from '../hooks/useChurchCardConfig';
import { cardValidityDate, formatCardDate, memberQrValidationUrl } from '../utils/memberCard';

const CARD_W = 400;
const CARD_H = 250;

const BLACK_GOLD = '#d4af37';
const BLACK_GOLD_SOFT = 'rgba(212, 175, 55, 0.35)';
const BLACK_GOLD_FAINT = 'rgba(212, 175, 55, 0.25)';
const BLACK_BG_TOP = '#0f1115';
const BLACK_BG_BOTTOM = '#181a20';
const BLACK_TEXT = '#f5f2e8';
const BLACK_MUTED = '#9aa0a6';

function resolveCardTheme(cardTheme?: CardTheme, config?: CardConfig): CardTheme {
  return cardTheme ?? config?.card_theme ?? 'CLASSIC';
}

const CARD_EMPTY_VALUE = '---';

function cleanCardValue(value?: string | null): string {
  return String(value ?? '').trim();
}

function displayCardValue(value?: string | null, fallback = CARD_EMPTY_VALUE): string {
  return cleanCardValue(value) || fallback;
}

function formatCardDateValue(value?: string | null): string {
  const text = cleanCardValue(value);
  if (!text) return CARD_EMPTY_VALUE;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return text;
}

function formatCardCpf(value?: string | null): string {
  const text = cleanCardValue(value);
  if (!text) return CARD_EMPTY_VALUE;
  const digits = text.replace(/\D/g, '');
  if (digits.length !== 11) return text;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

interface CardAddressSource {
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}

function formatCardAddress(source?: CardAddressSource | null): string {
  if (!source) return '';
  const streetLine = [cleanCardValue(source.street), cleanCardValue(source.number)]
    .filter(Boolean)
    .join(', ');
  const city = cleanCardValue(source.city);
  const state = cleanCardValue(source.state);
  const cityLine = [city, state].filter(Boolean).join('/');
  return [streetLine, cleanCardValue(source.neighborhood), cityLine]
    .filter(Boolean)
    .join(' · ');
}

function resolveCardAddress(member: Member, churchContact?: ChurchContact): string {
  const memberAddress = formatCardAddress({
    street: member.street,
    number: member.number,
    neighborhood: member.neighborhood,
    city: member.city,
    state: member.state,
  });
  return memberAddress || formatCardAddress(churchContact);
}

interface MemberCardFacesProps {
  member: Member;
  churchName: string;
  config?: CardConfig;
  churchContact?: ChurchContact;
  cardTheme?: CardTheme;
  publicHash?: string | null;
  qrHash?: string | null;
}

function resolveCardQrCode(member: Member, qrHash?: string | null): string {
  return cleanCardValue(qrHash || member.qr_hash);
}

export function MemberCardFront({ member, churchName, config, cardTheme }: MemberCardFacesProps) {
  const theme = resolveCardTheme(cardTheme, config);
  if (theme === 'BLACK_PREMIUM') {
    return (
      <BlackPremiumCardFront
        member={member}
        churchName={churchName}
        config={config}
        cardTheme={theme}
      />
    );
  }
  return <ClassicCardFront member={member} churchName={churchName} config={config} />;
}

function ClassicCardFront({ member, churchName, config }: MemberCardFacesProps) {
  const { t } = useLanguage();
  const cfg = config ?? DEFAULT_CARD_CONFIG;
  const primary = cfg.card_primary_color || DEFAULT_CARD_CONFIG.card_primary_color;
  const secondary = cfg.card_secondary_color || DEFAULT_CARD_CONFIG.card_secondary_color;
  const validity = cardValidityDate(cfg);

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  };
  const valueStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: '#0f172a',
    maxWidth: 120,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        background: '#ffffff',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #dee2e6',
        boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
        fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
        position: 'relative',
      }}
    >
      <div
        style={{
          height: 74,
          background: `linear-gradient(90deg, ${primary} 0%, ${secondary} 100%)`,
          padding: '12px 18px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>
            {churchName}
          </div>
          <div style={{ fontSize: 11, opacity: 0.92 }}>{t.memberCard.title}</div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, opacity: 0.9 }}>
          {validity.getFullYear()}
        </div>
      </div>

      <div style={{ padding: '14px 18px', display: 'flex', gap: 16 }}>
        {member.photo ? (
          <img
            src={member.photo}
            alt=""
            style={{
              width: 78,
              height: 78,
              borderRadius: '50%',
              objectFit: 'cover',
              border: `2px solid ${primary}`,
              background: '#e9ecef',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 78,
              height: 78,
              borderRadius: '50%',
              background: '#e0f2f1',
              color: primary,
              border: `2px solid ${primary}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {member.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: '#0f172a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {member.name || '—'}
          </div>
          <div
            style={{
              marginTop: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ display: 'flex', gap: 20 }}>
              <div>
                <div style={labelStyle}>{t.memberCard.registration}</div>
                <div style={valueStyle}>
                  {member.card_number || t.memberCard.notGenerated}
                </div>
              </div>
              <div>
                <div style={labelStyle}>{t.memberCard.birthDate}</div>
                <div style={valueStyle}>{formatCardDateValue(member.birth_date)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div>
                <div style={labelStyle}>{t.memberCard.maritalStatus}</div>
                <div style={valueStyle}>{displayCardValue(member.marital_status_display || member.marital_status)}</div>
              </div>
              <div>
                <div style={labelStyle}>{t.memberCard.cpf}</div>
                <div style={valueStyle}>{formatCardCpf(member.cpf)}</div>
              </div>
            </div>
            <div>
              <div style={labelStyle}>{t.memberCard.validity}</div>
              <div style={valueStyle}>{formatCardDate(validity)}</div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 46,
          background: '#f1f5f9',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 18px',
        }}
      >
        </div>
    </div>
  );
}

function BlackPremiumCardFront({ member, churchName, config }: MemberCardFacesProps) {
  const { t } = useLanguage();
  const cfg = config ?? DEFAULT_CARD_CONFIG;
  const validity = cardValidityDate(cfg);

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    color: BLACK_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  };
  const valueStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: BLACK_TEXT,
    maxWidth: 120,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };
  const goldValueStyle: React.CSSProperties = {
    ...valueStyle,
    color: BLACK_GOLD,
  };

  return (
    <div
      data-theme="BLACK_PREMIUM"
      style={{
        width: CARD_W,
        height: CARD_H,
        background: `linear-gradient(135deg, ${BLACK_BG_TOP} 0%, ${BLACK_BG_BOTTOM} 100%)`,
        borderRadius: 12,
        overflow: 'hidden',
        border: `1px solid ${BLACK_GOLD_SOFT}`,
        boxShadow: '0 8px 20px rgba(0,0,0,0.55)',
        fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
        position: 'relative',
      }}
    >
      <div
        style={{
          height: 74,
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${BLACK_GOLD_SOFT}`,
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2, color: BLACK_TEXT }}>
            {churchName}
          </div>
          <div style={{ fontSize: 11, color: BLACK_GOLD, opacity: 0.95 }}>{t.memberCard.title}</div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: BLACK_GOLD }}>
          {validity.getFullYear()}
        </div>
      </div>

      <div style={{ padding: '14px 18px', display: 'flex', gap: 16 }}>
        {member.photo ? (
          <img
            src={member.photo}
            alt=""
            style={{
              width: 78,
              height: 78,
              borderRadius: '50%',
              objectFit: 'cover',
              border: `2px solid ${BLACK_GOLD}`,
              background: '#23262d',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 78,
              height: 78,
              borderRadius: '50%',
              background: '#1d2025',
              color: BLACK_GOLD,
              border: `2px solid ${BLACK_GOLD}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {member.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: BLACK_TEXT,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {member.name || '—'}
          </div>
          <div
            style={{
              marginTop: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ display: 'flex', gap: 20 }}>
              <div>
                <div style={labelStyle}>{t.memberCard.registration}</div>
                <div style={goldValueStyle}>
                  {member.card_number || t.memberCard.notGenerated}
                </div>
              </div>
              <div>
                <div style={labelStyle}>{t.memberCard.birthDate}</div>
                <div style={valueStyle}>{formatCardDateValue(member.birth_date)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div>
                <div style={labelStyle}>{t.memberCard.maritalStatus}</div>
                <div style={valueStyle}>{displayCardValue(member.marital_status_display || member.marital_status)}</div>
              </div>
              <div>
                <div style={labelStyle}>{t.memberCard.cpf}</div>
                <div style={valueStyle}>{formatCardCpf(member.cpf)}</div>
              </div>
            </div>
            <div>
              <div style={labelStyle}>{t.memberCard.validity}</div>
              <div style={valueStyle}>{formatCardDate(validity)}</div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 46,
          background: '#15171b',
          borderTop: `1px solid ${BLACK_GOLD_FAINT}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 18px',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontStyle: 'italic',
            color: BLACK_MUTED,
            textAlign: 'center',
          }}
        >
          {cfg.card_front_phrase || t.memberCard.verse}
        </div>
      </div>
    </div>
  );
}

export function MemberCardBack({ member, churchName, config, churchContact, cardTheme, qrHash }: MemberCardFacesProps) {
  const theme = resolveCardTheme(cardTheme, config);
  if (theme === 'BLACK_PREMIUM') {
    return (
      <BlackPremiumCardBack
        member={member}
        churchName={churchName}
        config={config}
        churchContact={churchContact}
        qrHash={qrHash}
      />
    );
  }
  return (
    <ClassicCardBack
      member={member}
      churchName={churchName}
      config={config}
      churchContact={churchContact}
      qrHash={qrHash}
    />
  );
}

function ClassicCardBack({ member, churchName, config, churchContact, qrHash }: Omit<MemberCardFacesProps, 'cardTheme' | 'publicHash'>) {
  const { t } = useLanguage();
  const cfg = config ?? DEFAULT_CARD_CONFIG;
  const primary = cfg.card_primary_color || DEFAULT_CARD_CONFIG.card_primary_color;
  const secondary = cfg.card_secondary_color || DEFAULT_CARD_CONFIG.card_secondary_color;
  const address = resolveCardAddress(member, churchContact);
  const phone = displayCardValue(member.phone || churchContact?.phone, '');
  const baptism = formatCardDateValue(member.baptism_date);
  const qrCode = resolveCardQrCode(member, qrHash);
  const validationUrl = qrCode ? memberQrValidationUrl(qrCode) : '';

  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        background: '#ffffff',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #dee2e6',
        boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
        fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
        position: 'relative',
      }}
    >
      <div
        style={{
          height: 46,
          background: `linear-gradient(90deg, ${primary} 0%, ${secondary} 100%)`,
          padding: '0 18px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700 }}>{churchName}</div>
        <div style={{ fontSize: 10, opacity: 0.92 }}>{t.memberCard.backTitle}</div>
      </div>

      <div style={{ padding: '10px 18px 6px', display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              minHeight: 46,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 8px',
              borderRadius: 10,
              background: '#f8fafc',
              border: `1px solid ${primary}22`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontStyle: 'italic',
                fontWeight: 600,
                color: '#334155',
                textAlign: 'center',
                lineHeight: 1.35,
              }}
            >
              {cfg.card_back_phrase || t.memberCard.backPhraseDefault}
            </div>
          </div>

          <div
            style={{
              margin: '6px 0',
              height: 1,
              background: 'linear-gradient(90deg, transparent, #cbd5e1, transparent)',
            }}
          />

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {t.memberCard.backAddress}
              </div>
              <div
                style={{
                  marginTop: 3,
                  fontSize: 10,
                  color: '#0f172a',
                  fontWeight: 600,
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                }}
              >
                {address || t.memberCard.backNoAddress}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>
                <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {t.memberCard.backContact}
                </div>
                <div
                  style={{
                    marginTop: 3,
                    fontSize: 10,
                    color: '#0f172a',
                    fontWeight: 600,
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                  }}
                >
                  {phone || t.memberCard.backNoContact}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {t.memberCard.baptismDate}
                </div>
                <div style={{ marginTop: 3, fontSize: 10, color: '#0f172a', fontWeight: 600 }}>
                  {baptism}
                </div>
              </div>
            </div>
          </div>
        </div>

        {validationUrl && (
          <div
            style={{
              width: 78,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                padding: 4,
                borderRadius: 8,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'inline-flex',
              }}
            >
              <QRCodeSVG value={validationUrl} size={62} fgColor="#0f172a" bgColor="#ffffff" />
            </div>
            <div style={{ marginTop: 4, fontSize: 8, fontWeight: 700, color: '#475569', letterSpacing: 0.5 }}>
              {qrCode}
            </div>
            <div style={{ marginTop: 2, fontSize: 7, color: '#64748b', textAlign: 'center', lineHeight: 1.2 }}>
              {t.memberCard.scanHint}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          fontSize: 10,
          color: '#64748b',
        }}
      >
        {t.memberCard.nationalValidity}
      </div>
    </div>
  );
}

interface BlackPremiumCardBackProps {
  member: Member;
  churchName: string;
  config?: CardConfig;
  churchContact?: ChurchContact;
  qrHash?: string | null;
}

function BlackPremiumCardBack({ member, churchName, config, churchContact, qrHash }: BlackPremiumCardBackProps) {
  const { t } = useLanguage();
  const cfg = config ?? DEFAULT_CARD_CONFIG;
  const qrCode = resolveCardQrCode(member, qrHash);
  const validationUrl = qrCode ? memberQrValidationUrl(qrCode) : '';
  const address = resolveCardAddress(member, churchContact);
  const phone = displayCardValue(member.phone || churchContact?.phone, '');
  const baptism = formatCardDateValue(member.baptism_date);

  const labelStyle: React.CSSProperties = {
    fontSize: 9,
    color: BLACK_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  };
  const valueStyle: React.CSSProperties = {
    marginTop: 3,
    fontSize: 10,
    fontWeight: 600,
    color: BLACK_TEXT,
    lineHeight: 1.35,
    wordBreak: 'break-word',
  };

  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        background: `linear-gradient(135deg, ${BLACK_BG_TOP} 0%, ${BLACK_BG_BOTTOM} 100%)`,
        borderRadius: 12,
        overflow: 'hidden',
        border: `1px solid ${BLACK_GOLD_SOFT}`,
        boxShadow: '0 8px 20px rgba(0,0,0,0.55)',
        fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
        position: 'relative',
      }}
    >
      <div
        style={{
          height: 46,
          padding: '0 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${BLACK_GOLD_SOFT}`,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: BLACK_TEXT }}>{churchName}</div>
        <div
          style={{
            fontSize: 10,
            color: BLACK_GOLD,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {t.memberCard.backTitle}
        </div>
      </div>

      <div style={{ padding: '10px 18px 6px', display: 'flex', gap: 12 }}>
        <div
          style={{
            width: 86,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {validationUrl ? (
            <>
              <div
                style={{
                  padding: 6,
                  borderRadius: 8,
                  background: '#ffffff',
                  display: 'inline-flex',
                }}
              >
                <QRCodeSVG value={validationUrl} size={68} fgColor="#0f1115" bgColor="#ffffff" />
              </div>
              <div
                style={{
                  marginTop: 5,
                  fontSize: 9,
                  color: BLACK_GOLD,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                }}
              >
                {qrCode}
              </div>
              <div
                style={{
                  marginTop: 3,
                  fontSize: 8,
                  color: BLACK_MUTED,
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  lineHeight: 1.3,
                }}
              >
                {t.memberCard.scanHint}
              </div>
            </>
          ) : (
            <div
              style={{
                width: '100%',
                minHeight: 86,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${BLACK_GOLD_SOFT}`,
                padding: 8,
                textAlign: 'center',
                fontSize: 9,
                fontStyle: 'italic',
                color: BLACK_MUTED,
                lineHeight: 1.4,
              }}
            >
              {cfg.card_back_phrase || t.memberCard.backPhraseDefault}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={labelStyle}>{t.memberCard.backAddress}</div>
            <div style={valueStyle}>{address || t.memberCard.backNoAddress}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <div style={labelStyle}>{t.memberCard.backContact}</div>
              <div style={valueStyle}>{phone || t.memberCard.backNoContact}</div>
            </div>
            <div>
              <div style={labelStyle}>{t.memberCard.baptismDate}</div>
              <div style={valueStyle}>{baptism}</div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderTop: `1px solid ${BLACK_GOLD_FAINT}`,
          fontSize: 10,
          color: BLACK_GOLD,
        }}
      >
        {t.memberCard.nationalValidity}
      </div>
    </div>
  );
}

interface MemberCardProps extends MemberCardFacesProps {
  interactive?: boolean;
}

const MemberCard = forwardRef<HTMLDivElement, MemberCardProps>(
  ({ member, churchName, config, churchContact, cardTheme, publicHash, qrHash, interactive = true }, ref) => {
    const { t } = useLanguage();
    const [flipped, setFlipped] = useState(false);
    const theme = resolveCardTheme(cardTheme, config);

    return (
      <div
        ref={ref}
        style={{ width: CARD_W, height: CARD_H, perspective: 1200 }}
        onClick={interactive ? () => setFlipped((v) => !v) : undefined}
        title={interactive ? t.memberCard.flipHint : undefined}
        role={interactive ? 'button' : undefined}
        data-testid="member-card-flip"
        data-theme={theme}
      >
        <div
          style={{
            position: 'relative',
            width: CARD_W,
            height: CARD_H,
            transformStyle: 'preserve-3d',
            transition: 'transform 0.45s ease',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            cursor: interactive ? 'pointer' : 'default',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <MemberCardFront
              member={member}
              churchName={churchName}
              config={config}
              churchContact={churchContact}
              cardTheme={cardTheme}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <MemberCardBack
              member={member}
              churchName={churchName}
              config={config}
              churchContact={churchContact}
              cardTheme={cardTheme}
              publicHash={publicHash}
              qrHash={qrHash}
            />
          </div>
        </div>
      </div>
    );
  }
);

MemberCard.displayName = 'MemberCard';

export const MemberCardPair = forwardRef<HTMLDivElement, MemberCardFacesProps>(
  ({ member, churchName, config, churchContact, cardTheme, publicHash, qrHash }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: CARD_W,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          background: 'transparent',
        }}
      >
        <MemberCardFront
          member={member}
          churchName={churchName}
          config={config}
          churchContact={churchContact}
          cardTheme={cardTheme}
        />
        <MemberCardBack
          member={member}
          churchName={churchName}
          config={config}
          churchContact={churchContact}
          cardTheme={cardTheme}
          publicHash={publicHash}
          qrHash={qrHash}
        />
      </div>
    );
  }
);

MemberCardPair.displayName = 'MemberCardPair';

export default MemberCard;