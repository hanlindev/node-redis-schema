import * as _ from 'lodash';
import * as redis from 'redis';
import {BaseType} from './BaseType';
import {IRedisSchemaItemFactory, IMultiSaveCallback} from './interfaces';

export interface IIndexable {
  [key: string]: string;
}

export class Hash<T extends IIndexable> extends BaseType<T> {
  errorMessage(value: any) {
    return (
      'Argument to RedisHash is not an object of string. '
        + `(arg: ${_.toString(value)})`
    );
  }

  multiSave(
    value: T, 
    multi: redis.Multi,
    cb?: IMultiSaveCallback,
  ): redis.Multi {
    if (!this.validate(value)) {
      throw new TypeError(this.errorMessage(value));
    }

    this.multiDelete(multi);
    if (value) {
      multi.hmset(this.key, value, (error) => {
        if (!error && cb) {
          cb(this.getKey());
        }
      });
      this.multiExpire(value, multi);
    }
    return multi;
  }

  genLoad(): Promise<T | null> {
    return new Promise<T | null>((res, rej) => {
      const client = redis.createClient();
      client.hgetall(this.key, (e, result) => {
        if (e) {
          rej(e);
        } else {
          res(result as any);
        }
      });
    });
  }

  validate(value: any): boolean {
    if (this.isUndefinedValueAndOptional(value)) {
      return true;
    }

    const isObject = _.isObjectLike(value) && !Array.isArray(value);
    const allKeysAreString = _.every(value, (value) => {
      return typeof value === 'string';
    });
    return isObject && allKeysAreString;
  }

  static getFactory<T>(): IRedisSchemaItemFactory<T>  {
    const result: any = (parentKey: string, dataKey: string) => {
      return new Hash(BaseType.getFinalKey(parentKey,dataKey), false);
    };
    result.isRequired = (parentKey: string, dataKey: string) => {
      return new Hash(BaseType.getFinalKey(parentKey, dataKey), true);
    };
    return result;
  }
}