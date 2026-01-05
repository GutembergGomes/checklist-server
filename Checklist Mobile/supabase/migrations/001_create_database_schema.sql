-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de usuários (integrada com Supabase Auth)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'tecnico' CHECK (role IN ('tecnico', 'supervisor', 'admin')),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de equipamentos
CREATE TABLE equipamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(100) UNIQUE NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('irrigacao', 'cct', 'coque', 'geral')),
    descricao TEXT,
    localizacao VARCHAR(255),
    qr_code_data VARCHAR(500),
    ativo BOOLEAN DEFAULT true,
    ultima_manutencao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de checklists
CREATE TABLE checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipamento_id UUID REFERENCES equipamentos(id),
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    itens JSONB NOT NULL,
    data_prevista DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'completo', 'atrasado')),
    criado_por UUID REFERENCES usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de respostas dos checklists
CREATE TABLE respostas_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID REFERENCES checklists(id),
    equipamento_id UUID REFERENCES equipamentos(id),
    usuario_id UUID REFERENCES usuarios(id),
    respostas JSONB NOT NULL,
    observacoes TEXT,
    assinatura TEXT,
    data_execucao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sincronizado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de fotos
CREATE TABLE fotos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resposta_id UUID REFERENCES respostas_checklist(id),
    url VARCHAR(500),
    nome_arquivo VARCHAR(255),
    bucket_path VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de controle de sincronização
CREATE TABLE sync_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    tabela VARCHAR(50) NOT NULL,
    ultima_sincronizacao TIMESTAMP WITH TIME ZONE,
    registros_pendentes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de log de sincronização
CREATE TABLE sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    tipo_operacao VARCHAR(20) NOT NULL,
    tabela_afetada VARCHAR(50),
    registro_id UUID,
    status VARCHAR(20),
    mensagem TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_checklists_equipamento ON checklists(equipamento_id);
CREATE INDEX idx_checklists_status ON checklists(status);
CREATE INDEX idx_checklists_data_prevista ON checklists(data_prevista);
CREATE INDEX idx_respostas_usuario ON respostas_checklist(usuario_id);
CREATE INDEX idx_respostas_sincronizado ON respostas_checklist(sincronizado);
CREATE INDEX idx_fotos_resposta ON fotos(resposta_id);
CREATE INDEX idx_sync_control_usuario ON sync_control(usuario_id);
CREATE INDEX idx_sync_log_usuario ON sync_log(usuario_id);

-- Permissões básicas
GRANT SELECT ON usuarios TO anon;
GRANT SELECT ON usuarios TO authenticated;
GRANT ALL PRIVILEGES ON equipamentos TO authenticated;
GRANT ALL PRIVILEGES ON checklists TO authenticated;
GRANT ALL PRIVILEGES ON respostas_checklist TO authenticated;
GRANT ALL PRIVILEGES ON fotos TO authenticated;
GRANT ALL PRIVILEGES ON sync_control TO authenticated;
GRANT ALL PRIVILEGES ON sync_log TO authenticated;

-- Políticas de segurança
CREATE POLICY "Usuários podem ver próprio perfil" ON usuarios
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuários autenticados podem ver equipamentos ativos" ON equipamentos
    FOR SELECT USING (ativo = true);

CREATE POLICY "Usuários podem ver checklists atribuídos" ON checklists
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuarios
            WHERE usuarios.id = auth.uid()
            AND usuarios.ativo = true
        )
    );

CREATE POLICY "Usuários podem criar respostas" ON respostas_checklist
    FOR INSERT WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Usuários podem ver próprias respostas" ON respostas_checklist
    FOR SELECT USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem atualizar próprias respostas" ON respostas_checklist
    FOR UPDATE USING (usuario_id = auth.uid());

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipamentos_updated_at BEFORE UPDATE ON equipamentos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklists_updated_at BEFORE UPDATE ON checklists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_control_updated_at BEFORE UPDATE ON sync_control
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Dados de exemplo
INSERT INTO equipamentos (codigo, tipo, descricao, localizacao, qr_code_data) VALUES
    ('IRR-001', 'irrigacao', 'Sistema de Irrigação Principal', 'Setor A - Lote 1', 'IRR-001-2024'),
    ('CCT-001', 'cct', 'Centro de Controle de Temperatura', 'Setor B - Galpão 2', 'CCT-001-2024'),
    ('COQ-001', 'coque', 'Sistema de Coque', 'Setor C - Área Industrial', 'COQ-001-2024'),
    ('IRR-002', 'irrigacao', 'Sistema de Irrigação Secundário', 'Setor D - Lote 3', 'IRR-002-2024');

INSERT INTO checklists (equipamento_id, tipo, titulo, itens, data_prevista, status, criado_por) VALUES
    ((SELECT id FROM equipamentos WHERE codigo = 'IRR-001'), 'irrigacao', 'Checklist Mensal - Irrigação Principal', 
     '[
       {"id": "1", "descricao": "Verificar pressão do sistema", "tipo": "numero", "obrigatorio": true, "valor_esperado": 2.5, "ordem": 1},
       {"id": "2", "descricao": "Inspecionar vazamentos", "tipo": "booleano", "obrigatorio": true, "valor_esperado": false, "ordem": 2},
       {"id": "3", "descricao": "Foto do painel de controle", "tipo": "foto", "obrigatorio": true, "ordem": 3},
       {"id": "4", "descricao": "Observações gerais", "tipo": "texto", "obrigatorio": false, "ordem": 4}
     ]'::jsonb, 
     CURRENT_DATE + INTERVAL '7 days', 'pendente', (SELECT id FROM usuarios LIMIT 1)),
    
    ((SELECT id FROM equipamentos WHERE codigo = 'CCT-001'), 'cct', 'Checklist Semanal - CCT', 
     '[
       {"id": "5", "descricao": "Temperatura do sistema", "tipo": "numero", "obrigatorio": true, "valor_esperado": 25, "ordem": 1},
       {"id": "6", "descricao": "Status do compressor", "tipo": "booleano", "obrigatorio": true, "valor_esperado": true, "ordem": 2},
       {"id": "7", "descricao": "Foto da unidade externa", "tipo": "foto", "obrigatorio": true, "ordem": 3}
     ]'::jsonb, 
     CURRENT_DATE + INTERVAL '3 days', 'pendente', (SELECT id FROM usuarios LIMIT 1));