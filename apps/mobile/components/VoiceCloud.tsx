import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

export function VoiceCloud({ listening, pending, disabled, onPress }: {
  listening: boolean; pending: boolean; disabled: boolean; onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(true);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const app = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => { mounted = false; motion.remove(); app.remove(); };
  }, []);
  useEffect(() => {
    pulse.setValue(0);
    if (reduceMotion || !active || disabled || pending) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: listening ? 850 : 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: listening ? 850 : 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    animation.start();
    return () => { animation.stop(); pulse.setValue(0); };
  }, [active, disabled, listening, pending, pulse, reduceMotion]);
  return <Pressable accessibilityRole="button" accessibilityLabel={pending ? 'Starting microphone' : listening ? 'Stop listening' : 'Tap to speak'} accessibilityState={{ disabled: disabled || pending }} disabled={disabled || pending} onPress={onPress} style={({ pressed }) => [styles.target, { opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }]}>
    <Animated.View pointerEvents="none" style={[styles.halo, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.45] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.93, 1.08] }) }] }]} />
    <Animated.View pointerEvents="none" style={[styles.cloud, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) }] }]}>
      <View style={[styles.lobe, styles.left]} /><View style={[styles.lobe, styles.top]} /><View style={[styles.lobe, styles.right]} /><View style={styles.base} />
      <View style={styles.label}><View style={styles.waves}>{[10, 22, 32, 22, 10].map((height, i) => <View key={i} style={{ height, width: 4, borderRadius: 4, backgroundColor: 'white' }} />)}</View><Text style={styles.text}>{pending ? 'One moment…' : listening ? 'Listening…' : 'Tap to speak'}</Text></View>
    </Animated.View>
  </Pressable>;
}
const styles = StyleSheet.create({
  target: { width: 290, height: 260, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 282, height: 230, borderRadius: 120, backgroundColor: '#B9E2FF' },
  cloud: { width: 258, height: 198, shadowColor: '#3595E5', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 18 },
  lobe: { position: 'absolute', backgroundColor: '#398FDF' },
  left: { width: 114, height: 114, borderRadius: 57, left: 0, top: 65 },
  top: { width: 152, height: 152, borderRadius: 76, left: 47, top: 8 },
  right: { width: 119, height: 119, borderRadius: 60, right: 0, top: 61 },
  base: { position: 'absolute', backgroundColor: '#398FDF', height: 104, bottom: 15, left: 19, right: 18, borderRadius: 52 },
  label: { position: 'absolute', left: 0, right: 0, top: 78, alignItems: 'center', gap: 13 },
  waves: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 32 },
  text: { fontSize: 19, fontWeight: '600', color: 'white' },
});
