import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { consignmentItemHref } from '../../utils/consignmentPaths.js';
import { tagText } from '../../utils/consignmentTagText.js';

function useQr(href) {
  const [qr, setQr] = useState('');
  useEffect(() => {
    if (!href) return undefined;
    let alive = true;
    QRCode.toDataURL(href, { width: 300, margin: 0 })
      .then((url) => { if (alive) setQr(url); })
      .catch(() => { if (alive) setQr(''); });
    return () => { alive = false; };
  }, [href]);
  return qr;
}

/** One printable shop tag. shape: 'card' (3.5" × 2") or 'hang' (2" × 3.5"). */
export default function ConsignmentTag({ item, rate, shape = 'card' }) {
  const t = tagText(item, rate);
  const href = item?.item_number ? consignmentItemHref(item.item_number) : '';
  const qr = useQr(href);
  return (
    <article className={`cs-tag cs-tag-${shape}`}>
      {shape === 'hang' ? <div className="cs-tag-hole" aria-hidden="true" /> : null}
      <header className="cs-tag-band">
        <span>FRPL Consignment</span>
        <span className="cs-tag-id">{t.id}</span>
      </header>
      <div className="cs-tag-body">
        <div className="cs-tag-qr">
          {qr ? <img src={qr} alt={`QR code for ${t.id}`} /> : <span className="cs-tag-qr-missing">{href}</span>}
          <span className="cs-tag-scan">{t.scan}</span>
        </div>
        <div className="cs-tag-info">
          <h2 className="cs-tag-name">{t.name}</h2>
          {t.sub ? <p className="cs-tag-sub">{t.sub}</p> : null}
          {t.bigPrice ? <p className={`cs-tag-price${t.isAuction ? ' cs-tag-price-auction' : ''}`}>{t.bigPrice}</p> : null}
          {t.priceNote ? <p className="cs-tag-note">{t.priceNote}</p> : null}
          {t.inspect ? <p className="cs-tag-inspect">{t.inspect}</p> : null}
        </div>
      </div>
      <footer className="cs-tag-foot">Legends Brews &amp; Cues</footer>
    </article>
  );
}
