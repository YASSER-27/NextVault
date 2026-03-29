import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Dimensions, StatusBar, Platform, I18nManager, BackHandler
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Film, AppWindow, MessageCircle, Menu, X, ChevronRight, Zap } from 'lucide-react-native';

import MediaScreen from './src/screens/MediaScreen';
import AppStoreScreen from './src/screens/AppStoreScreen';
import TawasalScreen from './src/screens/TawasalScreen';

const { width } = Dimensions.get('window');
const SIDEBAR_W = 280;
const ACCENT = '#00d4aa';

export default function App() {
  const [active, setActive] = useState('media');
  const [open, setOpen] = useState(false);
  const slideX = useRef(new Animated.Value(-SIDEBAR_W)).current;
  const fadeOverlay = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const backAction = () => {
      if (open) {
        toggle();
        return true;
      }
      if (active !== 'media') {
        setActive('media');
        return true;
      }
      return false; // let default behavior (close app) happen
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [open, active]);

  const toggle = () => {
    const toOpen = !open;
    Animated.parallel([
      Animated.spring(slideX, { toValue: toOpen ? 0 : -SIDEBAR_W, useNativeDriver: false, friction: 10 }),
      Animated.timing(fadeOverlay, { toValue: toOpen ? 1 : 0, duration: 200, useNativeDriver: true }),
    ]).start();
    setOpen(toOpen);
  };

  const pick = (key) => {
    setActive(key);
    Animated.parallel([
      Animated.spring(slideX, { toValue: -SIDEBAR_W, useNativeDriver: false, friction: 10 }),
      Animated.timing(fadeOverlay, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    setOpen(false);
  };

  const items = [
    { key: 'media', label: 'Media', Icon: Film, desc: 'Films, Series, Songs' },
    { key: 'apps', label: 'App Store', Icon: AppWindow, desc: 'Games & Apps' },
    { key: 'tawasal', label: 'Tawasal', Icon: MessageCircle, desc: 'Chat & Social' },
  ];

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0a0b0e" translucent={false} />
      <View style={s.root}>
        {/* Active Screen */}
        <View style={s.content}>
          <View style={{ position: 'absolute', top: 10, alignSelf: 'center', zIndex: -1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.05)', fontSize: 32, fontWeight: '900', letterSpacing: 4 }}>NextVault</Text>
          </View>
          {active === 'media' && <MediaScreen onMenuPress={toggle} />}
          {active === 'apps' && <AppStoreScreen onMenuPress={toggle} />}
          {active === 'tawasal' && <TawasalScreen onMenuPress={toggle} />}
          <View style={{ position: 'absolute', bottom: 10, alignSelf: 'center', zIndex: 100 }} pointerEvents="none">
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700' }}>yasser 27</Text>
          </View>
        </View>

        {/* Dark Overlay */}
        {open && (
          <Animated.View style={[s.overlay, { opacity: fadeOverlay }]} pointerEvents="auto">
            <TouchableOpacity style={{ flex: 1 }} onPress={toggle} activeOpacity={1} />
          </Animated.View>
        )}

        {/* Sidebar */}
        <Animated.View style={[s.sidebar, { left: slideX }]}>
          {/* Header */}
          <View style={s.sideHead}>
            <View style={s.logoRow}>
              <Zap color={ACCENT} size={22} />
              <Text style={s.logoText}>NextVault</Text>
            </View>
            <TouchableOpacity onPress={toggle} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
              <X color="rgba(255,255,255,0.4)" size={20} />
            </TouchableOpacity>
          </View>

          {/* Nav Items */}
          <View style={s.navList}>
            {items.map(({ key, label, Icon, desc }) => {
              const act = active === key;
              return (
                <TouchableOpacity key={key} onPress={() => pick(key)}
                  style={[s.navItem, act && s.navItemActive]} activeOpacity={0.7}>
                  <View style={[s.iconWrap, act && s.iconWrapActive]}>
                    <Icon color={act ? ACCENT : 'rgba(255,255,255,0.35)'} size={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.navLabel, act && { color: '#fff' }]}>{label}</Text>
                    <Text style={s.navDesc}>{desc}</Text>
                  </View>
                  <ChevronRight color={act ? ACCENT : 'rgba(255,255,255,0.1)'} size={15} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer */}
          <View style={s.sideFooter}>
            <Text style={s.footerText}>NextVault Ecosystem</Text>
            <Text style={s.footerVer}>v1.0.0</Text>
          </View>
        </Animated.View>

        {/* Floating Menu Button */}
        {!open && (
          <TouchableOpacity style={s.fab} onPress={toggle} activeOpacity={0.8}>
            <Menu color="#fff" size={20} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0b0e' },
  content: { flex: 1 },

  overlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 90,
  },

  sidebar: {
    position: 'absolute', top: 0, bottom: 0, left: 0, width: SIDEBAR_W,
    backgroundColor: '#111218', zIndex: 100,
    borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.05)',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
  },
  sideHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 24,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },

  navList: { paddingHorizontal: 14 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderRadius: 14, marginBottom: 6,
  },
  navItemActive: { backgroundColor: 'rgba(0,212,170,0.08)' },
  iconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  iconWrapActive: { backgroundColor: 'rgba(0,212,170,0.12)' },
  navLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: '700' },
  navDesc: { color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 1 },

  sideFooter: {
    position: 'absolute', bottom: 30, left: 0, right: 0,
    alignItems: 'center',
  },
  footerText: { color: 'rgba(255,255,255,0.15)', fontSize: 12 },
  footerVer: { color: 'rgba(255,255,255,0.08)', fontSize: 10, marginTop: 2 },

  fab: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 52,
    left: 16, width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center', zIndex: 50,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
});
