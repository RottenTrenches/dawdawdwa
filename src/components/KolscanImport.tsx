import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, ExternalLink, X, CheckCircle, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ImportedKOL {
  username: string;
  wallet_address: string;
  twitter_handle: string;
}

interface KolscanImportProps {
  onImportSuccess: () => void;
}

export function KolscanImport({ onImportSuccess }: KolscanImportProps) {
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [parsedKols, setParsedKols] = useState<ImportedKOL[]>([]);
  const [importStep, setImportStep] = useState<"input" | "preview">("input");

  const parseKolscanData = (text: string): ImportedKOL[] => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const kols: ImportedKOL[] = [];
    
    for (const line of lines) {
      // Try to parse various formats:
      // Format 1: username,wallet_address,@twitter
      // Format 2: username wallet_address @twitter
      // Format 3: just wallet addresses (one per line)
      
      const parts = line.split(/[,\t]+/).map(p => p.trim());
      
      if (parts.length >= 1) {
        const walletPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
        
        if (parts.length === 1 && walletPattern.test(parts[0])) {
          // Just a wallet address
          kols.push({
            username: `Wallet ${parts[0].slice(0, 6)}...${parts[0].slice(-4)}`,
            wallet_address: parts[0],
            twitter_handle: ""
          });
        } else if (parts.length >= 2) {
          // Multiple parts - try to identify each
          let username = parts[0];
          let wallet = "";
          let twitter = "";
          
          for (const part of parts) {
            if (walletPattern.test(part)) {
              wallet = part;
            } else if (part.startsWith('@') || part.match(/^[a-zA-Z0-9_]+$/)) {
              if (!username || username === parts[0]) {
                if (part.startsWith('@')) {
                  twitter = part;
                } else if (!username) {
                  username = part;
                }
              } else if (!twitter) {
                twitter = part.startsWith('@') ? part : `@${part}`;
              }
            }
          }
          
          if (username || wallet) {
            kols.push({
              username: username || `Wallet ${wallet.slice(0, 6)}...${wallet.slice(-4)}`,
              wallet_address: wallet,
              twitter_handle: twitter
            });
          }
        }
      }
    }
    
    return kols;
  };

  const handleParse = () => {
    if (!importText.trim()) {
      toast.error("Please paste some data to import");
      return;
    }
    
    const kols = parseKolscanData(importText);
    
    if (kols.length === 0) {
      toast.error("Could not parse any KOLs from the input");
      return;
    }
    
    setParsedKols(kols);
    setImportStep("preview");
  };

  const handleImport = async () => {
    if (parsedKols.length === 0) return;
    
    setImporting(true);
    let successCount = 0;
    let errorCount = 0;
    
    for (const kol of parsedKols) {
      const { error } = await supabase.from('kols').insert({
        username: kol.username,
        twitter_handle: kol.twitter_handle || `@${kol.username.toLowerCase().replace(/\s+/g, '_')}`,
        wallet_address: kol.wallet_address || null,
        categories: null
      });
      
      if (error) {
        console.error('Import error:', error);
        errorCount++;
      } else {
        successCount++;
      }
    }
    
    setImporting(false);
    
    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} KOL${successCount > 1 ? 's' : ''}`);
      onImportSuccess();
    }
    
    if (errorCount > 0) {
      toast.error(`Failed to import ${errorCount} KOL${errorCount > 1 ? 's' : ''}`);
    }
    
    // Reset
    setShowImport(false);
    setImportText("");
    setParsedKols([]);
    setImportStep("input");
  };

  const handleRemoveKol = (index: number) => {
    setParsedKols(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="inline-block">
      <button
        onClick={() => setShowImport(!showImport)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-pixel text-[9px] rounded transition-colors"
      >
        <Download className="w-3 h-3" />
        IMPORT
      </button>

      <AnimatePresence>
        {showImport && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowImport(false);
                setImportText("");
                setParsedKols([]);
                setImportStep("input");
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="stat-card p-6 rounded-lg w-full max-w-lg max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
            {importStep === "input" ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-pixel text-sm text-foreground flex items-center gap-2">
                    <Download className="w-4 h-4 text-secondary" />
                    Mass Import Wallets
                  </h3>
                </div>
                
                <div className="space-y-3 mb-4">
                  <p className="font-pixel text-[9px] text-foreground">How to mass import:</p>
                  <ol className="list-decimal list-inside space-y-2 font-pixel text-[8px] text-muted-foreground">
                    <li>Paste wallet addresses below, one per line</li>
                    <li>Optionally add username and Twitter handle (comma-separated)</li>
                    <li>Format: <span className="text-accent">username, wallet_address, @twitter</span></li>
                    <li>Or just paste wallet addresses alone</li>
                  </ol>
                </div>
                
                <Textarea
                  placeholder={`Examples:\nCryptoKing, 7xKXt...abc123, @cryptoking\nDeFiWhale, 9yMNp...def456\n\nOr just wallet addresses:\n7xKXtGkPqR5mVnL8bYzW2sHjN4uFc9dKe3wQaT6pM\n9yMNpLkRqS8tVbX3cYzA1sHjN5uFd0eKf4wRbU7oP`}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="min-h-[150px] font-mono text-[10px] bg-muted/30 border-border mb-4"
                />
                
                <div className="flex gap-2">
                  <button
                    onClick={handleParse}
                    className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-pixel text-[9px] rounded transition-colors"
                  >
                    Parse & Preview
                  </button>
                  <button
                    onClick={() => {
                      setShowImport(false);
                      setImportText("");
                    }}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground font-pixel text-[9px] rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-pixel text-sm text-foreground flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-accent" />
                    Preview Import ({parsedKols.length} KOLs)
                  </h3>
                </div>
                
                <div className="max-h-[300px] overflow-y-auto space-y-2 mb-4">
                  {parsedKols.map((kol, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-pixel text-[10px] text-foreground truncate">
                          {kol.username}
                        </p>
                        <p className="font-pixel text-[8px] text-muted-foreground truncate">
                          {kol.wallet_address ? `${kol.wallet_address.slice(0, 8)}...${kol.wallet_address.slice(-6)}` : 'No wallet'}
                        </p>
                        {kol.twitter_handle && (
                          <p className="font-pixel text-[8px] text-accent">
                            {kol.twitter_handle}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveKol(index)}
                        className="p-1 hover:bg-primary/20 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-primary" />
                      </button>
                    </div>
                  ))}
                </div>
                
                {parsedKols.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="font-pixel text-[9px] text-muted-foreground">
                      No KOLs to import. Go back and add some.
                    </p>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button
                    onClick={handleImport}
                    disabled={importing || parsedKols.length === 0}
                    className="px-4 py-2 bg-accent hover:bg-accent/80 text-accent-foreground font-pixel text-[9px] rounded transition-colors disabled:opacity-50"
                  >
                    {importing ? "Importing..." : `Import ${parsedKols.length} KOLs`}
                  </button>
                  <button
                    onClick={() => setImportStep("input")}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground font-pixel text-[9px] rounded transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      setShowImport(false);
                      setImportText("");
                      setParsedKols([]);
                      setImportStep("input");
                    }}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground font-pixel text-[9px] rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}