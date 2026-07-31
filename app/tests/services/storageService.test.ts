// Test storage service logic — validates the key-value storage abstraction.
// In a real app this would wrap AsyncStorage; here we test the pure logic.

interface StorageAdapter {
  store: Map<string, string>;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  getAllKeys(): string[];
}

function createMemoryStorage(): StorageAdapter {
  const store = new Map<string, string>();
  return {
    store,
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    clear(): void {
      store.clear();
    },
    getAllKeys(): string[] {
      return Array.from(store.keys());
    },
  };
}

function createTypedStorage<T>(adapter: StorageAdapter, prefix: string) {
  return {
    get(key: string): T | null {
      const raw = adapter.getItem(`${prefix}:${key}`);
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    set(key: string, value: T): void {
      adapter.setItem(`${prefix}:${key}`, JSON.stringify(value));
    },
    remove(key: string): void {
      adapter.removeItem(`${prefix}:${key}`);
    },
    getAll(): Record<string, T> {
      const result: Record<string, T> = {};
      const prefixStr = `${prefix}:`;
      for (const fullKey of adapter.getAllKeys()) {
        if (fullKey.startsWith(prefixStr)) {
          const key = fullKey.slice(prefixStr.length);
          const raw = adapter.getItem(fullKey);
          if (raw !== null) {
            try {
              result[key] = JSON.parse(raw) as T;
            } catch {
              // skip malformed entries
            }
          }
        }
      }
      return result;
    },
  };
}

describe('Storage Service', () => {
  let storage: StorageAdapter;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  describe('MemoryStorage', () => {
    it('should store and retrieve values', () => {
      storage.setItem('key1', 'value1');
      expect(storage.getItem('key1')).toBe('value1');
    });

    it('should return null for missing keys', () => {
      expect(storage.getItem('missing')).toBeNull();
    });

    it('should overwrite existing values', () => {
      storage.setItem('key', 'old');
      storage.setItem('key', 'new');
      expect(storage.getItem('key')).toBe('new');
    });

    it('should remove items', () => {
      storage.setItem('key', 'val');
      storage.removeItem('key');
      expect(storage.getItem('key')).toBeNull();
    });

    it('should clear all items', () => {
      storage.setItem('a', '1');
      storage.setItem('b', '2');
      storage.clear();
      expect(storage.getAllKeys()).toHaveLength(0);
    });

    it('should list all keys', () => {
      storage.setItem('x', '1');
      storage.setItem('y', '2');
      const keys = storage.getAllKeys();
      expect(keys).toHaveLength(2);
      expect(keys).toContain('x');
      expect(keys).toContain('y');
    });
  });

  describe('TypedStorage', () => {
    interface TestData {
      name: string;
      count: number;
    }

    let typed: ReturnType<typeof createTypedStorage<TestData>>;

    beforeEach(() => {
      typed = createTypedStorage<TestData>(storage, 'test');
    });

    it('should store and retrieve typed objects', () => {
      typed.set('item1', { name: 'Foo', count: 42 });
      const result = typed.get('item1');
      expect(result).toEqual({ name: 'Foo', count: 42 });
    });

    it('should return null for missing keys', () => {
      expect(typed.get('nope')).toBeNull();
    });

    it('should remove typed items', () => {
      typed.set('a', { name: 'A', count: 1 });
      typed.remove('a');
      expect(typed.get('a')).toBeNull();
    });

    it('should return all items with given prefix', () => {
      typed.set('x', { name: 'X', count: 10 });
      typed.set('y', { name: 'Y', count: 20 });
      const all = typed.getAll();
      expect(Object.keys(all)).toHaveLength(2);
      expect(all.x).toEqual({ name: 'X', count: 10 });
      expect(all.y).toEqual({ name: 'Y', count: 20 });
    });

    it('should not leak across prefixes', () => {
      const other = createTypedStorage<{ val: number }>(storage, 'other');
      typed.set('key', { name: 'A', count: 1 });
      other.set('key', { val: 99 });

      expect(typed.get('key')).toEqual({ name: 'A', count: 1 });
      expect(other.get('key')).toEqual({ val: 99 });
    });

    it('should handle malformed JSON gracefully', () => {
      storage.setItem('test:broken', '{bad json');
      expect(typed.get('broken')).toBeNull();
    });
  });
});
