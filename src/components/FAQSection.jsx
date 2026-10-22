import React, { useState } from 'react';
import { FiChevronDown, FiHelpCircle, FiArrowRight } from 'react-icons/fi';
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
    a: 'Winners and runners-up will be awarded substantial cash prizes, festival trophies, and certificates of excellence. All verified delegates attending competitions will receive official certificates of participation.'
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
      <div className="faq-container">
        <div className="faq-header">
          <div className="faq-eyebrow">
            <FiHelpCircle size={15} />
            <span>KNOWLEDGE BASE // FESTIVAL GUIDE</span>
          </div>
          <h2 className="faq-title">FREQUENTLY ASKED QUESTIONS</h2>
          <p className="faq-subtitle">
            Everything you need to know about registrations, rules, passes, and campus guidelines for Srishti 2.7.
          </p>
        </div>

        <div className="faq-accordion-list">
          {FAQS_DATA.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`faq-item ${isOpen ? 'faq-item-open' : ''}`}
                onClick={() => toggleFaq(idx)}
              >
                <div className="faq-question-row">
                  <span className="faq-index-num">0{idx + 1}</span>
                  <h4 className="faq-question-text">{faq.q}</h4>
                  <div className={`faq-chevron-box ${isOpen ? 'faq-chevron-rotated' : ''}`}>
                    <FiChevronDown size={18} />
                  </div>
                </div>

                {isOpen && (
                  <div className="faq-answer-container">
                    <p className="faq-answer-text">{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="faq-footer-cta">
          <div className="faq-cta-text">
            <span>Still have questions about events or team size?</span>
            <span className="faq-cta-highlight">Our coordinators are ready to help.</span>
          </div>
          <div className="faq-cta-buttons">
            <a href="mailto:srishti2.7stc@gmail.com" className="faq-btn-secondary">
              Email Helpdesk
            </a>
            {onRegisterClick && (
              <button onClick={onRegisterClick} className="faq-btn-primary">
                Register for Events <FiArrowRight />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
