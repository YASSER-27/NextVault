import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Image, FlatList, Alert, Dimensions, Platform, StatusBar, BackHandler
} from 'react-native';
import { WebView } from 'react-native-webview';
import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { BASE_URL } from '../config/api';
import { colors } from '../theme/colors';
import { PlayCircle, ChevronRight, Download, Trash2, Check, Film, Music, Tv, Video } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48 - 12) / 2;
const SAVED_DIR = FileSystem.documentDirectory + 'after_dowload/';
const ACCENT = '#00d4aa';

const SUB_TABS = [
    { key: 'films', label: 'Films', Icon: Film },
    { key: 'series', label: 'Series', Icon: Tv },
    { key: 'songs', label: 'Songs', Icon: Music },
];

export default function MediaScreen({ onMenuPress }) {
    const [media, setMedia] = useState({ films: [], series: [], songs: [] });
    const [loading, setLoading] = useState(true);
    const [activeVideo, setActiveVideo] = useState(null);
    const [expandedShow, setExpandedShow] = useState(null);
    const [savedFiles, setSavedFiles] = useState([]);
    const [downloading, setDownloading] = useState(null);
    const [subTab, setSubTab] = useState('films');

    useEffect(() => {
        axios.get(`${BASE_URL}/api/media`)
            .then(res => { setMedia(res.data); setLoading(false); })
            .catch(() => setLoading(false));
        loadSaved();
    }, []);

    useEffect(() => {
        const backAction = () => {
            if (activeVideo) {
                setActiveVideo(null);
                return true;
            }
            if (expandedShow) {
                setExpandedShow(null);
                return true;
            }
            if (subTab !== 'films') {
                setSubTab('films');
                return true;
            }
            return false;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [activeVideo, expandedShow, subTab]);

    const loadSaved = async () => {
        try {
            const info = await FileSystem.getInfoAsync(SAVED_DIR);
            if (!info.exists) await FileSystem.makeDirectoryAsync(SAVED_DIR, { intermediates: true });
            const files = await FileSystem.readDirectoryAsync(SAVED_DIR);
            setSavedFiles(files);
        } catch (e) { }
    };

    const isSaved = (f) => savedFiles.includes(f.replace(/[^a-zA-Z0-9._-]/g, '_'));

    const downloadFile = async (url, filename) => {
        try {
            setDownloading(filename);
            const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            await FileSystem.downloadAsync(url, SAVED_DIR + safeName);
            await loadSaved();
            Alert.alert('Saved', `${filename} saved offline.`);
        } catch (e) { Alert.alert('Error', 'Download failed.'); }
        finally { setDownloading(null); }
    };

    const deleteSaved = (filename) => {
        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        Alert.alert('Delete', `Remove ${filename}?`, [
            { text: 'Cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    await FileSystem.deleteAsync(SAVED_DIR + safeName, { idempotent: true });
                    await loadSaved();
                }
            }
        ]);
    };

    const playMedia = (category, item, sub) => {
        const parts = sub ? [category, sub, item] : [category, item];
        const uri = `${BASE_URL}/media/${parts.map(encodeURIComponent).join('/')}`;
        setActiveVideo({ uri, name: item });
    };

    const plyrHTML = (url) => `<!DOCTYPE html><html><head>
      <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
      <link rel="stylesheet" href="${BASE_URL}/plyr/plyr.css"/>
      <style>body,html{margin:0;padding:0;background:#000;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden}.plyr{width:100%;height:100%;--plyr-color-main:#7042f8}</style>
    </head><body>
      <video id="p" playsinline controls><source src="${url}" type="video/mp4"/></video>
      <script src="${BASE_URL}/plyr/plyr.min.js"></script>
      <script>new Plyr('#p',{controls:['play-large','play','progress','current-time','mute','volume','fullscreen'],autoplay:true});</script>
    </body></html>`;

    const isMedia = (n) => /\.(mp4|mkv|avi|webm|mov|mp3|wav|flac|ogg)$/i.test(n);

    const renderCard = (item, category, sub) => {
        if (!isMedia(item)) return null;
        const parts = sub ? [category, sub, item] : [category, item];
        const fileUrl = `${BASE_URL}/media/${parts.map(encodeURIComponent).join('/')}`;
        const pName = item.substring(0, item.lastIndexOf('.')) + '.jpg';
        const pParts = sub ? [category, sub, pName] : [category, pName];
        const posterUrl = `${BASE_URL}/media/${pParts.map(encodeURIComponent).join('/')}`;
        const saved = isSaved(item);
        const isDown = downloading === item;

        return (
            <View key={item} style={s.cardWrap}>
                <TouchableOpacity onPress={() => playMedia(category, item, sub)} activeOpacity={0.8}>
                    <View style={s.card}>
                        <View style={s.thumbBox}>
                            <Image source={{ uri: posterUrl }} style={s.poster} />
                            <View style={s.playOv}><PlayCircle color="#fff" size={26} /></View>
                        </View>
                        <Text style={s.cardName} numberOfLines={2}>{item}</Text>
                    </View>
                </TouchableOpacity>
                <View style={s.cardActs}>
                    {saved ? (
                        <TouchableOpacity onPress={() => deleteSaved(item)} style={s.actBtn}>
                            <Check color="#4ade80" size={13} /><Text style={[s.actBtnT, { color: '#4ade80' }]}>Saved</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={() => downloadFile(fileUrl, item)} style={s.actBtn} disabled={isDown}>
                            {isDown ? <ActivityIndicator size="small" color={colors.glow} /> :
                                <><Download color="rgba(255,255,255,0.35)" size={13} /><Text style={s.actBtnT}>Save</Text></>}
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    // Build data for FlatList based on active sub-tab
    const buildData = () => {
        if (subTab === 'films') {
            const items = (media.films || []).filter(isMedia);
            return [{ type: 'grid', items, category: 'films', key: 'films-grid' }];
        }
        if (subTab === 'songs') {
            const items = (media.songs || []).filter(isMedia);
            return [{ type: 'grid', items, category: 'songs', key: 'songs-grid' }];
        }
        if (subTab === 'series') {
            const data = [];
            (media.series || []).forEach((show, idx) => {
                if (typeof show === 'string') {
                    if (isMedia(show)) data.push({ type: 'grid', items: [show], category: 'series', key: `s-${idx}` });
                } else {
                    data.push({ type: 'show', show, key: `show-${idx}` });
                    if (expandedShow === show.showName) {
                        data.push({ type: 'grid', items: show.episodes, category: 'series', subFolder: show.showName, key: `ep-${idx}` });
                    }
                }
            });
            return data;
        }
        return [];
    };

    const renderItem = ({ item }) => {
        if (item.type === 'grid') {
            if (item.items.length === 0) return (
                <View style={s.emptyB}><Text style={s.emptyT}>No {subTab} found</Text></View>
            );
            return (
                <View style={s.grid}>
                    {item.items.map(i => renderCard(i, item.category, item.subFolder || null))}
                </View>
            );
        }
        if (item.type === 'show') {
            const exp = expandedShow === item.show.showName;
            return (
                <TouchableOpacity style={s.showHead} onPress={() => setExpandedShow(exp ? null : item.show.showName)}>
                    <Text style={s.showName}>{item.show.showName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={s.epCount}>{item.show.episodes.length} ep</Text>
                        <ChevronRight color="rgba(255,255,255,0.35)" size={17}
                            style={{ transform: [{ rotate: exp ? '90deg' : '0deg' }] }} />
                    </View>
                </TouchableOpacity>
            );
        }
        return null;
    };

    const TOP = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;

    if (loading) return <View style={s.loader}><ActivityIndicator size="large" color={ACCENT} /></View>;

    return (
        <View style={s.container}>
            {/* Player */}
            {activeVideo && (
                <View style={s.playerWrap}>
                    <WebView source={{ html: plyrHTML(activeVideo.uri) }} style={{ flex: 1, backgroundColor: '#000' }}
                        scrollEnabled={false} allowsFullscreenVideo mediaPlaybackRequiresUserAction={false} />
                    <TouchableOpacity style={s.closeBtn} onPress={() => setActiveVideo(null)}>
                        <Text style={s.closeBtnT}>X</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Header */}
            <View style={[s.header, { paddingTop: TOP + 8 }]}>
                <Text style={s.headerTitle}>Media</Text>
            </View>

            {/* Content */}
            <FlatList
                data={buildData()}
                keyExtractor={item => item.key}
                renderItem={renderItem}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
                showsVerticalScrollIndicator={false}
            />

            {/* Bottom Sub-Tabs */}
            <View style={s.bottomBar}>
                {SUB_TABS.map(({ key, label, Icon }) => {
                    const act = subTab === key;
                    return (
                        <TouchableOpacity key={key} onPress={() => setSubTab(key)} style={s.subTab} activeOpacity={0.7}>
                            <Icon color={act ? ACCENT : 'rgba(255,255,255,0.3)'} size={20} />
                            <Text style={[s.subTabL, act && { color: ACCENT }]}>{label}</Text>
                            {act && <View style={s.subTabDot} />}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0b0e' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0b0e' },

    header: {
        paddingHorizontal: 18, paddingBottom: 10, paddingLeft: 64,
        backgroundColor: '#0f1014', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8 },

    cardWrap: { width: CARD_W, marginBottom: 14 },
    card: {
        backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, overflow: 'hidden',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    },
    thumbBox: { width: '100%', height: 88, backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center', alignItems: 'center' },
    poster: { position: 'absolute', width: '100%', height: '100%', opacity: 0.4 },
    playOv: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 17, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    cardName: { color: '#fff', fontSize: 11, fontWeight: '600', padding: 8, lineHeight: 14 },
    cardActs: { flexDirection: 'row', marginTop: 2, paddingHorizontal: 2 },
    actBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
    actBtnT: { color: 'rgba(255,255,255,0.35)', fontSize: 11 },

    showHead: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, marginBottom: 8, marginTop: 4,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    },
    showName: { color: '#fff', fontWeight: '700', fontSize: 15 },
    epCount: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginRight: 4 },

    emptyB: { alignItems: 'center', marginTop: 60 },
    emptyT: { color: 'rgba(255,255,255,0.2)', fontSize: 14 },

    playerWrap: { width: '100%', height: 210, backgroundColor: '#000', zIndex: 50 },
    closeBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.7)', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    closeBtnT: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    nowPlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', paddingVertical: 5, paddingHorizontal: 10 },
    nowPlayT: { color: '#fff', fontSize: 11 },

    bottomBar: {
        flexDirection: 'row', justifyContent: 'space-around',
        backgroundColor: '#0f1014', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
        paddingVertical: 8, paddingBottom: 12,
    },
    subTab: { alignItems: 'center', paddingVertical: 4, paddingHorizontal: 16 },
    subTabL: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', marginTop: 3 },
    subTabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: ACCENT, marginTop: 3 },
});
