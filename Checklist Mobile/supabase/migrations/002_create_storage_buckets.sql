-- Criar bucket para fotos dos checklists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'checklist-photos',
    'checklist-photos',
    false,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Políticas do storage para fotos dos checklists
CREATE POLICY "Usuários autenticados podem fazer upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'checklist-photos' AND
        auth.uid() = (storage.foldername(name))[1]::uuid
    );

CREATE POLICY "Usuários podem ver próprias fotos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'checklist-photos' AND
        auth.uid() = (storage.foldername(name))[1]::uuid
    );

CREATE POLICY "Usuários podem atualizar próprias fotos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'checklist-photos' AND
        auth.uid() = (storage.foldername(name))[1]::uuid
    );

CREATE POLICY "Usuários podem deletar próprias fotos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'checklist-photos' AND
        auth.uid() = (storage.foldername(name))[1]::uuid
    );

-- Função para processar upload de fotos
CREATE OR REPLACE FUNCTION process_photo_upload()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se é um upload de foto de checklist
    IF NEW.bucket_id = 'checklist-photos' THEN
        -- Extrair informações do caminho do arquivo
        -- Formato esperado: usuario_id/checklist_id/timestamp-filename.jpg
        
        -- Criar log de upload
        INSERT INTO sync_log (usuario_id, tipo_operacao, tabela_afetada, registro_id, status, mensagem)
        VALUES (
            auth.uid(),
            'insert',
            'fotos',
            NEW.id,
            'success',
            'Foto enviada com sucesso'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para processar uploads
CREATE TRIGGER process_photo_upload_trigger
    AFTER INSERT ON storage.objects
    FOR EACH ROW
    EXECUTE FUNCTION process_photo_upload();

-- Função para limpar registros antigos de fotos
CREATE OR REPLACE FUNCTION cleanup_old_photos()
RETURNS void AS $$
BEGIN
    -- Deletar fotos com mais de 90 dias
    DELETE FROM fotos 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Deletar arquivos do storage correspondentes
    DELETE FROM storage.objects 
    WHERE bucket_id = 'checklist-photos' 
    AND created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agendar limpeza de fotos antigas (pode ser executada via cron ou manualmente)
-- SELECT cleanup_old_photos();