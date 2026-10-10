import React, { useState, useEffect } from 'react';
import { FiX, FiArrowRight, FiCheck } from 'react-icons/fi';
import './SpotlightTour.css';

export default function SpotlightTour({ 
  onStepChange, 
  onComplete, 
  onNavigateToHome,
  onNavigateToExperience,
  onNavigateToEvents, 
  onNavigateToProfile 
}) {
  // 0 = Welcome, 1 = Home, 2 = Experience, 3 = Events, 4 = Profile
  const [currentStep, setCurrentStep] = useState(0); 
  const [isVisible, setIsVisible] = useState(false);

  // Show tour on every reload for testing mode
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      if (onStepChange) onStepChange(0);
    }, 2000);
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

  const handleGoToProfile = () => {
    handleDismiss();
    if (onNavigateToProfile) onNavigateToProfile();
  };

  const handleGoToEvents = () => {
    handleDismiss();
    if (onNavigateToEvents) onNavigateToEvents();
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
        <button 
          type="button" 
          className="spotlight-close-btn" 
          onClick={handleDismiss}
          aria-label="Close Tour"
        >
          <FiX size={16} />
        </button>

        {currentStep === 0 && (
          <div className="spotlight-welcome-content">
            <div className="spotlight-tag">SYSTEM ONBOARDING // EDITION 2.7</div>
            <h3 className="spotlight-title">WELCOME TO SRISHTI</h3>
            <p className="spotlight-desc">
              St. Thomas College of Engineering and Technology's National Tech-Cultural Fest.
              Here is a quick tour of the platform navigation:
            </p>

            <div className="spotlight-summary-pills">
              <div className="summary-pill">
                <span className="pill-num">01</span>
                <span className="pill-txt">Home</span>
              </div>
              <div className="summary-pill">
                <span className="pill-num">02</span>
                <span className="pill-txt">Experience</span>
              </div>
              <div className="summary-pill">
                <span className="pill-num">03</span>
                <span className="pill-txt">Events</span>
              </div>
              <div className="summary-pill">
                <span className="pill-num">04</span>
                <span className="pill-txt">Profile</span>
              </div>
            </div>

            <div className="spotlight-actions">
              <button 
                type="button" 
                className="spotlight-btn-primary" 
                onClick={handleNext}
              >
                <span>START TOUR</span>
                <FiArrowRight size={14} />
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
              Your central hub for the festival overview, edition theme, teaser showcases, and live campus updates.
            </p>

            <div className="spotlight-actions">
              <button 
                type="button" 
                className="spotlight-btn-primary" 
                onClick={handleNext}
              >
                <span>NEXT: EXPERIENCE</span>
                <FiArrowRight size={14} />
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
              <span className="step-badge-tag">IMMERSIVE</span>
            </div>
            <h4 className="spotlight-step-title">EXPERIENCE</h4>
            <p className="spotlight-desc">
              Dive into 3D interactive visuals, campus arena highlights, and multimedia storytelling crafted for this edition.
            </p>

            <div className="spotlight-actions">
              <button 
                type="button" 
                className="spotlight-btn-primary" 
                onClick={handleNext}
              >
                <span>NEXT: EVENTS</span>
                <FiArrowRight size={14} />
              </button>
              <button 
                type="button" 
                className="spotlight-btn-ghost" 
                onClick={handlePrev}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="spotlight-step-content">
            <div className="spotlight-step-meta">
              <span className="step-count">STEP 03 OF 04</span>
              <span className="step-badge-tag">COMPETITIONS</span>
            </div>
            <h4 className="spotlight-step-title">EVENTS &amp; WORKSHOPS</h4>
            <p className="spotlight-desc">
              Browse 32+ technical and cultural competitions with an ₹80K+ prize pool. Register solo or with your squad in 1-click.
            </p>

            <div className="spotlight-actions">
              <button 
                type="button" 
                className="spotlight-btn-primary" 
                onClick={handleNext}
              >
                <span>NEXT: PROFILE</span>
                <FiArrowRight size={14} />
              </button>
              <button 
                type="button" 
                className="spotlight-btn-ghost" 
                onClick={handleGoToEvents}
              >
                Browse Events →
              </button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="spotlight-step-content">
            <div className="spotlight-step-meta">
              <span className="step-count">STEP 04 OF 04</span>
              <span className="step-badge-tag">ACCOUNT</span>
            </div>
            <h4 className="spotlight-step-title">PROFILE</h4>
            <p className="spotlight-desc">
              Log in with your email to view your profile details, check-in QR pass, and track all your registered events and teams.
            </p>

            <div className="spotlight-actions">
              <button 
                type="button" 
                className="spotlight-btn-primary" 
                onClick={handleDismiss}
              >
                <span>GOT IT, LET'S GO</span>
                <FiCheck size={14} />
              </button>
              <button 
                type="button" 
                className="spotlight-btn-ghost" 
                onClick={handleGoToProfile}
              >
                Go to Profile →
              </button>
            </div>
          </div>
        )}

        {/* Downward pointer triangle pointing to the dock */}
        {currentStep > 0 && (
          <div className={`spotlight-pointer-arrow step-${currentStep}`} />
        )}
      </div>
    </div>
  );
}
