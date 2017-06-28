import * as _ from 'lodash';
import {Multi} from 'redis';
import * as redis from 'redis';
import {BaseType} from './BaseType';
import {IMultiSaveCallback} from './interfaces';

export class Number extends BaseType<number> {
  multiSave(
    value: number, 
    multi: Multi,
    cb?: IMultiSaveCallback,
  ): Multi {
    multi.set(this.key, value.toString(), (error, response) => {
      if (!error) {
        cb && cb(this.key);
      }
    });
    this.multiExpire(value, multi);
    return multi;
  }

  genLoad(): Promise<number> {
    return new Promise<number>((res, rej) => {
      const client = redis.createClient();
      client.get(this.key, (error, response) => {
        if (error) {
          rej(error);
        } else {
          res(_.toNumber(response));
        }
        client.quit();
      });
    });
  }

  validate(value: any): value is number {
    return _.isFinite(value);
  }

  static getFactory(parentKey: string, dataKey: string) {
    return new Number(BaseType.getFinalKey(parentKey, dataKey));
  }
}