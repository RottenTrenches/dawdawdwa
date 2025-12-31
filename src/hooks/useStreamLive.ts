import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useStreamLive = () => {
  return useQuery({
    queryKey: ["stream-live-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "stream_live")
        .single();

      if (error) {
        console.error("Error fetching stream status:", error);
        return false;
      }

      return data?.value === "true";
    },
    refetchInterval: 30000, // Check every 30 seconds
  });
};
