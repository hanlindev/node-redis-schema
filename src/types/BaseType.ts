import * as redis from 'redis';
import {Multi} from 'redis';
import {IRedisType, RedisTtlType} from './interfaces';
import {expireImpl} from './utils';

export abstract class BaseType<TLoad> implements IRedisType<TLoad> {
  protected ttl?: RedisTtlType;

  constructor(readonly key: string, readonly isRequired: boolean) {}
  abstract genLoad(): Promise<TLoad>;
  // You should call this.multiExpire in multiSave to persist the expire.
  abstract multiSave(value: TLoad, multi: Multi): Multi;
  abstract validate(value: TLoad): boolean;

  protected isUndefinedValueAndOptional(value: any): boolean {
    return !this.isRequired && (value === null || value === undefined);
  }

  setTtl(ttl?: RedisTtlType): this {
    this.ttl = ttl;
    return this;
  }

  getKey(parentKey: string = ''): string {
    if (parentKey) {
      return this.key.replace(`${parentKey}_`, '');
    }
    return this.key;
  }

  multiExpire(value: TLoad, multi: Multi): Multi {
    return expireImpl(multi, this.getKey(), this.ttl);
  }

  multiDelete(multi: Multi): Multi {
    return multi.del(this.key);
  }

  genIsSet(): Promise<boolean> {
    return new Promise<boolean>((res, rej) => {
      const client = redis.createClient();
      client.exists(this.key, (error, result) => {
        if (error) {
          rej(error);
        } else {
          res(result === 1);
        }
      });
    });
  }

  protected static getFinalKey(parentKey: string, dataKey: string): string {
    return `${parentKey}_${dataKey}`;
  }
}