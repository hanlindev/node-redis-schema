import * as _ from 'lodash';
import * as redis from 'redis';
import {BaseType} from './BaseType';
import {IMultiSaveCallback} from './interfaces';

export class RSet extends BaseType<Set<string>> {
  multiSave(
    value: Set<string>, 
    multi: redis.Multi,
    cb?: IMultiSaveCallback,
  ): redis.Multi {
    if (!this.validate(value)) {
      throw new TypeError('Argument to RedisSet is not a set of string');
    }
    this
      .multiDelete(multi)
      .sadd(this.key, Array.from(value), (error) => {
        if (!error) {
          cb && cb(this.key);
        }
      });
    this.multiExpire(value, multi);
    return multi;
  }

  validate(value: any): value is Set<string> {
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

  static getFactory(parentKey: string, dataKey: string) {
    return new RSet(BaseType.getFinalKey(parentKey, dataKey));
  }
}