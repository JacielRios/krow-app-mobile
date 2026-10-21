import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

/** Keep the native dialog alive through its exit. Reopening cancels the old exit. */
export function useModalPresence(visible: boolean, motionEnabled: boolean) {
  const [presented, setPresented] = useState(visible);
  const progress = useRef(
    new Animated.Value(visible && !motionEnabled ? 1 : 0),
  ).current;
  const revision = useRef(0);
  const animate = useCallback(
    (shown: boolean) => {
      const current = ++revision.current;
      progress.stopAnimation();
      if (!motionEnabled) {
        progress.setValue(shown ? 1 : 0);
        if (!shown) setPresented(false);
        return;
      }
      Animated.timing(progress, {
        toValue: shown ? 1 : 0,
        duration: shown ? 220 : 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
        isInteraction: false,
      }).start(({ finished }) => {
        if (finished && !shown && current === revision.current)
          setPresented(false);
      });
    },
    [motionEnabled, progress],
  );

  useEffect(() => {
    if (!visible && !presented) return;
    const lifetime = revision;
    if (visible) setPresented(true);
    animate(visible);
    return () => {
      ++lifetime.current;
      progress.stopAnimation();
    };
  }, [visible, presented, animate, progress]);

  return {
    presented,
    progress,
    onShow: () => {
      if (visible) animate(true);
    },
  };
}
