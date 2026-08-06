import React, { useState } from 'react';
import {
  getCoverPhotoEntry,
  getPhotoEntries,
  extraPhotoCount
} from '@shared/utils/estatePhotoMeta.js';

/**
 * Cover-first photo block. Extra photos load only after "Show all photos"
 * so list/browse egress stays low.
 */
const ItemPhotoGallery = ({
  item,
  alt = '',
  className = '',
  imgClassName = 'ei-card-photo',
  placeholderClassName = 'ei-card-photo-placeholder',
  showBadge = true
}) => {
  const [showAll, setShowAll] = useState(false);
  const cover = getCoverPhotoEntry(item);
  const extras = extraPhotoCount(item);
  const all = showAll ? getPhotoEntries(item) : cover ? [cover] : [];

  return (
    <div className={`ei-item-photo-gallery${className ? ` ${className}` : ''}`}>
      <div className="ei-card-photo-wrap">
        {cover ? (
          <img className={imgClassName} src={cover.url} alt={alt} loading="lazy" />
        ) : (
          <div className={placeholderClassName}>No photo</div>
        )}
        {showBadge && extras > 0 && !showAll ? (
          <span className="ei-card-photo-count" title={`${extras + 1} photos`}>
            +{extras} photo{extras === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>
      {extras > 0 && !showAll ? (
        <button
          type="button"
          className="ei-btn ei-btn-secondary ei-btn-small ei-show-all-photos-btn"
          onClick={() => setShowAll(true)}
        >
          Show all photos ({extras + 1})
        </button>
      ) : null}
      {showAll && all.length > 1 ? (
        <div className="ei-item-photo-gallery-extras" aria-label="All photos">
          {all.slice(1).map((photo) => (
            <img
              key={photo.url}
              className="ei-item-photo-gallery-extra"
              src={photo.url}
              alt=""
              loading="lazy"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default ItemPhotoGallery;
