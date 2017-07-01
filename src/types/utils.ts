import {Multi} from 'redis';
import {RedisTtlType} from './interfaces';

export function isNullOrUndefined(value: any) {
  return value === null || value === undefined;
}

export function expireImpl(multi: Multi, key: string, ttl?: RedisTtlType): Multi {
  if (ttl) {
    switch (ttl.type) {
      case 'expire':
        multi.expire(key, ttl.value);
        break;
      case 'expireAt':
        multi.expireat(key, ttl.value);
        break;
    }
  }
  return multi;
}