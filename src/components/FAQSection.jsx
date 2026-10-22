import React, { useState } from 'react';
import { FiChevronDown, FiArrowRight } from 'react-icons/fi';
import './FAQSection.css';

const FAQS_DATA = [
  {
    q: 'Who is eligible to participate in Srishti 2.7?',
    a: 'Students currently enrolled in any recognized college or university (undergraduate or postgraduate) across India are eligible. A valid college student identity card is mandatory during entrance gate verification.'
  },
  {
    q: 'How do I obtain my official Digital Entry Pass & QR badge?',
    a: 'Sign in to the official portal with your email, complete your profile, and enroll in your chosen competitions. Once your payment reference is verified, your dynamic 3D holographic Delegate Pass and secure cryptographic QR badge unlock instantly on your Profile page with PNG download and direct WhatsApp/email delivery.'
  },
  {
    q: 'Can I register for multiple competitions?',
    a: 'Yes! You can register for multiple events as long as their scheduled timings and venues do not overlap. The fest schedule is optimized across both days to allow multidisciplinary participation.'
  },
  {
    q: 'What are the dates, timing, and venue for Srishti 2.7?',
    a: 'Srishti 2.7 will take place on December 6 & 7, 2026 at the historic St. Thomas College (Autonomous) Campus in Thrissur, Kerala. Gates open at 8:30 AM on both days.'
  },
  {
    q: 'What awards and certificates will be presented?',
    a: 'Winners and runners-up will be awarded substantial cash prizes, fest trophies, and certificates of excellence. All verified delegates attending competitions will receive official certificates of participation.'
  },
  {
    q: 'How does entry gate check-in work?',
    a: 'Simply present your Digital Entry Pass QR code on your mobile device at the registration entrance. Our volunteers will scan your code with the administrative terminal for instantaneous gate clearance and attendance tagging.'
  },
  {
    q: 'Is accommodation available for outstation participants?',
    a: 'Limited accommodation and travel guidance are arranged for verified participants traveling from outside Thrissur district. Please reach out to our hospitality coordinators or email us at srishti2.7stc@gmail.com in advance.'
  },
  {
    q: 'Who should I contact if I face payment or technical issues?',
    a: 'You can email our technical desk directly at srishti2.7stc@gmail.com or message our official Instagram @_srishti2.7. Event coordinators are also listed with phone numbers on the registration portal.'
  }
];

export default function FAQSection({ onRegisterClick }) {
  const [openIndex, setOpenIndex] = useState(0);

  const toggleFaq = (index) => {
    setOpenIndex(prev => (prev === index ? null : index));
  };

  return (
    <section className="faq-section" id="faq-section">
      {/* Background Cyber CAD Watermarks matching reference */}
      <div className="faq-watermark-words">
        <span>EVENTS</span>
        <span>PEOPLE</span>
        <span>IDEAS</span>
        <span>BEYOND</span>
      </div>

      <div className="faq-watermark-cad-left">
        <span className="cad-year-top">20</span>
        <span className="cad-year-bot">27</span>
      </div>

      <div className="faq-container">
        {/* Header matching screenshot */}
        <div className="faq-header">
          <div className="faq-eyebrow">
            <span className="faq-eyebrow-circle" />
            <span>KNOWLEDGE BASE // FEST GUIDE</span>
          </div>

          <h2 className="faq-title">
            <span className="faq-title-line">FREQUENTLY</span>
            <span className="faq-title-line">ASKED QUESTIONS</span>
          </h2>

          <p className="faq-subtitle">
            EVERYTHING YOU NEED TO KNOW ABOUT REGISTRATIONS, RULES, PASSES, AND CAMPUS GUIDELINES FOR SRISHTI 2.7.
          </p>
        </div>

        {/* Accordion List with Smooth Animated Dropdowns */}
        <div className="faq-accordion-list">
          {FAQS_DATA.map((faq, idx) => {
            const isOpen = openIndex === idx;
            const indexStr = idx < 9 ? `0${idx + 1}` : `${idx + 1}`;

            return (
              <div
                key={idx}
                className={`faq-item ${isOpen ? 'faq-item-open' : ''}`}
                onClick={() => toggleFaq(idx)}
              >
                <div className="faq-question-row">
                  <div className="faq-num-lockup">
                    <span className="faq-index-num">{indexStr}</span>
                    <span className="faq-divider">|</span>
                  </div>

                  <h4 className="faq-question-text">{faq.q}</h4>

                  <button 
                    type="button" 
                    className={`faq-chevron-box ${isOpen ? 'faq-chevron-rotated' : ''}`}
                    aria-label={isOpen ? 'Collapse answer' : 'Expand answer'}
                  >
                    <FiChevronDown size={19} />
                  </button>
                </div>

                {/* Smooth CSS Grid Dropdown Animation Container */}
                <div className={`faq-answer-collapse ${isOpen ? 'open' : ''}`}>
                  <div className="faq-answer-inner">
                    <p className="faq-answer-text">{faq.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA Banner matching screenshot */}
        <div className="faq-footer-cta">
          <div className="faq-cta-left">
            <div className="faq-cta-thumb">
              <div className="faq-cta-thumb-overlay" />
            </div>
            <div className="faq-cta-headings">
              <span className="faq-cta-eyebrow">STILL HAVE QUESTIONS ABOUT EVENTS OR TEAM SIZE?</span>
              <span className="faq-cta-highlight">OUR COORDINATORS ARE READY TO HELP.</span>
            </div>
          </div>

          <div className="faq-cta-buttons">
            <a href="mailto:srishti2.7stc@gmail.com" className="faq-btn-secondary">
              Email Helpdesk
            </a>
            {onRegisterClick ? (
              <button type="button" onClick={onRegisterClick} className="faq-btn-primary">
                <span>Register for Events</span>
                <FiArrowRight size={15} />
              </button>
            ) : (
              <a href="/register/" className="faq-btn-primary">
                <span>Register for Events</span>
                <FiArrowRight size={15} />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
