import * as redis from 'redis';
import {Callback} from 'redis';

export type RedisTtlType =
{
  type: 'expire',
  value: number,
}
| {
  type: 'expireAt',
  value: number,
};

export interface IMultiSaveCallback {
  (newKey: string): any;
}

export interface IRedisType<TLoad> {
  // If parentKey is given, the return value will strip away the
  // parent key.
  getKey(parentKey?: string): string;
  multiSave(
    value: TLoad, 
    multi: redis.Multi, 
    cb?: IMultiSaveCallback,
  ): redis.Multi;
  multiExpire(value: TLoad, multi: redis.Multi): redis.Multi;
  genLoad(): Promise<TLoad | null>;
  multiDelete(multi: redis.Multi): redis.Multi;
  genIsSet(): Promise<boolean>;
  validate(value: TLoad): boolean;
  setTtl(ttl?: RedisTtlType): this;
}

export interface ISchemaItemFactory<TP> {
  (parentKey: string, dataKey: string): IRedisType<TP>;
}

export interface IRedisSchemaItemFactory<TP> extends ISchemaItemFactory<TP> {
  isRequired: (parentKey: string, dataKey: string) => IRedisType<TP>;
}

export type RedisSchemaType = {
  [key: string]: ISchemaItemFactory<any>;
}

export interface IRedisComposeType<T> extends IRedisType<T> {
  getSchema(): RedisSchemaType;
}

export interface IModelFactory<T> {
  new (...args: Array<any>): IRedisComposeType<T>;
  name: string;
  getInstance(overrideKey?: string): IRedisComposeType<T>;
}