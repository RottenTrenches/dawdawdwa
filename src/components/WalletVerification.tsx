import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationContext } from "@/contexts/NotificationContext";

interface WalletVerificationProps {
  kolId: string;
  kolWalletAddress: string | null;
  isVerified: boolean;
  onVerificationComplete: () => void;
}

export function WalletVerification({ 
  kolId, 
  kolWalletAddress, 
  isVerified,
  onVerificationComplete 
}: WalletVerificationProps) {
  const { publicKey, signMessage, connected } = useWallet();
  const { trackVerifiedKol } = useNotificationContext();
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (!connected || !publicKey || !signMessage) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!kolWalletAddress) {
      toast.error("This KOL doesn't have a wallet address linked");
      return;
    }

    const userWalletAddress = publicKey.toBase58();
    
    // Check if the connected wallet matches the KOL's wallet
    if (userWalletAddress !== kolWalletAddress) {
      toast.error("Connected wallet doesn't match the KOL's wallet address");
      return;
    }

    setVerifying(true);

    try {
      // Create a verification message
      const timestamp = Date.now();
      const message = `Verify wallet ownership for KOL profile\nKOL ID: ${kolId}\nWallet: ${kolWalletAddress}\nTimestamp: ${timestamp}`;
      
      // Request signature from wallet
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);
      
      // Convert signature to base64
      const signatureBase64 = btoa(String.fromCharCode(...signature));

      // Store verification in database
      const { error: verificationError } = await supabase
        .from('wallet_verifications')
        .insert({
          kol_id: kolId,
          wallet_address: kolWalletAddress,
          signature: signatureBase64,
          message: message,
          verified_by_wallet: userWalletAddress
        });

      if (verificationError) {
        console.error('Verification storage error:', verificationError);
        toast.error("Failed to store verification");
        setVerifying(false);
        return;
      }

      // Update KOL's verification status
      const { error: updateError } = await supabase
        .from('kols')
        .update({ is_wallet_verified: true })
        .eq('id', kolId);

      if (updateError) {
        console.error('KOL update error:', updateError);
        toast.error("Failed to update verification status");
        setVerifying(false);
        return;
      }

      // Track this KOL for notifications about comments
      trackVerifiedKol(kolId);

      toast.success("Wallet verified successfully!");
      onVerificationComplete();
    } catch (error) {
      console.error('Verification error:', error);
      toast.error("Verification failed - user rejected or error occurred");
    } finally {
      setVerifying(false);
    }
  };

  if (!kolWalletAddress) {
    return (
      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
        <ShieldAlert className="w-4 h-4 text-muted-foreground" />
        <span className="font-pixel text-[8px] text-muted-foreground">
          No wallet linked
        </span>
      </div>
    );
  }

  if (isVerified) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 p-2 bg-accent/20 rounded-lg"
      >
        <ShieldCheck className="w-4 h-4 text-accent" />
        <span className="font-pixel text-[8px] text-accent">
          Wallet Verified
        </span>
      </motion.div>
    );
  }

  // Check if connected wallet matches
  const canVerify = connected && publicKey && publicKey.toBase58() === kolWalletAddress;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 p-2 bg-primary/20 rounded-lg">
        <ShieldAlert className="w-4 h-4 text-primary" />
        <span className="font-pixel text-[8px] text-primary">
          Unverified
        </span>
      </div>
      
      {canVerify && (
        <button
          onClick={handleVerify}
          disabled={verifying}
          className="px-3 py-2 bg-accent hover:bg-accent/80 text-accent-foreground font-pixel text-[8px] rounded transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {verifying ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <ShieldCheck className="w-3 h-3" />
              Verify Wallet
            </>
          )}
        </button>
      )}
    </div>
  );
}