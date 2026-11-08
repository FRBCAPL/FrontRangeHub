import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CONSIGNMENT_PATH, LEGENDS, LEGENDS_MAP_URL, categoryLabel } from '../../data/consignmentConstants.js';
import { loadGearProduct } from '../../services/consignmentGearService.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import {
  activeVariants, defaultChoice, findVariant, optionValues, variantPrice,
} from '../../utils/consignmentGearMath.js';
import { taxPercent, withTax } from '../../utils/consignmentTax.js';
import useTaxRate from '../../hooks/useTaxRate.js';
import ConsignmentGallery from './ConsignmentGallery.jsx';
import ConsignmentBackLink from './ConsignmentBackLink.jsx';
import ConsignmentBuyBar from './ConsignmentBuyBar.jsx';
import ConsignmentContactButton from './ConsignmentContactButton.jsx';
import ConsignmentGearReserveBox from './ConsignmentGearReserveBox.jsx';
import ConsignmentTaxTotal from './ConsignmentTaxTotal.jsx';
import './consignment-shop.css';
import './consignment-product.css';

const GEAR_PATH = `${CONSIGNMENT_PATH}/new`;

export default function ConsignmentGearProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [chosen, setChosen] = useState({});
  const [error, setError] = useState('');
  const buyRef = useRef(null);
  const taxRate = useTaxRate();

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
    <div className="cs-page cs-gear-page cs-product-page">
      {product.status !== 'active' ? (
        <p className="cs-example-banner"><strong>Admin preview:</strong> this product is {product.status}, so shoppers can’t see it.</p>
      ) : null}
      <ConsignmentBackLink to={GEAR_PATH} label="New gear" />

      <div className="cs-product">
        <div className="cs-product-head">
          <p className="cs-kicker">New · {product.brand || categoryLabel(product.category)}</p>
          <h1>{product.name}</h1>
        </div>

        <div className="cs-product-media">
          <ConsignmentGallery photos={product.photo_urls || []} alt={product.name} />
        </div>

        <div className="cs-product-buy" ref={buyRef} tabIndex={-1}>
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
          <p className="cs-meta cs-pickup">
            📍 Pay and pick up at{' '}
            <a href={LEGENDS_MAP_URL} target="_blank" rel="noopener noreferrer">
              {LEGENDS.name}, {LEGENDS.address ? `${LEGENDS.address}, ` : ''}{LEGENDS.city}, {LEGENDS.state}
            </a>
            . Nothing ships.
          </p>
        </div>
      </div>

      <section className="cs-product-info" aria-labelledby="cs-gear-details-title">
        <h2 id="cs-gear-details-title">Details</h2>
        {product.description ? <p className="cs-gear-desc">{product.description}</p> : <p className="cs-meta">Ask us for specs.</p>}
        <div className="cs-actions">
          <ConsignmentContactButton topic="buying">Ask about this product</ConsignmentContactButton>
        </div>
      </section>

      <details className="cs-buying-info">
        <summary>Buying info</summary>
        <ul>
          <li>Brand new from FRPL. Reserving is free; you pay when you pick it up at Legends.</li>
          <li>Totals include {taxPercent(taxRate)} sales tax. This site does not take payment.</li>
          <li>Pickup is in person at {LEGENDS.name}; nothing ships.</li>
        </ul>
      </details>

      <ConsignmentBuyBar
        targetRef={buyRef}
        price={formatDollars(withTax(price, taxRate))}
        note={product.price_tax_included ? 'tax included' : 'total with tax'}
        action={variant && product.status === 'active' ? (product.special_order || Number(variant.stock) > 0 ? 'Reserve' : '') : ''}
      />
    </div>
  );
}
