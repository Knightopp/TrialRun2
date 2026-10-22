import React from 'react';
import { FiX, FiShield, FiFileText, FiCheckCircle } from 'react-icons/fi';
import './LegalModal.css';

export default function LegalModal({ isOpen, onClose, type = 'privacy' }) {
  if (!isOpen) return null;

  const titles = {
    privacy: 'PRIVACY POLICY // SRISHTI 2.7',
    terms: 'TERMS & CONDITIONS // SRISHTI 2.7',
    conduct: 'CODE OF CONDUCT // SRISHTI 2.7'
  };

  return (
    <div className="legal-modal-backdrop" onClick={onClose}>
      <div className="legal-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="legal-modal-header">
          <div className="legal-modal-title-box">
            {type === 'privacy' ? <FiShield className="legal-icon" /> : <FiFileText className="legal-icon" />}
            <div>
              <span className="legal-eyebrow">OFFICIAL FESTIVAL DOCUMENT</span>
              <h3 className="legal-title">{titles[type] || 'LEGAL NOTICE'}</h3>
            </div>
          </div>
          <button className="legal-close-btn" onClick={onClose} aria-label="Close modal">
            <FiX size={20} />
          </button>
        </div>

        <div className="legal-modal-body">
          {type === 'privacy' && (
            <div className="legal-content">
              <p className="legal-lead">
                Welcome to <strong>SRISHTI 2.7</strong>, the premier National Tech-Cultural Festival hosted by the 
                Department of Computer Science at St. Thomas College (Autonomous), Thrissur. We value the trust you 
                place in us and are dedicated to protecting your privacy and confidential information.
              </p>

              <h4>1. Information We Collect</h4>
              <p>When you access our platform or register for festival competitions, we collect:</p>
              <ul>
                <li><strong>Identity &amp; Profile Details:</strong> Full name, institutional email address, primary contact phone number.</li>
                <li><strong>Academic Affiliation:</strong> College/university name, department/major, and year of study.</li>
                <li><strong>Festival Credentials:</strong> Participant codes, event registration selections, dynamic delegate pass identifiers, and attendance logs.</li>
                <li><strong>Transaction Records:</strong> Payment transaction references, verification timestamps, and approval statuses. <em>We never store credit/debit card numbers or confidential banking passwords.</em></li>
              </ul>

              <h4>2. How We Use Your Data</h4>
              <p>Your information is utilized strictly to provide festival administrative services, including:</p>
              <ul>
                <li>Generating and rendering your holographic 3D Digital Entry Pass and signed QR security badges.</li>
                <li>Verifying registration credentials, payments, and entrance gate check-in via our automated volunteer telemetry.</li>
                <li>Dispatching official festival confirmations, passes, and schedule notifications via email and WhatsApp.</li>
                <li>Issuing official merit, participation, and prize winner certificates.</li>
              </ul>

              <h4>3. WhatsApp &amp; Email Communications</h4>
              <p>
                By enrolling or requesting an entry pass, you authorize Srishti 2.7 coordinators to deliver festival 
                passes, venue directions, and critical scheduling updates to your provided email address and WhatsApp number. 
                You may opt out or modify these preferences at any time through your Profile dashboard.
              </p>

              <h4>4. Data Security &amp; Retention</h4>
              <p>
                We employ modern encryption standards, Row-Level Security (RLS) on our cloud database, and cryptographic 
                salting on all QR verification tokens. Access to registration registries is restricted exclusively to authorized 
                faculty coordinators and festival administration staff.
              </p>

              <h4>5. Contact Us</h4>
              <p>
                For questions regarding this privacy policy or your participant records, please reach out directly:
              </p>
              <div className="legal-contact-callout">
                <span><strong>Festival Email:</strong> <a href="mailto:srishti2.7stc@gmail.com">srishti2.7stc@gmail.com</a></span>
                <span><strong>Host Institution:</strong> St. Thomas College (Autonomous), Thrissur, Kerala - 680001</span>
                <span><strong>Official Instagram:</strong> <a href="https://www.instagram.com/_srishti2.7/" target="_blank" rel="noopener noreferrer">@_srishti2.7</a></span>
              </div>
            </div>
          )}

          {type === 'terms' && (
            <div className="legal-content">
              <p className="legal-lead">
                By registering for and attending <strong>SRISHTI 2.7</strong> at St. Thomas College (Autonomous), Thrissur, 
                you agree to adhere to all terms, schedules, and event protocols outlined below.
              </p>

              <h4>1. Eligibility &amp; Identity Verification</h4>
              <p>
                Participation is open to valid undergraduate and postgraduate students. A valid college-issued photo ID card 
                is compulsory for campus entry and competition verification. Impersonation will result in immediate disqualification 
                and reporting to the concerned college authority.
              </p>

              <h4>2. Payments &amp; Registration Confirmation</h4>
              <p>
                All registration fees for specified events must be submitted through verified transaction references. Registration 
                is confirmed once payment has been validated by event coordinators. Registration fees are non-refundable once an event 
                slot has been verified and allocated.
              </p>

              <h4>3. Event Guidelines &amp; Adjudication</h4>
              <p>
                All competitions will commence strictly according to the published schedule. The decisions of the judging panel 
                and faculty coordinators are definitive and binding in all cases.
              </p>

              <h4>4. Campus Decorum</h4>
              <p>
                Participants must respect college infrastructure, laboratories, and auditorium equipment. Any damage caused to campus 
                property will be recovered from the responsible individuals.
              </p>
            </div>
          )}

          {type === 'conduct' && (
            <div className="legal-content">
              <p className="legal-lead">
                <strong>SRISHTI 2.7</strong> is committed to providing a safe, inclusive, welcoming, and high-energy festival 
                environment for students, visitors, faculty, and industry partners.
              </p>

              <h4>Festival Core Values</h4>
              <ul>
                <li><strong>Academic Integrity:</strong> Plagiarism, unauthorized code generation, or pre-built assets in competitive coding and robotics challenges are strictly prohibited.</li>
                <li><strong>Mutual Respect:</strong> Harassment, discriminatory language, or disruptive behavior of any form will not be tolerated.</li>
                <li><strong>Substance-Free Campus:</strong> St. Thomas College is a strictly substance-free campus. Possession or consumption of alcohol, tobacco, or illicit substances is strictly illegal and will lead to police referral.</li>
                <li><strong>Cooperation with Staff:</strong> Please cooperate with student volunteers, security personnel, and faculty coordinators at all times.</li>
              </ul>
            </div>
          )}
        </div>

        <div className="legal-modal-footer">
          <button className="legal-btn-close" onClick={onClose}>
            <FiCheckCircle size={16} /> I Understand &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}
