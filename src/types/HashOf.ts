import * as _ from 'lodash';
import {Multi} from 'redis';
import {BaseType} from './BaseType';
import {RSet} from './Set';
import {IRedisSchemaItemFactory, RedisSchemaType, ISchemaItemFactory, RedisTtlType, IMultiSaveCallback} from './interfaces';

export interface IHashOf<T> {
  [fieldName: string]: T;
}

export class HashOf<T> extends BaseType<IHashOf<T>> {
  private fieldNameSet: RSet;
  constructor(
    key: string,
    readonly isRequired: boolean,
    readonly type: ISchemaItemFactory<T>,
  ) {
    super(key, isRequired);
    this.fieldNameSet = new RSet(key, true);
  }

  setTtl(ttl?: RedisTtlType): this {
    super.setTtl(ttl);
    this.fieldNameSet.setTtl(ttl);
    return this;
  }

  private getFieldKeyPrefix(): string {
    return this.getKey() + '_field';
  }

  multiSave(
    value: any,
    multi: Multi,
    cb?: IMultiSaveCallback,
  ): Multi {
    if (!this.validate(value)) {
      throw new TypeError('Argument to HashOf is of incorrect type');
    }

    this.fieldNameSet.multiDelete(multi);
    if (value) {
      _.forEach(value, (fieldValue, fieldName: string) => {
        const finalType = this.type(this.getFieldKeyPrefix(), fieldName);
        finalType.multiSave(fieldValue, multi);
      });
      this.fieldNameSet.multiSave(new Set(Object.keys(value)), multi, cb);
      this.multiExpire(value, multi);
    }

    return multi;
  }

  multiExpire(value: any, multi: Multi): Multi {
    _.forEach(value, (fieldValue, fieldName: string) => {
      const finalType = this.type(this.getFieldKeyPrefix(), fieldName);
      finalType.multiExpire(fieldValue, multi);
    });
    return this.fieldNameSet.multiExpire(new Set(Object.keys(value)), multi);
  }

  multiDelete(multi: Multi): Multi {
    return this.fieldNameSet.multiDelete(multi);
  }

  async genLoad(): Promise<IHashOf<T> | null> {
    const fieldNames = await this.fieldNameSet.genLoad();
    if (!fieldNames) {
      return null;
    }

    const results = await Promise.all(Array.from(fieldNames).map(
      async (fieldName) => {
        const finalType = this.type(this.getFieldKeyPrefix(), fieldName);
        return {
          fieldName,
          value: await finalType.genLoad(),
        };
      },
    ));
    const model: any = {};
    results.forEach((result) => {
      if (result.value !== null) {
        model[result.fieldName] = result.value;
      }
    });
    return this.validate(model) ? model as IHashOf<T> : null;
  }

  async genIsSet(): Promise<boolean> {
    return await this.fieldNameSet.genIsSet();
  }

  validate(value: any): boolean {
    if (this.isUndefinedValueAndOptional(value)) {
      return true;
    }

    const isObject = _.isObjectLike(value) && !Array.isArray(value);
    return isObject && _.every(value, (fieldValue, fieldName: string) => {
      const finalType = this.type(this.getFieldKeyPrefix(), fieldName);
      return finalType.validate(fieldValue as T);
    });
  }

  static getFactory() {
    return <T>(
      type: ISchemaItemFactory<T>
    ): IRedisSchemaItemFactory<IHashOf<T>> => {
      const result: any = (parentKey: string, dataKey: string) => {
        return new HashOf<T>(
          BaseType.getFinalKey(parentKey, dataKey),
          false,
          type,
        );
      };
      result.isRequired = (parentKey: string, dataKey: string) => {
        return new HashOf<T>(
          BaseType.getFinalKey(parentKey, dataKey),
          true,
          type,
        );
      };
      return result;
    };
  }
}