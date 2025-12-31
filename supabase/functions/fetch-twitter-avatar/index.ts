import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { twitter_handle } = await req.json();

    if (!twitter_handle) {
      return new Response(
        JSON.stringify({ error: 'Twitter handle is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean the twitter handle (remove @ if present)
    const cleanHandle = twitter_handle.replace('@', '').trim();

    // Use unavatar.io service which fetches Twitter avatars reliably
    // This service aggregates from multiple sources and handles rate limiting
    const avatarUrl = `https://unavatar.io/twitter/${cleanHandle}?fallback=false`;

    // Verify the avatar exists by making a HEAD request
    const checkResponse = await fetch(avatarUrl, { method: 'HEAD' });
    
    if (checkResponse.ok) {
      return new Response(
        JSON.stringify({ 
          profile_pic_url: avatarUrl,
          twitter_handle: cleanHandle,
          source: 'unavatar'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback to a generated avatar based on the handle
    const fallbackUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${cleanHandle}&backgroundColor=random`;

    return new Response(
      JSON.stringify({ 
        profile_pic_url: fallbackUrl,
        twitter_handle: cleanHandle,
        source: 'generated'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error fetching Twitter avatar:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
