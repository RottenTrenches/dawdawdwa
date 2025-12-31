import { useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, Save, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useWallet } from '@solana/wallet-adapter-react';

export const AdminTokenSettings = () => {
  const { publicKey } = useWallet();
  const { settings, loading, updateSetting, isTokenConfigured } = useAppSettings();
  const [tokenCA, setTokenCA] = useState(settings.rotten_token_ca || '');
  const [saving, setSaving] = useState(false);

  // Update local state when settings load
  useState(() => {
    if (settings.rotten_token_ca) {
      setTokenCA(settings.rotten_token_ca);
    }
  });

  const handleSave = async () => {
    if (!publicKey) return;
    if (!tokenCA.trim()) {
      return;
    }

    setSaving(true);
    await updateSetting('rotten_token_ca', tokenCA.trim(), publicKey.toBase58());
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="stat-card p-4 rounded-sm animate-pulse">
        <div className="h-20 bg-muted/30 rounded" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="stat-card p-6 rounded-sm mb-8"
    >
      <div className="flex items-center gap-3 mb-4">
        <Coins className="w-5 h-5 text-secondary" />
        <h3 className="font-pixel text-sm text-foreground">$ROTTEN Token Settings</h3>
        {isTokenConfigured && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-accent/20 text-accent font-pixel text-[7px] rounded">
            <CheckCircle className="w-3 h-3" />
            CONFIGURED
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Token CA Input */}
        <div>
          <label className="font-pixel text-[8px] text-muted-foreground mb-2 block">
            Token Contract Address (CA)
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter $ROTTEN token contract address..."
              value={tokenCA}
              onChange={(e) => setTokenCA(e.target.value)}
              className="font-pixel text-[10px] bg-muted/30 border-border flex-1"
            />
            <button
              onClick={handleSave}
              disabled={saving || !tokenCA.trim()}
              className="px-4 py-2 bg-accent hover:bg-accent/80 text-accent-foreground font-pixel text-[9px] rounded transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Treasury Wallet Display */}
        <div>
          <label className="font-pixel text-[8px] text-muted-foreground mb-2 block">
            Treasury Wallet (Bounty payments go here)
          </label>
          <div className="p-3 bg-muted/20 rounded border border-border font-pixel text-[9px] text-muted-foreground flex items-center justify-between">
            <span className="truncate mr-2">{settings.treasury_wallet}</span>
            <a
              href={`https://solscan.io/account/${settings.treasury_wallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 flex-shrink-0"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Status Info */}
        <div className="flex items-start gap-2 p-3 bg-secondary/10 rounded border border-secondary/20">
          <AlertCircle className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
          <div className="font-pixel text-[8px] text-muted-foreground space-y-1">
            <p>
              {isTokenConfigured 
                ? 'Token is configured. Bounty creators will send $ROTTEN to the treasury when creating bounties.'
                : 'Set the token CA to enable bounty payments. Until then, bounties can be created but payments won\'t be processed.'
              }
            </p>
            <p className="text-secondary">
              Refunds for expired/cancelled bounties are processed manually.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
