import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ExternalLink, ArrowRightLeft, CheckCircle2, XCircle, Filter, MessageSquarePlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TokenInfo {
  symbol: string;
  amount: number;
  image: string | null;
}

export interface Trade {
  signature: string;
  timestamp: number;
  type: string;
  description: string;
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  fee: number;
  success: boolean;
}

type TradeFilter = 'all' | 'buy' | 'sell';

interface LatestTradesProps {
  walletAddress: string | null;
  onCiteTrade?: (trade: Trade) => void;
  showCiteButton?: boolean;
}

const REFRESH_COOLDOWN_KEY = 'trades_refresh_cooldown';
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

interface VolumeData {
  total: number;
  buy: number;
  sell: number;
}

export function LatestTrades({ walletAddress, onCiteTrade, showCiteButton = false }: LatestTradesProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [filter, setFilter] = useState<TradeFilter>('all');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [volume, setVolume] = useState<VolumeData | null>(null);

  // Check cooldown from localStorage
  const getCooldownRemaining = useCallback(() => {
    const stored = localStorage.getItem(`${REFRESH_COOLDOWN_KEY}_${walletAddress}`);
    if (!stored) return 0;
    const lastRefresh = parseInt(stored, 10);
    const elapsed = Date.now() - lastRefresh;
    return Math.max(0, COOLDOWN_MS - elapsed);
  }, [walletAddress]);

  // Update cooldown timer
  useEffect(() => {
    const updateCooldown = () => {
      setCooldownRemaining(getCooldownRemaining());
    };
    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [getCooldownRemaining]);

  const fetchTrades = useCallback(async (isManual = false) => {
    if (!walletAddress) return;
    
    // Check cooldown for manual refresh
    if (isManual) {
      const remaining = getCooldownRemaining();
      if (remaining > 0) {
        setError(`Please wait ${Math.ceil(remaining / 60000)} min before refreshing`);
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-kol-trades', {
        body: { walletAddress }
      });
      
      if (fnError) throw fnError;
      
      setTrades(data?.trades || []);
      setVolume(data?.volume || null);
      setLastFetched(new Date());
      
      // Set cooldown on manual refresh
      if (isManual) {
        localStorage.setItem(`${REFRESH_COOLDOWN_KEY}_${walletAddress}`, Date.now().toString());
        setCooldownRemaining(COOLDOWN_MS);
      }
    } catch (err) {
      console.error('Error fetching trades:', err);
      setError('Failed to fetch trades');
    } finally {
      setLoading(false);
    }
  }, [walletAddress, getCooldownRemaining]);

  // Initial fetch only (no auto-refresh)
  useEffect(() => {
    if (walletAddress) {
      fetchTrades(false);
    }
  }, [walletAddress, fetchTrades]);

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Filter trades based on selected filter
  const filteredTrades = trades.filter((trade) => {
    if (filter === 'all') return true;
    if (filter === 'buy') return trade.type === 'BUY';
    if (filter === 'sell') return trade.type === 'SELL';
    return true;
  });

  if (!walletAddress) {
    return (
      <div className="text-center py-8">
        <p className="font-pixel text-[10px] text-muted-foreground">
          No wallet linked to this KOL
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Volume Summary */}
      {volume && volume.total > 0 && (
        <div className="bg-muted/30 border border-border/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-pixel text-[9px] text-muted-foreground">Total Volume (≥0.4 SOL trades)</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="font-pixel text-[7px] text-muted-foreground">Buy</p>
              <p className="font-pixel text-sm text-accent">{volume.buy.toFixed(2)} SOL</p>
            </div>
            <div className="text-center border-x border-border/30">
              <p className="font-pixel text-[7px] text-muted-foreground">Total</p>
              <p className="font-pixel text-sm text-secondary">{volume.total.toFixed(2)} SOL</p>
            </div>
            <div className="text-center">
              <p className="font-pixel text-[7px] text-muted-foreground">Sell</p>
              <p className="font-pixel text-sm text-primary">{volume.sell.toFixed(2)} SOL</p>
            </div>
          </div>
        </div>
      )}

      {/* Header with filter and refresh */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-secondary" />
          <span className="font-pixel text-[10px] text-foreground">Latest Trades</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filter buttons */}
          <div className="flex items-center gap-1 bg-muted/30 rounded p-0.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-1 rounded font-pixel text-[7px] transition-colors ${
                filter === 'all' 
                  ? 'bg-secondary text-secondary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('buy')}
              className={`px-2 py-1 rounded font-pixel text-[7px] transition-colors ${
                filter === 'buy' 
                  ? 'bg-accent text-accent-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Buys
            </button>
            <button
              onClick={() => setFilter('sell')}
              className={`px-2 py-1 rounded font-pixel text-[7px] transition-colors ${
                filter === 'sell' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sells
            </button>
          </div>
          
          {lastFetched && (
            <span className="font-pixel text-[7px] text-muted-foreground hidden sm:block">
              {formatTime(lastFetched.getTime())}
            </span>
          )}
          <button
            onClick={() => fetchTrades(true)}
            disabled={loading || cooldownRemaining > 0}
            className="flex items-center gap-1 px-2 py-1 bg-muted/30 hover:bg-muted/50 rounded transition-colors disabled:opacity-50"
            title={cooldownRemaining > 0 ? `Wait ${Math.ceil(cooldownRemaining / 60000)}m` : 'Refresh trades'}
          >
            <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            {cooldownRemaining > 0 && (
              <span className="font-pixel text-[6px] text-muted-foreground">
                {Math.ceil(cooldownRemaining / 60000)}m
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3 bg-primary/10 border border-primary/30 rounded">
          <p className="font-pixel text-[9px] text-primary">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && trades.length === 0 && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted/30 rounded animate-pulse" />
          ))}
        </div>
      )}

      {/* Trades list */}
      <AnimatePresence mode="popLayout">
        {filteredTrades.length > 0 ? (
          <div className="space-y-2">
            {filteredTrades.map((trade, index) => {
              const direction = trade.type === 'BUY' ? 'BUY' : 'SELL';
              const variant = direction === 'BUY' ? 'buy' : 'sell';

              return (
                <motion.div
                  key={trade.signature}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-lg border transition-colors ${
                    variant === 'buy'
                      ? 'bg-accent/5 border-accent/20 hover:bg-accent/10'
                      : variant === 'sell'
                        ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                        : 'bg-muted/20 border-border/30 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {trade.success ? (
                        <CheckCircle2 className="w-3 h-3 text-accent" />
                      ) : (
                        <XCircle className="w-3 h-3 text-primary" />
                      )}
                      <span
                        className={`font-pixel text-[8px] uppercase ${
                          variant === 'buy' ? 'text-accent' : 'text-primary'
                        }`}
                      >
                        {direction}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-pixel text-[7px] text-muted-foreground">
                        {formatTime(trade.timestamp)}
                      </span>
                      {showCiteButton && onCiteTrade && (
                        <button
                          onClick={() => onCiteTrade(trade)}
                          className="flex items-center gap-1 px-1.5 py-0.5 bg-secondary/20 hover:bg-secondary/40 rounded text-secondary transition-colors"
                          title="Cite in review"
                        >
                          <MessageSquarePlus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-muted/50 px-2 py-1 rounded">
                      <p className="font-pixel text-[7px] text-muted-foreground">Sold</p>
                      <div className="flex items-center gap-1.5">
                        {trade.tokenIn.image && (
                          <img 
                            src={trade.tokenIn.image} 
                            alt={trade.tokenIn.symbol}
                            className="w-4 h-4 rounded-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        <p className="font-pixel text-[9px] text-foreground truncate">
                          {trade.tokenIn.amount > 0 
                            ? trade.tokenIn.amount.toFixed(4) 
                            : '?'} {trade.tokenIn.symbol}
                        </p>
                      </div>
                    </div>
                    <ArrowRightLeft className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 bg-muted/50 px-2 py-1 rounded">
                      <p className="font-pixel text-[7px] text-muted-foreground">Bought</p>
                      <div className="flex items-center gap-1.5">
                        {trade.tokenOut.image && (
                          <img 
                            src={trade.tokenOut.image} 
                            alt={trade.tokenOut.symbol}
                            className="w-4 h-4 rounded-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        <p className="font-pixel text-[9px] text-foreground truncate">
                          {trade.tokenOut.amount > 0 
                            ? trade.tokenOut.amount.toFixed(4) 
                            : '?'} {trade.tokenOut.symbol}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <a
                    href={`https://solscan.io/tx/${trade.signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-accent hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    <span className="font-pixel text-[7px]">
                      {trade.signature.slice(0, 8)}...{trade.signature.slice(-8)}
                    </span>
                    <ExternalLink className="w-2 h-2" />
                  </a>
                </motion.div>
              );
            })}
          </div>
        ) : !loading && (
          <div className="text-center py-8">
            <p className="font-pixel text-[10px] text-muted-foreground">
              {filter === 'all' ? 'No pump trades found' : `No ${filter} trades found`}
            </p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
