import { Checklist, RespostaChecklist, Equipamento, Foto } from '../types/database'

const DB_NAME = 'ChecklistMobileDB'
const DB_VERSION = 4

// Interface kept for documentation
// interface DatabaseSchema { ... }

class OfflineStorage {
  private db: IDBDatabase | null = null
  private async ensure(): Promise<void> { if (!this.db) await this.init() }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const upgradeTx = (event.target as IDBOpenDBRequest).transaction as IDBTransaction

        try {
            // Checklists store
            if (!db.objectStoreNames.contains('checklists')) {
              const checklistStore = db.createObjectStore('checklists', { keyPath: 'id' })
              checklistStore.createIndex('equipamento_id', 'equipamento_id', { unique: false })
              checklistStore.createIndex('status', 'status', { unique: false })
              checklistStore.createIndex('data_prevista', 'data_prevista', { unique: false })
            }

            // Respostas store
            if (!db.objectStoreNames.contains('respostas')) {
              const respostasStore = db.createObjectStore('respostas', { keyPath: 'id' })
              respostasStore.createIndex('checklist_id', 'checklist_id', { unique: false })
              respostasStore.createIndex('usuario_id', 'usuario_id', { unique: false })
              respostasStore.createIndex('sincronizado', 'sincronizado', { unique: false })
            }

            // Equipamentos store
            if (!db.objectStoreNames.contains('equipamentos')) {
              const equipamentosStore = db.createObjectStore('equipamentos', { keyPath: 'id' })
              equipamentosStore.createIndex('codigo', 'codigo', { unique: false })
              equipamentosStore.createIndex('tipo', 'tipo', { unique: false })
              equipamentosStore.createIndex('ativo', 'ativo', { unique: false })
            } else {
              const store = upgradeTx.objectStore('equipamentos')
              try { store.deleteIndex('codigo') } catch {}
              try { store.createIndex('codigo', 'codigo', { unique: false }) } catch {}
            }

            // Fotos store
            if (!db.objectStoreNames.contains('fotos')) {
              const fotosStore = db.createObjectStore('fotos', { keyPath: 'id' })
              fotosStore.createIndex('resposta_id', 'resposta_id', { unique: false })
            }

            // Sync queue store
            if (!db.objectStoreNames.contains('sync_queue')) {
              const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true })
              syncStore.createIndex('table', 'table', { unique: false })
              syncStore.createIndex('synced', 'synced', { unique: false })
              syncStore.createIndex('timestamp', 'timestamp', { unique: false })
            }

            // Inspections cache store
            if (!db.objectStoreNames.contains('inspections_cache')) {
              const inspStore = db.createObjectStore('inspections_cache', { keyPath: 'cache_id', autoIncrement: true })
              inspStore.createIndex('created_at', 'created_at', { unique: false })
            }
        } catch (e) {
            console.error('Error upgrading database:', e)
        }
      }
    })
  }

  async saveChecklist(checklist: Checklist): Promise<void> {
    await this.ensure()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['checklists'], 'readwrite')
      const store = transaction.objectStore('checklists')
      const request = store.put(checklist)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getChecklists(status?: Checklist['status']): Promise<Checklist[]> {
    await this.ensure()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['checklists'], 'readonly')
      const store = transaction.objectStore('checklists')

      let request: IDBRequest<Checklist[]>
      
      if (status) {
        const index = store.index('status')
        request = index.getAll(status)
      } else {
        request = store.getAll()
      }

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async getChecklistById(id: string): Promise<Checklist | undefined> {
    await this.ensure()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['checklists'], 'readonly')
      const store = transaction.objectStore('checklists')
      const request = store.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async deleteChecklist(id: string): Promise<void> {
    await this.ensure()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['checklists'], 'readwrite')
      const store = transaction.objectStore('checklists')
      const request = store.delete(id)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async deleteRespostasByChecklistId(checklist_id: string): Promise<void> {
    await this.ensure()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['respostas'], 'readwrite')
      const store = tx.objectStore('respostas')
      const index = store.index('checklist_id')
      const req = index.openCursor(IDBKeyRange.only(checklist_id))
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null
        if (cursor) {
          store.delete((cursor.value as any).id)
          cursor.continue()
        }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async saveResposta(resposta: RespostaChecklist, skipQueue: boolean = false): Promise<void> {
    await this.ensure()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['respostas'], 'readwrite')
      const store = transaction.objectStore('respostas')
      const request = store.put(resposta)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        // Add to sync queue
        if (!skipQueue) {
          this.addToSyncQueue('create', 'respostas_checklist', resposta)
        }
        resolve()
      }
    })
  }

  async getRespostasPendentes(): Promise<RespostaChecklist[]> {
    await this.ensure()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['respostas'], 'readonly')
      const store = transaction.objectStore('respostas')
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve((request.result || []).filter((r:any) => r.sincronizado === false))
    })
  }

  async deleteResposta(id: string): Promise<void> {
    await this.ensure()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['respostas'], 'readwrite')
      const store = transaction.objectStore('respostas')
      const request = store.delete(id)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getRespostasByChecklistId(checklist_id: string): Promise<RespostaChecklist[]> {
    await this.ensure()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['respostas'], 'readonly')
      const store = transaction.objectStore('respostas')
      const request = store.getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const all = (request.result || []) as RespostaChecklist[]
        resolve(all.filter((r:any) => r.checklist_id === checklist_id))
      }
    })
  }

  async getLatestRespostaByChecklistId(checklist_id: string): Promise<RespostaChecklist | undefined> {
    const list = await this.getRespostasByChecklistId(checklist_id)
    return list.sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  }

  async getRespostasPendentesByChecklistId(checklist_id: string): Promise<RespostaChecklist[]> {
    const list = await this.getRespostasByChecklistId(checklist_id)
    return list.filter((r:any)=> r.sincronizado === false)
  }

  async saveEquipamento(equipamento: Equipamento): Promise<void> {
    await this.ensure()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['equipamentos'], 'readwrite')
      const store = transaction.objectStore('equipamentos')
      const request = store.put(equipamento)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async clearEquipamentos(): Promise<void> {
    await this.ensure()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['equipamentos'], 'readwrite')
      const store = transaction.objectStore('equipamentos')
      const request = store.clear()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async replaceEquipamentos(list: Equipamento[]): Promise<void> {
    await this.ensure()
    await this.clearEquipamentos()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['equipamentos'], 'readwrite')
      const store = tx.objectStore('equipamentos')
      list.forEach((e) => store.put(e))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async getEquipamentos(): Promise<Equipamento[]> {
    await this.ensure()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['equipamentos'], 'readonly')
      const store = transaction.objectStore('equipamentos')
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve((request.result || []).filter((e:any) => e.ativo === true))
    })
  }

  async getEquipamentoById(id: string): Promise<Equipamento | undefined> {
    await this.ensure()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['equipamentos'], 'readonly')
      const store = transaction.objectStore('equipamentos')
      const request = store.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async getEquipamentoByCodigo(codigo: string): Promise<Equipamento | undefined> {
    await this.ensure()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['equipamentos'], 'readonly')
      const store = transaction.objectStore('equipamentos')
      const index = store.index('codigo')
      const request = index.get(codigo)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async saveFoto(foto: Foto): Promise<void> {
    await this.ensure()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['fotos'], 'readwrite')
      const store = transaction.objectStore('fotos')
      const request = store.put(foto)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getFotosByRespostaId(resposta_id: string): Promise<Foto[]> {
    await this.ensure()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['fotos'], 'readonly')
      const store = transaction.objectStore('fotos')
      const index = store.index('resposta_id')
      const request = index.getAll(resposta_id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  private async addToSyncQueue(
    type: 'create' | 'update' | 'delete',
    table: string,
    data: any
  ): Promise<void> {
    await this.ensure()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readwrite')
      const store = transaction.objectStore('sync_queue')
      const request = store.add({
        type,
        table,
        data,
        timestamp: new Date().toISOString(),
        synced: false,
      })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async enqueue(table: string, data: any, type: 'create' | 'update' | 'delete' = 'create'): Promise<void> {
    return this.addToSyncQueue(type, table, data)
  }

  async getSyncQueue(): Promise<any[]> {
    await this.ensure()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readonly')
      const store = transaction.objectStore('sync_queue')
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve((request.result || []).filter((q:any) => q.synced === false))
    })
  }

  async markAsSynced(queueId: number): Promise<void> {
    await this.ensure()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readwrite')
      const store = transaction.objectStore('sync_queue')
      const request = store.get(queueId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const record = request.result
        if (record) {
          record.synced = true
          const updateRequest = store.put(record)
          updateRequest.onerror = () => reject(updateRequest.error)
          updateRequest.onsuccess = () => resolve()
        } else {
          resolve()
        }
      }
    })
  }

  async clearSyncQueue(): Promise<void> {
    await this.ensure()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readwrite')
      const store = transaction.objectStore('sync_queue')
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getStorageUsage(): Promise<{ used: number; quota: number; percentage: number }> {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { used: 0, quota: 0, percentage: 0 }
    }

    const estimate = await navigator.storage.estimate()
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentage: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0,
    }
  }

  async clearOldData(days: number = 30): Promise<void> {
    await this.ensure()

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    const cutoffISO = cutoffDate.toISOString()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['respostas', 'sync_queue'], 'readwrite')
      
      // Clear old respostas
      const respostasStore = transaction.objectStore('respostas')
      const respostasRequest = respostasStore.getAll()
      
      respostasRequest.onsuccess = () => {
        const respostas = respostasRequest.result
        respostas.forEach((resposta) => {
          if (resposta.data_execucao < cutoffISO && resposta.sincronizado) {
            respostasStore.delete(resposta.id)
          }
        })
      }

      // Clear old sync queue entries
      const syncStore = transaction.objectStore('sync_queue')
      const syncRequest = syncStore.getAll()
      
      syncRequest.onsuccess = () => {
        const entries = syncRequest.result
        entries.forEach((entry) => {
          if (entry.timestamp < cutoffISO && entry.synced) {
            syncStore.delete(entry.id)
          }
        })
      }

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async replaceInspectionsCache(list: any[]): Promise<void> {
    await this.ensure()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['inspections_cache'], 'readwrite')
      const store = tx.objectStore('inspections_cache')
      const clearReq = store.clear()
      clearReq.onerror = () => reject(clearReq.error)
      clearReq.onsuccess = () => {
        list.forEach((item) => {
          try { 
              // Clone and remove cache_id if exists to let autoIncrement work or avoid conflicts
              const { cache_id, ...rest } = item
              store.put(rest) 
          } catch {}
        })
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async upsertInspectionCache(item: any): Promise<void> {
    await this.ensure()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['inspections_cache'], 'readwrite')
      const store = tx.objectStore('inspections_cache')
      const getAllReq = store.getAll()
      getAllReq.onerror = () => reject(getAllReq.error)
      getAllReq.onsuccess = () => {
        const existing = (getAllReq.result || []) as any[]
        const toKeep = existing.filter((x:any) => {
          const lid = String(x.local_id || '')
          return lid && lid !== String(item.local_id || '')
        })
        // Clear and reinsert with new first
        const clearReq2 = store.clear()
        clearReq2.onerror = () => reject(clearReq2.error)
        clearReq2.onsuccess = () => {
          try { store.put(item) } catch {}
          toKeep.forEach((x:any) => { try { store.put(x) } catch {} })
        }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async deleteInspectionCache(id: string): Promise<void> {
    await this.ensure()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['inspections_cache'], 'readwrite')
      const store = tx.objectStore('inspections_cache')
      
      // We need to find the key by local_id or id matching our id
      // Since key is autoIncrement, we iterate or use index if we had one on local_id.
      // We don't have index on local_id, but we have on created_at.
      // Let's iterate. It's not efficient but fine for now.
      const req = store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          const val = cursor.value
          if (String(val.local_id || '') === id || String(val.id || '') === id) {
            cursor.delete()
          }
          cursor.continue()
        } else {
          resolve()
        }
      }
      req.onerror = () => reject(req.error)
    })
  }

  async getInspectionsCache(): Promise<any[]> {
    await this.ensure()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['inspections_cache'], 'readonly')
      const store = tx.objectStore('inspections_cache')
      const req = store.getAll()
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        const list = (req.result || []) as any[]
        resolve(list.sort((a,b)=> new Date(b.created_at||0).getTime() - new Date(a.created_at||0).getTime()))
      }
    })
  }
}

export const offlineStorage = new OfflineStorage()
