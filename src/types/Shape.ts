import {BaseModel} from './BaseModel';
import {IRedisComposeType, IRedisType, RedisSchemaType, IRedisSchemaItemFactory} from './interfaces';

export class Shape extends BaseModel<any> {
  private constructor(
    key: string, 
    readonly isRequired: boolean,
    readonly shape: RedisSchemaType,
  ) {
    super(key);
  }

  getSchema() {
    return this.shape;
  }

  validate(value: any): boolean {
    if (!this.isRequired && (value === null || value === undefined)) {
      return true;
    }

    return super.validate(value);
  }

  public static getFactory() {
    return (shape: RedisSchemaType): IRedisSchemaItemFactory<any> => {
      const result: any = (parentKey: string, dataKey: string) => {
        return new Shape(BaseModel.getFinalKey(parentKey, dataKey), false, shape);
      };
      result.isRequired = (parentKey: string, dataKey: string) => {
        return new Shape(BaseModel.getFinalKey(parentKey, dataKey), true, shape);
      };
      return result;
    };
  }
}