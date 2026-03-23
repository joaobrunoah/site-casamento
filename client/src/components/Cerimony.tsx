import React from 'react';
import '../pages/Home.css';

interface CerimonyProps {
  title: string;
  dateText: string;
  timeText: string;
  description: string;
  dressCode: string;
  place: string;
  placeUrl?: string;
  icon?: string;
}

const Cerimony: React.FC<CerimonyProps> = ({
  title,
  dateText,
  timeText,
  description,
  dressCode,
  place,
  placeUrl,
  icon
}) => {
  return (
    <div className="cerimony-card">
      <h1 className="h1-section">{title}</h1>
      <div className="cerimony-content">
        <p className="cerimony-date">{dateText}</p>
        <div className="cerimony-time-row">
          <span className="cerimony-time">{timeText}</span>
          <span className="cerimony-time-title">{title}</span>
        </div>
        <div className="cerimony-description-wrapper">
          <p className="cerimony-description">{description}</p>
          {icon && (
            <div className="cerimony-icon">
              <img src={icon} alt={title} />
            </div>
          )}
        </div>
        <hr className="cerimony-divider" />
        <p className="cerimony-label">Traje</p>
        <p className="cerimony-dress-code">{dressCode}</p>
        <p className="cerimony-label">Local</p>
        {placeUrl ? (
          <a
            href={placeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="cerimony-place cerimony-place-link"
          >
            {place}
          </a>
        ) : (
          <p className="cerimony-place">{place}</p>
        )}
      </div>
      <div className="cerimony-bottom-image">
        <img src="/assets/bottom-cerimony.svg" alt="" />
      </div>
    </div>
  );
};

export default Cerimony;
