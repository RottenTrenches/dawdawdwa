import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[update-kol-names] Starting...');

    // Connect to Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get KOLs with wallet-based names that need updating
    const { data: kolsToUpdate, error: fetchError } = await supabase
      .from('kols')
      .select('id, username, wallet_address')
      .like('username', 'Wallet %')
      .not('wallet_address', 'is', null)
      .limit(20); // Process 20 at a time

    if (fetchError) {
      console.error('[update-kol-names] Error fetching KOLs:', fetchError);
      throw fetchError;
    }

    if (!kolsToUpdate || kolsToUpdate.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No KOLs to update',
        updated: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[update-kol-names] Found', kolsToUpdate.length, 'KOLs to update');

    let updated = 0;
    const results: { wallet: string; oldName: string; newName: string }[] = [];

    for (const kol of kolsToUpdate) {
      if (!kol.wallet_address) continue;

      try {
        // Fetch the individual KOL profile page from Kolscan
        const profileUrl = `https://kolscan.io/account/${kol.wallet_address}`;
        console.log('[update-kol-names] Fetching:', profileUrl);

        const response = await fetch(profileUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          }
        });

        if (!response.ok) {
          console.log('[update-kol-names] Failed to fetch profile for', kol.wallet_address.slice(0, 8));
          continue;
        }

        const html = await response.text();
        
        // Look for the username in the profile page
        // Pattern: The username is usually in an <h1> or <h2> near the top
        // Try multiple patterns
        let newUsername = '';

        // Pattern 1: Look for meta og:title which usually has the username
        const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/);
        if (ogTitleMatch) {
          const title = ogTitleMatch[1].trim();
          // Extract username from title (often "Username | Kolscan" or "Username - Kolscan")
          const cleanTitle = title.replace(/\s*[\|\-]\s*Kolscan.*/i, '').trim();
          if (cleanTitle && cleanTitle.length >= 2 && cleanTitle.length <= 50) {
            newUsername = cleanTitle;
          }
        }

        // Pattern 2: Look for <h1>Username</h1> or <h2>Username</h2>
        if (!newUsername) {
          const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
          if (h1Match) {
            const name = h1Match[1].trim();
            if (name.length >= 2 && name.length <= 50 && !/^[1-9A-HJ-NP-Za-km-z]{10,}$/.test(name)) {
              newUsername = name;
            }
          }
        }

        // Pattern 3: Look for class containing "name" or "title" followed by text
        if (!newUsername) {
          const nameClassMatch = html.match(/class="[^"]*(?:name|title|header)[^"]*"[^>]*>([^<]+)</i);
          if (nameClassMatch) {
            const name = nameClassMatch[1].trim();
            if (name.length >= 2 && name.length <= 50 && !/^[1-9A-HJ-NP-Za-km-z]{10,}$/.test(name)) {
              newUsername = name;
            }
          }
        }

        if (newUsername && newUsername !== kol.username) {
          // Update the KOL with the new username
          const twitter_handle = `@${newUsername.replace(/\s+/g, '').toLowerCase()}`;
          
          const { error: updateError } = await supabase
            .from('kols')
            .update({ 
              username: newUsername,
              twitter_handle: twitter_handle
            })
            .eq('id', kol.id);

          if (updateError) {
            console.error('[update-kol-names] Update error for', kol.id, ':', updateError.message);
          } else {
            updated++;
            results.push({
              wallet: kol.wallet_address.slice(0, 8),
              oldName: kol.username,
              newName: newUsername
            });
            console.log('[update-kol-names] Updated:', kol.username, '->', newUsername);
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (err) {
        console.error('[update-kol-names] Error processing', kol.wallet_address.slice(0, 8), ':', err);
      }
    }

    const result = {
      success: true,
      total_checked: kolsToUpdate.length,
      updated,
      results
    };

    console.log('[update-kol-names] Complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[update-kol-names] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
