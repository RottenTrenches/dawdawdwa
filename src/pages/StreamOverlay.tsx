import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Star, Flame, Skull, Trash2, X, Zap, Volume2, VolumeX } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import streamLogoVideo from "@/assets/stream-logo-video.mp4";

// FUNNY SOUND EFFECTS - Popular meme sounds recreated with Web Audio API
const createSoundEffect = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // VINE BOOM / Dun Dun - for 5 star ratings (epic based moment)
  const playVineBoom = () => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    
    // Deep bass hit
    osc.frequency.setValueAtTime(80, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, audioContext.currentTime + 0.3);
    osc.type = 'sawtooth';
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, audioContext.currentTime);
    
    gain.gain.setValueAtTime(0.4, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.4);
    
    // Second hit for that iconic double boom
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      const filter2 = audioContext.createBiquadFilter();
      
      osc2.connect(filter2);
      filter2.connect(gain2);
      gain2.connect(audioContext.destination);
      
      osc2.frequency.setValueAtTime(60, audioContext.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(25, audioContext.currentTime + 0.5);
      osc2.type = 'sawtooth';
      
      filter2.type = 'lowpass';
      filter2.frequency.setValueAtTime(150, audioContext.currentTime);
      
      gain2.gain.setValueAtTime(0.5, audioContext.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.5);
    }, 150);
  };

  // MLG Airhorn - for 4 star ratings
  const playAirhorn = () => {
    [0, 50, 100].forEach((delay) => {
      setTimeout(() => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        // High pitched honk
        osc.frequency.setValueAtTime(600, audioContext.currentTime);
        osc.frequency.setValueAtTime(700, audioContext.currentTime + 0.05);
        osc.frequency.setValueAtTime(650, audioContext.currentTime + 0.1);
        osc.type = 'square';
        
        gain.gain.setValueAtTime(0.15, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.15);
      }, delay);
    });
  };

  // Bruh Sound Effect - for 3 star ratings (meh)
  const playBruh = () => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    // Low grunt descending
    osc.frequency.setValueAtTime(200, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.4);
    osc.type = 'sawtooth';
    
    gain.gain.setValueAtTime(0.12, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.4);
  };

  // Sad Trombone / Price is Right Fail - for 2 star ratings
  const playSadTrombone = () => {
    const notes = [
      { freq: 311, time: 0, dur: 0.3 },      // Eb
      { freq: 293, time: 0.3, dur: 0.3 },    // D
      { freq: 277, time: 0.6, dur: 0.3 },    // C#
      { freq: 261, time: 0.9, dur: 0.6 },    // C (held)
    ];
    
    notes.forEach(({ freq, time, dur }) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      
      osc.frequency.setValueAtTime(freq, audioContext.currentTime + time);
      osc.type = 'sawtooth';
      
      gain.gain.setValueAtTime(0.1, audioContext.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + time + dur);
      
      osc.start(audioContext.currentTime + time);
      osc.stop(audioContext.currentTime + time + dur);
    });
  };

  // Fart / Wet Raspberry - for 1 star ratings (absolute trash)
  const playFart = () => {
    // White noise burst through bandpass = fart
    const bufferSize = audioContext.sampleRate * 0.5;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin(i / 500); // Modulated noise
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    
    const filter = audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(150, audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.4);
    filter.Q.value = 5;
    
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    
    source.start(audioContext.currentTime);
    source.stop(audioContext.currentTime + 0.4);
    
    // Add bass rumble
    const bassOsc = audioContext.createOscillator();
    const bassGain = audioContext.createGain();
    bassOsc.connect(bassGain);
    bassGain.connect(audioContext.destination);
    
    bassOsc.frequency.setValueAtTime(80, audioContext.currentTime);
    bassOsc.frequency.exponentialRampToValueAtTime(30, audioContext.currentTime + 0.3);
    bassOsc.type = 'triangle';
    
    bassGain.gain.setValueAtTime(0.2, audioContext.currentTime);
    bassGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    bassOsc.start(audioContext.currentTime);
    bassOsc.stop(audioContext.currentTime + 0.3);
  };

  // Taco Bell / Alert ding for transitions
  const playTransitionDing = () => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.frequency.setValueAtTime(880, audioContext.currentTime);
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0.08, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.2);
  };
  
  return {
    playRatingSound: (rating: number) => {
      try {
        if (rating === 5) {
          playVineBoom();
        } else if (rating === 4) {
          playAirhorn();
        } else if (rating === 3) {
          playBruh();
        } else if (rating === 2) {
          playSadTrombone();
        } else {
          playFart();
        }
      } catch (e) {
        console.log('Audio not supported');
      }
    },
    playTransition: () => {
      try {
        playTransitionDing();
      } catch (e) {
        console.log('Audio not supported');
      }
    }
  };
};
interface QueuedComment {
  id: string;
  content: string;
  rating: number | null;
  wallet_address: string;
  created_at: string;
  kol: {
    id: string;
    username: string;
    profile_pic_url: string | null;
    twitter_handle: string;
  } | null;
  user_profile?: {
    display_name: string | null;
    profile_pic_url: string | null;
  } | null;
}

const DISPLAY_DURATION = 6000;

// Animated flowing background
const AnimatedBackground = () => (
  <div className="absolute inset-0 overflow-hidden">
    {/* Dark base with shifting gradient */}
    <div className="absolute inset-0 bg-gradient-to-br from-[#0a0015] via-[#1a0030] to-[#0a0015]" />
    
    {/* Subtle animated noise texture */}
    <motion.div 
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
      }}
      animate={{ opacity: [0.03, 0.05, 0.03] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    />
    
    {/* Floating particles */}
    {[...Array(8)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 rounded-full bg-pink-400/40"
        style={{
          left: `${10 + (i * 10)}%`,
          top: '80%',
        }}
        animate={{
          y: [0, -150, -300],
          x: [0, (i % 2 === 0 ? 20 : -20), 0],
          opacity: [0, 0.6, 0],
          scale: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 6 + i * 0.3,
          repeat: Infinity,
          delay: i * 0.6,
          ease: "easeOut",
        }}
      />
    ))}
  </div>
);

// Simplified CRT effect - just scanlines and vignette
const CRTEffect = () => (
  <>
    {/* Scanlines */}
    <div 
      className="absolute inset-0 pointer-events-none z-50"
      style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
        opacity: 0.4
      }}
    />
    {/* Vignette */}
    <div 
      className="absolute inset-0 pointer-events-none z-30"
      style={{
        background: 'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.5) 100%)'
      }}
    />
  </>
);


export default function StreamOverlay() {
  const location = useLocation();
  const openedAtRef = useRef<number>(Date.now());

  const [commentQueue, setCommentQueue] = useState<QueuedComment[]>([]);
  const [currentComment, setCurrentComment] = useState<QueuedComment | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [shownCommentIds, setShownCommentIds] = useState<Set<string>>(new Set());
  const [glitchActive, setGlitchActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const soundRef = useRef<ReturnType<typeof createSoundEffect> | null>(null);

  // Initialize sound effects
  useEffect(() => {
    soundRef.current = createSoundEffect();
  }, []);

  // Keep footer clock ticking
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);


  // Play rating-based sound when new comment appears
  const playRatingSound = useCallback((rating: number) => {
    if (!isMuted && soundRef.current) {
      soundRef.current.playRatingSound(rating);
    }
  }, [isMuted]);

  const playTransitionSound = useCallback(() => {
    if (!isMuted && soundRef.current) {
      soundRef.current.playTransition();
    }
  }, [isMuted]);

  // Clear any old state BEFORE first paint so only comments created after opening stream can appear
  useLayoutEffect(() => {
    openedAtRef.current = Date.now();
    setCommentQueue([]);
    setCurrentComment(null);
    setShownCommentIds(new Set());
  }, [location.key]);

  // Only listen for NEW comments going forward (no initial fetch)
  useEffect(() => {
    const channel = supabase
      .channel(`stream-comments-realtime-${location.key}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'kol_comments',
        },
        async (payload) => {
          console.log('[StreamOverlay] Realtime payload received:', payload);
          const newComment = payload.new as any;
          
          if (newComment.parent_comment_id) {
            console.log('[StreamOverlay] Skipping: is a reply');
            return;
          }
          if (!newComment.rating) {
            console.log('[StreamOverlay] Skipping: no rating');
            return;
          }

          // Hard filter: ignore anything created before the stream page was opened
          const createdAtMs = Date.parse(String(newComment.created_at ?? ""));
          const graceMs = 5000; // tolerate small client/server clock drift
          console.log('[StreamOverlay] Time check:', { 
            createdAtMs, 
            openedAt: openedAtRef.current, 
            diff: createdAtMs - openedAtRef.current,
            graceMs 
          });
          if (!Number.isNaN(createdAtMs) && createdAtMs < openedAtRef.current - graceMs) {
            console.log('[StreamOverlay] Skipping: created before stream opened');
            return;
          }

          const [{ data: kol }, { data: profile }] = await Promise.all([
            supabase
              .from('kols')
              .select('id, username, profile_pic_url, twitter_handle')
              .eq('id', newComment.kol_id)
              .single(),
            supabase
              .from('user_profiles')
              .select('wallet_address, display_name, profile_pic_url')
              .eq('wallet_address', newComment.wallet_address)
              .maybeSingle(),
          ]);

          const enrichedComment: QueuedComment = {
            id: newComment.id,
            content: newComment.content,
            rating: newComment.rating,
            wallet_address: newComment.wallet_address,
            created_at: newComment.created_at,
            kol: kol || null,
            user_profile: profile || null,
          };

          setCommentQueue((prev) => {
            if (prev.some((c) => c.id === enrichedComment.id)) return prev;
            return [...prev, enrichedComment];
          });

          // Trigger glitch effect and sound for new comment
          setGlitchActive(true);
          playRatingSound(newComment.rating);
          setTimeout(() => setGlitchActive(false), 300);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playRatingSound, location.key]);


  // Show first unseen comment when queue updates
  useEffect(() => {
    if (!currentComment && commentQueue.length > 0 && !isTransitioning) {
      const unshownComments = commentQueue.filter(c => !shownCommentIds.has(c.id));
      if (unshownComments.length > 0) {
        const nextComment = unshownComments[0];
        setCurrentComment(nextComment);
        setShownCommentIds(prev => new Set([...prev, nextComment.id]));
        playRatingSound(nextComment.rating || 3);
      }
    }
  }, [commentQueue, currentComment, isTransitioning, shownCommentIds, playRatingSound]);

  // Advance to next UNSEEN comment on timer (no looping)
  useEffect(() => {
    if (commentQueue.length === 0) return;

    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      const unshownComments = commentQueue.filter(c => !shownCommentIds.has(c.id));
      
      if (unshownComments.length > 0) {
        setIsTransitioning(true);
        playTransitionSound();
        
        setTimeout(() => {
          const nextComment = unshownComments[0];
          setCurrentComment(nextComment);
          setShownCommentIds(prev => new Set([...prev, nextComment.id]));
          playRatingSound(nextComment.rating || 3);
          setIsTransitioning(false);
        }, 300);
      } else {
        // No more unseen comments - go to waiting state
        setIsTransitioning(true);
        playTransitionSound();
        setTimeout(() => {
          setCurrentComment(null);
          setIsTransitioning(false);
        }, 300);
      }
    }, DISPLAY_DURATION);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [commentQueue, shownCommentIds, playTransitionSound, playRatingSound]);

  const pendingCount = commentQueue.filter(c => !shownCommentIds.has(c.id)).length;

  const getRatingColor = (rating: number) => {
    if (rating <= 2) return "from-red-600 via-red-500 to-orange-600";
    if (rating <= 3) return "from-yellow-500 via-orange-500 to-red-500";
    return "from-emerald-400 via-green-500 to-teal-500";
  };

  const getRatingGlow = (rating: number) => {
    if (rating <= 2) return "shadow-[0_0_60px_rgba(239,68,68,0.5)]";
    if (rating <= 3) return "shadow-[0_0_60px_rgba(234,179,8,0.5)]";
    return "shadow-[0_0_60px_rgba(34,197,94,0.5)]";
  };

  const getRatingIcon = (rating: number) => {
    if (rating <= 2) return <Skull className="w-10 h-10 md:w-14 md:h-14" />;
    if (rating <= 3) return <Trash2 className="w-10 h-10 md:w-14 md:h-14" />;
    return <Flame className="w-10 h-10 md:w-14 md:h-14" />;
  };

  const getRatingText = (rating: number) => {
    if (rating === 1) return "ABSOLUTE TRASH";
    if (rating === 2) return "ROTTEN";
    if (rating === 3) return "MEH";
    if (rating === 4) return "DECENT";
    return "BASED";
  };

  return (
    <div className="min-h-screen bg-[#050508] relative overflow-hidden">
      {/* Deep background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950/20 via-[#050508] to-pink-950/20" />

      {/* Animated background */}
      <AnimatedBackground />

      {/* CRT Effects */}
      <CRTEffect />

      {/* Glitch overlay */}
      <AnimatePresence>
        {glitchActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 pointer-events-none"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/15 via-transparent to-pink-500/15" />
            <div 
              className="absolute inset-0"
              style={{
                background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,0,128,0.05) 2px, rgba(255,0,128,0.05) 4px)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20 }}
        className="relative z-20 p-4 md:p-6"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
            <div className="relative">
              <video 
                src={streamLogoVideo} 
                autoPlay 
                loop 
                muted 
                playsInline
                className="w-14 h-14 md:w-16 md:h-16 object-contain rounded-xl border border-pink-500/20"
              />
            </div>
            <div>
              <h1 className="font-pixel text-xl md:text-3xl text-white tracking-wider">
                ROTTEN TRENCHES
              </h1>
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-pink-500" />
                <p className="font-pixel text-[10px] md:text-xs text-pink-400 tracking-widest">
                  LIVE ROAST FEED
                </p>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2 md:gap-3">
            {pendingCount > 0 && (
              <div className="hidden md:flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                <span className="font-pixel text-sm text-cyan-400">{pendingCount}</span>
                <span className="font-pixel text-[10px] text-white/50">IN QUEUE</span>
              </div>
            )}
            
            {/* Mute toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-white/60" /> : <Volume2 className="w-4 h-4 text-pink-400" />}
            </button>

            <div className="flex items-center gap-2 bg-red-600 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="font-pixel text-xs text-white font-bold">LIVE</span>
            </div>
            <Link 
              to="/"
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
            >
              <X className="w-5 h-5 text-white/60 hover:text-white" />
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[80vh] px-4 md:px-8">
        <AnimatePresence mode="wait">
          {currentComment && !isTransitioning ? (
            <motion.div
              key={currentComment.id}
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -80, filter: "blur(10px)" }}
              transition={{ duration: 0.5, type: "spring", damping: 20 }}
              className="max-w-5xl w-full"
            >
              {/* Main Card */}
              <div className="relative">
                {/* Static glow */}
                <div className={`absolute -inset-4 bg-gradient-to-r ${getRatingColor(currentComment.rating || 3)} rounded-3xl blur-2xl opacity-30`} />

                <div className={`relative bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-black/95 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 ${getRatingGlow(currentComment.rating || 3)}`}>
                  {/* Top accent bar with animation */}
                  <motion.div 
                    className={`h-1.5 bg-gradient-to-r ${getRatingColor(currentComment.rating || 3)}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5 }}
                  />

                  <div className="flex flex-col md:flex-row">
                    {/* KOL Image Section - Bigger */}
                    <div className="relative md:w-1/2 aspect-square overflow-hidden">
                      <motion.img
                        src={currentComment.kol?.profile_pic_url || `https://ui-avatars.com/api/?name=${currentComment.kol?.username || 'KOL'}&background=1a1a1a&color=fff&size=600`}
                        alt={currentComment.kol?.username || 'KOL'}
                        className="w-full h-full object-cover"
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.8 }}
                      />
                      {/* Enhanced gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black via-black/60 to-transparent" />
                      <div className={`absolute inset-0 bg-gradient-to-t ${getRatingColor(currentComment.rating || 3)} opacity-10`} />

                      {/* KOL info overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
                        <motion.h2 
                          initial={{ x: -50, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="font-pixel text-3xl md:text-5xl text-white mb-2 truncate drop-shadow-lg"
                        >
                          {currentComment.kol?.username || 'Unknown'}
                        </motion.h2>
                        <motion.p 
                          initial={{ x: -50, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="font-pixel text-base md:text-xl text-pink-400 drop-shadow-lg"
                        >
                          {currentComment.kol?.twitter_handle || '@unknown'}
                        </motion.p>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 p-5 md:p-10 flex flex-col justify-center min-h-[300px]">
                      {/* Rating display */}
                      <div className="mb-5 md:mb-8">
                        <div className="flex items-center gap-2 mb-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-7 h-7 md:w-10 md:h-10 ${
                                star <= (currentComment.rating || 0)
                                  ? (currentComment.rating || 0) <= 2
                                    ? "text-red-500 fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                                    : (currentComment.rating || 0) <= 3
                                      ? "text-yellow-500 fill-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]"
                                      : "text-green-500 fill-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]"
                                  : "text-white/20"
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`font-pixel text-lg md:text-2xl bg-gradient-to-r ${getRatingColor(currentComment.rating || 3)} bg-clip-text text-transparent font-bold`}>
                          {getRatingText(currentComment.rating || 3)}
                        </p>
                      </div>

                      {/* Comment content */}
                      <div className="relative py-4">
                        <span className="absolute -top-2 -left-2 text-5xl md:text-7xl text-pink-500/20 font-serif">"</span>
                        <p className="font-pixel text-lg md:text-2xl text-white/90 leading-relaxed pl-6 md:pl-8 pr-4 line-clamp-3">
                          {currentComment.content.slice(0, 100)}
                        </p>
                        <span className="absolute -bottom-4 right-0 text-5xl md:text-7xl text-pink-500/20 font-serif">"</span>
                      </div>

                      {/* Reviewer */}
                      <div className="mt-8 md:mt-10 flex items-center gap-4 pt-5 border-t border-white/10">
                        <img
                          src={currentComment.user_profile?.profile_pic_url || `https://ui-avatars.com/api/?name=A&background=333&color=fff&size=40`}
                          alt="Reviewer"
                          className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-pink-500/30"
                        />
                        <div>
                          <p className="font-pixel text-sm md:text-base text-white/90">
                            {currentComment.user_profile?.display_name || 
                             `${currentComment.wallet_address.slice(0, 6)}...${currentComment.wallet_address.slice(-4)}`}
                          </p>
                          <p className="font-pixel text-[10px] text-pink-400/60 tracking-wider">ROASTER</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="relative h-1.5 bg-white/5">
                    <motion.div
                      className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getRatingColor(currentComment.rating || 3)}`}
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: DISPLAY_DURATION / 1000, ease: "linear" }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Waiting State */
            <motion.div
              key="waiting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
              className="text-center relative"
            >
              {/* Animated radar/scanning effect */}
              <div className="relative mb-10 inline-block">
                {/* Radar rings */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-pink-500/30"
                  style={{ width: '280px', height: '280px', margin: 'auto', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)' }}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border border-cyan-500/20"
                  style={{ width: '320px', height: '320px', margin: 'auto', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)' }}
                  animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                />
                
                {/* Logo with floating animation */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <video 
                    src={streamLogoVideo} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className="w-40 h-40 md:w-56 md:h-56 mx-auto object-contain rounded-2xl border border-pink-500/30 shadow-[0_0_60px_rgba(236,72,153,0.3)]"
                  />
                </motion.div>
              </div>

              {/* Animated title */}
              <motion.h2 
                className="font-pixel text-3xl md:text-5xl text-white mb-6"
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                WAITING FOR ROASTS
              </motion.h2>

              {/* Bouncing dots */}
              <div className="flex justify-center gap-4 mb-8">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 bg-gradient-to-r from-pink-500 to-cyan-400 rounded-full"
                    animate={{ 
                      y: [0, -15, 0],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{ 
                      duration: 0.6, 
                      repeat: Infinity, 
                      delay: i * 0.1,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>

              {/* Scanning line effect */}
              <div className="relative max-w-md mx-auto overflow-hidden rounded-lg bg-white/5 border border-white/10 p-4">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-pink-500/20 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                <p className="font-pixel text-sm md:text-base text-white/60 relative z-10">
                  Drop a review on any KOL and watch it appear here in real-time
                </p>
              </div>

              {/* Status indicator */}
              <motion.div 
                className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="font-pixel text-xs text-green-400">LISTENING FOR NEW REVIEWS</span>
              </motion.div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-center z-20">
        <div className="font-pixel text-[10px] text-white/20 tracking-wider">
          ROTTEN TRENCHES © 2025
        </div>
        <motion.div 
          className="font-pixel text-[10px] text-pink-500/50 tracking-wider"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {now.toLocaleTimeString()}
        </motion.div>
      </div>
    </div>
  );
}
