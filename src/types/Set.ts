import * as _ from 'lodash';
import * as redis from 'redis';
import {Multi} from 'redis';
import {BaseType} from './BaseType';
import {Number} from './Number';
import {IMultiSaveCallback, IRedisSchemaItemFactory, RedisTtlType} from './interfaces';

export class RSet extends BaseType<Set<string>> {
  private size: Number;

  constructor(
    key: string,
    isRequired: boolean,
  ) {
    super(key, isRequired);
    this.size = new Number(BaseType.getFinalKey(key, 'size'), true);
  }

  setTtl(ttl?: RedisTtlType): this {
    super.setTtl(ttl);
    this.size.setTtl(ttl);
    return this;
  }

  multiSave(
    value: Set<string>, 
    multi: redis.Multi,
    cb?: IMultiSaveCallback,
  ): redis.Multi {
    if (!this.validate(value)) {
      throw new TypeError('Argument to RedisSet is not a set of string');
    }

    this.multiDelete(multi);
    if (value) {
      value.size > 0 && multi.sadd(this.key, Array.from(value), (error) => {
        if (!error) {
          cb && cb(this.key);
        }
      });
      this.size.multiSave(value.size, multi);
      this.multiExpire(value, multi);
    }
    return multi;
  }

  multiExpire(value: any, multi: Multi): Multi {
    super.multiExpire(value, multi);
    this.size.multiExpire(_.size(value), multi);
    return multi;
  }

  validate(value: any): boolean {
    if (this.isUndefinedValueAndOptional(value)) {
      return true;
    }

    if (value instanceof Set) {
      return Array.from(value).every((item) => {
        return typeof item === 'string';
      });
    }
    return false;
  }

  genLoad(): Promise<Set<string> | null> {
    return new Promise<Set<string> | null>(async (res, rej) => {
      const client = redis.createClient();
      const size = await this.size.genLoad();
      if (size === null) {
        res(null);
      }

      if (size === 0) {
        return res(new Set());
      } else {
        client.smembers(this.key, (error, result) => {
          if (error) {
            rej(error);
          } else {
            res(new Set(result));
          }
        });
      }
    });
  }

  static getFactory(): IRedisSchemaItemFactory<Set<string>> {
    const result: any = (parentKey: string, dataKey: string) => {
      return new RSet(BaseType.getFinalKey(parentKey, dataKey), false);
    };
    result.isRequired = (parentKey: string, dataKey: string) => {
      return new RSet(BaseType.getFinalKey(parentKey, dataKey), false);
    };
    return result;
  }
}