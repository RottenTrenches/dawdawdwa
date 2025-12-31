-- Enable realtime payloads for stream comments
ALTER TABLE public.kol_comments REPLICA IDENTITY FULL;

-- Publish table changes to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.kol_comments;