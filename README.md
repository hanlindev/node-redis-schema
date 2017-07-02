Node Redis Schema (Beta)
=================

Declarative Redis - persist structural data with Redis at ease.

## Installation

  `npm install --save redis-schema`

  or

  `yarn add redis-schema`

## Usage

Define your data model by extending the `BaseModel` class and implement the `getSchema` method.

(Sample written in Typescript)

```Typescript
import {BaseModel, RedisSchemaType, Types} from 'redis-schema';

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
    };
  }

  // This is important and you have to define the default behavior of your
  // model so it can be consumed by `Redis` class.
  static getInstance(): TestModel {
    const instance = new TestModel();
    return instance.setTtl({
      type: 'expire',
      value: 2,
    });
  }
}
```

To save and load model data, use the `Redis` class:

```Typescript
import {Redis} from 'redis-schema';

const modelData: IProps = {
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

async function saveLoad(): Promise<void> {
  const model = new Redis(TestModel);
  console.log(await model.genSaveModel(modelData));
  // => 'OK'
  console.log(await model.genLoadModel());
  // => modelData will be printed.
}
```

If you know React's [prop-types'](https://www.npmjs.com/package/prop-types) syntax, the redis schema's syntax should look very familiar to you. Just replace the prop-types terms with Redis terms. Built-in types include:
1. `string`
2. `number`
  
   This is still a string in Redis but conversion is done before saving or after loading

3. `list`
4. `set`
5. `hash`
6. `listOf`

   `listOf` accepts a single `IRedisType` implementation. All built-in types are `IRedisType` implementations so you can even store a list of lists.

7. `shape`

   Similar to `listOf` but the argument should be an object of `IRedisType` implementations.

8. `instanceOf`

   Similar to `listOf` but the argument should be an object of `IRedisComposeType` implementation. All subclasses of `BaseModel` are `IRedisComposeType` implementations.

All built-in types comes with data validation logic. 1 ~ 5 are simple `instanceof` checks. 6 and 7 uses their type arguments' validation and only passes when all items are valid. The implication is that all fields in a schema are treated as required fields. Null or undefined values are not acceptable.

## Redis Client Options

You may pass in options to configure the `redis` client. `redis-schema` uses the [`redis`](https://www.npmjs.com/package/redis) package so all options accepted by the `redis` package are accepted here, too. Click [here](https://www.npmjs.com/package/redis#options-object-properties) for all options.

## Intended Usage

Essentially, all Redis Schema does is key management. It abstracts away the process to come up with Redis keys, ensuring consistent keys across your Redis server. Thus Redis Schema is not an ORM. If you need to change the structure of persisted data, you'll still need to do it manually. However with the help of a key registry (comiong soon), you are able to perform automated migration by collecting all old data in your migration script. Still, this library will be perfect for you if you only want the ability to persist structural data in Redis.

## Roadmap to V1:

1. Implement model registry to keep track of top-level model keys.
