import * as redis from 'redis';
import {BaseType} from './BaseType';
import {IMultiSaveCallback, IRedisSchemaItemFactory} from './interfaces';

export class String extends BaseType<string> {
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

    if (this.shouldSave(value)) {
      multi.set(this.key, value, (error) => {
        if (!error) {
          cb && cb(this.key);
        }
      });
      this.multiExpire(value, multi);
    }
    return multi;
  }

  genLoad(): Promise<string | null> {
    return new Promise<string | null>((resolve, reject) => {
      const client = redis.createClient();
      client.get(this.key, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  validate(value: string): boolean {
    if (this.isUndefinedValueAndOptional(value)) {
      return true;
    }
    return typeof value === 'string';
  }

  shouldSave(value: any): boolean {
    return typeof value === 'string';
  }

  static getFactory(): IRedisSchemaItemFactory<string> {
    const result: any = (parentKey: string, dataKey: string) => {
      return new String(BaseType.getFinalKey(parentKey, dataKey), false);
    };
    result.isRequired = (parentKey: string, dataKey: string) => {
      return new String(BaseType.getFinalKey(parentKey, dataKey), true);
    };
    return result;
  }
}