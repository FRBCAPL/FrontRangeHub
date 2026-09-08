import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usaplInfoTopic } from '../../data/usaplInfo.js';
import UsaplInfoBody from './UsaplInfoBody.jsx';
import UsaplInfoButtons from './UsaplInfoButtons.jsx';
import UsaplInfoModal from './UsaplInfoModal.jsx';
import UsaplLeagueMark from './UsaplLeagueMark.jsx';
import './usaplInfo.css';

export default function UsaplInfoPage() {
  const [openId, setOpenId] = useState(null);
  const topic = usaplInfoTopic(openId);

  return (
    <div className="usapl-brand-page">
      <UsaplLeagueMark />
      <div className="usapl-page usapl-info-page">
        <header className="usapl-info-intro">
          <h1>League info &amp; FAQ</h1>
          <p className="usapl-lede">
            Front Range USA Pool League is an official league of CueSports International
            and the USA Pool League.<br />
            Match and tournament play follows the USA Pool League player handbook and the official CSI rule book.
          </p>
          <div className="usapl-actions">
            <Link className="usapl-btn-secondary" to="/usapl/rules">Rules at a glance</Link>
          </div>
        </header>
        <UsaplInfoButtons onOpen={setOpenId} />
      </div>
      {topic ? (
        <UsaplInfoModal
          title={topic.title}
          fillHeight
          onClose={() => setOpenId(null)}
        >
          <UsaplInfoBody id={openId} />
        </UsaplInfoModal>
      ) : null}
    </div>
  );
}
