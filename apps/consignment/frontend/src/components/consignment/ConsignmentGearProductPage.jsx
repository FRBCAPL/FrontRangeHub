import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CONSIGNMENT_PATH, LEGENDS, LEGENDS_MAP_URL, categoryLabel } from '../../data/consignmentConstants.js';
import { loadGearProduct } from '../../services/consignmentGearService.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import {
  activeVariants, defaultChoice, findVariant, optionValues, variantPrice,
} from '../../utils/consignmentGearMath.js';
import ConsignmentPhotoZoom from './ConsignmentPhotoZoom.jsx';
import ConsignmentContactButton from './ConsignmentContactButton.jsx';
import ConsignmentGearReserveBox from './ConsignmentGearReserveBox.jsx';
import ConsignmentTaxTotal from './ConsignmentTaxTotal.jsx';
import './consignment-shop.css';

const GEAR_PATH = `${CONSIGNMENT_PATH}/new`;

export default function ConsignmentGearProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [chosen, setChosen] = useState({});
  const [photo, setPhoto] = useState(0);
  const [zooming, setZooming] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (keepChoice) => {
    try {
      const row = await loadGearProduct(slug);
      if (!row) { setError('This product isn’t listed right now, or the link is outdated.'); return; }
      setProduct(row);
      if (!keepChoice) setChosen(defaultChoice(row));
    } catch (err) {
      setError(err.message);
    }
  }, [slug]);

  useEffect(() => {
    setProduct(null);
    setError('');
    setPhoto(0);
    load(false);
  }, [load]);

  if (error) {
    return (
      <div className="cs-page">
        <p className="cs-error">{error}</p>
        <Link to={GEAR_PATH}>Back to new gear</Link>
      </div>
    );
  }
  if (!product) return <div className="cs-page"><p className="cs-lede">Loading…</p></div>;

  const photos = product.photo_urls || [];
  const current = photos[photo] || photos[0];
  const variant = findVariant(product, chosen);
  const price = variantPrice(product, variant);
  const showMsrp = product.msrp && Number(product.msrp) > price;

  function choose(name, value) {
    const next = { ...chosen, [name]: value };
    if (findVariant(product, next)) { setChosen(next); return; }
    const alt = activeVariants(product).find((v) => v.options?.[name] === value);
    setChosen(alt ? { ...alt.options } : next);
  }

  return (
    <div className="cs-page cs-gear-page">
      {product.status !== 'active' ? (
        <p className="cs-example-banner"><strong>Admin preview:</strong> this product is {product.status}, so shoppers can’t see it.</p>
      ) : null}
      <p className="cs-kicker">New · {product.brand || categoryLabel(product.category)}</p>
      <h1>{product.name}</h1>
      <div className="cs-hero">
        {current ? (
          <button type="button" className="cs-hero-zoom" onClick={() => setZooming(true)} aria-label="Open photo to zoom">
            <img src={current} alt={product.name} />
            <span className="cs-hero-zoom-hint" aria-hidden="true">Tap to zoom</span>
          </button>
        ) : <div className="cs-ph">🎱</div>}
        {photos.length > 1 ? (
          <div className="cs-thumbs">
            {photos.map((src, i) => (
              <button
                key={src}
                type="button"
                className={i === photo ? 'active' : ''}
                onClick={() => setPhoto(i)}
                aria-label={`Show photo ${i + 1} of ${photos.length}`}
                aria-pressed={i === photo}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {zooming && photos.length ? (
        <ConsignmentPhotoZoom photos={photos} start={Math.min(photo, photos.length - 1)} alt={product.name} onClose={() => setZooming(false)} />
      ) : null}
      <ConsignmentTaxTotal amount={price} included={Boolean(product.price_tax_included)}>
        {showMsrp ? <>{product.price_tax_included ? '' : ' · '}list <s className="cs-gear-msrp" title="Manufacturer’s list price">{formatDollars(product.msrp)}</s></> : null}
      </ConsignmentTaxTotal>
      {(product.option_names || []).length ? (
        <div className="cs-gear-options">
          {product.option_names.map((name) => (
            <label key={name}>
              {name}
              <select value={chosen[name] ?? ''} onChange={(e) => choose(name, e.target.value)}>
                {optionValues(product, name).map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          ))}
        </div>
      ) : null}
      <ConsignmentGearReserveBox product={product} variant={variant} onReserved={() => load(true)} />
      {product.description ? <p className="cs-gear-desc">{product.description}</p> : null}
      <p className="cs-meta cs-pickup">
        📍 Pay and pick up at{' '}
        <a href={LEGENDS_MAP_URL} target="_blank" rel="noopener noreferrer">
          {LEGENDS.name}, {LEGENDS.address ? `${LEGENDS.address}, ` : ''}{LEGENDS.city}, {LEGENDS.state}
        </a>
        . Nothing ships.
      </p>
      <p className="cs-hint">Brand new from FRPL. Reserving is free; this site does not take payment. Totals include sales tax.</p>
      <div className="cs-actions">
        <Link className="cs-btn-secondary" to={GEAR_PATH}>Back to new gear</Link>
        <ConsignmentContactButton topic="buying">Ask about this product</ConsignmentContactButton>
      </div>
    </div>
  );
}
