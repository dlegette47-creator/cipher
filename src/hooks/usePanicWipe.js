import { useEffect, useRef } from 'react';
import { db } from '../db';

export function usePanicWipe(identity, enabled) {
  // useIdentity returns a new object every render; keep it in a ref so the
  // listener (and its arm delay) isn't torn down and re-armed on every render.
  const identityRef = useRef(identity);
  identityRef.current = identity;

  useEffect(() => {
    if (!enabled) return;

    let lastX = null, lastY = null, lastZ = null;
    let lastTime = 0;
    let spikeCount = 0;
    let lastSpikeTime = 0;
    let cancelled = false;
    // Critical: ignore motion for 3 seconds after toggling, so the tap itself doesn't wipe
    const ARM_DELAY = 3000;
    const armTime = Date.now() + ARM_DELAY;

    // Thresholds (tuned for gravity-included accelerometer, m/s²)
    const SHAKE_THRESHOLD = 35;     // magnitude of delta required for a spike
    const SPIKE_WINDOW = 1000;      // spikes must occur within this window
    const REQUIRED_SPIKES = 3;      // must detect this many spikes in the window
    const MIN_EVENT_INTERVAL = 50;  // throttle to ~20Hz

    const triggerWipe = async () => {
      if (window.__PANIC_WIPING) return;
      window.__PANIC_WIPING = true;

      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 300]);

      // Full wipe: every account's IndexedDB, caches, service workers, storage.
      const fullWipe = identityRef.current?.panicWipe;
      if (typeof fullWipe === 'function') {
        await fullWipe();
        return;
      }

      try {
        sessionStorage.clear();
        localStorage.clear();
        await Promise.race([
          db.delete().catch(() => {}),
          new Promise((r) => setTimeout(r, 800)),
        ]);
      } catch (e) {
        // ignore
      }
      window.location.reload();
    };

    const handleMotion = (event) => {
      if (Date.now() < armTime) return;

      const a = event.accelerationIncludingGravity || event.acceleration;
      if (!a || a.x === null || a.y === null || a.z === null) return;

      const now = Date.now();
      if (now - lastTime < MIN_EVENT_INTERVAL) return;
      lastTime = now;

      if (lastX !== null) {
        const magnitude = Math.abs(a.x - lastX) + Math.abs(a.y - lastY) + Math.abs(a.z - lastZ);

        if (magnitude > SHAKE_THRESHOLD) {
          if (now - lastSpikeTime > SPIKE_WINDOW) spikeCount = 0;
          spikeCount++;
          lastSpikeTime = now;

          if (spikeCount >= REQUIRED_SPIKES) {
            triggerWipe();
          }
        }
      }

      lastX = a.x;
      lastY = a.y;
      lastZ = a.z;
    };

    const setup = async () => {
      // iOS 13+ requires explicit permission for motion events
      if (
        typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function'
      ) {
        try {
          const permission = await DeviceMotionEvent.requestPermission();
          if (permission !== 'granted') {
            console.warn('Motion permission denied — panic wipe disabled');
            return;
          }
        } catch (e) {
          console.warn('Motion permission request failed:', e);
          return;
        }
      }
      if (!cancelled) window.addEventListener('devicemotion', handleMotion);
    };

    setup();

    return () => {
      cancelled = true;
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [enabled]);
}
