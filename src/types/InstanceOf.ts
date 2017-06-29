import * as redis from 'redis';
import {Multi} from 'redis';
import {BaseType} from './BaseType';
import {BaseModel} from './BaseModel';
import {RedisTtlType, IRedisComposeType, ISchemaItemFactory, IModelFactory, IRedisSchemaItemFactory} from './interfaces';

export class InstanceOf<TP> extends BaseType<TP> {
  private instance: IRedisComposeType<TP>;
  constructor(
    key: string,
    isRequired: boolean,
    type: IModelFactory<TP>,
  ) {
    super(key, isRequired);
    this.instance = type.getInstance(BaseType.getFinalKey(this.key, `${type.name}Instance`));
  }

  setTtl(ttl?: RedisTtlType) {
    // This type doesn't persist any data, pass the ttl to the actual type.
    this.instance.setTtl(ttl);
    return this;
  }

  multiSave(value: any, multi: Multi): Multi {
    if (!this.validate(value)) {
      throw new TypeError('Invalid argument passed to InstanceOf type');
    }

    return this.instance.multiSave(value, multi);
  }
  
  multiDelete(multi: Multi): Multi {
    return this.instance.multiDelete(multi);
  }

  validate(value: any): boolean {
    if (this.isUndefinedValueAndOptional(value)) {
      return true;
    }

    return this.instance.validate(value);
  }

  async genLoad(): Promise<TP | null> {
    return await this.instance.genLoad();
  }

  static getFactory() {
    return <TP>(type: IModelFactory<TP>): IRedisSchemaItemFactory<TP> => {
      const result: any = (parentKey: string, dataKey: string) => {
        return new InstanceOf(
          BaseType.getFinalKey(parentKey, dataKey), 
          false, 
          type,
        );
      };
      result.isRequired = (parentKey: string, dataKey: string) => {
        return new InstanceOf(
          BaseType.getFinalKey(parentKey, dataKey), 
          true, 
          type,
        );
      };
      return result;
    };
  }
}