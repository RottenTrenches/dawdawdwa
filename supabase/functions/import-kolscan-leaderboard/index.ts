import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KolData {
  username: string;
  wallet_address: string;
  twitter_handle: string;
  pnl_sol: number;
  profile_pic_url: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[import-kolscan-leaderboard] Starting import...");

    const leaderboardUrl = "https://kolscan.io/leaderboard?timeframe=3";
    console.log("[import-kolscan-leaderboard] Fetching:", leaderboardUrl);

    const response = await fetch(leaderboardUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Kolscan: ${response.status}`);
    }

    const html = await response.text();
    console.log("[import-kolscan-leaderboard] Got HTML, length:", html.length);

    const kols: KolData[] = [];
    const seenWallets = new Set<string>();

    // Extract wallet addresses from profile pic URLs (stable in SSR HTML)
    const walletPattern = /cdn\.kolscan\.io\/profiles\/([1-9A-HJ-NP-Za-km-z]{32,44})\.png/g;
    const wallets: string[] = [];

    let wMatch: RegExpExecArray | null;
    while ((wMatch = walletPattern.exec(html)) !== null) {
      if (!wallets.includes(wMatch[1])) wallets.push(wMatch[1]);
    }

    console.log("[import-kolscan-leaderboard] Found", wallets.length, "wallets from profile pics");

    for (const wallet of wallets) {
      if (seenWallets.has(wallet)) continue;

      const picIndex = html.indexOf(`cdn.kolscan.io/profiles/${wallet}.png`);
      if (picIndex === -1) continue;

      const context = html.substring(picIndex, Math.min(html.length, picIndex + 700));

      let username = "";

      // Most reliable when present
      const h2Match = context.match(/<h2[^>]*>([^<]+)<\/h2>/i);
      if (h2Match) {
        const name = h2Match[1].trim();
        if (name.length >= 2 && !/^\d+$/.test(name) && !/Sol|USD|\$|Pump|app/i.test(name)) {
          username = name;
        }
      }

      // Fallback: first <a ...account/...>TEXT</a>
      if (!username) {
        const linkMatch = context.match(/href="[^"]*account\/[^"]*"[^>]*>([^<]+)<\/a>/i);
        if (linkMatch) {
          const name = linkMatch[1].trim();
          if (name.length >= 2 && !/^\d+$/.test(name) && !/Sol|USD|\$|Pump|app/i.test(name)) {
            username = name;
          }
        }
      }

      // Fallback: any nearby short-ish text token
      if (!username) {
        const anyTextMatch = context.match(/>([A-Za-z][A-Za-z0-9_\.\s\-]{1,29})</);
        if (anyTextMatch) {
          const name = anyTextMatch[1].trim();
          if (name.length >= 2 && !/Sol|USD|\$|Pump|app/i.test(name)) {
            username = name;
          }
        }
      }

      if (!username) continue;

      // PNL from nearby context if present
      const pnlMatch = context.match(/([+-]?\d+(?:\.\d+)?)\s*Sol/i);
      const pnl_sol = pnlMatch ? Number(pnlMatch[1]) : 0;

      // IMPORTANT: don't lowercase; keep exact casing, only strip invalid chars.
      const handleCore = username.replace(/[^a-zA-Z0-9_]/g, "");
      if (!handleCore) continue;

      const twitter_handle = `@${handleCore}`;
      const profile_pic_url = `https://cdn.kolscan.io/profiles/${wallet}.png`;

      seenWallets.add(wallet);
      kols.push({
        username,
        wallet_address: wallet,
        twitter_handle,
        pnl_sol,
        profile_pic_url,
      });
    }

    kols.sort((a, b) => b.pnl_sol - a.pnl_sol);
    const top = kols.slice(0, 100);

    if (top.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Could not parse any KOLs" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: existing, error: fetchError } = await supabase
      .from("kols")
      .select("wallet_address")
      .not("wallet_address", "is", null);

    if (fetchError) throw fetchError;

    const existingWallets = new Set((existing ?? []).map((k: any) => String(k.wallet_address).toLowerCase()));

    const newKols = top.filter((k) => !existingWallets.has(k.wallet_address.toLowerCase()));

    let imported = 0;
    const errors: string[] = [];

    for (const kol of newKols) {
      const { error } = await supabase.from("kols").insert({
        username: kol.username,
        twitter_handle: kol.twitter_handle,
        wallet_address: kol.wallet_address,
        profile_pic_url: kol.profile_pic_url,
        categories: [],
        rating: 0,
        upvotes: 0,
        downvotes: 0,
        total_votes: 0,
      });

      if (error) errors.push(`${kol.username}: ${error.message}`);
      else imported++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_found: top.length,
        already_exist: top.length - newKols.length,
        imported,
        errors: errors.slice(0, 20),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[import-kolscan-leaderboard] Error:", error);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
