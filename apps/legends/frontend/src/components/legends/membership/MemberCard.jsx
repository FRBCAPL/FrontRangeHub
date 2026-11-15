import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function MemberCard({ name, publicCode, status }) {
  const [qr, setQr] = useState('');

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(publicCode, {
      margin: 1,
      width: 280,
      color: { dark: '#0D0D0F', light: '#FFFFFF' },
    })
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setQr('');
      });
    return () => {
      cancelled = true;
    };
  }, [publicCode]);

  return (
    <article className="lg-member-card">
      <div className="lg-member-card__top">
        <img src="/legends/legends-wordmark.png" alt="" width="940" height="788" className="lg-member-card__logo" />
        <p className="lg-eyebrow lg-eyebrow--tight">Legends Rewards</p>
      </div>
      <div className="lg-member-card__body">
        <h2 className="lg-display lg-display--card">{name}</h2>
        <p className="lg-card__muted lg-mt-2">Status: {status === 'ACTIVE' ? 'Active' : status}</p>
        <p className="lg-member-card__code lg-mt-4">{publicCode}</p>
      </div>
      <div className="lg-member-card__qr">
        {qr ? <img src={qr} alt={`Membership code ${publicCode}`} width="180" height="180" /> : null}
        <p className="lg-member-card__qr-note">
          This code identifies the membership. Scanning it does not redeem rewards or authorize a purchase.
        </p>
      </div>
    </article>
  );
}
