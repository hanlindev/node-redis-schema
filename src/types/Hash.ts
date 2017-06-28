import * as _ from 'lodash';
import * as redis from 'redis';
import {BaseType} from './BaseType';

export interface IIndexable {
  [key: string]: string;
}

export class Hash<T extends IIndexable> extends BaseType<T> {
  constructor(readonly key: string) {
    super(key);
  }

  errorMessage(value: any) {
    return (
      'Argument to RedisHash is not an object of string. '
        + `(arg: ${_.toString(value)})`
    );
  }

  multiSave(value: T, multi: redis.Multi): redis.Multi {
    if (!this.validate(value)) {
      throw new TypeError(this.errorMessage(value));
    }

    multi
      .del(this.key)
      .hmset(this.key, value)
    this.multiExpire(value, multi);
    return multi;
  }

  genLoad(): Promise<T> {
    return new Promise<T>((res, rej) => {
      const client = redis.createClient();
      client.hgetall(this.key, (e, result) => {
        if (e) {
          rej(e);
        } else {
          res(result as T);
        }
      });
    });
  }

  validate(value: any): value is {[key: string]: string} {
    const isObject = _.isObjectLike(value) && !Array.isArray(value);
    const allKeysAreString = _.every(value, (value) => {
      return typeof value === 'string';
    });
    return isObject && allKeysAreString;
  }

  static getFactory(parentKey: string, dataKey: string) {
    return new Hash(BaseType.getFinalKey(parentKey, dataKey));
  }
}