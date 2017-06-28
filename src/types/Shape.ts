import {BaseModel} from './BaseModel';
import {IRedisComposeType, IRedisType, RedisSchemaType} from './interfaces';

export class Shape<T> extends BaseModel<T> {
  private constructor(
    key: string, 
    readonly shape: RedisSchemaType,
  ) {
    super(key);
  }

  getSchema() {
    return this.shape;
  }

  public static getFactory(shape: RedisSchemaType) {
    return (parentKey: string, dataKey: string) => {
      return new Shape(BaseModel.getFinalKey(parentKey, dataKey), shape);
    }
  }
}