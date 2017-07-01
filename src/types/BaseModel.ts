import * as _ from 'lodash';
import * as redis from 'redis';
import * as moment from 'moment';
import {RSet} from './Set';
import {Multi} from 'redis';
import {IRedisType, IRedisComposeType, RedisSchemaType, RedisTtlType, IMultiSaveCallback} from './interfaces';
import {isNullOrUndefined} from './utils';

export interface IBaseModelProps {
  [key: string]: any;
}

export interface IModelOptions {
  ttl?: RedisTtlType;
}

export abstract class BaseModel<T extends IBaseModelProps> implements IRedisComposeType<T> {
  abstract getSchema(): RedisSchemaType;
  private ttl?: RedisTtlType;
  private fieldNameSet: RSet;

  constructor(readonly key: string, options: IModelOptions = {}) {
    this.fieldNameSet = new RSet(key, true);
    this.setTtl(options.ttl);
  }

  protected getFinalSchema(): {[key: string]: IRedisType<any>} {
    const schema = this.getSchema();
    return _.mapValues(schema, (item, fieldName) => {
      return item(this.key, fieldName).setTtl(this.ttl);
    });
  }

  getKey(parentKey: string = ''): string {
    if (parentKey) {
      return this.key.replace(`${parentKey}_`, '');
    }
    return this.key;
  }

  public setTtl(ttl?: RedisTtlType): this {
    this.ttl = ttl;
    this.fieldNameSet.setTtl(ttl);
    return this;
  }

  public multiSave(
    props: T, 
    multi: Multi,
    cb?: IMultiSaveCallback,
  ): Multi {
    const finalSchema = this.getFinalSchema();
    if (!this.validate(props)) {
      throw new TypeError(`Argument to ${this.constructor.name} is invalid.`);
    }

    if (isNullOrUndefined(props)) {
      return multi;
    }

    const fieldNames = new Set(Object.keys(props));
    this.fieldNameSet.multiSave(fieldNames, multi, cb);

    _.forEach(finalSchema,  async (item, key) => {
      item.multiSave(props[key], multi);
    });
    this.multiExpire(props, multi);
    return multi;
  }

  public multiExpire(props: T, multi: Multi): Multi {
    const finalSchema = this.getFinalSchema();
    _.forEach(finalSchema, (item, key) => {
      !isNullOrUndefined(props[key]) && item.multiExpire(props[key], multi);
    });
    const fieldNames = new Set(Object.keys(props));
    this.fieldNameSet.multiExpire(fieldNames, multi);
    return multi;
  }

  public multiDelete(multi: Multi): Multi {
    const finalSchema = this.getFinalSchema();
    _.forEach(finalSchema, (item) => {
      item.multiDelete(multi);
    });
    this.fieldNameSet.multiDelete(multi);
    return multi;
  }

  async genLoad(): Promise<T | null> {
    const finalSchema = this.getFinalSchema();
    const fieldNames = await this.fieldNameSet.genLoad();
    if (!fieldNames) {
      return null;
    }

    const results = await Promise.all(Array.from(fieldNames).map(
      async (fieldName) => {
        const item = finalSchema[fieldName];
        return {
          fieldName,
          value: await item.genLoad(),
        };
      },
    ));
    const model: any = {};
    results.forEach((result) => {
      if (result.value !== null) {
        model[result.fieldName] = result.value;
      }
    });
    return (this.validate(model)) ? model as T : null;
  }

  genIsSet(): Promise<boolean> {
    return new Promise<boolean>((res, rej) => {
      const client = redis.createClient();
      client.exists(this.key, (error, result) => {
        if (error) {
          rej(error);
        } else {
          res(result === 1);
        }
      });
    });
  }

  validate(value: any): boolean {
    const finalSchema = this.getFinalSchema();
    return _.every(finalSchema, (item, key) => {
      return item.validate(value[key]);
    });
  }

  protected static getFinalKey(parentKey: string, dataKey: string) {
    return `${parentKey}_${dataKey}`;
  }
}