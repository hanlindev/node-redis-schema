import * as _ from 'lodash';
import * as redis from 'redis';
import {BaseType} from './BaseType';
import {IMultiSaveCallback, IRedisSchemaItemFactory} from './interfaces';

export class List extends BaseType<Array<string>> {
  private errorMessage(value: any) {
    return (
      'Argument to RedisList is not ' 
        + `array of string. (arg: ${_.toString(value)})`
    );
  }

  multiSave(
    value: Array<string>, 
    multi: redis.Multi,
    cb?: IMultiSaveCallback,
  ): redis.Multi {
    if (!this.validate(value)) {
      throw new TypeError(this.errorMessage(value));
    }

    this.multiDelete(multi);
    if (Array.isArray(value)) {
      multi.rpush(this.key, value, (error, response) => {
        if (response) {
          cb && cb(this.getKey());
        }
      });
      this.multiExpire(value, multi);
    }
    return multi;
  }

  genLoad(): Promise<Array<string> | null> {
    return new Promise<Array<string> | null>(async (res, rej) => {
      const client = redis.createClient();
      const isSet = await this.genIsSet();
      if (isSet) {
        client.llen(this.key, (e, count) => {
          if (e) {
            rej(e);
          } else {
            client.lrange(this.key, 0, count - 1, (e, list) => {
              if (e) {
                rej(e);
              } else {
                res(list);
              }
            });
          }
        });
      } else {
        res(null);
      }
    });
  }

  validate(value: Array<string>): boolean {
    if (this.isUndefinedValueAndOptional(value)) {
      return true;
    }

    return (
      Array.isArray(value) 
        && value.every((item) => typeof item === 'string')
    );
  }

  static getFactory(): IRedisSchemaItemFactory<Array<string>> {
    const result: any = (parentKey: string, dataKey: string) => {
      return new List(BaseType.getFinalKey(parentKey, dataKey), false);
    };
    result.isRequired = (parentKey: string, dataKey: string) => {
      return new List(BaseType.getFinalKey(parentKey, dataKey), true);
    };
    return result;
  }
}