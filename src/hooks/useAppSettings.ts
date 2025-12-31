import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AppSettings {
  rotten_token_ca: string | null;
  treasury_wallet: string;
}

const TREASURY_WALLET = 'DakRakj1eYvHpbHVPqbE93EvmZ1EQoo7YQ9zEPfHqcPL';

export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings>({
    rotten_token_ca: null,
    treasury_wallet: TREASURY_WALLET,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value');

      if (error) {
        console.error('Error fetching settings:', error);
        return;
      }

      if (data) {
        const settingsMap: Record<string, string> = {};
        data.forEach((item: { key: string; value: string }) => {
          settingsMap[item.key] = item.value;
        });

        setSettings({
          rotten_token_ca: settingsMap['rotten_token_ca'] || null,
          treasury_wallet: settingsMap['treasury_wallet'] || TREASURY_WALLET,
        });
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string, walletAddress: string) => {
    try {
      // Check if setting exists
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('key', key)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('app_settings')
          .update({ value, updated_by: walletAddress })
          .eq('key', key);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('app_settings')
          .insert({ key, value, updated_by: walletAddress });

        if (error) throw error;
      }

      // Update local state
      setSettings(prev => ({
        ...prev,
        [key]: value,
      }));

      toast.success(`Setting "${key}" updated successfully`);
      return true;
    } catch (err) {
      console.error('Failed to update setting:', err);
      toast.error('Failed to update setting');
      return false;
    }
  };

  return {
    settings,
    loading,
    updateSetting,
    refetch: fetchSettings,
    isTokenConfigured: !!settings.rotten_token_ca,
  };
};
