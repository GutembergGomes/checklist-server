CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    nome TEXT,
    role TEXT,
    ativo BOOLEAN DEFAULT true,
    user_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "user" JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipamentos (
    id TEXT PRIMARY KEY,
    codigo TEXT,
    tipo TEXT,
    descricao TEXT,
    localizacao TEXT,
    qr_code_data TEXT,
    ativo BOOLEAN DEFAULT true,
    ultima_manutencao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checklists (
    id TEXT PRIMARY KEY,
    equipamento_id TEXT,
    tipo TEXT,
    titulo TEXT,
    itens JSONB,
    data_prevista TIMESTAMP WITH TIME ZONE,
    status TEXT,
    criado_por TEXT,
    created_locally BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS respostas_checklist (
    id TEXT PRIMARY KEY,
    checklist_id TEXT,
    equipamento_id TEXT,
    usuario_id TEXT,
    respostas JSONB,
    observacoes TEXT,
    assinatura TEXT,
    data_execucao TIMESTAMP WITH TIME ZONE,
    sincronizado BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calibragem (
    id TEXT PRIMARY KEY,
    local_id TEXT,
    user_id TEXT,
    header JSONB,
    pos JSONB,
    sulco JSONB,
    calibragem JSONB,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS controle_3p (
    id TEXT PRIMARY KEY,
    local_id TEXT,
    user_id TEXT,
    header JSONB,
    rows JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_updates (
    id TEXT PRIMARY KEY,
    version TEXT,
    url TEXT,
    mandatory BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_log (
    id TEXT PRIMARY KEY,
    usuario_id TEXT,
    tipo_operacao TEXT,
    tabela_afetada TEXT,
    registro_id TEXT,
    status TEXT,
    mensagem TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure inspections table exists if it is used (mentioned in server.js readJsonData default)
CREATE TABLE IF NOT EXISTS inspections (
    id TEXT PRIMARY KEY,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
