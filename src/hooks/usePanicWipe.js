import { useEffect } from 'react';
import { db } from '../db';

export function usePanicWipe(identity, enabled) {
  useEffect(() => {
    if (!enabled) return;

    let lastX = null, lastY = null, lastZ = null;
    let lastTime = 0;
    let spikeCount = 0;
    let lastSpikeTime = 0;
    // Critical: ignore motion for 3 seconds after toggling, so the tap itself doesn't wipe
    const ARM_DELAY = 3000;
    const armTime = Date.now() + ARM_DELAY;

    // Thresholds (tuned for gravity-included accelerometer, m/s²)
    const SHAKE_THRESHOLD = 35;     // magnitude of delta required for a spike
    const SPIKE_WINDOW = 1000;      // spikes must occur within this window
    const REQUIRED_SPIKES = 3;      // must detect this many spikes in the window
    const MIN_EVENT_INTERVAL = 50;  // throttle to ~20Hz

    const handleMotion = (event) => {
      // Still arming — ignore all motion
      if (Date.now() < armTime) return;

      const a = event.accelerationIncludingGravity || event.acceleration;
      if (!a || a.x === null || a.y === null || a.z === null) return;

      const now = Date.now();
      if (now - lastTime < MIN_EVENT_INTERVAL) return;
      lastTime = now;

      if (lastX !== null) {
        const dX = Math.abs(a.x - lastX);
        const dY = Math.abs(a.y - lastY);
        const dZ = Math.abs(a.z - lastZ);
        const magnitude = dX + dY + dZ;

        if (magnitude > SHAKE_THRESHOLD) {
          // Reset counter if last spike was too long ago
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

    const triggerWipe = async () => {
      if (window.__PANIC_WIPING) return;
      window.__PANIC_WIPING = true;

      // Vibrate to confirm (three buzzes)
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 300]);

      try {
        sessionStorage.clear();
        localStorage.clear();
        // Attempt DB delete with timeout — don't hang forever
        await Promise.race([
          db.delete().catch(() => {}),
          new Promise((r) => setTimeout(r, 800)),
        ]);
      } catch (e) {
        // ignore
      }

      // Reload to lock screen (all data gone)
      window.location.reload();
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
      window.addEventListener('devicemotion', handleMotion);
    };

    setup();

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [enabled, identity]);
}
