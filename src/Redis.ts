import * as redis from 'redis';
import {Multi, ClientOpts} from 'redis';
import {IRedisComposeType, IModelFactory} from './types';

export class Redis<T> {
  constructor(
    readonly clazz: IModelFactory<T>, 
    readonly options?: ClientOpts,
  ) {}

  async genSaveModel(props: T, overrideKey?: string): Promise<'OK'> {
    try {
      const client = redis.createClient(this.options);
      let multi = client.multi();
      this.clazz.getInstance(overrideKey).multiSave(props, multi);
      await this.execMulti(multi);
      client.quit();
      return 'OK';
    } catch (e) {
      throw e;
    }
  }

  async genDeleteModel(overrideKey?: string): Promise<'OK'> {
    try {
      const client = redis.createClient(this.options);
      const multi = client.multi();
      this.clazz.getInstance(overrideKey).multiDelete(multi);
      await this.execMulti(multi);
      client.quit();
      return 'OK';
    } catch (e) {
      throw e;
    }
  }

  async genLoadModel(overrideKey?: string): Promise<T | null> {
    try {
      return await this.clazz.getInstance(overrideKey).genLoad();
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
