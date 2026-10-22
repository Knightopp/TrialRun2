import React, { useEffect, useState } from 'react';
import { fetchSponsors } from '../utils/sponsorsConfig';
import { FiExternalLink } from 'react-icons/fi';
import './SponsorMarquee.css';

export default function SponsorMarquee() {
  const [sponsors, setSponsors] = useState([]);

  useEffect(() => {
    let mounted = true;
    fetchSponsors().then((data) => {
      if (mounted && Array.isArray(data) && data.length > 0) {
        setSponsors(data);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (sponsors.length === 0) return null;

  // Duplicate sponsors list for seamless continuous infinite marquee
  const marqueeItems = [...sponsors, ...sponsors, ...sponsors];

  return (
    <section className="sponsors-marquee-section" id="sponsors-section">
      <div className="sponsors-head-container">
        <div className="sponsors-eyebrow">
          <span>COLLABORATION &amp; EXCELLENCE</span>
          <div className="sponsors-line" />
          <span>SRISHTI 2.7</span>
        </div>
        <h3 className="sponsors-heading">OFFICIAL FESTIVAL PARTNERS</h3>
      </div>

      <div className="marquee-wrapper">
        <div className="marquee-track">
          {marqueeItems.map((sp, idx) => (
            <a
              key={`${sp.id}-${idx}`}
              href={sp.website || '#'}
              target={sp.website ? '_blank' : '_self'}
              rel="noopener noreferrer"
              className="sponsor-card"
            >
              <div className="sponsor-logo-box">
                <img
                  src={sp.logo}
                  alt={sp.name}
                  className="sponsor-logo-img"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&auto=format&fit=crop&q=80';
                  }}
                />
              </div>
              <div className="sponsor-info">
                <span className="sponsor-tier">{sp.tier || 'PARTNER'}</span>
                <span className="sponsor-name">{sp.name}</span>
              </div>
              {sp.website && <FiExternalLink className="sponsor-link-icon" size={13} />}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
