import * as nodeRedis from 'redis';
import {expect} from 'chai';
import {BaseModel, RedisSchemaType, Types, Redis} from '../src';

function genWait(seconds: number): Promise<void> {
  return new Promise<void>((res) => {
    setTimeout(() => res(), seconds * 1000);
  });
}

interface INestedModelProps {
  requiredString: string;
  optionalNumber?: number;
}

interface ITestShape {
  shapeNumber: number;
  shapeString?: string;
  nestedShape?: {
    nestedShapeListOf: Array<number>;
  };
}

interface IProps {
  listProp: Array<string>;
  listOfShapeProp: Array<ITestShape>;
  hashProp?: {[key: string]: string};
  setProp?: Set<string>;
  stringProp?: string;
  numberProp?: number;
  listOfListProp?: Array<Array<number>>;
  listOfInstance: Array<INestedModelProps>;
}

class TestNestModel extends BaseModel<INestedModelProps> {
  constructor(key: string = 'RedisTestNestModel') {
    super(key);
  }

  getSchema(): RedisSchemaType {
    return {
      requiredString: Types.string.isRequired,
      optionalNumber: Types.number,
    };
  }

  static getInstance(key?: string) {
    return new TestNestModel(key);
  }
}

class TestModel extends BaseModel<IProps> {
  constructor(key: string = 'RedisTestModel') {
    super(key);
  }

  getSchema(): RedisSchemaType {
    return {
      listProp: Types.list.isRequired,
      hashProp: Types.hash,
      setProp: Types.set,
      stringProp: Types.string,
      numberProp: Types.number,
      listOfShapeProp: Types.listOf<ITestShape>(
        Types.shape({
          shapeNumber: Types.number.isRequired,
          shapeString: Types.string,
          nestedShape: Types.shape({
            nestedShapeListOf: Types.listOf<number>(Types.number).isRequired,
          }),
        }),
      ).isRequired,
      listOfListProp: Types.listOf<Array<number>>(
        Types.listOf<number>(Types.number),
      ),
      listOfInstance: 
        Types.listOf<INestedModelProps>(
          Types.instanceOf(TestNestModel).isRequired,
        ),
    };
  }

  static getInstance(overrideKey?: string): TestModel {
    const instance = new TestModel(overrideKey);
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
  listOfInstance: [{
    requiredString: 'a',
    optionalNumber: 1,
  }]
};

const minimalValidProps: IProps = {
  listProp: ['a', 'b', 'c'],
  listOfShapeProp: [{shapeNumber: 0}],
  listOfInstance: [{
    requiredString: 'a',
  }],
};

const invalidProps = {
  setProp: new Set(['1', '2', '3']),
};

describe('Redis', () => {
  let redis: Redis<IProps>;

  beforeEach(() => {
    redis = new Redis<IProps>(TestModel);
  });

  afterEach(async () => {
    await redis.genDeleteModel();
  });

  describe('genDeleteModel', () => {
    it('works and returns OK', async () => {
      const result = await redis.genDeleteModel();
      expect(result).to.equal('OK');
      const loadedResult = await redis.genLoadModel();
      expect(loadedResult).to.not.equal(defaultProps);
    });
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

  describe('with validation', () => {
    it('throws when saving invalid model', () => {
      expect(async () => {
        await redis.genSaveModel(invalidProps as any);
      }).to.throw;
    });

    it('loads minimally valid model', async () => {
      nodeRedis.createClient().keys('*', (err, res) => console.log(res));//fd
      await redis.genDeleteModel();
      await redis.genSaveModel(minimalValidProps);
      const result = await redis.genLoadModel();
      console.log(JSON.stringify(result, null, 2));//fd
      expect(result).to.be.deep.equal(minimalValidProps);
    });
  });
});