import * as _ from 'lodash';
import * as redis from 'redis';
import {BaseType} from './BaseType';
import {IMultiSaveCallback, IRedisSchemaItemFactory} from './interfaces';

export class RSet extends BaseType<Set<string>> {
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
      multi.sadd(this.key, Array.from(value), (error) => {
        if (!error) {
          cb && cb(this.key);
        }
      });
      this.multiExpire(value, multi);
    }
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
      const exists = await this.genIsSet();
      if (!exists) {
        res(null);
      }

      client.smembers(this.key, (error, result) => {
        if (error) {
          rej(error);
        } else {
          res(new Set(result));
        }
      });
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