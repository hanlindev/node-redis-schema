import * as _ from 'lodash';
import {Multi} from 'redis';
import * as redis from 'redis';
import {BaseType} from './BaseType';
import {IMultiSaveCallback, IRedisSchemaItemFactory} from './interfaces';

export class Number extends BaseType<number> {
  multiSave(
    value: number, 
    multi: Multi,
    cb?: IMultiSaveCallback,
  ): Multi {
    if (!this.validate(value)) {
      throw new TypeError('Invalid argument passed to Number type');
    }

    if (_.isFinite(value)) {
      multi.set(this.key, value.toString(), (error, response) => {
        if (!error) {
          cb && cb(this.key);
        }
      });
      this.multiExpire(value, multi);
    }
    return multi;
  }

  genLoad(): Promise<number | null> {
    return new Promise<number | null>((res, rej) => {
      const client = redis.createClient();
      client.get(this.key, (error, response) => {
        if (error) {
          rej(error);
        } else {
          res(response === null ? null : _.toNumber(response));
        }
        client.quit();
      });
    });
  }

  validate(value: any): boolean {
    if (this.isUndefinedValueAndOptional(value)) {
      return true;
    }

    return _.isFinite(value);
  }

  static getFactory(): IRedisSchemaItemFactory<number> {
    const result: any = (parentKey: string, dataKey: string) => {
      return new Number(BaseType.getFinalKey(parentKey, dataKey), false);
    };
    result.isRequired = (parentKey: string, dataKey: string) => {
      return new Number(BaseType.getFinalKey(parentKey, dataKey), true);
    };
    return result;
  }
}