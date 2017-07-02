import * as _ from 'lodash';
import * as redis from 'redis';
import {Multi} from 'redis';
import {BaseType} from './BaseType';
import {Number} from './Number';
import {IMultiSaveCallback, IRedisSchemaItemFactory, RedisTtlType} from './interfaces';

export class List extends BaseType<Array<string>> {
  private length: Number;
  private errorMessage(value: any) {
    return (
      'Argument to RedisList is not ' 
        + `array of string. (arg: ${_.toString(value)})`
    );
  }

  constructor(
    key: string,
    isRequired: boolean
  ) {
    super(key, isRequired);
    this.length = new Number(
      BaseType.getFinalKey(this.getKey(), 'length'), 
      true,
    );
  }

  setTtl(ttl: RedisTtlType): this {
    super.setTtl(ttl);
    this.length.setTtl(ttl);
    return this;
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
      if (value.length > 0) {
        multi.rpush(this.key, value, (error, response) => {
          if (response) {
            cb && cb(this.getKey());
          }
        });
      }
      this.length.multiSave(value.length, multi);
      this.multiExpire(value, multi);
    }
    return multi;
  }

  multiExpire(value: Array<string>, multi: Multi): Multi {
    super.multiExpire(value, multi);
    return this.length.multiExpire(value.length, multi);
  }

  multiDelete(multi: Multi): Multi {
    super.multiDelete(multi);
    return this.length.multiDelete(multi);
  }

  genLoad(): Promise<Array<string> | null> {
    return new Promise<Array<string> | null>(async (res, rej) => {
      const client = redis.createClient();
      const length = await this.length.genLoad();
      if (_.isFinite(length) && length !== null) {
        if (length > 0) {
          client.lrange(this.key, 0, length - 1, (e, list) => {
            if (e) {
              rej(e);
            } else {
              res(list);
            }
          });
        } else {
          res([]);
        }
      } else {
        res(null);
      }
    });
  }

  async genIsSet(): Promise<boolean> {
    return await this.length.genIsSet();
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