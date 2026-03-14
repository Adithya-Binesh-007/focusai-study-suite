-- Storage bucket for chat image uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-uploads', 'chat-uploads', true);

-- RLS: authenticated users can upload to their own folder
CREATE POLICY "Users can upload own files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: anyone can view uploaded files (public bucket)
CREATE POLICY "Public read access on chat uploads" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'chat-uploads');

-- RLS: users can delete own files
CREATE POLICY "Users can delete own chat files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
