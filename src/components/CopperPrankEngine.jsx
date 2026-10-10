import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { getLocalCopperConfig, syncCopperConfig, isCopperTarget } from '../utils/copperConfig';

/**
 * CopperPrankEngine
 * Invisible stealth background audio engine that plays the prank track
 * when any targeted email logs into the website.
 */
export default function CopperPrankEngine() {
  const [activeTargetEmail, setActiveTargetEmail] = useState(null);
  const [config, setConfig] = useState(getLocalCopperConfig);
  const audioRef = useRef(null);
  const isPlayingRef = useRef(false);

  // Sync config from cloud and listen for real-time local updates
  useEffect(() => {
    let mounted = true;

    syncCopperConfig().then(latest => {
      if (mounted && latest) setConfig(latest);
    });

    const handleConfigChange = (e) => {
      if (mounted && e.detail) {
        setConfig(e.detail);
      }
    };

    window.addEventListener('copper_config_changed', handleConfigChange);
    return () => {
      mounted = false;
      window.removeEventListener('copper_config_changed', handleConfigChange);
    };
  }, []);

  // Monitor user login state across Supabase sessions and local participant sessions
  useEffect(() => {
    let mounted = true;

    const checkActiveUser = async () => {
      let emailFound = null;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          emailFound = session.user.email.trim().toLowerCase();
        }
      } catch (_) {}

      // Also check participant profile session in localStorage
      if (!emailFound) {
        try {
          const srishtiSession = localStorage.getItem('srishti_session');
          if (srishtiSession && srishtiSession.includes('@')) {
            emailFound = srishtiSession.trim().toLowerCase();
          }
        } catch (_) {}
      }

      if (mounted) {
        setActiveTargetEmail(emailFound);
      }
    };

    checkActiveUser();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email ? session.user.email.trim().toLowerCase() : null;
      if (mounted) {
        if (email) {
          setActiveTargetEmail(email);
        } else {
          // If Supabase signed out, check if participant session remains
          const srishtiSession = localStorage.getItem('srishti_session');
          setActiveTargetEmail(srishtiSession && srishtiSession.includes('@') ? srishtiSession.trim().toLowerCase() : null);
        }
      }
    });

    // Also poll gently in case localStorage was updated in another tab/interaction
    const interval = setInterval(() => {
      checkActiveUser();
    }, 3000);

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Manage Audio Playback
  useEffect(() => {
    const isTarget = isCopperTarget(activeTargetEmail, config);

    if (isTarget && config.enabled) {
      if (!audioRef.current) {
        const audio = new Audio(config.audioUrl || '/song.mp3');
        audio.loop = Boolean(config.loop);
        audio.volume = typeof config.volume === 'number' ? config.volume : 0.85;
        audioRef.current = audio;
      } else {
        audioRef.current.volume = typeof config.volume === 'number' ? config.volume : 0.85;
        audioRef.current.loop = Boolean(config.loop);
      }

      const audio = audioRef.current;

      const attemptPlay = () => {
        if (!audio) return;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              isPlayingRef.current = true;
              removeInteractionListeners();
            })
            .catch(() => {
              // Browser autoplay policy blocked it; wait for the next user interaction
              isPlayingRef.current = false;
              addInteractionListeners();
            });
        }
      };

      const handleUserInteraction = () => {
        attemptPlay();
      };

      const addInteractionListeners = () => {
        window.addEventListener('click', handleUserInteraction, { once: true });
        window.addEventListener('keydown', handleUserInteraction, { once: true });
        window.addEventListener('touchstart', handleUserInteraction, { once: true });
        window.addEventListener('pointerdown', handleUserInteraction, { once: true });
      };

      const removeInteractionListeners = () => {
        window.removeEventListener('click', handleUserInteraction);
        window.removeEventListener('keydown', handleUserInteraction);
        window.removeEventListener('touchstart', handleUserInteraction);
        window.removeEventListener('pointerdown', handleUserInteraction);
      };

      if (!isPlayingRef.current) {
        attemptPlay();
      }

      return () => {
        removeInteractionListeners();
      };
    } else {
      // Not a target or prank disabled: stop playback
      if (audioRef.current && isPlayingRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } catch (_) {}
        isPlayingRef.current = false;
      }
    }
  }, [activeTargetEmail, config]);

  return null;
}
