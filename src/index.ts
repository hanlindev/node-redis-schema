import * as redis from 'redis';
import {Multi} from 'redis';
import {IRedisComposeType, IModelFactory} from './types';

export * from './types';

export class Redis<T> {
  private model: IRedisComposeType<T>;
  constructor(readonly clazz: IModelFactory<T>) {
    this.model = clazz.getInstance();
  }

  async genSaveModel(props: T): Promise<'OK'> {
    try {
      const client = redis.createClient();
      let multi = client.multi();
      this.model.multiSave(props, multi);
      await this.execMulti(multi);
      client.quit();
      return 'OK';
    } catch (e) {
      throw e;
    }
  }

  async genDeleteModel(): Promise<'OK'> {
    try {
      const multi = redis.createClient().multi();
      this.model.multiDelete(multi);
      await this.execMulti(multi);
      return 'OK';
    } catch (e) {
      throw e;
    }
  }

  async genLoadModel(): Promise<T | null> {
    try {
      return await this.model.genLoad();
    } catch (e) {
      throw e;
    }
  }

  private execMulti(multi: Multi): Promise<'OK'> {
    return new Promise<'OK'>((res, rej) => {
      multi.exec((error, result) => {
        if (error) {
          multi.discard((discardError, result) => {
            if (discardError) {
              rej(discardError);
            } else {
              rej(error);
            }
          })
        } else {
          res('OK');
        }
      });
    });
  }
}