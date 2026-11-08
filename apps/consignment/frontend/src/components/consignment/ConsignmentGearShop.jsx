import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CATEGORIES, CONSIGNMENT_PATH, LEGENDS, LEGENDS_MAP_URL } from '../../data/consignmentConstants.js';
import { loadGearProducts } from '../../services/consignmentGearService.js';
import ConsignmentGearCard from './ConsignmentGearCard.jsx';
import useTaxRate from '../../hooks/useTaxRate.js';
import { taxPercent } from '../../utils/consignmentTax.js';
import ConsignmentContactButton from './ConsignmentContactButton.jsx';
import './consignment-shop.css';

/** New gear FRPL sells as a dealer: reserve online, pay and pick up at Legends. */
export default function ConsignmentGearShop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const catParam = searchParams.get('cat');
  const category = CATEGORIES.some((c) => c.id === catParam) ? catParam : 'all';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const taxRate = useTaxRate();

  useEffect(() => {
    let alive = true;
    loadGearProducts()
      .then((rows) => { if (alive) setProducts(rows); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const setCategory = (value) => setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    if (value === 'all') next.delete('cat'); else next.set('cat', value);
    return next;
  }, { replace: true });

  const usedCategories = CATEGORIES.filter((c) => products.some((p) => p.category === c.id));
  const visible = category === 'all' ? products : products.filter((p) => p.category === category);

  return (
    <div className="cs-page cs-shop cs-gear-shop">
      <header className="cs-shop-head">
        <div className="cs-shop-title">
          <h1>New gear</h1>
          <p>
            Brand-new cues, shafts, cases and accessories from FRPL. <br />
            Reserve online, then pay and pick up at <strong>{LEGENDS.name}</strong> in{' '}
            <a href={LEGENDS_MAP_URL} target="_blank" rel="noopener noreferrer">{LEGENDS.city}, {LEGENDS.state}</a>. <br />
            Out of stock? Most items can be special ordered. <br />
            Totals with {taxPercent(taxRate)} sales tax are shown; pay at the register.
          </p>
        </div>
        {usedCategories.length > 1 ? (
          <div className="cs-shop-filters">
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
              <option value="all">All categories</option>
              {usedCategories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        ) : null}
      </header>
      {!loading && !products.length ? (
        <div className="cs-gear-soon">
          <h2>New gear is coming soon</h2>
          <p>
            FRPL is setting up as a dealer. Looking for something specific now? Ask us and we’ll see if we can order it in.
          </p>
          <div className="cs-actions">
            <ConsignmentContactButton topic="buying">Ask about new gear</ConsignmentContactButton>
            <Link className="cs-btn-secondary" to={CONSIGNMENT_PATH}>Shop used gear</Link>
          </div>
        </div>
      ) : null}
      {!loading && products.length && !visible.length ? <p className="cs-shop-empty">Nothing in this category yet.</p> : null}
      <div className="cs-grid">
        {loading
          ? Array.from({ length: 4 }, (_, i) => <div key={i} className="cs-card cs-card-skeleton" aria-hidden="true" />)
          : visible.map((p) => <ConsignmentGearCard key={p.id} product={p} />)}
      </div>
      {products.length ? (
        <p className="cs-hint cs-gear-foot">
          Looking for something we don’t list? <ConsignmentContactButton className="cs-link-btn" topic="buying">Ask us</ConsignmentContactButton>
          {' '}and we’ll quote a special order. Also see <Link to={CONSIGNMENT_PATH}>used gear in the consignment shop</Link>.
        </p>
      ) : null}
    </div>
  );
}
