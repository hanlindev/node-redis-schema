import * as nodeRedis from 'redis';
import {expect} from 'chai';
import {BaseModel, RedisSchemaType, Types, Redis} from '../src';

function genWait(seconds: number): Promise<void> {
  return new Promise<void>((res) => {
    setTimeout(() => res(), seconds * 1000);
  });
}

interface ITestShape {
  shapeNumber: number;
  shapeString: string;
  nestedShape: {
    nestedShapeListOf: Array<number>;
  };
}

interface IProps {
  listProp: Array<string>;
  hashProp: {[key: string]: string};
  setProp: Set<string>;
  stringProp: string;
  numberProp: number;
  listOfShapeProp: Array<ITestShape>;
  listOfListProp: Array<Array<number>>;
}

class TestModel extends BaseModel<IProps> {
  constructor(key: string = 'HTRedisTestModel') {
    super(key);
  }

  getSchema(): RedisSchemaType {
    return {
      listProp: Types.list,
      hashProp: Types.hash,
      setProp: Types.set,
      stringProp: Types.string,
      numberProp: Types.number,
      listOfShapeProp: Types.listOf<ITestShape>(
        Types.shape({
          shapeNumber: Types.number,
          shapeString: Types.string,
          nestedShape: Types.shape({
            nestedShapeListOf: Types.listOf<number>(Types.number),
          }),
        }),
      ),
      listOfListProp: Types.listOf<Array<number>>(
        Types.listOf<number>(Types.number),
      ),
    };
  }

  static getInstance(): TestModel {
    const instance = new TestModel();
    return instance.setTtl({
      type: 'expire',
      value: 2,
    });
  }
}

const defaultProps: IProps = {
  listProp: ['a', 'b', 'c'],
  hashProp: {
    a: '1',
    b: '2',
  },
  setProp: new Set(['1', '2', '3']),
  stringProp: 'test string',
  numberProp: 123,
  listOfShapeProp: [
    {
      shapeNumber: 0,
      shapeString: '0',
      nestedShape: {
        nestedShapeListOf: [0, 1, 2, 3],
      }
    },
    {
      shapeNumber: 2,
      shapeString: '2',
      nestedShape: {
        nestedShapeListOf: [2, 3, 4, 5],
      },
    },
  ],
  listOfListProp: [
    [1, 2, 3],
    [4, 5, 6],
  ],
};

describe('Redis', () => {
  let redis: Redis<IProps>;

  beforeEach(() => {
    redis = new Redis<IProps>(TestModel);
  });

  describe('genDeleteModel', () => {
    it('works and returns OK', async () => {
      const result = await redis.genDeleteModel();
      expect(result).to.equal('OK');
      const loadedResult = await redis.genLoadModel();
      expect(loadedResult).to.not.equal(defaultProps);
    });

    afterEach(async () => {
      // await redis.genDeleteModel();
    });

    describe('genSaveModel', () => {
      it ('saves and returns OK', async () => {
        const result = await redis.genSaveModel(defaultProps);
        expect(result).to.equal('OK');
      });
    });

    describe('genLoadModel', () => {
      it('load the saved data', async () => {
        await redis.genSaveModel(defaultProps);
        const result = await redis.genLoadModel();
        expect(result).to.deep.equal(defaultProps);
      });
    });

    describe('testTtl', () => {
      it('delets the data after ttl', async () => {
        await redis.genSaveModel(defaultProps);
        await genWait(2);
        const result = await redis.genLoadModel();
        expect(result).to.be.null;
      }).timeout(4000);
    });
  });
});