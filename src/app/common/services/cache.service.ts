import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

export type StorageType = 'local' | 'session';

interface CacheEntry<T> {
  value: T;
}

// Reads and writes JSON values in the browser's local or session storage.
@Injectable({ providedIn: 'root' })
export class CacheService {
  private readonly platformId = inject(PLATFORM_ID);

  get<T>(key: string, storageType: StorageType = 'local'): T | null {
    const storage = this.getStorage(storageType);
    const raw = storage?.getItem(key);
    if (!raw) {
      return null;
    }
    try {
      return (JSON.parse(raw) as CacheEntry<T>).value;
    } catch {
      this.remove(key, storageType);
      return null;
    }
  }

  set<T>(key: string, value: T, storageType: StorageType = 'local'): void {
    const entry: CacheEntry<T> = { value };
    try {
      this.getStorage(storageType)?.setItem(key, JSON.stringify(entry));
    } catch {
      // Storage can be full or blocked (private mode); the app keeps working without it.
    }
  }

  remove(key: string, storageType: StorageType = 'local'): void {
    this.getStorage(storageType)?.removeItem(key);
  }

  private getStorage(storageType: StorageType): Storage | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return storageType === 'local' ? localStorage : sessionStorage;
  }
}
