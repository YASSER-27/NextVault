import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Film, AppWindow, FileBarChart, Settings, Minus, Square, X, Plus, Zap, Heart, Share2, MessageSquare, Trash2, ArrowLeft, Image as ImageIcon, Paperclip, Users, Play, Mic } from 'lucide-react';
import '../artplayer/artplayer.js';

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
    <div
        onClick={onClick}
        className={`flex items-center space-x-2 p-2 rounded-xl cursor-pointer transition-all duration-300 group ${active
            ? 'bg-light-glow/20 border border-light-glow/30 text-white shadow-[0_0_20px_rgba(112,66,248,0.1)]'
            : 'hover:bg-white/5 border border-transparent hover:border-white/10 text-light-muted hover:text-white'
            }`}
    >
        <div className={`p-1 rounded-lg ${active ? 'bg-light-glow/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
            <Icon size={16} className={active ? 'text-light-glow' : 'text-light-muted'} />
        </div>
        <span className="font-semibold tracking-tight text-xs">{label}</span>
    </div>
);

const GlassCard = ({ children, className = '' }) => (
    <div className={`glassmorphism rounded-2xl p-6 ${className}`}>
        {children}
    </div>
);

const TitleBar = () => {
    const [info, setInfo] = useState(null);
    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.getServerInfo().then(setInfo);
        }
    }, []);

    const handleMinimize = () => { if (window.electronAPI) window.electronAPI.minimize(); };
    const handleMaximize = () => { if (window.electronAPI) window.electronAPI.maximize(); };
    const handleClose = () => { if (window.electronAPI) window.electronAPI.close(); };

    return (
        <div className="h-10 flex justify-between items-center bg-dark-bg/80 backdrop-blur-md border-b border-white/5 titlebar-draggable select-none fixed top-0 w-full z-50 px-4">
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    <Zap size={16} className="text-light-glow fill-light-glow/20" />
                    <span className="text-sm font-bold tracking-tight text-white uppercase">Next<span className="text-light-glow font-light">Vault</span></span>
                </div>
                {info && (
                    <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5 flex items-center space-x-2 titlebar-nodrag cursor-default hover:bg-white/10 transition">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[11px] font-mono text-light-muted uppercase tracking-wider">{info.host || '0.0.0.0'}:{info.port} <span className="text-white/20 select-none">|</span> <span className="text-light-glow">@{info.joinCode}</span></span>
                    </div>
                )}
            </div>
            <div className="flex h-full titlebar-nodrag items-center">
                <button onClick={handleMinimize} className="w-8 h-8 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center text-light-muted hover:text-white">
                    <Minus size={16} />
                </button>
                <button onClick={handleMaximize} className="w-8 h-8 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center text-light-muted hover:text-white">
                    <Square size={12} />
                </button>
                <button onClick={handleClose} className="w-8 h-8 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors flex items-center justify-center text-light-muted ml-1">
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

const VideoPlayer = ({ url, poster, onClose }) => {
    const playerRef = React.useRef(null);
    React.useEffect(() => {
        const art = new window.Artplayer({
            container: playerRef.current,
            url: url,
            poster: poster,
            autoSize: true,
            fullscreen: true,
            theme: '#4dabf7'
        });
        return () => art.destroy(false);
    }, [url, poster]);

    return (
        <div className="absolute inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center animate-[fadeIn_0.3s]">
            <div className="absolute top-8 right-8 z-[70]">
                <button onClick={onClose} className="text-white bg-white/10 p-3 rounded-lg hover:bg-white/20 transition-colors"><X size={24} /></button>
            </div>
            <div ref={playerRef} className="w-full h-[80vh] max-w-6xl shadow-neu-outset border border-white/5 rounded-2xl overflow-hidden"></div>
        </div>
    );
};

const FloatingActionButton = ({ onClick }) => (
    <button
        onClick={onClick}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-dark-bg border border-white/5 shadow-neu-outset flex items-center justify-center text-light-glow hover:scale-105 active:shadow-neu-inset transition-all z-50 hover:border-light-glow/50 titlebar-nodrag"
    >
        <Plus size={28} />
    </button>
);

const UploadModal = ({ isOpen, onClose, fetchMedia, fetchApps }) => {
    if (!isOpen) return null;

    const [title, setTitle] = useState('');
    const [type, setType] = useState('films');
    const [file, setFile] = useState(null);
    const [cover, setCover] = useState(null);

    const handleUpload = async () => {
        if (!file) return;
        const formData = new FormData();
        formData.append('title', title);
        formData.append('type', type);
        formData.append('file', file);
        if (cover) formData.append('cover', cover);

        try {
            await fetch('http://localhost:3000/api/upload', {
                method: 'POST',
                body: formData
            });
            onClose();
            if (type === 'app' && fetchApps) fetchApps();
            if (type !== 'app' && fetchMedia) fetchMedia();
        } catch (e) {
            console.error('Upload error', e);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-[fadeIn_0.3s_ease-out]">
            <GlassCard className="w-full max-w-md bg-dark-bg border border-white/10 shadow-neu-outset">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Upload Content</h2>
                    <button onClick={onClose} className="text-light-text hover:text-white"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-light-text/70 mb-1 block">Title (Used for saving)</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-dark-bg p-3 rounded-xl shadow-neu-inset text-white outline-none border-none" />
                    </div>

                    <div>
                        <label className="text-xs text-light-text/70 mb-1 block">Content Type</label>
                        <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-dark-bg p-3 rounded-xl shadow-neu-inset text-white outline-none border-none">
                            <option value="films">Film</option>
                            <option value="series">Series</option>
                            <option value="songs">Music</option>
                            <option value="app">Android App</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-light-text/70 mb-1 block">Main File (.mp4, .apk, etc)</label>
                        <input type="file" onChange={e => setFile(e.target.files[0])} className="w-full text-light-text text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-light-glow/20 file:text-light-glow hover:file:bg-light-glow/30" />
                    </div>

                    <div>
                        <label className="text-xs text-light-text/70 mb-1 block">Cover Image (.jpg/.png)</label>
                        <input type="file" onChange={e => setCover(e.target.files[0])} className="w-full text-light-text text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-purple-500/20 file:text-purple-400 hover:file:bg-purple-500/30" />
                    </div>

                    <button onClick={handleUpload} className="w-full mt-6 bg-dark-bg text-light-glow font-bold py-3 rounded-xl shadow-neu-outset active:shadow-neu-inset transition-all">
                        Upload & Save
                    </button>
                </div>
            </GlassCard>
        </div>
    );
};

const OverviewPage = () => {
    const [stats, setStats] = useState({ media: 0, apps: 0, users: 0, downloads: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('http://localhost:3000/api/media').then(res => res.json()),
            fetch('http://localhost:3000/api/apps').then(res => res.json()),
            fetch('http://localhost:3000/api/users').then(res => res.json()),
            fetch('http://localhost:3000/api/stats').then(res => res.json())
        ]).then(([media, apps, users, downloadStats]) => {
            const totalMedia = (media.films?.length || 0) + (media.series?.length || 0) + (media.songs?.length || 0);
            const totalDownloads = Object.values(downloadStats).reduce((a, b) => a + b, 0);
            setStats({
                media: totalMedia,
                apps: apps.length,
                users: users.length,
                downloads: totalDownloads
            });
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="h-full flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-light-glow border-t-transparent animate-spin"></div></div>;

    return (
        <div className="animate-[fadeIn_0.5s_ease-out] space-y-6">
            <div className="flex flex-col">
                <h1 className="text-2xl font-black text-white uppercase tracking-tighter">System <span className="text-light-glow font-light italic">Intelligence</span></h1>
                <p className="text-[10px] text-light-muted mt-1 uppercase tracking-[0.2em] font-bold">Real-time local ecosystem telemetry</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/5 p-4 rounded-[1.5rem] shadow-xl hover:bg-white/[0.08] transition group">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-1.5 bg-light-glow/10 rounded-lg text-light-glow"><Users size={16} /></div>
                        <div className="text-[8px] font-bold text-green-500 uppercase tracking-widest">Active</div>
                    </div>
                    <div className="text-2xl font-black text-white group-hover:scale-105 transition-transform origin-left">{stats.users}</div>
                    <div className="text-[8px] font-bold text-light-muted uppercase tracking-widest mt-1">Local Citizens</div>
                </div>

                <div className="bg-white/5 border border-white/5 p-4 rounded-[1.5rem] shadow-xl hover:bg-white/[0.08] transition group">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400"><Film size={16} /></div>
                    </div>
                    <div className="text-2xl font-black text-white group-hover:scale-105 transition-transform origin-left">{stats.media}</div>
                    <div className="text-[8px] font-bold text-light-muted uppercase tracking-widest mt-1">Media Assets</div>
                </div>

                <div className="bg-white/5 border border-white/5 p-4 rounded-[1.5rem] shadow-xl hover:bg-white/[0.08] transition group">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400"><AppWindow size={16} /></div>
                    </div>
                    <div className="text-2xl font-black text-white group-hover:scale-105 transition-transform origin-left">{stats.apps}</div>
                    <div className="text-[8px] font-bold text-light-muted uppercase tracking-widest mt-1">Binary Packages</div>
                </div>

                <div className="bg-white/5 border border-white/5 p-4 rounded-[1.5rem] shadow-xl hover:bg-white/[0.08] transition group">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-1.5 bg-orange-500/10 rounded-lg text-orange-400"><Zap size={16} /></div>
                    </div>
                    <div className="text-2xl font-black text-white group-hover:scale-105 transition-transform origin-left">{stats.downloads}</div>
                    <div className="text-[8px] font-bold text-light-muted uppercase tracking-widest mt-1">Network Traffic</div>
                </div>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-light-glow/5 blur-[60px] rounded-full"></div>
                <div className="relative z-10">
                    <h3 className="text-base font-bold text-white mb-4 flex items-center">
                        <Share2 size={16} className="mr-2 text-light-glow" /> System Environment
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {['Node.js v18.0+', 'Express Kernel', 'Socket.io Mesh', 'Encryption: None'].map(sys => (
                            <div key={sys} className="px-3 py-2 bg-white/5 rounded-xl border border-white/5 text-[9px] font-bold uppercase tracking-wider text-light-muted">{sys}</div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MediaManager = ({ triggerRefetch }) => {
    const [media, setMedia] = useState({ films: [], series: [], songs: [] });
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeVideo, setActiveVideo] = useState(null);

    const fetchMedia = () => {
        fetch('http://localhost:3000/api/media')
            .then(res => res.json())
            .then(data => { setMedia(data); setLoading(false); })
            .catch(err => { console.error(err); setLoading(false); });
        fetch('http://localhost:3000/api/stats').then(res => res.json()).then(setStats).catch(() => { });
    }

    useEffect(() => { fetchMedia(); }, [triggerRefetch]);

    const playMedia = (category, item, subFolder = null) => {
        const parts = subFolder ? [category, subFolder, item] : [category, item];
        const url = `http://localhost:3000/media/${parts.map(encodeURIComponent).join('/')}`;
        const posterName = item.substring(0, item.lastIndexOf('.')) + '.jpg';
        const pParts = subFolder ? [category, subFolder, posterName] : [category, posterName];
        const poster = `http://localhost:3000/media/${pParts.map(encodeURIComponent).join('/')}`;
        setActiveVideo({ url, poster });
    };

    const renderGrid = (category, items, subFolder = null) => {
        const valid = items.filter(i => typeof i === 'string' && /\.(mp4|mkv|avi|webm|mov|mp3|wav|flac|ogg)$/i.test(i));
        if (valid.length === 0) return <div className="col-span-full py-8 text-center text-light-text/40 italic bg-dark-bg/20 rounded-xl">No items</div>;
        return valid.map((item, idx) => {
            const posterName = item.substring(0, item.lastIndexOf('.')) + '.jpg';
            const pParts = subFolder ? [category, subFolder, posterName] : [category, posterName];
            const parts = subFolder ? [category, subFolder, item] : [category, item];
            const posterUrl = `http://localhost:3000/media/${pParts.map(encodeURIComponent).join('/')}`;
            const realFileKey = `/${parts.map(encodeURIComponent).join('/')}`;
            const count = stats[realFileKey] || 0;
            return (
                <GlassCard key={idx} className="flex flex-col items-center justify-center p-3 hover:border-light-glow/50 transition-colors cursor-pointer group relative" onClick={() => playMedia(category, item, subFolder)}>
                    {count > 0 && <div className="absolute top-2 right-2 bg-accent-purple text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full z-20 shadow-md">{count} v</div>}
                    <div className="w-full h-24 rounded-xl bg-dark-bg shadow-neu-inset flex items-center justify-center mb-3 overflow-hidden relative group-hover:scale-105 transition-transform">
                        <img src={posterUrl} onError={(e) => e.target.style.display = 'none'} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                        <Film className="text-light-glow/70 relative z-10" size={24} />
                    </div>
                    <span className="text-xs font-medium text-center truncate w-full px-1" title={item}>{item}</span>
                </GlassCard>
            );
        });
    };

    return (
        <div className="animate-[fadeIn_0.5s_ease-out] h-full flex flex-col">
            <h1 className="text-3xl font-bold mb-8 text-white drop-shadow-md">Media Manager</h1>
            {activeVideo && <VideoPlayer url={activeVideo.url} poster={activeVideo.poster} onClose={() => setActiveVideo(null)} />}

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-4 border-light-glow border-t-transparent animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8 overflow-y-auto pr-4 pb-20">
                    {/* Films */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4 capitalize text-light-text flex items-center">
                            <div className="w-1 h-4 bg-light-glow rounded mr-2"></div>Films
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {renderGrid('films', media.films || [])}
                        </div>
                    </div>

                    {/* Series */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4 capitalize text-light-text flex items-center">
                            <div className="w-1 h-4 bg-light-glow rounded mr-2"></div>Series
                        </h2>
                        {(media.series || []).length === 0 ? <div className="py-8 text-center text-light-text/40 italic bg-dark-bg/20 rounded-xl">No items</div> : null}
                        {(media.series || []).map((show, idx) => {
                            if (typeof show === 'string') {
                                return (
                                    <div key={idx} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                                        {renderGrid('series', [show])}
                                    </div>
                                );
                            }
                            return (
                                <div key={idx} className="mb-6 bg-dark-bg/30 p-4 rounded-2xl border border-dark-border">
                                    <h3 className="text-lg font-bold mb-3 text-white px-2">{show.showName}</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {renderGrid('series', show.episodes, show.showName)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Songs */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4 capitalize text-light-text flex items-center">
                            <div className="w-1 h-4 bg-light-glow rounded mr-2"></div>Songs
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {renderGrid('songs', media.songs || [])}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AppStoreManager = ({ triggerRefetch }) => {
    const [apps, setApps] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);

    const sendDM = async () => {
        if (!dmText.trim() && !dmImage && !dmAudio) return;

        try {
            let finalImage = dmImage;
            let finalAudio = dmAudio;

            const msgPayload = {
                from: adminName,
                to: dmTarget.name,
                text: dmText,
                image: finalImage,
                audio: finalAudio,
            };

            const res = await axios.post('http://localhost:3000/api/messages', msgPayload);
            setDmMessages([...dmMessages, res.data]);
            setDmText('');
            setDmImage(null);
            setDmAudio(null);
        } catch (e) {
            console.error('Error sending DM:', e);
        }
    };

    const handleFileSelect = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (readerEvent) => {
            if (type === 'image') {
                setDmImage(readerEvent.target.result);
            } else if (type === 'audio') {
                // For audio, we upload to the specific endpoint first
                try {
                    const res = await axios.post('http://localhost:3000/api/upload-audio', {
                        from: adminName,
                        to: dmTarget.name,
                        audioData: readerEvent.target.result
                    });
                    if (res.data.url) setDmAudio(res.data.url);
                } catch (err) { console.error('Audio upload error:', err); }
            }
        };
        reader.readAsDataURL(file);
    };

    const fetchApps = () => {
        fetch('http://localhost:3000/api/apps')
            .then(res => res.json())
            .then(data => {
                setApps(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching apps:', err);
                setLoading(false);
            });
        fetch('http://localhost:3000/api/stats').then(res => res.json()).then(setStats).catch(() => { });
    }

    useEffect(() => {
        fetchApps();
    }, [triggerRefetch]);

    return (
        <div className="animate-[fadeIn_0.5s_ease-out] h-full flex flex-col">
            <h1 className="text-3xl font-bold mb-8 text-white drop-shadow-md">App Store Manager</h1>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-4 border-light-glow border-t-transparent animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-4 pb-20">
                    {apps.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-light-text/40 italic bg-dark-bg/20 rounded-xl">No APKs found in Android directory</div>
                    ) : apps.map((app, idx) => {
                        const safePath = app.name.split('/').map(encodeURIComponent).join('/');
                        const coverName = app.name.substring(0, app.name.lastIndexOf('.')) + '.jpg';
                        const coverPath = coverName.split('/').map(encodeURIComponent).join('/');
                        const coverUrl = `http://localhost:3000/apps/${coverPath}`;
                        const displayName = app.name.split('/').pop();
                        const folder = app.name.includes('/') ? app.name.split('/')[0] : null;
                        const fileKey = `/${app.name.split('/').map(encodeURIComponent).join('/')}`;
                        const count = stats[fileKey] || 0;
                        return (
                            <GlassCard key={idx} className="flex items-center space-x-3 p-3 group hover:scale-[1.02] transition relative">
                                {count > 0 && <div className="absolute top-1 right-1 bg-accent-purple text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full z-20 shadow-md">{count} DL</div>}
                                <div className="w-12 h-12 rounded-lg bg-dark-bg shadow-neu-inset flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                                    <img src={coverUrl} onError={(e) => e.target.style.display = 'none'} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                                    <AppWindow className="text-green-400/90 relative z-10" size={22} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white text-xs font-medium truncate" title={app.name}>{displayName}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {folder && <span className="text-[8px] bg-accent-purple/15 text-accent-purple px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">{folder}</span>}
                                        <p className="text-[9px] text-light-text/50">{(app.size / (1024 * 1024)).toFixed(1)}MB</p>
                                    </div>
                                </div>
                            </GlassCard>
                        )
                    })}

                </div>
            )}
        </div>
    );
};

const WordSettings = () => {
    const [words, setWords] = useState([]);
    const [inputValue, setInputValue] = useState("");

    useEffect(() => {
        fetch('http://localhost:3000/api/settings/words')
            .then(res => res.json())
            .then(data => setWords(data));
    }, []);

    const addWord = () => {
        if (inputValue && !words.includes(inputValue)) {
            const updatedWords = [...words, inputValue];
            updateServer(updatedWords);
            setInputValue("");
        }
    };

    const removeWord = (wordToRemove) => {
        const updatedWords = words.filter(w => w !== wordToRemove);
        updateServer(updatedWords);
    };

    const updateServer = (newWords) => {
        setWords(newWords);
        fetch('http://localhost:3000/api/settings/words', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ words: newWords })
        });
    };

    return (
        <div className="animate-[fadeIn_0.5s_ease-out] h-full flex flex-col">
            <h1 className="text-2xl font-bold mb-6 text-white drop-shadow-md">إعدادات الرقابة (Settings)</h1>

            <div className="flex gap-3 mb-6">
                <input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="bg-dark-bg transition-all shadow-neu-inset p-3 rounded-xl border-none outline-none flex-1 text-white text-sm focus:shadow-inset-light placeholder:text-light-text/30"
                    placeholder="أضف كلمة غير لائقة... (Add word)"
                />
                <button
                    onClick={addWord}
                    className="bg-dark-bg shadow-neu-outset px-4 py-3 rounded-xl active:shadow-neu-inset text-light-glow font-bold text-sm"
                >
                    إضافة (Add)
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 overflow-y-auto pb-20">
                {words.map(word => (
                    <GlassCard key={word} className="!p-3 flex justify-between items-center group">
                        <span className="font-semibold text-white truncate mr-2 text-xs" title={word}>{word}</span>
                        <button onClick={() => removeWord(word)} className="text-red-500 hover:scale-125 transition">
                            <X size={14} />
                        </button>
                    </GlassCard>
                ))}
            </div>
        </div>
    );
};

const TawasalLogs = () => {
    const [posts, setPosts] = useState([]);
    const [msg, setMsg] = useState('');
    const [subTab, setSubTab] = useState('home');
    const [friends, setFriends] = useState([]);
    const [adminName, setAdminName] = useState(() => localStorage.getItem('adminName') || 'Admin (Dashboard)');
    const [adminAvatar, setAdminAvatar] = useState(() => localStorage.getItem('adminAvatar') || null);
    const [nameSaved, setNameSaved] = useState(false);

    // DM features
    const [dmTarget, setDmTarget] = useState(null);
    const [dmText, setDmText] = useState('');
    const [dmMessages, setDmMessages] = useState([]);
    const [dmImage, setDmImage] = useState(null);
    const [dmAudio, setDmAudio] = useState(null);

    const fetchPosts = () => {
        fetch('http://localhost:3000/api/posts').then(res => res.json()).then(setPosts).catch(() => { });
    };
    const fetchFriends = () => {
        fetch('http://localhost:3000/api/users').then(res => res.json()).then(setFriends).catch(() => { });
    };
    const fetchDM = () => {
        if (!dmTarget) return;
        fetch(`http://localhost:3000/api/messages?user1=${encodeURIComponent(adminName)}&user2=${encodeURIComponent(dmTarget)}`)
            .then(res => res.json()).then(setDmMessages).catch(() => { });
    };

    useEffect(() => {
        fetchPosts(); fetchFriends(); fetchDM();
        const intv = setInterval(() => { fetchPosts(); fetchFriends(); fetchDM(); }, 3000);
        return () => clearInterval(intv);
    }, [dmTarget, adminName]);

    const sendMsg = () => {
        if (!msg.trim()) return;
        fetch('http://localhost:3000/api/posts', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg, user: { name: adminName, avatar: adminAvatar } })
        }).then(() => { setMsg(''); fetchPosts(); });
    };

    const deletePost = (id) => {
        fetch(`http://localhost:3000/api/posts/${id}`, {
            method: 'DELETE',
            headers: { 'x-admin-action': 'true' }
        }).then(() => fetchPosts());
    };

    const deleteFriend = (name) => {
        if (!window.confirm(`Delete ${name}?`)) return;
        fetch(`http://localhost:3000/api/users/${encodeURIComponent(name)}`, {
            method: 'DELETE',
            headers: { 'x-admin-action': 'true' }
        })
            .then(() => { fetchFriends(); if (dmTarget === name) setDmTarget(null); });
    };

    const sendDM = async () => {
        if (!dmText.trim() && !dmImage && !dmAudio) return;
        try {
            const msgPayload = {
                from: adminName,
                to: dmTarget,
                text: dmText,
                image: dmImage,
                audio: dmAudio
            };
            const response = await fetch('http://localhost:3000/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(msgPayload)
            });
            const data = await response.json();
            setDmMessages(prev => [...prev, data]);
            setDmText('');
            setDmImage(null);
            setDmAudio(null);
        } catch (err) { console.error('Error sending DM:', err); }
    };

    const handleFileSelect = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (readerEvent) => {
            if (type === 'image') {
                setDmImage(readerEvent.target.result);
            } else if (type === 'audio') {
                try {
                    const res = await fetch('http://localhost:3000/api/upload-audio', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            from: adminName,
                            to: dmTarget,
                            audioData: readerEvent.target.result
                        })
                    });
                    const data = await res.json();
                    if (data.url) setDmAudio(data.url);
                } catch (err) { console.error('Audio upload error:', err); }
            }
        };
        reader.readAsDataURL(file);
    };

    const saveProfile = () => {
        localStorage.setItem('adminName', adminName);
        if (adminAvatar) localStorage.setItem('adminAvatar', adminAvatar);
        fetch('http://localhost:3000/api/users', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: adminName, avatar: adminAvatar })
        }).then(() => { setNameSaved(true); setTimeout(() => setNameSaved(false), 2000); fetchFriends(); });
    };

    const onAvatarUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setAdminAvatar(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    const getColor = (name) => {
        const c = ['#7042f8', '#4dabf7', '#7c3aed', '#f59e0b', '#ef4444', '#10b981'];
        let h = 0;
        for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
        return c[Math.abs(h) % c.length];
    };

    return (
        <div className="h-full flex flex-col bg-dark-bg/60 backdrop-blur-lg rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative">
            {/* Tawasal Header */}
            <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <span className="text-lg font-bold tracking-tight text-white uppercase italic">Tawasal <span className="font-light text-light-glow">Social</span></span>
                <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span className="text-[9px] font-bold text-light-muted uppercase">Online</span>
                </div>
            </div>

            {/* Sub-tab Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {/* DM Chat Overlay */}
                {dmTarget && (
                    <div className="absolute inset-0 bg-dark-bg/95 backdrop-blur-3xl z-20 flex flex-col animate-[fadeIn_0.2s]">
                        <div className="px-3 py-2 border-b border-white/5 bg-white/5 flex items-center space-x-3">
                            <button onClick={() => setDmTarget(null)} className="p-1.5 hover:bg-white/10 rounded-lg text-white transition"><ArrowLeft size={18} /></button>
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: getColor(dmTarget) }}>
                                    {dmTarget[0].toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-white leading-none">{dmTarget}</div>
                                    <div className="text-[8px] text-green-400 font-bold uppercase tracking-wider mt-1">Active</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-3 custom-scrollbar">
                            {dmMessages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-white/10">
                                    <MessageSquare size={48} />
                                    <p className="mt-3 font-bold uppercase text-[10px]">Start a conversation</p>
                                </div>
                            ) : dmMessages.map(m => (
                                <div key={m.id} className={`max-w-[85%] min-w-[120px] rounded-2xl p-3 shadow-lg ${m.from === adminName ? 'self-end bg-light-glow/20 border border-light-glow/20 text-white' : 'self-start bg-white/5 border border-white/5 text-light-text'}`}>
                                    {m.image && <img src={m.image} className="w-full rounded-xl mb-2 border border-white/10 shadow-lg" />}
                                    {m.audio && (
                                        <div className="flex items-center space-x-3 mb-2 bg-black/20 p-2.5 rounded-xl border border-white/5 min-w-[160px]">
                                            <button
                                                onClick={() => {
                                                    const audio = new Audio(`http://localhost:3000${m.audio}`);
                                                    audio.play();
                                                }}
                                                className="w-8 h-8 flex items-center justify-center bg-light-glow rounded-full text-white hover:scale-110 transition shadow-[0_0_15px_rgba(112,66,248,0.5)]"
                                            >
                                                <Play size={10} fill="currentColor" />
                                            </button>
                                            <div className="flex-1 flex items-end space-x-0.5 h-4">
                                                {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.4, 0.7].map((h, i) => (
                                                    <div key={i} className="flex-1 bg-white/20 rounded-full" style={{ height: `${h * 100}%` }}></div>
                                                ))}
                                            </div>
                                            <span className="text-[7px] font-black text-white/30 uppercase tracking-tighter">Voice</span>
                                        </div>
                                    )}
                                    {m.text ? <p className="text-xs leading-relaxed">{m.text}</p> : null}
                                    <div className="text-[8px] opacity-40 mt-1 text-right">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            ))}
                        </div>

                        {/* Attachments Preview */}
                        {dmImage && (
                            <div className="bg-white/5 p-2 border-t border-white/10 flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/20">
                                        <img src={dmImage} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="ml-2 text-[10px] text-white/50 font-bold uppercase">Image attached</span>
                                </div>
                                <button onClick={() => setDmImage(null)} className="p-1 hover:text-white text-white/30"><X size={14} /></button>
                            </div>
                        )}
                        {dmAudio && (
                            <div className="bg-white/5 p-2 border-t border-white/10 flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-light-glow/20 flex items-center justify-center">
                                        <Play size={12} fill="currentColor" className="text-light-glow" />
                                    </div>
                                    <span className="ml-2 text-[10px] text-white/50 font-bold uppercase">Voice Note Ready</span>
                                </div>
                                <button onClick={() => setDmAudio(null)} className="p-1 hover:text-white text-white/30"><X size={14} /></button>
                            </div>
                        )}

                        <div className="p-3 bg-white/5 border-t border-white/5 flex items-center space-x-2">
                            <input type="file" id="dm-img" hidden accept="image/*" onChange={e => handleFileSelect(e, 'image')} />
                            <input type="file" id="dm-audio" hidden accept="audio/*" onChange={e => handleFileSelect(e, 'audio')} />

                            <label htmlFor="dm-img" className="p-1.5 text-white/20 hover:text-white transition cursor-pointer"><ImageIcon size={18} /></label>
                            <label htmlFor="dm-audio" className="p-1.5 text-white/20 hover:text-white transition cursor-pointer"><Mic size={18} /></label>

                            <input value={dmText} onChange={e => setDmText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendDM()} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-light-glow/50 transition" placeholder="Type a message..." />
                            <button onClick={sendDM} className="p-2.5 bg-light-glow text-white rounded-xl hover:opacity-90 transition shadow-lg shadow-light-glow/20"><Plus size={18} /></button>
                        </div>
                    </div>
                )}

                {/* Home Feed */}
                {subTab === 'home' && (
                    <div className="h-full flex flex-col">
                        <div className="p-3 border-b border-white/5">
                            <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex space-x-3">
                                <div className="w-8 h-8 rounded-full bg-light-glow/20 flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/10 text-xs text-white">
                                    {adminAvatar ? <img src={adminAvatar} className="w-full h-full object-cover" /> : adminName[0].toUpperCase()}
                                </div>
                                <div className="flex-1 flex flex-col space-y-2">
                                    <textarea value={msg} onChange={e => setMsg(e.target.value)} className="bg-transparent border-none text-white text-xs outline-none resize-none px-0 py-0.5" placeholder={`What's up, ${adminName}?`} rows={1} />
                                    <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                                        <button className="p-1 hover:bg-white/5 rounded text-white/40 hover:text-white transition"><ImageIcon size={16} /></button>
                                        <button onClick={sendMsg} className="bg-light-glow text-white px-4 py-1.5 rounded-lg text-[10px] font-bold hover:opacity-90 transition">Post</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {posts.map(p => (
                                <div key={p.id} className="bg-white/5 border border-white/5 rounded-3xl p-5 hover:bg-white/[0.07] transition group">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: getColor(p.user?.name) }}>
                                                {p.user?.avatar ? <img src={p.user.avatar} className="w-full h-full object-cover rounded-full" /> : (p.user?.name || 'A')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white leading-none">{p.user?.name || 'Anonymous'}</div>
                                                <div className="text-[10px] text-light-muted mt-1 uppercase tracking-tighter">Local Citizen</div>
                                            </div>
                                        </div>
                                        {p.user?.name === adminName && (
                                            <button onClick={() => deletePost(p.id)} className="p-2 opacity-0 group-hover:opacity-100 text-red-400/40 hover:text-red-400 transition ml-2"><Trash2 size={16} /></button>
                                        )}
                                    </div>
                                    {p.message && <p className="text-sm text-white/90 leading-relaxed mb-4">{p.message}</p>}
                                    {p.image && <img src={p.image} className="w-full rounded-2xl mb-4 border border-white/5 shadow-xl transition-transform hover:scale-[1.01]" />}
                                    <div className="flex items-center space-x-6 pt-2 border-t border-white/5">
                                        <button className="flex items-center space-x-2 text-white/30 hover:text-red-400 transition"><Heart size={18} /><span className="text-[10px] font-bold">Like</span></button>
                                        <button className="flex items-center space-x-2 text-white/30 hover:text-light-glow transition"><MessageSquare size={18} /><span className="text-[10px] font-bold">Reply</span></button>
                                        <button className="flex items-center space-x-2 text-white/30 hover:text-blue-400 transition"><Share2 size={18} /><span className="text-[10px] font-bold">Share</span></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Friends List */}
                {subTab === 'friends' && (
                    <div className="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
                        <div className="mb-6">
                            <h2 className="text-white font-bold text-lg">Citizens Online</h2>
                            <p className="text-xs text-light-muted mt-1">Users discovered on the local ecosystem network.</p>
                        </div>
                        {friends.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-10">
                                <Zap size={80} />
                                <p className="mt-4 font-bold">Quiet here...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {friends.map(f => (
                                    <div key={f.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-white/[0.08] transition shadow-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shadow-xl overflow-hidden border border-white/10" style={{ backgroundColor: getColor(f.name) }}>
                                                {f.avatar ? <img src={f.avatar} className="w-full h-full object-cover" /> : f.name[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white leading-none">{f.name}</div>
                                                <div className="text-[10px] text-green-400 mt-1 uppercase font-bold">Safe Connection</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => { setDmTarget(f.name); }} className="p-2 bg-light-glow/10 text-light-glow rounded-xl hover:bg-light-glow hover:text-white transition shadow-sm"><MessageSquare size={18} /></button>
                                            <button onClick={() => deleteFriend(f.name)} className="p-2 bg-red-400/10 text-red-400 rounded-xl hover:bg-red-400 hover:text-white transition shadow-sm"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Local Profile */}
                {subTab === 'profile' && (
                    <div className="h-full flex flex-col items-center p-8 overflow-y-auto custom-scrollbar">
                        <div className="w-full max-w-sm flex flex-col items-center">
                            <div className="relative mb-6">
                                <label className="w-28 h-28 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-5xl font-bold text-white shadow-2xl overflow-hidden cursor-pointer group hover:border-light-glow/50 transition">
                                    {adminAvatar ? <img src={adminAvatar} className="w-full h-full object-cover" /> : adminName[0].toUpperCase()}
                                    <input type="file" accept="image/*" className="hidden" onChange={onAvatarUpload} />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold uppercase backdrop-blur-sm transition">Change</div>
                                </label>
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">{adminName}</h2>
                            <p className="text-xs text-light-muted uppercase tracking-widest mb-8">System Administrator</p>

                            <div className="w-full bg-white/5 border border-white/5 rounded-3xl p-6 space-y-5">
                                <div>
                                    <label className="text-[10px] font-bold text-light-glow uppercase tracking-widest block mb-2">Display Identity</label>
                                    <input value={adminName} onChange={e => setAdminName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-light-glow/50 transition" />
                                </div>
                                <button onClick={saveProfile} className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition shadow-xl ${nameSaved ? 'bg-green-500 text-white' : 'bg-light-glow text-white hover:opacity-90 active:scale-95 shadow-light-glow/20'}`}>
                                    {nameSaved ? 'Identity Secured' : 'Update Profile'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Nav */}
            <div className="bg-white/5 border-t border-white/5 h-14 flex items-center justify-around px-2">
                <button onClick={() => setSubTab('home')} className={`flex flex-col items-center space-y-0.5 transition p-2 rounded-xl ${subTab === 'home' ? 'text-light-glow bg-light-glow/10' : 'text-white/30 hover:text-white'}`}>
                    <Zap size={18} />
                    <span className="text-[8px] font-bold uppercase">Feed</span>
                </button>
                <button onClick={() => setSubTab('friends')} className={`flex flex-col items-center space-y-0.5 transition p-2 rounded-xl ${subTab === 'friends' ? 'text-light-glow bg-light-glow/10' : 'text-white/30 hover:text-white'}`}>
                    <Heart size={18} />
                    <span className="text-[8px] font-bold uppercase">Friends</span>
                </button>
                <button onClick={() => setSubTab('profile')} className={`flex flex-col items-center space-y-0.5 transition p-2 rounded-xl ${subTab === 'profile' ? 'text-light-glow bg-light-glow/10' : 'text-white/30 hover:text-white'}`}>
                    <Settings size={18} />
                    <span className="text-[8px] font-bold uppercase">Identity</span>
                </button>
            </div>
        </div>
    );
};

function App() {
    const [activeTab, setActiveTab] = useState('Overview');
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [refetchTrigger, setRefetchTrigger] = useState(0);

    const forceRefetch = () => setRefetchTrigger(prev => prev + 1);

    const renderContent = () => {
        switch (activeTab) {
            case 'Overview': return <OverviewPage />;
            case 'Media Manager': return <MediaManager triggerRefetch={refetchTrigger} />;
            case 'App Store Manager': return <AppStoreManager triggerRefetch={refetchTrigger} />;
            case 'Tawasal Logs': return <TawasalLogs />;
            case 'Settings': return <WordSettings />;
            default: return <OverviewPage />;
        }
    };

    return (
        <div className="w-screen h-screen bg-dark-bg flex flex-col overflow-hidden text-light-text select-none relative">
            <TitleBar />
            <div className="flex flex-1 pt-10 h-[calc(100vh-2.5rem)]">
                {/* Sidebar */}
                <div className="w-52 h-full bg-dark-surface/40 backdrop-blur-xl border-r border-white/5 z-10 flex flex-col p-3 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
                    <div className="space-y-1 flex-1 mt-2">
                        <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'Overview'} onClick={() => setActiveTab('Overview')} />
                        <SidebarItem icon={Film} label="Media Manager" active={activeTab === 'Media Manager'} onClick={() => setActiveTab('Media Manager')} />
                        <SidebarItem icon={AppWindow} label="App Store Manager" active={activeTab === 'App Store Manager'} onClick={() => setActiveTab('App Store Manager')} />
                        <SidebarItem icon={MessageSquare} label="Tawasal Social" active={activeTab === 'Tawasal Logs'} onClick={() => setActiveTab('Tawasal Logs')} />
                        <SidebarItem icon={Settings} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
                    </div>

                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 mt-auto mb-2">
                        <div className="flex items-center space-x-2 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-[pulse_2s_infinite]"></div>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-white/70">Live</span>
                        </div>
                        <p className="text-[9px] text-light-muted font-mono tracking-tight">Port: 3000</p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 h-full overflow-hidden relative bg-dark-bg">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-light-glow/10 rounded-full blur-[120px] pointer-events-none animate-[pulse_8s_infinite]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

                    <div className="relative z-10 h-full p-6 overflow-y-auto custom-scrollbar">
                        {renderContent()}
                    </div>
                </div>
            </div>

            <FloatingActionButton onClick={() => setIsUploadOpen(true)} />
            <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} fetchMedia={forceRefetch} fetchApps={forceRefetch} />
        </div>
    );
}

export default App;
