import React, { forwardRef, useState } from 'react';
import { useLanguage } from '../i18n';
import type { CardConfig, Member } from '../types';
import type { ChurchContact } from '../hooks/useChurchCardConfig';
import { DEFAULT_CARD_CONFIG } from '../hooks/useChurchCardConfig';
import { cardValidityDate, formatCardDate } from '../utils/memberCard';

const CARD_W = 400;
const CARD_H = 250;

interface MemberCardFacesProps {
  member: Member;
  churchName: string;
  config?: CardConfig;
  churchContact?: ChurchContact;
  hideAddress?: boolean;
}

export function MemberCardFront({ member, churchName, config }: MemberCardFacesProps) {
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
              marginTop: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div style={labelStyle}>{t.memberCard.registration}</div>
                <div style={valueStyle}>
                  {member.card_number || t.memberCard.notGenerated}
                </div>
              </div>
              <div>
                <div style={labelStyle}>{t.memberCard.entry}</div>
                <div style={valueStyle}>{member.church_entry_display || '—'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div style={labelStyle}>{t.memberCard.situation}</div>
                <div style={valueStyle}>
                  {member.status === 'ACTIVE'
                    ? t.memberCard.situationActive
                    : t.memberCard.situationInactive}
                </div>
              </div>
              <div>
                <div style={labelStyle}>{t.memberCard.validity}</div>
                <div style={valueStyle}>{formatCardDate(validity)}</div>
              </div>
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
        <div
          style={{
            fontSize: 11,
            fontStyle: 'italic',
            color: '#475569',
            textAlign: 'center',
          }}
        >
          {cfg.card_front_phrase || t.memberCard.verse}
        </div>
      </div>
    </div>
  );
}

export function MemberCardBack({ churchName, config, churchContact, hideAddress }: MemberCardFacesProps) {
  const { t } = useLanguage();
  const cfg = config ?? DEFAULT_CARD_CONFIG;
  const primary = cfg.card_primary_color || DEFAULT_CARD_CONFIG.card_primary_color;
  const secondary = cfg.card_secondary_color || DEFAULT_CARD_CONFIG.card_secondary_color;
  const contact = churchContact;

  const addressParts = [
    [contact?.street, contact?.number].filter(Boolean).join(', '),
    contact?.neighborhood,
    contact?.city && contact?.state
      ? `${contact.city}/${contact.state}`
      : contact?.city || undefined,
  ].filter(Boolean);

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

      <div style={{ padding: '12px 18px 8px' }}>
        <div
          style={{
            minHeight: 66,
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
              fontSize: 13,
              fontStyle: 'italic',
              fontWeight: 600,
              color: '#334155',
              textAlign: 'center',
              lineHeight: 1.45,
            }}
          >
            {cfg.card_back_phrase || t.memberCard.backPhraseDefault}
          </div>
        </div>

        <div
          style={{
            margin: '10px 0 8px',
            height: 1,
            background: 'linear-gradient(90deg, transparent, #cbd5e1, transparent)',
          }}
        />

        <div style={{ display: 'flex', gap: 20 }}>
          {hideAddress ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {t.memberCard.backContact}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  color: '#0f172a',
                  fontWeight: 600,
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}
              >
                {contact?.phone ? <div>{contact.phone}</div> : null}
                {contact?.city && contact?.state ? (
                  <div>{`${contact.city}/${contact.state}`}</div>
                ) : null}
                {!contact?.phone ? <div>{t.memberCard.backNoContact}</div> : null}
              </div>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {t.memberCard.backAddress}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: '#0f172a',
                    fontWeight: 600,
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}
                >
                  {addressParts.length ? addressParts.map((p) => (
                    <div key={p}>{p}</div>
                  )) : (
                    t.memberCard.backNoAddress
                  )}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {t.memberCard.backContact}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: '#0f172a',
                    fontWeight: 600,
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}
                >
                  {contact?.phone ? <div>{contact.phone}</div> : null}
                  {contact?.pastor_name ? <div>{contact.pastor_name}</div> : null}
                  {!contact?.phone && !contact?.pastor_name ? (
                    <div>{t.memberCard.backNoContact}</div>
                  ) : null}
                </div>
              </div>
            </>
          )}
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
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          fontSize: 10,
          color: '#64748b',
        }}
      >
        {t.memberCard.backSignature} ______________________
      </div>
    </div>
  );
}

interface MemberCardProps extends MemberCardFacesProps {
  interactive?: boolean;
}

const MemberCard = forwardRef<HTMLDivElement, MemberCardProps>(
  ({ member, churchName, config, churchContact, hideAddress, interactive = true }, ref) => {
    const { t } = useLanguage();
    const [flipped, setFlipped] = useState(false);

    return (
      <div
        ref={ref}
        style={{ width: CARD_W, height: CARD_H, perspective: 1200 }}
        onClick={interactive ? () => setFlipped((v) => !v) : undefined}
        title={interactive ? t.memberCard.flipHint : undefined}
        role={interactive ? 'button' : undefined}
        data-testid="member-card-flip"
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
              hideAddress={hideAddress}
            />
          </div>
        </div>
      </div>
    );
  }
);

MemberCard.displayName = 'MemberCard';

export const MemberCardPair = forwardRef<HTMLDivElement, MemberCardFacesProps>(
  ({ member, churchName, config, churchContact, hideAddress }, ref) => {
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
        />
        <MemberCardBack
          member={member}
          churchName={churchName}
          config={config}
          churchContact={churchContact}
          hideAddress={hideAddress}
        />
      </div>
    );
  }
);

MemberCardPair.displayName = 'MemberCardPair';

export default MemberCard;