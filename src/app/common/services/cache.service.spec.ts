import { TestBed } from '@angular/core/testing';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = TestBed.inject(CacheService);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stores and reads values in the chosen storage', () => {
    cache.set('token', 'abc', 'session');
    expect(cache.get('token', 'session')).toBe('abc');
    expect(cache.get('token', 'local')).toBeNull();
  });

  it('removes values', () => {
    cache.set('token', 'abc', 'session');
    cache.remove('token', 'session');
    expect(cache.get('token', 'session')).toBeNull();
  });

  it('drops an entry it cannot read', () => {
    sessionStorage.setItem('token', 'not json');
    expect(cache.get('token', 'session')).toBeNull();
    expect(sessionStorage.getItem('token')).toBeNull();
  });
});
