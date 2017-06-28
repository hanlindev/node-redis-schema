import * as _ from 'lodash';
import * as redis from 'redis';
import {BaseType} from './BaseType';
import {IMultiSaveCallback} from './interfaces';

export class List extends BaseType<Array<string>> {
  constructor(readonly key: string) {
    super(key);
  }

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
    multi
      .del(this.key)
      .rpush(this.key, value, (error, response) => {
        if (response) {
          cb && cb(this.getKey());
        }
      });
    this.multiExpire(value, multi);
    return multi;
  }

  genLoad(): Promise<Array<string>> {
    return new Promise<Array<string>>((res, rej) => {
      const client = redis.createClient();
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
    });
  }

  validate(value: Array<string>): value is Array<string> {
    return (
      Array.isArray(value) 
        && value.every((item) => typeof item === 'string')
    );
  }

  static getFactory(parentKey: string, dataKey: string) {
    return new List(BaseType.getFinalKey(parentKey, dataKey));
  }
}