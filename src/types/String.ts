import * as redis from 'redis';
import {BaseType} from './BaseType';
import {IMultiSaveCallback} from './interfaces';

export class String extends BaseType<string> {
  constructor(readonly key: string) {
    super(key);
  }

  getCallback<T>(resolve: (data: T) => any, reject: Function) {
    return (error: Error | null, res: T) => {
      if (error) {
        reject(error);
      } else {
        resolve(res);
      }
    };
  }

  private errorMessage(value: string) {
    return `Argument to RedisString is not a string. (arg: ${value})`;
  }

  multiSave(
    value: string, 
    multi: redis.Multi,
    cb?: IMultiSaveCallback,
  ): redis.Multi {
    if (!this.validate(value)) {
      throw new TypeError(this.errorMessage(value));
    }
    multi.set(this.key, value, (error) => {
      if (!error) {
        cb && cb(this.key);
      }
    });
    this.multiExpire(value, multi);
    return multi;
  }

  genLoad(): Promise<string | null> {
    return new Promise<string | null>((resolve, reject) => {
      const client = redis.createClient();
      client.get(this.key, this.getCallback<string>(resolve, reject));
    });
  }

  validate(value: string): value is string {
    return typeof value === 'string';
  }

  static getFactory(parentKey: string, dataKey: string) {
    return new String(`${parentKey}_${dataKey}`);
  }
}