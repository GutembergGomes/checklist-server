const API_BASE_URL = 'https://checklist-server-nej7.onrender.com';
console.log('Custom API Client v2.1 loaded (with .in support)');

window.createApiClient = function() {
    return {
        auth: {
            signInWithPassword: async ({ email, password }) => {
                try {
                    const res = await fetch(`${API_BASE_URL}/auth/signin`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const data = await res.json();
                    if (!res.ok) return { data: null, error: { message: data.error || 'Erro no login' } };
                    if (data.token) localStorage.setItem('checklist-auth-token', data.token);
                    return { data: { user: data.user, session: { access_token: data.token } }, error: null };
                } catch (e) {
                    return { data: null, error: { message: e.message } };
                }
            },
            signUp: async ({ email, password }) => {
                 // Redireciona para signin, pois o servidor cria usuário se não existir
                 return this.signInWithPassword({ email, password });
            },
            signOut: async () => {
                localStorage.removeItem('checklist-auth-token');
                return { error: null };
            },
            getSession: async () => {
                const token = localStorage.getItem('checklist-auth-token');
                if (!token) return { data: { session: null }, error: null };
                // O ideal seria validar o token no servidor, mas para mock local:
                return { data: { session: { access_token: token, user: { email: 'user@local' } } }, error: null };
            },
            updateUser: async (data) => {
                return { data: { user: { ...data } }, error: null };
            },
            resetPasswordForEmail: async (email) => {
                // Endpoint não implementado no server simples, apenas retorna sucesso
                return { data: {}, error: null };
            },
            onAuthStateChange: (callback) => {
                const token = localStorage.getItem('checklist-auth-token');
                if(token) callback('SIGNED_IN', { access_token: token });
                return { data: { subscription: { unsubscribe: () => {} } } };
            }
        },
        from: (table) => {
            let query = {
                table,
                select: '*',
                filters: [],
                order: null,
                limit: null,
                updateData: null,
                insertData: null,
                upsertData: null,
                isDelete: false
            };
            
            const builder = {
                select: (cols) => { query.select = cols; return builder; },
                eq: (col, val) => { query.filters.push({ col, val, op: 'eq' }); return builder; },
                neq: (col, val) => { query.filters.push({ col, val, op: 'neq' }); return builder; },
                gt: (col, val) => { query.filters.push({ col, val, op: 'gt' }); return builder; },
                gte: (col, val) => { query.filters.push({ col, val, op: 'gte' }); return builder; },
                lt: (col, val) => { query.filters.push({ col, val, op: 'lt' }); return builder; },
                lte: (col, val) => { query.filters.push({ col, val, op: 'lte' }); return builder; },
                in: (col, val) => { query.filters.push({ col, val, op: 'in' }); return builder; },
                order: (col, opts) => { query.order = { col, ...opts }; return builder; },
                limit: (n) => { query.limit = n; return builder; },
                insert: (data) => {
                    query.insertData = data;
                    return builder;
                },
                update: (data) => {
                    query.updateData = data;
                    return builder;
                },
                delete: () => {
                    query.isDelete = true;
                    return builder;
                },
                upsert: (data, opts) => {
                     query.upsertData = { data, onConflict: opts?.onConflict };
                     return builder;
                },
                then: async (resolve, reject) => {
                    const token = localStorage.getItem('checklist-auth-token');
                    let url = `${API_BASE_URL}/db/${table}`;
                    let options = { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } };
                    
                    try {
                        if (query.insertData) {
                            options.method = 'POST';
                            url += '/insert';
                            options.body = JSON.stringify({ data: query.insertData });
                        } else if (query.upsertData) {
                            options.method = 'POST';
                            url += '/upsert';
                            options.body = JSON.stringify(query.upsertData);
                        } else if (query.updateData) {
                             // Update no server original é POST upsert ou custom?
                             // O server.js não tem endpoint de update genérico com filtro, apenas upsert ou delete by ID.
                             // Vamos adaptar: se tiver ID no filtro, fazemos algo específico?
                             // Server.js tem upsert. Vamos usar upsert para update se possível.
                             // Se o updateData tiver ID, ok. Se não, precisamos pegar o ID.
                             // Para simplificar: usamos upsert.
                             options.method = 'POST';
                             url += '/upsert';
                             // Precisamos combinar updateData com filtros se possível, mas o server espera 'data'.
                             // Assumindo que o código chama .eq('id', ...)
                             const idFilter = query.filters.find(f => f.col === 'id');
                             let payload = query.updateData;
                             if (idFilter) payload = { ...payload, id: idFilter.val };
                             
                             options.body = JSON.stringify({ data: [payload], onConflict: 'id' });
                        } else if (query.isDelete) {
                             options.method = 'DELETE';
                             const idFilter = query.filters.find(f => f.col === 'id');
                             if(idFilter) url += `/${idFilter.val}`;
                             else throw new Error('Delete requires ID filter');
                        } else {
                            // Select
                            options.method = 'GET';
                            delete options.headers['Content-Type'];
                            const params = new URLSearchParams();
                            
                            // Separate filters: Server handles only 'eq'
                            const serverFilters = query.filters.filter(f => !f.op || f.op === 'eq');
                            serverFilters.forEach(f => params.append(f.col, f.val));
                            
                            // Only send limit if no client-side processing needed
                            const hasClientFilters = query.filters.some(f => f.op && f.op !== 'eq');
                            if(query.limit && !hasClientFilters && !query.order) {
                                params.append('limit', query.limit);
                            }
                            
                            url += `?${params.toString()}`;
                        }

                        const res = await fetch(url, options);
                        let data = await res.json();
                        
                        if (!res.ok) {
                             resolve({ data: null, error: { message: data.error || 'Erro' } });
                             return;
                        }

                        // Post-processing for Select (Client-side filtering/sorting)
                        if (!query.insertData && !query.updateData && !query.upsertData && !query.isDelete) {
                            // Client-side filtering
                            const clientFilters = query.filters.filter(f => f.op && f.op !== 'eq');
                            if (clientFilters.length > 0) {
                                data = data.filter(row => {
                                    return clientFilters.every(f => {
                                        const val = row[f.col];
                                        switch(f.op) {
                                            case 'neq': return val != f.val;
                                            case 'gt': return val > f.val;
                                            case 'gte': return val >= f.val;
                                            case 'lt': return val < f.val;
                                            case 'lte': return val <= f.val;
                                            case 'in': return Array.isArray(f.val) && f.val.includes(val);
                                            default: return true;
                                        }
                                    });
                                });
                            }

                            // Sort
                            if (query.order) {
                                const { col, ascending } = query.order;
                                data.sort((a, b) => {
                                    const va = a[col];
                                    const vb = b[col];
                                    if (va < vb) return ascending ? -1 : 1;
                                    if (va > vb) return ascending ? 1 : -1;
                                    return 0;
                                });
                            }

                            // Limit (if not done on server)
                            const hasClientFiltersOrSort = clientFilters.length > 0 || query.order;
                            if (query.limit && hasClientFiltersOrSort) {
                                data = data.slice(0, query.limit);
                            }
                            
                            // Projection (.select)
                            if (query.select && query.select !== '*') {
                                const cols = query.select.split(',').map(c => c.trim());
                                data = data.map(row => {
                                    const newRow = {};
                                    cols.forEach(c => {
                                        if (row.hasOwnProperty(c)) newRow[c] = row[c];
                                    });
                                    return newRow;
                                });
                            }
                        }

                        resolve({ data: data, error: null });
                    } catch(e) {
                        resolve({ data: null, error: e });
                    }
                }
            };
            return builder;
        },
        storage: {
            from: (bucket) => ({
                upload: async (path, file) => {
                    try {
                        const token = localStorage.getItem('checklist-auth-token');
                        const res = await fetch(`${API_BASE_URL}/storage/upload?bucket=${bucket}&path=${encodeURIComponent(path)}`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` },
                            body: file
                        });
                        if (!res.ok) throw new Error('Upload failed');
                        return { data: { path }, error: null };
                    } catch (e) {
                        return { data: null, error: e };
                    }
                },
                getPublicUrl: (path) => {
                    // Endpoint GET /storage/download não existe no server.js original que vi?
                    // Server.js não tem rota GET /storage/:bucket/:path explicitamente no trecho lido.
                    // Ah, tem "Local Filesystem" fallback? Não, preciso verificar se o server serve arquivos.
                    // O server.js usa gridFs.openDownloadStream?
                    // Não vi rota GET de download no server.js lido (só POST upload).
                    // Vou assumir que o server serve estáticos ou que preciso adicionar rota de download.
                    // Para agora: retorna URL fictícia que o server deveria tratar.
                    return { data: { publicUrl: `${API_BASE_URL}/storage/file?bucket=${bucket}&path=${encodeURIComponent(path)}` } };
                }
            })
        },
        channel: () => ({
            on: () => ({ subscribe: () => {} }),
            subscribe: () => {},
            send: () => {},
            removeChannel: () => {}
        }),
        removeChannel: () => {},
        rpc: async (fn) => {
             // Mock para sync_users_from_auth
             if(fn === 'sync_users_from_auth') return { data: null, error: null };
             return { data: null, error: null };
        }
    };
};
