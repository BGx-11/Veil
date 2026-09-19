import Dexie, { Table } from 'dexie';

// A simple encrypted Dexie wrapper
export class SecureDatabase extends Dexie {
  passwords!: Table<any, string>;
  notes!: Table<any, string>;

  private encryptionKey: CryptoKey | null = null;

  constructor() {
    super('VeilSecureVault');
    this.version(1).stores({
      passwords: 'id',
      notes: 'id'
    });
  }

  // Derive an AES-GCM key from a master password or pin
  async unlock(pin: string) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(pin),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    this.encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode('veil-browser-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  get isUnlocked() {
    return this.encryptionKey !== null;
  }

  private async encrypt(data: any): Promise<{ cipher: ArrayBuffer, iv: Uint8Array }> {
    if (!this.encryptionKey) throw new Error("Vault locked");
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const cipher = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as any },
      this.encryptionKey,
      encoded
    );
    return { cipher, iv };
  }

  private async decrypt(cipher: ArrayBuffer, iv: Uint8Array): Promise<any> {
    if (!this.encryptionKey) throw new Error("Vault locked");
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as any },
      this.encryptionKey,
      cipher
    );
    return JSON.parse(new TextDecoder().decode(plain));
  }

  // Secure wrappers for tables
  async addSecure(table: 'passwords' | 'notes', id: string, data: any) {
    const encrypted = await this.encrypt(data);
    await this[table].put({ id, payload: encrypted.cipher, iv: encrypted.iv });
  }

  async getSecure(table: 'passwords' | 'notes', id: string) {
    const record = await this[table].get(id);
    if (!record) return null;
    return this.decrypt(record.payload, record.iv);
  }

  async getAllSecure(table: 'passwords' | 'notes') {
    const records = await this[table].toArray();
    const results = [];
    for (const r of records) {
      try {
        const d = await this.decrypt(r.payload, r.iv);
        results.push({ id: r.id, ...d });
      } catch (e) {
        // Skip decryption failures (wrong key or corrupted)
      }
    }
    return results;
  }
}

export const secureDb = new SecureDatabase();
