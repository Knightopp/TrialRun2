import React, { useState } from 'react';
import { FiX, FiArrowRight } from 'react-icons/fi';
import './LegalModal.css';

export default function LegalModal({ isOpen, onClose, type = 'privacy' }) {
  const [activeTab, setActiveTab] = useState(type);

  // Sync tab with incoming prop
  React.useEffect(() => {
    if (type) setActiveTab(type);
  }, [type]);

  if (!isOpen) return null;

  return (
    <div className="legal-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="legal-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Background Cyber Watermarks */}
        <div className="legal-watermark-words">
          <span>EVENTS</span>
          <span>PEOPLE</span>
          <span>IDEAS</span>
          <span>BEYOND</span>
        </div>

        <div className="legal-watermark-cad-left">
          <span className="cad-year-top">20</span>
          <span className="cad-year-bot">27</span>
        </div>

        <button 
          type="button" 
          className="legal-close-btn" 
          onClick={onClose} 
          aria-label="Close legal modal"
        >
          <FiX size={18} />
        </button>

        {/* Modal Header matching reference screenshot */}
        <div className="legal-header">
          <div className="legal-eyebrow">
            <span className="legal-eyebrow-circle" />
            <span>KNOWLEDGE BASE // FEST POLICIES</span>
          </div>

          <h2 className="legal-title">
            {activeTab === 'privacy' && (
              <>
                <span className="legal-title-line">PRIVACY &amp;</span>
                <span className="legal-title-line">DATA POLICY</span>
              </>
            )}
            {activeTab === 'terms' && (
              <>
                <span className="legal-title-line">TERMS &amp;</span>
                <span className="legal-title-line">CONDITIONS</span>
              </>
            )}
            {activeTab === 'conduct' && (
              <>
                <span className="legal-title-line">CODE OF</span>
                <span className="legal-title-line">CONDUCT</span>
              </>
            )}
          </h2>

          <p className="legal-subtitle">
            EVERYTHING YOU NEED TO KNOW ABOUT DATA PRIVACY, DELEGATE PASSES, AND CAMPUS GUIDELINES FOR SRISHTI 2.7.
          </p>

          {/* Navigation Pill Switcher */}
          <div className="legal-tab-pills">
            <button
              type="button"
              className={`legal-tab-pill ${activeTab === 'privacy' ? 'active' : ''}`}
              onClick={() => setActiveTab('privacy')}
            >
              Privacy Policy
            </button>
            <button
              type="button"
              className={`legal-tab-pill ${activeTab === 'terms' ? 'active' : ''}`}
              onClick={() => setActiveTab('terms')}
            >
              Terms of Service
            </button>
            <button
              type="button"
              className={`legal-tab-pill ${activeTab === 'conduct' ? 'active' : ''}`}
              onClick={() => setActiveTab('conduct')}
            >
              Code of Conduct
            </button>
          </div>
        </div>

        {/* Modal Body with Numbered Obsidian Cards matching reference layout */}
        <div className="legal-modal-body">
          {activeTab === 'privacy' && (
            <div className="legal-cards-list">
              <div className="legal-item-card">
                <div className="legal-card-header">
                  <div className="legal-num-lockup">
                    <span className="legal-index-num">01</span>
                    <span className="legal-divider">|</span>
                  </div>
                  <h4 className="legal-card-title">Information We Collect</h4>
                </div>
                <div className="legal-card-content">
                  <p>When you access our platform or register for fest competitions, we collect:</p>
                  <ul className="legal-bullet-list">
                    <li><strong>Identity &amp; Profile Details:</strong> Full name, institutional email address, primary contact phone number.</li>
                    <li><strong>Academic Affiliation:</strong> College/university name, department/major, and year of study.</li>
                    <li><strong>Fest Credentials:</strong> Participant codes, event registration selections, dynamic delegate pass identifiers, and attendance logs.</li>
                    <li><strong>Transaction Records:</strong> Payment transaction references, verification timestamps, and approval statuses. <em>We never store credit/debit card numbers or confidential banking passwords.</em></li>
                  </ul>
                </div>
              </div>

              <div className="legal-item-card">
                <div className="legal-card-header">
                  <div className="legal-num-lockup">
                    <span className="legal-index-num">02</span>
                    <span className="legal-divider">|</span>
                  </div>
                  <h4 className="legal-card-title">How We Use Your Data</h4>
                </div>
                <div className="legal-card-content">
                  <p>Your information is utilized strictly to provide fest administrative services, including:</p>
                  <ul className="legal-bullet-list">
                    <li>Generating and rendering your holographic 3D Digital Entry Pass and signed QR security badges.</li>
                    <li>Verifying registration credentials, payments, and entrance gate check-in via our automated volunteer telemetry.</li>
                    <li>Dispatching official fest confirmations, passes, and schedule notifications via email and WhatsApp.</li>
                    <li>Issuing official merit, participation, and prize winner certificates.</li>
                  </ul>
                </div>
              </div>

              <div className="legal-item-card">
                <div className="legal-card-header">
                  <div className="legal-num-lockup">
                    <span className="legal-index-num">03</span>
                    <span className="legal-divider">|</span>
                  </div>
                  <h4 className="legal-card-title">WhatsApp &amp; Email Communications</h4>
                </div>
                <div className="legal-card-content">
                  <p>
                    By enrolling or requesting an entry pass, you authorize Srishti 2.7 coordinators to deliver fest 
                    passes, venue directions, and critical scheduling updates to your provided email address and WhatsApp number. 
                    You may opt out or modify these preferences at any time through your Profile dashboard.
                  </p>
                </div>
              </div>

              <div className="legal-item-card">
                <div className="legal-card-header">
                  <div className="legal-num-lockup">
                    <span className="legal-index-num">04</span>
                    <span className="legal-divider">|</span>
                  </div>
                  <h4 className="legal-card-title">Data Security &amp; Cryptographic Passes</h4>
                </div>
                <div className="legal-card-content">
                  <p>
                    We employ modern encryption standards, Row-Level Security (RLS) on our cloud database, and cryptographic 
                    salting on all QR verification tokens. Access to registration registries is restricted exclusively to authorized 
                    faculty coordinators and fest administration staff.
                  </p>
                </div>
              </div>

              <div className="legal-item-card">
                <div className="legal-card-header">
                  <div className="legal-num-lockup">
                    <span className="legal-index-num">05</span>
                    <span className="legal-divider">|</span>
                  </div>
                  <h4 className="legal-card-title">Contact &amp; Fest Helpdesk</h4>
                </div>
                <div className="legal-card-content">
                  <p>For questions regarding this privacy policy or your participant records, please reach out directly:</p>
                  <div className="legal-contact-callout">
                    <span><strong>Fest Email:</strong> <a href="mailto:srishti2.7stc@gmail.com">srishti2.7stc@gmail.com</a></span>
                    <span><strong>Host Institution:</strong> St. Thomas College (Autonomous), Thrissur, Kerala - 680001</span>
                    <span><strong>Official Instagram:</strong> <a href="https://www.instagram.com/_srishti2.7/" target="_blank" rel="noopener noreferrer">@_srishti2.7</a></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="legal-cards-list">
              <div className="legal-item-card">
                <div className="legal-card-header">
                  <div className="legal-num-lockup">
                    <span className="legal-index-num">01</span>
                    <span className="legal-divider">|</span>
                  </div>
                  <h4 className="legal-card-title">Eligibility &amp; Identity Verification</h4>
                </div>
                <div className="legal-card-content">
                  <p>
                    Participation is open to valid undergraduate and postgraduate students. A valid college-issued photo ID card 
                    is compulsory for campus entry and competition verification. Impersonation will result in immediate disqualification 
                    and reporting to the concerned college authority.
                  </p>
                </div>
              </div>

              <div className="legal-item-card">
                <div className="legal-card-header">
                  <div className="legal-num-lockup">
                    <span className="legal-index-num">02</span>
                    <span className="legal-divider">|</span>
                  </div>
                  <h4 className="legal-card-title">Payments &amp; Registration Confirmation</h4>
                </div>
                <div className="legal-card-content">
                  <p>
                    All registration fees for specified events must be submitted through verified transaction references. Registration 
                    is confirmed once payment has been validated by event coordinators. Registration fees are non-refundable once an event 
                    slot has been verified and allocated.
                  </p>
                </div>
              </div>

              <div className="legal-item-card">
                <div className="legal-card-header">
                  <div className="legal-num-lockup">
                    <span className="legal-index-num">03</span>
                    <span className="legal-divider">|</span>
                  </div>
                  <h4 className="legal-card-title">Event Guidelines &amp; Adjudication</h4>
                </div>
                <div className="legal-card-content">
                  <p>
                    All competitions will commence strictly according to the published schedule. The decisions of the judging panel 
                    and faculty coordinators are definitive and binding in all cases.
                  </p>
                </div>
              </div>

              <div className="legal-item-card">
                <div className="legal-card-header">
                  <div className="legal-num-lockup">
                    <span className="legal-index-num">04</span>
                    <span className="legal-divider">|</span>
                  </div>
                  <h4 className="legal-card-title">Campus Decorum &amp; Asset Protection</h4>
                </div>
                <div className="legal-card-content">
                  <p>
                    Participants must respect college infrastructure, laboratories, and auditorium equipment. Any damage caused to campus 
                    property will be recovered from the responsible individuals.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'conduct' && (
            <div className="legal-cards-list">
              <div className="legal-item-card">
                <div className="legal-card-header">
                  <div className="legal-num-lockup">
                    <span className="legal-index-num">01</span>
                    <span className="legal-divider">|</span>
                  </div>
                  <h4 className="legal-card-title">Fest Core Principles</h4>
                </div>
                <div className="legal-card-content">
                  <p>
                    <strong>SRISHTI 2.7</strong> is committed to providing a safe, inclusive, welcoming, and high-energy fest 
                    environment for students, visitors, faculty, and industry partners.
                  </p>
                </div>
              </div>

              <div className="legal-item-card">
                <div className="legal-card-header">
                  <div className="legal-num-lockup">
                    <span className="legal-index-num">02</span>
                    <span className="legal-divider">|</span>
                  </div>
                  <h4 className="legal-card-title">Academic Integrity</h4>
                </div>
                <div className="legal-card-content">
                  <p>
                    Plagiarism, unauthorized code generation, or pre-built assets in competitive coding and robotics challenges are strictly prohibited.
                  </p>
                </div>
              </div>

              <div className="legal-item-card">
                <div className="legal-card-header">
                  <div className="legal-num-lockup">
                    <span className="legal-index-num">03</span>
                    <span className="legal-divider">|</span>
                  </div>
                  <h4 className="legal-card-title">Mutual Respect &amp; Campus Safety</h4>
                </div>
                <div className="legal-card-content">
                  <p>
                    Harassment, discriminatory language, or disruptive behavior of any form will not be tolerated. St. Thomas College is a strictly 
                    substance-free campus. Possession or consumption of alcohol, tobacco, or illicit substances is strictly illegal.
                  </p>
                </div>
              </div>

              <div className="legal-item-card">
                <div className="legal-card-header">
                  <div className="legal-num-lockup">
                    <span className="legal-index-num">04</span>
                    <span className="legal-divider">|</span>
                  </div>
                  <h4 className="legal-card-title">Cooperation with Fest Staff</h4>
                </div>
                <div className="legal-card-content">
                  <p>
                    Please cooperate with student volunteers, security personnel, and faculty coordinators at all times to ensure a smooth fest experience.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom CTA Banner matching reference */}
        <div className="legal-footer-cta">
          <div className="legal-cta-headings">
            <span className="legal-cta-eyebrow">HAVE QUESTIONS REGARDING FEST GUIDELINES OR DELEGATE COMPLIANCE?</span>
            <span className="legal-cta-highlight">OUR COORDINATORS ARE READY TO HELP.</span>
          </div>

          <div className="legal-cta-buttons">
            <a href="mailto:srishti2.7stc@gmail.com" className="legal-btn-secondary">
              Email Helpdesk
            </a>
            <button type="button" onClick={onClose} className="legal-btn-primary">
              <span>I Acknowledge &amp; Close</span>
              <FiArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
