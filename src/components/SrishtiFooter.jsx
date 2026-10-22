import React, { useState } from 'react';
import { FiInstagram, FiMail, FiArrowRight, FiCheck } from 'react-icons/fi';
import './SrishtiFooter.css';

export default function SrishtiFooter({
  onNavigateHome,
  onNavigateGallery,
  onNavigateEvents,
  onNavigateContact,
  onOpenLegal
}) {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) return;
    setSubscribed(true);
    try {
      localStorage.setItem('srishti_subscriber_email', newsletterEmail);
    } catch (_) { }
    setTimeout(() => {
      setNewsletterEmail('');
    }, 2500);
  };

  return (
    <footer className="supreme-srishti-footer" id="srishti-footer">
      {/* Top Motto Accent Beam */}
      <div className="footer-top-accent-wrap">
        <div className="footer-motto-row">
          <span>IDEAS</span>
          <span className="footer-dot">•</span>
          <span>PEOPLE</span>
          <span className="footer-dot">•</span>
          <span>TECHNOLOGY</span>
          <span className="footer-dot">•</span>
          <span>BEYOND</span>
        </div>
        <div className="footer-accent-line">
          <div className="footer-accent-center-glow" />
        </div>
      </div>

      <div className="footer-main-grid">
        {/* Column 1: Brand & Contact */}
        <div className="footer-col footer-col-brand">
          <div className="footer-brand-lockup" onClick={onNavigateHome}>
            <img src="/assets/logo.png" alt="Srishti Logo" className="footer-logo-glyph" />
            <div className="footer-brand-headings">
              <span className="footer-brand-title">SRISHTI 2.7</span>
              <span className="footer-brand-tagline">NATIONAL TECHNO CULTURAL FEST</span>
            </div>
          </div>

          <p className="footer-institution-text">
            ST. THOMAS COLLEGE (AUTONOMOUS), THRISSUR<br />
            DEPARTMENT OF COMPUTER SCIENCE
          </p>

          <div className="footer-social-links-row">
            <a
              href="https://www.instagram.com/_srishti2.7/"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-pill"
              title="Follow Srishti 2.7 on Instagram"
              aria-label="Instagram"
            >
              <FiInstagram size={16} />
            </a>

            <a
              href="mailto:srishti2.7stc@gmail.com"
              className="footer-social-pill"
              title="Official Fest Email"
              aria-label="Email"
            >
              <FiMail size={16} />
            </a>
          </div>
        </div>

        {/* Column 2: EXPLORE */}
        <div className="footer-col">
          <h4 className="footer-col-heading">EXPLORE</h4>
          <ul className="footer-nav-list">
            <li>
              <button type="button" onClick={onNavigateHome} className="footer-nav-link">
                Home
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('about-section') || document.querySelector('.hero-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  else onNavigateHome?.();
                }}
                className="footer-nav-link"
              >
                About
              </button>
            </li>
            <li>
              <button type="button" onClick={onNavigateEvents} className="footer-nav-link">
                Events
              </button>
            </li>
            <li>
              <button type="button" onClick={onNavigateGallery} className="footer-nav-link">
                Gallery
              </button>
            </li>
            <li>
              <a href="mailto:srishti2.7stc@gmail.com" className="footer-nav-link">
                Contact
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3: IMPORTANT */}
        <div className="footer-col">
          <h4 className="footer-col-heading">IMPORTANT</h4>
          <ul className="footer-nav-list">
            <li>
              <button type="button" onClick={onNavigateEvents} className="footer-nav-link">
                Register
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onOpenLegal?.('terms')}
                className="footer-nav-link"
              >
                Rules &amp; Guidelines
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('faq-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="footer-nav-link"
              >
                FAQs
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('sponsors-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="footer-nav-link"
              >
                Sponsor
              </button>
            </li>
            <li>
              <a href="/admin" className="footer-nav-link">
                Volunteer
              </a>
            </li>
          </ul>
        </div>

        {/* Column 4: LEGAL */}
        <div className="footer-col">
          <h4 className="footer-col-heading">LEGAL</h4>
          <ul className="footer-nav-list">
            <li>
              <button
                type="button"
                onClick={() => onOpenLegal?.('privacy')}
                className="footer-nav-link"
              >
                Privacy Policy
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onOpenLegal?.('terms')}
                className="footer-nav-link"
              >
                Terms of Service
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onOpenLegal?.('conduct')}
                className="footer-nav-link"
              >
                Code of Conduct
              </button>
            </li>
          </ul>
        </div>

        {/* Column 5: STAY UPDATED */}
        <div className="footer-col footer-col-newsletter">
          <h4 className="footer-col-heading">STAY UPDATED</h4>
          <p className="footer-newsletter-desc">
            Get the latest updates, event announcements and important information.
          </p>

          <form onSubmit={handleSubscribe} className="footer-newsletter-form">
            <input
              type="email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="footer-newsletter-input"
            />
            <button
              type="submit"
              className="footer-newsletter-submit"
              aria-label="Subscribe to newsletter"
              disabled={subscribed}
            >
              {subscribed ? <FiCheck size={16} /> : <FiArrowRight size={16} />}
            </button>
          </form>
          {subscribed && (
            <span className="footer-subscribed-msg">
              ✓ Subscribed! You will receive fest announcements.
            </span>
          )}
        </div>
      </div>

      {/* Bottom Bar: Copyright on Left, Built by Abhiram C S & Ansel R Williams on Right */}
      <div className="footer-bottom-bar">
        <div className="footer-copyright-left">
          <span>EDITION 2.7 • DEC 6 &amp; 7</span>
          <span className="footer-bottom-divider">|</span>
          <span>© 2026 SRISHTI. ALL RIGHTS RESERVED.</span>
        </div>



        <div className="footer-credits-right">
          <div>
            Built by <strong className="credit-author">Srishti Tech Team</strong>
          </div>
          <div className="credit-names">
            <strong className="credit-author">Abhiram C S</strong>
            <strong className="credit-author">Ansel R Williams</strong>
          </div>
        </div>


      </div>
    </footer>
  );
}
