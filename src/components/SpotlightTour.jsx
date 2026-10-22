import React, { useState, useEffect } from 'react';
import { FiX, FiArrowRight, FiCheck, FiHome, FiImage, FiCalendar, FiUser } from 'react-icons/fi';
import './SpotlightTour.css';

export default function SpotlightTour({ 
  onStepChange, 
  onComplete, 
  onNavigateToHome,
  onNavigateToExperience,
  onNavigateToEvents, 
  onNavigateToProfile 
}) {
  // 0 = Welcome Modal, 1 = Home, 2 = Gallery, 3 = Events, 4 = Profile
  const [currentStep, setCurrentStep] = useState(0); 
  const [isVisible, setIsVisible] = useState(false);

  // Show tour max 1 time per device
  useEffect(() => {
    try {
      const views = parseInt(localStorage.getItem('srishti_tour_views_v2') || '0', 10);
      if (views >= 1) return;
    } catch (_) {}

    const timer = setTimeout(() => {
      setIsVisible(true);
      if (onStepChange) onStepChange(0);
      try {
        const views = parseInt(localStorage.getItem('srishti_tour_views_v2') || '0', 10);
        localStorage.setItem('srishti_tour_views_v2', (views + 1).toString());
      } catch (_) {}
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleDismiss();
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft' && currentStep > 0) handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, currentStep]);

  const handleDismiss = () => {
    try {
      const views = parseInt(localStorage.getItem('srishti_tour_views_v2') || '0', 10);
      if (views < 1) {
        localStorage.setItem('srishti_tour_views_v2', '1');
      }
    } catch (_) {}
    setIsVisible(false);
    if (onStepChange) onStepChange(null);
    if (onComplete) onComplete();
  };

  const handleNext = () => {
    if (currentStep < 4) {
      const next = currentStep + 1;
      setCurrentStep(next);
      if (onStepChange) onStepChange(next);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      if (onStepChange) onStepChange(prev);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="spotlight-tour-overlay" onClick={handleDismiss}>
      {/* Background dimmer */}
      <div className="spotlight-backdrop" />

      {/* Modal / Step Tooltip Card */}
      <div 
        className={`spotlight-card ${currentStep === 0 ? 'card-welcome' : 'card-step'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative corner grid & angled cyber accents */}
        <div className="spotlight-decor-grid-bottom-left" />
        <div className="spotlight-decor-lines-top-right" />

        <button 
          type="button" 
          className="spotlight-close-btn" 
          onClick={handleDismiss}
          aria-label="Close Tour"
        >
          <FiX size={18} />
        </button>

        {currentStep === 0 && (
          <div className="spotlight-welcome-content">
            <div className="spotlight-tag">SYSTEM ONBOARDING // EDITION 2.7</div>
            <h3 className="spotlight-title">WELCOME TO SRISHTI</h3>
            <div className="spotlight-title-glow-line" />
            
            <p className="spotlight-desc">
              Here is a quick tour of the website.
            </p>

            {/* 4 Connected Navigation Step Cards */}
            <div className="spotlight-cards-track">
              <div className="spotlight-track-line" />

              <div className="spotlight-nav-card active">
                <span className="nav-card-num">01</span>
                <div className="nav-card-icon"><FiHome size={22} /></div>
                <span className="nav-card-lbl">Home</span>
              </div>

              <div className="spotlight-nav-card">
                <span className="nav-card-num">02</span>
                <div className="nav-card-icon"><FiImage size={22} /></div>
                <span className="nav-card-lbl">Gallery</span>
              </div>

              <div className="spotlight-nav-card">
                <span className="nav-card-num">03</span>
                <div className="nav-card-icon"><FiCalendar size={22} /></div>
                <span className="nav-card-lbl">Register</span>
              </div>

              <div className="spotlight-nav-card">
                <span className="nav-card-num">04</span>
                <div className="nav-card-icon"><FiUser size={22} /></div>
                <span className="nav-card-lbl">Profile</span>
              </div>
            </div>

            <div className="spotlight-actions">
              <button 
                type="button" 
                className="spotlight-btn-primary" 
                onClick={handleNext}
              >
                <span>START TOUR</span>
                <FiArrowRight size={16} />
              </button>
              <button 
                type="button" 
                className="spotlight-btn-ghost" 
                onClick={handleDismiss}
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="spotlight-step-content">
            <div className="spotlight-step-meta">
              <span className="step-count">STEP 01 OF 04</span>
              <span className="step-badge-tag">HOME</span>
            </div>
            <h4 className="spotlight-step-title">HOME &amp; HIGHLIGHTS</h4>
            <p className="spotlight-desc">
              Your central hub for the fest overview, edition theme, teaser showcases, and live campus updates.
            </p>

            <div className="spotlight-actions">
              <button 
                type="button" 
                className="spotlight-btn-primary" 
                onClick={handleNext}
              >
                <span>NEXT: GALLERY</span>
                <FiArrowRight size={16} />
              </button>
              <button 
                type="button" 
                className="spotlight-btn-ghost" 
                onClick={handleDismiss}
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="spotlight-step-content">
            <div className="spotlight-step-meta">
              <span className="step-count">STEP 02 OF 04</span>
              <span className="step-badge-tag">GALLERY</span>
            </div>
            <h4 className="spotlight-step-title">GALLERY &amp; MOMENTS</h4>
            <p className="spotlight-desc">
              Explore captured Moments of Srishti, interactive visuals, and fest photo showcases.
            </p>

            <div className="spotlight-actions">
              <button 
                type="button" 
                className="spotlight-btn-primary" 
                onClick={handleNext}
              >
                <span>NEXT: REGISTER</span>
                <FiArrowRight size={16} />
              </button>
              <button 
                type="button" 
                className="spotlight-btn-ghost" 
                onClick={handleDismiss}
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="spotlight-step-content">
            <div className="spotlight-step-meta">
              <span className="step-count">STEP 03 OF 04</span>
              <span className="step-badge-tag">REGISTER</span>
            </div>
            <h4 className="spotlight-step-title">REGISTER &amp; COMPETITIONS</h4>
            <p className="spotlight-desc">
              Browse technical and cultural competitions with an ₹80K+ prize pool. Register solo or with your squad in 1-click.
            </p>

            <div className="spotlight-actions">
              <button 
                type="button" 
                className="spotlight-btn-primary" 
                onClick={handleNext}
              >
                <span>NEXT: PROFILE</span>
                <FiArrowRight size={16} />
              </button>
              <button 
                type="button" 
                className="spotlight-btn-ghost" 
                onClick={handleDismiss}
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="spotlight-step-content">
            <div className="spotlight-step-meta">
              <span className="step-count">STEP 04 OF 04</span>
              <span className="step-badge-tag">PROFILE</span>
            </div>
            <h4 className="spotlight-step-title">PROFILE &amp; PASS</h4>
            <p className="spotlight-desc">
              Log in with your email to view your profile details, check-in QR pass, and track all your registered events and teams.
            </p>

            <div className="spotlight-actions">
              <button 
                type="button" 
                className="spotlight-btn-primary" 
                onClick={handleDismiss}
              >
                <span>FINISH TOUR</span>
                <FiCheck size={16} />
              </button>
              <button 
                type="button" 
                className="spotlight-btn-ghost" 
                onClick={handleDismiss}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Downward pointer triangle pointing precisely to the corresponding Dock item */}
        {currentStep > 0 && (
          <div className={`spotlight-pointer-arrow step-${currentStep}`} />
        )}
      </div>
    </div>
  );
}
