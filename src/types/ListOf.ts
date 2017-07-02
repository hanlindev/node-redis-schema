import * as _ from 'lodash';
import * as redis from 'redis';
import {Multi} from 'redis';

import {BaseType} from './BaseType';
import {IRedisSchemaItemFactory, ISchemaItemFactory, IRedisType, IMultiSaveCallback} from './interfaces';
import {Shape} from './Shape';

export class ListOf<T> extends BaseType<Array<T>> {
  constructor(
    key: string, 
    readonly isRequired: boolean, 
    readonly shape: ISchemaItemFactory<T>,
  ) {
    super(key, isRequired);
  }

  genLoad(): Promise<Array<T> | null> {
    return new Promise<Array<T> | null>((res, rej) => {
      const client = redis.createClient();
      client.get(this.getKey(), async (error, length) => {
        if (error) {
          rej(error);
        } else {
          const numberLength = parseInt(length);
          if (_.isFinite(numberLength)) {
            const result = await Promise.all(_.range(numberLength).map(
              async (index) => {
                const finalShape = this.shape(this.getKey(), index.toString());
                return await finalShape.genLoad();
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

    if (Array.isArray(value)) {
      multi.del(this.getKey());
      value.forEach((item, i) => {
        const finalShape = this.shape(this.getKey(), i.toString());
        finalShape.multiSave(item, multi);
      });
      multi.set(this.getKey(), value.length.toString());
      this.multiExpire(value, multi);
    }
    return multi;
  }

  multiExpire(value: Array<any>, multi: Multi): Multi {
    if (!this.ttl) {
      return multi;
    }

    super.multiExpire(value, multi);
    Array.isArray(value) && value.forEach((item, i) => {
      const finalShape = this.shape(this.getKey(), i.toString());
      finalShape.setTtl(this.ttl);
      finalShape.multiExpire(item, multi);
    });
    return multi;
  }

  validate(value: any): boolean {
    if (this.isUndefinedValueAndOptional(value)) {
      return true;
    }

    return Array.isArray(value) && value.every((item, i) => {
      const finalShape = this.shape(this.getKey(), i.toString());
      return finalShape.validate(item);
    });
  }

  static getFactory() {
    return <T>(shape: ISchemaItemFactory<T>): IRedisSchemaItemFactory<Array<T>> => {
      const result: any = (parentKey: string, dataKey: string) => {
        return new ListOf<T>(
          BaseType.getFinalKey(parentKey, dataKey), 
          false, 
          shape,
        );
      };
      result.isRequired = (parentKey: string, dataKey: string) => {
        return new ListOf<T>(
          BaseType.getFinalKey(parentKey, dataKey), 
          true, 
          shape,
        );
      };
      return result;
    };
  }
}