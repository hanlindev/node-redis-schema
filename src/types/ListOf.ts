import * as _ from 'lodash';
import * as redis from 'redis';
import {Multi} from 'redis';

import {BaseType} from './BaseType';
import {RedisSchemaItemFactoryType, IRedisType, IMultiSaveCallback} from './interfaces';
import {Shape} from './Shape';

export class ListOf<T> extends BaseType<Array<T>> {
  constructor(key: string, readonly shape: RedisSchemaItemFactoryType<T>) {
    super(key);
  }

  genLoad(): Promise<Array<T> | null> {
    return new Promise<Array<T> | null>((res, rej) => {
      const client = redis.createClient();
      client.get(this.key, async (error, length) => {
        if (error) {
          rej(error);
        } else {
          const numberLength = parseInt(length);
          if (_.isFinite(numberLength)) {
            const result = await Promise.all(_.range(numberLength).map(
              async (index) => {
                const finalShape = this.shape(this.key, index.toString());
                return await finalShape.genLoad()
              }
            ));
            if (this.validate(result)) {
              res(result as Array<T>);
            } else {
              res(null);
            }
          } else {
            res(null);
          }
        }
      });
    });
  }

  multiSave(
    value: Array<any>, 
    multi: Multi,
    cb?: IMultiSaveCallback,
  ): Multi {
    if (!this.validate(value)) {
      throw new TypeError('Argument to RedisListOf is of incorrect type.');
    }

    multi.del(this.key);
    value.forEach((item, i) => {
      const finalShape = this.shape(this.key, i.toString());
      finalShape.multiSave(item, multi);
    });
    multi.set(this.key, value.length.toString());
    return this.multiExpire(value, multi);
  }

  multiExpire(value: Array<any>, multi: Multi): Multi {
    if (!this.ttl) {
      return multi;
    }

    super.multiExpire(value, multi);
    value.forEach((item, i) => {
      const finalShape = this.shape(this.key, i.toString());
      finalShape.setTtl(this.ttl);
      finalShape.multiExpire(item, multi);
    })
    return multi;
  }

  validate(value: any): boolean {
    return Array.isArray(value) && value.every((item, i) => {
      const finalShape = this.shape(this.key, i.toString());
      return finalShape.validate(item);
    });
  }

  static getFactory<T>(shape: RedisSchemaItemFactoryType<T>) {
    return (parentKey: string, dataKey: string) => {
      return new ListOf<T>(BaseType.getFinalKey(parentKey, dataKey), shape);
    };
  }
}